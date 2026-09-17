import { getCookieValue, parseCookie, serializeCookie } from 'amagi/contracts/cookie'
/**
 * contracts/cookie 的运行时契约。
 *
 * 核心是 A8 的修正：v6 小红书 `extractA1FromCookie` 用 `/a1=([^;]+)/`，
 * 键名两侧都没有边界，于是 `'xa1=WRONG; a1=RIGHT'` 取到 `'WRONG'`。
 * a1 取错 → x-s 签名必然失败 → 接口返回风控页，链路很长，所以这里钉得细一些。
 */
import { describe, expect, it } from 'vitest'

describe('contracts/cookie - getCookieValue 按名精确匹配（A8）', () => {
  it("判据：getCookieValue('xa1=WRONG; a1=RIGHT', 'a1') === 'RIGHT'", () => {
    expect(getCookieValue('xa1=WRONG; a1=RIGHT', 'a1')).toBe('RIGHT')
  })

  it("前缀干扰项在后也不会取错：'a1=RIGHT; xa1=WRONG'", () => {
    expect(getCookieValue('a1=RIGHT; xa1=WRONG', 'a1')).toBe('RIGHT')
  })

  it("只有前缀干扰项时返回 undefined（v6 会返回 'nope'）", () => {
    expect(getCookieValue('xa1=nope', 'a1')).toBeUndefined()
  })

  it("后缀干扰项同样不会误命中：'a1x=WRONG; a1=RIGHT'", () => {
    expect(getCookieValue('a1x=WRONG; a1=RIGHT', 'a1')).toBe('RIGHT')
    expect(getCookieValue('a1x=WRONG', 'a1')).toBeUndefined()
  })

  it('名字大小写敏感（RFC 6265）', () => {
    expect(getCookieValue('a1=lower', 'A1')).toBeUndefined()
    expect(getCookieValue('A1=upper', 'a1')).toBeUndefined()
    expect(getCookieValue('a1=lower', 'a1')).toBe('lower')
  })

  it('空输入安全返回 undefined', () => {
    expect(getCookieValue('', 'a1')).toBeUndefined()
    expect(getCookieValue(undefined, 'a1')).toBeUndefined()
    expect(getCookieValue(null, 'a1')).toBeUndefined()
    expect(getCookieValue('a1=x', '')).toBeUndefined()
  })
})

describe('contracts/cookie - parseCookie', () => {
  it('解析多条 cookie', () => {
    expect(parseCookie('a1=1; web_session=2; ttwid=3')).toEqual({ a1: '1', web_session: '2', ttwid: '3' })
  })

  it('名与值两端去空白（修 #32：v6 小红书不 trim）', () => {
    expect(parseCookie('  a1  =  RIGHT  ;  b = 2 ')).toEqual({ a1: 'RIGHT', b: '2' })
  })

  it('值里可以含 =（按第一个 = 分割）', () => {
    expect(parseCookie('token=abc=def==')).toEqual({ token: 'abc=def==' })
  })

  it('同名后者覆盖前者', () => {
    expect(parseCookie('a1=first; a1=second')).toEqual({ a1: 'second' })
  })

  it('跳过没有 = 或名为空的片段', () => {
    expect(parseCookie('novalue; =orphan; ; a1=ok')).toEqual({ a1: 'ok' })
  })

  it('允许空串值', () => {
    expect(parseCookie('a1=; b=2')).toEqual({ a1: '', b: '2' })
  })

  it('空输入返回空对象', () => {
    expect(parseCookie('')).toEqual({})
    expect(parseCookie(undefined)).toEqual({})
    expect(parseCookie(null)).toEqual({})
  })

  it('不做 URL 解码（签名依赖原始字节）', () => {
    expect(parseCookie('a1=a%20b%3D')).toEqual({ a1: 'a%20b%3D' })
  })
})

describe('contracts/cookie - serializeCookie', () => {
  it('序列化为 Cookie 头形式', () => {
    expect(serializeCookie({ a1: '1', web_session: '2' })).toBe('a1=1; web_session=2')
  })

  it('跳过 undefined / null，保留空串', () => {
    expect(serializeCookie({ a1: '1', gone: undefined, nulled: null, empty: '' })).toBe('a1=1; empty=')
  })

  it('数字值转成字符串', () => {
    expect(serializeCookie({ n: 12 })).toBe('n=12')
  })

  it('空对象序列化为空串', () => {
    expect(serializeCookie({})).toBe('')
    expect(serializeCookie({ gone: undefined })).toBe('')
  })

  it('与 parseCookie 往返一致', () => {
    const origin = 'a1=RIGHT; web_session=abc=def; ttwid=3'
    expect(serializeCookie(parseCookie(origin))).toBe(origin)
  })
})
