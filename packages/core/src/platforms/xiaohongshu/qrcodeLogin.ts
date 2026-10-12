import { getCookieValue, parseCookie, serializeCookie } from '../../contracts/cookie'
import type { AmagiError, RiskChallenge } from '../../contracts/error'
import type { CaptchaChallenge, Credential, LoginState, Qrcode, QrcodeLoginStrategy, SessionCtx } from '../../contracts/session'
import { AmagiHeaders, type HeadersInput, type RawResponse, type RequestSpec } from '../../contracts/request'
import { generateSecChUa } from '../../contracts/ua'
import { createXiaohongshuGuestSession } from './sign/guestCookie'
import { createXiaohongshuCryptoConfig } from './sign/config'
import { parseXiaohongshuCaptcha, XIAOHONGSHU_ANTI_SPAM_STATUS, XIAOHONGSHU_ANTI_SPIDER_STATUS } from './captcha'
import { SessionManager, Xhshow } from '@ikenxuan/xhshow-ts'

/**
 * 小红书扫码登录策略。
 *
 * **它不是从零实现一条登录链，而是接在游客冷启动之后。** 小红书 PC web 扫码登录的前
 * 90% —— a1/webId 生成、scripting(`websectiga`)、webprofile(`gid` + SSK 交换)、
 * activate(匿名 `web_session` + SSK) —— 与「造游客会话」逐字节相同，amagi 已经在
 * {@link createXiaohongshuGuestSession} 里实现并在生产里用着。本策略复用它拿到带 SSK 的
 * 冷启动 cookie，再追加扫码登录独有的三个签名请求：
 *
 * | 阶段 | 接口 | 产出 |
 * | --- | --- | --- |
 * | create（start） | `POST edith/api/sns/web/v1/login/qrcode/create` `{qr_type:1}` | `qr_id` / `code` / `url`（二维码内容） |
 * | poll（poll） | `POST edith/api/qrcode/userinfo` `{qrId,code}` | `data.codeStatus` 0/1/2/3 |
 * | status（poll 内，codeStatus===2 时） | `GET edith/api/sns/web/v1/login/qrcode/status?qr_id=&code=` | `data.login_info.session` = 正式 `web_session` |
 *
 * 契约取自 cv-cat Spider_XHS 的 `apis/xhs_pc_login_apis.py`（逐接口核对），
 * 实现按 amagi 风格重写、未复制其代码。
 *
 * ## 签名：登录接口是「a1 游客签名」
 *
 * 三个登录接口都要 `x-s` / `x-t` / `x-s-common`，但签名 cookie **排除 `web_session`**
 * —— 身份只认 `a1`。这正是 amagi 现有游客签名器（`signHeadersPost` / `signHeadersGet`）
 * 的行为，所以直接复用 `Xhshow` + `SessionManager`，不需要新签名档。`activate` 换到的
 * `webSsk` 交给 `SessionManager`，让 `x-s` 带上 `x6/x7`（会话 SSK 证明）。
 *
 * ## 两个已知的不可本地验证点（如实标注）
 *
 * 1. **MNS 环境料按端点分档未复刻。** Spider_XHS 给 create/poll 各一套 envConst
 *    （1350/1351），而 amagi 的 xhshow-ts 不暴露按端点切 MNS 的入口，全程用一份
 *    `CryptoConfig`。这与冷启动（scripting/webprofile/activate）同一套赌注——那条链在
 *    生产里能过，所以 create/poll 按同样方式签。服务端若严格校验登录档位的 envConst，
 *    本实现会在 create 这一步被拒，需要 xhshow-ts 补按档位签名的能力。
 * 2. **扫码闭环无法在本仓自动化环境端到端实测**——要真人用小红书 App 扫码。本策略的
 *    状态机 / cookie 落地 / 签名装配可被单测钉住，但「真扫一次能登上」只能靠调用方真机验。
 *
 * @module platforms/xiaohongshu/qrcodeLogin
 */

/** 登录业务接口域名（与 Spider_XHS 的 `origin('api')` 一致） */
const EDITH_ORIGIN = 'https://edith.xiaohongshu.com'
const CREATE_PATH = '/api/sns/web/v1/login/qrcode/create'
const POLL_PATH = '/api/qrcode/userinfo'
const STATUS_PATH = '/api/sns/web/v1/login/qrcode/status'

/** 二维码默认有效期：create 响应不带过期字段，Spider_XHS 用 180s 轮询超时，这里对齐 */
const QRCODE_TTL_MS = 180_000

/**
 * 登录请求的浏览器基线头（与 `guestCookie.ts` 的 `GUEST_HEADERS` 同款，Windows Chrome）。
 * 独立一份而不是从 guestCookie 导出：那边是 `as const` 私有常量，跨模块共享会把它变成
 * 公开面；登录头与游客头将来也可能各自演进。
 */
const LOGIN_HEADERS = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
  'content-type': 'application/json;charset=UTF-8',
  origin: 'https://www.xiaohongshu.com',
  priority: 'u=1, i',
  referer: 'https://www.xiaohongshu.com/',
  'sec-ch-ua': '"Microsoft Edge";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0'
} as const

/** `data.codeStatus`（驼峰）→ amagi phase。源码无 rejected 枚举，取消态归 expired。 */
const codeStatusToPhase = (status: number): LoginState['phase'] => {
  switch (status) {
    case 0:
      return 'pending'
    case 1:
      return 'scanned'
    case 2:
      return 'success'
    case 3:
      return 'expired'
    default:
      return 'failed'
  }
}

/** ctx.data 里持久化的键（JSON 可序列化，不存 SessionManager 实例本身） */
const CTX_COOKIE = 'xhsCookie'
const CTX_WEB_SSK = 'xhsWebSsk'
const CTX_QR_ID = 'xhsQrId'
const CTX_CODE = 'xhsCode'

/** webSsk 的最小形状（appId → base64 key）。SessionManager 构造接受它或 JSON 串 */
type WebSskMap = Record<string, string>

/** 从 ctx.data 读一个字符串字段 */
const strData = (ctx: SessionCtx, key: string): string | undefined => {
  const value = ctx.data[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}

/** 取本次请求的 UA（调用方 requestConfig 覆盖优先，否则登录基线） */
const userAgentOf = (ctx: SessionCtx): string => {
  const header = new AmagiHeaders(ctx.requestConfig?.headers as HeadersInput).get('user-agent')
  return header ?? LOGIN_HEADERS['user-agent']
}

/** 把一个会话上下文装配成「签名器 + SessionManager + cookie 串 + 基线头」 */
interface LoginSigner {
  signer: Xhshow
  session: SessionManager
  cookie: string
  a1: string
  headers: AmagiHeaders
}

/**
 * 从 cookie + webSsk 装配签名器。登录链的每个请求都用它签。
 * @param ctx - 会话上下文
 * @param cookie - 当前 cookie 串
 * @param webSsk - activate 换到的会话 SSK
 * @returns 装配结果；cookie 缺 a1 时 undefined（签名器硬要求 a1）
 */
const makeLoginSigner = (ctx: SessionCtx, cookie: string, webSsk?: WebSskMap): LoginSigner | undefined => {
  const a1 = getCookieValue(cookie, 'a1')
  if (!a1) return undefined
  const userAgent = userAgentOf(ctx)
  const cryptoConfig = createXiaohongshuCryptoConfig(userAgent)
  const callerHeaders = new AmagiHeaders(ctx.requestConfig?.headers as HeadersInput)
  const headers = new AmagiHeaders(LOGIN_HEADERS).merge(ctx.requestConfig?.headers as HeadersInput)
  if (!callerHeaders.has('sec-ch-ua')) headers.set('sec-ch-ua', generateSecChUa(headers.get('user-agent') ?? userAgent))
  return {
    signer: new Xhshow(cryptoConfig),
    session: new SessionManager(cryptoConfig, webSsk === undefined ? undefined : { webSsk }),
    cookie,
    a1,
    headers
  }
}

/** 发一个带签名的登录请求，合并响应 Set-Cookie 回 cookie 串 */
const sendSigned = async (
  ctx: SessionCtx,
  loginSigner: LoginSigner,
  spec: { method: 'GET' | 'POST'; path: string; query?: Record<string, string>; body?: Record<string, unknown> }
): Promise<{ body: unknown; status: number; cookie: string; headers: RawResponse['headers'] }> => {
  const url = new URL(EDITH_ORIGIN + spec.path)
  for (const [k, v] of Object.entries(spec.query ?? {})) url.searchParams.set(k, v)
  const signHeaders =
    spec.method === 'POST'
      ? loginSigner.signer.signHeadersPost(spec.path, loginSigner.cookie, 'xhs-pc-web', spec.body ?? {}, undefined, loginSigner.session)
      : loginSigner.signer.signHeadersGet(spec.path, loginSigner.cookie, 'xhs-pc-web', spec.query ?? {}, undefined, loginSigner.session)

  const headers = loginSigner.headers
    .clone()
    .merge(signHeaders as HeadersInput)
    .set('Cookie', loginSigner.cookie)
  // 最终换登录态的 GET 带 x-login-mode: qrcode（前端 callQrcodeStatusApi 实抓；旧版曾传空串）
  if (spec.path === STATUS_PATH) headers.set('x-login-mode', 'qrcode')

  const request: RequestSpec = {
    method: spec.method,
    url: url.toString(),
    headers: headers.toJSON(),
    ...(spec.body === undefined ? {} : { body: spec.body })
  }
  const res: RawResponse = await ctx.send(request, 'challenge')

  // Set-Cookie 原始数组逐条并回（web_session/gid 等服务端下发）
  const merged = parseCookie(loginSigner.cookie)
  for (const line of res.setCookie ?? []) {
    const [pair] = line.split(';')
    const idx = pair.indexOf('=')
    if (idx > 0) merged[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim()
  }
  return { body: res.body, status: res.status, cookie: serializeCookie(merged), headers: res.headers }
}

/**
 * status 换登录态时的二次验证识别。
 *
 * 只做中转，不做绕过（与 `captcha.ts` 同一条红线）。风控账号扫码确认后，`status`
 * 接口不会直接下发 `web_session`，而是用 HTTP 状态标记一次人机验证：
 * - **471 `antiSpam`（`InAntiSpamChecking`）** —— 登录风控二次验证（前端 `callQrcodeStatusApi`
 *   捕获 `error.status===471` 后暂停轮询、等验证完再重放 status）。
 * - **461 `antiSpider`** —— 同一套 redcaptcha，普通反爬也会撞；登录链里一并兜住。
 *
 * 验证票据只在响应头（`verifyuuid` / `verifytype`），所以复用 `parseXiaohongshuCaptcha`
 * 从响应头拼出验证页地址。`verifytype` 的平台原值不翻译（`301`/`302` 是重定向类，
 * 其余是真滑块）—— 调用方拿 `challenge` 自己决定怎么过，过完回填后 `answer()` 重放 status。
 * @param status - status 响应的 HTTP 状态
 * @param headers - status 响应头
 * @returns 需要二次验证时的 `RiskChallenge`，否则 `undefined`
 */
const detectStatusChallenge = (status: number, headers: RawResponse['headers']): RiskChallenge | undefined => {
  if (status !== XIAOHONGSHU_ANTI_SPAM_STATUS && status !== XIAOHONGSHU_ANTI_SPIDER_STATUS) return undefined
  return parseXiaohongshuCaptcha(undefined, { status, headers })
}

/** `RiskChallenge` → 登录态的 `CaptchaChallenge`（引擎 / onChallenge 消费的形状） */
const toCaptchaChallenge = (risk: RiskChallenge): CaptchaChallenge => ({
  kind: 'captcha',
  imageUrl: risk.url,
  payload: {
    ...(risk.session === undefined ? {} : { verifyUuid: risk.session }),
    ...(risk.type === undefined ? {} : { verifyType: risk.type }),
    ...(risk.configUrl === undefined ? {} : { configUrl: risk.configUrl }),
    ...(risk.result === undefined ? {} : { result: risk.result })
  }
})

/** 取响应体某路径的值（容忍 bigint-safe 解析后的对象） */
const pick = (body: unknown, ...path: string[]): unknown => {
  let node: unknown = body
  for (const key of path) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[key]
  }
  return node
}

/** 造一个 AmagiError */
const errorOf = (kind: AmagiError['kind'], code: AmagiError['code'], message: string, raw?: unknown): AmagiError => ({
  kind,
  code,
  message,
  retryable: false,
  ...(raw === undefined ? {} : { raw })
})

/** 小红书扫码登录策略 */
export const xiaohongshuQrcodeStrategy: QrcodeLoginStrategy = {
  platform: 'xiaohongshu',

  /**
   * 取二维码：先跑游客冷启动（拿带 SSK 的 cookie），再 create。
   *
   * 冷启动经 `ctx.send` 走 transport（代理 / 超时生效）；`createXiaohongshuGuestSession`
   * 的 send 形状与此处一致，直接把 ctx.send 适配过去。
   */
  async start(ctx) {
    let guest: Awaited<ReturnType<typeof createXiaohongshuGuestSession>>
    try {
      // 冷启动的 send 只收 RequestSpec（不带 reason）；用 'prepare' 归因
      guest = await createXiaohongshuGuestSession((spec) => ctx.send(spec, 'prepare'), ctx.requestConfig)
    } catch (cause) {
      return {
        ok: false,
        error: errorOf('internal', 'INTERNAL_ERROR', `小红书游客冷启动失败：${cause instanceof Error ? cause.message : String(cause)}`)
      }
    }

    const webSsk = guest.webSsk as WebSskMap | undefined
    const loginSigner = makeLoginSigner(ctx, guest.cookie, webSsk)
    if (!loginSigner) return { ok: false, error: errorOf('internal', 'INTERNAL_ERROR', '小红书冷启动 cookie 缺少 a1') }

    let created: { body: unknown; status: number; cookie: string }
    try {
      created = await sendSigned(ctx, loginSigner, { method: 'POST', path: CREATE_PATH, body: { qr_type: 1 } })
    } catch (cause) {
      return {
        ok: false,
        error: errorOf('network', 'NETWORK_ERROR', `小红书创建二维码失败：${cause instanceof Error ? cause.message : String(cause)}`)
      }
    }

    const qrId = pick(created.body, 'data', 'qr_id')
    const code = pick(created.body, 'data', 'code')
    const qrUrl = pick(created.body, 'data', 'url')
    if (typeof qrId !== 'string' || typeof code !== 'string' || typeof qrUrl !== 'string') {
      return { ok: false, error: errorOf('parse', 'DECODE_FAILED', '小红书二维码创建响应缺少 qr_id / code / url', created.body) }
    }

    const nowMs = Date.now()
    const qrcode: Qrcode = {
      content: qrUrl,
      token: qrId,
      expiresAt: nowMs + QRCODE_TTL_MS,
      expiresInSec: Math.floor(QRCODE_TTL_MS / 1000)
    }
    const data: Record<string, unknown> = {
      ...ctx.data,
      [CTX_COOKIE]: created.cookie,
      [CTX_QR_ID]: qrId,
      [CTX_CODE]: code,
      ...(webSsk === undefined ? {} : { [CTX_WEB_SSK]: webSsk })
    }
    return { ok: true, qrcode, ctx: { ...ctx, cookie: created.cookie, token: qrId, qrcode, data } }
  },

  /** 单次轮询：userinfo → codeStatus；===2 时内部换正式 web_session */
  async poll(ctx) {
    const cookie = strData(ctx, CTX_COOKIE) ?? ctx.cookie
    const qrId = strData(ctx, CTX_QR_ID)
    const code = strData(ctx, CTX_CODE)
    if (!qrId || !code) {
      return { ok: false, error: errorOf('internal', 'INTERNAL_ERROR', '小红书会话缺少 qr_id / code，请先 start()') }
    }
    const webSsk = ctx.data[CTX_WEB_SSK] as WebSskMap | undefined
    const loginSigner = makeLoginSigner(ctx, cookie, webSsk)
    if (!loginSigner) return { ok: false, error: errorOf('internal', 'INTERNAL_ERROR', '小红书会话 cookie 缺少 a1') }

    let polled: { body: unknown; status: number; cookie: string }
    try {
      polled = await sendSigned(ctx, loginSigner, { method: 'POST', path: POLL_PATH, body: { qrId, code } })
    } catch (cause) {
      return {
        ok: false,
        error: errorOf('network', 'NETWORK_ERROR', `小红书轮询失败：${cause instanceof Error ? cause.message : String(cause)}`)
      }
    }

    const codeStatus = pick(polled.body, 'data', 'codeStatus')
    if (typeof codeStatus !== 'number') {
      return { ok: false, error: errorOf('parse', 'DECODE_FAILED', '小红书轮询响应缺少 codeStatus', polled.body) }
    }
    const phase = codeStatusToPhase(codeStatus)
    const nextData: Record<string, unknown> = { ...ctx.data, [CTX_COOKIE]: polled.cookie }
    const nextCtx: SessionCtx = { ...ctx, cookie: polled.cookie, data: nextData }

    if (phase === 'pending' || phase === 'scanned') {
      return { ok: true, state: { phase, qrcode: ctx.qrcode! }, ctx: nextCtx, intervalMs: 2000 }
    }
    if (phase === 'expired') {
      return { ok: true, state: { phase: 'expired' }, ctx: nextCtx, intervalMs: 0 }
    }
    if (phase === 'failed') {
      return {
        ok: true,
        state: { phase: 'failed', error: errorOf('unknown', 'PLATFORM_ERROR', `小红书未知二维码状态 ${codeStatus}`, polled.body) },
        ctx: nextCtx,
        intervalMs: 0
      }
    }

    // phase === 'success'：codeStatus===2，换正式 web_session（GET status）
    const statusSigner = makeLoginSigner(ctx, polled.cookie, webSsk)
    if (!statusSigner) return { ok: false, error: errorOf('internal', 'INTERNAL_ERROR', '小红书换登录态时 cookie 缺少 a1') }
    let final: { body: unknown; status: number; cookie: string; headers: RawResponse['headers'] }
    try {
      final = await sendSigned(ctx, statusSigner, { method: 'GET', path: STATUS_PATH, query: { qr_id: qrId, code } })
    } catch (cause) {
      return {
        ok: false,
        error: errorOf('network', 'NETWORK_ERROR', `小红书换取登录态失败：${cause instanceof Error ? cause.message : String(cause)}`)
      }
    }

    // 风控账号：status 不直接下发 web_session，而是用 461/471 标一次人机验证（票据在响应头）。
    // 必须在「取 session」之前拦住 —— 否则会误把 cookie 里残留的匿名 web_session 当成功登录态。
    // 能从响应头拼出验证页 → 吐 challenge 交调用方（不自动过，对齐抖音滑块红线）；
    // 拼不出票据 → 仍是被拦，判 risk，绝不回落成功。
    if (final.status === XIAOHONGSHU_ANTI_SPAM_STATUS || final.status === XIAOHONGSHU_ANTI_SPIDER_STATUS) {
      const challenge = detectStatusChallenge(final.status, final.headers)
      const challengeCtx: SessionCtx = { ...nextCtx, cookie: final.cookie, data: { ...nextData, [CTX_COOKIE]: final.cookie } }
      if (challenge !== undefined) {
        return { ok: true, state: { phase: 'challenge', challenge: toCaptchaChallenge(challenge) }, ctx: challengeCtx, intervalMs: 0 }
      }
      return {
        ok: false,
        error: errorOf('risk', 'CAPTCHA_REQUIRED', `小红书扫码后触发风控（HTTP ${final.status}）但响应头未带验证票据`, final.body)
      }
    }

    // 正式 web_session 以响应体 login_info.session 为权威，覆盖匿名 session（Set-Cookie 已在 cookie 里兜底）
    const session = pick(final.body, 'data', 'login_info', 'session')
    const merged = parseCookie(final.cookie)
    if (typeof session === 'string' && session !== '') merged.web_session = session
    if (!merged.web_session) {
      return { ok: false, error: errorOf('auth', 'LOGIN_REQUIRED', '小红书扫码成功但未取到 web_session', final.body) }
    }
    const credential: Credential = { cookie: serializeCookie(merged), raw: final.body }
    return {
      ok: true,
      state: { phase: 'success', credential },
      ctx: { ...nextCtx, cookie: credential.cookie, data: { ...nextData, [CTX_COOKIE]: credential.cookie } },
      intervalMs: 0
    }
  },

  /**
   * 应答二次验证：真人过完 redcaptcha 后，让轮询继续（引擎会自动重放 status）。
   *
   * amagi 只做中转 —— 它不验证、不校验调用方给的 answer。小红书的 redcaptcha 没有可
   * 回填进 status 调用的票据：验证通过是**服务端按 `verifyUuid` 解除**的，解除后用
   * 同一套 cookie 重放 `status` 就放行（前端 `callQrcodeStatusApi` 在
   * `inAntiSpamCheckQrcodeStatus` 翻回 false 时做的就是这一次重放）。
   *
   * 引擎的编排是「`answer()` 返回后立即再 `poll()` 一次」，而本平台的 `poll()`
   * 命中 `codeStatus===2` 就会重打 status —— 所以 `answer()` 自己不必再发请求，只需把
   * 验证页可能写回的最新 cookie（调用方经 `requestConfig` 或同一 transport 的 cookie
   * jar 带回）并进 ctx，随后那次 poll 要么拿到 `web_session`、要么再出一次 challenge。
   * @param ctx - 会话上下文（challenge 阶段的那一份）
   * @returns 带最新 cookie 的 ctx；引擎据此重新轮询
   */
  async answer(ctx) {
    const refreshed = new AmagiHeaders(ctx.requestConfig?.headers as HeadersInput).get('cookie')
    if (refreshed === undefined || refreshed === '') return { ok: true, ctx }
    const merged = parseCookie(strData(ctx, CTX_COOKIE) ?? ctx.cookie)
    for (const [k, v] of Object.entries(parseCookie(refreshed))) merged[k] = v
    const cookie = serializeCookie(merged)
    return { ok: true, ctx: { ...ctx, cookie, data: { ...ctx.data, [CTX_COOKIE]: cookie } } }
  },

  /** 序列化：cookie + qr_id + code + webSsk（不含 SessionManager 实例） */
  serialize(ctx) {
    return JSON.stringify({
      v: 1,
      platform: 'xiaohongshu',
      cookie: strData(ctx, CTX_COOKIE) ?? ctx.cookie,
      token: ctx.token,
      qrcode: ctx.qrcode,
      qrId: strData(ctx, CTX_QR_ID),
      code: strData(ctx, CTX_CODE),
      webSsk: ctx.data[CTX_WEB_SSK]
    })
  },

  deserialize(blob) {
    const parsed = blob
      ? (JSON.parse(blob) as {
          cookie?: string
          token?: string
          qrcode?: Qrcode
          qrId?: string
          code?: string
          webSsk?: WebSskMap
        })
      : {}
    const data: Record<string, unknown> = {}
    if (parsed.cookie) data[CTX_COOKIE] = parsed.cookie
    if (parsed.qrId) data[CTX_QR_ID] = parsed.qrId
    if (parsed.code) data[CTX_CODE] = parsed.code
    if (parsed.webSsk) data[CTX_WEB_SSK] = parsed.webSsk
    return {
      platform: 'xiaohongshu',
      cookie: parsed.cookie ?? '',
      token: parsed.token,
      qrcode: parsed.qrcode,
      send: () => {
        throw new Error('恢复的会话缺少 send，请通过 client 创建')
      },
      data
    }
  }
}
