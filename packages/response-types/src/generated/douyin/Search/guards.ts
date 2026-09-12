// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：6 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/search.requests.json 里
//   query
//   query / type
//   query / type  用户搜索
//   query / type  视频类型
//   query / type  通用搜索

import type { General } from './general'
import type { User } from './user'
import type { Video } from './video'
import type { SearchUnknown } from './Unknown'

/** 判别式 `__search_type` 在样本里见过的取值。声明了却从未出现的成员见覆盖率报告，不在这里 */
export type SearchDiscriminant =
  | 'general'
  | 'user'
  | 'video'

/**
 * 判别联合（PRD 5.1）。判别式在 `__search_type`，成员是按判别式取值分组、各自合并出来的。
 *
 * 每一层都带 `[property: string]: any`（硬约束 1：`response-types.test-d.ts` 用它承诺
 * 「平台加字段不算 breaking」）。所以判别字段**是字面量**时，裸
 * `if (resp.__search_type === '…')` / `switch` 就能收窄（收窄的是判别字段所在的那个对象，
 * 不是整个信封）—— 下面的 `is*` 守卫是给「要收窄整个信封」的场景的加成，不是必需品。
 *
 * 末尾那支是**兜底支**：判别式取到样本里没见过的值时落到它，字段全走索引签名，
 * 所以平台加新类型不会让下游编译红。它的判别字段是 `?: never`（见 emitFallback）。
 */
export type SearchUnion =
  | General
  | User
  | Video
  | SearchUnknown

/**
 * 参数化守卫，形状与 `packages/core/test/types/discriminant-narrowing.test-d.ts` 里的
 * `isDynamicType` 一致。用途是**收窄整个信封**：裸 `if (info.__search_type === …)` 收窄的是
 * 判别字段所在的那个对象（`info['']`），信封本身（`info`）不变 ——
 * 要按「整个响应」做分支（把它传给一个只接受某一支的函数）时才需要这个守卫。
 */
export const isSearchDiscriminant =
  <T extends SearchDiscriminant>(value: T) =>
  (info: SearchUnion): info is Extract<SearchUnion, { __search_type: T }> =>
    info.__search_type === value

/** `__search_type === 'general'` 时收窄到 `General` */
export const isGeneral = (info: SearchUnion): info is Extract<SearchUnion, { __search_type: 'general' }> =>
  info.__search_type === 'general'

/** `__search_type === 'user'` 时收窄到 `User` */
export const isUser = (info: SearchUnion): info is Extract<SearchUnion, { __search_type: 'user' }> =>
  info.__search_type === 'user'

/** `__search_type === 'video'` 时收窄到 `Video` */
export const isVideo = (info: SearchUnion): info is Extract<SearchUnion, { __search_type: 'video' }> =>
  info.__search_type === 'video'
