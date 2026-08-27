const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = 7862;

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/' || req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', proxy: 'seedance-cors-proxy' }));
        return;
    }

    if (!req.url.startsWith('/proxy?url=')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Use /proxy?url=<encoded_url>' }));
        return;
    }

    const targetUrl = decodeURIComponent(req.url.slice('/proxy?url='.length));
    let parsed;
    try {
        parsed = new URL(targetUrl);
    } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid target URL' }));
        return;
    }

    const transport = parsed.protocol === 'https:' ? https : http;
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.origin;
    delete headers.referer;

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
        const proxyReq = transport.request(parsed, {
            method: req.method,
            headers
        }, proxyRes => {
            const respHeaders = { ...proxyRes.headers };
            respHeaders['access-control-allow-origin'] = '*';
            res.writeHead(proxyRes.statusCode, respHeaders);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', err => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        });

        if (chunks.length) proxyReq.write(Buffer.concat(chunks));
        proxyReq.end();
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n  ✅ Seedance 跨域代理已启动: http://127.0.0.1:${PORT}`);
    console.log(`  📌 保持此窗口打开，然后正常使用 Seedance 视频生成功能即可\n`);
});
