import type { HeadersInput, RequestConfig } from '../../contracts/request'
import { AmagiHeaders } from '../../contracts/request'
import { DEFAULT_UA, MOBILE_UA, generateSecChUa } from '../../contracts/ua'

/**
 * 快手默认 header 基线。
 *
 * 默认 UA 取 `contracts/ua.ts` 的集中版本（不带 `Edg/` 标识，transport 出口还会
 * 统一剥一次）；`sec-ch-ua` 按 UA 的 Chrome 版本动态生成（与抖音 / B站同款逻辑）。
 *
 * 默认 `method: 'POST'`（快手与其他三平台不同）、`timeout: 10000`、
 * `Referer` / `Origin` 快手站。**cookie 不进基线**，原因见下方
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
 *   `requestConfig` 落到第一位），值本身不用
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
    .set('sec-ch-ua', secChUa) // 按 UA 的 Chrome 版本生成
    .set('sec-ch-ua-mobile', '?0')
    .set('sec-ch-ua-platform', '"Windows"')
    .set('sec-fetch-dest', 'empty')
    .set('sec-fetch-mode', 'cors')
    .set('sec-fetch-site', 'same-site')
    .set('user-agent', userAgent)
    // cookie 不进基线：它是执行期身份（`ctx.cookie` + execute 的 attachCookie 管），
    // 基线里带上会遮蔽单次调用的 Cookie 覆盖 —— 所以 `client/runtime.ts` 拿到基线后
    // 立刻 `def.headers.delete('cookie')`，避免让人误以为「快手必须有 cookie」。
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
 * 不放进平台基线：`createKuaishouConfig` 是平台*基线*，`client/runtime.ts` 的
 * `makeClientCtx` 每个「实例 × 平台」只调它一次，调用时还不知道这次要打哪个端点
 * （基线进的是 `HttpClient` 的实例头，跨调用复用），没法在里面按端点分支。端点
 * `build` 返回的 `headers` 会覆盖基线同名头，所以「H5 用移动 UA + 分享页 Referer」
 * 由端点自己声明（见 `endpoints/userProfile.ts`）。
 *
 * 这里只产 4 个头：`kww` 由签名器注入（`sign/signers.ts`）、`Cookie` 由 did 层注入，
 * 两者都不属于「按端点固定」的部分。
 *
 * 真实 H5 请求「没有 Origin、没有 Sec-*」，这一条由端点声明
 * {@link KUAISHOU_H5_DROP_HEADERS} 配合 `RequestSpec.dropHeaders` 完成。
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

/**
 * H5 端点要从平台基线里**删掉**的头。
 *
 * 基线是照桌面 Chrome 攒的，而 H5 端点用 {@link MOBILE_UA}（iPhone Safari 17）。
 * 两者拼在一起会发出一个自相矛盾的请求：UA 说 iPhone Safari，`sec-ch-ua` 说
 * Chrome 142、`sec-ch-ua-platform` 说 `"Windows"`、`sec-ch-ua-mobile` 说 `?0`，
 * 而 Safari 根本不发 `sec-ch-ua` 这一族。`origin` 更是直接指错域
 * （基线是 `https://www.kuaishou.com`，H5 端点打的是 `c.kuaishou.com`）。
 *
 * 真实 H5 请求只有 6 个头，**没有 `Origin`、没有 `Sec-*`**。端点 `headers` 只能
 * 覆盖同名头、删不掉，所以需要 `RequestSpec.dropHeaders`。
 *
 * 这份清单不是 `2001` 风控的成因 —— 把这些头全剥掉重打 `photo/info`，仍然 2001。
 * 改它的理由只是「发出去的请求不该自我矛盾」。
 */
export const KUAISHOU_H5_DROP_HEADERS = [
  'origin',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'priority',
  'accept-language'
] as const
