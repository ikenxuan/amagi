import type { ClientCtx } from 'amagi/client/fetcher'
import { PLATFORM_RUNTIME } from 'amagi/client/runtime'
import type { Platform } from 'amagi/contracts/platform'
import { AmagiHeaders, type RawResponse, type RequestConfig, type RequestSpec } from 'amagi/contracts/request'

/**
 * 造一个「手搓 ctx」：`send` 换成记录器，不打网络。
 *
 * 这条路径是 `client/fetcher.ts` 里 `scope` 的可选性特意留出来的 ——
 * 不传 `scope` 时 execute 退回 `ctx.send`。签名器 / judge 从 `PLATFORM_RUNTIME`
 * 取真的，这样测的是「真签名 + 真判定」，只把网络那一跳换掉。
 *
 * 两处刻意注入：
 * - `sleep` 换成不等待的：抖音档案带 `retryOn: ['ANTIBOT_PAGE']`，而字符串响应体
 *   正好会被判成它 —— 真 sleep 会让那几条用例各等 1s+2s+4s。
 * - `calls` 记下 send 的**第三参**（per-call 请求配置）：调用方塞给 axios 的
 *   `headers` / `timeout` 走的是 `requestConfig`，不在 `spec.headers` 上，
 *   要断言它们到没到就得看这里。
 * @param platform - 平台
 * @param cookie - 绑定的 cookie
 * @param respond - 自定义响应体；缺省是抖音形状的成功体
 * @returns `{ ctx, sent, calls }`：ctx、每次发出的 spec、每次的 per-call 配置
 */
export const makeRequestCtx = (
  platform: Platform,
  cookie: string,
  respond: (spec: RequestSpec) => RawResponse = (spec) => ({
    status: 200,
    statusText: 'OK',
    headers: new AmagiHeaders(),
    body: { status_code: 0, aweme_detail: { aweme_id: '1' } },
    durationMs: 1,
    url: spec.url
  })
) => {
  const sent: RequestSpec[] = []
  const calls: (RequestConfig | undefined)[] = []
  const runtime = PLATFORM_RUNTIME[platform]
  const ctx: ClientCtx = {
    clientId: 'test-1',
    platform,
    cookie,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    requestConfig: {},
    ...(runtime.signers === undefined ? {} : { signers: runtime.signers }),
    ...(runtime.judge === undefined ? {} : { judge: runtime.judge }),
    sleep: async () => {},
    send: async (spec, _reason, perCall) => {
      sent.push(spec)
      calls.push(perCall)
      return respond(spec)
    }
  }
  return { ctx, sent, calls }
}
