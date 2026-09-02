import { createClient } from 'amagi/client/createClient'
import { describe, expect, it } from 'vitest'
/**
 * client.<platform>.login 的条件属性类型。
 *
 * 判据：`client.kuaishou.login` 是**编译错误**（类型层面不存在），
 * 不是运行时 undefined —— 05-session-and-polling.md 的类型约束落点。
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
