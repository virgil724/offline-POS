// Cloudflare Worker - Wrangler Assets + Headers
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    let response = await env.ASSETS.fetch(request);

    // SPA 路由處理：如果找不到檔案 (404) 且請求不是針對特定檔案（不含副檔名）
    // 則嘗試回傳 index.html
    if (response.status === 404 && !url.pathname.includes('.')) {
      const indexRequest = new Request(`${url.origin}/index.html`, request);
      response = await env.ASSETS.fetch(indexRequest);
    }

    const newHeaders = new Headers(response.headers);
    
    // 確保 SQLite WASM 所需的 headers 存在
    newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
    newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
    
    // PWA 安全性與效能相關 headers
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    newHeaders.set('X-Frame-Options', 'DENY');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};

interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}