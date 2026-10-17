import { constants, createPublicKey, publicEncrypt } from 'node:crypto'

import { getCookieValue } from '../../contracts/cookie'
import type { AmagiError } from '../../contracts/error'
import type { RawResponse, RequestConfig, RequestSpec } from '../../contracts/request'
import { mergeSetCookie } from './session/qrcode'

/**
 * B站 Web 端 Cookie 刷新（登录态续期）。
 *
 * B站有一套**官方**的 cookie 续期协议：登录（扫码/密码/短信）时响应下发一个
 * `refresh_token`，之后不必重新扫码，用「旧 cookie + 旧 refresh_token」就能换一份
 * 新 cookie（并拿到下一个 refresh_token）。这与「遇验证码/风控只能重新登录」是两回事
 * —— 它是平台提供的正规续期通道，不涉及任何绕过。四平台里**只有 B站**有这条协议
 * （抖音只有会话内被动续期 x-ms-token、小红书 prepareXiaohongshuGuestCookie 是游客 cookie 与登录态无关）。
 *
 * ## 四步线性协议（非会话，无轮询）
 *
 * | 步 | method | URL | 作用 |
 * | --- | --- | --- | --- |
 * | 1 | GET  | `passport.bilibili.com/x/passport-login/web/cookie/info?csrf=` | 校验登录态 + 取服务器时间戳 |
 * | 2 | GET  | `www.bilibili.com/correspond/1/{correspondPath}` | 返回 HTML，从 `<div id="1-name">` 抠 refresh_csrf |
 * | 3 | POST | `passport.bilibili.com/x/passport-login/web/cookie/refresh` | 换新 cookie（Set-Cookie）+ 新 refresh_token（body） |
 * | 4 | POST | `passport.bilibili.com/x/passport-login/web/confirm/refresh` | 使旧 token/旧 cookie 失效 |
 *
 * token 流转的关键（错位即失败）：第 3 步进**旧** refresh_token、出**新** refresh_token +
 * 新 cookie；第 4 步拿**新** cookie 的 csrf + **旧** refresh_token 去确认。所以第 3 步之前
 * 必须把旧 token 另存一份，别被返回值覆盖。
 *
 * ## correspondPath
 *
 * `hex(RSA-OAEP-SHA256("refresh_" + timestamp))`，RSA-1024 固定公钥（见
 * {@link BILIBILI_CORRESPOND_PUBKEY}）。公钥是删库前官方文档公开的明文，经 5 个 fork +
 * Wayback 存档 + bilibili-api-python 生产源码字节级一致，再用 node crypto 复核（JWK n
 * 与官方 JWK 一致、输出 256 hex）。timestamp 优先用第 1 步 `cookie/info` 返回的服务器
 * 时间戳（免本地时钟漂移），拿不到回退 `Date.now()`。
 *
 * @module platforms/bilibili/cookieRefresh
 */

/**
 * B站 correspondPath 的 RSA 公钥（1024bit）。
 *
 * 删库前官方文档公开的明文公钥，多来源字节一致。correspondPath = 用它 RSA-OAEP-SHA256
 * 加密 `refresh_{timestamp}` 再 hex。公钥内置是**对的** —— 它本就是前端公开常量
 * （laputa 主包运行时从 CDN 的 wasm 里拿的也是它），不是密钥。
 */
export const BILIBILI_CORRESPOND_PUBKEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDLgd2OAkcGVtoE3ThUREbio0Eg
Uc/prcajMKXvkCKFCWhJYJcLkcM2DKKcSeFpD/j6Boy538YXnR6VhcuUJOhH2x71
nzPjfdTcqMz7djHum0qSZA0AyCBDABUqCrfNgCiJ00Ra7GmRj+YCK1NJEuewlb40
JNrRuoEUXpabUzGB8QIDAQAB
-----END PUBLIC KEY-----`

const PUBLIC_KEY = createPublicKey(BILIBILI_CORRESPOND_PUBKEY)

const COOKIE_INFO_URL = 'https://passport.bilibili.com/x/passport-login/web/cookie/info'
const CORRESPOND_URL = 'https://www.bilibili.com/correspond/1/'
const COOKIE_REFRESH_URL = 'https://passport.bilibili.com/x/passport-login/web/cookie/refresh'
const CONFIRM_REFRESH_URL = 'https://passport.bilibili.com/x/passport-login/web/confirm/refresh'

/** refresh_csrf 在 correspond HTML 的 `<div id="1-name">…</div>` 里 */
const REFRESH_CSRF_RE = /<div id="1-name">(.+?)<\/div>/

/**
 * 生成 correspondPath。
 *
 * `hex(RSA-OAEP-SHA256("refresh_" + ts))`。注意 node 的 `publicEncrypt` 默认 OAEP 摘要是
 * **sha1**，这里必须显式 `oaepHash: 'sha256'`，否则服务端解不出。OAEP 带随机 seed，所以
 * 同一个 ts 每次输出都不同 —— 正常，服务端只校验能否解出 `refresh_{ts}` 且 ts 新鲜。
 * @param ts - 毫秒时间戳，优先传 `cookie/info` 返回的服务器时间，缺省用 `Date.now()`
 * @returns 256 位小写 hex 字符串
 */
export const getBilibiliCorrespondPath = (ts: number = Date.now()): string =>
  publicEncrypt(
    { key: PUBLIC_KEY, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(`refresh_${ts}`, 'utf-8')
  ).toString('hex')

/** 刷新入参 */
export interface BilibiliRefreshInput {
  /** 当前登录态 cookie 串（至少含 `SESSDATA` + `bili_jct`） */
  cookie: string
  /** 持久化的 refresh_token（登录时下发，官方 Web 存于 `localStorage.ac_time_value`） */
  refreshToken: string
}

/** 刷新产物 */
export interface BilibiliRefreshOutput {
  /** 刷新后的新 cookie 串（`SESSDATA`/`bili_jct`/`DedeUserID`/`DedeUserID__ckMd5`/`sid` 已更新） */
  cookie: string
  /** 新的 refresh_token，务必持久化替换旧值（下次刷新要用） */
  refreshToken: string
}

/** 刷新链里发请求的依赖：复用会话策略同款 `send`（transport 注入，带代理/超时/header 基线） */
export interface BilibiliRefreshDeps {
  send: (spec: RequestSpec) => Promise<RawResponse>
}

/** form-urlencoded 序列化 */
const serializeForm = (obj: Record<string, string>): string =>
  Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

/** 造一个 AmagiError */
const errorOf = (kind: AmagiError['kind'], code: AmagiError['code'], message: string, raw?: unknown): AmagiError => ({
  kind,
  code,
  message,
  retryable: false,
  ...(raw === undefined ? {} : { raw })
})

/** 取响应体某路径的值（容忍任意形状） */
const pick = (body: unknown, ...path: string[]): unknown => {
  let node: unknown = body
  for (const key of path) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[key]
  }
  return node
}

/**
 * B站 Web 端 Cookie 刷新（登录态续期，官方四步协议）。
 *
 * 只中转不绕过 —— 走的是平台正规续期通道，不涉及任何风控对抗。调用方拿到新的
 * `{ cookie, refreshToken }` 后**必须整组持久化替换旧值**：下次刷新从新状态开始，
 * 旧 token 已在第 4 步作废，再用旧 token 刷会 `86095`。
 *
 * @param input - 旧 cookie + 旧 refresh_token
 * @param deps - 发请求的 `send`（由 client 用 transport 注入）
 * @param _options - 预留请求配置位（当前未用；代理/超时由注入的 send 承载）
 * @returns 成功给新凭证；失败给 AmagiError
 */
export const refreshBilibiliCredential = async (
  input: BilibiliRefreshInput,
  deps: BilibiliRefreshDeps,
  _options?: RequestConfig
): Promise<{ ok: true; credential: BilibiliRefreshOutput } | { ok: false; error: AmagiError }> => {
  const oldBiliJct = getCookieValue(input.cookie, 'bili_jct')
  if (!oldBiliJct) return { ok: false, error: errorOf('validation', 'PARAM_INVALID', 'B站刷新 cookie 缺少 bili_jct') }
  if (!input.refreshToken) return { ok: false, error: errorOf('validation', 'PARAM_INVALID', 'B站刷新缺少 refreshToken（ac_time_value）') }

  const withCookie = (cookie: string, extra?: Record<string, string>): Record<string, string> => ({ cookie, ...(extra ?? {}) })
  const FORM = { 'content-type': 'application/x-www-form-urlencoded' } as const

  // ── 第 1 步：cookie/info —— 校验登录态 + 取服务器时间戳 ──
  // 响应里的 `data.refresh` 不读：调用方显式调用即强制刷新，要不要刷由调用方决定
  let info: RawResponse
  try {
    info = await deps.send({
      method: 'GET',
      url: `${COOKIE_INFO_URL}?csrf=${encodeURIComponent(oldBiliJct)}`,
      headers: withCookie(input.cookie)
    })
  } catch (cause) {
    return {
      ok: false,
      error: errorOf('network', 'NETWORK_ERROR', `B站 cookie/info 失败：${cause instanceof Error ? cause.message : String(cause)}`)
    }
  }
  if (pick(info.body, 'code') === -101) return { ok: false, error: errorOf('auth', 'LOGIN_REQUIRED', 'B站账号未登录，无法刷新') }
  const serverTs = pick(info.body, 'data', 'timestamp')
  const ts = typeof serverTs === 'number' && serverTs > 0 ? serverTs : Date.now()

  // ── 第 2 步：correspond/1/{path} —— 从 HTML 抠 refresh_csrf ──
  let corr: RawResponse
  try {
    corr = await deps.send({
      method: 'GET',
      url: `${CORRESPOND_URL}${getBilibiliCorrespondPath(ts)}`,
      headers: withCookie(input.cookie),
      responseType: 'text'
    })
  } catch (cause) {
    return {
      ok: false,
      error: errorOf('network', 'NETWORK_ERROR', `B站 correspond 失败：${cause instanceof Error ? cause.message : String(cause)}`)
    }
  }
  if (corr.status === 404) {
    return { ok: false, error: errorOf('auth', 'LOGIN_REQUIRED', 'B站 correspond 返回 404：correspondPath 过期或登录态无效', corr.body) }
  }
  const refreshCsrf = REFRESH_CSRF_RE.exec(typeof corr.body === 'string' ? corr.body : String(corr.body))?.[1]
  if (!refreshCsrf) {
    return { ok: false, error: errorOf('parse', 'DECODE_FAILED', 'B站 correspond 未能抽出 refresh_csrf', corr.body) }
  }

  // ── 第 3 步：cookie/refresh —— 换新 cookie（Set-Cookie）+ 新 refresh_token（body） ──
  const refreshTokenOld = input.refreshToken // 先存旧值：第 4 步确认要用它，别被新值覆盖
  let refreshed: RawResponse
  try {
    refreshed = await deps.send({
      method: 'POST',
      url: COOKIE_REFRESH_URL,
      headers: withCookie(input.cookie, FORM),
      body: serializeForm({ csrf: oldBiliJct, refresh_csrf: refreshCsrf, source: 'main_web', refresh_token: refreshTokenOld })
    })
  } catch (cause) {
    return {
      ok: false,
      error: errorOf('network', 'NETWORK_ERROR', `B站 cookie/refresh 失败：${cause instanceof Error ? cause.message : String(cause)}`)
    }
  }
  const refreshCode = pick(refreshed.body, 'code')
  const refreshTokenNew = pick(refreshed.body, 'data', 'refresh_token')
  if (refreshCode !== 0 || typeof refreshTokenNew !== 'string' || refreshTokenNew === '') {
    return {
      ok: false,
      error: errorOf('auth', 'LOGIN_REQUIRED', `B站 cookie/refresh 未成功（code ${String(refreshCode)}）`, refreshed.body)
    }
  }
  const newCookie = mergeSetCookie(refreshed.setCookie, input.cookie)
  const newBiliJct = getCookieValue(newCookie, 'bili_jct')
  if (!newBiliJct) {
    return { ok: false, error: errorOf('parse', 'DECODE_FAILED', 'B站 cookie/refresh 未从 Set-Cookie 下发新 bili_jct', refreshed.body) }
  }

  // ── 第 4 步：confirm/refresh —— 新 csrf + 旧 refresh_token，使旧态失效 ──
  // 第 3 步已成功、新 cookie 已生效。第 4 步无论业务码失败还是网络异常都判失败，但新凭证
  // 一律放进 `error.raw.credential` 带出（旧 token 可能已被服务端作废，丢了新的就只能重新扫码）。
  const credential: BilibiliRefreshOutput = { cookie: newCookie, refreshToken: refreshTokenNew }
  try {
    const confirmed = await deps.send({
      method: 'POST',
      url: CONFIRM_REFRESH_URL,
      headers: withCookie(newCookie, FORM),
      body: serializeForm({ csrf: newBiliJct, refresh_token: refreshTokenOld })
    })
    if (pick(confirmed.body, 'code') !== 0) {
      return {
        ok: false,
        error: errorOf(
          'auth',
          'COOKIE_EXPIRED',
          `B站 confirm/refresh 未成功（code ${String(pick(confirmed.body, 'code'))}），新 cookie 已生效但旧态未作废`,
          { credential, body: confirmed.body }
        )
      }
    }
  } catch (cause) {
    return {
      ok: false,
      error: errorOf(
        'network',
        'NETWORK_ERROR',
        `B站 confirm/refresh 失败：${cause instanceof Error ? cause.message : String(cause)}（新 cookie 已生效）`,
        { credential }
      )
    }
  }

  // 第 4 步成功：旧 token/旧 cookie 已作废，返回新凭证供调用方整组持久化
  return { ok: true, credential }
}
