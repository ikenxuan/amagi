import type { AmagiError } from './error'
import type { AmagiMeta } from './meta'

/**
 * 响应信封契约。
 *
 * 所有对外 API 的唯一返回类型。三条硬约束：
 * 1. `success` 是唯一判别键，与 v6 一致 —— `if (r.success)` 之后 `data` 可用，
 *    `else` 之后 `error` 可用，两者互斥且都非 `undefined`，由类型保证。
 * 2. **成功分支不声明 `error`，失败分支不声明 `data`。** v6 用
 *    `error: undefined as never` / `data: data as never` 声明却把键留在运行时，
 *    v7 直接不声明该键。
 * 3. **顶层没有 `code`。** HTTP 状态码在 `error.http.status`，平台业务码在
 *    `error.platform.code`，amagi 自己的错误码在 `error.code` —— 三者语义不同，
 *    不再挤一个字段。
 *
 * 另有一条运行时约束由管线保证：`AmagiResult` 永不 reject，
 * 参数校验失败、内部异常、网络中断全部映射为 `success: false`。
 */

/** 成功时固定的 `message`，与 v6 的 `createSuccessResponse(..., '获取成功')` 一致 */
export const SUCCESS_MESSAGE = '获取成功'

/** 成功信封 */
export interface AmagiSuccess<T> {
  /** 判别键 */
  success: true
  /** 端点声明的返回类型 */
  data: T
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
  /** 等价于 `error.message`，为兼容 v6 的 `result.message` 读法保留 */
  message: string
  /** 元信息 */
  meta: AmagiMeta
}

/** 所有对外 API 的唯一返回类型 */
export type AmagiResult<T> = AmagiSuccess<T> | AmagiFailure
