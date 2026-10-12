import type { RawResponse, RequestSpec } from 'amagi/contracts/request'
import type { SessionCtx } from 'amagi/contracts/session'
import { xiaohongshuQrcodeStrategy } from 'amagi/platforms/xiaohongshu/qrcodeLogin'
import { describe, expect, it } from 'vitest'

/**
 * 小红书扫码登录策略的契约。
 *
 * amagi 的立场：扫码登录链的前 90%（游客冷启动）复用 `createXiaohongshuGuestSession`，
 * 本策略只接「create 二维码 → poll 轮询 → status 换正式 web_session」这三步。
 *
 * 这里能钉死的是**状态机与 cookie 落地**：codeStatus 0/1/2/3 → phase 映射、
 * success 时用响应体 `login_info.session` 覆盖 web_session、序列化往返。
 * **冷启动正路径（scripting/webprofile/activate）需要真实服务端数据，不在单测覆盖内**
 * —— 那部分由 `createXiaohongshuGuestSession` 自己的生产验证兜底，本文件只验 poll 之后。
 */

/** 一个带 a1 的合法 cookie（签名器硬要求 a1；值是合成的） */
const COOKIE_WITH_A1 = 'a1=1900000000abcdef0123456789abcdef50000123456; webId=deadbeef; web_session=anon_session'

/** 造一个 RawResponse */
const rawResponse = (body: unknown, status = 200, setCookie: string[] = [], headers: Record<string, string> = {}): RawResponse => {
  const lower: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v
  return {
    status,
    statusText: 'OK',
    headers: { get: (name: string) => lower[name.toLowerCase()] } as unknown as RawResponse['headers'],
    setCookie,
    body,
    durationMs: 1,
    url: ''
  }
}

/**
 * 造一个 poll 用的 ctx：cookie / qr_id / code 已由 start() 落进 data。
 * `send` 由每个用例脚本化。
 */
const pollCtx = (send: (spec: RequestSpec) => Promise<RawResponse>): SessionCtx => ({
  platform: 'xiaohongshu',
  cookie: COOKIE_WITH_A1,
  token: 'QR_ID_1',
  qrcode: { content: 'https://xhslink/qr', token: 'QR_ID_1', expiresAt: Date.now() + 180000, expiresInSec: 180 },
  requestConfig: {},
  send: (spec) => send(spec),
  data: { xhsCookie: COOKIE_WITH_A1, xhsQrId: 'QR_ID_1', xhsCode: 'CODE_1' }
})

describe('poll：codeStatus → phase 映射', () => {
  it('codeStatus=0 → pending', async () => {
    const res = await xiaohongshuQrcodeStrategy.poll(pollCtx(async () => rawResponse({ data: { codeStatus: 0 } })))
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.state.phase).toBe('pending')
  })

  it('codeStatus=1 → scanned', async () => {
    const res = await xiaohongshuQrcodeStrategy.poll(pollCtx(async () => rawResponse({ data: { codeStatus: 1 } })))
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.state.phase).toBe('scanned')
  })

  it('codeStatus=3 → expired', async () => {
    const res = await xiaohongshuQrcodeStrategy.poll(pollCtx(async () => rawResponse({ data: { codeStatus: 3 } })))
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.state.phase).toBe('expired')
  })

  it('未知 codeStatus → failed', async () => {
    const res = await xiaohongshuQrcodeStrategy.poll(pollCtx(async () => rawResponse({ data: { codeStatus: 99 } })))
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.state.phase).toBe('failed')
  })

  it('响应缺 codeStatus → 解析失败信封', async () => {
    const res = await xiaohongshuQrcodeStrategy.poll(pollCtx(async () => rawResponse({ data: {} })))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('DECODE_FAILED')
  })
})

describe('poll：codeStatus=2 换正式 web_session', () => {
  it('第二跳 GET status，用 login_info.session 覆盖 web_session', async () => {
    const seen: string[] = []
    const res = await xiaohongshuQrcodeStrategy.poll(
      pollCtx(async (spec) => {
        seen.push(spec.url)
        if (spec.url.includes('/api/qrcode/userinfo')) return rawResponse({ data: { codeStatus: 2 } })
        if (spec.url.includes('/api/sns/web/v1/login/qrcode/status')) {
          return rawResponse({ data: { code_status: 2, login_info: { session: 'REAL_WEB_SESSION' } } })
        }
        throw new Error(`unexpected url ${spec.url}`)
      })
    )
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.state.phase).toBe('success')
      if (res.state.phase === 'success') {
        expect(res.state.credential.cookie).toContain('web_session=REAL_WEB_SESSION')
        // 匿名 session 被覆盖，不残留
        expect(res.state.credential.cookie).not.toContain('web_session=anon_session')
      }
    }
    // 两跳：userinfo 轮询 + qrcode/status 换票
    expect(seen.some((u) => u.includes('/api/qrcode/userinfo'))).toBe(true)
    expect(seen.some((u) => u.includes('/api/sns/web/v1/login/qrcode/status'))).toBe(true)
  })

  it('status 跳没给 session 且 cookie 里也无 → LOGIN_REQUIRED', async () => {
    // 用一份不含 web_session 的 cookie，确保覆盖后仍为空
    const ctx: SessionCtx = {
      ...pollCtx(async () => rawResponse({ data: {} })),
      cookie: 'a1=1900000000abcdef0123456789abcdef50000123456; webId=deadbeef',
      data: { xhsCookie: 'a1=1900000000abcdef0123456789abcdef50000123456; webId=deadbeef', xhsQrId: 'QR_ID_1', xhsCode: 'CODE_1' }
    }
    ctx.send = async (spec) => {
      if ((spec as RequestSpec).url.includes('/api/qrcode/userinfo')) return rawResponse({ data: { codeStatus: 2 } })
      return rawResponse({ data: { code_status: 2, login_info: {} } }) // 无 session
    }
    const res = await xiaohongshuQrcodeStrategy.poll(ctx)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('LOGIN_REQUIRED')
  })
})

describe('poll：codeStatus=2 但风控二次验证（461/471）', () => {
  /** userinfo 返回 2，status 用一个 HTTP 状态 + 验证头脚本化 */
  const challengeCtx = (statusCode: number, verifyHeaders: Record<string, string>): SessionCtx => {
    const ctx = pollCtx(async () => rawResponse({ data: { codeStatus: 2 } }))
    ctx.send = async (spec) => {
      if ((spec as RequestSpec).url.includes('/api/qrcode/userinfo')) return rawResponse({ data: { codeStatus: 2 } })
      return rawResponse({ code: 0, success: true, data: {} }, statusCode, [], verifyHeaders)
    }
    return ctx
  }

  it('status 返回 471（antiSpam）+ 验证头 → challenge（captcha，不当失败）', async () => {
    const res = await xiaohongshuQrcodeStrategy.poll(challengeCtx(471, { verifyuuid: 'UUID_471', verifytype: '102' }))
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.state.phase).toBe('challenge')
      if (res.state.phase === 'challenge') {
        expect(res.state.challenge.kind).toBe('captcha')
        const c = res.state.challenge as { kind: 'captcha'; imageUrl: string; payload: Record<string, unknown> }
        expect(c.imageUrl).toContain('verifyUuid=UUID_471')
        expect(c.payload.verifyUuid).toBe('UUID_471')
        expect(c.payload.verifyType).toBe('102')
        expect(c.payload.result).toBe(471)
      }
    }
  })

  it('status 返回 461（antiSpider）+ 验证头 → challenge', async () => {
    const res = await xiaohongshuQrcodeStrategy.poll(challengeCtx(461, { verifyuuid: 'UUID_461', verifytype: '301' }))
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.state.phase).toBe('challenge')
      if (res.state.phase === 'challenge') {
        const c = res.state.challenge as { kind: 'captcha'; payload: Record<string, unknown> }
        expect(c.payload.verifyType).toBe('301')
        expect(c.payload.result).toBe(461)
      }
    }
  })

  it('status 返回 471 但响应头无验证票据 → risk / CAPTCHA_REQUIRED（被拦，不回落成功也不编造 challenge）', async () => {
    const res = await xiaohongshuQrcodeStrategy.poll(challengeCtx(471, {}))
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.kind).toBe('risk')
      expect(res.error.code).toBe('CAPTCHA_REQUIRED')
    }
  })
})

describe('answer：二次验证通过后把最新 cookie 并进会话', () => {
  it('requestConfig.headers.cookie 带回的新 cookie 合并进 ctx', async () => {
    const ctx: SessionCtx = {
      platform: 'xiaohongshu',
      cookie: COOKIE_WITH_A1,
      token: 'QR_ID_1',
      requestConfig: { headers: { cookie: 'web_session=AFTER_VERIFY; gid=NEWGID' } },
      send: async () => rawResponse({ data: {} }),
      data: { xhsCookie: COOKIE_WITH_A1, xhsQrId: 'QR_ID_1', xhsCode: 'CODE_1' }
    }
    const res = await xiaohongshuQrcodeStrategy.answer!(ctx, { kind: 'captcha', imageUrl: 'x', payload: {} }, {})
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.ctx.cookie).toContain('web_session=AFTER_VERIFY')
      expect(res.ctx.cookie).toContain('gid=NEWGID')
      expect(res.ctx.cookie).toContain('a1=') // 原 cookie 保留
    }
  })

  it('没有新 cookie 时原样返回（引擎随后自行重放 status）', async () => {
    const ctx = pollCtx(async () => rawResponse({ data: {} }))
    const res = await xiaohongshuQrcodeStrategy.answer!(ctx, { kind: 'captcha', imageUrl: 'x', payload: {} }, {})
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.ctx.cookie).toBe(COOKIE_WITH_A1)
  })
})

describe('poll：前置校验', () => {
  it('缺 qr_id / code（没走 start）→ internal 错误', async () => {
    const ctx: SessionCtx = {
      platform: 'xiaohongshu',
      cookie: COOKIE_WITH_A1,
      requestConfig: {},
      send: async () => rawResponse({ data: { codeStatus: 0 } }),
      data: {} // 没有 xhsQrId / xhsCode
    }
    const res = await xiaohongshuQrcodeStrategy.poll(ctx)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.kind).toBe('internal')
  })
})

describe('serialize / deserialize 往返', () => {
  it('cookie / qr_id / code / webSsk 往返保真', () => {
    const ctx: SessionCtx = {
      platform: 'xiaohongshu',
      cookie: COOKIE_WITH_A1,
      token: 'QR_ID_1',
      qrcode: { content: 'c', token: 'QR_ID_1', expiresAt: 123, expiresInSec: 180 },
      requestConfig: {},
      send: async () => rawResponse({}),
      data: { xhsCookie: COOKIE_WITH_A1, xhsQrId: 'QR_ID_1', xhsCode: 'CODE_1', xhsWebSsk: { 'xhs-pc-web': 'a'.repeat(44) } }
    }
    const blob = xiaohongshuQrcodeStrategy.serialize(ctx)
    const restored = xiaohongshuQrcodeStrategy.deserialize(blob)
    expect(restored.platform).toBe('xiaohongshu')
    expect(restored.data.xhsQrId).toBe('QR_ID_1')
    expect(restored.data.xhsCode).toBe('CODE_1')
    expect(restored.data.xhsCookie).toContain('a1=')
    expect((restored.data.xhsWebSsk as Record<string, string>)['xhs-pc-web']).toBe('a'.repeat(44))
    // 恢复的会话 send 必须抛错（提示通过 client 创建）
    expect(() => restored.send({ method: 'GET', url: 'x' })).toThrow()
  })

  it('空 blob → 干净初始 ctx', () => {
    const restored = xiaohongshuQrcodeStrategy.deserialize('')
    expect(restored.platform).toBe('xiaohongshu')
    expect(restored.cookie).toBe('')
    expect(restored.data).toEqual({})
  })
})
