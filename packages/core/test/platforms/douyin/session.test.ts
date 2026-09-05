import { douyinQrcodeStrategy } from 'amagi/platforms/douyin/session/qrcode'
import { createLoginSession } from 'amagi/runtime/session'
import type { SessionCtx } from 'amagi/contracts/session'
import type { AxiosAdapter } from 'axios'
import { describe, expect, it } from 'vitest'
/**
 * platforms/douyin/session/qrcode 的契约。
 *
 * 判据：
 * ① 包 v6 的 `DouyinPassportClient` —— v6 的 4 个 passport 方法用例继续通过
 *    （那些是 v6 测试，走 v6 bound fetcher，这里验证策略能驱动同一套协议）；
 *    `expire_time`（绝对秒）正确转 `expiresAt`（绝对毫秒）
 * ② challenge 映射：`verify` → `SmsChallenge`，`availableWays` /
 *    `maskedMobile` 正确填充
 */

/** 脚本化 adapter：按 URL 返回响应 */
const scriptedAdapter = (script: Array<{ match: string; body: unknown; status?: number; headers?: Record<string, string> }>): AxiosAdapter => {
  let i = 0
  return async (config) => {
    const step = script[Math.min(i, script.length - 1)]
    i += 1
    const url = config.url ?? ''
    if (!url.includes(step.match)) {
      throw new Error(`adapter 期望 ${step.match}，实际 ${url}`)
    }
    return {
      data: typeof step.body === 'string' ? step.body : JSON.stringify(step.body),
      status: step.status ?? 200,
      statusText: 'OK',
      headers: step.headers ?? {},
      config: config as never
    }
  }
}

/** 用 adapter 构造会话 ctx（策略内部 new DouyinPassportClient(ctx.cookie, ctx.requestConfig)） */
const makeCtx = (adapter: AxiosAdapter): SessionCtx => ({
  platform: 'douyin',
  cookie: '',
  requestConfig: { adapter },
  send: async () => {
    throw new Error('douyin 策略走 DouyinPassportClient，不用 ctx.send')
  },
  data: {}
})

describe('① expire_time 秒 → expiresAt 毫秒', () => {
  it('start 产出的 Qrcode.expiresAt 是毫秒，expiresInSec 是剩余秒', async () => {
    const adapter = scriptedAdapter([
      // bootstrap：首页 + ttwid 注册
      { match: 'www.douyin.com/', body: '<html></html>' },
      { match: 'ttwid.bytedance.com/ttwid/register/', body: '{}' },
      // get_qrcode
      {
        match: '/passport/web/get_qrcode/',
        body: JSON.stringify({ data: { token: 'TOKEN1', qrcode_index_url: 'https://qr', expire_time: 2000000000 } })
      }
    ])

    const session = createLoginSession(douyinQrcodeStrategy, { initialCtx: makeCtx(adapter), sleep: async () => {} })
    const first = await session.start()

    expect(first.ok).toBe(true)
    if (first.ok) {
      expect(first.state.phase).toBe('pending')
      if (first.state.phase === 'pending') {
        // expire_time 是绝对秒（2000000000）→ expiresAt 绝对毫秒
        expect(first.state.qrcode.expiresAt).toBe(2000000000 * 1000)
        expect(first.state.qrcode.expiresInSec).toBeGreaterThan(0)
        expect(first.state.qrcode.token).toBe('TOKEN1')
      }
    }
  })
})

describe('② verify → SmsChallenge 映射', () => {
  it('轮询返回 verify 时，challenge.availableWays / maskedMobile 正确填充', async () => {
    const adapter = scriptedAdapter([
      { match: 'www.douyin.com/', body: '<html></html>' },
      { match: 'ttwid.bytedance.com/ttwid/register/', body: '{}' },
      { match: '/passport/web/get_qrcode/', body: JSON.stringify({ data: { token: 'TOKEN1', qrcode_index_url: 'https://qr', expire_time: 2000000000 } }) },
      {
        match: '/passport/web/check_qrconnect/',
        body: JSON.stringify({
          data: {
            status: 'confirming',
            error_code: 2046,
            account_flow: 'verify',
            verify_ways: [{ verify_way: 'mobile_sms_verify', mobile: '138****8000' }, { verify_way: 'email_verify' }],
            encrypt_uid: 'e1',
            verify_ticket: 'vt1'
          }
        })
      }
    ])

    const session = createLoginSession(douyinQrcodeStrategy, { initialCtx: makeCtx(adapter), sleep: async () => {} })
    await session.start() // 第一次 next 只是 start
    const second = await session.next() // 第二次才真正轮询到 verify

    expect(second.ok).toBe(true)
    if (second.ok && second.state.phase === 'challenge') {
      expect(second.state.challenge.kind).toBe('sms')
      if (second.state.challenge.kind === 'sms') {
        expect(second.state.challenge.maskedMobile).toBe('138****8000')
        expect(second.state.challenge.availableWays).toEqual(['mobile_sms_verify', 'email_verify'])
      }
    } else {
      expect.fail(`期望 challenge，实际 ${second.ok ? second.state.phase : '失败'}`)
    }
  })
})

describe('③ confirmed → success：跟随 SSO 领取登录凭证', () => {
  it('confirmed 时 followSsoRedirect 后 cookie 含登录态', async () => {
    const adapter = scriptedAdapter([
      { match: 'www.douyin.com/', body: '<html></html>' },
      { match: 'ttwid.bytedance.com/ttwid/register/', body: '{}' },
      { match: '/passport/web/get_qrcode/', body: JSON.stringify({ data: { token: 'TOKEN1', qrcode_index_url: 'https://qr', expire_time: 2000000000 } }) },
      {
        match: '/passport/web/check_qrconnect/',
        body: JSON.stringify({ data: { status: 'confirmed', redirect_url: 'https://sso.example.com/hop1' } })
      },
      // SSO 跳转：返回 302 + location + Set-Cookie（axios 头键名是小写）
      {
        match: 'sso.example.com/hop1',
        body: '',
        status: 302,
        headers: { location: 'https://sso.example.com/hop2' }
      },
      {
        match: 'sso.example.com/hop2',
        body: '',
        status: 200,
        headers: { 'set-cookie': 'sessionid=logged_in_123; Path=/' }
      }
    ])

    const session = createLoginSession(douyinQrcodeStrategy, { initialCtx: makeCtx(adapter), sleep: async () => {} })
    const result = await session.watch({ onQrcode: () => undefined })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.credential.cookie).toContain('sessionid=logged_in_123')
    }
  })
})

describe('④ 风控 / 限频', () => {
  it('risk → 失败信封 kind: risk', async () => {
    const adapter = scriptedAdapter([
      { match: 'www.douyin.com/', body: '<html></html>' },
      { match: 'ttwid.bytedance.com/ttwid/register/', body: '{}' },
      { match: '/passport/web/get_qrcode/', body: JSON.stringify({ data: { token: 'TOKEN1', qrcode_index_url: 'https://qr', expire_time: 2000000000 } }) },
      { match: '/passport/web/check_qrconnect/', body: JSON.stringify({ data: { status: 'confirming', error_code: 2156 } }) }
    ])

    const session = createLoginSession(douyinQrcodeStrategy, { initialCtx: makeCtx(adapter), sleep: async () => {} })
    const result = await session.watch({})

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('risk')
      expect(result.error.code).toBe('RISK_CONTROL')
    }
  })
})
