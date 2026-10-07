import type zod from 'zod'

import { defineEndpoint, type EndpointDef, type ExclusiveShaping, type PageOf } from '../../../contracts/endpoint'
import type { KuaishouSignerName } from '../sign/signers'

// 转出响应类型令牌：端点文件从这里一次性取 `defineKuaishouEndpoint` 与 `type`，
// 不必再分别 import 通用 `defineEndpoint`（会绕过签名器名收窄）与 contracts。
export { internalParam, type } from '../../../contracts/endpoint'

/**
 * 快手端点声明。
 *
 * 就是 {@link defineEndpoint} 绑定了快手签名器名联合 {@link KuaishouSignerName}：
 * `sign` 的字符串分支被收窄成 `'hxfalcon'`，写错名字编译期即报错，不必等运行时
 * 查表失败。运行时仍是恒等函数，其余行为与通用 `defineEndpoint` 完全一致。
 * @param def - 端点声明（`sign` 的名字受快手签名器表约束）
 * @returns 原样返回 `def`，带上推导好的具体类型
 */
export const defineKuaishouEndpoint = <TParams extends zod.ZodType, TData = unknown, TPage = PageOf<TData>, TItem = unknown>(
  def: EndpointDef<TParams, TData, KuaishouSignerName, TPage, TItem> & ExclusiveShaping
): EndpointDef<TParams, TData, KuaishouSignerName, TPage, TItem> => defineEndpoint(def)

/**
 * 快手的分页游标还能不能翻下一页。
 *
 * 快手表示「到底了」有**两种**写法，两种都得认：游标为空串，或者游标是字面量
 * `'no_more'`。只判空串会多打一次注定拿不到条目的请求 —— 服务端对
 * `pcursor=no_more` 回的是 `result: 1` + 空数组，不报错，于是翻页循环要靠
 * 「这一页没有条目」才停得下来。
 * @param cursor - 响应里带回的游标，非字符串一律当作到底
 * @returns 还有下一页时 true
 */
export const hasNextCursor = (cursor: unknown): boolean => typeof cursor === 'string' && cursor.length > 0 && cursor !== 'no_more'
