// server.js의 데이터베이스 검색 부분 수정본
app.post('/api/notion/databases', async (req, res) => {
    const { token } = req.body;
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
        if (!response.ok) return res.status(response.status).json(data);
        const dbs = data.results.map(db => ({ 
            id: db.id, 
            title: db.title[0]?.plain_text || "이름 없는 DB" 
        }));
        res.json(dbs);
    } catch (err) { 
        res.status(500).json({ error: "Server Error" }); 
    }
});
