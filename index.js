const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const os = require('os');

const app = express();
const PORT = 5000;

// ======================
// 中间件配置
// ======================
app.use(bodyParser.json());

// 请求日志中间件（调试用）
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ======================
// 环境变量配置
// ======================
const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET || ''; // 可选：GitHub签名验证

// ======================
// GitHub Webhook 处理器
// ======================
app.post('/github-webhook', async (req, res) => {
    try {
        // 1. 验证请求基本数据
        if (!req.headers['x-github-event']) {
            console.warn('⚠️ 非GitHub Webhook请求');
            return res.status(400).json({ error: 'Missing GitHub event header' });
        }

        // 2. 签名校验（可选）
        if (GITHUB_SECRET) {
            const signature = req.headers['x-hub-signature-256'];
            const hmac = require('crypto')
                .createHmac('sha256', GITHUB_SECRET)
                .update(JSON.stringify(req.body))
                .digest('hex');

            if (`sha256=${hmac}` !== signature) {
                console.error('❌ 签名验证失败');
                return res.status(403).json({ error: 'Invalid signature' });
            }
        }

        // 3. 构建结构化数据
        const structuredData = buildStructuredPayload(req);
        console.log('📦 生成的结构化数据:');
        console.log(JSON.stringify(structuredData, null, 2));

        // 4. 响应GitHub
        res.status(200).json({
            success: true,
            received: true
        });

    } catch (error) {
        console.error('🔥 处理失败:', {
            message: error.message,
            stack: error.stack,
            request: {
                headers: req.headers,
                body: req.body
            }
        });
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

// ======================
// 工具函数
// ======================
function buildStructuredPayload(req) {
    const { headers, body: payload } = req;
    const githubEvent = headers['x-github-event'];

    return {
        event_id: uuidv4(),
        event_type: "github_webhook",
        event_source: "github",
        timestamp: new Date().toISOString(),
        priority: 5,

        context: {
            workspace_path: process.cwd(),
            current_project: payload.repository?.name || "unknown",
            environment: {
                node_version: process.version,
                hostname: os.hostname()
            }
        },

        payload: {
            github_event_type: githubEvent,
            repository: payload.repository?.full_name || "",
            sender: payload.sender?.login || "",
            ref: payload.ref || "",
            commit_id: payload.head_commit?.id || "",
            issue_number: payload.issue?.number || null,
            pull_request_number: payload.pull_request?.number || null,
            title: payload.pull_request?.title || payload.issue?.title || payload.head_commit?.message || "",
            body: payload.pull_request?.body || payload.issue?.body || "",
            labels: (payload.pull_request?.labels || payload.issue?.labels || []).map(l => l.name),
            action: payload.action || "",
            changes: payload.changes || {},
            url: payload.pull_request?.html_url || payload.issue?.html_url || payload.repository?.html_url || ""
        },

        metadata: {
            correlation_id: uuidv4(),
            trigger_rules: ["github_event_match"],
            confidence: 0.95,
            processed_at: new Date().toISOString()
        }
    };
}

// ======================
// 启动服务器
// ======================
app.listen(PORT, () => {
    console.log(`🚀 服务器已启动: http://localhost:${PORT}`);
    console.log(`🔌 Webhook 端点: http://localhost:${PORT}/github-webhook`);
    if (!GITHUB_SECRET) {
        console.warn('⚠️ 未配置 GITHUB_WEBHOOK_SECRET，签名验证已禁用');
    }
});
