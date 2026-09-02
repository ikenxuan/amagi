import type { HeadersInput, RequestConfig } from '../../contracts/request'
import { AmagiHeaders } from '../../contracts/request'
import { DEFAULT_UA, generateSecChUa } from '../../contracts/ua'

/**
 * 快手默认 header 基线。
 *
 * 从 v6 `platform/defaultConfigs.ts` 的 `getKuaishouDefaultConfig` 搬迁，
 * 修掉两条 KNOWN-DEFECT：
 * - **#26 自带 Edg**：v6 默认 UA 是 `Chrome/130 ... Edg/130`，自带 Edge 标识；
 *   v7 默认 UA 去掉 `Edg/`（transport 出口还会统一剥一次，#12/#14/#17 那条线）。
 * - **#29 不生成 Sec-Ch-Ua**：v6 快手完全不发 `Sec-Ch-Ua`（其他平台会），
 *   浏览器指纹声明不完整；v7 按 UA 的 Chrome 版本动态生成（与抖音 / B站同款逻辑）。
 *
 * 默认 UA 取 `contracts/ua.ts` 的集中版本（04-option-c：四份 UA 基线合并为一处）。
 *
 * 其余与 v6 一致：默认 `method: 'POST'`（快手与其他三平台不同）、
 * `timeout: 10000`、`Cookie` trim、`Referer` / `Origin` 快手站。
 */

/** 默认超时，与抖音 / B站 / 小红书一致 */
export const KUAISHOU_DEFAULT_TIMEOUT = 10000

/** 从请求配置里取 UA：大小写不敏感，取不到用集中维护的默认值 */
const userAgentOf = (requestConfig?: RequestConfig): string => {
  const fromConfig = new AmagiHeaders(requestConfig?.headers as HeadersInput).get('user-agent')
  return fromConfig ?? DEFAULT_UA
}

/**
 * 构造快手默认请求配置。
 * @param cookie - 用户 cookie（会 trim）
 * @param requestConfig - 外部请求配置（优先级最高）
 * @returns 默认 header 基线 + 请求配置
 */
export const createKuaishouConfig = (cookie?: string, requestConfig?: RequestConfig) => {
  const userAgent = userAgentOf(requestConfig)
  const secChUa = generateSecChUa(userAgent)

  const headers = new AmagiHeaders()
    .set('accept', 'application/json, text/plain, */*')
    .set('accept-encoding', 'gzip, deflate, br, zstd')
    .set('accept-language', 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6')
    .set('content-type', 'application/json')
    .set('priority', 'u=0, i')
    .set('origin', 'https://www.kuaishou.com')
    .set('referer', 'https://www.kuaishou.com/new-reco')
    .set('sec-ch-ua', secChUa) // #29：按 UA 生成，不再缺失
    .set('sec-ch-ua-mobile', '?0')
    .set('sec-ch-ua-platform', '"Windows"')
    .set('sec-fetch-dest', 'empty')
    .set('sec-fetch-mode', 'cors')
    .set('sec-fetch-site', 'same-site')
    .set('user-agent', userAgent)
    .set('cookie', cookie?.trim() ?? '')
    .merge(requestConfig?.headers as HeadersInput) // 调用方 header 优先生效

  return {
    headers,
    requestConfig: {
      timeout: KUAISHOU_DEFAULT_TIMEOUT,
      ...requestConfig
    } satisfies RequestConfig
  }
}
