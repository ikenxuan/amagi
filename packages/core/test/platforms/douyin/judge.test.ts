import { errorMessageFor } from 'amagi/contracts/error'
import { douyinJudge, isDouyinArgusBody } from 'amagi/platforms/douyin/judge'
/**
 * platforms/douyin/judge 的契约。
 *
 * 判据四条：
 * ① `status_code` 缺失时判**成功**（修 v6 的 `undefined !== 0` 误判）
 * ② `filter_detail` → `kind: 'forbidden'`
 * ③ 空响应（`''`）→ `kind: 'auth'` / `code: 'EMPTY_RESPONSE'`
 * ④ Argus 拦截文本 → `kind: 'risk'` / `code: 'ANTIBOT_PAGE'`（可重试）
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
      // 刻意不按码分类：抖音没有公开业务码表，同一个码在不同接口含义还不一样。
      // 真实码由 runtime 放进 error.platform.code，这里只声明「不分类」
      expect(verdict.kind).toBe('unknown')
      expect(verdict.code).toBe('PLATFORM_ERROR')
      expect(verdict.retryable).toBe(false)
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

describe('③ 空响应判 auth / EMPTY_RESPONSE，④ Argus 判 risk', () => {
  it('空字符串判 auth / EMPTY_RESPONSE', () => {
    const verdict = douyinJudge('', { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      // kind 仍是 auth（三种成因里 ck 失效最常见，调用方的分支不该改行为），
      // code 换成 EMPTY_RESPONSE —— 「你的 ck 可能失效了」那句把排查带偏过两次，
      // 而空响应最常见的成因是设备类参数（多为 webid）与会话不匹配
      expect(verdict.kind).toBe('auth')
      expect(verdict.code).toBe('EMPTY_RESPONSE')
    }
  })

  it('EMPTY_RESPONSE 的兜底文案把三种成因都点名', () => {
    const message = errorMessageFor('EMPTY_RESPONSE')
    expect(message).toContain('cookie 会话不匹配')
    expect(message).toContain('不公开')
    expect(message).toContain('已失效')
  })

  it('Argus 拦截文本被认出来', () => {
    expect(isDouyinArgusBody('Blocked by ArgusSecurityPlugin Uifid Not Found')).toBe(true)
    expect(isDouyinArgusBody('blocked by something')).toBe(true)
    // 正常的 JSON 分块流不能被认成拦截（综合搜索的响应本来就是字符串）
    expect(isDouyinArgusBody('1f2\r\n{"status_code":0,"data":[]}')).toBe(false)
    expect(isDouyinArgusBody({ status_code: 0 })).toBe(false)
    expect(isDouyinArgusBody('')).toBe(false)
  })

  it('Argus 拦截走公共前置判 risk / ANTIBOT_PAGE（可重试）', () => {
    const verdict = douyinJudge('Blocked by ArgusSecurityPlugin Uifid Not Found', { status: 403 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('ANTIBOT_PAGE')
      expect(verdict.retryable).toBe(true)
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