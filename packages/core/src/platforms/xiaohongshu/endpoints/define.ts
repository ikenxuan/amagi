import type zod from 'zod'

import { defineEndpoint, type EndpointCtx, type EndpointDef, type ExclusiveShaping, type PageOf } from '../../../contracts/endpoint'
import { prepareXiaohongshuGuestCookie } from '../sign/guestCookie'
import type { XiaohongshuSignerName } from '../sign/signers'

// 转出响应类型令牌：端点文件从这里一次性取 `defineXiaohongshuEndpoint` 与 `type`，
// 不必再分别 import 通用 `defineEndpoint`（会绕过签名器名收窄）与 contracts。
export { internalParam, type } from '../../../contracts/endpoint'

/**
 * 小红书端点声明。
 *
 * 在 {@link defineEndpoint} 的基础上做两件小红书专属的事：
 *
 * 1. **签名器名收窄**：`sign` 的字符串分支被收窄成小红书那几个 `xhs-*` 名字
 *    （{@link XiaohongshuSignerName}），写错名字编译期即报错，不必等运行时查表失败。
 * 2. **游客 Cookie 降级**：注入平台级 `prepare`（{@link prepareXiaohongshuGuestCookie}）——
 *    下游未传有效用户 Cookie（无 a1）时自动铸造游客 Cookie 来解析接口。这是**每个**
 *    小红书端点都要的横切能力，放在这里一处注入，保证全体端点（含将来新增的）一致
 *    覆盖，不会漏配。端点若自带 `prepare`，在游客降级**之后**再跑、其结果优先。
 *
 * @param def - 端点声明（`sign` 的名字受小红书签名器表约束）
 * @returns 带上推导好的具体类型、并注入游客降级 `prepare` 的 `def`
 */
export const defineXiaohongshuEndpoint = <TParams extends zod.ZodType, TData = unknown, TPage = PageOf<TData>, TItem = unknown>(
  def: EndpointDef<TParams, TData, XiaohongshuSignerName, TPage, TItem> & ExclusiveShaping
): EndpointDef<TParams, TData, XiaohongshuSignerName, TPage, TItem> => {
  const own = def.prepare
  const prepare = async (ctx: EndpointCtx): Promise<Partial<EndpointCtx>> => {
    const upgraded = await prepareXiaohongshuGuestCookie(ctx)
    if (own === undefined) return upgraded
    // 端点自带 prepare 看到的是降级后的 ctx；两者的字段合并、端点结果优先
    const ownResult = await own({ ...ctx, ...upgraded })
    return { ...upgraded, ...ownResult }
  }
  return defineEndpoint({ ...def, prepare })
}
