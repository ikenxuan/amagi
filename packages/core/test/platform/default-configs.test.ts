import {
  getBilibiliDefaultConfig,
  getDouyinDefaultConfig,
  getKuaishouDefaultConfig,
  getXiaohongshuDefaultConfig
} from 'amagi/platform/defaultConfigs'
import { createXiaohongshuConfig } from 'amagi/platforms/xiaohongshu/config'
/**
 * 四个平台的默认请求配置。
 *
 * v6 在这里硬编码了四份互不相同的浏览器指纹（含四个不同的 Chrome 版本），
 * 且 header 大小写风格不统一。这些差异是后续多处静默 bug 的根源，
 * 所以逐条钉死，v7 统一时必须显式改测试。
 *
 * 小红书是 v7 第一个迁移的平台（阶段 1），它的五条 KNOWN-DEFECT
 * （#23 小写风格 / #30 无 requestConfig / #31 无 timeout / #32 不 trim /
 * #33 写死 Edge 指纹）已在 `platforms/xiaohongshu/config.ts` 修复，
 * 对应用例改写为对 v7 config 的正向断言（KNOWN-DEFECT 数字只降不升）。
 */
import { describe, expect, it } from 'vitest'

const asHeaders = (config: { headers?: unknown }) => (config.headers ?? {}) as Record<string, string>

describe('header 键名风格', () => {
  it('抖音 / B站 / 快手 使用大写风格', () => {
    for (const build of [getDouyinDefaultConfig, getBilibiliDefaultConfig, getKuaishouDefaultConfig]) {
      const headers = asHeaders(build('ck'))
      expect(headers).toHaveProperty('Cookie')
      expect(headers).toHaveProperty('User-Agent')
    }
  })

  // #23 改写：v7 的 xhs config 用大小写不敏感容器，Cookie / cookie 都能取到
  it('#23 改写：小红书使用大小写不敏感容器', () => {
    const { headers } = createXiaohongshuConfig('ck')
    expect(headers.get('Cookie')).toBe('ck')
    expect(headers.get('cookie')).toBe('ck')
    expect(headers.get('User-Agent')).toBeDefined()
    expect(headers.get('user-agent')).toBeDefined()
  })
})

describe('Chrome 版本硬编码', () => {
  it.each([
    ['douyin', getDouyinDefaultConfig, '125'],
    ['bilibili', getBilibiliDefaultConfig, '142'],
    ['kuaishou', getKuaishouDefaultConfig, '130']
  ] as const)('KNOWN-DEFECT: %s 硬编码 Chrome/%s', (_name, build, version) => {
    const headers = asHeaders(build('ck'))
    expect(headers['User-Agent']).toContain('Chrome/' + version)
  })

  it('KNOWN-DEFECT: xiaohongshu 硬编码 Chrome/141', () => {
    expect(asHeaders(getXiaohongshuDefaultConfig('ck'))['user-agent']).toContain('Chrome/141')
  })

  it('四个平台的 UA 互不相同', () => {
    const uas = new Set([
      asHeaders(getDouyinDefaultConfig('ck'))['User-Agent'],
      asHeaders(getBilibiliDefaultConfig('ck'))['User-Agent'],
      asHeaders(getKuaishouDefaultConfig('ck'))['User-Agent'],
      asHeaders(getXiaohongshuDefaultConfig('ck'))['user-agent']
    ])
    expect(uas.size).toBe(4)
  })
})

describe('Edg 标识', () => {
  it('抖音 / B站 的默认 UA 不含 Edg', () => {
    expect(asHeaders(getDouyinDefaultConfig('ck'))['User-Agent']).not.toContain('Edg/')
    expect(asHeaders(getBilibiliDefaultConfig('ck'))['User-Agent']).not.toContain('Edg/')
  })

  it('KNOWN-DEFECT: 快手与小红书的默认 UA 自带 Edg 标识', () => {
    expect(asHeaders(getKuaishouDefaultConfig('ck'))['User-Agent']).toContain('Edg/')
    expect(asHeaders(getXiaohongshuDefaultConfig('ck'))['user-agent']).toContain('Edg/')
  })
})

describe('getDouyinDefaultConfig', () => {
  it('默认 method GET、timeout 10000', () => {
    const config = getDouyinDefaultConfig('ck')
    expect(config.method).toBe('GET')
    expect(config.timeout).toBe(10000)
  })

  it('cookie 被 trim', () => {
    expect(asHeaders(getDouyinDefaultConfig('  ck  ')).Cookie).toBe('ck')
  })

  it('cookie 为 undefined 时头为空字符串', () => {
    expect(asHeaders(getDouyinDefaultConfig(undefined)).Cookie).toBe('')
  })

  it('外部 UA 覆盖默认值', () => {
    const ua = 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36'
    expect(asHeaders(getDouyinDefaultConfig('ck', { headers: { 'User-Agent': ua } }))['User-Agent']).toBe(ua)
  })

  // 实现先算出剥掉 Edg 的 finalUserAgent 放进 defHeaders，
  // 随后 { ...defHeaders, ...requestConfig.headers } 又用原始值把它盖回去了。
  // 净效果：这一层的剥离对外部传入的 UA 完全无效（只有 networks 层还会再剥一次）。
  it('KNOWN-DEFECT: 外部 UA 的 Edg 标识在本层不会被剥掉', () => {
    const ua = 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0'
    expect(asHeaders(getDouyinDefaultConfig('ck', { headers: { 'User-Agent': ua } }))['User-Agent']).toContain('Edg/')
  })

  // 但 Sec-Ch-Ua 是用剥离后的值算的，于是两个头描述的浏览器并不一致。
  it('KNOWN-DEFECT: Sec-Ch-Ua 基于剥离后的 UA，与实际发出的 User-Agent 不一致', () => {
    const ua = 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0'
    const headers = asHeaders(getDouyinDefaultConfig('ck', { headers: { 'User-Agent': ua } }))

    expect(headers['User-Agent']).toContain('Edg/')
    expect(headers['Sec-Ch-Ua']).toContain('"Google Chrome";v="140"')
  })

  it('Sec-Ch-Ua 根据 UA 的 Chrome 版本生成', () => {
    const headers = asHeaders(getDouyinDefaultConfig('ck', { headers: { 'User-Agent': 'Chrome/133.0.0.0' } }))
    expect(headers['Sec-Ch-Ua']).toContain('"Chromium";v="133"')
    expect(headers['Sec-Ch-Ua']).toContain('"Google Chrome";v="133"')
  })

  it('UA 中无 Chrome 版本时 Sec-Ch-Ua 回落到 125', () => {
    const headers = asHeaders(getDouyinDefaultConfig('ck', { headers: { 'User-Agent': 'SomeBot/1.0' } }))
    expect(headers['Sec-Ch-Ua']).toContain('v="125"')
  })

  it('外部 headers 覆盖同名默认头', () => {
    const headers = asHeaders(getDouyinDefaultConfig('ck', { headers: { Referer: 'https://custom/' } }))
    expect(headers.Referer).toBe('https://custom/')
  })

  it('外部 requestConfig 的其他字段被透传', () => {
    expect(getDouyinDefaultConfig('ck', { timeout: 1 }).timeout).toBe(1)
  })

  it('默认头集合被锁定', () => {
    expect(Object.keys(asHeaders(getDouyinDefaultConfig('ck'))).sort()).toMatchSnapshot()
  })
})

describe('getBilibiliDefaultConfig', () => {
  it('默认 method GET、timeout 10000', () => {
    const config = getBilibiliDefaultConfig('ck')
    expect(config.method).toBe('GET')
    expect(config.timeout).toBe(10000)
  })

  it('默认头集合被锁定', () => {
    expect(Object.keys(asHeaders(getBilibiliDefaultConfig('ck'))).sort()).toMatchSnapshot()
  })
})

describe('getKuaishouDefaultConfig', () => {
  it('默认 method 为 POST（与其他三个平台不同）', () => {
    expect(getKuaishouDefaultConfig('ck').method).toBe('POST')
  })

  it('KNOWN-DEFECT: 不根据 UA 生成 Sec-Ch-Ua（其他两个平台会）', () => {
    expect(asHeaders(getKuaishouDefaultConfig('ck'))['Sec-Ch-Ua']).toBeUndefined()
  })

  it('默认头集合被锁定', () => {
    expect(Object.keys(asHeaders(getKuaishouDefaultConfig('ck'))).sort()).toMatchSnapshot()
  })
})

describe('getXiaohongshuDefaultConfig', () => {
  // #30 改写：v7 的 createXiaohongshuConfig 接受 (cookie, requestConfig) 两个形参
  it('#30 改写：接受 requestConfig 参数', () => {
    expect(createXiaohongshuConfig.length).toBe(2)
  })

  // #31 改写：v7 提供默认 timeout（method 由端点声明，不属基线）
  it('#31 改写：设置默认 timeout 10000', () => {
    expect(createXiaohongshuConfig('ck').requestConfig.timeout).toBe(10000)
  })

  // #32 改写：v7 的 cookie 做 trim
  it('#32 改写：cookie 被 trim', () => {
    expect(createXiaohongshuConfig('  ck  ').headers.get('cookie')).toBe('ck')
  })

  it('cookie 为 undefined 时头为空字符串', () => {
    expect(createXiaohongshuConfig(undefined).headers.get('cookie')).toBe('')
  })

  // #33 改写：v7 的 sec-ch-ua 按 UA 的 Chrome 版本动态生成，不再写死 Edge 指纹
  it('#33 改写：sec-ch-ua 与 user-agent 一致，不再写死 Edge', () => {
    const { headers } = createXiaohongshuConfig('ck')
    expect(headers.get('sec-ch-ua')).toContain('"Chromium";v="141"')
    expect(headers.get('sec-ch-ua')).not.toContain('Microsoft Edge')
  })

  it('默认头集合被锁定', () => {
    expect(Object.keys(asHeaders(getXiaohongshuDefaultConfig('ck'))).sort()).toMatchSnapshot()
  })
})
