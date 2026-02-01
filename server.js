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
            navigator.clipboard.writeText(url); alert("위젯 생성 성공! 노션에 붙여넣으세요. 🤍"); return;
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
        document.getElementById('resultList').innerHTML = books.map(b => {
            // 아카이빙 실패 방지를 위한 데이터 인코딩
            const safeData = encodeURIComponent(JSON.stringify(b));
            return `
            <div class="book-card" onclick="saveToNotion('${safeData}')">
                <img src="${b.cover}" class="book-cover" onerror="this.src='https://via.placeholder.com/150x200?text=No+Image'">
                <div class="book-info"><div class="b-title">${b.title}</div><div class="b-author">${b.author}</div></div>
            </div>
        `}).join('');
    }

    async function saveToNotion(encodedData) {
        const book = JSON.parse(decodeURIComponent(encodedData));
        const res = await fetch(`${SERVER_URL}/api/notion/save`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                token: atob(params.get('t')), 
                db: atob(params.get('d')), 
                ...book 
            })
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
