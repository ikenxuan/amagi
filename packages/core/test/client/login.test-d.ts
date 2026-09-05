import { createClient } from 'amagi/client/createClient'
import amagi from 'amagi/index'
import { describe, expect, it } from 'vitest'
/**
 * client.<platform>.login 的条件属性类型。
 *
 * 判据：`client.kuaishou.login` 是**编译错误**（类型层面不存在），
 * 不是运行时 undefined —— 05-session-and-polling.md 的类型约束落点。
 *
 * 后半段（阶段 9.1 修 BUG-1）把同一组判据钉在**默认导出**上：BUG-1 的复现片段
 * `amagi({ cookies: { douyin: ck } }).douyin.login.qrcode()` 原本是 TS2339
 * （默认导出返回的是 v6 门面），换门面之后必须编译通过；而 `ClientShape` 的条件
 * 类型不许被这次改动抹平 —— `kuaishou` / `xiaohongshu` 上的 `.login` 仍是编译错误。
 */
import { expectTypeOf } from 'vitest'

const client = createClient({})

describe('client.<platform>.login 的类型', () => {
  it('douyin / bilibili 有 login（编译期可见）', () => {
    expectTypeOf(client.douyin.login).not.toBeUndefined()
    expectTypeOf(client.bilibili.login).not.toBeUndefined()
    expect(typeof client.douyin.login.qrcode).toBe('function')
    expect(typeof client.douyin.login.resume).toBe('function')
  })

  it('kuaishou / xiaohongshu 没有 login（类型层面不存在）', () => {
    // @ts-expect-error kuaishou 没有扫码登录实现，login 属性在类型层面不存在
    client.kuaishou.login
    // @ts-expect-error xiaohongshu 没有扫码登录实现
    client.xiaohongshu.login
    expect((client.kuaishou as Record<string, unknown>).login).toBeUndefined()
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

  it('条件类型没被抹平：默认导出上 kuaishou / xiaohongshu 的 login 仍是编译错误', () => {
    const app = amagi({})
    // 属性访问包在一次调用里，而不是写成裸表达式语句 —— 后者会多两条
    // `no-unused-expressions` lint warning（本文件上半段那两条就是）。
    // `@ts-expect-error` 照样咬人：哪天 `ClientShape` 被写宽了，这两行不再报错，
    // 指令本身就变成「未使用的 @ts-expect-error」编译错误
    const read = (value: unknown): unknown => value
    // @ts-expect-error kuaishou 没有扫码登录实现，login 属性在类型层面不存在
    read(app.kuaishou.login)
    // @ts-expect-error xiaohongshu 没有扫码登录实现
    read(app.xiaohongshu.login)
    expect((app.kuaishou as Record<string, unknown>).login).toBeUndefined()
  })

  it('debug 开关经默认导出可达（v6 的 Options 没有这一项）', () => {
    expectTypeOf(amagi).toBeCallableWith({ debug: true })
    expect(amagi({ debug: true }).events).toBeDefined()
  })

  it('两个实例的 events 不是同一个对象（实例级总线）', () => {
    expect(amagi({}).events).not.toBe(amagi({}).events)
  })
})
