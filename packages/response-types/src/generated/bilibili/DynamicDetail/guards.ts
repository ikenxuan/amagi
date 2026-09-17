// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：3 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/dynamicDetail.requests.json 里
//   dynamic_id  图文动态
//   dynamic_id  视频动态
//   dynamic_id  转发动态

import type { DynamicTypeAV } from './DYNAMIC_TYPE_AV'
import type { DynamicTypeDraw } from './DYNAMIC_TYPE_DRAW'
import type { DynamicTypeForward } from './DYNAMIC_TYPE_FORWARD'
import type { DynamicDetailUnknown } from './Unknown'

/** 判别式 `data.item.type` 在样本里见过的取值。声明了却从未出现的成员见覆盖率报告，不在这里 */
export type DynamicDetailDiscriminant = 'DYNAMIC_TYPE_AV' | 'DYNAMIC_TYPE_DRAW' | 'DYNAMIC_TYPE_FORWARD'

/**
 * 判别联合（PRD 5.1）。判别式在 `data.item.type`，成员是按判别式取值分组、各自合并出来的。
 *
 * 每一层都带 `[property: string]: any`（硬约束 1：`response-types.test-d.ts` 用它承诺
 * 「平台加字段不算 breaking」）。所以判别字段**是字面量**时，裸
 * `if (resp.data.item.type === '…')` / `switch` 就能收窄（收窄的是判别字段所在的那个对象，
 * 不是整个信封）—— 下面的 `is*` 守卫是给「要收窄整个信封」的场景的加成，不是必需品。
 *
 * 末尾那支是**兜底支**：判别式取到样本里没见过的值时落到它，字段全走索引签名，
 * 所以平台加新类型不会让下游编译红。它的判别字段是 `?: never`（见 emitFallback）。
 */
export type DynamicDetailUnion = DynamicTypeAV | DynamicTypeDraw | DynamicTypeForward | DynamicDetailUnknown

/**
 * 参数化守卫，形状与 `packages/core/test/types/discriminant-narrowing.test-d.ts` 里的
 * `isDynamicType` 一致。用途是**收窄整个信封**：裸 `if (info.data.item.type === …)` 收窄的是
 * 判别字段所在的那个对象（`info.data.item`），信封本身（`info`）不变 ——
 * 要按「整个响应」做分支（把它传给一个只接受某一支的函数）时才需要这个守卫。
 */
export const isDynamicDetailDiscriminant =
  <T extends DynamicDetailDiscriminant>(value: T) =>
  (info: DynamicDetailUnion): info is Extract<DynamicDetailUnion, { data: { item: { type: T } } }> =>
    info.data.item.type === value

/** `data.item.type === 'DYNAMIC_TYPE_AV'` 时收窄到 `DynamicTypeAV` */
export const isDynamicTypeAV = (
  info: DynamicDetailUnion
): info is Extract<
  DynamicDetailUnion,
  { data: { item: { type: 'DYNAMIC_TYPE_AV' } } }
> => info.data.item.type === 'DYNAMIC_TYPE_AV'

/** `data.item.type === 'DYNAMIC_TYPE_DRAW'` 时收窄到 `DynamicTypeDraw` */
export const isDynamicTypeDraw = (
  info: DynamicDetailUnion
): info is Extract<
  DynamicDetailUnion,
  { data: { item: { type: 'DYNAMIC_TYPE_DRAW' } } }
> => info.data.item.type === 'DYNAMIC_TYPE_DRAW'

/** `data.item.type === 'DYNAMIC_TYPE_FORWARD'` 时收窄到 `DynamicTypeForward` */
export const isDynamicTypeForward = (
  info: DynamicDetailUnion
): info is Extract<
  DynamicDetailUnion,
  { data: { item: { type: 'DYNAMIC_TYPE_FORWARD' } } }
> => info.data.item.type === 'DYNAMIC_TYPE_FORWARD'
