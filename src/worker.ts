// Cloudflare Worker - Wrangler v3 Assets + Headers
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 讓 Assets 處理靜態資源
    // 但這裡無法直接修改 headers，需要另一種方式

    // 暫時直接返回，headers 會在下一個中間件處理
    return env.ASSETS.fetch(request);
  },
};

interface Env {
  ASSETS: Fetcher;
}

// 需要這個來讓 TypeScript 認識 ExecutionContext
interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}
