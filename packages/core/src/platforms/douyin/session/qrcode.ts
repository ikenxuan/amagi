import type { AmagiError } from '../../../contracts/error'
import type { Credential, LoginChallenge, LoginState, Qrcode, QrcodeLoginStrategy, SessionCtx } from '../../../contracts/session'
import { DouyinPassportClient } from '../../../platform/douyin/passport/client'
import {
  parsePollResult,
  parseQrcode,
  parseSendCodeResult,
  parseValidateCodeResult
} from '../../../platform/douyin/passport/parser'
import type { VerifyContext } from '../../../platform/douyin/passport/types'
import { randomHex, xor5Hex } from '../../../platform/douyin/passport/params'
import { buildVerifyBody, isSmsCodeVerifyWay, resolveVerifyWay } from '../../../platform/douyin/passport/verify'

/**
 * 抖音扫码登录策略。
 *
 * 05-session-and-polling.md 的落地：**复用 v6 的 `DouyinPassportClient`
 * （1,593 行原样保留，它是正确的），外面套一层适配**。
 *
 * v6 的 4 个 passport 方法（requestPassportQrcode / checkPassportQrcode /
 * sendPassportVerifyCode / validatePassportVerifyCode）在这里被拆成
 * 策略的 start / poll / answer，且：
 * - `expire_time`（绝对秒）正确转 `expiresAt`（绝对毫秒）。
 * - challenge 映射：`verify` → `SmsChallenge`，`availableWays` /
 *   `maskedMobile` 正确填充；`biz_trace_id` / `verify_way` 收进
 *   `SessionCtx.data` 由引擎维护（v6 要求调用方在发码与验码之间原样传回，
 *   这个隐式契约由引擎接管）。
 */

/** passport 发码 / 验码的会话字段 key（存进 ctx.data） */
const CTX_BIZ_TRACE_ID = 'biz_trace_id'
const CTX_VERIFY_WAY = 'verify_way'
const CTX_VERIFY = 'verify'

/** 从 ctx.data 里取 verify 上下文（没有则 undefined） */
const verifyOf = (ctx: SessionCtx): VerifyContext | undefined => ctx.data[CTX_VERIFY] as VerifyContext | undefined

/**
 * 构造 SmsChallenge（v6 verify 上下文的映射）。
 *
 * `maskedMobile` 取**能收码的那一路**的手机号，不是第一个带 mobile 的 —— 被判定
 * 需要辅助验证的账号会同时给出上行短信等其它方式，取错会把不相干的号码显示给用户。
 * @param verify - 轮询下发的验证上下文
 * @param sendCode - 发码实现，由 poll 注入（闭包持有 client 与 ctx.data）
 * @returns 短信 challenge
 */
const smsChallengeOf = (verify: VerifyContext, sendCode: () => Promise<{ ok: true; retryAfterSec: number } | { ok: false; error: AmagiError }>): LoginChallenge => ({
  kind: 'sms',
  maskedMobile:
    verify.verifyWays.find((w) => isSmsCodeVerifyWay(w.verifyWay) && w.mobile)?.mobile ??
    verify.verifyWays.find((w) => w.mobile)?.mobile ??
    '',
  availableWays: verify.verifyWays.map((w) => w.verifyWay),
  sendCode
})

/** 抖音扫码登录策略 */
export const douyinQrcodeStrategy: QrcodeLoginStrategy = {
  platform: 'douyin',

  /** 取二维码：bootstrap 指纹 → get_qrcode，token 是服务端令牌 */
  async start(ctx) {
    const client = new DouyinPassportClient(ctx.cookie, ctx.requestConfig)
    await client.bootstrap()

    const response = await client.request('/passport/web/get_qrcode/', {
      next: NEXT_URL,
      need_short_url: 'true',
      need_logo: 'false',
      is_new_login: '1'
    })

    const qrcode = parseQrcode(response.body)
    if (!qrcode) {
      const error: AmagiError = {
        kind: 'parse',
        code: 'DECODE_FAILED',
        message: response.body.message || '获取二维码失败',
        retryable: false,
        raw: response.body
      }
      return { ok: false, error }
    }

    const nowSec = Math.floor(Date.now() / 1000)
    const qr: Qrcode = {
      content: qrcode.content,
      token: qrcode.token,
      // expire_time 是绝对秒 → 转绝对毫秒（05 的字段命名规约）
      expiresAt: qrcode.expireTime * 1000,
      expiresInSec: Math.max(0, qrcode.expireTime - nowSec)
    }
    return {
      ok: true,
      qrcode: qr,
      ctx: { ...ctx, cookie: response.cookie, token: qrcode.token, qrcode: qr, data: { ...ctx.data } }
    }
  },

  /** 单次轮询：parsePollResult → LoginState */
  async poll(ctx) {
    if (!ctx.token) {
      const error: AmagiError = {
        kind: 'internal',
        code: 'INTERNAL_ERROR',
        message: '抖音会话缺少 token，请先 start()',
        retryable: false
      }
      return { ok: false, error }
    }

    const client = new DouyinPassportClient(ctx.cookie, ctx.requestConfig)
    const response = await client.request('/passport/web/check_qrconnect/', {
      next: NEXT_URL,
      need_logo: 'false',
      is_frontier: 'true',
      token: ctx.token,
      is_new_login: '1',
      need_short_url: 'true'
    })

    const result = parsePollResult(response.body)
    const nextCtx: SessionCtx = { ...ctx, cookie: response.cookie, data: { ...ctx.data } }
    const intervalMs = result.interval

    switch (result.status) {
      case 'new': {
        return { ok: true, state: { phase: 'pending', qrcode: ctx.qrcode! }, ctx: nextCtx, intervalMs }
      }
      case 'scanned': {
        return { ok: true, state: { phase: 'scanned', qrcode: ctx.qrcode! }, ctx: nextCtx, intervalMs }
      }
      case 'confirmed': {
        // 跟随 SSO 跳转领取登录凭证（v6 的 checkPassportQrcode 行为）
        if (result.redirectUrl) {
          await client.followSsoRedirect(result.redirectUrl)
        }
        const cookie = client.cookies.toString()
        const credential: Credential = { cookie, raw: response.body }
        return {
          ok: true,
          state: { phase: 'success', credential },
          ctx: { ...ctx, cookie, data: { ...ctx.data } },
          intervalMs: 0
        }
      }
      case 'verify': {
        const verify = result.verify
        // 发码时用的 biz_trace_id 与 verify_way 必须原样带到验码请求。sendCode 是
        // **调用方**在 onChallenge 里触发的，引擎看不到它的返回值 —— 所以这里先把
        // data 对象定下来，既交给闭包也交给返回的 ctx，闭包写进去、answer 从同一个
        // 对象里读。引擎的 `ctx = result.ctx` 保持对象引用，这条链才成立。
        const data: Record<string, unknown> = { ...nextCtx.data, [CTX_VERIFY]: verify }
        const challenge: LoginChallenge = smsChallengeOf(verify, () => sendCode(client, verify, data))
        const state: LoginState = { phase: 'challenge', challenge }
        return {
          ok: true,
          state,
          ctx: { ...nextCtx, data },
          intervalMs
        }
      }
      case 'risk': {
        return { ok: true, state: { phase: 'risk', reason: result.message }, ctx: nextCtx, intervalMs }
      }
      case 'expired': {
        return { ok: true, state: { phase: 'expired' }, ctx: nextCtx, intervalMs }
      }
      case 'busy': {
        // 限频：interval 已由 parser 加倍，原样返回让引擎退避（05：busy 状态时加倍）
        return { ok: true, state: { phase: 'pending', qrcode: ctx.qrcode! }, ctx: nextCtx, intervalMs: intervalMs * BUSY_BACKOFF }
      }
      case 'unknown': {
        const error: AmagiError = {
          kind: 'unknown',
          code: 'PLATFORM_ERROR',
          message: result.message,
          retryable: false,
          raw: response.body
        }
        return { ok: true, state: { phase: 'failed', error }, ctx: nextCtx, intervalMs }
      }
    }
  },

  /** 应答 challenge：发码与验码（biz_trace_id / verify_way 由引擎维护） */
  async answer(ctx, challenge, answer) {
    if (challenge.kind !== 'sms' || !verifyOf(ctx)) {
      const error: AmagiError = {
        kind: 'validation',
        code: 'PARAM_INVALID',
        message: '抖音只支持短信验证码应答',
        retryable: false
      }
      return { ok: false, error }
    }

    const verify = verifyOf(ctx)!
    const code = (answer as { code: string }).code
    const client = new DouyinPassportClient(ctx.cookie, ctx.requestConfig)

    // 验码：biz_trace_id 与 verify_way 必须与发码时一致，由 sendCode 写进 ctx.data。
    // 没走过 sendCode 才退到自算 —— 那种情况下服务端本来也不会有待验的码
    const bizTraceId = (ctx.data[CTX_BIZ_TRACE_ID] as string | undefined) ?? randomHex(8)
    const verifyWay = (ctx.data[CTX_VERIFY_WAY] as string | undefined) ?? resolveVerifyWay(verify)

    const response = await client.liteRequest(
      '/passport/web/validate_code/',
      // mix_mode=1 下验证码需按逐字节异或 5 转十六进制后提交
      buildVerifyBody(verify, verifyWay, { code: xor5Hex(code) }),
      bizTraceId
    )

    const result = parseValidateCodeResult(response.body)
    if (!result.ok) {
      const error: AmagiError = {
        kind: result.wrongCode ? 'validation' : 'unknown',
        code: result.wrongCode ? 'PARAM_INVALID' : 'PLATFORM_ERROR',
        message: result.message,
        retryable: result.wrongCode, // 填错可以重试
        raw: response.body
      }
      return { ok: false, error }
    }

    return {
      ok: true,
      ctx: { ...ctx, cookie: response.cookie, data: { ...ctx.data } }
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
/**
 * 发码（`SmsChallenge.sendCode` 的实现，闭包持有 client、verify 与 ctx.data）。
 * @param client - 持有会话 cookie 的 passport 客户端
 * @param verify - 轮询下发的验证上下文
 * @param data - 会话的 `ctx.data`，发码成功后把 biz_trace_id / verify_way 写回去
 * @returns 重发等待秒数，或失败原因
 */
const sendCode = async (
  client: DouyinPassportClient,
  verify: VerifyContext,
  data: Record<string, unknown>
): Promise<{ ok: true; retryAfterSec: number } | { ok: false; error: AmagiError }> => {
  const bizTraceId = randomHex(8)
  const verifyWay = resolveVerifyWay(verify)
  const response = await client.liteRequest(
    '/passport/web/send_code/',
    buildVerifyBody(verify, verifyWay, { is6Digits: '1' }),
    bizTraceId
  )
  const result = parseSendCodeResult(response.body)
  if (!result.ok) {
    return {
      ok: false,
      error: {
        kind: 'unknown',
        code: 'PLATFORM_ERROR',
        message: result.message,
        retryable: true,
        raw: response.body
      }
    }
  }
  // answer 会读这两个：验码请求的 biz_trace_id 必须与发码时同一个，
  // verify_way 也必须是发码时那一路（辅助验证账号取值不同）
  data[CTX_BIZ_TRACE_ID] = bizTraceId
  data[CTX_VERIFY_WAY] = verifyWay
  return { ok: true, retryAfterSec: result.retryAfter }
}

/** SSO 跳转目标（v6 的 NEXT_URL 常量，保持原样） */
const NEXT_URL = 'https://www.douyin.com/'

/** busy 退避倍率（与 parser 的 BUSY_BACKOFF 一致） */
const BUSY_BACKOFF = 2
