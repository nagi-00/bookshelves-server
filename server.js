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
        res.json(response.results.map(db => ({ id: db.id, title: db.title[0]?.plain_text || 'Untitled' })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. 알라딘 검색 (고화질 이미지 & 줄거리 포함)
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
            // 더 큰 이미지 규격으로 치환 (cover200/mid -> cover500)
            cover: i.cover.replace('cover200', 'cover500').replace('mid', 'cover500'),
            description: i.description || "줄거리 정보가 없습니다." 
        })));
    } catch (error) {
        res.status(500).json({ error: "검색 실패" });
    }
});

// 3. 노션 저장 (줄거리 본문 삽입 로직 복구)
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
                { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ text: { content: "줄거리 소개" } }] } },
                { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: description } }] } }
            ]
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "저장 실패" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
