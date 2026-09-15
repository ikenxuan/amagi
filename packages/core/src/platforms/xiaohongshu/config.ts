import type { HeadersInput, RequestConfig } from '../../contracts/request'
import { AmagiHeaders } from '../../contracts/request'
import { DEFAULT_UA, generateSecChUa } from '../../contracts/ua'

/**
 * 小红书默认 header 基线。
 *
 * header 放在 `AmagiHeaders` 大小写不敏感容器里，`Cookie` / `cookie` 都找得到。
 * 接受 `(cookie, requestConfig)` 两个形参，调用方配置优先生效；`cookie` 会 `trim()`；
 * 默认 `timeout: 10000`（与抖音 / B站 / 快手一致），method 归端点声明，不属于基线。
 * 默认 UA 不带 `Edg/`，`sec-ch-ua` 按 UA 的 Chrome 版本动态生成（与抖音 / B站同款逻辑）。
 *
 * 默认 UA 取 `contracts/ua.ts` 的集中版本。
 *
 * 返回 `{ headers, requestConfig }` 两段，供 client 组装时分别交给
 * `HttpClient` 的 `headers` 与 `requestConfig`。
 */

/** 默认超时，与抖音 / B站 / 快手一致 */
export const XIAOHONGSHU_DEFAULT_TIMEOUT = 10000

/** 从请求配置里取 UA：大小写不敏感，取不到用集中维护的默认值 */
const userAgentOf = (requestConfig?: RequestConfig): string => {
  const fromConfig = new AmagiHeaders(requestConfig?.headers as HeadersInput).get('user-agent')
  return fromConfig ?? DEFAULT_UA
}

/**
 * 构造小红书默认请求配置。
 * @param cookie - 用户 cookie（会 trim）
 * @param requestConfig - 外部请求配置（优先级最高）
 * @returns 默认 header 基线 + 请求配置
 */
export const createXiaohongshuConfig = (cookie?: string, requestConfig?: RequestConfig) => {
  const userAgent = userAgentOf(requestConfig)
  const secChUa = generateSecChUa(userAgent)

  const headers = new AmagiHeaders()
    .set('accept', 'application/json, text/plain, */*')
    .set('accept-language', 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6')
    .set('cache-control', 'no-cache')
    .set('content-type', 'application/json;charset=UTF-8')
    .set('pragma', 'no-cache')
    .set('priority', 'u=1, i')
    .set('referer', 'https://www.xiaohongshu.com/')
    .set('sec-ch-ua', secChUa)
    .set('sec-ch-ua-mobile', '?0')
    .set('sec-ch-ua-platform', '"Windows"')
    .set('sec-fetch-dest', 'empty')
    .set('sec-fetch-mode', 'cors')
    .set('sec-fetch-site', 'same-site')
    .set('user-agent', userAgent)
    .set('cookie', cookie?.trim() ?? '') // trim；undefined 时为空串
    .merge(requestConfig?.headers as HeadersInput) // 调用方 header 优先生效

  return {
    headers,
    requestConfig: {
      timeout: XIAOHONGSHU_DEFAULT_TIMEOUT,
      ...requestConfig
    } satisfies RequestConfig
  }
}
