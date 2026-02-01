import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();

// [수정] CORS 설정을 가장 넓게 열어주어 Vercel과의 통신 문제를 해결합니다.
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 서버가 살아있는지 확인하는 기본 경로
app.get('/', (req, res) => {
    res.send('Bookshelves Engine is Running! 🚀');
});

// 1. 노션 DB 목록 불러오기
app.post('/api/notion/databases', async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.status(400).json({ error: "토큰이 누락되었습니다." });
    }

    try {
        const response = await fetch('https://api.notion.com/v1/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filter: { property: 'object', value: 'database' },
                page_size: 100
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Notion API Error:', data);
            return res.status(response.status).json(data);
        }

        const dbs = data.results.map(db => ({
            id: db.id,
            title: db.title[0]?.plain_text || "이름 없는 데이터베이스"
        }));

        res.json(dbs);
    } catch (err) {
        console.error('Server Error:', err);
        res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
    }
});

// 2. 알라딘 도서 검색 (디자인 커스텀 반영을 위해 기본 검색 로직 유지)
app.get('/api/search', async (req, res) => {
    const { q, key } = req.query;
    if (!q || !key) return res.status(400).json({ error: "검색어 또는 키가 누락되었습니다." });

    const url = `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${key}&Query=${encodeURIComponent(q)}&QueryType=Title&MaxResults=10&SearchTarget=Book&output=js&Version=20131101`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "알라딘 API 통신 실패" });
    }
});

// 3. 노션에 도서 추가 (커버 및 본문 줄거리 포함)
app.post('/api/notion/add', async (req, res) => {
    const { token, dbId, title, author, cover, description } = req.body;

    try {
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
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ type: 'text', text: { content: description || "설명이 없습니다." } }]
                    }
                }]
            })
        });

        if (response.ok) res.sendStatus(200);
        else {
            const errData = await response.json();
            res.status(response.status).json(errData);
        }
    } catch (err) {
        res.status(500).json({ error: "노션 페이지 생성 실패" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bookshelves Engine Running on Port ${PORT}`));
