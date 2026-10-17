import type zod from 'zod'

import { defineEndpoint, type EndpointDef, type ExclusiveShaping, type PageOf } from '../../../contracts/endpoint'
import type { Judge } from '../../../contracts/error'
import { kuaishouJudge } from '../judge'
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
 * `live_api` 端点判定：把嵌一层的 `result` 抬到平台判定表能看见的位置。
 *
 * 平台默认 judge 读的是**顶层** `result` —— 对 H5 那两套成立（`/rest/v/*` 与
 * `/rest/wd/*` 的失败信封顶层就是 `result,error_msg,…`），但 **`live_api` 不是**：
 * 2026-10-08 实测 `profile/public`，响应顶层**只有 `data` 一个键**，状态位在
 * `data.result`。于是 `result=2` 一路走成「成功信封 + 空列表」，比失败更糟 ——
 * 调用方拿到 `ok:true` 和 0 条数据，无法区分「这人没作品」和「被平台拒了」。
 *
 * 做法与 `danmakuList` 的 GraphQL 嵌套同构：**委托**而不是重写。先拿完整响应体过
 * 一遍平台 judge（保住非 JSON 的 WAF 页、`errors`、HTTP 状态那几道），成功了再把
 * `data` 节点交给同一个 judge，让它用 `KUAISHOU_RESULT_VERDICTS` 判 `2` / `11` /
 * `21` / `50`。判定语义仍然只有一份。
 *
 * `data` 不是对象时（`profile/interestlist` 回的是数组、没有状态位）保持外层结论。
 */
export const kuaishouLiveApiJudge = ((raw, http) => {
  const outer = kuaishouJudge(raw, http)
  if (!outer.ok) return outer
  const node = (raw as { data?: unknown } | null)?.data
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return outer
  return kuaishouJudge(node, http)
}) satisfies Judge

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
