import type { AmagiError } from './error'
import type { AmagiMeta } from './meta'

/**
 * 响应信封契约。
 *
 * 所有对外 API 的唯一返回类型。三条硬约束：
 * 1. `success` 是唯一判别键，与 v6 一致 —— `if (r.success)` 之后 `data` 可用，
 *    `else` 之后 `error` 可用，两者互斥且都非 `undefined`，由类型保证。
 * 2. **运行时两支的键集合互斥：成功信封没有 `error` 键，失败信封没有 `data` 键。**
 *    类型上两支各声明一个 `?: undefined` 的对侧键（{@link AmagiSuccess.error} /
 *    {@link AmagiFailure.data}），声明与事实一致 —— 那个键运行时确实不存在，
 *    读出来确实是 `undefined`。
 *
 *    本条在阶段 9.2 放宽过。原文是「成功分支**不声明** `error`，失败分支**不声明**
 *    `data`」，它要消掉的其实是 v6 的**说谎**：v6 写 `data: data as never`
 *    （声明成 `never` 却在运行时塞真值）。该消掉的是说谎，不是声明 —— 于是
 *    未收窄的 `r.data` 变回 `T | undefined`（v6 的读法回来了，且比 v6 诚实：
 *    v6 给的是 `T`，掩盖了失败可能），而 `success` 仍是判别键，`if (r.success)`
 *    之后照旧收窄成 `T`，判别联合一点没弱。
 *
 *    **运行时形状一个字节都没变**，这是与 v6 的分界线：`'error' in success`
 *    与 `'data' in failure` 都是 `false`（断言在 `test/contracts/result.test.ts`）。
 * 3. **顶层没有 `code`。** HTTP 状态码在 `error.http.status`，平台业务码在
 *    `error.platform.code`，amagi 自己的错误码在 `error.code` —— 三者语义不同，
 *    不再挤一个字段。
 *
 * 另有一条运行时约束由管线保证：`AmagiResult` 永不 reject，
 * 参数校验失败、内部异常、网络中断全部映射为 `success: false`。
 *
 * 读法总览（阶段 9.2 起，四种形态的类型断言在 `test/types/result-reading.test-d.ts`）：
 *
 * ```ts
 * const r = await client.bilibili.fetcher.fetchCommentReplies(opt)
 * r.data                                        // T | undefined，不收窄也能读
 * if (r.success) r.data                         // T，判别联合照旧
 * list.filter(isSuccess).map((x) => x.data)     // T[]，数组回调里没法用 if 收窄
 * const data = unwrap(r)                        // T，失败即抛
 * ```
 */

/** 成功时固定的 `message`，与 v6 的 `createSuccessResponse(..., '获取成功')` 一致 */
export const SUCCESS_MESSAGE = '获取成功'

/** 成功信封 */
export interface AmagiSuccess<T> {
  /** 判别键 */
  success: true
  /** 端点声明的返回类型 */
  data: T
  /**
   * 对侧键的占位声明（阶段 9.2）。
   *
   * 成功信封**运行时没有这个键**，所以类型只能是 `undefined`。存在的唯一理由是
   * 让未收窄的 {@link AmagiResult} 上 `r.error` 可读（类型 `AmagiError | undefined`），
   * 而不是 TS2339 —— 声明与运行时事实一致，不是 v6 那种「声明一套、塞另一套」。
   */
  error?: undefined
  /** 面向人的简短说明，成功时固定为 {@link SUCCESS_MESSAGE} */
  message: string
  /** 元信息 */
  meta: AmagiMeta
}

/** 失败信封 */
export interface AmagiFailure {
  /** 判别键 */
  success: false
  /** 唯一的错误载体，永不为 `undefined` */
  error: AmagiError
  /**
   * 对侧键的占位声明（阶段 9.2）。
   *
   * 失败信封**运行时没有这个键**，所以类型只能是 `undefined`。有了它，未收窄的
   * `r.data` 是 `T | undefined`（v6 的读法，修 BUG-2），而不是 TS2339。
   */
  data?: undefined
  /** 等价于 `error.message`，为兼容 v6 的 `result.message` 读法保留 */
  message: string
  /** 元信息 */
  meta: AmagiMeta
}

/** 所有对外 API 的唯一返回类型 */
export type AmagiResult<T> = AmagiSuccess<T> | AmagiFailure

/**
 * 成功信封的类型守卫（阶段 9.2）。
 *
 * `?: undefined` 让「不收窄直接读」不再报错，但**收窄不到 `T`**（还是
 * `T | undefined`）。数组回调里没有 `if` 可用，`filter` 又只认类型谓词
 * —— 这就是必须有守卫的场景：
 *
 * ```ts
 * const list: AmagiResult<Work>[] = await Promise.all(ids.map(fetchOne))
 * const works = list.filter(isSuccess).map((r) => r.data)   // Work[]
 * ```
 * @param result - 任意信封
 * @returns 是成功信封时为 `true`，并把类型收窄到 {@link AmagiSuccess}
 */
export const isSuccess = <T>(result: AmagiResult<T>): result is AmagiSuccess<T> => result.success

/**
 * 失败信封的类型守卫（阶段 9.2）。
 *
 * 与 {@link isSuccess} 对称，`list.filter(isFailure)` 之后 `r.error` 是
 * `AmagiError`（不带 `| undefined`），可以直接按 `kind` 分流。
 * @param result - 任意信封
 * @returns 是失败信封时为 `true`，并把类型收窄到 {@link AmagiFailure}
 */
export const isFailure = <T>(result: AmagiResult<T>): result is AmagiFailure => !result.success

/**
 * {@link unwrap} 失败时抛出的 Error 子类（阶段 9.2）。
 *
 * 为什么不直接 `throw result.error`：{@link AmagiError} 是**纯数据契约**，
 * 抛非 Error 对象会丢栈、`e instanceof Error` 为假，Node 的 `unhandledRejection`
 * 打印与各家日志 / 监控（Sentry 归为 “Non-Error exception captured”）都处理不好。
 * 仓内既有的抛出物 —— `ApiError` / `ValidationError` / `TransportError` —— 全是
 * Error 子类，本类与它们同款。
 *
 * `AmagiError` 的字段**全部平铺在实例上**（`kind` / `code` / `message` /
 * `retryable`，以及 `platform` / `http` / `issues` / `raw`），所以
 * `catch (e) { (e as AmagiError).kind }` 直接可用；原始对象在 {@link error}，
 * `error.cause` 原样进 `Error.cause`（**不吞**）。
 */
export class AmagiThrownError extends Error implements AmagiError {
  /** 判别键，跨平台统一的错误大类 */
  readonly kind: AmagiError['kind']
  /** 稳定的字符串错误码 */
  readonly code: AmagiError['code']
  /** 是否值得重试 */
  readonly retryable: boolean
  /** 平台原始错误码与文案 */
  readonly platform?: AmagiError['platform']
  /** 真实发生的 HTTP 状态 */
  readonly http?: AmagiError['http']
  /** `kind === 'validation'` 时的字段级错误 */
  readonly issues?: AmagiError['issues']
  /** 原始响应体（client 开 debug 时才有） */
  readonly raw?: unknown
  /** 失败信封里那个错误对象，原样保留（引用相等） */
  readonly error: AmagiError

  /**
   * @param error - 失败信封的 `error`，字段平铺到实例上，`cause` 原样转交 `Error`
   */
  constructor(error: AmagiError) {
    // 只有 error 上确实带了 cause 才传 options —— 否则不要凭空造一个 cause 键
    super(error.message, 'cause' in error ? { cause: error.cause } : undefined)
    this.name = 'AmagiThrownError'
    this.kind = error.kind
    this.code = error.code
    this.retryable = error.retryable
    this.platform = error.platform
    this.http = error.http
    this.issues = error.issues
    this.raw = error.raw
    this.error = error
  }
}

/**
 * 取成功信封的 `data`，失败就抛（阶段 9.2）。
 *
 * 返回类型是 `T`，不是 `T | undefined` —— 这是它与「不收窄直接读 `r.data`」的
 * 全部区别：愿意让失败沿调用栈往上冒的人用它，不愿意的人继续写 `if (r.success)`。
 * 管线本身永不 reject（硬约束），`unwrap` 是调用方**显式**把失败转成异常。
 *
 * 与 `@ikenxuan/amagi/compat` 不重叠：`unwrap` 是 v7 的单点显式选择（想抛就抛，
 * 一处一处地写）；compat 是 v6 语义的**整体回填**（把整个 fetcher 的返回值换回
 * v6 信封，含顶层 `code`）。要 v6 行为用 compat，要 v7 信封加异常用 `unwrap`。
 * @param result - 任意信封
 * @returns 成功信封的 `data`
 * @throws {AmagiThrownError} 失败信封时抛出：`AmagiError` 全字段平铺，`cause` 不丢
 */
export const unwrap = <T>(result: AmagiResult<T>): T => {
  if (result.success) return result.data
  throw new AmagiThrownError(result.error)
}
