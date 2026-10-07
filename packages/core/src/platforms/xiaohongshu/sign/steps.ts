import { getShardingKey } from '@ikenxuan/xhshow-ts'

import { getCookieValue } from '../../../contracts/cookie'
import type { SignFn, SignStep } from '../../../contracts/endpoint'
import { AmagiHeaders, type RequestSpec } from '../../../contracts/request'
import { xiaohongshuSigningSession } from '../session'
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
 * 小红书签名步骤：XYS / XYW、trace 与 rap；signers.ts 仅提供注册名映射。
 *
 * 注册端点使用 XYS_。2026-10-02 Edge 登录态（guest=false）的 feed、comment/page、
 * user_posted 均以 XYS_ 返回 HTTP 200 / code=0，不能按登录态选择 XYS / XYW。
 * 与 Cookie 匹配的会话 SSK 用于生成 x6、x7；没有 SSK 时保留旧 XYS 格式。
 * 单个 XYW 载荷与浏览器相同，不代表完整请求一致，也不能排除签名字段缺失导致挑战。
 * HTTP 461 即使响应体为 code=0 / success=true，仍须保留 HTTP 状态和验证头判定失败。
 *
 * 签名路径取 spec.signPath 或 URL pathname；GET 包含 query，POST 包含 body。
 * x-rap-param 另使用 host + path，见 {@link rapApiOf}。
 */

/** 从 cookie 取 a1：用 `getCookieValue` 按名精确匹配 */
const a1Of = (cookie: string): string => getCookieValue(cookie, 'a1') ?? ''

/** 签名路径：优先 `spec.signPath`（build 填的 apiPath），缺省取 URL 的 pathname */
const apiPathOf = (spec: { signPath?: string; url: string }): string => spec.signPath ?? new URL(spec.url).pathname

/**
 * 取签名用的 query 参数：GET 端点在 `build` 里把原始 params 放进 `extra.signParams`。
 * 小红书 GET 的 x-s 必须覆盖 query（路径 + 参数），只签路径会被判非法请求返回 406。
 * 无参数端点（emojiList / searchHotList）返回空对象，签名退化为只签路径，行为不变。
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
 *
 * @param timestampMs - 写进 `x-t` 的毫秒时间戳。XYW_ 把时间戳签进密文的 `x4`，两者
 *   必须同值，所以 XYW 签名器自己先取时间戳、再一并传进来；省略则现取当前时间。
 */
const signHeaders = (
  spec: Parameters<SignFn>[0],
  ctx: Parameters<SignFn>[1],
  xsValue: string,
  timestampMs?: number
): Parameters<SignFn>[0] => {
  const headers = new AmagiHeaders(spec.headers)
    .set('x-s', xsValue)
    .set('x-s-common', generateXSCommon(ctx.cookie, xiaohongshuSigningSession(ctx, spec)?.b1))
    .set('x-t', String(timestampMs ?? generateXT()))
    .set('x-xray-traceid', generateXrayTraceid())
  return { ...spec, headers: headers.toJSON() }
}

/** POST 签名器：x-s = signXsPost(apiPath, a1, 'xhs-pc-web', body) */
const xhsPostSigner: SignFn = (spec, ctx) => {
  const xsValue = generateXSPost(
    apiPathOf(spec),
    a1Of(ctx.cookie),
    'xhs-pc-web',
    (spec.body ?? {}) as Record<string, unknown>,
    xiaohongshuSigningSession(ctx, spec)?.manager
  )
  return signHeaders(spec, ctx, xsValue)
}

/** GET 签名器：x-s = signXsGet(apiPath, a1, 'xhs-pc-web', signParams) */
const xhsGetSigner: SignFn = (spec, ctx) => {
  const xsValue = generateXSGet(
    apiPathOf(spec),
    a1Of(ctx.cookie),
    'xhs-pc-web',
    signParamsOf(spec),
    xiaohongshuSigningSession(ctx, spec)?.manager
  )
  return signHeaders(spec, ctx, xsValue)
}

/**
 * XYW GET 签名器：x-s = signXyw('GET', apiPath, a1, 'xhs-pc-web', signParams)。
 *
 * 时间戳先取、再同时喂给签名和 `x-t` —— XYW_ 把它签进密文的 `x4`，两者不同值时
 * 服务端判签名失效（真机 `window._webmsxyw` 返回的 `X-t` 就是它所签的 `x4`）。
 */
const xhsGetXywSigner: SignFn = (spec, ctx) => {
  const timestampMs = generateXT()
  const xsValue = generateXSGetXyw(apiPathOf(spec), a1Of(ctx.cookie), 'xhs-pc-web', signParamsOf(spec), timestampMs)
  return signHeaders(spec, ctx, xsValue, timestampMs)
}

/** XYW POST 签名器：x-s = signXyw('POST', apiPath, a1, 'xhs-pc-web', body)，x-t 同 {@link xhsGetXywSigner} */
const xhsPostXywSigner: SignFn = (spec, ctx) => {
  const timestampMs = generateXT()
  const xsValue = generateXSPostXyw(
    apiPathOf(spec),
    a1Of(ctx.cookie),
    'xhs-pc-web',
    (spec.body ?? {}) as Record<string, unknown>,
    timestampMs
  )
  return signHeaders(spec, ctx, xsValue, timestampMs)
}

/**
 * `x-s` + `x-s-common` + `x-t` + `x-xray-traceid` 四个签名头。
 *
 * @param method - GET 签 query、POST 签 body
 * @param protocol - `'xys'` 为注册端点使用的格式，`'xyw'` 为显式可选的 AES-128-CBC 格式
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

/** xy-direction 按已绑定会话的用户 ID 分片；未知时不生成替代值。 */
export const direction = (): SignStep => ({
  phase: 'finalize',
  apply: (spec, ctx) => {
    const userId = xiaohongshuSigningSession(ctx, spec)?.userId
    return userId === undefined ? spec : withHeader(spec, 'xy-direction', String(getShardingKey(userId)))
  }
})

/** `x-b3-traceid`，phase = `'finalize'` */
export const traceId = (): SignStep => ({
  phase: 'finalize',
  apply: (spec) => withHeader(spec, 'x-b3-traceid', generateXB3Traceid())
})

/**
 * `x-rap-param`（feed / 搜索 / 发布类需要），phase = `'finalize'`。api 入参去协议、保留 `//host/path`。
 *
 * @param source - 签哪一份入参：`'body'`（POST，默认）或 `'query'`（GET，取 `extra.signParams`）
 */
export const rap = (source: 'body' | 'query' = 'body'): SignStep => ({
  phase: 'finalize',
  apply: (spec) =>
    withHeader(
      spec,
      'x-rap-param',
      generateXRapParam(rapApiOf(spec), source === 'query' ? signParamsOf(spec) : ((spec.body ?? {}) as Record<string, unknown>))
    )
})

/**
 * 直播域名（`live-room.xiaohongshu.com`）专用的 `x-s` 签名头，phase = `'sign'`。
 *
 * 与 {@link xs} 同样是 XYS_ GET 签名，但请求头不一样：多 `xy-common-params`，且**不带**
 * `x-xray-traceid` / `x-b3-traceid` —— 真机抓包里直播接口从不发这两个追踪头，带上会被判非法请求。
 * 因此它自成一个 step 而不是 `xs('get', 'xys')` 之后再补，避免先加后删。
 *
 * `current_room_info` 另需 `x-ratelimit-meta: roomId=<room_id>`，room_id 取自签名 query。
 */
export const liveXs = (): SignStep => ({
  phase: 'sign',
  apply: (spec, ctx) => {
    const xsValue = generateXSGet(
      apiPathOf(spec),
      a1Of(ctx.cookie),
      'xhs-pc-web',
      signParamsOf(spec),
      xiaohongshuSigningSession(ctx, spec)?.manager
    )
    const headers = new AmagiHeaders(spec.headers)
      .set('x-s', xsValue)
      .set('x-s-common', generateXSCommon(ctx.cookie, xiaohongshuSigningSession(ctx, spec)?.b1))
      .set('x-t', String(generateXT()))
      .set('xy-common-params', 'platform=web')
    headers.delete('x-xray-traceid')
    headers.delete('x-b3-traceid')
    const roomId = signParamsOf(spec).room_id
    if (typeof roomId === 'string' && roomId && /current_room_info/.test(apiPathOf(spec))) {
      headers.set('x-ratelimit-meta', `roomId=${roomId}`)
    }
    return { ...spec, headers: headers.toJSON() }
  }
})
