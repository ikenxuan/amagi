import { getCookieValue } from '../../../contracts/cookie'
import type { SignFn } from '../../../contracts/endpoint'
import { AmagiHeaders, type HeadersInput } from '../../../contracts/request'
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
 * 小红书签名器表。
 *
 * XYS_（传统）路径：
 * - `'xhs-post'`：POST 请求，`x-s` 用 `signXsPost` 对 body 签名
 * - `'xhs-get'`：GET 请求，`x-s` 用 `signXsGet` 对 query 签名
 * - `'xhs-get-trace'`：GET + `x-b3-traceid`（userNoteList 专用）
 * - `'xhs-post-rap'`：POST + `x-rap-param`（feed / 搜索 / 发布类接口的额外校验）
 *
 * XYW_（2026-03 之后）路径 —— 数据获取类接口以 HTTP 406 拒绝 XYS_，`x-s` 改用
 * 以 `XYW_` 开头的 AES-128-CBC 签名：
 * - `'xhs-get-xyw'`：GET，`x-s` 用 `signXyw`
 * - `'xhs-post-xyw'`：POST，`x-s` 用 `signXyw`
 * - `'xhs-get-xyw-trace'`：GET XYW + `x-b3-traceid`（userNoteList 专用）
 *
 * 签名路径取自 `spec.signPath`（build 里填 `apiPath`），不是 `spec.url`：
 * 小红书签名只用接口路径，与完整 URL 无关。x-rap-param 例外，它要 host + path。
 *
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
const signHeaders = (spec: Parameters<SignFn>[0], ctx: Parameters<SignFn>[1], xs: string): Parameters<SignFn>[0] => {
  const headers = new AmagiHeaders(spec.headers as HeadersInput)
    .set('x-s', xs)
    .set('x-s-common', generateXSCommon(ctx.cookie))
    .set('x-t', String(generateXT()))
    .set('x-xray-traceid', generateXrayTraceid())
  return { ...spec, headers: headers.toJSON() }
}

/** POST 签名器：x-s = signXsPost(apiPath, a1, 'xhs-pc-web', body) */
export const xhsPostSigner: SignFn = (spec, ctx) => {
  const xs = generateXSPost(apiPathOf(spec), a1Of(ctx.cookie), 'xhs-pc-web', (spec.body ?? {}) as Record<string, unknown>)
  return signHeaders(spec, ctx, xs)
}

/** GET 签名器：x-s = signXsGet(apiPath, a1, 'xhs-pc-web', signParams) */
export const xhsGetSigner: SignFn = (spec, ctx) => {
  const xs = generateXSGet(apiPathOf(spec), a1Of(ctx.cookie), 'xhs-pc-web', signParamsOf(spec))
  return signHeaders(spec, ctx, xs)
}

/** GET + x-b3-traceid（userNoteList 专用） */
export const xhsGetTraceSigner: SignFn = async (spec, ctx) => {
  const signed = await xhsGetSigner(spec, ctx)
  const headers = new AmagiHeaders(signed.headers as HeadersInput).set('x-b3-traceid', generateXB3Traceid())
  return { ...signed, headers: headers.toJSON() }
}

/** POST + x-rap-param（feed / 搜索 / 发布类接口的额外校验） */
export const xhsPostRapSigner: SignFn = async (spec, ctx) => {
  const signed = await xhsPostSigner(spec, ctx)
  const rap = generateXRapParam(rapApiOf(spec), (spec.body ?? {}) as Record<string, unknown>)
  const headers = new AmagiHeaders(signed.headers as HeadersInput).set('x-rap-param', rap)
  return { ...signed, headers: headers.toJSON() }
}

/** XYW GET 签名器：x-s = signXyw('GET', apiPath, a1, 'xhs-pc-web', signParams)，绕过数据接口 406 */
export const xhsGetXywSigner: SignFn = (spec, ctx) => {
  const xs = generateXSGetXyw(apiPathOf(spec), a1Of(ctx.cookie), 'xhs-pc-web', signParamsOf(spec))
  return signHeaders(spec, ctx, xs)
}

/** XYW POST 签名器：x-s = signXyw('POST', apiPath, a1, 'xhs-pc-web', body) */
export const xhsPostXywSigner: SignFn = (spec, ctx) => {
  const xs = generateXSPostXyw(apiPathOf(spec), a1Of(ctx.cookie), 'xhs-pc-web', (spec.body ?? {}) as Record<string, unknown>)
  return signHeaders(spec, ctx, xs)
}

/** XYW GET + x-b3-traceid（userNoteList 专用，2026-03 之后） */
export const xhsGetXywTraceSigner: SignFn = async (spec, ctx) => {
  const signed = await xhsGetXywSigner(spec, ctx)
  const headers = new AmagiHeaders(signed.headers as HeadersInput).set('x-b3-traceid', generateXB3Traceid())
  return { ...signed, headers: headers.toJSON() }
}

/**
 * 平台签名器表，交给 runtime 的 `signers` 查名。
 *
 * 用 `satisfies` 而非显式 `: Record<string, SignFn>` 返回：后者会把键联合抹成宽
 * `string`，而 {@link XiaohongshuSignerName} 要靠 `keyof` 从这张表推导精确名字联合。
 */
export const createXiaohongshuSigners = () =>
  ({
    'xhs-post': xhsPostSigner,
    'xhs-get': xhsGetSigner,
    'xhs-get-trace': xhsGetTraceSigner,
    'xhs-post-rap': xhsPostRapSigner,
    'xhs-get-xyw': xhsGetXywSigner,
    'xhs-post-xyw': xhsPostXywSigner,
    'xhs-get-xyw-trace': xhsGetXywTraceSigner
  }) satisfies Record<string, SignFn>

/**
 * 小红书签名器名联合，从签名器表推导、不手写第二遍。
 *
 * `defineXiaohongshuEndpoint` 用它把端点 `sign` 的字符串分支从宽 `string` 收窄到
 * 这个联合 —— 写错名字编译期即报错，不必等运行时查表失败。
 */
export type XiaohongshuSignerName = keyof ReturnType<typeof createXiaohongshuSigners>
