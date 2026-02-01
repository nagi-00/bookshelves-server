import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { Client } from '@notionhq/client';

const app = express();
app.use(cors());
app.use(express.json());

// 1. 노션 데이터베이스 목록 조회
app.post('/api/notion/databases', async (req, res) => {
    try {
        const notion = new Client({ auth: req.body.token });
        const response = await notion.search({ 
            filter: { value: 'database', property: 'object' },
            sort: { direction: 'descending', timestamp: 'last_edited_time' }
        });
        
        const dbs = response.results.map(db => ({
            id: db.id,
            title: db.title[0]?.plain_text || 'Untitled'
        }));
        res.json(dbs);
    } catch (error) {
        console.error("Notion DB Fetch Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 2. 알라딘 도서 검색 (고화질 이미지 로직 포함)
app.get('/api/search', async (req, res) => {
    const { k, q } = req.query;
    // output=js로 호출하여 더 안정적인 데이터를 받아옵니다.
    const url = `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${k}&Query=${encodeURIComponent(q)}&QueryType=Title&MaxResults=20&start=1&SearchTarget=Book&output=js&Version=20131101`;

    try {
        const response = await fetch(url);
        const text = await response.text();
        
        // 알라딘 API 특유의 세미콜론 제거 및 파싱
        let jsonStr = text.trim();
        if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
        
        const data = JSON.parse(jsonStr);

        if (!data.item) return res.json([]);

        const books = data.item.map(i => {
            // [고화질 처리] 저화질 식별자(cover200, mid)를 고화질(cover500)로 치환
            let highResCover = i.cover;
            if (highResCover.includes('cover200')) {
                highResCover = highResCover.replace('cover200', 'cover500');
            } else if (highResCover.includes('mid')) {
                highResCover = highResCover.replace('mid', 'cover500');
            }
            
            return {
                title: i.title,
                author: i.author,
                cover: highResCover
            };
        });
        res.json(books);

    } catch (error) {
        console.error("Aladin Search Error:", error);
        res.status(500).json({ error: "검색 중 오류가 발생했습니다." });
    }
});

// 3. 노션 데이터베이스에 도서 저장
app.post('/api/notion/save', async (req, res) => {
    const { token, db, title, author, cover } = req.body;
    const notion = new Client({ auth: token });

    try {
        await notion.pages.create({
            parent: { database_id: db },
            // 페이지 상단 커버 이미지 설정 (고화질)
            cover: { type: "external", external: { url: cover } },
            properties: {
                // 노션 DB의 기본 '제목' 속성 (ID는 보통 'title')
                "title": { 
                    title: [{ text: { content: title } }] 
                },
                // 'Author'라는 이름의 텍스트 속성이 DB에 있어야 합니다.
                "Author": { 
                    rich_text: [{ text: { content: author } }] 
                }
            },
            // 페이지 본문에 커버 이미지 삽입
            children: [
                {
                    object: 'block',
                    type: 'image',
                    image: { type: 'external', external: { url: cover } }
                }
            ]
        });
        res.json({ success: true });
    } catch (error) {
        console.error("Notion Save Error:", error);
        res.status(500).json({ error: "노션 저장 실패. 'Author' 속성이 있는지 확인하세요." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
