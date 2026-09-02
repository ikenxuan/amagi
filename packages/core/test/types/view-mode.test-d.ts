/**
 * Phase 2 接口预留的类型断言（PRD 阶段 7 第 7 项）：
 * `ViewMode` 在 v7 只接受 `'raw'`，`'canonical'` 是 Phase 2 才扩的取值。
 */
import type { ViewMode } from 'amagi/contracts/endpoint'
import { expectTypeOf, it } from 'vitest'

it('ViewMode 在 v7 恰为 `raw`（Phase 2 扩为 `raw | canonical`）', () => {
  expectTypeOf<ViewMode>().toEqualTypeOf<'raw'>()
})

it('v7 不接受 `canonical`（Phase 2 取值，@ts-expect-error 承重）', () => {
  // @ts-expect-error Phase 2 才支持 'canonical'
  const mode: ViewMode = 'canonical'
  void mode
})

it('字面量 raw 可赋值（默认视图）', () => {
  const mode: ViewMode = 'raw'
  expectTypeOf(mode).toEqualTypeOf<'raw'>()
})
