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
        res.json(response.results.map(db => ({
            id: db.id,
            title: db.title[0]?.plain_text || 'Untitled'
        })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/search', async (req, res) => {
    try {
        const { k, q } = req.query;
        const r = await fetch(`http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${k}&Query=${encodeURIComponent(q)}&output=js&Version=20131101`);
        const data = await r.json();
        res.json(data.item.map(i => ({ title: i.title, author: i.author, cover: i.cover.replace('cover200', 'cover500') })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notion/save', async (req, res) => {
    const { token, db, title, author, cover } = req.body;
    const notion = new Client({ auth: token });
    try {
        await notion.pages.create({
            parent: { database_id: db },
            cover: { type: "external", external: { url: cover } },
            properties: {
                "title": { title: [{ text: { content: title } }] },
                "Author": { rich_text: [{ text: { content: author } }] }
            },
            children: [{ object: 'block', type: 'image', image: { type: 'external', external: { url: cover } } }]
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
