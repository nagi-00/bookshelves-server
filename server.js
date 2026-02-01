import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors()); // Vercel에서 오는 요청을 허용합니다.

// 1. 노션 DB 목록 불러오기
app.post('/api/notion/databases', async (req, res) => {
    const { token } = req.body;
    try {
        const response = await fetch('https://api.notion.com/v1/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filter: { property: 'object', value: 'database' } })
        });
        const data = await response.json();
        const dbs = data.results.map(db => ({
            id: db.id,
            title: db.title[0]?.plain_text || "이름 없는 DB"
        }));
        res.json(dbs);
    } catch (err) {
        res.status(401).json({ error: "권한이 없거나 토큰이 틀렸습니다." });
    }
});

// 2. 알라딘 도서 검색
app.get('/api/search', async (req, res) => {
    const { q, key } = req.query;
    const url = `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${key}&Query=${encodeURIComponent(q)}&QueryType=Title&MaxResults=10&SearchTarget=Book&output=js&Version=20131101`;
    const response = await fetch(url);
    res.json(await response.json());
});

// 3. 노션에 도서 추가 (커버 이미지 및 디자인 반영)
app.post('/api/notion/add', async (req, res) => {
    const { token, dbId, title, author, cover, description } = req.body;
    const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            parent: { database_id: dbId },
            cover: { type: "external", external: { url: cover } },
            icon: { type: "external", external: { url: cover } },
            properties: {
                "title": { "title": [{ "text": { "content": title } }] },
                "author": { "rich_text": [{ "text": { "content": author } }] }
            },
            children: [{
                object: 'block', type: 'paragraph',
                paragraph: { rich_text: [{ type: 'text', text: { content: description || "" } }] }
            }]
        })
    });
    if (response.ok) res.sendStatus(200);
    else res.status(500).send("추가 실패");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bookshelves Engine Running on ${PORT}`));
