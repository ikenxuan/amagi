/**
 * 发一次请求，把**原始响应**（wire body）与**解码后的响应**都拿到手。
 *
 * 这个文件是 server 那半边唯一非纯的部分 —— 判断全在 `outcome.ts`。
 *
 * 拿原始响应的办法是**包一层 `ctx.send`**：decode / normalize 之前的 body 只在那里出现过。
 * 这条能成立是因为 `runtime/execute.ts` 只在 `options.ctx.send` 外面再包一个 `boundSend`
 * （补默认 requestConfig），并不换实现；而 `execute` 也不读 `ctx.scope`
 * （用 scope 换 send 的是公开 client 路径 `client/fetcher.ts`），所以拦截器不会被绕过。
 *
 * 拿解码后的值走的是另一层包装（{@link withDecodeCapture}）—— 理由与那三个端点的名字
 * 都写在那个函数上。
 *
 * 留下的是**最后一发**的 body：`prepare` 的内部请求（换 guest cookie、取 wbi key）、
 * `retryOn` 的每次重试、`paginate` 的每一页都会覆盖它。对录样本来说这是对的 ——
 * 最后一发才是被放过的那一发。两层包装留下的都是同一发（decode 紧跟在 send 后面），
 * 所以 `raw` 与 `decoded` 描述的永远是同一次响应。
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
  /**
   * **`decode` 之后的响应体。** 只有端点声明了 `decode`、而且那一步真的跑成了才有。
   *
   * 存在的理由是三个端点：抖音 `search`（多个 JSON 粘连成一个字符串，反爬手段）、
   * 小红书 `userProfile`（HTML 页面，数据在 `window.__INITIAL_STATE__` 里）、
   * B站 `videoDanmaku`（protobuf 二进制）。它们的 wire body **不是 JSON**，
   * 而 `raw` 抓的恰恰是 wire body —— 于是这三个端点在控制台里录出来的样本，
   * 那一层要么是个字符串、要么是 `JSON.stringify(ArrayBuffer)` 的产物，
   * 而两者装的形状信息都是零。
   *
   * 实测（抖音 `search`，`query: 猫`）：`raw` 是 721 KB 的
   * `15838\r\n{"status_code":0,…}\r\n…` —— 连 chunked 分块框架一起当字符串给了。
   * 它当类型证据毫无意义（渲出来就是 `string`），`trimSample` 也截不动它
   * （那个函数按形状截**数组**，对字符串无话可说），于是样本还白占 807 KB。
   *
   * CLI 那条录制路径（`packages/core/scripts/record-corpus.mts`）对同一件事的处理是
   * **如实拒掉**，理由写在那里：「这类端点的类型该描述的是 `decode` 之后的结构，
   * 而 corpus 的 `raw` 按定义是解码前的，两者装不进同一个格式」。这个字段就是那句话的
   * 另一半 —— 把解码后的结构也拿到手，于是不必在「塞一个字符串」与「拒掉」之间选。
   *
   * **缺席是常态**：61 个端点里 58 个没有 `decode`，那时 wire body 本来就是 JSON。
   * `decode` 抛错（小红书撞上风控页那条路）时也缺席 —— 那时 `raw` 里那份 HTML
   * 正是人要看的东西。
   */
  decoded?: JsonValue
  http: { status: number; statusText?: string }
  /** 归一化后的值。端点没有 normalize 步骤时**这个键不存在** */
  normalized?: JsonValue
  /**
   * **本地算出来的值。** 只有 `compute` 端点会有它（今天是 bv ⇄ av 互转那两个）。
   *
   * 为什么必须与 `raw` 分成两个键：`execute` 在 `def.compute` 上**短路返回**
   * （`runtime/execute.ts` 的 `if (def.compute)` 那三行），`prepare` / `build` / `sign` /
   * `send` 一个都不跑 —— 于是下面那个 `ctx.send` 包装一次都不会被调用，`raw` 恒为
   * `undefined`、`status` 恒为 0。合在一个键上的话，「这个端点压根不打请求」会与
   * 「平台回了个空 body」（204、或者被风控掐断）撞在同一个信号上，而那两件事的下一步
   * 完全不同：前者一切正常、后者要重录。
   *
   * 这就是 `bilibili/bvToAv` 上那个 bug 的成因 —— 它走到「一发请求都没打出去」那条路，
   * 界面于是渲出一个 `null`（`payload` 缺席时前端的回落）。
   */
  computed?: JsonValue
  /** 失败时的错误文案，给「一发都没打出去」那条路用 */
  message?: string
}

/**
 * 把端点的 `decode` 包一层，好在管线跑过它之后**读到它算出来的那个值**。
 *
 * 为什么是包一层、而不是事后自己再调一次 `def.decode(raw)`：
 *
 * 1. **不重复解析。** 抖音 `search` 那份 wire body 实测 721 KB，再切一遍块、再
 *    `JSON.parse` 一遍纯属白烧 CPU；B站 `videoDanmaku` 那份是 protobuf，同理。
 * 2. **拿到的必定是管线用过的那一个值。** `decode` 的第二个参数是完整的 `RawResponse`
 *    （见 `contracts/endpoint.ts` 的签名），自己补一份假的就有了第二套口径 ——
 *    而「两处说法不一致」正是这套工具反复在消灭的东西。
 * 3. **失败自然缺席。** `decode` 抛错时（小红书撞上风控页：「用户页面缺少
 *    `__INITIAL_STATE__`」）这里不吞异常、原样上抛，交给 `execute` 那唯一一处 catch
 *    归因成 `parse` / `DECODE_FAILED`。于是 `read()` 回 `undefined`，
 *    而调用方回落到 wire body —— 那份 HTML 恰恰是那时人要看的东西。
 *
 * **`decode` 缺席时返回原 def**（同一个对象，不是浅拷贝）：58 个端点走这条路，
 * 而 `execute` 会读 `def` 上十几个键，白拷一份只是多一处将来会脱节的地方。
 * @param def - 端点声明
 * @returns 包好的声明与「读那个值」的函数
 */
export const withDecodeCapture = (def: AnyEndpointDef): { def: AnyEndpointDef; read: () => JsonValue | undefined } => {
  const decode = def.decode
  if (decode === undefined) return { def, read: () => undefined }
  let decoded: JsonValue | undefined
  return {
    def: {
      ...def,
      decode: (raw, res) => {
        const value = decode(raw, res)
        decoded = value as JsonValue
        return value
      }
    },
    read: () => decoded
  }
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

  // 解码后的值也要抓 —— 那三个 wire body 不是 JSON 的端点靠它才录得出样本，
  // 见 {@link RawCapture.decoded} 与 {@link withDecodeCapture}
  const wrapped = withDecodeCapture(input.def)

  // `signers` / `judge` 必须显式传：`ExecuteOptions` 读的是 `options.signers`
  // 而不是 `ctx.signers` —— 漏传会让签名端点在 sign 阶段报「未注册的签名器」
  const result = await execute(wrapped.def, input.params, { ctx, signers: base.signers, judge: base.judge })

  const http = { status, ...(statusText === undefined ? {} : { statusText }) }
  // **`compute` 端点先分出去**，而判据是 `def.compute` 而不是「raw 为空」——
  // 理由（以及它修的那个 bug）写在 {@link RawCapture.computed} 上。
  // 这一支必须在下面那个 `raw === undefined` 之前：它落在那条路上恰好就是原来的错。
  if (input.def.compute !== undefined) {
    if (!result.success) return { http, message: result.error.message }
    return { http, computed: result.data as JsonValue }
  }
  if (raw === undefined) {
    return { http, message: result.success ? '请求成功但没有捕获到响应体' : result.error.message }
  }
  // 端点没有 normalize 步骤时**不传这个键**（与「normalize 返回了 null」是两件事，
  // 而 JSON 里区分它们的唯一办法就是缺键）
  const normalized = result.success && input.def.normalize !== undefined ? (result.data as JsonValue) : undefined
  // `decoded` 同理：没有 `decode`、或者那一步抛了，这个键整个不存在（见 {@link RawCapture.decoded}）
  const decoded = wrapped.read()
  return {
    raw,
    http,
    ...(decoded === undefined ? {} : { decoded }),
    ...(normalized === undefined ? {} : { normalized })
  }
}
