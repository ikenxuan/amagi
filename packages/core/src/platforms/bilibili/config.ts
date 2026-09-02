import type { HeadersInput, RequestConfig } from '../../contracts/request'
import { AmagiHeaders } from '../../contracts/request'
import { DEFAULT_UA, generateSecChUa } from '../../contracts/ua'

/**
 * B站默认 header 基线。
 *
 * 从 v6 `platform/defaultConfigs.ts` 的 `getBilibiliDefaultConfig` 搬迁，
 * 修掉一条 KNOWN-DEFECT：
 * - **#24 硬编码 Chrome/142**：v6 把 `Chrome/142.0.0.0` 写死在代码里，
 *   四个平台各写各的版本号；v7 从 `contracts/ua.ts` 取集中维护的 `DEFAULT_UA`。
 *
 * 其余与 v6 一致：`timeout: 10000`、Cookie trim、Referer B站首页、
 * Cache-Control / Pragma no-cache。`method` 归端点声明（B站端点各自声明
 * GET / POST），不属于基线。
 */
export const createBilibiliConfig = (cookie?: string, requestConfig?: RequestConfig) => {
  const userAgent = new AmagiHeaders(requestConfig?.headers as HeadersInput).get('user-agent') ?? DEFAULT_UA
  const secChUa = generateSecChUa(userAgent)

  const headers = new AmagiHeaders()
    .set('accept', 'application/json, text/plain, */*')
    .set('accept-language', 'zh-CN,zh;q=0.9')
    .set('accept-encoding', 'gzip, deflate, br, zstd')
    .set('cache-control', 'no-cache')
    .set('pragma', 'no-cache')
    .set('priority', 'u=1, i')
    .set('referer', 'https://www.bilibili.com/')
    .set('sec-ch-ua', secChUa)
    .set('sec-ch-ua-mobile', '?0')
    .set('sec-ch-ua-platform', '"Windows"')
    .set('sec-fetch-dest', 'empty')
    .set('sec-fetch-mode', 'cors')
    .set('sec-fetch-site', 'same-site')
    .set('user-agent', userAgent) // #24：默认值取集中维护的 DEFAULT_UA
    .set('cookie', cookie?.trim() ?? '')
    .merge(requestConfig?.headers as HeadersInput) // 调用方 header 优先生效

  return {
    headers,
    requestConfig: {
      timeout: 10000,
      ...requestConfig
    } satisfies RequestConfig
  }
}
