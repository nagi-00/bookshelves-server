import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

// 1. 위젯 화면 전달 (파라미터로 받은 색상을 온전히 반영)
app.get('/widget', (req, res) => {
    const { bg, k, t, d } = req.query;
    const themeColor = bg ? '#' + bg : '#f7cbd6'; // 기본값은 사용자님의 시그니처 핑크

    const html = `
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            :root {
                --accent: ${themeColor};
                --dot-red: #f3aeaf;
                --dot-yellow: #f7e3af;
                --dot-green: #b1d9b7;
            }
            body { 
                margin: 0; padding: 0; background: #ffffff; 
                font-family: -apple-system, sans-serif; overflow: hidden;
                display: flex; flex-direction: column; height: 100vh;
            }
            /* 위젯 내부 상단바 - 온보딩 디자인과 통일 */
            .w-header {
                height: 40px; background: #ffffff; display: flex; align-items: center;
                padding: 0 15px; border-bottom: 0.5px solid #efefef; flex-shrink: 0;
            }
            .dots { display: flex; gap: 6px; flex: 1; }
            .dot { width: 10px; height: 10px; border-radius: 50%; }
            .dot.red { background: var(--dot-red); }
            .dot.yellow { background: var(--dot-yellow); }
            .dot.green { background: var(--dot-green); }
            .w-title { font-size: 12px; font-weight: 600; color: #1d1d1f; position: absolute; left: 50%; transform: translateX(-50%); }

            /* 검색 영역 */
            .search-box { 
                padding: 15px; background: var(--accent); /* 선택한 컬러가 배경으로 */
                display: flex; gap: 8px; transition: 0.3s;
            }
            input { 
                flex: 1; padding: 10px 15px; border-radius: 20px; 
                border: none; outline: none; font-size: 13px; background: rgba(255,255,255,0.9);
            }
            button { 
                padding: 0 15px; border-radius: 20px; border: none;
                background: #1d1d1f; color: white; cursor: pointer; font-size: 12px;
            }

            .results { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
            .book-item { 
                display: flex; gap: 12px; padding: 10px; border-radius: 12px;
                background: #fff; cursor: pointer; transition: 0.2s; border: 1px solid #f5f5f7;
            }
            .book-item:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
            
            /* 표지 음영 완화 (요청 사항) */
            .cover-wrapper {
                width: 45px; height: 65px; flex-shrink: 0;
                box-shadow: 2px 4px 12px rgba(0,0,0,0.06); /* 아주 부드러운 그림자 */
                border-radius: 4px; overflow: hidden;
            }
            .cover-wrapper img { width: 100%; height: 100%; object-fit: cover; }
            
            .info h4 { margin: 0 0 2px 0; font-size: 13px; color: #1d1d1f; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .info p { margin: 0; font-size: 11px; color: #86868b; }

            /* 커스텀 스크롤바 */
            .results::-webkit-scrollbar { width: 4px; }
            .results::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        </style>
    </head>
    <body>
        <div class="w-header">
            <div class="dots"><div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div></div>
            <div class="w-title">Bookshelves</div>
        </div>
        <div class="search-box">
            <input type="text" id="query" placeholder="어떤 책을 읽으셨나요?">
            <button onclick="search()">Search</button>
        </div>
        <div id="results" class="results"></div>

        <script>
            async function search() {
                const q = document.getElementById('query').value;
                if(!q) return;
                const res = await fetch(\`/api/search?q=\${encodeURIComponent(q)}&key=\${atob('${k}')}\`);
                const data = await res.json();
                
                const resultsDiv = document.getElementById('results');
                resultsDiv.innerHTML = data.item.map(book => \`
                    <div class="book-item" onclick="addNotion('\${book.title.replace(/'/g, "")}', '\${book.author.replace(/'/g, "")}', '\${book.cover}', '\${book.description?.replace(/'/g, "") || ""}')">
                        <div class="cover-wrapper"><img src="\${book.cover}"></div>
                        <div class="info">
                            <h4>\${book.title}</h4>
                            <p>\${book.author}</p>
                        </div>
                    </div>
                \`).join('');
            }

            async function addNotion(title, author, cover, description) {
                try {
                    const res = await fetch('/api/notion/add', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: atob('${t}'),
                            dbId: atob('${d}'),
                            title, author, cover, description
                        })
                    });
                    if(res.ok) alert('서재에 추가되었습니다. 🤍');
                } catch(e) { alert('추가 실패'); }
            }
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

// --- 이하 API 로직 (Notion/Aladin) 동일하게 유지 ---
app.post('/api/notion/databases', async (req, res) => { /* 생략 */ });
app.get('/api/search', async (req, res) => { /* 생략 */ });
app.post('/api/notion/add', async (req, res) => { /* 생략 */ });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Engine Live'));
