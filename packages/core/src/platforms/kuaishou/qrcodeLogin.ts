import { parseCookie, serializeCookie } from '../../contracts/cookie'
import type { AmagiError } from '../../contracts/error'
import { AmagiHeaders, type HeadersInput, type RawResponse, type RequestSpec } from '../../contracts/request'
import type { CaptchaChallenge, Credential, Qrcode, QrcodeLoginStrategy, SessionCtx } from '../../contracts/session'
import { buildKuaishouDidCookie, isValidKuaishouDid, randomKuaishouDid } from './did'

/**
 * 快手 PC web 扫码登录策略。
 *
 * **只中转不绕过。** 遇人机验证（二次验证 / 滑块）一律把验证页原样吐成 challenge
 * 交调用方，绝不自动过 —— 与抖音滑块、小红书 redcaptcha 同一条红线。
 *
 * ## 协议（逆自 id.kuaishou.com 的 sso.js + 裸 XHR 真机复现，2026-10-12）
 *
 * 域名 `https://id.kuaishou.com`，三个接口全 `POST` + `application/x-www-form-urlencoded`
 * + 带 cookie，成功判据统一是**响应体 `result === 1`**：
 *
 * | 步骤 | path | body | 说明 |
 * | --- | --- | --- | --- |
 * | start | `/rest/c/infra/ks/qr/start` | `{sid}` | 取码，返回 `qrLoginToken`(16) + `qrLoginSignature`(10) + `imageData`(PNG) + `qrUrl` + `expireTime` |
 * | scanResult | `/rest/c/infra/ks/qr/scanResult` | `{qrLoginToken, qrLoginSignature}` | **无 sid**，long-poll 等「扫码」 |
 * | acceptResult | `/rest/c/infra/ks/qr/acceptResult` | `{qrLoginToken, qrLoginSignature, sid}` | **带 sid**，long-poll 等「手机确认」 |
 *
 * - **两段 long-poll**：scanResult 先 hold 等扫码（实测 hold 60s，本轮无人扫返 `result:707`），
 *   扫到后进入 acceptResult hold 等手机确认。所以 `poll()` 按 `ctx.data` 里的 `stage`
 *   在两个接口间切换。long-poll 的「等」就是 HTTP 请求本身的 hold —— 引擎的 `intervalMs`
 *   退避是 long-poll 返回之后到下次发起之间的间隔，取小值即可。
 * - **「服务器忙」根因**：裸 fetch 只带 `qrLoginSignature` 缺 `qrLoginToken` → 89ms 立即
 *   `result:313390078`（`…078` 后缀）。两个凭证都带齐才进 long-poll —— 所以本策略
 *   `scanResult` / `acceptResult` 一律两者齐发。
 * - **不签名**：PC 控制台 sid（`kuaishou.web.cp.api`）默认 `enableSig4=false`，qr 这套
 *   infra 接口不加 `__NS_hxfalcon`（无签名裸 XHR 成功 start + 60s long-poll = 硬证据）。
 * - **did 本地生成**：复用 `did.ts` 的 `randomKuaishouDid()`，访问即可，不发注册请求。
 *   实测本地随机 did（未激活）即可驱动 scanResult long-poll。
 *
 * ## 未真机验证（如实标注）
 *
 * 本会话没有真机扫码，所以**扫码确认之后的响应体结构全部是 sso.js 读出来的契约、
 * 不是真机实测**：scanResult 扫到后的 `user`、acceptResult 确认后的 `qrToken`、
 * `/pass/kuaishou/login/qr/callback` 换出的登录态字段（`passToken` / `<sid>_st` /
 * `userId`）。登录态组装（{@link assembleCredential}）按契约实现并标注，真机扫一次即可校正。
 * `707` 到底是「本轮 long-poll 超时」还是「二维码真过期」也未真机区分 —— 这里按
 * `expiresAt` 判：未过期当「本轮超时、继续轮询」，已过期才判 `expired`。
 *
 * @module platforms/kuaishou/qrcodeLogin
 */

/** 登录接口域 */
const LOGIN_ORIGIN = 'https://id.kuaishou.com'

/** PC 控制台 sid：实测 `result:1`（`kuaishou.web.pc` 会 201796964「请求不合法」） */
const KUAISHOU_LOGIN_SID = 'kuaishou.web.cp.api'

const START_PATH = '/rest/c/infra/ks/qr/start'
const SCAN_PATH = '/rest/c/infra/ks/qr/scanResult'
const ACCEPT_PATH = '/rest/c/infra/ks/qr/acceptResult'
/** 确认后换登录态（普通模式，非 kuaishouAuth）。响应体带 passToken / `<sid>_st` / userId */
const CALLBACK_PATH = '/pass/kuaishou/login/qr/callback'

/** 成功事件码 */
const RESULT_OK = 1
/** 二维码过期 / 本轮 long-poll 超时（真机未区分两者） */
const RESULT_EXPIRED = 707

/** 二次验证（身份校验）业务码区间：pass 接口 result ∈ [400001, 410999] → 开验证页 */
const IDV_RESULT_MIN = 400001
const IDV_RESULT_MAX = 410999
/** 滑块验证码业务码：100110013（需 useKsCaptcha）/ 101100128 */
const CAPTCHA_RESULTS = new Set([100110013, 101100128])

/** 二维码默认有效期兜底（start 没给 expireTime 时用），单位毫秒 */
const QRCODE_TTL_MS = 5 * 60 * 1000

/** scanResult 返回后到下次发起的间隔（long-poll 自身在 hold，这里取小值） */
const POLL_INTERVAL_MS = 1000

/** ctx.data 持久化键 */
const CTX_DID = 'ksDid'
const CTX_TOKEN = 'ksQrLoginToken'
const CTX_SIGNATURE = 'ksQrLoginSignature'
const CTX_STAGE = 'ksStage'
/** challenge 阶段把验证前的 cookie 存一份，answer 以它为底再并验证页写回的新 cookie */
const CTX_COOKIE_KEY = 'ksCookie'

/** 轮询阶段：等扫码 → 等手机确认 */
type Stage = 'scan' | 'accept'

/** 从 ctx.data 读字符串字段 */
const strData = (ctx: SessionCtx, key: string): string | undefined => {
  const value = ctx.data[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}

/** 取字符串字段，非字符串当没有 */
const str = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * form 编码（过滤 undefined / 空串）。
 * @param obj - 键值对
 * @returns `k=v&k=v` 形式的 x-www-form-urlencoded 串
 */
const form = (obj: Record<string, string | number | undefined>): string =>
  Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')

/** 取响应体某路径的值 */
const pick = (body: unknown, ...path: string[]): unknown => {
  let node: unknown = body
  for (const key of path) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[key]
  }
  return node
}

/** 响应体的 result 码（非数字当 undefined） */
const resultOf = (body: unknown): number | undefined => {
  const r = pick(body, 'result')
  return typeof r === 'number' ? r : undefined
}

/** 响应体文案（error_msg / message / errorMsg 任取其一） */
const messageOf = (body: unknown): string => str(pick(body, 'error_msg')) || str(pick(body, 'message')) || str(pick(body, 'errorMsg'))

/** 造一个 AmagiError */
const errorOf = (kind: AmagiError['kind'], code: AmagiError['code'], message: string, raw?: unknown): AmagiError => ({
  kind,
  code,
  message,
  retryable: false,
  ...(raw === undefined ? {} : { raw })
})

/** 本次请求的 did：ctx.data 里有就复用，否则取用户 cookie 里的，再否则本地生成 */
const didOf = (ctx: SessionCtx, cookie: string): string => {
  const saved = strData(ctx, CTX_DID)
  if (saved && isValidKuaishouDid(saved)) return saved
  const fromCookie = parseCookie(cookie).did
  if (fromCookie && isValidKuaishouDid(fromCookie)) return fromCookie
  return randomKuaishouDid()
}

/** 登录链每个请求的 cookie 串：did + PC 上下文常量 + 用户 cookie */
const loginCookie = (did: string, userCookie: string): string => {
  const base = buildKuaishouDidCookie(did, userCookie)
  const userKeys = new Set(Object.keys(parseCookie(userCookie)).map((k) => k.toLowerCase()))
  const extras: string[] = []
  if (!userKeys.has('kpf')) extras.push('kpf=PC_WEB')
  if (!userKeys.has('kpn')) extras.push('kpn=KUAISHOU_VISION')
  if (!userKeys.has('clientid')) extras.push('clientid=3')
  return extras.length === 0 ? base : `${base}; ${extras.join('; ')}`
}

/**
 * 发一个登录接口请求（POST form，带 cookie，走 transport 的 ctx.send）。
 *
 * cookie 必须自己放进 spec.headers —— 登录会话的 `ctx.send` 是裸 `http.send`，没有
 * execute 的 `attachCookie`。content-type 覆写成 form（快手基线是 application/json）。
 * @param ctx - 会话上下文
 * @param path - 接口路径
 * @param body - 表单字段
 * @param cookie - 完整 cookie 串
 * @returns 响应体 + 状态 + 合并 Set-Cookie 后的 cookie
 */
const sendForm = async (
  ctx: SessionCtx,
  path: string,
  body: Record<string, string | number | undefined>,
  cookie: string
): Promise<{ body: unknown; status: number; cookie: string }> => {
  const headers = new AmagiHeaders()
    .set('content-type', 'application/x-www-form-urlencoded')
    .set('origin', 'https://www.kuaishou.com')
    .set('referer', 'https://www.kuaishou.com/')
    .set('cookie', cookie)
  const spec: RequestSpec = { method: 'POST', url: LOGIN_ORIGIN + path, headers: headers.toJSON() as HeadersInput, body: form(body) }
  const res: RawResponse = await ctx.send(spec, 'challenge')

  const merged = parseCookie(cookie)
  for (const line of res.setCookie ?? []) {
    const [pair] = line.split(';')
    const idx = pair.indexOf('=')
    if (idx > 0) merged[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim()
  }
  return { body: res.body, status: res.status, cookie: serializeCookie(merged) }
}

/** result 是不是「服务器忙」（缺参数那类，`…078` 后缀的大数） */
const isServerBusy = (result: number | undefined): boolean => result !== undefined && result > 1_000_000

/** result 命中二次验证 / 滑块 → 造 captcha challenge（原样把验证页信息交出去，不自动过） */
const challengeFor = (result: number, body: unknown): CaptchaChallenge | undefined => {
  const inIdvRange = result >= IDV_RESULT_MIN && result <= IDV_RESULT_MAX
  if (!inIdvRange && !CAPTCHA_RESULTS.has(result)) return undefined
  // 二次验证：pass 接口把验证页地址放在响应体 url（含 needQrcode=1 时是套二维码的验证页）
  // 滑块：captchaJsSdk + captchaConfig
  const url = str(pick(body, 'url'))
  const jsSdk = str(pick(body, 'captchaJsSdk')) || str(pick(body, 'jsSdkUrl'))
  return {
    kind: 'captcha',
    imageUrl: url,
    payload: {
      result,
      ...(jsSdk === '' ? {} : { jsSdkUrl: jsSdk }),
      ...(pick(body, 'captchaConfig') === undefined ? {} : { captchaConfig: pick(body, 'captchaConfig') })
    }
  }
}

/**
 * 从 callback 响应体 + cookie 组装登录态凭证。
 *
 * **推断，未真机验证。** sso.js 的 `vn()` 从 pass 接口响应体解出
 * `passToken` / `<sid>_st`(serviceToken) / `userId` / `ssecurity` / `bUserId`，登录态在
 * **响应体 JSON**（不一定走 Set-Cookie）。这里把它们连同 did 拼成 cookie 串；若服务端
 * 也发了 Set-Cookie（`sendForm` 已并进 `cookie`），两边都保留。真机扫一次即可校正字段名。
 * @param body - callback 响应体
 * @param cookie - 已并入 Set-Cookie 的 cookie 串
 * @param did - 本次会话的 did
 * @returns 登录凭证
 */
const assembleCredential = (body: unknown, cookie: string, did: string): Credential => {
  const merged = parseCookie(cookie)
  merged.did = did
  const stKey = `${KUAISHOU_LOGIN_SID}_st`
  const fields: Array<[string, unknown]> = [
    ['passToken', pick(body, 'passToken')],
    [stKey, pick(body, stKey) ?? pick(body, 'serviceToken')],
    ['userId', pick(body, 'userId')],
    ['ssecurity', pick(body, 'ssecurity')],
    ['bUserId', pick(body, 'bUserId')]
  ]
  for (const [k, v] of fields) {
    if (typeof v === 'string' && v !== '') merged[k] = v
    else if (typeof v === 'number') merged[k] = String(v)
  }
  return { cookie: serializeCookie(merged), raw: body }
}

/** 快手扫码登录策略 */
export const kuaishouQrcodeStrategy: QrcodeLoginStrategy = {
  platform: 'kuaishou',

  /** 取二维码：本地 did → start，拿 qrLoginToken + qrLoginSignature + 二维码图 */
  async start(ctx) {
    const did = didOf(ctx, ctx.cookie)
    const cookie = loginCookie(did, ctx.cookie)

    let res: { body: unknown; status: number; cookie: string }
    try {
      res = await sendForm(ctx, START_PATH, { sid: KUAISHOU_LOGIN_SID }, cookie)
    } catch (cause) {
      return {
        ok: false,
        error: errorOf('network', 'NETWORK_ERROR', `快手取二维码失败：${cause instanceof Error ? cause.message : String(cause)}`)
      }
    }

    if (resultOf(res.body) !== RESULT_OK) {
      return { ok: false, error: errorOf('parse', 'DECODE_FAILED', `快手取二维码未成功：${messageOf(res.body) || res.status}`, res.body) }
    }

    const token = str(pick(res.body, 'qrLoginToken'))
    const signature = str(pick(res.body, 'qrLoginSignature'))
    const qrUrl = str(pick(res.body, 'qrUrl'))
    const imageData = str(pick(res.body, 'imageData'))
    if (token === '' || signature === '') {
      return { ok: false, error: errorOf('parse', 'DECODE_FAILED', '快手二维码响应缺少 qrLoginToken / qrLoginSignature', res.body) }
    }

    const expireTime = pick(res.body, 'expireTime')
    const expiresAt = typeof expireTime === 'number' && expireTime > 0 ? expireTime : Date.now() + QRCODE_TTL_MS
    // content 优先给可扫的 qrUrl；imageData 是现成 PNG base64，放进 token 之外的字段供调用方直接显示
    const qrcode: Qrcode = {
      content: qrUrl !== '' ? qrUrl : `data:image/png;base64,${imageData}`,
      token,
      expiresAt,
      expiresInSec: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
    }

    const data: Record<string, unknown> = {
      ...ctx.data,
      [CTX_DID]: did,
      [CTX_TOKEN]: token,
      [CTX_SIGNATURE]: signature,
      [CTX_STAGE]: 'scan' satisfies Stage
    }
    return { ok: true, qrcode, ctx: { ...ctx, cookie: res.cookie, token, qrcode, data } }
  },

  /**
   * 单次轮询：按 stage 发 scanResult（等扫码）或 acceptResult（等手机确认），
   * 确认后再打 callback 换登录态。long-poll 的 hold 由 transport 请求本身承担。
   */
  async poll(ctx) {
    const token = strData(ctx, CTX_TOKEN)
    const signature = strData(ctx, CTX_SIGNATURE)
    const did = strData(ctx, CTX_DID)
    if (!token || !signature || !did) {
      return { ok: false, error: errorOf('internal', 'INTERNAL_ERROR', '快手会话缺少 qrLoginToken / signature / did，请先 start()') }
    }
    const stage: Stage = strData(ctx, CTX_STAGE) === 'accept' ? 'accept' : 'scan'
    const cookie = loginCookie(did, ctx.cookie)
    const expired = ctx.qrcode !== undefined && Date.now() >= ctx.qrcode.expiresAt

    const path = stage === 'scan' ? SCAN_PATH : ACCEPT_PATH
    // scanResult 无 sid，acceptResult 带 sid
    const body =
      stage === 'scan'
        ? { qrLoginToken: token, qrLoginSignature: signature }
        : { qrLoginToken: token, qrLoginSignature: signature, sid: KUAISHOU_LOGIN_SID }

    let res: { body: unknown; status: number; cookie: string }
    try {
      res = await sendForm(ctx, path, body, cookie)
    } catch (cause) {
      return {
        ok: false,
        error: errorOf('network', 'NETWORK_ERROR', `快手轮询失败：${cause instanceof Error ? cause.message : String(cause)}`)
      }
    }

    const result = resultOf(res.body)
    const nextData: Record<string, unknown> = { ...ctx.data, [CTX_DID]: did }
    const nextCtx: SessionCtx = { ...ctx, cookie: res.cookie, data: nextData }

    // 服务器忙：参数/上下文不对，直接判失败（不无限重试放大风控）
    if (isServerBusy(result)) {
      return { ok: false, error: errorOf('unknown', 'PLATFORM_ERROR', `快手轮询返回服务器忙（result ${result}）`, res.body) }
    }

    // 707：二维码过期 / 本轮 long-poll 超时。未过期→继续本阶段轮询；已过期→expired
    if (result === RESULT_EXPIRED) {
      if (expired) return { ok: true, state: { phase: 'expired' }, ctx: nextCtx, intervalMs: 0 }
      const phase = stage === 'scan' ? 'pending' : 'scanned'
      return { ok: true, state: { phase, qrcode: ctx.qrcode! }, ctx: nextCtx, intervalMs: POLL_INTERVAL_MS }
    }

    if (result !== RESULT_OK) {
      return {
        ok: true,
        state: {
          phase: 'failed',
          error: errorOf('unknown', 'PLATFORM_ERROR', `快手轮询未知状态 ${result}：${messageOf(res.body)}`, res.body)
        },
        ctx: nextCtx,
        intervalMs: 0
      }
    }

    // result === 1：本阶段事件达成
    if (stage === 'scan') {
      // 扫到码 → 进入「等手机确认」阶段，emit scanned，下一轮打 acceptResult
      const data: Record<string, unknown> = { ...nextData, [CTX_STAGE]: 'accept' satisfies Stage }
      return { ok: true, state: { phase: 'scanned', qrcode: ctx.qrcode! }, ctx: { ...nextCtx, data }, intervalMs: POLL_INTERVAL_MS }
    }

    // stage === 'accept' 且 result 1：手机已确认 → 换登录态
    let callback: { body: unknown; status: number; cookie: string }
    try {
      callback = await sendForm(
        ctx,
        CALLBACK_PATH,
        { qrToken: str(pick(res.body, 'qrToken')) || token, sid: KUAISHOU_LOGIN_SID },
        res.cookie
      )
    } catch (cause) {
      return {
        ok: false,
        error: errorOf('network', 'NETWORK_ERROR', `快手换登录态失败：${cause instanceof Error ? cause.message : String(cause)}`)
      }
    }

    // 二次验证 / 滑块：callback 的 result 落在身份校验区间或验证码码 → 吐 challenge 交调用方
    const cbResult = resultOf(callback.body)
    if (cbResult !== undefined && cbResult !== RESULT_OK) {
      const challenge = challengeFor(cbResult, callback.body)
      if (challenge !== undefined) {
        return {
          ok: true,
          state: { phase: 'challenge', challenge },
          ctx: { ...nextCtx, cookie: callback.cookie, data: { ...nextData, [CTX_COOKIE_KEY]: callback.cookie } },
          intervalMs: 0
        }
      }
      return {
        ok: false,
        error: errorOf(
          'auth',
          'LOGIN_REQUIRED',
          `快手确认后换登录态未成功（result ${cbResult}）：${messageOf(callback.body)}`,
          callback.body
        )
      }
    }

    const credential = assembleCredential(callback.body, callback.cookie, did)
    if (!parseCookie(credential.cookie).passToken && !parseCookie(credential.cookie)[`${KUAISHOU_LOGIN_SID}_st`]) {
      return { ok: false, error: errorOf('auth', 'LOGIN_REQUIRED', '快手确认后未取到 passToken / serviceToken', callback.body) }
    }
    return { ok: true, state: { phase: 'success', credential }, ctx: { ...nextCtx, cookie: credential.cookie }, intervalMs: 0 }
  },

  /**
   * 应答二次验证：真人过完验证页后，重新轮询（引擎 answer 返回后会再 poll 一次）。
   *
   * 快手与小红书一样没有可回填进请求的票据 —— 身份校验通过是服务端按会话解除的，
   * 过完用同一套 cookie 重放即可。这里把验证页写回的新 cookie 并进 ctx，并把 stage
   * 退回 `accept`（引擎下一次 poll 会重打 acceptResult → callback）。
   * @param ctx - challenge 阶段的 ctx
   * @returns 带最新 cookie 的 ctx
   */
  async answer(ctx) {
    const refreshed = new AmagiHeaders(ctx.requestConfig?.headers as HeadersInput).get('cookie')
    const base = strData(ctx, CTX_COOKIE_KEY) ?? ctx.cookie
    const merged = parseCookie(base)
    if (refreshed !== undefined && refreshed !== '') {
      for (const [k, v] of Object.entries(parseCookie(refreshed))) merged[k] = v
    }
    const cookie = serializeCookie(merged)
    return { ok: true, ctx: { ...ctx, cookie, data: { ...ctx.data, [CTX_STAGE]: 'accept' satisfies Stage } } }
  },

  /** 序列化：did + token + signature + stage + cookie */
  serialize(ctx) {
    return JSON.stringify({
      v: 1,
      platform: 'kuaishou',
      cookie: ctx.cookie,
      token: ctx.token,
      qrcode: ctx.qrcode,
      did: strData(ctx, CTX_DID),
      qrLoginToken: strData(ctx, CTX_TOKEN),
      qrLoginSignature: strData(ctx, CTX_SIGNATURE),
      stage: strData(ctx, CTX_STAGE)
    })
  },

  deserialize(blob) {
    const parsed = blob
      ? (JSON.parse(blob) as {
          cookie?: string
          token?: string
          qrcode?: Qrcode
          did?: string
          qrLoginToken?: string
          qrLoginSignature?: string
          stage?: string
        })
      : {}
    const data: Record<string, unknown> = {}
    if (parsed.did) data[CTX_DID] = parsed.did
    if (parsed.qrLoginToken) data[CTX_TOKEN] = parsed.qrLoginToken
    if (parsed.qrLoginSignature) data[CTX_SIGNATURE] = parsed.qrLoginSignature
    if (parsed.stage) data[CTX_STAGE] = parsed.stage
    return {
      platform: 'kuaishou',
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
