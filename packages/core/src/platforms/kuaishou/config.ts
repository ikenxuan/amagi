import type { HeadersInput, RequestConfig } from '../../contracts/request'
import { AmagiHeaders } from '../../contracts/request'
import { DEFAULT_UA, MOBILE_UA, generateSecChUa } from '../../contracts/ua'

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
 * `timeout: 10000`、`Referer` / `Origin` 快手站。**cookie 不进基线**，原因见下方
 * `createKuaishouConfig` 里那段注释。
 *
 * 本文件另导出 {@link kuaishouH5Headers}：H5 命名空间那几个端点在 `build` 里覆盖基线用。
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
 * @param cookie - **不进基线**：形参只为与另外三个平台的 `createXxxConfig` 同构
 *   （`client/runtime.ts` 的 `PlatformConfigBuilder` 按位置调用，去掉会让
 *   `requestConfig` 落到第一位），值本身这里刻意不用
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
    // cookie 不进基线：它是执行期身份（`ctx.cookie` + execute 的 attachCookie 管），
    // 基线里带上会遮蔽单次调用的 Cookie 覆盖 —— 所以 `client/runtime.ts` 拿到基线后
    // 立刻 `def.headers.delete('cookie')`。这里原先 set 一次再被删掉，是纯死代码，
    // 还会让人误以为「快手必须有 cookie」。原因见 `client/runtime.ts` 的那句 delete。
    .merge(requestConfig?.headers as HeadersInput) // 调用方 header 优先生效

  return {
    headers,
    requestConfig: {
      timeout: KUAISHOU_DEFAULT_TIMEOUT,
      ...requestConfig
    } satisfies RequestConfig
  }
}

/**
 * H5（`c.kuaishou.com/rest/wd/*`）的 header 片段，给端点在 `build` 里直接用。
 *
 * **为什么不做进基线**：`createKuaishouConfig` 是平台*基线*，`client/runtime.ts` 的
 * `makeClientCtx` 每个「实例 × 平台」只调它一次，调用时还不知道这次要打哪个端点
 * （基线进的是 `HttpClient` 的实例头，跨调用复用）。所以「H5 用移动 UA + 分享页
 * Referer」没法在基线里分支 —— 正确位置是端点自己声明：端点 `build` 返回的 `headers`
 * 覆盖基线同名头，现有 12 个快手请求就是这么带 `Content-Type` / `Referer` 的
 * （见 `endpoints/userProfile.ts`）。
 *
 * 头的清单照迁移文档「附 A」那张 6 头表，这里只产 4 个：`kww` 由签名器注入
 * （`sign/signers.ts`）、`Cookie` 由 did 层注入，两者都不属于「按端点固定」的部分。
 *
 * 附 A 还写着 H5 请求「没有 Origin、没有 Sec-*」，这一条这里做不到：端点 headers 只能
 * **覆盖**基线同名头、不能删头，而 `origin` / `sec-*` 在基线里。真要严格对齐得给管线加
 * 「端点可声明删头」的能力，不在本层的职责内，是否有实际影响留给阶段 6 的端到端探针。
 * @param referer - 分享页的**完整** URL，如 `https://c.kuaishou.com/fw/photo/<photoId>`。
 *   H5 主机由 `api.ts` 的 `KUAISHOU_H5_HOST` 持有、Referer 由它那边拼好传进来，这里不再
 *   存第二份主机常量；且签名接口对 Referer 敏感，没有「省略就退回站根」这种安全默认值，
 *   所以是必填
 * @returns Content-Type / Accept / User-Agent / Referer 四个头
 */
export const kuaishouH5Headers = (referer: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  Accept: 'application/json, text/plain, */*',
  'User-Agent': MOBILE_UA,
  Referer: referer
})
