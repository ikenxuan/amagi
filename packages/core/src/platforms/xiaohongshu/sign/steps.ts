import { getCookieValue } from '../../../contracts/cookie'
import type { SignFn, SignStep } from '../../../contracts/endpoint'
import { AmagiHeaders, type RequestSpec } from '../../../contracts/request'
import {
  generateXB3Traceid,
  generateXRapParam,
  generateXrayTraceid,
  generateXSCommon,
  generateXSGet,
  generateXSGetXyw,
  generateXSPost,
  generateXSPostXyw,
  generateXT
} from './index'

/**
 * 小红书反爬参数的**唯一实现**：x-s 系列的四个基础签名器（GET / POST × XYS / XYW）、
 * 它们依赖的 helper，以及把它们包成 {@link SignStep} 的 `xs()` / `traceId()` / `rap()`。
 *
 * 端点用 `sign: [xs('get', 'xyw'), traceId()]` 直接列出要哪些参数。signers.ts（薄壳）
 * 只做「注册名 → step 清单」的映射，依赖方向单向 —— `signers.ts → steps.ts`，永不反向：
 * 两份实现并存时会改一边忘一边，而小红书签名错了往往整条请求被判 406，这类分叉极难发现。
 *
 * ## XYS_ 与 XYW_ 两套 x-s 格式
 *
 * - **XYS_（传统）**：`xhsGetSigner` / `xhsPostSigner`，x-s 用 `signXsGet` / `signXsPost`。
 * - **XYW_（2026-03 之后）**：`xhsGetXywSigner` / `xhsPostXywSigner`，数据获取类接口
 *   （`user_posted` 等）自 2026-03 起以 HTTP 406 拒绝 XYS_，x-s 改用以 `XYW_` 开头的
 *   AES-128-CBC 签名。
 *
 * 签名路径取自 `spec.signPath`（build 里填 `apiPath`），不是 `spec.url`：小红书签名只用
 * 接口路径，与完整 URL 无关。x-rap-param 例外，它要 host + path（见 {@link rapApiOf}）。
 * 签名输入：a1 取自 cookie，POST 签名含 body，GET 签名含 query。
 */

/** 从 cookie 取 a1：用 `getCookieValue` 按名精确匹配 */
const a1Of = (cookie: string): string => getCookieValue(cookie, 'a1') ?? ''

/** 签名路径：优先 `spec.signPath`（build 填的 apiPath），缺省取 URL 的 pathname */
const apiPathOf = (spec: { signPath?: string; url: string }): string => spec.signPath ?? new URL(spec.url).pathname

/**
 * 取签名用的 query 参数：GET 端点在 `build` 里把原始 params 放进 `extra.signParams`。
 * 小红书 GET 的 x-s 必须覆盖 query（路径 + 参数），只签路径会被判非法请求返回 406。
 * 无参数端点（emojiList / userProfile）返回空对象，签名退化为只签路径，行为不变。
 */
const signParamsOf = (spec: { extra?: Record<string, unknown> }): Record<string, unknown> =>
  (spec.extra?.signParams as Record<string, unknown> | undefined) ?? {}

/** x-rap-param 的 api 入参：去协议、保留 `//host/path`（不含 query） */
const rapApiOf = (spec: { url: string }): string => {
  const url = new URL(spec.url)
  return `//${url.host}${url.pathname}`
}

/**
 * 注入 x-s / x-s-common / x-t / x-xray-traceid 四个签名头。
 *
 * `x-xray-traceid` 是真实浏览器每次请求都带的追踪头（见 noteComments 的抓包）；
 * 早期只发前三个，`comment/page` 这类接口会因此被判为非法请求，返回 HTTP 406。
 * 所有平台签名器共用本 helper，因此补上后对全部端点生效。
 */
const signHeaders = (spec: Parameters<SignFn>[0], ctx: Parameters<SignFn>[1], xsValue: string): Parameters<SignFn>[0] => {
  const headers = new AmagiHeaders(spec.headers)
    .set('x-s', xsValue)
    .set('x-s-common', generateXSCommon(ctx.cookie))
    .set('x-t', String(generateXT()))
    .set('x-xray-traceid', generateXrayTraceid())
  return { ...spec, headers: headers.toJSON() }
}

/** POST 签名器：x-s = signXsPost(apiPath, a1, 'xhs-pc-web', body) */
const xhsPostSigner: SignFn = (spec, ctx) => {
  const xsValue = generateXSPost(apiPathOf(spec), a1Of(ctx.cookie), 'xhs-pc-web', (spec.body ?? {}) as Record<string, unknown>)
  return signHeaders(spec, ctx, xsValue)
}

/** GET 签名器：x-s = signXsGet(apiPath, a1, 'xhs-pc-web', signParams) */
const xhsGetSigner: SignFn = (spec, ctx) => {
  const xsValue = generateXSGet(apiPathOf(spec), a1Of(ctx.cookie), 'xhs-pc-web', signParamsOf(spec))
  return signHeaders(spec, ctx, xsValue)
}

/** XYW GET 签名器：x-s = signXyw('GET', apiPath, a1, 'xhs-pc-web', signParams)，绕过数据接口 406 */
const xhsGetXywSigner: SignFn = (spec, ctx) => {
  const xsValue = generateXSGetXyw(apiPathOf(spec), a1Of(ctx.cookie), 'xhs-pc-web', signParamsOf(spec))
  return signHeaders(spec, ctx, xsValue)
}

/** XYW POST 签名器：x-s = signXyw('POST', apiPath, a1, 'xhs-pc-web', body) */
const xhsPostXywSigner: SignFn = (spec, ctx) => {
  const xsValue = generateXSPostXyw(apiPathOf(spec), a1Of(ctx.cookie), 'xhs-pc-web', (spec.body ?? {}) as Record<string, unknown>)
  return signHeaders(spec, ctx, xsValue)
}

/**
 * `x-s` + `x-s-common` + `x-t` + `x-xray-traceid` 四个签名头。
 *
 * @param method - GET 签 query、POST 签 body
 * @param protocol - `'xys'` 传统 / `'xyw'` 绕 406（2026-03 后数据接口必用）
 */
export const xs = (method: 'get' | 'post', protocol: 'xys' | 'xyw'): SignStep => ({
  phase: 'sign',
  apply: method === 'get' ? (protocol === 'xyw' ? xhsGetXywSigner : xhsGetSigner) : protocol === 'xyw' ? xhsPostXywSigner : xhsPostSigner
})

/** 在已签名的 spec 上补一个头 */
const withHeader = (spec: RequestSpec, name: string, value: string): RequestSpec => {
  const headers = new AmagiHeaders(spec.headers).set(name, value)
  return { ...spec, headers: headers.toJSON() }
}

/** `x-b3-traceid`（userNoteList / noteComments 需要），phase = `'finalize'` */
export const traceId = (): SignStep => ({
  phase: 'finalize',
  apply: (spec) => withHeader(spec, 'x-b3-traceid', generateXB3Traceid())
})

/** `x-rap-param`（feed / 搜索 / 发布类需要），phase = `'finalize'`。api 入参去协议、保留 `//host/path` */
export const rap = (): SignStep => ({
  phase: 'finalize',
  apply: (spec) => withHeader(spec, 'x-rap-param', generateXRapParam(rapApiOf(spec), (spec.body ?? {}) as Record<string, unknown>))
})
