import { xiaohongshuJudge } from 'amagi/platforms/xiaohongshu/judge'
/**
 * platforms/xiaohongshu/judge 的契约。
 *
 * 判据两条：
 * ① HTML 反爬页判为 `kind: 'risk'` / `code: 'ANTIBOT_PAGE'`（原 HTML 进 `error.raw`）
 * ② 不再把一切失败归一化为 500（修 #15）：业务码 / 状态码原样带出，由 runtime 统一提取
 */
import { describe, expect, it } from 'vitest'

describe('platforms/xiaohongshu/judge - HTML 反爬页', () => {
  it('含 <html> 的字符串响应判为 risk / ANTIBOT_PAGE', () => {
    const verdict = xiaohongshuJudge('<!DOCTYPE html><html><body>风控验证</body></html>', { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('ANTIBOT_PAGE')
      expect(verdict.retryable).toBe(true)
    }
  })
})

describe('platforms/xiaohongshu/judge - 成功判定与 v6 一致', () => {
  it('code === 0 判成功', () => {
    expect(xiaohongshuJudge({ code: 0, data: {} }, { status: 200 }).ok).toBe(true)
  })

  it('没有 code 字段的 JSON 判成功（v6 的 !== 0 会误判为失败）', () => {
    expect(xiaohongshuJudge({ data: [] }, { status: 200 }).ok).toBe(true)
  })

  it('不含 <html> 的纯文本响应也判 risk / ANTIBOT_PAGE', () => {
    // 原先只挡含 `<html>` 的字符串，纯文本拦截页照样透出
    const verdict = xiaohongshuJudge('plain text', { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('ANTIBOT_PAGE')
    }
  })

  it('null / undefined 判成功（交给 normalize）', () => {
    expect(xiaohongshuJudge(null, { status: 200 }).ok).toBe(true)
    expect(xiaohongshuJudge(undefined, { status: 200 }).ok).toBe(true)
  })
})

describe('platforms/xiaohongshu/judge - 失败不再归一化为 500（修 #15）', () => {
  it('code !== 0 判失败，业务码留给 runtime 提取', () => {
    const verdict = xiaohongshuJudge({ code: -1, msg: '登录状态失效' }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBeUndefined() // 让 runtime 兜底，而不是写死 500
    }
  })

  it('业务码没结论时由 judge 按 HTTP 状态兜底', () => {
    // 这条原先断言的是「judge 只看业务码，HTTP 状态由 transport 判定」——
    // 可 transport 刻意把非 2xx 也当成正常响应返回（响应体里常有更准的业务码），
    // 于是状态码落进了两层之间的缝里，没人认领。现在由 judge 兜底。
    const verdict = xiaohongshuJudge({ code: 0, data: {} }, { status: 403 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('RISK_CONTROL')
    }
  })

  it('业务码已给出失败结论时不被 HTTP 状态改判', () => {
    const verdict = xiaohongshuJudge({ code: -1, msg: '登录状态失效' }, { status: 403 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.kind).toBeUndefined() // 仍然交给 runtime 兜底
  })
})