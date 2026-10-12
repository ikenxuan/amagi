import { xiaohongshuJudge } from 'amagi/platforms/xiaohongshu/judge'
/**
 * platforms/xiaohongshu/judge 的契约。
 *
 * 判据三条：
 * ① HTML 反爬页判为 `kind: 'risk'` / `code: 'ANTIBOT_PAGE'`（原 HTML 进 `error.raw`）
 * ② 不再把一切失败归一化为 500（修 #15）：业务码 / 状态码原样带出，由 runtime 统一提取
 * ③ HTTP 461 判为 `kind: 'risk'` / `code: 'RISK_CONTROL'`（平台专属风控码）
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

/**
 * 461 / 471 是小红书**自有**的状态码，不是通用 HTTP 语义 —— 平台自己的 redcaptcha
 * SDK 里 461 叫 `antiSpider`、471 叫 `antiSpam`。2026-10-01 实测一条真实 461：
 * 响应体是 `{"code":0,"success":true,"data":{},"msg":""}`，票据只在 `verifyuuid` /
 * `verifytype` 两个响应头里（地址提取见 `platforms/xiaohongshu/captcha.ts`）。
 */
describe('platforms/xiaohongshu/judge - 461 / 471 验证码挑战', () => {
  /** 一条真实 461 的响应体：`code` 是 **0**、`success` 是 true */
  const ANTI_SPIDER_BODY = { code: 0, success: true, data: {}, msg: '' }

  it('461 判为 risk / CAPTCHA_REQUIRED，尽管响应体 code 是 0', () => {
    const verdict = xiaohongshuJudge(ANTI_SPIDER_BODY, { status: 461 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('CAPTCHA_REQUIRED')
    }
  })

  it('471（antiSpam）同样判为 risk / CAPTCHA_REQUIRED', () => {
    const verdict = xiaohongshuJudge(ANTI_SPIDER_BODY, { status: 471 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.code).toBe('CAPTCHA_REQUIRED')
  })

  it('显式关掉重试：要人去过验证页，退避重试没有意义', () => {
    // 实测同一游客 cookie 下 XYS_/XYW_ 打两个接口四种组合连续全部 461，
    // transport 那 1s/2s/4s 的退避重试一万次也一样
    const verdict = xiaohongshuJudge(ANTI_SPIDER_BODY, { status: 461 })
    if (!verdict.ok) expect(verdict.retryable).toBe(false)
  })

  it('排在业务码之前：461 带非 0 业务码时仍给出 risk，否则验证页地址会丢', () => {
    // kind 不是 'risk' 的话管线根本不会去调 challenge 钩子，手里的票据凭空丢掉
    const verdict = xiaohongshuJudge({ code: -101, msg: '登录已过期' }, { status: 461 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('CAPTCHA_REQUIRED')
    }
  })

  it('461 不会被 verdictFromHttpStatus 判成 unknown / PLATFORM_ERROR', () => {
    // 这是修复前的行为：461 不在那张通用状态表里，一路落到兜底分支
    const verdict = xiaohongshuJudge(ANTI_SPIDER_BODY, { status: 461 })
    if (!verdict.ok) {
      expect(verdict.kind).not.toBe('unknown')
      expect(verdict.code).not.toBe('PLATFORM_ERROR')
    }
  })

  it('相邻状态码不受影响：460 / 462 仍走通用兜底', () => {
    for (const status of [460, 462]) {
      const verdict = xiaohongshuJudge(ANTI_SPIDER_BODY, { status })
      expect(verdict.ok).toBe(false)
      if (!verdict.ok) expect(verdict.code).toBe('PLATFORM_ERROR')
    }
  })

  // 上游 2026-10-12 抓包（游客会话 comment/page 翻页）的另一种空壳：msg 是「成功」而非空串。
  // 上游 beta.9 把它判成 RISK_CONTROL / retryable: true；本分支的验证码分支排在前面，
  // 同一条响应判 CAPTCHA_REQUIRED / retryable: false —— kind 都是 risk。
  it('461 + msg「成功」的伪装空壳同样判为 risk / CAPTCHA_REQUIRED', () => {
    const verdict = xiaohongshuJudge({ code: 0, success: true, msg: '成功', data: {} }, { status: 461 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('CAPTCHA_REQUIRED')
      expect(verdict.retryable).toBe(false)
    }
  })
})
