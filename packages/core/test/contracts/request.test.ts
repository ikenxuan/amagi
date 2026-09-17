import { AmagiHeaders } from 'amagi/contracts/request'
/**
 * contracts/request 的运行时契约。
 *
 * 重点是 `AmagiHeaders` 的大小写不敏感：v6 里 B站 qtparam 一处取
 * `headers.Cookie`、一处取 `headers.cookie`，后者恒 undefined；小红书默认
 * 配置全小写而调用方覆盖时写 `Cookie` 覆盖不上。这些缺陷的根因就是
 * 「header 是普通对象」，本类把大小写这个变量消掉。
 */
import { describe, expect, it } from 'vitest'

describe('contracts/request - AmagiHeaders 大小写不敏感读取', () => {
  it('大写写入，三种大小写都能读到同一个值', () => {
    const h = new AmagiHeaders({ 'User-Agent': 'ua/1' })
    expect(h.get('user-agent')).toBe('ua/1')
    expect(h.get('User-Agent')).toBe('ua/1')
    expect(h.get('USER-AGENT')).toBe('ua/1')
    expect(h.get('user-agent')).toBe(h.get('User-Agent'))
  })

  it('小写写入，三种大小写都能读到同一个值', () => {
    const h = new AmagiHeaders({ 'user-agent': 'ua/2' })
    expect(h.get('user-agent')).toBe('ua/2')
    expect(h.get('User-Agent')).toBe('ua/2')
    expect(h.get('uSeR-aGeNt')).toBe('ua/2')
  })

  it('混合大小写写入，三种大小写都能读到同一个值', () => {
    const h = new AmagiHeaders({ 'UsEr-AgEnT': 'ua/3' })
    expect(h.get('user-agent')).toBe('ua/3')
    expect(h.get('User-Agent')).toBe('ua/3')
    expect(h.get('USER-AGENT')).toBe('ua/3')
  })

  it('has / delete 同样大小写不敏感', () => {
    const h = new AmagiHeaders({ Cookie: 'a=1' })
    expect(h.has('cookie')).toBe(true)
    expect(h.has('COOKIE')).toBe(true)
    expect(h.delete('cOoKiE')).toBe(true)
    expect(h.has('Cookie')).toBe(false)
    expect(h.delete('cookie')).toBe(false)
  })
})

describe('contracts/request - AmagiHeaders 写入语义', () => {
  it('同名不同大小写只留一条，后写覆盖值与显示大小写', () => {
    const h = new AmagiHeaders({ 'User-Agent': 'old' })
    h.set('user-agent', 'new')
    expect(h.size).toBe(1)
    expect(h.get('User-Agent')).toBe('new')
    expect(h.toJSON()).toEqual({ 'user-agent': 'new' })
  })

  it('数字值转成字符串', () => {
    expect(new AmagiHeaders({ 'Content-Length': 12 }).get('content-length')).toBe('12')
  })

  it('undefined / null 视为不写入', () => {
    const h = new AmagiHeaders({ Cookie: undefined, Referer: null, 'User-Agent': 'ua' })
    expect(h.size).toBe(1)
    expect(h.has('cookie')).toBe(false)
    expect(h.has('referer')).toBe(false)
    h.set('Cookie', undefined)
    expect(h.has('cookie')).toBe(false)
  })

  it('set 返回自身，可链式调用', () => {
    const h = new AmagiHeaders().set('a', '1').set('B', '2')
    expect(h.toJSON()).toEqual({ a: '1', B: '2' })
  })
})

describe('contracts/request - AmagiHeaders 合并与拷贝', () => {
  it('merge 后来者覆盖，且跨大小写生效（修 Cookie 覆盖不上）', () => {
    const base = new AmagiHeaders({ 'user-agent': 'base-ua', cookie: 'base-ck' })
    base.merge({ Cookie: 'override-ck' })
    expect(base.get('cookie')).toBe('override-ck')
    expect(base.size).toBe(2)
  })

  it('merge 接受另一个 AmagiHeaders', () => {
    const a = new AmagiHeaders({ 'X-A': '1' })
    const b = new AmagiHeaders({ 'x-b': '2' }).merge(a)
    expect(b.toJSON()).toEqual({ 'x-b': '2', 'X-A': '1' })
  })

  it('merge 传 undefined / null 是空操作', () => {
    const h = new AmagiHeaders({ a: '1' })
    expect(h.merge(undefined).merge(null).size).toBe(1)
  })

  it('clone 是深拷贝，改副本不影响原件（A14 的防线）', () => {
    const origin = new AmagiHeaders({ Cookie: 'origin' })
    const copy = origin.clone()
    copy.set('cookie', 'mutated').set('X-New', '1')
    expect(origin.get('cookie')).toBe('origin')
    expect(origin.has('x-new')).toBe(false)
    expect(copy.get('cookie')).toBe('mutated')
  })

  it('keys / toEntries 保留最后一次写入的大小写', () => {
    const h = new AmagiHeaders({ 'user-agent': 'ua' })
    h.set('User-Agent', 'ua2')
    expect(h.keys()).toEqual(['User-Agent'])
    expect(h.toEntries()).toEqual([['User-Agent', 'ua2']])
  })

  it('空容器的形状', () => {
    const h = new AmagiHeaders()
    expect(h.size).toBe(0)
    expect(h.keys()).toEqual([])
    expect(h.toJSON()).toEqual({})
    expect(h.get('anything')).toBeUndefined()
  })
})
