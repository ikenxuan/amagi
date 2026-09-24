import type zod from 'zod'

import { defineEndpoint, type EndpointDef, type PageOf } from '../../../contracts/endpoint'
import type { BilibiliSignerName } from '../sign/signers'

// 转出响应类型令牌：端点文件从这里一次性取 `defineBilibiliEndpoint` 与 `type`，
// 不必再分别 import 通用 `defineEndpoint`（会绕过签名器名收窄）与 contracts。
export { type } from '../../../contracts/endpoint'

/**
 * B站端点声明。
 *
 * 就是 {@link defineEndpoint} 绑定了 B站签名器名联合 {@link BilibiliSignerName}：
 * `sign` 的字符串分支被收窄成 `'wbi' | 'qtparam'`，写错名字编译期即报错，不必等
 * 运行时查表失败。运行时仍是恒等函数，其余行为与通用 `defineEndpoint` 完全一致。
 * @param def - 端点声明（`sign` 的名字受 B站签名器表约束）
 * @returns 原样返回 `def`，带上推导好的具体类型
 */
export const defineBilibiliEndpoint = <TParams extends zod.ZodType, TData = unknown, TPage = PageOf<TData>, TItem = unknown>(
  def: EndpointDef<TParams, TData, BilibiliSignerName, TPage, TItem>
): EndpointDef<TParams, TData, BilibiliSignerName, TPage, TItem> => defineEndpoint(def)
