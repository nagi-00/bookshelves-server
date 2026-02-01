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
        const response = await notion.search({ filter: { value: 'database', property: 'object' } });
        res.json(response.results.map(db => ({ id: db.id, title: db.title[0]?.plain_text || 'Untitled' })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. 알라딘 검색 (Cover=Big 적용)
app.get('/api/search', async (req, res) => {
    const { k, q } = req.query;
    // 매뉴얼에 명시된 Cover=Big 파라미터를 사용하여 너비 200px 이미지를 가져옵니다.
    const url = `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${k}&Query=${encodeURIComponent(q)}&QueryType=Title&MaxResults=20&start=1&SearchTarget=Book&output=js&Version=20131101&Cover=Big`;
    
    try {
        const response = await fetch(url);
        const text = await response.text();
        let jsonStr = text.trim();
        if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
        const data = JSON.parse(jsonStr);

        if (!data.item) return res.json([]);

        const items = data.item.map(i => ({
            title: i.title,
            author: i.author.replace(/\s*\(.*?\)/g, '').trim(),
            cover: i.cover.replace('http://', 'https://'),
            description: i.description || ""
        }));
        res.json(items);
    } catch (e) { res.status(500).json({ error: "Search Failed" }); }
});

// 3. 노션 저장 (Sum 속성 추가)
app.post('/api/notion/save', async (req, res) => {
    const { token, db, title, author, cover, description } = req.body;
    const notion = new Client({ auth: token });
    try {
        await notion.pages.create({
            parent: { database_id: db },
            cover: { type: "external", external: { url: cover } },
            properties: {
                "title": { title: [{ text: { content: title } }] },
                "Author": { rich_text: [{ text: { content: author } }] },
                // [추가] Sum 이라는 이름의 텍스트(rich_text) 속성에 줄거리 저장
                "Sum": { rich_text: [{ text: { content: description || "내용 없음" } }] }
            },
            children: [
                { object: 'block', type: 'image', image: { type: 'external', external: { url: cover } } },
                { object: 'block', type: 'divider', divider: {} },
                { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: description || "내용 없음" } }] } }
            ]
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
