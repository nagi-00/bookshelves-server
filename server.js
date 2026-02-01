import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

// 색상 농도 조절 함수 (신호등 테마용)
const adjust = (color, amount) => {
    let col = color.replace('#', '');
    let num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    const clamp = (x) => Math.min(255, Math.max(0, x)).toString(16).padStart(2, '0');
    return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
};

app.get('/widget', (req, res) => {
    const { bg, k, t, d } = req.query;
    const primary = bg ? '#' + bg : '#f7cbd6';
    // 신호등 3색: 테마색 기반 농도 차이 (옅음 / 중간 / 진함)
    const d1 = adjust(primary, 20); 
    const d2 = adjust(primary, -20);
    const d3 = adjust(primary, -50);
    const barBg = adjust(primary, 40); // 상단바는 아주 옅은 테마색

    const html = `<html><head><meta charset="UTF-8"><style>` +
        `body { margin: 0; padding: 0; background: #ffffff; font-family: -apple-system, sans-serif; overflow: hidden; display: flex; flex-direction: column; height: 100vh; }` +
        `.w-header { height: 42px; background: ${barBg}; display: flex; align-items: center; padding: 0 15px; border-bottom: 0.5px solid rgba(0,0,0,0.03); position: relative; flex-shrink: 0; }` +
        `.dots { display: flex; gap: 6px; } .dot { width: 11px; height: 11px; border-radius: 50%; }` +
        `.dot.d1 { background: ${d1}; } .dot.d2 { background: ${d2}; } .dot.d3 { background: ${d3}; }` +
        `.w-title { font-size: 13px; font-weight: 600; color: rgba(0,0,0,0.7); position: absolute; left: 50%; transform: translateX(-50%); }` +
        `.search-box { padding: 15px; background: #ffffff; display: flex; gap: 8px; border-bottom: 1px solid #f5f5f7; }` +
        `input { flex: 1; padding: 10px 15px; border-radius: 20px; border: 1px solid #efefef; outline: none; font-size: 13px; transition: 0.2s; }` +
        `input:focus { border-color: ${primary}; }` +
        `button { width: 36px; height: 36px; border-radius: 50%; border: none; background: #1d1d1f; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }` +
        `.results { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }` +
        `.book-item { display: flex; gap: 12px; padding: 10px; border-radius: 12px; background: #fff; cursor: pointer; border: 1px solid transparent; transition: 0.2s; }` +
        `.book-item:hover { background: ${adjust(barBg, 10)}; border-color: ${primary}; }` +
        `.cover-wrapper { width: 45px; height: 65px; box-shadow: 2px 4px 12px rgba(0,0,0,0.06); border-radius: 4px; overflow: hidden; flex-shrink: 0; }` +
        `.cover-wrapper img { width: 100%; height: 100%; object-fit: cover; }` +
        `.info h4 { margin: 0; font-size: 13px; color: #1d1d1f; }` +
        `</style></head><body>` +
        `<div class="w-header"><div class="dots"><div class="dot d1"></div><div class="dot d2"></div><div class="dot d3"></div></div><div class="w-title">Bookshelves</div></div>` +
        `<div class="search-box">` +
        `<input type="text" id="q" placeholder="책 제목을 입력하고 Enter" onkeypress="if(event.keyCode==13)search()">` +
        `<button onclick="search()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button></div>` +
        `<div id="res" class="results"></div>` +
        `<script>` +
        `async function search(){ const q=document.getElementById("q").value; const r=await fetch("/api/search?q="+encodeURIComponent(q)+"&key="+atob("${k}")); const d=await r.json(); document.getElementById("res").innerHTML=d.item.map(b=>` +
        `'<div class="book-item" onclick="add(\\''+b.title.replace(/'/g,"")+'\\',\\''+b.author.replace(/'/g,"")+'\\',\\''+b.cover+'\\',\\''+b.description.replace(/'/g,"")+'\\')"><div class="cover-wrapper"><img src="'+b.cover+'"></div><div class="info"><h4>'+b.title+'</h4><p style="font-size:11px;color:#86868b;margin:4px 0 0 0;">'+b.author+'</p></div></div>').join(""); }` +
        `async function add(t,a,c,d){ const r=await fetch("/api/notion/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:atob("${t}"),dbId:atob("${d}"),title:t,author:a,cover:c,desc:d})}); if(r.ok)alert("서재에 추가되었습니다! 🤍"); }` +
        `</script></body></html>`;
    res.send(html);
});

// 노션 추가 API (cover 속성 및 본문 요약 포함)
app.post('/api/notion/add', async (req, res) => {
    const { token, dbId, title, author, cover, desc } = req.body;
    const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
        body: JSON.stringify({
            parent: { database_id: dbId },
            cover: { type: "external", external: { url: cover } }, // 상단 커버
            properties: {
                "title": { "title": [{ "text": { "content": title } }] },
                "author": { "rich_text": [{ "text": { "content": author } }] },
                "cover": { "files": [{ "name": "cover", "type": "external", "external": { "url": cover } }] } // [수정] 파일 속성
            },
            children: [
                { object: 'block', type: 'image', image: { type: 'external', external: { url: cover } } }, // 본문 이미지
                { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: desc || "요약 정보가 없습니다." } }] } } // 줄거리
            ]
        })
    });
    if (response.ok) res.sendStatus(200); else res.sendStatus(500);
});

// --- 알라딘/DB 목록 API는 이전과 동일 ---
app.post('/api/notion/databases', async (req, res) => { /* 생략 */ });
app.get('/api/search', async (req, res) => { /* 생략 */ });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Engine Live'));        `async function search(){ const q=document.getElementById("q").value; const r=await fetch("/api/search?q="+encodeURIComponent(q)+"&key="+atob("${k}")); const d=await r.json(); document.getElementById("res").innerHTML=d.item.map(b=>` +
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
