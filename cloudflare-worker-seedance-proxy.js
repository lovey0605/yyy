/**
 * Cloudflare Worker - Seedance 跨域代理
 * 
 * 部署步骤（5分钟）：
 * 1. 打开 https://dash.cloudflare.com/ 注册/登录（免费）
 * 2. 左侧菜单点「Workers & Pages」→「Create」→「Create Worker」
 * 3. 随便起个名字（比如 seedance-proxy），点「Deploy」
 * 4. 点「Edit code」，删掉编辑器里所有内容，把本文件全部内容粘贴进去
 * 5. 点右上角「Deploy」保存
 * 6. 你会得到一个地址，类似：https://seedance-proxy.你的用户名.workers.dev
 * 7. 把这个地址填到下面 settings.js 中的 SEEDANCE_WORKER_URL 常量里
 * 
 * 完成后所有用户即可使用 Seedance 视频生成，无需任何配置。
 * 免费额度：每天 10 万次请求，完全够用。
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // 从 URL path 中解析目标地址
  const url = new URL(request.url);
  const targetPath = url.pathname.slice(1);
  const targetUrl = targetPath + url.search;

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return new Response(JSON.stringify({ error: '请传入目标 URL，格式: /https://ark.cn-beijing.volces.com/...' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // 转发请求
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('origin');
  headers.delete('referer');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');

  try {
    const resp = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
    });

    // 返回响应并添加 CORS 头
    const respHeaders = new Headers(resp.headers);
    respHeaders.set('Access-Control-Allow-Origin', '*');
    respHeaders.set('Access-Control-Expose-Headers', '*');

    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: respHeaders
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
