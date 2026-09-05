import amagi, {
  bilibiliFetcher,
  createBoundBilibiliFetcher,
  createBoundDouyinFetcher,
  createBoundKuaishouFetcher,
  createBoundXiaohongshuFetcher,
  douyinFetcher,
  kuaishouFetcher,
  xiaohongshuFetcher
} from 'amagi/index'
/**
 * Fetcher 方法面契约。
 *
 * v6 对外提供三套等价入口，任何一处漏挂方法都会让用户在某条路径上「用不了」：
 *   1. `amagi.douyinFetcher.xxx(options, cookie, requestConfig)`
 *   2. `createBoundDouyinFetcher(cookie).xxx(options, requestConfig)`
 *   3. `amagi({cookies}).douyin.fetcher.xxx(options, requestConfig)`
 */
import { describe, expect, it } from 'vitest'

const PLATFORMS = [
  ['douyin', douyinFetcher, createBoundDouyinFetcher('ck')],
  ['bilibili', bilibiliFetcher, createBoundBilibiliFetcher('ck')],
  ['kuaishou', kuaishouFetcher, createBoundKuaishouFetcher('ck')],
  ['xiaohongshu', xiaohongshuFetcher, createBoundXiaohongshuFetcher('ck')]
] as const

/** passport 登录带会话，v6 有意不进 bound fetcher */
const BOUND_EXCLUSIONS: Record<string, string[]> = {
  douyin: ['requestPassportQrcode', 'checkPassportQrcode', 'sendPassportVerifyCode', 'validatePassportVerifyCode'],
  bilibili: [],
  kuaishou: [],
  xiaohongshu: []
}

describe.each(PLATFORMS)('%s fetcher', (name, fetcher, bound) => {
  it('方法名列表被锁定', () => {
    expect(Object.keys(fetcher as object).sort()).toMatchSnapshot()
  })

  it('所有成员都是函数', () => {
    for (const [key, value] of Object.entries(fetcher as object)) {
      expect(typeof value, key + ' 应为函数').toBe('function')
    }
  })

  it('bound fetcher 方法名列表被锁定', () => {
    expect(Object.keys(bound as object).sort()).toMatchSnapshot()
  })

  it('bound fetcher 覆盖了非 passport 的全部方法', () => {
    const expected = Object.keys(fetcher as object)
      .filter((k) => !BOUND_EXCLUSIONS[name].includes(k))
      .sort()
    expect(Object.keys(bound as object).sort()).toEqual(expected)
  })

  it('bound fetcher 有意排除的方法确实不存在', () => {
    for (const excluded of BOUND_EXCLUSIONS[name]) {
      expect(bound as unknown as Record<string, unknown>).not.toHaveProperty(excluded)
    }
  })
})

describe('client.<platform>.fetcher 与 createBound<Platform>Fetcher 等价', () => {
  const client = amagi({ cookies: { douyin: 'a', bilibili: 'b', kuaishou: 'c', xiaohongshu: 'd' } })

  it.each([
    ['douyin', createBoundDouyinFetcher('a')],
    ['bilibili', createBoundBilibiliFetcher('b')],
    ['kuaishou', createBoundKuaishouFetcher('c')],
    ['xiaohongshu', createBoundXiaohongshuFetcher('d')]
  ] as const)('%s 的方法集合一致', (platform, bound) => {
    expect(Object.keys(client[platform].fetcher).sort()).toEqual(Object.keys(bound as object).sort())
  })
})

describe('fetcher 方法命名约定', () => {
  const ALLOWED_PREFIXES = ['fetch', 'search', 'parse', 'request', 'check', 'send', 'validate', 'convert']

  it.each(PLATFORMS)('%s 的方法名前缀落在约定集合内', (_name, fetcher) => {
    const violations = Object.keys(fetcher as object).filter((k) => !ALLOWED_PREFIXES.some((p) => k.startsWith(p)))
    expect(violations).toEqual([])
  })
})

describe('平台工具集 (utils)', () => {
  it.each(['douyin', 'bilibili', 'kuaishou', 'xiaohongshu'] as const)('amagi.%s 的键被锁定', (platform) => {
    expect(Object.keys(amagi[platform]).sort()).toMatchSnapshot()
  })

  it('douyin 工具集含 sign / passport / douyinApiUrls', () => {
    expect(amagi.douyin).toHaveProperty('sign')
    expect(amagi.douyin).toHaveProperty('passport')
    expect(amagi.douyin).toHaveProperty('douyinApiUrls')
  })
})
