import { douyinJudge } from 'amagi/platforms/douyin/judge'
/**
 * platforms/douyin/judge 的契约。
 *
 * 判据三条：
 * ① `status_code` 缺失时判**成功**（修 v6 的 `undefined !== 0` 误判）
 * ② `filter_detail` → `kind: 'forbidden'`
 * ③ 空响应（`''`）→ `kind: 'auth'`
 */
import { describe, expect, it } from 'vitest'

describe('① status_code 缺失判成功（修 undefined !== 0 误判）', () => {
  it('status_code: 0 判成功', () => {
    expect(douyinJudge({ status_code: 0, data: {} }, { status: 200 }).ok).toBe(true)
  })

  it('status_code 缺失判成功（v6 的 undefined !== 0 会误判失败）', () => {
    expect(douyinJudge({ some: 'payload' }, { status: 200 }).ok).toBe(true)
    expect(douyinJudge({ data: {} }, { status: 200 }).ok).toBe(true)
  })

  it('status_code 非 0 判失败', () => {
    const verdict = douyinJudge({ status_code: 2154, status_msg: '风控拦截' }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBeUndefined() // 让 runtime 兜底，不写死 500
    }
  })

  it('status_code 是字符串数字时同样判定（字符串 "8" 判失败）', () => {
    expect(douyinJudge({ status_code: '0' }, { status: 200 }).ok).toBe(true)
    expect(douyinJudge({ status_code: '8' }, { status: 200 }).ok).toBe(false)
  })
})

describe('② filter_detail 判 forbidden', () => {
  it('filter_detail.filter_reason 存在判 forbidden / PRIVATE', () => {
    const verdict = douyinJudge({ status_code: 0, filter_detail: { filter_reason: '内容不可见' } }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('forbidden')
      expect(verdict.code).toBe('PRIVATE')
    }
  })

  it('filter_detail 存在但 filter_reason 为空判成功', () => {
    expect(douyinJudge({ status_code: 0, filter_detail: { filter_reason: '' } }, { status: 200 }).ok).toBe(true)
    expect(douyinJudge({ status_code: 0, filter_detail: {} }, { status: 200 }).ok).toBe(true)
  })
})

describe('③ 空响应判 auth', () => {
  it('空字符串判 auth / COOKIE_EXPIRED', () => {
    const verdict = douyinJudge('', { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('auth')
      expect(verdict.code).toBe('COOKIE_EXPIRED')
    }
  })

  it('null / undefined 判成功（交给 normalize）', () => {
    expect(douyinJudge(null, { status: 200 }).ok).toBe(true)
    expect(douyinJudge(undefined, { status: 200 }).ok).toBe(true)
  })
})

describe('④ 非 JSON 响应体判失败（WAF / 反爬页）', () => {
  it('非空字符串判 risk / ANTIBOT_PAGE', () => {
    const verdict = douyinJudge('some string', { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('ANTIBOT_PAGE')
      expect(verdict.retryable).toBe(true)
    }
  })

  it('回归：Argus 拦截页（403 + 纯文本）不再判成功', () => {
    // 真实响应：HTTP 403，body 是这一句纯文本，既不是 JSON 也没有 status_code。
    // 旧判定的第三条「非对象一律判成功」把它当成功透出，data 就是这句话，
    // 调用方读 data.aweme_detail 才炸。
    const verdict = douyinJudge('Blocked by ArgusSecurityPlugin Uifid Not Found', { status: 403 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('ANTIBOT_PAGE')
    }
  })
})

describe('⑤ 业务码没结论时看 HTTP 状态', () => {
  it('403 + 合法 JSON 但无业务码 → risk / RISK_CONTROL', () => {
    const verdict = douyinJudge({ data: {} }, { status: 403 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('RISK_CONTROL')
    }
  })

  it('429 → rate_limit / RATE_LIMITED；503 → unavailable', () => {
    expect(douyinJudge({ status_code: 0 }, { status: 429 }).code).toBe('RATE_LIMITED')
    expect(douyinJudge({ status_code: 0 }, { status: 503 }).code).toBe('PLATFORM_UNAVAILABLE')
  })

  it('业务码已给出结论时不被 HTTP 状态改判', () => {
    // filter_detail 的 forbidden 结论优先于 403 的 risk 结论
    const verdict = douyinJudge({ status_code: 0, filter_detail: { filter_reason: '内容不可见' } }, { status: 403 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.kind).toBe('forbidden')
  })

  it('null 响应体 + 非 2xx 也判失败', () => {
    expect(douyinJudge(null, { status: 403 }).ok).toBe(false)
  })
})