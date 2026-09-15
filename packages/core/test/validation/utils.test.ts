import { extractCreatorInfoFromHtml, smartInteger, smartNumber, smartPositiveInteger } from 'amagi/validation/utils'
import { describe, expect, it } from 'vitest'

describe('smartNumber', () => {
  it('默认最小值为 1，且不要求整数', () => {
    const s = smartNumber('值不能为空')
    expect(s.parse(1)).toBe(1)
    expect(s.parse(1.5)).toBe(1.5)
    expect(() => s.parse(0)).toThrow()
  })

  it.each([
    ['字符串数字', '42', 42],
    ['带空格的字符串', ' 42 ', 42],
    ['科学计数法字符串', '1e2', 100],
    ['true', true, 1]
  ])('强转 %s 为 %s', (_label, input, expected) => {
    expect(smartNumber('e', 1).parse(input)).toBe(expected)
  })

  it.each([
    ['空字符串', ''],
    ['非数字字符串', 'abc'],
    ['null', null],
    ['undefined', undefined],
    ['数组', []],
    ['对象', {}],
    ['NaN', Number.NaN]
  ])('拒绝 %s', (_label, input) => {
    expect(() => smartNumber('e', 1).parse(input)).toThrow()
  })

  it('isInteger 为 true 时拒绝小数', () => {
    expect(() => smartNumber('值不能为空', 1, true).parse(1.5)).toThrow()
    expect(smartNumber('值不能为空', 1, true).parse(2)).toBe(2)
  })

  it('自定义 minValue 生效', () => {
    const s = smartNumber('e', 10)
    expect(() => s.parse(9)).toThrow()
    expect(s.parse(10)).toBe(10)
  })

  it('minValue 为 0 时接受 0', () => {
    expect(smartNumber('e', 0).parse(0)).toBe(0)
  })

  it('错误文案会把「不能为空」替换掉后拼接', () => {
    try {
      smartNumber('数量不能为空', 5, true).parse(1)
      throw new Error('should throw')
    } catch (error) {
      const issues = (error as { issues: Array<{ message: string }> }).issues
      expect(issues[0].message).toBe('数量必须大于等于5')
    }
  })

  it('类型错误时使用原始文案', () => {
    try {
      smartNumber('数量不能为空', 1, true).parse('abc')
      throw new Error('should throw')
    } catch (error) {
      const issues = (error as { issues: Array<{ message: string }> }).issues
      expect(issues[0].message).toBe('数量不能为空')
    }
  })
})

describe('smartInteger / smartPositiveInteger', () => {
  it('smartInteger 最小值为 0', () => {
    expect(smartInteger('e').parse(0)).toBe(0)
    expect(() => smartInteger('e').parse(-1)).toThrow()
    expect(() => smartInteger('e').parse(1.5)).toThrow()
  })

  it('smartPositiveInteger 最小值为 1', () => {
    expect(smartPositiveInteger('e').parse(1)).toBe(1)
    expect(() => smartPositiveInteger('e').parse(0)).toThrow()
  })

  it('smartInteger 的自定义最小值生效', () => {
    expect(() => smartInteger('e', 3).parse(2)).toThrow()
    expect(smartInteger('e', 3).parse(3)).toBe(3)
  })
})

describe('extractCreatorInfoFromHtml', () => {
  it('无匹配 script 时返回 null', () => {
    expect(extractCreatorInfoFromHtml('<html></html>')).toBeNull()
  })

  it('解析 __INITIAL_STATE__ 并取出 user.userPageData', () => {
    const html = '<script>window.__INITIAL_STATE__={"user":{"userPageData":{"id":1}}}</script>'
    expect(extractCreatorInfoFromHtml(html)).toEqual({ id: 1 })
  })

  it('把 :undefined 替换为 :null 后再解析', () => {
    const html = '<script>window.__INITIAL_STATE__={"user":{"userPageData":{"id":undefined}}}</script>'
    expect(extractCreatorInfoFromHtml(html)).toEqual({ id: null })
  })

  it('缺少 user.userPageData 时返回 null', () => {
    const html = '<script>window.__INITIAL_STATE__={"other":1}</script>'
    expect(extractCreatorInfoFromHtml(html)).toBeNull()
  })

  it('JSON 非法时返回 null 而不抛出', () => {
    const html = '<script>window.__INITIAL_STATE__={not json}</script>'
    expect(extractCreatorInfoFromHtml(html)).toBeNull()
  })

  it('空字符串返回 null', () => {
    expect(extractCreatorInfoFromHtml('')).toBeNull()
  })
})
