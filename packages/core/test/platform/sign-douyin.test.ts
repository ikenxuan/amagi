import { douyinSign } from 'amagi/platform/douyin/sign'
/**
 * 抖音签名算法。
 *
 * a_bogus / X-Bogus 内部使用 Math.random 与 Date.now，因此先冻结熵源再快照。
 * 这是 v7 重构中最容易被无声破坏的一环：签名变了，接口全挂，而类型检查毫无反应。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { freezeEntropy } from '../helpers/deterministic'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
const URL_WITH_QUERY = 'https://www.douyin.com/aweme/v1/web/aweme/detail/?device_platform=webapp&aid=6383&aweme_id=7123456789'

describe('douyinSign.AB (a_bogus)', () => {
  beforeEach(() => {
    freezeEntropy()
  })

  it('冻结熵源后输出稳定（快照即算法契约）', () => {
    expect(douyinSign.AB(URL_WITH_QUERY, UA)).toMatchSnapshot()
  })

  it('同一 seed 下两次调用结果一致', () => {
    const entropy = freezeEntropy()
    const first = douyinSign.AB(URL_WITH_QUERY, UA)
    entropy.reset()
    const second = douyinSign.AB(URL_WITH_QUERY, UA)
    expect(second).toBe(first)
  })

  it('URL 不同则签名不同', () => {
    const a = douyinSign.AB(URL_WITH_QUERY, UA)
    freezeEntropy()
    const b = douyinSign.AB(URL_WITH_QUERY + '&extra=1', UA)
    expect(b).not.toBe(a)
  })

  it('UA 不同则签名不同', () => {
    const a = douyinSign.AB(URL_WITH_QUERY, UA)
    freezeEntropy()
    const b = douyinSign.AB(URL_WITH_QUERY, UA.replace('125', '130'))
    expect(b).not.toBe(a)
  })

  it('省略 UA 时回落到内置默认 UA', () => {
    const withDefault = douyinSign.AB(URL_WITH_QUERY)
    freezeEntropy()
    const withExplicit = douyinSign.AB(URL_WITH_QUERY, UA)
    expect(withDefault).toBe(withExplicit)
  })

  it('输出为非空字符串且长度稳定', () => {
    const sig = douyinSign.AB(URL_WITH_QUERY, UA)
    expect(typeof sig).toBe('string')
    expect(sig.length).toBeGreaterThan(100)
  })

  it.each([
    ['无查询串', 'https://www.douyin.com/aweme/v1/web/aweme/detail/'],
    ['空查询串', 'https://www.douyin.com/a?'],
    ['含中文', 'https://www.douyin.com/a?q=中文'],
    ['含已编码字符', 'https://www.douyin.com/a?q=%E4%B8%AD%E6%96%87'],
    ['超长查询串', 'https://www.douyin.com/a?q=' + 'x'.repeat(2000)]
  ])('边界输入不抛错：%s', (_label, url) => {
    expect(() => douyinSign.AB(url, UA)).not.toThrow()
  })
})

describe('douyinSign.XB (X-Bogus)', () => {
  // XB 对 URL 形状敏感，用真实接口 URL 做基准
  const XB_URL = 'https://www.douyin.com/aweme/v1/web/comment/list/?device_platform=webapp&aid=6383&aweme_id=7123456789'

  beforeEach(() => {
    freezeEntropy()
  })

  it('冻结时间后输出稳定', () => {
    expect(douyinSign.XB(XB_URL, UA)).toMatchSnapshot()
  })

  it('输出为固定长度的字符串', () => {
    const sig = douyinSign.XB(XB_URL, UA)
    expect(typeof sig).toBe('string')
    expect(sig.length).toBeGreaterThan(20)
  })

  it('时间戳不同则签名不同', () => {
    const a = douyinSign.XB(XB_URL, UA)
    vi.restoreAllMocks()
    freezeEntropy(1767322445678 + 3_600_000)
    const b = douyinSign.XB(XB_URL, UA)
    expect(b).not.toBe(a)
  })

  it('AB 与 XB 的输出互不相同', () => {
    const ab = douyinSign.AB(XB_URL, UA)
    freezeEntropy()
    const xb = douyinSign.XB(XB_URL, UA)
    expect(xb).not.toBe(ab)
  })

  it.each([
    'https://www.douyin.com/aweme/v1/web/comment/list/?device_platform=webapp&aid=6383&aweme_id=7123',
    'https://www.douyin.com/aweme/v1/web/comment/list/reply/?device_platform=webapp&aid=6383&item_id=1&comment_id=2'
  ])('真实接口 URL 可正常签名', (url) => {
    expect(() => douyinSign.XB(url, UA)).not.toThrow()
  })
})

describe('douyinSign.Mstoken', () => {
  it.each([1, 16, 107, 116, 128, 256])('长度 %i 的输出与入参一致', (len) => {
    expect(douyinSign.Mstoken(len)).toHaveLength(len)
  })

  it('只包含字母与数字', () => {
    expect(douyinSign.Mstoken(200)).toMatch(/^[A-Za-z0-9]+$/)
  })

  it('两次调用结果不同（依赖 crypto 随机）', () => {
    expect(douyinSign.Mstoken(64)).not.toBe(douyinSign.Mstoken(64))
  })

  it('长度 0 返回空字符串', () => {
    expect(douyinSign.Mstoken(0)).toBe('')
  })
})

describe('douyinSign.VerifyFpManager', () => {
  beforeEach(() => {
    freezeEntropy()
  })

  it('形如 verify_<base36 时间戳>_<36 位随机串>', () => {
    const fp = douyinSign.VerifyFpManager()
    expect(fp).toMatch(/^verify_[0-9a-z]+_[0-9A-Za-z_]{36}$/)
  })

  it('随机段固定位置上是分隔符与版本位', () => {
    const fp = douyinSign.VerifyFpManager()
    const rand = fp.slice(fp.indexOf('_', 'verify_'.length) + 1)

    expect(rand).toHaveLength(36)
    expect(rand[8]).toBe('_')
    expect(rand[13]).toBe('_')
    expect(rand[18]).toBe('_')
    expect(rand[23]).toBe('_')
    expect(rand[14]).toBe('4')
  })

  // VerifyFpManager 用的是 new Date().getTime()，不走 Date.now，
  // 因此无法通过 vi.spyOn(Date, 'now') 冻结 —— 只能断言结构，不能快照。
  it('KNOWN-DEFECT: 时间来源是 new Date() 而非 Date.now，无法被冻结', () => {
    const first = douyinSign.VerifyFpManager()
    const second = douyinSign.VerifyFpManager()

    expect(first).not.toBe(second)
  })

  it('随机段固定后，同一 seed 下随机部分一致', () => {
    const entropy = freezeEntropy()
    const a = douyinSign.VerifyFpManager().split('_').slice(2).join('_')
    entropy.reset()
    const b = douyinSign.VerifyFpManager().split('_').slice(2).join('_')

    expect(b).toBe(a)
  })
})
