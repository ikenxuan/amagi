import { createXiaohongshuConfig } from 'amagi/platforms/xiaohongshu/config'
/**
 * platforms/xiaohongshu/config 的契约。
 *
 * 判据：**v6 `test/platform/default-configs.test.ts` 里 xhs 的五条 KNOWN-DEFECT
 * 用例改写为正** —— 本文件逐条对应：
 * - #23（小写风格）→ AmagiHeaders 大小写不敏感
 * - #30（无 requestConfig 形参）→ 接受 requestConfig
 * - #31（无 method/timeout）→ 默认 timeout 10000
 * - #32（cookie 不 trim）→ cookie 被 trim
 * - #33（写死 Edge 指纹）→ sec-ch-ua 与 user-agent 一致，默认 UA 不含 Edg
 */
import { describe, expect, it } from 'vitest'

describe('platforms/xiaohongshu/config - 五条 KNOWN-DEFECT 改写', () => {
  it('#23 改写：header 大小写不敏感，Cookie 与 cookie 都能取到', () => {
    const { headers } = createXiaohongshuConfig('ck')
    expect(headers.get('cookie')).toBe('ck')
    expect(headers.get('Cookie')).toBe('ck')
    expect(headers.get('user-agent')).toBeDefined()
    expect(headers.get('User-Agent')).toBeDefined()
  })

  it('#30 改写：接受 requestConfig 形参，外部 header 优先生效', () => {
    const { headers } = createXiaohongshuConfig('ck', { headers: { Referer: 'https://custom/' } })
    expect(headers.get('referer')).toBe('https://custom/')
    // 未覆盖的基线头仍在
    expect(headers.get('user-agent')).toContain('Chrome/')
  })

  it('#31 改写：默认 timeout 10000（method 归端点声明，不属于基线）', () => {
    const { requestConfig } = createXiaohongshuConfig('ck')
    expect(requestConfig.timeout).toBe(10000)
    // 外部 timeout 优先
    expect(createXiaohongshuConfig('ck', { timeout: 1 }).requestConfig.timeout).toBe(1)
  })

  it('#32 改写：cookie 被 trim', () => {
    const { headers } = createXiaohongshuConfig('  ck  ')
    expect(headers.get('cookie')).toBe('ck')
  })

  it('#33 改写：sec-ch-ua 与 user-agent 的 Chrome 版本一致，默认 UA 不含 Edg', () => {
    const { headers } = createXiaohongshuConfig('ck')
    expect(headers.get('sec-ch-ua')).not.toContain('Microsoft Edge')
    expect(headers.get('sec-ch-ua')).toContain('"Chromium";v="142"')
    expect(headers.get('user-agent')).not.toContain('Edg/')
  })
})

describe('platforms/xiaohongshu/config - 基线结构', () => {
  it('cookie 为 undefined 时头为空字符串', () => {
    const { headers } = createXiaohongshuConfig(undefined)
    expect(headers.get('cookie')).toBe('')
  })

  it('返回 AmagiHeaders 容器（不是普通对象）', () => {
    const { headers } = createXiaohongshuConfig('ck')
    expect(typeof headers.get).toBe('function')
    expect(headers.size).toBeGreaterThan(0)
  })

  it('必填基线头都在', () => {
    const { headers } = createXiaohongshuConfig('ck')
    for (const name of ['accept', 'content-type', 'referer', 'user-agent', 'cookie', 'sec-ch-ua']) {
      expect(headers.get(name), name + ' 缺失').toBeDefined()
    }
  })
})