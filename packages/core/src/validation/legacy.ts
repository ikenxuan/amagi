/**
 * v6 信封的内部实现（**不进顶层 barrel**，06-migration「8 项形状变更」规格）。
 *
 * 顶层 `createSuccessResponse` / `createErrorResponse` / `Result` 族按 v7
 * 形状重做后，仍要产出 v6 信封的 deprecated 内部路径（douyin passport 4
 * 方法、transport/legacy 的 fetchData/fetchResponse）从这里取 v6 类型与
 * builder —— 行为逐字保持 v6，compat 的「带顶层 code 直接透传」规则不变。
 *
 * @module validation/legacy
 */

import { APIErrorType } from '../types'

/**
 * 基础响应类型（v6 形状）
 */
export type BaseResponse = {
  /** 响应消息 */
  message: string
  /** 响应状态码 */
  code: number
}

/**
 * 成功响应类型（v6 形状）
 * @template T - 响应数据的类型
 */
export type SuccessResult<T = any> = BaseResponse & {
  /** 响应状态 */
  success: true
  /** 响应数据，类型由泛型 T 决定 */
  data: T
  /** 成功响应时错误信息为空 */
  error: never
}

/**
 * 错误响应类型（v6 形状）
 */
export type ErrorResult = BaseResponse & {
  /** 响应状态 */
  success: false
  /** API 错误类型 */
  error: APIErrorType
  /** 错误响应时数据为空 */
  data: never
}

/**
 * 通用API响应类型（v6 形状）
 * @template T - 成功响应数据的类型
 */
export type Result<T> = SuccessResult<T> | ErrorResult

/**
 * 创建成功响应格式（v6 形状，签名与行为逐字保持 v6）
 * @param data - 响应数据
 * @param message - 响应消息（可选）
 * @param code - 响应状态码（可选，默认200）
 * @returns 格式化的成功API响应对象
 */
export const createV6Success = <T>(data: T, message: string, code: number = 200): SuccessResult<T> => {
  return {
    success: true,
    data,
    message,
    code,
    error: undefined as never
  }
}

/**
 * 创建失败响应格式（v6 形状，签名与行为逐字保持 v6）
 * @param error - 错误信息
 * @param message - 详细错误消息（可选）
 * @param code - 错误状态码（可选，默认500）
 * @param data - 附带数据
 * @returns 格式化的错误响应对象
 */
export const createV6Error = (error: APIErrorType, message: string, code: number = 500, data?: unknown): ErrorResult => {
  return {
    success: false,
    error,
    message,
    code,
    data: data as never
  }
}
