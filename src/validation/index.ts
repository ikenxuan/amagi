import { z } from 'zod'
import { DouyinValidationSchemas, DouyinMethodType } from './douyin'
import { BilibiliValidationSchemas, BilibiliMethodType } from './bilibili'
import { KuaishouValidationSchemas, KuaishouMethodType } from './kuaishou'
import type {
  DouyinDataOptionsMap,
  BilibiliDataOptionsMap,
  KuaishouDataOptionsMap
} from 'amagi/types'

/**
 * 通用API响应格式的Zod验证模式
 */
export const ApiResponseSchema = z.object({
  code: z.number().optional(),
  message: z.string().optional(),
  data: z.any(),
})

/**
 * 通用API响应类型
 * @template T - 响应数据的类型，默认为any
 */
export type ApiResponse<T = any> = {
  code?: number
  message?: string
  data: T
}

/**
 * 验证抖音参数
 * @param methodType - 抖音方法类型
 * @param params - 待验证的参数
 * @returns 验证后的参数，符合原始API期望的类型
 */
export const validateDouyinParams = <T extends DouyinMethodType>(
  methodType: T,
  params: unknown
): DouyinDataOptionsMap[T]['opt'] => {
  const schema = DouyinValidationSchemas[methodType]
  const validated = schema.parse(typeof params === 'object' && params !== null ? { methodType, ...params } : { methodType, params })
  return validated as DouyinDataOptionsMap[T]['opt']
}

/**
 * 验证哔哩哔哩参数
 * @param methodType - 哔哩哔哩方法类型
 * @param params - 待验证的参数
 * @returns 验证后的参数，符合原始API期望的类型
 */
export const validateBilibiliParams = <T extends BilibiliMethodType>(
  methodType: T,
  params: unknown
): BilibiliDataOptionsMap[T]['opt'] => {
  const schema = BilibiliValidationSchemas[methodType]
  const validated = schema.parse(typeof params === 'object' && params !== null ? { methodType, ...params } : { methodType, params })
  return validated as BilibiliDataOptionsMap[T]['opt']
}

/**
 * 验证快手参数
 * @param methodType - 快手方法类型
 * @param params - 待验证的参数
 * @returns 验证后的参数，符合原始API期望的类型
 */
export const validateKuaishouParams = <T extends KuaishouMethodType>(
  methodType: T,
  params: unknown
): KuaishouDataOptionsMap[T]['opt'] => {
  const schema = KuaishouValidationSchemas[methodType]
  const validated = schema.parse(typeof params === 'object' && params !== null ? { methodType, ...params } : { methodType, params })
  return validated as KuaishouDataOptionsMap[T]['opt']
}

/**
 * 创建统一响应格式
 * @param data - 响应数据
 * @param message - 响应消息（可选）
 * @param code - 响应状态码（可选）
 * @returns 格式化的API响应对象
 */
export const createApiResponse = <T>(data: T, message?: string, code?: number): ApiResponse<T> => {
  return {
    code,   
    message,
    data,
  }
}

export * from './douyin'
export * from './bilibili'
export * from './kuaishou'