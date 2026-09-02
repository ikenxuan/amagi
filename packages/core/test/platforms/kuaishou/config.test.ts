import { createKuaishouConfig } from 'amagi/platforms/kuaishou/config'
/**
 * platforms/kuaishou/config 的契约。
 *
 * 判据：**v6 `test/platform/default-configs.test.ts` 里快手的两条 KNOWN-DEFECT
 * 用例改写为正**：
 * - #26（自带 Edg）→ 默认 UA 不含 Edg
 * - #29（不生成 Sec-Ch-Ua）→ sec-ch-ua 按 UA 的 Chrome 版本动态生成
 */
import { describe, expect, it } from 'vitest'

describe('#26 改写：默认 UA 不再自带 Edg 标识', () => {
  it('默认 UA 不含 Edg/ 标识', () => {
    const { headers } = createKuaishouConfig('ck')
    expect(headers.get('user-agent')).not.toContain('Edg/')
  })

  it('默认 UA 是 Chrome/130（与 v6 版本一致）', () => {
    const { headers } = createKuaishouConfig('ck')
    expect(headers.get('user-agent')).toContain('Chrome/130')
  })
})

describe('#29 改写：sec-ch-ua 按 UA 动态生成', () => {
  it('默认 UA 下 sec-ch-ua 声明 Chromium/130 + Google Chrome/130', () => {
    const { headers } = createKuaishouConfig('ck')
    expect(headers.get('sec-ch-ua')).toContain('"Chromium";v="130"')
    expect(headers.get('sec-ch-ua')).toContain('"Google Chrome";v="130"')
  })

  it('外部 UA 的 Chrome 版本被写进 sec-ch-ua（与 UA 一致）', () => {
    const { headers } = createKuaishouConfig('ck', { headers: { 'user-agent': 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36' } })
    expect(headers.get('user-agent')).toContain('Chrome/140')
    expect(headers.get('sec-ch-ua')).toContain('"Chromium";v="140"')
  })

  it('UA 无 Chrome 版本时 sec-ch-ua 回落到 130', () => {
    const { headers } = createKuaishouConfig('ck', { headers: { 'user-agent': 'SomeBot/1.0' } })
    expect(headers.get('sec-ch-ua')).toContain('v="130"')
  })
})

describe('platforms/kuaishou/config - 基线结构', () => {
  it('method 由端点声明，config 不设（graphql POST 与 live_api GET 并存）', () => {
    expect((createKuaishouConfig('ck').requestConfig as Record<string, unknown>).method).toBeUndefined()
  })

  it('默认 timeout 10000', () => {
    expect(createKuaishouConfig('ck').requestConfig.timeout).toBe(10000)
  })

  it('cookie 被 trim，undefined 时为空串', () => {
    expect(createKuaishouConfig('  ck  ').headers.get('cookie')).toBe('ck')
    expect(createKuaishouConfig(undefined).headers.get('cookie')).toBe('')
  })

  it('返回 AmagiHeaders 容器（不是普通对象）', () => {
    const { headers } = createKuaishouConfig('ck')
    expect(typeof headers.get).toBe('function')
    expect(headers.size).toBeGreaterThan(0)
  })

  it('快手必填基线头都在', () => {
    const { headers } = createKuaishouConfig('ck')
    for (const name of ['accept', 'content-type', 'referer', 'origin', 'user-agent', 'cookie', 'sec-ch-ua']) {
      expect(headers.get(name), name + ' 缺失').toBeDefined()
    }
  })

  it('外部 requestConfig 的其他字段被透传', () => {
    expect(createKuaishouConfig('ck', { timeout: 1 }).requestConfig.timeout).toBe(1)
  })

  it('外部 headers 覆盖同名默认头', () => {
    const { headers } = createKuaishouConfig('ck', { headers: { Referer: 'https://custom/' } })
    expect(headers.get('referer')).toBe('https://custom/')
  })
})