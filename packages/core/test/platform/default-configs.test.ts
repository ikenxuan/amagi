import {
  getBilibiliDefaultConfig,
  getDouyinDefaultConfig,
  getKuaishouDefaultConfig,
  getXiaohongshuDefaultConfig
} from 'amagi/platform/defaultConfigs'
/**
 * 四个平台的默认请求配置。
 *
 * v6 在这里硬编码了四份互不相同的浏览器指纹（含四个不同的 Chrome 版本），
 * 且 header 大小写风格不统一。这些差异是后续多处静默 bug 的根源，
 * 所以逐条钉死，v7 统一时必须显式改测试。
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

  // 只有小红书用小写，导致 networks 的 cleanUserAgent 与
  // resolveBoundRequest 的 Cookie 覆盖都对它失效。
  it('KNOWN-DEFECT: 小红书使用小写风格', () => {
    const headers = asHeaders(getXiaohongshuDefaultConfig('ck'))
    expect(headers).toHaveProperty('cookie')
    expect(headers).toHaveProperty('user-agent')
    expect(headers).not.toHaveProperty('Cookie')
    expect(headers).not.toHaveProperty('User-Agent')
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
  // 只有它的签名是 (cookie) 而不是 (cookie, requestConfig)。
  it('KNOWN-DEFECT: 不接受 requestConfig 参数', () => {
    expect(getXiaohongshuDefaultConfig.length).toBe(1)
  })

  it('KNOWN-DEFECT: 不设置 method 与 timeout', () => {
    const config = getXiaohongshuDefaultConfig('ck') as Record<string, unknown>
    expect(config.method).toBeUndefined()
    expect(config.timeout).toBeUndefined()
  })

  it('KNOWN-DEFECT: cookie 不做 trim（其他三个平台会）', () => {
    expect(asHeaders(getXiaohongshuDefaultConfig('  ck  ')).cookie).toBe('  ck  ')
  })

  it('cookie 为 undefined 时头为空字符串', () => {
    expect(asHeaders(getXiaohongshuDefaultConfig(undefined)).cookie).toBe('')
  })

  it('KNOWN-DEFECT: sec-ch-ua 是写死的 Edge 指纹，与 user-agent 不一致的浏览器声明', () => {
    const headers = asHeaders(getXiaohongshuDefaultConfig('ck'))
    expect(headers['sec-ch-ua']).toContain('Microsoft Edge')
  })

  it('默认头集合被锁定', () => {
    expect(Object.keys(asHeaders(getXiaohongshuDefaultConfig('ck'))).sort()).toMatchSnapshot()
  })
})
