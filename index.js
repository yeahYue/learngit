const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// 中间件配置
// ======================
app.use(bodyParser.json());

// 请求验证中间件
app.use('/github-webhook', (req, res, next) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });
    next();
});

// 请求日志
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ======================
// 配置
// ======================
const WEBHOOK_SITE_URL = 'https://free-turkeys-retire.loca.lt'; // 新地址
const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

// ======================
// 处理器
// ======================
app.post('/github-webhook', async (req, res) => {
    try {
        // 1. 基础验证
        if (!req.headers['x-github-event']) {
            return res.status(400).json({ error: 'Missing X-GitHub-Event header' });
        }

        // 2. 签名验证（略，保持原逻辑）

        // 3. 构建数据
        const structuredData = buildStructuredPayload(req);
        console.log('📦 结构化数据:', structuredData.payload.github_event_type);

        // 4. 转发
        const forwardResult = await forwardToWebhookSite(structuredData);
        console.log('✅ 转发状态:', forwardResult.status);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('🔥 处理错误:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ======================
// 工具函数
// ======================
function buildStructuredPayload(req) {
    // 保持原逻辑
}

async function forwardToWebhookSite(data) {
    const response = await axios.post(WEBHOOK_SITE_URL, data, {
        headers: {
            'Content-Type': 'application/json',
            'X-GitHub-Event': data.payload.github_event_type
        },
        timeout: 5000
    });
    return response;
}

// ======================
// 启动服务
// ======================
app.listen(PORT, () => {
    console.log(`
  🚀 Server ready: http://localhost:${PORT}
  🔌 Webhook URL: http://localhost:${PORT}/github-webhook
  📤 Forwarding to: ${WEBHOOK_SITE_URL}
  `);
});