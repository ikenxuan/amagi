import { createBilibiliConfig } from 'amagi/platforms/bilibili/config'
import { DEFAULT_UA } from 'amagi/contracts/ua'
/**
 * platforms/bilibili/config 的契约。
 *
 * 判据：**#24 对应的硬编码 Chrome/142 改为集中维护** —— 默认 UA 取
 * `contracts/ua.ts` 的 `DEFAULT_UA`，不再写死版本号。
 */
import { describe, expect, it } from 'vitest'

describe('#24 改写：默认 UA 不再硬编码 Chrome/142', () => {
  it('默认 UA 与集中维护的 DEFAULT_UA 一致', () => {
    const { headers } = createBilibiliConfig('ck')
    expect(headers.get('user-agent')).toBe(DEFAULT_UA)
  })

  it('外部 UA 优先生效（大小写不敏感）', () => {
    const ua = 'Mozilla/5.0 CustomAgent Chrome/140.0.0.0 Safari/537.36'
    const { headers } = createBilibiliConfig('ck', { headers: { 'User-Agent': ua } })
    expect(headers.get('user-agent')).toBe(ua)
  })

  it('sec-ch-ua 与 user-agent 基于同一个 UA 计算', () => {
    const ua = 'Mozilla/5.0 Chrome/133.0.0.0 Safari/537.36'
    const { headers } = createBilibiliConfig('ck', { headers: { 'User-Agent': ua } })
    expect(headers.get('sec-ch-ua')).toContain('"Chromium";v="133"')
    expect(headers.get('sec-ch-ua')).toContain('"Google Chrome";v="133"')
  })
})

describe('platforms/bilibili/config - 基线结构', () => {
  it('method 由端点声明，config 不设', () => {
    expect((createBilibiliConfig('ck').requestConfig as Record<string, unknown>).method).toBeUndefined()
  })

  it('默认 timeout 10000，外部 timeout 优先', () => {
    expect(createBilibiliConfig('ck').requestConfig.timeout).toBe(10000)
    expect(createBilibiliConfig('ck', { timeout: 1 }).requestConfig.timeout).toBe(1)
  })

  it('cookie 被 trim，undefined 时为空串', () => {
    expect(createBilibiliConfig('  ck  ').headers.get('cookie')).toBe('ck')
    expect(createBilibiliConfig(undefined).headers.get('cookie')).toBe('')
  })

  it('B站必填基线头都在', () => {
    const { headers } = createBilibiliConfig('ck')
    for (const name of ['accept', 'referer', 'user-agent', 'cookie', 'sec-ch-ua', 'cache-control']) {
      expect(headers.get(name), name + ' 缺失').toBeDefined()
    }
    expect(headers.get('referer')).toBe('https://www.bilibili.com/')
  })

  it('外部 headers 覆盖同名默认头', () => {
    const { headers } = createBilibiliConfig('ck', { headers: { Referer: 'https://custom/' } })
    expect(headers.get('referer')).toBe('https://custom/')
  })
})
