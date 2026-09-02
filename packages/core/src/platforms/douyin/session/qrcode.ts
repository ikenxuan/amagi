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
import { randomHex } from '../../../platform/douyin/passport/params'

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

/** 构造 SmsChallenge（v6 verify 上下文的映射） */
const smsChallengeOf = (verify: VerifyContext, sendCode: () => Promise<{ ok: true; retryAfterSec: number } | { ok: false; error: AmagiError }>): LoginChallenge => ({
  kind: 'sms',
  maskedMobile: verify.verifyWays.find((w) => w.mobile)?.mobile ?? '',
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
        const challenge: LoginChallenge = smsChallengeOf(verify, () => sendCode(client, verify))
        const state: LoginState = { phase: 'challenge', challenge }
        return {
          ok: true,
          state,
          ctx: { ...nextCtx, data: { ...nextCtx.data, [CTX_VERIFY]: verify } },
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

    // 验码：biz_trace_id 必须与发码时一致（引擎在 ctx.data 里维护）
    const bizTraceId = (ctx.data[CTX_BIZ_TRACE_ID] as string | undefined) ?? randomHex(8)
    const verifyWay = (ctx.data[CTX_VERIFY_WAY] as string | undefined) ?? verify.verifyWays[0]?.verifyWay

    const response = await client.liteRequest(
      '/passport/web/validate_code/',
      buildValidateBody(verify, verifyWay, code),
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

/** 发码（SmsChallenge.sendCode 的实现，闭包持有 client 与 verify） */
const sendCode = async (
  client: DouyinPassportClient,
  verify: VerifyContext
): Promise<{ ok: true; retryAfterSec: number } | { ok: false; error: AmagiError }> => {
  const bizTraceId = randomHex(8)
  const verifyWay = verify.verifyWays[0]?.verifyWay
  const response = await client.liteRequest(
    '/passport/web/send_code/',
    buildSendCodeBody(verify, verifyWay),
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
  return { ok: true, retryAfterSec: result.retryAfter }
}

/** SSO 跳转目标（v6 的 NEXT_URL 常量，保持原样） */
const NEXT_URL = 'https://www.douyin.com/'

/** busy 退避倍率（与 parser 的 BUSY_BACKOFF 一致） */
const BUSY_BACKOFF = 2

/** 发码 body（v6 buildVerifyBody 的最小形态） */
const buildSendCodeBody = (verify: VerifyContext, verifyWay?: string): Record<string, string> => ({
  mix_mode: '1',
  mobile: verify.verifyWays.find((w) => w.verifyWay === verifyWay)?.mobile ?? '',
  verify_way: verifyWay ?? '',
  encrypt_uid: verify.encryptUid,
  verify_ticket: verify.verifyTicket,
  ...verify.stdParams,
  copywriting_key: verify.copywritingKey,
  ies_safety_diversion_tag: verify.diversionTag,
  new_verify_flow: verify.newVerifyFlow
})

/** 验码 body（v6 buildVerifyBody + xor5Hex 的最小形态） */
const buildValidateBody = (verify: VerifyContext, verifyWay: string | undefined, code: string): Record<string, string> => ({
  mix_mode: '1',
  mobile: verify.verifyWays.find((w) => w.verifyWay === verifyWay)?.mobile ?? '',
  verify_way: verifyWay ?? '',
  encrypt_uid: verify.encryptUid,
  verify_ticket: verify.verifyTicket,
  ...verify.stdParams,
  copywriting_key: verify.copywritingKey,
  ies_safety_diversion_tag: verify.diversionTag,
  new_verify_flow: verify.newVerifyFlow,
  code: xor5Hex(code)
})

/** 逐字节异或 5 转十六进制（v6 的 xor5Hex，mix_mode=1 下验证码需这样提交） */
const xor5Hex = (code: string): string =>
  [...code].map((ch) => (ch.charCodeAt(0) ^ 5).toString(16).padStart(2, '0')).join('')
