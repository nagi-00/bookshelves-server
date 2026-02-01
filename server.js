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

// 2. 알라딘 검색
app.get('/api/search', async (req, res) => {
    const { k, q } = req.query;
    const url = `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${k}&Query=${encodeURIComponent(q)}&QueryType=Title&MaxResults=20&start=1&SearchTarget=Book&output=js&Version=20131101`;
    try {
        const response = await fetch(url);
        const text = await response.text();
        let jsonStr = text.trim();
        if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
        const data = JSON.parse(jsonStr);
        res.json(data.item || []);
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
                { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: description || "" } }] } }
            ]
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Save Failed" }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
