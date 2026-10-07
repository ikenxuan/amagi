import type zod from 'zod'

import { defineEndpoint, type EndpointDef, type ExclusiveShaping, type PageOf } from '../../../contracts/endpoint'
import type { AmagiErrorCode } from '../../../contracts/error'
import { normalizeDouyinCookie } from '../cookie'
import type { DouyinSignerName } from '../sign/signers'

// 转出响应类型令牌：端点文件从这里一次性取 `defineDouyinEndpoint` 与 `type`，
// 不必再分别 import 通用 `defineEndpoint`（会绕过签名器名收窄）与 contracts。
export { internalParam, type } from '../../../contracts/endpoint'

/**
 * 抖音「换一整套参数再来一次」的重试码，配 `retryFresh: true` 使用。
 *
 * 两个码的共同点是**抖音没说清楚拒绝理由，而换一组凭据就可能过**：
 *
 * - **`ANTIBOT_PAGE`** —— Argus 拦截，响应体是纯文本（`Blocked by ArgusSecurityPlugin…`）。
 *   它按**单次请求的 token 组**判定、不锁账号，所以重放同一个 msToken + a_bogus 必然
 *   同样被拦，非 `retryFresh` 的重放是白跑。
 * - **`EMPTY_RESPONSE`** —— HTTP 200 + 0 字节。抖音在设备类参数与 cookie 会话对不上时
 *   就是这个形状，既不给 403 也不给业务码（见 `judge.ts` 与 `webid.ts`）。
 *   它**必须单列**：`douyinJudge` 在 `raw === ''` 那一支就返回了，根本走不到
 *   `verdictFromNonJsonBody`，所以只写 `ANTIBOT_PAGE` 的端点对这个形状是零重试 ——
 *   而这恰恰是作品详情类端点实测最常见的失败形态。
 *
 * `execute` 的重试只看 `def.retryOn.includes(error.code)`，与 verdict 的 `retryable`
 * 无关（那个字段是给调用方看的语义标注），所以这里列进来就会生效。
 *
 * **代价说清楚**：命中即退避重试 3 次（1s + 2s + 4s），所以一份**真的过期**的 cookie
 * 现在要多花 7 秒、多打 3 个请求才报错。收这个代价是因为 2026-09-30 的实测：同一份
 * cookie、同一个 aweme_id，先是稳定 `EMPTY_RESPONSE`，隔一阵子又稳定 10/10 成功 ——
 * 那正是重试能吸收掉的瞬时态，而 cookie 并没有失效。
 *
 * 这份数组被 18 条端点共享同一个引用，**不要原地修改**；要另一组码就新建常量。
 */
export const DOUYIN_RISK_RETRY: AmagiErrorCode[] = ['ANTIBOT_PAGE', 'EMPTY_RESPONSE']

/**
 * 抖音端点声明。
 *
 * 就是 {@link defineEndpoint} 绑定了抖音签名器名联合 {@link DouyinSignerName}：
 * `sign` 的字符串分支被收窄成 `'a-bogus' | 'x-bogus'`，写错名字（如 `'a-bogas'`）
 * 编译期即报错，不必等运行时查表失败。prepare 统一修复 Cookie 文本，签名和发送使用同一份凭据，其余行为与通用
 * `defineEndpoint` 完全一致。
 * @param def - 端点声明（`sign` 的名字受抖音签名器表约束）
 * @returns 带 Cookie 规范化前置步骤与具体推导类型的端点声明
 */
export const defineDouyinEndpoint = <TParams extends zod.ZodType, TData = unknown, TPage = PageOf<TData>, TItem = unknown>(
  def: EndpointDef<TParams, TData, DouyinSignerName, TPage, TItem> & ExclusiveShaping
): EndpointDef<TParams, TData, DouyinSignerName, TPage, TItem> =>
  defineEndpoint({
    ...def,
    prepare: async (ctx) => {
      const normalized = { ...ctx, cookie: normalizeDouyinCookie(ctx.cookie).cookie }
      const prepared = await def.prepare?.(normalized)
      return { ...prepared, cookie: normalizeDouyinCookie(prepared?.cookie ?? normalized.cookie).cookie }
    }
  })
