import { xiaohongshuSign } from 'amagi/platform/xiaohongshu/sign'
import { describe, expect, it } from 'vitest'

import { freezeEntropy } from '../helpers/deterministic'

const A1 = '1900000000abcdef0123456789abcdef'
const COOKIE = 'a1=' + A1 + '; web_session=040069abc; webId=deadbeef'

describe('extractA1FromCookie', () => {
  it('取出 a1 的值', () => {
    expect(xiaohongshuSign.extractA1FromCookie(COOKIE)).toBe(A1)
  })

  it.each([
    ['a1 在首位', 'a1=v1; b=2', 'v1'],
    ['a1 在中间', 'x=0; a1=v2; b=2', 'v2'],
    ['a1 在末尾', 'x=0; a1=v3', 'v3'],
    ['无 a1', 'x=0; b=2', ''],
    ['空 cookie', '', ''],
    ['a1 值为空', 'a1=; b=2', '']
  ])('%s', (_label, cookie, expected) => {
    expect(xiaohongshuSign.extractA1FromCookie(cookie)).toBe(expected)
  })

  // 实现是 cookieString.match(/a1=([^;]+)/)，键名两侧都没有锚点，
  // 任何以 a1 结尾的键（xa1 / ba1 / webida1 ...）都会被当成 a1 命中。
  // 小红书签名完全依赖 a1，取错值等于签名必然失败。
  it.each([
    ['xa1=nope', 'nope'],
    ['ba1=nope', 'nope'],
    ['other_a1=nope', 'nope']
  ])('KNOWN-DEFECT: %s 被误识别为 a1', (cookie, wrong) => {
    expect(xiaohongshuSign.extractA1FromCookie(cookie)).toBe(wrong)
  })

  it('KNOWN-DEFECT: 前缀键排在真 a1 之前时会取到错误的值', () => {
    expect(xiaohongshuSign.extractA1FromCookie('xa1=WRONG; a1=RIGHT')).toBe('WRONG')
  })

  it('a10=nope 不含 a1= 子串，因此返回空', () => {
    expect(xiaohongshuSign.extractA1FromCookie('a10=nope')).toBe('')
  })
})

describe('generateXT', () => {
  it('返回毫秒时间戳（数字）', () => {
    freezeEntropy()
    const xt = xiaohongshuSign.generateXT()
    expect(typeof xt).toBe('number')
    expect(xt).toBe(1767322445678)
  })

  it('时间推进后返回值变化', () => {
    freezeEntropy(1000)
    const a = xiaohongshuSign.generateXT()
    freezeEntropy(2000)
    const b = xiaohongshuSign.generateXT()
    expect(b).toBeGreaterThan(a)
  })
})

describe('generateXB3Traceid', () => {
  it('返回 16 位十六进制字符串', () => {
    freezeEntropy()
    expect(xiaohongshuSign.generateXB3Traceid()).toMatch(/^[0-9a-f]{16}$/)
  })

  it('多次调用值不同', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 20; i++) seen.add(xiaohongshuSign.generateXB3Traceid())
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('generateXSGet', () => {
  it('固定入参下输出稳定', () => {
    freezeEntropy()
    expect(xiaohongshuSign.generateXSGet('/api/sns/web/v1/feed', A1)).toMatchSnapshot()
  })

  it('返回非空字符串', () => {
    const xs = xiaohongshuSign.generateXSGet('/api/sns/web/v1/feed', A1)
    expect(typeof xs).toBe('string')
    expect(xs.length).toBeGreaterThan(10)
  })

  it('path 不同则签名不同', () => {
    freezeEntropy()
    const a = xiaohongshuSign.generateXSGet('/api/sns/web/v1/feed', A1)
    freezeEntropy()
    const b = xiaohongshuSign.generateXSGet('/api/sns/web/v1/other', A1)
    expect(b).not.toBe(a)
  })

  it('a1 不同则签名不同', () => {
    freezeEntropy()
    const a = xiaohongshuSign.generateXSGet('/api/sns/web/v1/feed', A1)
    freezeEntropy()
    const b = xiaohongshuSign.generateXSGet('/api/sns/web/v1/feed', A1.replace('1900', '1901'))
    expect(b).not.toBe(a)
  })

  it('query 参数参与签名', () => {
    freezeEntropy()
    const a = xiaohongshuSign.generateXSGet('/api/x', A1, 'xhs-pc-web', {})
    freezeEntropy()
    const b = xiaohongshuSign.generateXSGet('/api/x', A1, 'xhs-pc-web', { note_id: 'n1' })
    expect(b).not.toBe(a)
  })

  it('a1 为空字符串时抛出明确错误', () => {
    expect(() => xiaohongshuSign.generateXSGet('/api/x', '')).toThrow(/a1Value cannot be empty/)
  })
})

describe('generateXSPost', () => {
  it('固定入参下输出稳定', () => {
    freezeEntropy()
    expect(xiaohongshuSign.generateXSPost('/api/sns/web/v1/homefeed', A1, 'xhs-pc-web', { num: 20 })).toMatchSnapshot()
  })

  it('body 不同则签名不同', () => {
    freezeEntropy()
    const a = xiaohongshuSign.generateXSPost('/api/x', A1, 'xhs-pc-web', { num: 20 })
    freezeEntropy()
    const b = xiaohongshuSign.generateXSPost('/api/x', A1, 'xhs-pc-web', { num: 21 })
    expect(b).not.toBe(a)
  })

  it('空 body 不抛错', () => {
    expect(() => xiaohongshuSign.generateXSPost('/api/x', A1)).not.toThrow()
  })

  it('GET 与 POST 的签名结果不同', () => {
    freezeEntropy()
    const get = xiaohongshuSign.generateXSGet('/api/x', A1)
    freezeEntropy()
    const post = xiaohongshuSign.generateXSPost('/api/x', A1)
    expect(post).not.toBe(get)
  })
})

describe('generateXSCommon', () => {
  it('固定 cookie 下输出稳定', () => {
    freezeEntropy()
    expect(xiaohongshuSign.generateXSCommon(COOKIE)).toMatchSnapshot()
  })

  it('返回非空字符串', () => {
    expect(xiaohongshuSign.generateXSCommon(COOKIE).length).toBeGreaterThan(10)
  })

  it('cookie 里没有 a1 时抛出明确错误', () => {
    expect(() => xiaohongshuSign.generateXSCommon('')).toThrow(/Missing 'a1' in cookies/)
    expect(() => xiaohongshuSign.generateXSCommon('web_session=1')).toThrow(/Missing 'a1' in cookies/)
  })
})

describe('getSearchId', () => {
  it('返回字符串', () => {
    freezeEntropy()
    expect(typeof xiaohongshuSign.getSearchId()).toBe('string')
  })

  // (BigInt(Date.now()) << 64n) + BigInt(...).toString(36) —— 左边是 BigInt，
  // 右边先 toString(36) 变成 string，于是整个表达式退化为字符串拼接。
  it('KNOWN-DEFECT: BigInt 与 string 相加导致结果是十进制拼 base36，而非预期的位运算值', () => {
    freezeEntropy()
    const id = xiaohongshuSign.getSearchId()
    expect(id).toMatch(/^\d+[0-9a-z]+$/)
    expect(id.startsWith(String(BigInt(1767322445678) << 64n))).toBe(true)
  })
})
