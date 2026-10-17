import { createClient } from 'amagi/client/createClient'
import amagi from 'amagi/index'
import { describe, expect, it } from 'vitest'
/**
 * client.<platform>.login 的条件属性类型。
 *
 * 四个平台（douyin / bilibili / xiaohongshu / kuaishou）现在都实现了扫码登录，
 * 所以 `client.<平台>.login` 一律编译期可见。这组判据原本还负责「kuaishou 没有
 * login 时访问它是编译错误」，kuaishou 扫码登录落地后那条反向断言删除。
 *
 * 后半段（阶段 9.1 修 BUG-1）把同一组判据钉在**默认导出**上：BUG-1 的复现片段
 * `amagi({ cookies: { douyin: ck } }).douyin.login.qrcode()` 原本是 TS2339
 * （默认导出返回的是 v6 门面），换门面之后必须编译通过。
 */
import { expectTypeOf } from 'vitest'

const client = createClient({})

describe('client.<platform>.login 的类型', () => {
  it('四平台都有 login（编译期可见）', () => {
    expectTypeOf(client.douyin.login).not.toBeUndefined()
    expectTypeOf(client.bilibili.login).not.toBeUndefined()
    expectTypeOf(client.xiaohongshu.login).not.toBeUndefined()
    expectTypeOf(client.kuaishou.login).not.toBeUndefined()
    expect(typeof client.douyin.login.qrcode).toBe('function')
    expect(typeof client.douyin.login.resume).toBe('function')
    expect(typeof client.xiaohongshu.login.qrcode).toBe('function')
    expect(typeof client.kuaishou.login.qrcode).toBe('function')
  })
})

describe('默认导出就是 v7 门面（阶段 9.1 修 BUG-1）', () => {
  it('BUG-1 的复现片段编译通过：amagi({ cookies }).douyin.login.qrcode()', () => {
    const ck = 'ttwid=x'
    const app = amagi({ cookies: { douyin: ck } })
    expectTypeOf(app.douyin.login.qrcode).toBeFunction()
    expectTypeOf(app.bilibili.login.qrcode).toBeFunction()
    // 返回值形状与 createClient 完全一致（同一个门面，不是两份声明）
    expectTypeOf(app).toEqualTypeOf<ReturnType<typeof createClient>>()
    expect(typeof app.douyin.login.qrcode).toBe('function')
  })

  it('默认导出上四平台的 login 都可达（扫码登录已全部落地）', () => {
    const app = amagi({})
    expectTypeOf(app.xiaohongshu.login.qrcode).toBeFunction()
    expectTypeOf(app.kuaishou.login.qrcode).toBeFunction()
    expect(typeof app.kuaishou.login.qrcode).toBe('function')
  })

  it('debug 开关经默认导出可达（v6 的 Options 没有这一项）', () => {
    expectTypeOf(amagi).toBeCallableWith({ debug: true })
    expect(amagi({ debug: true }).events).toBeDefined()
  })

  it('两个实例的 events 不是同一个对象（实例级总线）', () => {
    expect(amagi({}).events).not.toBe(amagi({}).events)
  })
})
