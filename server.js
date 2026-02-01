import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express(); // [중요] app 정의가 반드시 여기에 있어야 합니다.

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

// 서버 연결 확인용 루트 경로
app.get('/', (req, res) => { res.send('Bookshelves Engine is Running! 🚀'); });

// 1. 위젯 화면 전달 (디자인 반영)
app.get('/widget', (req, res) => {
    const { bg, k, t, d } = req.query;
    const themeColor = bg ? '#' + bg : '#f7cbd6';
    
    const html = `<html><head><meta charset="UTF-8"><style>` +
        `body { margin: 0; padding: 0; background: #ffffff; font-family: -apple-system, sans-serif; overflow: hidden; display: flex; flex-direction: column; height: 100vh; }` +
        `.w-header { height: 40px; background: #ffffff; display: flex; align-items: center; padding: 0 15px; border-bottom: 0.5px solid #efefef; position: relative; flex-shrink: 0; }` +
        `.dots { display: flex; gap: 6px; } .dot { width: 10px; height: 10px; border-radius: 50%; }` +
        `.dot.red { background: #f3aeaf; } .dot.yellow { background: #f7e3af; } .dot.green { background: #b1d9b7; }` +
        `.w-title { font-size: 12px; font-weight: 600; color: #1d1d1f; position: absolute; left: 50%; transform: translateX(-50%); }` +
        `.search-box { padding: 15px; background: ${themeColor}; display: flex; gap: 8px; }` +
        `input { flex: 1; padding: 10px 15px; border-radius: 20px; border: none; outline: none; font-size: 13px; }` +
        `button { padding: 0 15px; border-radius: 20px; border: none; background: #1d1d1f; color: white; cursor: pointer; }` +
        `.results { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }` +
        `.book-item { display: flex; gap: 12px; padding: 10px; border-radius: 12px; background: #fff; cursor: pointer; border: 1px solid #f5f5f7; }` +
        `.cover-wrapper { width: 45px; height: 65px; box-shadow: 2px 4px 12px rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden; }` +
        `.cover-wrapper img { width: 100%; height: 100%; object-fit: cover; }` +
        `.info h4 { margin: 0; font-size: 13px; color: #1d1d1f; }` +
        `</style></head><body>` +
        `<div class="w-header"><div class="dots"><div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div></div><div class="w-title">Bookshelves</div></div>` +
        `<div class="search-box"><input type="text" id="q" placeholder="검색어 입력..."><button onclick="search()">Search</button></div>` +
        `<div id="res" class="results"></div>` +
        `<script>` +
        `async function search(){ const q=document.getElementById("q").value; const r=await fetch("/api/search?q="+encodeURIComponent(q)+"&key="+atob("${k}")); const d=await r.json(); document.getElementById("res").innerHTML=d.item.map(b=>` +
        `'<div class="book-item" onclick="add(\\''+b.title+'\\',\\''+b.author+'\\',\\''+b.cover+'\\')"><div class="cover-wrapper"><img src="'+b.cover+'"></div><div class="info"><h4>'+b.title+'</h4><p style="font-size:11px;color:#86868b;margin:0;">'+b.author+'</p></div></div>').join(""); }` +
        `async function add(t,a,c){ const r=await fetch("/api/notion/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:atob("${t}"),dbId:atob("${d}"),title:t,author:a,cover:c})}); if(r.ok)alert("추가 성공! 🤍"); }` +
        `</script></body></html>`;
    res.send(html);
});

// 2. 노션 DB 목록 불러오기
app.post('/api/notion/databases', async (req, res) => {
    const { token } = req.body;
    try {
        const response = await fetch('https://api.notion.com/v1/search', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
            body: JSON.stringify({ filter: { property: 'object', value: 'database' } })
        });
        const data = await response.json();
        const dbs = data.results.map(db => ({ id: db.id, title: db.title[0]?.plain_text || "이름 없는 DB" }));
        res.json(dbs);
    } catch (err) { res.status(500).json({ error: "Fail" }); }
});

// 3. 알라딘 검색 API
app.get('/api/search', async (req, res) => {
    const { q, key } = req.query;
    const url = `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${key}&Query=${encodeURIComponent(q)}&QueryType=Title&MaxResults=10&SearchTarget=Book&output=js&Version=20131101`;
    const response = await fetch(url);
    res.json(await response.json());
});

// 4. 노션에 도서 추가 API
app.post('/api/notion/add', async (req, res) => {
    const { token, dbId, title, author, cover } = req.body;
    const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
        body: JSON.stringify({
            parent: { database_id: dbId },
            cover: { type: "external", external: { url: cover } },
            icon: { type: "external", external: { url: cover } },
            properties: {
                "title": { "title": [{ "text": { "content": title } }] },
                "author": { "rich_text": [{ "text": { "content": author } }] }
            }
        })
    });
    if (response.ok) res.sendStatus(200); else res.sendStatus(500);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Engine Live on ' + PORT));
