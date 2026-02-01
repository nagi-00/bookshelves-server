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

// 2. 알라딘 검색 (목차 toc 정보 추가)
app.get('/api/search', async (req, res) => {
    const { k, q } = req.query;
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
            description: i.description || "",
            publisher: i.publisher || "",
            genre: i.categoryName || "",
            toc: i.toc || "" // [추가] 목차 정보 추출
        }));
        res.json(items);
    } catch (e) { res.status(500).json({ error: "Search Failed" }); }
});

// 3. 노션 저장 (본문에 목차 콜아웃 추가)
app.post('/api/notion/save', async (req, res) => {
    const { token, db, title, author, cover, description, publisher, genre, toc } = req.body;
    const notion = new Client({ auth: token });
    try {
        const children = [
            { object: 'block', type: 'image', image: { type: 'external', external: { url: cover } } },
            { object: 'block', type: 'divider', divider: {} }
        ];

        // [추가] 목차가 있을 경우에만 콜아웃 블록 생성
        if (toc) {
            children.push({
                object: 'block',
                type: 'callout',
                callout: {
                    rich_text: [{ text: { content: "목차\n" + toc.substring(0, 1500) } }], // 노션 글자수 제한 고려
                    icon: { emoji: "📖" },
                    color: "gray_background"
                }
            });
            children.push({ object: 'block', type: 'divider', divider: {} });
        }

        children.push({ 
            object: 'block', 
            type: 'paragraph', 
            paragraph: { rich_text: [{ text: { content: description || "" } }] } 
        });

        await notion.pages.create({
            parent: { database_id: db },
            cover: { type: "external", external: { url: cover } },
            properties: {
                "title": { title: [{ text: { content: title } }] },
                "Author": { rich_text: [{ text: { content: author } }] },
                "Sum": { rich_text: [{ text: { content: description || "" } }] },
                "Publisher": { rich_text: [{ text: { content: publisher || "" } }] },
                "Genre": { rich_text: [{ text: { content: genre || "" } }] }
            },
            children: children
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
