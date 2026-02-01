import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

// 1. 위젯 화면 전달 (디자인 커스텀 반영)
app.get('/widget', (req, res) => {
    const { bg, k, t, d } = req.query;
    
    // HTML 내부의 백틱(`) 에러를 방지하기 위해 일반 따옴표와 결합하여 작성했습니다.
    const html = '<html><head><meta charset="UTF-8"><style>' +
        'body { margin: 0; padding: 15px; background: ' + (bg || '#ffffff') + '; font-family: -apple-system, sans-serif; overflow: hidden; }' +
        '.search-container { display: flex; gap: 8px; margin-bottom: 15px; }' +
        'input { flex: 1; padding: 10px 15px; border-radius: 20px; border: 1px solid #efefef; outline: none; font-size: 14px; }' +
        'button { padding: 8px 15px; border-radius: 20px; border: none; background: #1d1d1f; color: white; cursor: pointer; font-size: 13px; }' +
        '.results { display: flex; flex-direction: column; gap: 10px; max-height: 250px; overflow-y: auto; }' +
        '.book-item { display: flex; gap: 12px; padding: 10px; border-radius: 12px; background: rgba(255,255,255,0.5); cursor: pointer; transition: 0.2s; }' +
        '.book-item:hover { background: rgba(0,0,0,0.03); }' +
        '.cover-wrapper { width: 50px; height: 75px; flex-shrink: 0; box-shadow: 2px 4px 10px rgba(0,0,0,0.08); border-radius: 4px; overflow: hidden; }' +
        '.cover-wrapper img { width: 100%; height: 100%; object-fit: cover; }' +
        '.info h4 { margin: 0 0 4px 0; font-size: 14px; color: #1d1d1f; }' +
        '.info p { margin: 0; font-size: 12px; color: #86868b; }' +
        '</style></head><body>' +
        '<div class="search-container"><input type="text" id="query" placeholder="읽고 있는 책을 검색하세요..."><button onclick="search()">검색</button></div>' +
        '<div id="results" class="results"></div>' +
        '<script>' +
        'async function search() { const q = document.getElementById("query").value; ' +
        'const res = await fetch("/api/search?q=" + encodeURIComponent(q) + "&key=" + atob("' + k + '")); ' +
        'const data = await res.json(); const resultsDiv = document.getElementById("results"); ' +
        'resultsDiv.innerHTML = data.item.map(book => `<div class="book-item" onclick="addNotion(\'${book.title}\', \'${book.author}\', \'${book.cover}\', \'${book.description}\')"><div class="cover-wrapper"><img src="${book.cover}"></div><div class="info"><h4>${book.title}</h4><p>${book.author}</p></div></div>`).join(""); }' +
        'async function addNotion(title, author, cover, description) { ' +
        'const res = await fetch("/api/notion/add", { method: "POST", headers: { "Content-Type": "application/json" }, ' +
        'body: JSON.stringify({ token: atob("' + t + '"), dbId: atob("' + d + '"), title, author, cover, description }) }); ' +
        'if(res.ok) alert("성공적으로 기록되었습니다! 🤍"); }' +
        '</script></body></html>';
    
    res.send(html);
});

// 2. 노션 DB 목록 불러오기
app.post('/api/notion/databases', async (req, res) => {
    const { token } = req.body;
    try {
        const response = await fetch('https://api.notion.com/v1/search', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
            body: JSON.stringify({ filter: { property: 'object', value: 'database' } })
        });
        const data = await response.json();
        const dbs = data.results.map(db => ({ id: db.id, title: db.title[0]?.plain_text || "이름 없는 DB" }));
        res.json(dbs);
    } catch (err) { res.status(401).json({ error: "Unauthorized" }); }
});

// 3. 알라딘 검색
app.get('/api/search', async (req, res) => {
    const { q, key } = req.query;
    const url = 'http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=' + key + '&Query=' + encodeURIComponent(q) + '&QueryType=Title&MaxResults=10&SearchTarget=Book&output=js&Version=20131101';
    const response = await fetch(url);
    res.json(await response.json());
});

// 4. 노션에 추가
app.post('/api/notion/add', async (req, res) => {
    const { token, dbId, title, author, cover, description } = req.body;
    const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
        body: JSON.stringify({
            parent: { database_id: dbId },
            cover: { type: "external", external: { url: cover } },
            icon: { type: "external", external: { url: cover } },
            properties: {
                "title": { "title": [{ "text": { "content": title } }] },
                "author": { "rich_text": [{ "text": { "content": author } }] }
            },
            children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: description || "" } }] } }]
        })
    });
    if (response.ok) res.sendStatus(200);
    else res.status(500).send("Failed");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Bookshelves Engine Running on Port ' + PORT);
});
