<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bookshelves | Connect</title>
    <style>
        :root {
            --mac-bg: #f5f5f7;
            --mac-card: #ffffff;
            --accent: #1d1d1f;
            --gray-text: #86868b;
            --dot-red: #f3aeaf;
            --dot-yellow: #f7e3af;
            --dot-green: #b1d9b7;
        }

        body {
            margin: 0; background: var(--mac-bg);
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
            display: flex; justify-content: center; align-items: center; min-height: 100vh;
            -webkit-font-smoothing: antialiased;
        }

        .window {
            width: 440px; background: var(--mac-card); border-radius: 18px;
            box-shadow: 0 30px 60px rgba(0,0,0,0.12); overflow: hidden;
            border: 1px solid rgba(0,0,0,0.05);
        }

        .title-bar {
            height: 48px; background: #ffffff; display: flex; align-items: center;
            padding: 0 20px; border-bottom: 0.5px solid #efefef; position: relative;
        }
        .dots { display: flex; gap: 8px; width: 80px; }
        .dot { width: 12px; height: 12px; border-radius: 50%; }
        .dot.red { background: var(--dot-red); } 
        .dot.yellow { background: var(--dot-yellow); } 
        .dot.green { background: var(--dot-green); }
        
        .bar-title { flex: 1; text-align: center; font-size: 14px; font-weight: 500; color: #1d1d1f; }

        .nav-controls { display: flex; gap: 15px; width: 80px; justify-content: flex-end; align-items: center; }
        .nav-btn {
            background: none; border: none; font-size: 18px; cursor: pointer;
            color: #d2d2d7; transition: 0.2s; padding: 0;
        }
        .nav-btn.active { color: #1d1d1f; }
        .finish-btn { font-size: 20px; font-weight: bold; display: none; cursor: pointer; color: #1d1d1f; border:none; background:none; }

        .step-container { padding: 45px; min-height: 350px; display: none; }
        .step-container.active { display: block; animation: fadeIn 0.4s ease; }

        h1 { font-size: 24px; font-weight: 700; margin: 0 0 12px 0; letter-spacing: -0.8px; }
        p.desc { font-size: 14px; color: var(--gray-text); margin-bottom: 32px; line-height: 1.5; }
        .sub-desc { font-size: 13px; color: #d2d2d7; margin-bottom: 20px; margin-top: -25px; }
        
        /* 인티그레이션 바로가기 글자색 수정 */
        .link-sub { 
            font-size: 12px; color: var(--gray-text); text-decoration: none; 
            display: inline-block; margin-top: 8px; transition: 0.2s;
        }
        .link-sub:hover { color: #1d1d1f; text-decoration: underline; }

        .input-group { margin-bottom: 24px; }
        label { display: block; font-size: 11px; font-weight: 700; color: var(--gray-text); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        input, select {
            width: 100%; padding: 14px 16px; border-radius: 12px; border: 1.5px solid #efefef;
            background: #fbfbfd; font-size: 15px; outline: none; box-sizing: border-box;
        }

        .color-palette { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 30px; }
        .color-item { text-align: center; width: 45px; cursor: pointer; }
        .color-circle { width: 40px; height: 40px; border-radius: 50%; border: 2px solid transparent; position: relative; }
        .color-circle.selected { border-color: #1d1d1f; }
        .color-circle.selected::after { content: '✓'; color: #fff; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }

        .custom-slider { margin-bottom: 25px; background: #f5f5f7; padding: 20px; border-radius: 15px; }
        .slider-header { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; font-weight: 600; }
        input[type="color"] { width: 100%; height: 40px; border-radius: 10px; cursor: pointer; border:none; background:none; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }
    </style>
</head>
<body>
<div class="window">
    <div class="title-bar">
        <div class="dots"><div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div></div>
        <div class="bar-title">Bookshelves</div>
        <div class="nav-controls">
            <button class="nav-btn" id="prevBtn" onclick="moveStep(-1)">←</button>
            <button class="nav-btn active" id="nextBtn" onclick="moveStep(1)">→</button>
            <button class="finish-btn" id="finishBtn" onclick="finish()">✓</button>
        </div>
    </div>

    <div class="step-container active" id="step1">
        <h1>Connect Notion</h1>
        <p class="desc">★ 우선 API 토큰을 발급받고, 아카이빙에 사용하는 페이지와 연동해주세요.</p>
        <div class="input-group">
            <label>Internal Integration Token</label>
            <input type="password" id="notion-token" placeholder="secret_xxxxxxx">
            <a href="https://www.notion.so/profile/integrations" target="_blank" class="link-sub">내 인티그레이션 바로가기 ↗</a>
        </div>
    </div>

    <div class="step-container" id="step2">
        <h1>Select Library</h1>
        <p class="sub-desc">Select your Database.</p>
        <p class="desc">도서를 저장할 데이터베이스(BOOK DB)를 목록에서 선택해주세요.</p>
        <div class="input-group"><label>Available Databases</label><select id="db-select"><option>Loading...</option></select></div>
    </div>

    <div class="step-container" id="step3">
        <h1>Personalize</h1>
        <p class="sub-desc">Insert your personal TTB key.</p>
        <div class="input-group">
            <label>Aladin TTB Key</label>
            <input type="text" id="ttb-key" placeholder="ttbxxxxxxx">
        </div>
    </div>

    <div class="step-container" id="step4">
        <h1>Widget Design</h1>
        <p class="desc">위젯의 컬러와 테마를 커스터마이징 하세요.</p>
        <div class="color-palette" id="palette"></div>
        <div class="custom-slider">
            <div class="slider-header"><span>Primary Color</span><span id="hex-val">#F7CBD6</span></div>
            <input type="color" id="primary-picker" value="#f7cbd6" oninput="updateColor(this.value)">
        </div>
    </div>
</div>

<script>
    const SERVER_URL = "https://bookshelves-server.onrender.com";
    let currentStep = 1;
    let selectedColor = "#f7cbd6";

    const colors = [
        { name: 'Pink', hex: '#f7cbd6' }, { name: 'Coral', hex: '#f9d5bb' },
        { name: 'White', hex: '#ffffff' }, { name: 'Yellow', hex: '#f6e8b1' },
        { name: 'Green', hex: '#b4e4c0' }, { name: 'Blue', hex: '#aac4f2' }
    ];

    window.onload = () => {
        const p = document.getElementById('palette');
        p.innerHTML = colors.map(c => `
            <div class="color-item" onclick="pickColor('${c.hex}', this)">
                <div class="color-circle ${c.hex === '#f7cbd6' ? 'selected' : ''}" style="background:${c.hex}; ${c.hex==='#ffffff'?'border:1px solid #eee':''}"></div>
                <div class="color-name" style="font-size:11px; color:#86868b; margin-top:5px;">${c.name}</div>
            </div>
        `).join('');
    };

    async function moveStep(step) {
        if (step === 1) {
            const token = document.getElementById('notion-token').value;
            if (currentStep === 1) {
                if(!token) return alert('토큰을 입력하세요!');
                const select = document.getElementById('db-select');
                select.innerHTML = '<option>불러오는 중...</option>';
                try {
                    const res = await fetch(`${SERVER_URL}/api/notion/databases`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token })
                    });
                    const dbs = await res.json();
                    if(dbs.error) throw new Error();
                    select.innerHTML = dbs.map(db => `<option value="${db.id}">${db.title}</option>`).join('');
                } catch(e) { return alert('연결 실패! 토큰과 노션 설정을 확인해주세요.'); }
            }
        }
        const next = currentStep + step;
        if (next >= 1 && next <= 4) {
            document.querySelectorAll('.step-container').forEach(s => s.classList.remove('active'));
            document.getElementById(`step${next}`).classList.add('active');
            currentStep = next;
            document.getElementById('prevBtn').classList.toggle('active', currentStep > 1);
            document.getElementById('nextBtn').style.display = currentStep === 4 ? 'none' : 'block';
            document.getElementById('finishBtn').style.display = currentStep === 4 ? 'block' : 'none';
        }
    }

    function pickColor(hex, el) {
        selectedColor = hex;
        document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('selected'));
        el.querySelector('.color-circle').classList.add('selected');
        document.getElementById('primary-picker').value = hex;
        document.getElementById('hex-val').innerText = hex.toUpperCase();
    }

    function updateColor(hex) {
        selectedColor = hex;
        document.getElementById('hex-val').innerText = hex.toUpperCase();
        document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('selected'));
    }

    function finish() {
        const params = new URLSearchParams({
            t: btoa(document.getElementById('notion-token').value),
            d: btoa(document.getElementById('db-select').value),
            k: btoa(document.getElementById('ttb-key').value),
            bg: selectedColor.replace('#', '')
        });
        navigator.clipboard.writeText(`${SERVER_URL}/widget?${params.toString()}`);
        alert('복사 완료! 노션에 붙여넣어주세요. 🤍');
    }
</script>
</body>
</html>
