import type { AmagiError } from '../../../contracts/error'
import type { Credential, LoginState, Qrcode, QrcodeLoginStrategy } from '../../../contracts/session'
import { bilibiliApiUrls } from '../api'

/**
 * B站扫码登录策略。
 *
 * 05-session-and-polling.md 的落地：平台码 → phase 的映射收在这里，
 * `mergeSetCookie` 收进策略内部 —— 调用方拿到统一的 `Credential`，
 * 不再需要自己抠 `Set-Cookie`（v6 的 `qrcodeStatus` 把 headers 透出去）。
 */

/** 平台码 → phase 映射（v6 语义逐字保留） */
export const bilibiliPhaseOf = (code: number): LoginState['phase'] => {
  switch (code) {
    case 86101:
      return 'pending'
    case 86090:
      return 'scanned'
    case 86038:
      return 'expired'
    case 86083:
      return 'rejected'
    case 0:
      return 'success'
    default:
      return 'failed'
  }
}

/** 把响应头的 Set-Cookie 合并成完整 cookie 串（v6 让调用方自己做的那件事） */
export const mergeSetCookie = (setCookie: string[] | undefined, current: string): string => {
  if (!setCookie || setCookie.length === 0) return current
  const merged = new Map<string, string>()
  for (const pair of current.split(';')) {
    const [key, value] = pair.trim().split('=')
    if (key) merged.set(key.trim(), value ?? '')
  }
  for (const line of setCookie) {
    const [pair] = line.split(';')
    const [key, value] = pair.trim().split('=')
    if (key) merged.set(key.trim(), value ?? '')
  }
  return [...merged.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

/** B站扫码登录策略 */
export const bilibiliQrcodeStrategy: QrcodeLoginStrategy = {
  platform: 'bilibili',

  /** 取二维码：打 getLoginQrcode 接口，token 是 qrcode_key */
  async start(ctx) {
    const res = await ctx.send({ method: 'GET', url: bilibiliApiUrls.getLoginQrcode() })
    const body = res.body as { code?: number; data?: { url?: string; qrcode_key?: string } }
    const url = body.data?.url
    const token = body.data?.qrcode_key
    if (!url || !token) {
      const error: AmagiError = {
        kind: 'parse',
        code: 'DECODE_FAILED',
        message: 'B站二维码获取失败：响应缺少 url 或 qrcode_key',
        retryable: false,
        raw: res.body
      }
      return { ok: false, error }
    }

    const qrcode: Qrcode = {
      content: url,
      token,
      // B站接口没给 expire_time，取码后 3 分钟过期（与服务端行为一致）
      expiresAt: Date.now() + 3 * 60 * 1000,
      expiresInSec: 180
    }
    return { ok: true, qrcode, ctx: { ...ctx, token, qrcode, data: { ...ctx.data } } }
  },

  /** 单次轮询：平台码 → phase */
  async poll(ctx) {
    if (!ctx.token) {
      const error: AmagiError = {
        kind: 'internal',
        code: 'INTERNAL_ERROR',
        message: 'B站会话缺少 qrcode_key，请先 start()',
        retryable: false
      }
      return { ok: false, error }
    }

    const res = await ctx.send({ method: 'GET', url: bilibiliApiUrls.getQrcodeStatus({ qrcode_key: ctx.token }) })
    const body = res.body as { code?: number; data?: { code?: number; message?: string; [key: string]: unknown } }
    const code = body.data?.code ?? body.code

    if (code === undefined) {
      const error: AmagiError = {
        kind: 'parse',
        code: 'DECODE_FAILED',
        message: 'B站二维码状态解析失败：响应缺少 code',
        retryable: false,
        raw: res.body
      }
      return { ok: false, error }
    }

    const phase = bilibiliPhaseOf(code)

    if (phase === 'success') {
      const credential: Credential = {
        cookie: mergeSetCookie(res.setCookie, ctx.cookie),
        raw: res.body
      }
      const state: LoginState = { phase: 'success', credential }
      return { ok: true, state, ctx, intervalMs: 0 }
    }

    if (phase === 'failed') {
      const error: AmagiError = {
        kind: 'unknown',
        code: 'PLATFORM_ERROR',
        message: body.data?.message ?? `未知二维码状态码 ${code}`,
        retryable: false,
        raw: res.body
      }
      const state: LoginState = { phase: 'failed', error }
      return { ok: true, state, ctx, intervalMs: 0 }
    }

    // 到这里只剩 pending / scanned / expired / rejected（success / failed 已提前返回）
    let state: LoginState
    switch (phase) {
      case 'pending':
      case 'scanned':
        state = { phase, qrcode: ctx.qrcode! }
        break
      case 'expired':
      case 'rejected':
        state = { phase }
        break
      default:
        // bilibiliPhaseOf 只产出这 6 种，success / failed 已返回，到不了这里
        state = { phase: 'expired' }
    }

    return { ok: true, state, ctx, intervalMs: 2000 }
  },

  /** 序列化 / 恢复 */
  serialize(ctx) {
    return JSON.stringify({
      v: 1,
      platform: 'bilibili',
      cookie: ctx.cookie,
      token: ctx.token,
      qrcode: ctx.qrcode
    })
  },

  deserialize(blob) {
    const parsed = blob ? (JSON.parse(blob) as { v?: number; cookie?: string; token?: string; qrcode?: Qrcode }) : {}
    return {
      platform: 'bilibili',
      cookie: parsed.cookie ?? '',
      token: parsed.token,
      qrcode: parsed.qrcode,
      send: () => {
        throw new Error('恢复的会话缺少 send，请通过 client 创建')
      },
      data: {}
    }
  }
}
