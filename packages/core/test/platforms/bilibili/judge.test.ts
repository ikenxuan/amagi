import { bilibiliJudge } from 'amagi/platforms/bilibili/judge'
/**
 * platforms/bilibili/judge 的契约。
 *
 * 判据三条：
 * ① `code: 0` 一律成功（修 A2 的自相矛盾：v6 空负载判失败、internal 判成功）
 * ② `-412` → `kind: 'risk'` / `RISK_CONTROL`（端点声明 `retryOn` 退避重试，修 A4）
 * ③ 空响应 → `kind: 'auth'`（v6 的「接口返回内容为空，你的B站ck可能已经失效」）
 */
import { describe, expect, it } from 'vitest'

describe('① code: 0 一律成功（修 A2）', () => {
  it('code: 0 判成功', () => {
    expect(bilibiliJudge({ code: 0, data: { list: [] } }, { status: 200 }).ok).toBe(true)
  })

  it('code 缺失判成功（v6 的 undefined !== 0 会误判失败）', () => {
    expect(bilibiliJudge({ data: { list: [] } }, { status: 200 }).ok).toBe(true)
  })

  it('code: 0 且 data 为空对象 / null 仍判成功（空负载交给 normalize）', () => {
    expect(bilibiliJudge({ code: 0, data: {} }, { status: 200 }).ok).toBe(true)
    expect(bilibiliJudge({ code: 0, data: null }, { status: 200 }).ok).toBe(true)
  })

  it('code 非 0 判失败', () => {
    const verdict = bilibiliJudge({ code: -101, message: '账号未登录' }, { status: 200 })
    expect(verdict.ok).toBe(false)
  })
})

describe('② -412 判 risk / RISK_CONTROL（配合 retryOn，修 A4）', () => {
  it('-412 → kind: risk / code: RISK_CONTROL', () => {
    const verdict = bilibiliJudge({ code: -412, message: '请求被拦截 (客户端 ip 被服务端风控)' }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('RISK_CONTROL')
    }
  })

  it('-101 → kind: auth / COOKIE_EXPIRED', () => {
    const verdict = bilibiliJudge({ code: -101, message: '账号未登录' }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('auth')
      expect(verdict.code).toBe('COOKIE_EXPIRED')
    }
  })

  it('-404 → kind: not_found / NOT_FOUND', () => {
    const verdict = bilibiliJudge({ code: -404, message: '啥都木有' }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('not_found')
      expect(verdict.code).toBe('NOT_FOUND')
    }
  })

  it('其余错误码 → kind: unknown / PLATFORM_ERROR（业务码留给 runtime 提取，A3）', () => {
    const verdict = bilibiliJudge({ code: -799, message: '请求过于频繁' }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('unknown')
      expect(verdict.code).toBe('PLATFORM_ERROR')
    }
  })
})

describe('③ 空响应判 auth', () => {
  it('空字符串判 auth / COOKIE_EXPIRED', () => {
    const verdict = bilibiliJudge('', { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('auth')
      expect(verdict.code).toBe('COOKIE_EXPIRED')
    }
  })

  it('非对象（null / 字符串）判成功（交给 normalize）', () => {
    expect(bilibiliJudge(null, { status: 200 }).ok).toBe(true)
    expect(bilibiliJudge('some string', { status: 200 }).ok).toBe(true)
  })
})
