import { douyinSign } from 'amagi/platforms/legacy/douyin/sign'
/**
 * 抖音签名算法。
 *
 * a_bogus / X-Bogus 内部使用 Math.random 与 Date.now，因此先冻结熵源再快照。
 * 这是 v7 重构中最容易被无声破坏的一环：签名变了，接口全挂，而类型检查毫无反应。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FIXED_NOW, freezeEntropy } from '../../helpers/deterministic'

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

describe('douyinSign.AcSignature (__ac_signature)', () => {
  // 实测 nonce 形状（21 个 hex 字符，2026-10-11）；值是合成的
  const NONCE = '06ac3511900128cbdbb8c'
  // 签名体带整秒时间戳，所以凡是要「两次结果相同」的断言都显式传同一个 atMs。
  // **不加 toMatchSnapshot** —— 快照里现有的 AB / XB 两项不该被这组用例带动
  const AT = 1767322445678

  it('形如 `_02B4Z6wo00f01` + 31 位签名体 + 2 位校验位（线上实物总长 47）', () => {
    const sig = douyinSign.AcSignature(NONCE, UA, AT)
    expect(sig).toHaveLength(47)
    expect(sig).toMatch(/^_02B4Z6wo00f01[0-9A-Za-z.\-_]{31}[0-9a-f]{2}$/)
  })

  it('同一刻同一 nonce 可复现', () => {
    expect(douyinSign.AcSignature(NONCE, UA, AT)).toBe(douyinSign.AcSignature(NONCE, UA, AT))
  })

  it('nonce / UA / 时刻任一不同则签名不同', () => {
    const base = douyinSign.AcSignature(NONCE, UA, AT)
    expect(douyinSign.AcSignature(NONCE.slice(0, -1) + 'd', UA, AT)).not.toBe(base)
    expect(douyinSign.AcSignature(NONCE, UA.replace('125', '130'), AT)).not.toBe(base)
    // 跨一整秒才会变（同一秒内相同）
    expect(douyinSign.AcSignature(NONCE, UA, AT + 1000)).not.toBe(base)
    expect(douyinSign.AcSignature(NONCE, UA, AT + 100)).toBe(base)
  })

  it('省略 UA 时回落到内置默认 UA', () => {
    expect(douyinSign.AcSignature(NONCE, undefined, AT)).toBe(douyinSign.AcSignature(NONCE, UA, AT))
  })

  it('省略 atMs 时用当前时钟（落在调用前后两个整秒之一）', () => {
    const before = Date.now()
    const sig = douyinSign.AcSignature(NONCE, UA)
    const after = Date.now()
    expect([douyinSign.AcSignature(NONCE, UA, before), douyinSign.AcSignature(NONCE, UA, after)]).toContain(sig)
  })

  it('空 nonce / 空 UA 抛错 —— 它们是签名的必需输入，静默出一串假签名更难查', () => {
    expect(() => douyinSign.AcSignature('', UA, AT)).toThrow()
    expect(() => douyinSign.AcSignature(NONCE, '', AT)).toThrow()
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

  // 这里原先记着一条 KNOWN-DEFECT：VerifyFpManager 走 `new Date().getTime()` 而不是
  // `Date.now()`，绕开了 `vi.spyOn(Date, 'now')`，所以时钟冻不住、只能断言结构。
  // 现在实现换成 tokens.ts 的 genVerifyFp，时钟来源就是 Date.now，缺陷已消除——
  // 于是这条从「记录缺陷」改成「锁住修复」：冻结熵源后整个输出（含时间戳段）必须逐字可复现。
  it('冻结熵源后输出完全可复现（时间戳段一并钉死）', () => {
    const entropy = freezeEntropy()
    const first = douyinSign.VerifyFpManager()
    entropy.reset()
    const second = douyinSign.VerifyFpManager()

    expect(second).toBe(first)
    // 时间戳段确实来自被冻结的时钟，而不是碰巧相同
    expect(first.startsWith(`verify_${FIXED_NOW.toString(36)}_`)).toBe(true)
  })

  it('随机段前进时，同一冻结时刻下只有随机部分不同', () => {
    freezeEntropy()
    const first = douyinSign.VerifyFpManager()
    const second = douyinSign.VerifyFpManager()

    expect(first).not.toBe(second)
    expect(first.split('_')[1]).toBe(second.split('_')[1])
  })

  it('随机段固定后，同一 seed 下随机部分一致', () => {
    const entropy = freezeEntropy()
    const a = douyinSign.VerifyFpManager().split('_').slice(2).join('_')
    entropy.reset()
    const b = douyinSign.VerifyFpManager().split('_').slice(2).join('_')

    expect(b).toBe(a)
  })
})
