import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { Client } from '@notionhq/client';

const app = express();
app.use(cors());
app.use(express.json());

// 1. 노션 DB 목록 조회
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
        console.error("Notion DB Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 2. 알라딘 도서 검색 (오류 수정됨)
app.get('/api/search', async (req, res) => {
    const { k, q } = req.query;
    // JS 형식으로 받아서 처리 (JSON 응답이 불안정할 때가 많음)
    const url = `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${k}&Query=${encodeURIComponent(q)}&QueryType=Title&MaxResults=20&start=1&SearchTarget=Book&output=js&Version=20131101`;

    try {
        const response = await fetch(url);
        const text = await response.text();
        
        // 알라딘은 가끔 'var item = [...];' 형태의 문자열을 줍니다. 이걸 JSON으로 발라냅니다.
        // 혹은 끝에 세미콜론(;)이 붙어있어 파싱 에러가 날 수 있습니다.
        let jsonStr = text;
        if (text.trim().endsWith(';')) {
            jsonStr = text.trim().slice(0, -1); // 마지막 세미콜론 제거
        }
        
        // 만약 response가 object가 아니라 string이라면 파싱 시도
        let data;
        try {
            data = JSON.parse(jsonStr);
        } catch (e) {
            // 알라딘 특유의 에러 메시지 처리 or 재시도 로직 필요하지만 일단 에러 반환
            throw new Error("알라딘 API 응답을 해석할 수 없습니다. TTB키를 확인하세요.");
        }

        if (!data.item) {
            return res.json([]); // 결과 없음
        }

        const books = data.item.map(i => ({
            title: i.title,
            author: i.author,
            cover: i.cover.replace('cover200', 'cover500') // 고화질 커버
        }));
        res.json(books);

    } catch (error) {
        console.error("Aladin Search Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 3. 노션 저장 (속성명 표준화)
app.post('/api/notion/save', async (req, res) => {
    const { token, db, title, author, cover } = req.body;
    const notion = new Client({ auth: token });

    try {
        // Notion에 저장할 때 Property 이름이 중요합니다.
        // 사용자의 DB에 '제목', '저자' 등의 이름이 다를 수 있어 기본값(title, rich_text)을 사용합니다.
        // *주의: 사용자의 DB 첫번째 컬럼(제목)은 반드시 속성 유형이 Title이어야 합니다.
        
        await notion.pages.create({
            parent: { database_id: db },
            cover: { type: "external", external: { url: cover } }, // 페이지 커버
            properties: {
                "title": { // 보통 제목 속성의 ID는 'title'입니다.
                    title: [{ text: { content: title } }] 
                },
                // 저자 등을 본문에 넣을지 속성에 넣을지 고민되지만, 
                // 범용성을 위해 속성 이름이 'Author'나 '저자'인 경우를 시도해보고
                // 없으면 본문에만 넣는 방식이 안전할 수 있습니다. 
                // 여기선 일단 'Author'라는 텍스트 속성을 생성하려고 시도합니다.
                "Author": { 
                    rich_text: [{ text: { content: author } }] 
                }
            },
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
        // 속성 이름 오류일 확률이 높음 -> 사용자에게 안내
        res.status(500).json({ error: "노션 저장 실패. 데이터베이스에 'Author'라는 텍스트 속성이 있는지 확인해주세요." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
