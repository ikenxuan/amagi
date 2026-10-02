import { decodeVerifyFp, genVerifyFp, MS_TOKEN_ALPHABET } from 'amagi/platforms/douyin/sign/tokens'
import { inspectXhsHeader } from 'amagi/platforms/xiaohongshu/sign/shape'
import { describe, expect, it } from 'vitest'

import { freezeEntropy } from '../../helpers/deterministic'

describe('decodeVerifyFp', () => {
  it('自己生成的值：骨架全过、时钟原样读回', () => {
    freezeEntropy(1789010742567)
    const value = genVerifyFp()
    const decoded = decodeVerifyFp(value)

    expect(decoded.problems).toEqual([])
    expect(decoded.timestampMs).toBe(1789010742567)
  })

  it('手写的老值也能拆（字母表与骨架是站点的，不是我们生成的）', () => {
    const decoded = decodeVerifyFp('verify_li8m2uqw_k1234abc_d4xy_4xyz_89ab_cdefgh012345')
    // 骨架位全对；时钟还原即 36 进制段
    expect(decoded.problems).toEqual([])
    expect(decoded.timestampMs).toBe(Number.parseInt('li8m2uqw', 36))
  })

  it.each([
    ['前缀不对', 's_v_web_id=li8m2uqw_k1234abc_d4xy_4xyz_89ab_cdefgh012345', ['prefix']],
    ['尾巴长度不对', 'verify_li8m2uqw_k1234abc_d4xy_4xyz_89ab_cdefgh01234', ['tail length']],
    ['分隔符错位', 'verify_li8m2uqw_k1234abcXd4xy_4xyz_89ab_cdefgh012345', ['separators']]
  ])('拦截：%s', (_name, value, problems) => {
    expect(decodeVerifyFp(value).problems).toEqual(problems)
  })

  it('版本位/变体位被动过会点名', () => {
    const good = genVerifyFp({ nowMs: 1789010742567, rng: () => 0.9 })
    const tail = good.slice('verify_'.length + 'li8m2uqw'.length + 1)
    // 版本位在下标 14
    const brokenVersion = `verify_li8m2uqw_${tail.slice(0, 14)}5${tail.slice(15)}`
    expect(decodeVerifyFp(brokenVersion).problems).toContain('version')
    // 变体位在下标 19，只认 89AB
    const brokenVariant = `verify_li8m2uqw_${tail.slice(0, 19)}1${tail.slice(20)}`
    expect(decodeVerifyFp(brokenVariant).problems).toContain('variant')
  })

  it('假 msToken 不该被误认成 verify_fp', () => {
    const msToken = `${Array.from({ length: 126 }, () => MS_TOKEN_ALPHABET[0]).join('')}==`
    expect(decodeVerifyFp(msToken).problems).toContain('prefix')
  })
})

describe('inspectXhsHeader', () => {
  it('x-s：XYS_ 与 XYW_ 两种格式都认，前缀之外还有内容', () => {
    expect(inspectXhsHeader('x-s', 'XYS_AAAABBBB')).toMatchObject({ format: 'XYS', problems: [] })
    expect(inspectXhsHeader('x-s', 'XYW_AAAABBBB')).toMatchObject({ format: 'XYW', problems: [] })
    expect(inspectXhsHeader('x-s', 'AAAA')?.problems.length).toBeGreaterThan(0)
    expect(inspectXhsHeader('x-s', 'XYW_')?.problems.length).toBeGreaterThan(0)
  })

  it('x-t：13 位毫秒；秒级时间戳会被点名', () => {
    expect(inspectXhsHeader('x-t', String(1789010742567)).problems).toEqual([])
    expect(inspectXhsHeader('x-t', String(1789010742)).problems.length).toBeGreaterThan(0)
  })

  it('两个 traceid 各自的长度与字符集', () => {
    expect(inspectXhsHeader('x-b3-traceid', '0123456789abcdef').problems).toEqual([])
    expect(inspectXhsHeader('x-b3-traceid', '0123456789ABCDEF').problems.length).toBeGreaterThan(0)
    expect(inspectXhsHeader('x-xray-traceid', 'a'.repeat(32)).problems).toEqual([])
    expect(inspectXhsHeader('x-xray-traceid', 'a'.repeat(31)).problems.length).toBeGreaterThan(0)
  })

  it('x-s-common：不透明，只查非空', () => {
    expect(inspectXhsHeader('x-s-common', 'whatever-opaque').problems).toEqual([])
    expect(inspectXhsHeader('x-s-common', '').problems.length).toBeGreaterThan(0)
  })
})
