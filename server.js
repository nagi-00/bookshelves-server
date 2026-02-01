<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bookshelves Cooker</title>
    <style>
        :root {
            --theme-color: #ffffff; 
            --accent-color: #1d1d1f;
            --hover-color: rgba(0, 0, 0, 0.04);
            --shadow-pale: 0 4px 12px rgba(0,0,0,0.06);
            --dark-theme-color: #333;
        }

        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; letter-spacing: -0.01em; }
        body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: transparent; padding: 20px; }

        /* 온보딩 설정 창 디자인 (수정 금지) */
        .window {
            width: 100%; max-width: 420px; background: #fff; border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08); overflow: hidden;
            border: 1px solid rgba(0,0,0,0.06); display: flex; flex-direction: column;
            margin-bottom: 25px; z-index: 10;
        }
        .title-bar { height: 50px; background: #fff; display: flex; align-items: center; padding: 0 16px; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .dots { display: flex; gap: 7px; flex: 1; }
        .dot { width: 11px; height: 11px; border-radius: 50%; }
        .dot.red { background: #e8bcbc; } .dot.yellow { background: #f4f4bd; } .dot.green { background: #c5e8c5; }
        .bar-title { font-size: 13px; font-weight: 700; color: #333; flex: 2; text-align: center; }
        .nav-controls { flex: 1; display: flex; justify-content: flex-end; gap: 12px; }
        .content { padding: 30px 25px; min-height: 280px; position: relative; }
        .step { display: none; animation: fadeUp 0.3s ease; }
        .step.active { display: block; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        h1 { font-size: 20px; font-weight: 800; margin: 0 0 8px; color: #1d1d1f; }
        p { font-size: 13px; color: #86868b; margin-bottom: 20px; line-height: 1.4; }
        input, select { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #eee; background: #f9f9fc; outline: none; font-size: 13px; margin-bottom: 10px; }
        .color-palette { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
        .color-dot { width: 18px; height: 18px; border-radius: 50%; cursor: pointer; border: 2px solid #fff; box-shadow: 0 0 0 1px #ddd; }
        .color-dot.active { box-shadow: 0 0 0 2px #333; }

        /* [핵심] 위젯 크기 240x175 절대 고정 */
        .widget-frame {
            width: 240px !important; 
            height: 175px !important; 
            background: #fff; border-radius: 16px;
            box-shadow: var(--shadow-pale); overflow: hidden; display: flex; flex-direction: column;
            border: 1px solid rgba(0,0,0,0.05); margin: 0 auto;
            position: relative;
        }
        body.is-embed .widget-frame { width: 240px !important; height: 175px !important; border-radius: 16px; }

        .widget-top {
            height: 32px; background: var(--theme-color);
            display: flex; align-items: center; padding: 0 10px; transition: 0.3s;
            position: relative; flex-shrink: 0;
        }
        .w-dots { display: flex; gap: 4.5px; position: absolute; left: 10px; }
        .w-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(0,0,0,0.12); }
        .w-title { font-size: 10px; font-weight: 700; color: #1d1d1f; width: 100%; text-align: center; }

        #widgetHome { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 143px; }
        #currentTime { font-size: 32px; font-weight: 800; color: var(--dark-theme-color); line-height: 0.9; margin-bottom: 2px; }
        #currentDate { font-size: 8px; color: #bbb; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
        
        .search-trigger {
            background: rgba(0,0,0,0.03); border: 0.5px solid rgba(0,0,0,0.05);
            padding: 3px 12px; border-radius: 12px; font-size: 9px; font-weight: 300;
            color: var(--theme-color); cursor: pointer; transition: 0.2s;
            filter: contrast(0.8) brightness(0.8);
        }

        #widgetSearch { display: none; flex: 1; flex-direction: column; overflow: hidden; height: 143px; }
        .search-area { padding: 8px; background: #fafafa; flex-shrink: 0; }
        .search-box {
            background: #fff; border-radius: 6px; border: 1px solid #e5e5e7;
            display: flex; align-items: center; padding: 0 8px; height: 26px;
        }
        .search-box input { 
            border: none; background: none; font-size: 10px; width: 100%; outline: none; 
            height: 100%; line-height: normal; padding: 0 4px; display: flex; align-items: center;
        }

        .book-list { flex: 1; overflow-y: auto; padding: 4px; }
        .book-card { display: flex; gap: 8px; padding: 6px; border-radius: 8px; cursor: pointer; transition: 0.2s; margin-bottom: 3px; align-items: center; }
        .book-card:hover { background: var(--hover-color); }
        .book-cover { width: 34px; height: 50px; border-radius: 3px; object-fit: cover; background: #f0f0f2; flex-shrink: 0; }
        .b-title { font-size: 9px; font-weight: 700; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .b-author { font-size: 8px; color: #999; }

        .icon-btn { background: none; border: none; cursor: pointer; color: #aaa; padding: 0; display: flex; align-items: center; }
        #toast { position: fixed; bottom: -60px; left: 50%; transform: translateX(-50%); background: #1d1d1f; color: #fff; padding: 8px 18px; border-radius: 20px; font-size: 11px; transition: 0.4s; z-index: 100; }
        #toast.show { bottom: 30px; }
        body.is-embed .window { display: none; }
    </style>
</head>
<body>

    <div class="window" id="setupWindow">
        <div class="title-bar">
            <div class="dots"><div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div></div>
            <div class="bar-title">Bookshelves Cooker</div>
            <div class="nav-controls">
                <button class="nav-btn" id="prevBtn" onclick="moveStep(-1)" disabled><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg></button>
                <button class="nav-btn" id="nextBtn" onclick="moveStep(1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg></button>
            </div>
        </div>
        <div class="content">
            <div class="step active" id="step1">
                <h1>Connect Notion</h1>
                <p>프라이빗 API 토큰을 입력하세요.</p>
                <input type="password" id="tokenInput" placeholder="secret_...">
                <div style="margin-top: 5px;"><a href="https://www.notion.so/my-integrations" target="_blank" style="font-size:12px; color:#86868b; text-decoration:none;">내 인테그레이션 바로가기 ↗</a></div>
            </div>
            <div class="step" id="step2">
                <h1>Select Library</h1>
                <p>책을 저장할 데이터베이스를 선택하세요.</p>
                <select id="dbSelect"></select>
            </div>
            <div class="step" id="step3">
                <h1>Customize</h1>
                <p>TTB 키와 위젯 디자인을 설정하세요.</p>
                <input type="text" id="ttbInput" placeholder="알라딘 TTB 키">
                <div class="color-palette" id="palette"></div>
                <input type="color" id="cp" style="visibility:hidden;width:0;height:0;" oninput="updateTheme(this.value)">
                <button class="search-trigger" style="background:#f5f5f7;color:#999;font-weight:600;font-size:11px;" onclick="document.getElementById('cp').click()">Custom Color</button>
            </div>
        </div>
    </div>

    <div class="widget-frame">
        <div class="widget-top"><div class="w-dots"><div class="w-dot"></div><div class="w-dot"></div><div class="w-dot"></div></div><div class="w-title">Bookshelves</div></div>
        <div id="widgetHome">
            <div id="currentTime">00:00</div>
            <div id="currentDate">SUN, FEB 1</div>
            <button class="search-trigger" onclick="showSearch()">Search</button>
        </div>
        <div id="widgetSearch">
            <div class="search-area">
                <div class="search-box">
                    <button class="icon-btn" onclick="goHome()" style="margin-right: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>
                    <input type="text" id="searchInput" placeholder="Search books..." onkeypress="if(event.key==='Enter')performSearch()">
                </div>
            </div>
            <div class="book-list" id="resultList"></div>
        </div>
    </div>
    <div id="toast">Saved! 🤍</div>

<script>
    const SERVER_URL = "https://bookshelves-server.onrender.com";
    const themes = ["e8bcbc", "f4f4bd", "c5e8c5", "a4c4e4", "ffffff", "1d1d1f"];
    let step = 1, selectedColor = "ffffff";
    const params = new URLSearchParams(window.location.search);

    function updateClock() {
        const now = new Date();
        document.getElementById('currentTime').innerText = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        document.getElementById('currentDate').innerText = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    setInterval(updateClock, 1000); updateClock();

    function showSearch() {
        document.getElementById('widgetHome').style.display = 'none';
        document.getElementById('widgetSearch').style.display = 'flex';
        document.getElementById('searchInput').focus();
    }

    function goHome() {
        document.getElementById('widgetSearch').style.display = 'none';
        document.getElementById('widgetHome').style.display = 'flex';
    }

    if (params.get('t')) {
        document.body.classList.add('is-embed');
        const c = params.get('c');
        if(c) updateTheme('#'+c);
    } else {
        const pal = document.getElementById('palette');
        themes.forEach(t => {
            const d = document.createElement('div');
            d.className = 'color-dot' + (t==='ffffff'?' active':'');
            d.style.background = '#' + t;
            d.onclick = () => {
                document.querySelectorAll('.color-dot').forEach(el => el.classList.remove('active'));
                d.classList.add('active');
                updateTheme('#'+t);
            };
            pal.appendChild(d);
        });
    }

    function updateTheme(hex) {
        selectedColor = hex.replace('#', '');
        document.documentElement.style.setProperty('--theme-color', hex);
        const r = parseInt(selectedColor.slice(0,2), 16), g = parseInt(selectedColor.slice(2,4), 16), b = parseInt(selectedColor.slice(4,6), 16);
        const darkR = Math.max(0, r - 100), darkG = Math.max(0, g - 100), darkB = Math.max(0, b - 100);
        document.documentElement.style.setProperty('--dark-theme-color', `rgb(${darkR},${darkG},${darkB})`);
        document.documentElement.style.setProperty('--hover-color', `rgba(${r},${g},${b},0.12)`);
    }

    async function moveStep(n) {
        if (n === 1 && step === 1) {
            const tk = document.getElementById('tokenInput').value;
            const res = await fetch(`${SERVER_URL}/api/notion/databases`, { 
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ token: tk })
            });
            const dbs = await res.json();
            document.getElementById('dbSelect').innerHTML = dbs.map(d => `<option value="${d.id}">${d.title}</option>`).join('');
        }
        if (step + n === 4) {
            const t = btoa(document.getElementById('tokenInput').value);
            const d = btoa(document.getElementById('dbSelect').value);
            const k = btoa(document.getElementById('ttbInput').value);
            const url = `${window.location.origin}${window.location.pathname}?t=${t}&d=${d}&k=${k}&c=${selectedColor}`;
            navigator.clipboard.writeText(url); alert("위젯 URL이 복사되었습니다! 🤍"); return;
        }
        document.getElementById(`step${step}`).classList.remove('active');
        step += n;
        document.getElementById(`step${step}`).classList.add('active');
        document.getElementById('prevBtn').disabled = (step === 1);
    }

    async function performSearch() {
        const query = document.getElementById('searchInput').value;
        const res = await fetch(`${SERVER_URL}/api/search?k=${atob(params.get('k'))}&q=${encodeURIComponent(query)}`);
        const books = await res.json();
        document.getElementById('resultList').innerHTML = books.map(b => `
            <div class="book-card" onclick="saveToNotion('${b.title.replace(/'/g, "\\'")}', '${b.author.replace(/'/g, "\\'")}', '${b.cover}', '${b.description.replace(/'/g, "\\'").replace(/\n/g, " ")}')">
                <img src="${b.cover}" class="book-cover" onerror="this.src='https://via.placeholder.com/150x200?text=No+Image'">
                <div class="book-info"><div class="b-title">${b.title}</div><div class="b-author">${b.author}</div></div>
            </div>
        `).join('');
    }

    async function saveToNotion(title, author, cover, description) {
        const res = await fetch(`${SERVER_URL}/api/notion/save`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ token: atob(params.get('t')), db: atob(params.get('d')), title, author, cover, description })
        });
        const data = await res.json();
        if(data.success) {
            const t = document.getElementById('toast');
            t.classList.add('show'); 
            setTimeout(() => { t.classList.remove('show'); goHome(); }, 2000);
        } else {
            alert("저장 실패: " + data.error);
        }
    }
</script>
</body>
</html>
