const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// 允许所有源的 CORS
app.use(cors());
app.use(express.json());

// 代理 AI API 请求
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { url, headers, body } = req.body;
    
    console.log('代理请求到:', url);
    console.log('请求头:', headers);
    console.log('请求体:', body);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      res.json(data);
    } else {
      res.status(response.status).json(data);
    }
    
  } catch (error) {
    console.error('代理请求失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`代理服务器运行在 http://localhost:${PORT}`);
});