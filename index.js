const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = 3000;

// ✅ 解析 JSON 请求体
app.use(bodyParser.json());

// ✅ 接收 GitHub Webhook POST 请求
app.post('/github-webhook', async (req, res) => {
    console.log('✅ Webhook 被触发了');

    const headers = req.headers;
    const githubEvent = headers['x-github-event'];  // 事件类型，如 push、pull_request
    const payload = req.body;

    const structured = {
        event_id: uuidv4(),
        event_type: "github_webhook",
        event_source: "github",
        timestamp: new Date().toISOString(),
        priority: 5,

        context: {
            workspace_path: "/your/workspace/path",
            current_project: payload.repository?.name || "",
            environment: {}
        },

        payload: {
            github_event_type: githubEvent,
            repository: payload.repository?.full_name || "",
            sender: payload.sender?.login || "",
            ref: payload.ref || "",
            commit_id: payload.head_commit?.id || "",
            issue_number: payload.issue?.number || null,
            pull_request_number: payload.pull_request?.number || null,
            title:
                payload.pull_request?.title ||
                payload.issue?.title ||
                payload.head_commit?.message ||
                "",
            body:
                payload.pull_request?.body ||
                payload.issue?.body ||
                "",
            labels:
                (payload.pull_request?.labels ||
                    payload.issue?.labels ||
                    []).map((l) => l.name),
            action: payload.action || "",
            changes: payload.changes || {},
            url:
                payload.pull_request?.html_url ||
                payload.issue?.html_url ||
                payload.repository?.html_url ||
                ""
        },

        metadata: {
            correlation_id: uuidv4(),
            trigger_rules: ["github_event_match"],
            confidence: 0.95
        }
    };

    console.log("📦 Structured JSON:\n", JSON.stringify(structured, null, 2));

    try {
        // ✅ 转发到 webhook.site
        const result = await axios.post('https://webhook.site/bb73cd76-d8bf-43b5-a2d9-1cb532c07710/webhook', structured, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log("✅ 已成功转发至 webhook.site");
    } catch (err) {
        console.error("❌ 转发失败：", err.message);
    }

    res.status(200).send('Webhook received and processed');
});

// ✅ 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 Webhook listener running at http://localhost:${PORT}/github-webhook`);
});
