/**
 * 发一次请求，把**未经 decode / normalize 的原始响应**拿到手。
 *
 * 这个文件是 server 那半边唯一非纯的部分 —— 判断全在 `outcome.ts`。
 *
 * 拿原始响应的办法是**包一层 `ctx.send`**：decode / normalize 之前的 body 只在那里出现过。
 * 这条能成立是因为 `runtime/execute.ts` 只在 `options.ctx.send` 外面再包一个 `boundSend`
 * （补默认 requestConfig），并不换实现；而 `execute` 也不读 `ctx.scope`
 * （用 scope 换 send 的是公开 client 路径 `client/fetcher.ts`），所以拦截器不会被绕过。
 *
 * 留下的是**最后一发**的 body：`prepare` 的内部请求（换 guest cookie、取 wbi key）、
 * `retryOn` 的每次重试、`paginate` 的每一页都会覆盖它。对录样本来说这是对的 ——
 * 最后一发才是被放过的那一发。
 */

import type { JsonValue } from '@ikenxuan/amagi-typegen'

import { makeClientCtx } from '../../core/src/client/runtime'
// 从 core 的**源码**引，不走包入口 —— 与 `packages/docs/scripts/generate-docs.ts` 同一条既有先例。
//
// 理由：`makeClientCtx` / `execute` / 四个注册表都是内部机件，core 的顶层 `index.ts`
// 一个都没导出。给它们开一条 `./internal` 子路径会把内部机件变成**已发布的公开面**，
// 而这个包 `private: true` 永不发布 —— 为了仓库内一个工具去扩公开面是反的。
import type { AnyEndpointDef } from '../../core/src/contracts/endpoint'
import type { Platform } from '../../core/src/contracts/platform'
import { execute } from '../../core/src/runtime/execute'

/** 一次请求的原始结果。`raw` 为 undefined 表示一发都没打出去 */
export interface RawCapture {
  raw?: JsonValue
  http: { status: number; statusText?: string }
  /** 归一化后的值。端点没有 normalize 步骤时**这个键不存在** */
  normalized?: JsonValue
  /** 失败时的错误文案，给「一发都没打出去」那条路用 */
  message?: string
}

export const captureRaw = async (input: {
  def: AnyEndpointDef
  platform: Platform
  cookie: string
  params: Record<string, JsonValue>
  /** 打进 trace 的客户端名，便于在日志里认出这些请求是控制台发的 */
  clientId: string
}): Promise<RawCapture> => {
  const base = makeClientCtx(input.platform, input.cookie, {}, input.clientId)
  let raw: JsonValue | undefined
  let status = 0
  let statusText: string | undefined
  const ctx = {
    ...base,
    send: async (...args: Parameters<typeof base.send>) => {
      const response = await base.send(...args)
      raw = response.body as JsonValue
      status = response.status
      statusText = response.statusText
      return response
    }
  }

  // `signers` / `judge` 必须显式传：`ExecuteOptions` 读的是 `options.signers`
  // 而不是 `ctx.signers` —— 漏传会让签名端点在 sign 阶段报「未注册的签名器」
  const result = await execute(input.def, input.params, { ctx, signers: base.signers, judge: base.judge })

  const http = { status, ...(statusText === undefined ? {} : { statusText }) }
  if (raw === undefined) {
    return { http, message: result.success ? '请求成功但没有捕获到响应体' : result.error.message }
  }
  // 端点没有 normalize 步骤时**不传这个键**（与「normalize 返回了 null」是两件事，
  // 而 JSON 里区分它们的唯一办法就是缺键）
  const normalized = result.success && input.def.normalize !== undefined ? (result.data as JsonValue) : undefined
  return { raw, http, ...(normalized === undefined ? {} : { normalized }) }
}
