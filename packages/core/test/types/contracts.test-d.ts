import type { Platform } from 'amagi/contracts/platform'
/**
 * contracts/ 的类型层契约（由 `pnpm test:types` 运行）。
 *
 * 这些断言是 v7 契约层的编译期防线：契约类型的形状一旦被改坏，
 * 这里立刻是类型错误，而不是等到某个平台端点搬迁时才炸。
 */
import { describe, expectTypeOf, it } from 'vitest'

describe('contracts/platform', () => {
  it('Platform 恰好是四个平台名的联合', () => {
    expectTypeOf<Platform>().toEqualTypeOf<'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu'>()
  })
})
