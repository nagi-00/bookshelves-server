import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { Client } from '@notionhq/client';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/notion/databases', async (req, res) => {
    try {
        const notion = new Client({ auth: req.body.token });
        const response = await notion.search({ filter: { value: 'database', property: 'object' } });
        res.json(response.results.map(db => ({ id: db.id, title: db.title[0]?.plain_text || 'Untitled' })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

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
        res.json(data.item.map(i => ({
            title: i.title,
            author: i.author,
            // 가장 선명한 500px 규격 사용
            cover: i.cover.replace('cover200', 'cover500').replace('mid', 'cover500'),
            description: i.description || "줄거리 정보가 없습니다."
        })));
    } catch (e) { res.status(500).json({ error: "Search Failed" }); }
});

app.post('/api/notion/save', async (req, res) => {
    const { token, db, title, author, cover, description } = req.body;
    const notion = new Client({ auth: token });
    try {
        await notion.pages.create({
            parent: { database_id: db },
            cover: { type: "external", external: { url: cover } }, // 페이지 상단 커버
            properties: {
                "title": { title: [{ text: { content: title } }] },
                "Author": { rich_text: [{ text: { content: author } }] }
            },
            children: [
                // 본문에 들어가는 이미지를 크게 노출하기 위해 상단 배치
                { object: 'block', type: 'image', image: { type: 'external', external: { url: cover } } },
                { object: 'block', type: 'divider', divider: {} },
                { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: title } }] } },
                { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: `저자: ${author}` }, annotations: { italic: true } }] } },
                { object: 'block', type: 'callout', callout: { 
                    rich_text: [{ text: { content: description } }],
                    icon: { emoji: "📖" },
                    color: "gray_background"
                }}
            ]
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Save Failed" }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
