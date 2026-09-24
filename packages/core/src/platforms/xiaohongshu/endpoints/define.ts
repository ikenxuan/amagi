import type zod from 'zod'

import { defineEndpoint, type EndpointDef, type PageOf } from '../../../contracts/endpoint'
import type { XiaohongshuSignerName } from '../sign/signers'

// 转出响应类型令牌：端点文件从这里一次性取 `defineXiaohongshuEndpoint` 与 `type`，
// 不必再分别 import 通用 `defineEndpoint`（会绕过签名器名收窄）与 contracts。
export { type } from '../../../contracts/endpoint'

/**
 * 小红书端点声明。
 *
 * 就是 {@link defineEndpoint} 绑定了小红书签名器名联合 {@link XiaohongshuSignerName}：
 * `sign` 的字符串分支被收窄成小红书那几个 `xhs-*` 名字，写错名字编译期即报错，不必
 * 等运行时查表失败。运行时仍是恒等函数，其余行为与通用 `defineEndpoint` 完全一致。
 * @param def - 端点声明（`sign` 的名字受小红书签名器表约束）
 * @returns 原样返回 `def`，带上推导好的具体类型
 */
export const defineXiaohongshuEndpoint = <TParams extends zod.ZodType, TData = unknown, TPage = PageOf<TData>, TItem = unknown>(
  def: EndpointDef<TParams, TData, XiaohongshuSignerName, TPage, TItem>
): EndpointDef<TParams, TData, XiaohongshuSignerName, TPage, TItem> => defineEndpoint(def)
