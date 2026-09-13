import { AmagiHeaders, type HeadersInput } from '../../../contracts/request'
import { getCookieValue } from '../../../contracts/cookie'
import type { SignFn } from '../../../contracts/endpoint'
import { generateXB3Traceid, generateXSCommon, generateXSGet, generateXSPost, generateXT } from './index'

/**
 * 小红书签名器表。
 *
 * 三个签名器：
 * - `'xhs-post'`：POST 请求，`x-s` 用 `signXsPost` 对 body 签名
 * - `'xhs-get'`：GET 请求，`x-s` 用 `signXsGet` 对 query 签名
 * - `'xhs-get-trace'`：GET + `x-b3-traceid`（userNoteList 专用）
 *
 * 签名路径取自 `spec.signPath`（build 里填 `apiPath`），不是 `spec.url`：
 * 小红书签名只用接口路径，与完整 URL 无关。
 *
 * 签名输入：a1 取自 cookie，POST 签名含 body，GET 签名含 query。
 */

/** 从 cookie 取 a1：用 `getCookieValue` 按名精确匹配 */
const a1Of = (cookie: string): string => getCookieValue(cookie, 'a1') ?? ''

/** 签名路径：优先 `spec.signPath`（build 填的 apiPath），缺省取 URL 的 pathname */
const apiPathOf = (spec: { signPath?: string; url: string }): string => spec.signPath ?? new URL(spec.url).pathname

/** 注入 x-s / x-s-common / x-t 三个签名头 */
const signHeaders = (spec: Parameters<SignFn>[0], ctx: Parameters<SignFn>[1], xs: string): Parameters<SignFn>[0] => {
  const headers = new AmagiHeaders(spec.headers as HeadersInput)
    .set('x-s', xs)
    .set('x-s-common', generateXSCommon(ctx.cookie))
    .set('x-t', String(generateXT()))
  return { ...spec, headers: headers.toJSON() }
}

/** POST 签名器：x-s = signXsPost(apiPath, a1, 'xhs-pc-web', body) */
export const xhsPostSigner: SignFn = (spec, ctx) => {
  const xs = generateXSPost(apiPathOf(spec), a1Of(ctx.cookie), 'xhs-pc-web', (spec.body ?? {}) as Record<string, unknown>)
  return signHeaders(spec, ctx, xs)
}

/** GET 签名器：x-s = signXsGet(apiPath, a1, 'xhs-pc-web') */
export const xhsGetSigner: SignFn = (spec, ctx) => {
  const xs = generateXSGet(apiPathOf(spec), a1Of(ctx.cookie), 'xhs-pc-web')
  return signHeaders(spec, ctx, xs)
}

/** GET + x-b3-traceid（userNoteList 专用） */
export const xhsGetTraceSigner: SignFn = async (spec, ctx) => {
  const signed = await xhsGetSigner(spec, ctx)
  const headers = new AmagiHeaders(signed.headers as HeadersInput).set('x-b3-traceid', generateXB3Traceid())
  return { ...signed, headers: headers.toJSON() }
}

/** 平台签名器表，交给 runtime 的 `signers` 查名 */
export const createXiaohongshuSigners = (): Record<string, SignFn> => ({
  'xhs-post': xhsPostSigner,
  'xhs-get': xhsGetSigner,
  'xhs-get-trace': xhsGetTraceSigner
})
