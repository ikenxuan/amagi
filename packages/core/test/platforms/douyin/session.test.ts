import type { SessionCtx } from 'amagi/contracts/session'
import { douyinQrcodeStrategy } from 'amagi/platforms/douyin/session/qrcode'
import { createLoginSession } from 'amagi/runtime/session'
import type { AxiosAdapter } from 'axios'
import { describe, expect, it, vi } from 'vitest'
/**
 * platforms/douyin/session/qrcode 的契约（桌面 IM Passport）。
 *
 * 判据：
 * ① `get_qrcode` 返回 base64 图 + index 短链 + 绝对秒 expire_time → content 取短链
 *   （缺失回退 token），expiresInSec / expiresAt 正确
 * ② account_flow=verify → SmsChallenge，availableWays / maskedMobile 正确填充
 * ③ confirmed → sessionOf 直接产登录 cookie（桌面无 SSO 跳转步骤）
 * ④ 验证中心决策头 → 直判 risk
 * ⑤ 账号未绑定手机（verify_ways 只有 pwd_verify）→ PasswordChallenge，answer 提交密码走 account/verify
 *
 * 桌面策略 start 会调 `createDevice()`（真实实现走 powershell + 原生 fetch，
 * 不经 axios adapter），测试必须 mock 成固定设备，让协议请求都落在注入的 adapter 里。
 */

vi.mock('amagi/platforms/douyin/passport/device', () => ({
  createDevice: async () => ({ deviceId: '10086', installId: '10087', guid: 'g' })
}))

/** 脚本化 adapter：按 URL 返回响应 */
const scriptedAdapter = (
  script: Array<{ match: string; body: unknown; status?: number; headers?: Record<string, string> }>
): AxiosAdapter => {
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

/** 用 adapter 构造会话 ctx（策略内部 `new Http(ctx.cookie, ctx.requestConfig)`） */
const makeCtx = (adapter: AxiosAdapter): SessionCtx => ({
  platform: 'douyin',
  cookie: '',
  requestConfig: { adapter },
  send: async () => {
    throw new Error('douyin 策略走 Http，不用 ctx.send')
  },
  data: {}
})

describe('① 取码：content 取 index 短链与绝对秒换算', () => {
  it('start 产出的 Qrcode.content 是 index 短链，expiresInSec 夹在可信区间，expiresAt 是毫秒', async () => {
    const adapter = scriptedAdapter([
      // 桌面预热 + 取码（真实网络只有这两步配对 device_register）
      { match: 'ttwid/check/', body: '{}' },
      {
        match: '/passport/web/get_qrcode/',
        body: {
          data: {
            token: 'TOKEN1',
            qrcode: 'BASE64',
            qrcode_index_url: 'https://www.douyin.com/qr/TOKEN1',
            expire_time: 2000000000,
            error_code: 0
          }
        }
      }
    ])

    const session = createLoginSession(douyinQrcodeStrategy, { initialCtx: makeCtx(adapter), sleep: async () => {} })
    const first = await session.start()

    expect(first.ok).toBe(true)
    if (first.ok) {
      expect(first.state.phase).toBe('pending')
      if (first.state.phase === 'pending') {
        const qrcode = first.state.qrcode
        expect(qrcode.token).toBe('TOKEN1')
        // base64 图超 QR 编码容量，content 走服务端给的 index 短链
        expect(qrcode.content).toBe('https://www.douyin.com/qr/TOKEN1')
        // 绝对秒离 now 很远 → 夹到上限 300s
        expect(qrcode.expiresInSec).toBe(300)
        // expiresAt 是绝对毫秒，落在 (now, now+300s] 内（nowSec 取整后可能多 1s 容差）
        expect(qrcode.expiresAt).toBeGreaterThan(Date.now())
        expect(qrcode.expiresAt).toBeLessThanOrEqual(Date.now() + 301_000)
      }
    }
  })

  it('缺少 index 短链时 content 回退到 token', async () => {
    const adapter = scriptedAdapter([
      { match: 'ttwid/check/', body: '{}' },
      {
        match: '/passport/web/get_qrcode/',
        body: { data: { token: 'TOKEN2', qrcode: 'BASE64', expire_time: 2000000000, error_code: 0 } }
      }
    ])

    const session = createLoginSession(douyinQrcodeStrategy, { initialCtx: makeCtx(adapter), sleep: async () => {} })
    const first = await session.start()

    expect(first.ok).toBe(true)
    if (first.ok && first.state.phase === 'pending') {
      expect(first.state.qrcode.content).toBe('TOKEN2')
    }
  })
})

describe('② verify → SmsChallenge 映射', () => {
  it('轮询返回 verify 时，challenge.availableWays / maskedMobile 正确填充', async () => {
    const adapter = scriptedAdapter([
      { match: 'ttwid/check/', body: '{}' },
      {
        match: '/passport/web/get_qrcode/',
        body: { data: { token: 'TOKEN1', qrcode: 'BASE64', expire_time: 2000000000, error_code: 0 } }
      },
      {
        match: '/passport/web/check_qrconnect/',
        body: {
          data: {
            status: 'confirming',
            error_code: 2046,
            account_flow: 'verify',
            verify_ways: [{ verify_way: 'mobile_sms_verify', mobile: '138****8000' }, { verify_way: 'email_verify' }],
            encrypt_uid: 'e1',
            verify_ticket: 'vt1'
          }
        }
      }
    ])

    const session = createLoginSession(douyinQrcodeStrategy, { initialCtx: makeCtx(adapter), sleep: async () => {} })
    await session.start()
    const second = await session.next()

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

describe('③ confirmed → success：sessionOf 直接领登录凭证', () => {
  it('confirmed 后 cookie 含 Set-Cookie 的登录态（桌面无 SSO 跳转）', async () => {
    const adapter = scriptedAdapter([
      { match: 'ttwid/check/', body: '{}' },
      {
        match: '/passport/web/get_qrcode/',
        body: { data: { token: 'TOKEN1', qrcode: 'BASE64', expire_time: 2000000000, error_code: 0 } }
      },
      {
        match: '/passport/web/check_qrconnect/',
        body: { data: { status: 'confirmed', user_data: { user_id_str: '12345' } } },
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

describe('④ 验证中心决策 / 风控', () => {
  it('x-tt-passport-decision → risk 失败信封', async () => {
    const adapter = scriptedAdapter([
      { match: 'ttwid/check/', body: '{}' },
      {
        match: '/passport/web/get_qrcode/',
        body: { data: { token: 'TOKEN1', qrcode: 'BASE64', expire_time: 2000000000, error_code: 0 } }
      },
      {
        match: '/passport/web/check_qrconnect/',
        body: { data: { status: 'confirming', error_code: 0 } },
        headers: { 'x-tt-passport-decision': 'verify_center' }
      }
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

describe('⑤ 未绑定手机 → pwd_verify 登录密码验证', () => {
  it('verify_ways 只有 pwd_verify 时进 password challenge，提交密码后校验通过并 confirmed', async () => {
    const adapter = scriptedAdapter([
      { match: 'ttwid/check/', body: '{}' },
      {
        match: '/passport/web/get_qrcode/',
        body: { data: { token: 'TOKEN1', qrcode: 'BASE64', expire_time: 2000000000, error_code: 0 } }
      },
      {
        match: '/passport/web/check_qrconnect/',
        body: {
          data: {
            status: 'confirming',
            error_code: 2046,
            account_flow: 'verify',
            verify_ways: [{ verify_way: 'pwd_verify', sms_content: '尚未绑定手机号，支持密码验证' }],
            encrypt_uid: 'e1',
            verify_ticket: 'vt1'
          }
        }
      },
      // validatePassword → POST /passport/web/account/verify/
      { match: '/passport/web/account/verify/', body: { data: { error_code: 0, ticket: 't1' } } },
      {
        match: '/passport/web/check_qrconnect/',
        body: { data: { status: 'confirmed', user_data: { user_id_str: '12345' } } },
        headers: { 'set-cookie': 'sessionid=logged_in_pwd; Path=/' }
      }
    ])

    const session = createLoginSession(douyinQrcodeStrategy, { initialCtx: makeCtx(adapter), sleep: async () => {} })
    let challengeKind: string | undefined
    const result = await session.watch({
      onQrcode: () => undefined,
      onChallenge: (async (challenge) => {
        challengeKind = challenge.kind
        if (challenge.kind !== 'password') throw new Error(`期望 password challenge，实际 ${challenge.kind}`)
        return { password: 'secret123' }
      }) as NonNullable<Parameters<typeof session.watch>[0]>['onChallenge']
    })

    expect(challengeKind).toBe('password')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.credential.cookie).toContain('sessionid=logged_in_pwd')
    }
  })
})
