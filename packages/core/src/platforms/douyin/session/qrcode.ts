import type { AmagiError } from '../../../contracts/error'
import type { Credential, LoginChallenge, LoginState, Qrcode, QrcodeLoginStrategy, SessionCtx } from '../../../contracts/session'
import { emitLogDebug } from '../../../model/events'
import { Http } from '../passport/client'
import type { Device } from '../passport/device'
import type { MfaRes } from '../passport/lite'
import { checkQr, pickBiz, prepareQr, selectWay, sendCode, sessionOf, validateCode, validatePassword } from '../passport/login'
import type { Challenge, CheckData, QrReady, VerifyWay } from '../passport/login'

/**
 * 抖音扫码登录策略（桌面 IM Passport）。
 *
 * 完全走 imdesktop.douyin.com（aid 339757，jumpbyte a_bogus 签名），产出的是
 * **桌面形态** cookie（含 UIFID 系键），规避 web 端登录态在解析接口上的
 * ArgusSecurityPlugin 403。协议原语（`passport/login.ts`）与状态机
 * 编排分离：本策略只做「取码 / 轮询 / 应答 / 序列化」的适配。
 *
 * 验证中心（verify_center_decision_conf / 二次决策 / captcha）的本地验证页
 * **不移植**：只要服务端判定需要验证中心或图形码，直接进 `risk` 让调用方知晓。
 * 二次验证支持短信（assist_mobile_sms_verify / mobile_sms_verify）与登录密码
 * （pwd_verify，账号未绑定手机时服务端只下发这一路）；上行短信
 * （assist_mobile_up_sms_verify）需要本地页面交互，同样直判 `risk`。
 */

/** 会话数据 key：设备身份（start 写入，轮询恢复） */
const CTX_DEVICE = 'device'
/** 会话数据 key：已选短信验证方式（sendCode 写入，answer 读取） */
const CTX_VERIFY_WAY = 'verify_way'
/** 会话数据 key：MFA 挑战参数（encrypt_uid / biz_params / common_params） */
const CTX_CHALLENGE = 'challenge'
/** 会话数据 key：MFA 通过后轮询 check_qrconnect 要回填的 biz 字段 */
const CTX_EXTRA = 'extra'

/** 单次轮询间隔（桌面 check_qrconnect 不返回 interval，统一 2s） */
const POLL_INTERVAL_MS = 2000
/** 码已过期/风控/成功等终结态的 interval（让引擎立刻停下） */
const FINAL_INTERVAL_MS = 0
/** 服务端没给 expire_time 时的兜底有效秒数 */
const DEFAULT_EXPIRE_SEC = 180
/** 发码成功后建议的重发等待秒数 */
const SEND_RETRY_AFTER_SEC = 60
/** 短信验证码错误的可识别业务码（可重试） */
const WRONG_CODE = [1001, 2001, 3017]

/** 从会话数据恢复设备身份（start 之前没有 → undefined） */
const deviceOf = (ctx: SessionCtx): Device | undefined => ctx.data[CTX_DEVICE] as Device | undefined

/** 造桌面 HTTP 客户端：cookie 与调用方请求配置（代理/超时）随会话走 */
const newHttp = (ctx: SessionCtx): Http => new Http({ cookie: ctx.cookie, requestConfig: ctx.requestConfig })

/** 异常统一包成可重试的网络错误信封 */
const toAmagiError = (error: unknown): AmagiError => ({
  kind: 'network',
  code: 'NETWORK_ERROR',
  message: error instanceof Error ? error.message : String(error),
  retryable: true,
  cause: error
})

/** 验证中心缺页导致的 `risk` 理由；无风控迹象时返回 undefined */
const riskReasonOf = (data: CheckData, decision?: string): string | undefined => {
  if (decision) return `验证中心下发二次决策（${decision}），本地验证页未移植`
  const conf = data.verify_center_decision_conf
  const secondary = data.verify_center_secondary_decision_conf
  const nonEmpty = (value: unknown): boolean => value != null && (typeof value !== 'string' || value !== '')
  if (nonEmpty(conf)) return '验证中心下发安全验证，本地验证页未移植'
  if (nonEmpty(secondary)) return '验证中心二次下发安全验证，本地验证页未移植'
  if (data.error_code === 1105) return '需要完成图片验证（error_code=1105），验证页未移植'
  if (typeof data.captcha === 'string' && data.captcha !== '') return '需要完成图片验证（captcha），验证页未移植'
  return undefined
}

/** MFA 挑战参数（CheckData → lite 接口入参） */
const challengeOf = (data: CheckData): Challenge => ({
  encrypt_uid: data.encrypt_uid,
  biz_params: data.biz_params,
  common_params: data.common_params
})

/** 构造短信 challenge；sendCode 闭包持有 http / challenge / verifyWay，并把方式写进会话数据供 answer 读取 */
const smsChallengeOf = (
  http: Http,
  challenge: Challenge,
  verifyWay: string,
  data: CheckData,
  dataRef: Record<string, unknown>
): LoginChallenge => ({
  kind: 'sms',
  maskedMobile:
    data.verify_ways?.find((w) => w.verify_way === verifyWay && w.mobile)?.mobile ?? data.verify_ways?.find((w) => w.mobile)?.mobile ?? '',
  availableWays: data.verify_ways?.map((w) => w.verify_way ?? '') ?? [],
  sendCode: async () => {
    try {
      const res = await sendCode(http, challenge, verifyWay)
      const errorCode = res.data?.error_code
      if (errorCode) {
        return {
          ok: false,
          error: {
            kind: 'unknown',
            code: 'PLATFORM_ERROR',
            message: String(res.data?.description ?? '发送验证码失败'),
            retryable: true,
            platform: { code: errorCode },
            raw: res.data
          }
        }
      }
      dataRef[CTX_VERIFY_WAY] = verifyWay
      return { ok: true, retryAfterSec: SEND_RETRY_AFTER_SEC }
    } catch (error) {
      return { ok: false, error: toAmagiError(error) }
    }
  }
})

/** 构造登录密码 challenge（pwd_verify，账号未绑定手机时服务端只下发这一路）；answer 直接提交密码 */
const passwordChallengeOf = (data: CheckData): LoginChallenge => {
  const way = data.verify_ways?.find((w) => w.verify_way === 'pwd_verify')
  const rawHint = way?.sms_content ?? way?.description
  return {
    kind: 'password',
    hint: typeof rawHint === 'string' ? rawHint : '',
    availableWays: data.verify_ways?.map((w) => w.verify_way ?? '') ?? []
  }
}

/** 轮询分支：二次验证（account_flow=verify） */
const verifyBranch = (
  http: Http,
  data: CheckData,
  nextCtx: SessionCtx,
  dataRef: Record<string, unknown>
):
  | {
      ok: true
      state: LoginState
      ctx: SessionCtx
      intervalMs: number
    }
  | { ok: false; error: AmagiError } => {
  const way: VerifyWay | undefined = selectWay(data)
  // 上行短信需用安全手机主动发短信，本地页面交互 → 直判 risk
  if (!way?.verify_way || way.verify_way === 'assist_mobile_up_sms_verify') {
    return {
      ok: true,
      state: { phase: 'risk', reason: `二次验证需要本地交互（${way?.verify_way ?? '未知方式'}），已拒绝` },
      ctx: nextCtx,
      intervalMs: FINAL_INTERVAL_MS
    }
  }
  const challenge = challengeOf(data)
  // 挑战参数存进 ctx.data：answer 从同一对象恢复，引擎 `ctx = result.ctx` 保持引用
  dataRef[CTX_CHALLENGE] = challenge
  return {
    ok: true,
    state: {
      phase: 'challenge',
      challenge:
        way.verify_way === 'pwd_verify' ? passwordChallengeOf(data) : smsChallengeOf(http, challenge, way.verify_way, data, dataRef)
    },
    ctx: nextCtx,
    intervalMs: POLL_INTERVAL_MS
  }
}

/** 抖音扫码登录策略（桌面 IM Passport） */
export const douyinQrcodeStrategy: QrcodeLoginStrategy = {
  platform: 'douyin',

  /** 取二维码：设备注册 → ttwid 预热 → get_qrcode */
  async start(ctx) {
    const http = newHttp(ctx)
    let ready: QrReady
    try {
      ready = await prepareQr(http, { warn: (message) => emitLogDebug(`[douyin-qrcode] ${message}`) })
    } catch (error) {
      return { ok: false, error: toAmagiError(error) }
    }

    const nowSec = Math.floor(Date.now() / 1000)
    const expireSeconds = ready.expireSeconds ?? DEFAULT_EXPIRE_SEC
    const qr: Qrcode = {
      // 桌面 get_qrcode 的 base64 图不能直接当二维码内容重新编码（超 QR 容量上限），
      // 取服务端给的 index 短链（请求带 need_short_url=true），缺失时兜底 token
      content: ready.indexUrl ?? ready.token,
      token: ready.token,
      expiresAt: (nowSec + expireSeconds) * 1000,
      expiresInSec: expireSeconds
    }
    const data: Record<string, unknown> = { ...ctx.data, [CTX_DEVICE]: ready.device }
    return {
      ok: true,
      qrcode: qr,
      ctx: { ...ctx, cookie: http.jar.header(), token: qr.token, qrcode: qr, data }
    }
  },

  /** 单次轮询：check_qrconnect → 风控直判 / 短信 challenge / 扫码状态 */
  async poll(ctx) {
    if (!ctx.token) {
      return {
        ok: false,
        error: {
          kind: 'internal',
          code: 'INTERNAL_ERROR',
          message: '抖音会话缺少 token，请先 start()',
          retryable: false
        }
      }
    }

    const http = newHttp(ctx)
    const device = deviceOf(ctx)
    if (device) http.setDevice(device)

    let data: CheckData
    let decision: string | undefined
    try {
      const extra = ctx.data[CTX_EXTRA] as Record<string, string> | undefined
      const result = await checkQr(http, ctx.token, extra)
      data = result.data
      decision = result.decision
    } catch (error) {
      return { ok: false, error: toAmagiError(error) }
    }

    const nextCtx: SessionCtx = { ...ctx, cookie: http.jar.header(), data: { ...ctx.data } }

    // —— 验证中心决策 / 图片验证：本地验证页不移植 → 直判 risk ——
    const riskReason = riskReasonOf(data, decision)
    if (riskReason) {
      return { ok: true, state: { phase: 'risk', reason: riskReason }, ctx: nextCtx, intervalMs: FINAL_INTERVAL_MS }
    }

    // —— 短信二次验证 ——
    if (data.account_flow === 'verify' || (data.verify_ways?.length ?? 0) > 0) {
      const branch = verifyBranch(http, data, nextCtx, nextCtx.data)
      return branch.ok ? branch : { ok: false, error: branch.error }
    }

    // —— 扫码状态 ——
    switch (data.status) {
      case 'new': {
        return { ok: true, state: { phase: 'pending', qrcode: ctx.qrcode! }, ctx: nextCtx, intervalMs: POLL_INTERVAL_MS }
      }
      case 'scanned': {
        return { ok: true, state: { phase: 'scanned', qrcode: ctx.qrcode! }, ctx: nextCtx, intervalMs: POLL_INTERVAL_MS }
      }
      case 'confirmed': {
        try {
          const session = sessionOf(http, data.user_data)
          const credential: Credential = { cookie: session.cookie, raw: data }
          return {
            ok: true,
            state: { phase: 'success', credential },
            ctx: { ...nextCtx, cookie: session.cookie },
            intervalMs: FINAL_INTERVAL_MS
          }
        } catch (error) {
          return { ok: false, error: toAmagiError(error) }
        }
      }
      case 'expired': {
        return { ok: true, state: { phase: 'expired' }, ctx: nextCtx, intervalMs: FINAL_INTERVAL_MS }
      }
      default: {
        const error: AmagiError = {
          kind: 'unknown',
          code: 'PLATFORM_ERROR',
          message: data.description ?? `未知扫码状态：${String(data.status)}`,
          retryable: false,
          raw: data
        }
        return { ok: true, state: { phase: 'failed', error }, ctx: nextCtx, intervalMs: FINAL_INTERVAL_MS }
      }
    }
  },

  /** 应答二次验证：短信验证码走 validate_code，登录密码走 account/verify */
  async answer(ctx, challenge, answer) {
    const http = newHttp(ctx)
    const device = deviceOf(ctx)
    if (device) http.setDevice(device)
    const mfa = ctx.data[CTX_CHALLENGE] as Challenge | undefined
    if (!mfa) {
      return {
        ok: false,
        error: {
          kind: 'validation',
          code: 'PARAM_MISSING',
          message: '缺少 MFA 上下文，请先通过 onChallenge 发起二次验证',
          retryable: false
        }
      }
    }

    /** 校验通过：把 std_verify_* 等 biz 字段带回，下一轮 check_qrconnect 需要它们确认 */
    const carryBiz = (): Record<string, unknown> => {
      const extra = pickBiz(mfa.biz_params)
      const nextData: Record<string, unknown> = { ...ctx.data }
      if (Object.keys(extra).length) nextData[CTX_EXTRA] = extra
      return nextData
    }
    /** 平台的业务错误信封；验证码/密码输错按业务码收进 validation，可重试 */
    const errorOf = (res: MfaRes): AmagiError | undefined => {
      const errorCode = res.data?.error_code
      if (!errorCode) return undefined
      const wrongCode = WRONG_CODE.includes(Number(errorCode))
      return {
        kind: wrongCode ? 'validation' : 'unknown',
        code: wrongCode ? 'PARAM_INVALID' : 'PLATFORM_ERROR',
        message: String(res.data?.description ?? '验证失败'),
        retryable: wrongCode,
        platform: { code: errorCode },
        raw: res.data
      }
    }

    try {
      // —— 登录密码（pwd_verify）：无发送短信步骤，直接提交 ——
      if (challenge.kind === 'password') {
        const password = (answer as { password: string }).password
        if (!password) {
          return {
            ok: false,
            error: {
              kind: 'validation',
              code: 'PARAM_MISSING',
              message: '密码不能为空',
              retryable: false
            }
          }
        }
        const res = await validatePassword(http, mfa, password)
        const error = errorOf(res)
        return error ? { ok: false, error } : { ok: true, ctx: { ...ctx, cookie: http.jar.header(), data: carryBiz() } }
      }

      // —— 短信验证码 ——
      if (challenge.kind !== 'sms') {
        return {
          ok: false,
          error: {
            kind: 'validation',
            code: 'PARAM_INVALID',
            message: `不支持的二次验证方式：${challenge.kind}`,
            retryable: false
          }
        }
      }
      const verifyWay = ctx.data[CTX_VERIFY_WAY] as string | undefined
      if (!verifyWay) {
        return {
          ok: false,
          error: {
            kind: 'validation',
            code: 'PARAM_MISSING',
            message: '缺少验证方式上下文，请先通过 onChallenge 发送验证码',
            retryable: false
          }
        }
      }
      const code = (answer as { code: string }).code
      if (!code) {
        return {
          ok: false,
          error: {
            kind: 'validation',
            code: 'PARAM_MISSING',
            message: '验证码不能为空',
            retryable: false
          }
        }
      }

      const res = await validateCode(http, mfa, verifyWay, code)
      const error = errorOf(res)
      return error ? { ok: false, error } : { ok: true, ctx: { ...ctx, cookie: http.jar.header(), data: carryBiz() } }
    } catch (error) {
      return { ok: false, error: toAmagiError(error) }
    }
  },

  /** 序列化 / 恢复 */
  serialize(ctx) {
    return JSON.stringify({
      v: 1,
      platform: 'douyin',
      cookie: ctx.cookie,
      token: ctx.token,
      qrcode: ctx.qrcode,
      data: ctx.data
    })
  },

  deserialize(blob) {
    const parsed = blob
      ? (JSON.parse(blob) as { v?: number; cookie?: string; token?: string; qrcode?: Qrcode; data?: Record<string, unknown> })
      : {}
    return {
      platform: 'douyin',
      cookie: parsed.cookie ?? '',
      token: parsed.token,
      qrcode: parsed.qrcode,
      send: () => {
        throw new Error('恢复的会话缺少 send，请通过 client 创建')
      },
      data: parsed.data ?? {}
    }
  }
}
