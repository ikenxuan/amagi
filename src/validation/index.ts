import { DouyinValidationSchemas, DouyinMethodType } from './douyin'
import { BilibiliValidationSchemas, BilibiliMethodType } from './bilibili'
import { KuaishouValidationSchemas, KuaishouMethodType } from './kuaishou'

/**
 * 基础响应类型
 */
export type BaseResponse = {
  message?: string
  code?: number
}

/**
 * 成功响应类型
 * @template T - 响应数据的类型，默认为any
 */
export type SuccessResponse<T = any> = BaseResponse & {
  success: true
  data: T
}

/**
 * 错误响应类型
 */
export type ErrorResponse = BaseResponse & {
  success: false
  error: string
}

/**
 * 通用API响应类型 - 联合类型
 * @template T - 成功响应数据的类型，默认为any
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse

/**
 * 验证抖音参数
 * @param methodType - 抖音方法类型
 * @param params - 待验证的参数
 * @returns 验证后的参数，符合原始API期望的类型
 */
export const validateDouyinParams = <T extends DouyinMethodType> (
  methodType: T,
  params: unknown
) => {
  const schema = DouyinValidationSchemas[methodType]
  const validated = schema.parse(
    typeof params === 'object' && params !== null
      ? { methodType, ...params }
      : { methodType, params }
  )
  return validated
}

/**
 * 验证哔哩哔哩参数
 * @param methodType - 哔哩哔哩方法类型
 * @param params - 待验证的参数
 * @returns 验证后的参数，符合原始API期望的类型
 */
export const validateBilibiliParams = <T extends BilibiliMethodType> (
  methodType: T,
  params: unknown
) => {
  const schema = BilibiliValidationSchemas[methodType]
  const validated = schema.parse(
    typeof params === 'object' && params !== null
      ? { methodType, ...params }
      : { methodType, params }
  )
  return validated
}

/**
 * 验证快手参数
 * @param methodType - 快手方法类型
 * @param params - 待验证的参数
 * @returns 验证后的参数，符合原始API期望的类型
 */
export const validateKuaishouParams = <T extends KuaishouMethodType> (
  methodType: T,
  params: unknown
) => {
  const schema = KuaishouValidationSchemas[methodType]
  const validated = schema.parse(
    typeof params === 'object' && params !== null
      ? { methodType, ...params }
      : { methodType, params }
  )
  return validated
}

/**
 * 创建成功响应格式
 * @param data - 响应数据
 * @param message - 响应消息（可选）
 * @param code - 响应状态码（可选，默认200）
 * @returns 格式化的成功API响应对象
 */
export const createSuccessResponse = <T> (
  data: T,
  message?: string,
  code: number = 200
): SuccessResponse<T> => {
  return {
    success: true,
    data,
    message,
    code,
  }
}

/**
 * 创建失败响应格式
 * @param error - 错误信息
 * @param message - 详细错误消息（可选）
 * @param code - 错误状态码（可选，默认500）
 * @returns 格式化的错误响应对象
 */
export const createErrorResponse = (
  error: string,
  message?: string,
  code: number = 500
): ErrorResponse => {
  return {
    success: false,
    error,
    message,
    code,
  }
}

export * from './douyin'
export * from './bilibili'
export * from './kuaishou'