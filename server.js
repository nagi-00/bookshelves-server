import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

// 1. 위젯 화면 전달 (디자인 커스텀 반영)
app.get('/widget', (req, res) => {
    const { bg, k, t, d } = req.query; // URL 파라미터 읽기
    
    // 1030 여성이 선호하는 미니멀하고 트렌디한 위젯 디자인
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { 
                margin: 0; padding: 15px; background: ${bg || '#ffffff'}; 
                font-family: -apple-system, sans-serif; overflow: hidden;
            }
            .search-container { display: flex; gap: 8px; margin-bottom: 15px; }
            input { 
                flex: 1; padding: 10px 15px; border-radius: 20px; 
                border: 1px solid #efefef; outline: none; font-size: 14px;
            }
            button { 
                padding: 8px 15px; border-radius: 20px; border: none;
                background: #1d1d1f; color: white; cursor: pointer; font-size: 13px;
            }
            .results { display: flex; flex-direction: column; gap: 10px; max-height: 250px; overflow-y: auto; }
            .book-item { 
                display: flex; gap: 12px; padding: 10px; border-radius: 12px;
                background: rgba(255,255,255,0.5); cursor: pointer; transition: 0.2s;
            }
            .book-item:hover { background: rgba(0,0,0,0.03); }
            
            /* 표지 음영 완화: 요청하신 대로 아주 연하게 수정 */
            .cover-wrapper {
                width: 50px; height: 75px; flex-shrink: 0;
                box-shadow: 2px 4px 10px rgba(0,0,0,0.08); /* 기존보다 훨씬 연한 그림자 */
                border-radius: 4px; overflow: hidden;
            }
            .cover-wrapper img { width: 100%; height: 100%; object-fit: cover; }
            
            .info h4 { margin: 0 0 4px 0; font-size: 14px; color: #1d1d1f; }
            .info p { margin: 0; font-size: 12px; color: #86868b; }
        </style>
    </head>
    <body>
        <div class="search-container">
            <input type="text" id="query" placeholder="읽고 있는 책을 검색하세요...">
            <button onclick="search()">검색</button>
        </div>
        <div id="results" class="results"></div>

        <script>
            async function search() {
                const q = document.getElementById('query').value;
                const res = await fetch(\`/api/search?q=\${encodeURIComponent(q)}&key=\${atob('${k}')}\`);
                const data = await res.json();
                
                const resultsDiv = document.getElementById('results');
                resultsDiv.innerHTML = data.item.map(book => \`
                    <div class="book-item" onclick="addNotion('\${book.title}', '\${book.author}', '\${book.cover}', '\${book.description}')">
                        <div class="cover-wrapper"><img src="\${book.cover}"></div>
                        <div class="info">
                            <h4>\${book.title}</h4>
                            <p>\${book.author}</p>
                        </div>
                    </div>
                \`).join('');
            }

            async function addNotion(title, author, cover, description) {
                const res = await fetch('/api/notion/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: atob('${t}'),
                        dbId: atob('${d}'),
                        title, author, cover, description
                    })
                });
                if(res.ok) alert('성공적으로 기록되었습니다! 🤍');
            }
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

// --- 이하 기존 API들 (databases, search, add) 그대로 유지 ---
app.post('/api/notion/databases', async (req, res) => { /* 기존 코드 */ });
app.get('/api/search', async (req, res) => { /* 기존 코드 */ });
app.post('/api/notion/add', async (req, res) => { /* 기존 코드 */ });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Bookshelves Engine Running on \${PORT}\`));
