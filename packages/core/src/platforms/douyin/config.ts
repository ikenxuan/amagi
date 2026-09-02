import type { HeadersInput, RequestConfig } from '../../contracts/request'
import { AmagiHeaders } from '../../contracts/request'
import { DEFAULT_UA, generateSecChUa } from '../../contracts/ua'

/**
 * 抖音默认 header 基线。
 *
 * 从 v6 `platform/defaultConfigs.ts` 的 `getDouyinDefaultConfig` 搬迁，
 * 修掉三条 KNOWN-DEFECT：
 * - **#24 硬编码 Chrome/125**：v6 抖音把 `Chrome/125.0.0.0` 写死在代码里，
 *   四个平台各写各的版本号；v7 从 `contracts/ua.ts` 取集中维护的 `DEFAULT_UA`。
 * - **#27 Edg 剥离被展开顺序抵消**：v6 先算出剥掉 Edg 的 `finalUserAgent`
 *   放进 `defHeaders`，随后 `{ ...defHeaders, ...requestConfig.headers }`
 *   又用原始值把它盖回去了。v7 用 `AmagiHeaders` 合并，调用方 header
 *   优先生效，且 UA 清理统一在 transport 出口做一次（#12/#14/#17），
 *   这一层不再自己剥。
 * - **#28 Sec-Ch-Ua 与 UA 不一致**：v6 的 Sec-Ch-Ua 基于「剥离后的 UA」
 *   生成，而实际发出的 User-Agent 还是带 Edg 的原始值 —— 两个头描述的
 *   浏览器不一致。v7 的 Sec-Ch-Ua 与 User-Agent 用**同一个** UA 计算，
 *   描述的一定是同一种浏览器。
 *
 * 其余与 v6 一致：`timeout: 10000`、Cookie trim、Referer 抖音首页。
 * `method` 归端点声明（抖音端点各自声明 GET / POST），不属于基线。
 */
export const createDouyinConfig = (cookie?: string, requestConfig?: RequestConfig) => {
  const userAgent = new AmagiHeaders(requestConfig?.headers as HeadersInput).get('user-agent') ?? DEFAULT_UA
  const secChUa = generateSecChUa(userAgent)

  const headers = new AmagiHeaders()
    .set('accept', 'application/json, text/plain, */*')
    .set('accept-encoding', 'gzip, deflate, br, zstd')
    .set('accept-language', 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6')
    .set('priority', 'u=1, i')
    .set('referer', 'https://www.douyin.com/')
    .set('sec-ch-ua', secChUa) // #28：与 user-agent 同源计算，两值必一致
    .set('sec-ch-ua-mobile', '?0')
    .set('sec-ch-ua-platform', '"Windows"')
    .set('sec-fetch-dest', 'empty')
    .set('sec-fetch-mode', 'cors')
    .set('sec-fetch-site', 'same-origin')
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
