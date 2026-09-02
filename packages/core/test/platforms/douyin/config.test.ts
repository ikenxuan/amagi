import { createDouyinConfig } from 'amagi/platforms/douyin/config'
import { DEFAULT_UA } from 'amagi/contracts/ua'
/**
 * platforms/douyin/config 的契约。
 *
 * 判据：**v6 `test/platform/default-configs.test.ts` 里抖音的三条 KNOWN-DEFECT
 * 用例改写为正**：
 * - #24（硬编码 Chrome/125）→ 默认 UA 取集中维护的 `contracts/ua.ts`，不再写死
 * - #27（Edg 剥离被展开顺序抵消）→ 本层不再做会被覆盖的局部剥离，外部 UA 原样
 *   透传（transport 出口统一剥一次，#17）
 * - #28（Sec-Ch-Ua 与 UA 不一致）→ sec-ch-ua 与 user-agent 基于同一个 UA 计算
 */
import { describe, expect, it } from 'vitest'

describe('#24 改写：默认 UA 不再硬编码 Chrome/125', () => {
  it('默认 UA 与集中维护的 DEFAULT_UA 一致', () => {
    const { headers } = createDouyinConfig('ck')
    expect(headers.get('user-agent')).toBe(DEFAULT_UA)
    expect(DEFAULT_UA).toContain('Chrome/142')
  })

  it('外部 UA 优先生效（大小写不敏感）', () => {
    const ua = 'Mozilla/5.0 CustomAgent Chrome/140.0.0.0 Safari/537.36'
    const { headers } = createDouyinConfig('ck', { headers: { 'User-Agent': ua } })
    expect(headers.get('user-agent')).toBe(ua)
  })
})

describe('#27/#28 改写：Edg 剥离交给 transport，sec-ch-ua 与发出的 UA 一致', () => {
  it('外部 UA 原样透传（本层不再剥离，transport 出口统一剥一次）', () => {
    const ua = 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0'
    const { headers } = createDouyinConfig('ck', { headers: { 'User-Agent': ua } })
    expect(headers.get('user-agent')).toBe(ua)
  })

  it('sec-ch-ua 基于同一个 UA 生成，两个头描述同一浏览器（#28）', () => {
    const ua = 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0'
    const { headers } = createDouyinConfig('ck', { headers: { 'User-Agent': ua } })
    expect(headers.get('user-agent')).toContain('Chrome/140')
    expect(headers.get('sec-ch-ua')).toContain('"Chromium";v="140"')
    expect(headers.get('sec-ch-ua')).toContain('"Google Chrome";v="140"')
  })

  it('UA 无 Chrome 版本时 sec-ch-ua 回落到集中版本 142', () => {
    const { headers } = createDouyinConfig('ck', { headers: { 'User-Agent': 'SomeBot/1.0' } })
    expect(headers.get('sec-ch-ua')).toContain('v="142"')
  })
})

describe('platforms/douyin/config - 基线结构', () => {
  it('method 由端点声明，config 不设（端点各自声明 GET / POST）', () => {
    expect((createDouyinConfig('ck').requestConfig as Record<string, unknown>).method).toBeUndefined()
  })

  it('默认 timeout 10000，外部 timeout 优先', () => {
    expect(createDouyinConfig('ck').requestConfig.timeout).toBe(10000)
    expect(createDouyinConfig('ck', { timeout: 1 }).requestConfig.timeout).toBe(1)
  })

  it('cookie 被 trim，undefined 时为空串', () => {
    expect(createDouyinConfig('  ck  ').headers.get('cookie')).toBe('ck')
    expect(createDouyinConfig(undefined).headers.get('cookie')).toBe('')
  })

  it('返回 AmagiHeaders 容器（不是普通对象）', () => {
    const { headers } = createDouyinConfig('ck')
    expect(typeof headers.get).toBe('function')
    expect(headers.size).toBeGreaterThan(0)
  })

  it('抖音必填基线头都在', () => {
    const { headers } = createDouyinConfig('ck')
    for (const name of ['accept', 'referer', 'user-agent', 'cookie', 'sec-ch-ua', 'sec-fetch-site']) {
      expect(headers.get(name), name + ' 缺失').toBeDefined()
    }
    expect(headers.get('referer')).toBe('https://www.douyin.com/')
    expect(headers.get('sec-fetch-site')).toBe('same-origin')
  })

  it('外部 requestConfig 的其他字段被透传', () => {
    expect(createDouyinConfig('ck', { timeout: 1 }).requestConfig.timeout).toBe(1)
  })

  it('外部 headers 覆盖同名默认头', () => {
    const { headers } = createDouyinConfig('ck', { headers: { Referer: 'https://custom/' } })
    expect(headers.get('referer')).toBe('https://custom/')
  })
})
