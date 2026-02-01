import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { Client } from '@notionhq/client';

const app = express();
app.use(cors());
app.use(express.json());

// 1. 노션 데이터베이스 목록 조회 (디버깅 강화)
app.post('/api/notion/databases', async (req, res) => {
    try {
        const token = req.body.token?.trim();
        if (!token) return res.status(400).json({ error: "토큰이 입력되지 않았습니다." });

        const notion = new Client({ auth: token });
        const response = await notion.search({ 
            filter: { value: 'database', property: 'object' } 
        });

        if (response.results.length === 0) {
            return res.status(404).json({ error: "연결된 데이터베이스가 없습니다. 노션 페이지 설정에서 '연결 추가'를 확인하세요." });
        }

        res.json(response.results.map(db => ({ 
            id: db.id, 
            title: db.title[0]?.plain_text || 'Untitled' 
        })));
    } catch (e) { 
        res.status(500).json({ error: `노션 연결 오류: ${e.message}` }); 
    }
});

// 2. 알라딘 검색 (고해상도 이미지 변환)
app.get('/api/search', async (req, res) => {
    const { k, q } = req.query;
    const url = `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${k}&Query=${encodeURIComponent(q)}&QueryType=Title&MaxResults=20&start=1&SearchTarget=Book&output=js&Version=20131101`;
    try {
        const response = await fetch(url);
        const text = await response.text();
        let jsonStr = text.trim();
        if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
        const data = JSON.parse(jsonStr);
        if (!data.item) return res.json([]);

        res.json(data.item.map(i => {
            const cleanAuthor = i.author.replace(/\s*\(.*?\)/g, '').trim();
            let highResCover = i.cover.replace(/cover\d+/, 'cover500');
            if (!highResCover.includes('cover500')) highResCover = highResCover.replace('sum', 'cover500').replace('mid', 'cover500');
            
            return {
                title: i.title,
                author: cleanAuthor,
                cover: highResCover,
                description: i.description || "줄거리 정보가 없습니다."
            };
        }));
    } catch (e) { res.status(500).json({ error: "Search Failed" }); }
});

// 3. 노션 저장
app.post('/api/notion/save', async (req, res) => {
    const { token, db, title, author, cover, description } = req.body;
    const notion = new Client({ auth: token });
    try {
        await notion.pages.create({
            parent: { database_id: db },
            cover: { type: "external", external: { url: cover } },
            properties: {
                "title": { title: [{ text: { content: title } }] },
                "Author": { rich_text: [{ text: { content: author } }] }
            },
            children: [
                { object: 'block', type: 'image', image: { type: 'external', external: { url: cover } } },
                { object: 'block', type: 'divider', divider: {} },
                { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: description } }] } }
            ]
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Save Failed" }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
