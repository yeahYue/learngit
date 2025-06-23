const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// 解析 json
app.use(bodyParser.json());

app.post('/github-webhook', (req, res) => {
    const headers = req.headers;
    const githubEvent = headers['x-github-event'];  // 如 pull_request、push、issues
    const payload = req.body;

    const eventId = uuidv4();  // 生成唯一ID
    const timestamp = new Date().toISOString();

    // 从payload中提取字段
    const structured = {
        event_id: eventId,
        event_type: "github_webhook",
        event_source: "github",
        timestamp: timestamp,
        priority: 5,  // 可根据事件类型调整

        context: {
            workspace_path: "/path/to/workspace",  // 可由调用方补充
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
            title: payload.pull_request?.title || payload.issue?.title || payload.head_commit?.message || "",
            body: payload.pull_request?.body || payload.issue?.body || "",
            labels: (payload.pull_request?.labels || payload.issue?.labels || []).map(l => l.name),
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

    console.log(JSON.stringify(structured, null, 2));  // 替代发往调度系统

    res.status(200).send('Webhook received and processed');
});

app.listen(PORT, () => {
    console.log(`🚀 Webhook listener running at http://localhost:${PORT}/github-webhook`);
});
