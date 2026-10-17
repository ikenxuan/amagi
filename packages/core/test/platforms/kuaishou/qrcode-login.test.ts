import type { RawResponse, RequestSpec } from 'amagi/contracts/request'
import type { SessionCtx } from 'amagi/contracts/session'
import { kuaishouQrcodeStrategy } from 'amagi/platforms/kuaishou/qrcodeLogin'
import { describe, expect, it } from 'vitest'

/**
 * 快手扫码登录策略的契约。
 *
 * 协议逆自 id.kuaishou.com 的 sso.js + 裸 XHR 真机复现（见 qrcodeLogin.ts 模块头）：
 * start → scanResult(long-poll 等扫码) → acceptResult(long-poll 等手机确认) → callback 换登录态，
 * 全程成功判据是响应体 `result === 1`。amagi 立场只中转不绕过：二次验证 / 滑块原样吐 challenge。
 *
 * 这里钉死的是状态机与阶段切换（scan→accept→success）、服务器忙/过期/二次验证分支、
 * 登录态组装、序列化往返。**扫码确认后的真机响应体结构未实测**（见模块头），所以用
 * 契约字段脚本化。
 */

/** 本地 did 形状（web_ + 32 hex），合法 */
const DID = 'web_0123456789abcdef0123456789abcdef'

/** 造一个 RawResponse */
const rawResponse = (body: unknown, status = 200, setCookie: string[] = []): RawResponse => ({
  status,
  statusText: 'OK',
  headers: { get: () => undefined } as unknown as RawResponse['headers'],
  setCookie,
  body,
  durationMs: 1,
  url: ''
})

/** start 成功响应 */
const startOk = () =>
  rawResponse({
    result: 1,
    expireTime: Date.now() + 300000,
    qrUrl: 'http://qr.kuaishou.com/l/ABCDEF',
    qrLoginSignature: 'SIG1234567',
    imageData: 'iVBORw0KGgo=',
    qrLoginToken: 'TOKEN0123456789A'
  })

/** 跑 start 得到带 did/token/signature/stage 的 ctx */
const startedCtx = async (send: (spec: RequestSpec) => Promise<RawResponse>): Promise<SessionCtx> => {
  const ctx: SessionCtx = {
    platform: 'kuaishou',
    cookie: '',
    requestConfig: {},
    send: (spec) => send(spec),
    data: {}
  }
  const res = await kuaishouQrcodeStrategy.start(ctx)
  if (!res.ok) throw new Error('start failed in fixture')
  return res.ctx
}

describe('start：取二维码', () => {
  it('result=1 → 产出二维码，token/signature/did 落进 data', async () => {
    const res = await kuaishouQrcodeStrategy.start({
      platform: 'kuaishou',
      cookie: '',
      requestConfig: {},
      send: async () => startOk(),
      data: {}
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.qrcode.content).toContain('qr.kuaishou.com')
      expect(res.qrcode.token).toBe('TOKEN0123456789A')
      expect(res.ctx.data.ksQrLoginToken).toBe('TOKEN0123456789A')
      expect(res.ctx.data.ksQrLoginSignature).toBe('SIG1234567')
      expect(res.ctx.data.ksStage).toBe('scan')
      expect(typeof res.ctx.data.ksDid).toBe('string')
      expect(res.ctx.data.ksDid).toMatch(/^web_[0-9a-f]{32}$/)
    }
  })

  it('start 两凭证都发（qrLoginToken + signature），用本地 did', async () => {
    const seen: Array<{ url: string; body: string }> = []
    await kuaishouQrcodeStrategy.start({
      platform: 'kuaishou',
      cookie: `did=${DID}`,
      requestConfig: {},
      send: async (spec) => {
        seen.push({ url: spec.url, body: String(spec.body) })
        return startOk()
      },
      data: {}
    })
    expect(seen[0].url).toContain('/rest/c/infra/ks/qr/start')
    expect(seen[0].body).toContain('sid=kuaishou.web.cp.api')
  })

  it('result≠1 → DECODE_FAILED', async () => {
    const res = await kuaishouQrcodeStrategy.start({
      platform: 'kuaishou',
      cookie: '',
      requestConfig: {},
      send: async () => rawResponse({ result: 201796964, error_msg: '请求不合法' }),
      data: {}
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('DECODE_FAILED')
  })
})

describe('poll：scan 阶段（等扫码）', () => {
  it('scan 阶段打 scanResult（无 sid，带 token+signature）', async () => {
    let scanBody = ''
    const ctx = await startedCtx(async () => startOk())
    ctx.send = async (spec) => {
      scanBody = String(spec.body)
      return rawResponse({ result: 707, error_msg: '登录二维码已过期' })
    }
    await kuaishouQrcodeStrategy.poll(ctx)
    expect(scanBody).toContain('qrLoginToken=TOKEN0123456789A')
    expect(scanBody).toContain('qrLoginSignature=SIG1234567')
    expect(scanBody).not.toContain('sid=')
  })

  it('707 且未过期 → pending，继续轮询', async () => {
    const ctx = await startedCtx(async () => startOk())
    ctx.send = async () => rawResponse({ result: 707, error_msg: '登录二维码已过期' })
    const res = await kuaishouQrcodeStrategy.poll(ctx)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.state.phase).toBe('pending')
      expect(res.intervalMs).toBeGreaterThan(0)
    }
  })

  it('707 且二维码已过期 → expired', async () => {
    const ctx = await startedCtx(async () => startOk())
    // 把二维码过期时刻改到过去
    ctx.qrcode = { ...ctx.qrcode!, expiresAt: Date.now() - 1 }
    ctx.send = async () => rawResponse({ result: 707 })
    const res = await kuaishouQrcodeStrategy.poll(ctx)
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.state.phase).toBe('expired')
  })

  it('scan result=1 → scanned，stage 推进到 accept', async () => {
    const ctx = await startedCtx(async () => startOk())
    ctx.send = async () => rawResponse({ result: 1, user: { userId: 1 } })
    const res = await kuaishouQrcodeStrategy.poll(ctx)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.state.phase).toBe('scanned')
      expect(res.ctx.data.ksStage).toBe('accept')
    }
  })

  it('服务器忙（…078 大数）→ PLATFORM_ERROR 失败信封', async () => {
    const ctx = await startedCtx(async () => startOk())
    ctx.send = async () => rawResponse({ result: 313390078, error_msg: '服务器忙，请稍后再试.' })
    const res = await kuaishouQrcodeStrategy.poll(ctx)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('PLATFORM_ERROR')
  })
})

describe('poll：accept 阶段（等确认）→ 换登录态', () => {
  /** 造一个已处于 accept 阶段的 ctx */
  const acceptCtx = async (acceptSend: (spec: RequestSpec) => Promise<RawResponse>): Promise<SessionCtx> => {
    const ctx = await startedCtx(async () => startOk())
    ctx.data = { ...ctx.data, ksStage: 'accept' }
    ctx.send = (spec) => acceptSend(spec)
    return ctx
  }

  it('acceptResult 带 sid；确认后 callback 换出 passToken/serviceToken → success', async () => {
    const urls: string[] = []
    const ctx = await acceptCtx(async (spec) => {
      urls.push(spec.url)
      if (spec.url.includes('/acceptResult')) {
        expect(String(spec.body)).toContain('sid=kuaishou.web.cp.api')
        return rawResponse({ result: 1, qrToken: 'QRTOKEN' })
      }
      // callback
      return rawResponse({ result: 1, passToken: 'PASS_TOKEN', 'kuaishou.web.cp.api_st': 'SERVICE_TOKEN', userId: 123456 })
    })
    const res = await kuaishouQrcodeStrategy.poll(ctx)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.state.phase).toBe('success')
      if (res.state.phase === 'success') {
        expect(res.state.credential.cookie).toContain('passToken=PASS_TOKEN')
        expect(res.state.credential.cookie).toContain('kuaishou.web.cp.api_st=SERVICE_TOKEN')
        expect(res.state.credential.cookie).toContain('userId=123456')
        expect(res.state.credential.cookie).toMatch(/did=web_[0-9a-f]{32}/)
      }
    }
    expect(urls.some((u) => u.includes('/acceptResult'))).toBe(true)
    expect(urls.some((u) => u.includes('/pass/kuaishou/login/qr/callback'))).toBe(true)
  })

  it('callback 落二次验证码区间（400001~410999）→ challenge（captcha，不当失败）', async () => {
    const ctx = await acceptCtx(async (spec) => {
      if (spec.url.includes('/acceptResult')) return rawResponse({ result: 1, qrToken: 'QRTOKEN' })
      return rawResponse({ result: 400001, url: 'https://id.kuaishou.com/verify?needQrcode=1', message: '需要身份验证' })
    })
    const res = await kuaishouQrcodeStrategy.poll(ctx)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.state.phase).toBe('challenge')
      if (res.state.phase === 'challenge') {
        expect(res.state.challenge.kind).toBe('captcha')
        const c = res.state.challenge as { kind: 'captcha'; imageUrl: string; payload: Record<string, unknown> }
        expect(c.imageUrl).toContain('needQrcode=1')
        expect(c.payload.result).toBe(400001)
      }
    }
  })

  it('callback 落滑块码（100110013）→ challenge', async () => {
    const ctx = await acceptCtx(async (spec) => {
      if (spec.url.includes('/acceptResult')) return rawResponse({ result: 1 })
      return rawResponse({ result: 100110013, captchaJsSdk: '//static.yximgs.com/captcha.js', captchaConfig: '{"x":1}' })
    })
    const res = await kuaishouQrcodeStrategy.poll(ctx)
    expect(res.ok).toBe(true)
    if (res.ok && res.state.phase === 'challenge') {
      const c = res.state.challenge as { kind: 'captcha'; payload: Record<string, unknown> }
      expect(c.payload.result).toBe(100110013)
      expect(c.payload.jsSdkUrl).toContain('yximgs.com')
    }
  })

  it('callback 成功但没 passToken/serviceToken → LOGIN_REQUIRED', async () => {
    const ctx = await acceptCtx(async (spec) => {
      if (spec.url.includes('/acceptResult')) return rawResponse({ result: 1 })
      return rawResponse({ result: 1, userId: 1 }) // 缺 token
    })
    const res = await kuaishouQrcodeStrategy.poll(ctx)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('LOGIN_REQUIRED')
  })
})

describe('answer：二次验证通过后并新 cookie + 退回 accept 阶段', () => {
  it('requestConfig.headers.cookie 带回的新 cookie 并进 ctx，stage=accept', async () => {
    const ctx: SessionCtx = {
      platform: 'kuaishou',
      cookie: `did=${DID}`,
      requestConfig: { headers: { cookie: 'passToken=AFTER; userId=9' } },
      send: async () => rawResponse({}),
      data: { ksDid: DID, ksQrLoginToken: 'T', ksQrLoginSignature: 'S', ksStage: 'accept', ksCookie: `did=${DID}` }
    }
    const res = await kuaishouQrcodeStrategy.answer!(ctx, { kind: 'captcha', imageUrl: 'x', payload: {} }, {})
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.ctx.cookie).toContain('passToken=AFTER')
      expect(res.ctx.cookie).toContain(`did=${DID}`)
      expect(res.ctx.data.ksStage).toBe('accept')
    }
  })
})

describe('poll：前置校验', () => {
  it('缺 token/signature/did（没走 start）→ internal 错误', async () => {
    const res = await kuaishouQrcodeStrategy.poll({
      platform: 'kuaishou',
      cookie: '',
      requestConfig: {},
      send: async () => rawResponse({ result: 1 }),
      data: {}
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.kind).toBe('internal')
  })
})

describe('serialize / deserialize 往返', () => {
  it('did / token / signature / stage 往返保真', () => {
    const ctx: SessionCtx = {
      platform: 'kuaishou',
      cookie: `did=${DID}`,
      token: 'TOKEN0123456789A',
      qrcode: { content: 'c', token: 'TOKEN0123456789A', expiresAt: 123, expiresInSec: 180 },
      requestConfig: {},
      send: async () => rawResponse({}),
      data: { ksDid: DID, ksQrLoginToken: 'TOKEN0123456789A', ksQrLoginSignature: 'SIG1234567', ksStage: 'accept' }
    }
    const blob = kuaishouQrcodeStrategy.serialize(ctx)
    const restored = kuaishouQrcodeStrategy.deserialize(blob)
    expect(restored.platform).toBe('kuaishou')
    expect(restored.data.ksDid).toBe(DID)
    expect(restored.data.ksQrLoginToken).toBe('TOKEN0123456789A')
    expect(restored.data.ksStage).toBe('accept')
    expect(() => restored.send({ method: 'GET', url: 'x' })).toThrow()
  })

  it('空 blob → 干净初始 ctx', () => {
    const restored = kuaishouQrcodeStrategy.deserialize('')
    expect(restored.platform).toBe('kuaishou')
    expect(restored.cookie).toBe('')
    expect(restored.data).toEqual({})
  })
})
