import { getAssetFromKV } from '@cloudflare/kv-asset-handler'

/**
 * The contents of the website folder
 * @type {import('@cloudflare/kv-asset-handler').AssetsManifest}
 */
import manifestJSON from '__STATIC_CONTENT_MANIFEST'
const assetManifest = JSON.parse(manifestJSON)

export default {
  async fetch(request, env, ctx) {
    try {
      // 添加 COOP/COEP headers 以支援 SharedArrayBuffer (SQLite WASM)
      const mapRequestToAsset = (req) => {
        const url = new URL(req.url)

        // 處理 SPA 路由 - 所有路徑返回 index.html
        if (!url.pathname.includes('.')) {
          url.pathname = '/'
        }

        return new Request(url.toString(), req)
      }

      const response = await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
          mapRequestToAsset,
        }
      )

      // 添加必要的 headers 給 SQLite WASM
      const headers = new Headers(response.headers)
      headers.set('Cross-Origin-Opener-Policy', 'same-origin')
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp')

      // PWA 相關 headers
      headers.set('X-Content-Type-Options', 'nosniff')
      headers.set('X-Frame-Options', 'DENY')
      headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    } catch (e) {
      if (e instanceof Error && e.message.includes('could not find')) {
        return new Response('Not Found', { status: 404 })
      }
      return new Response(e instanceof Error ? e.message : String(e), { status: 500 })
    }
  },
}
