/**
 * 抖音 Fetcher 内部通用逻辑
 * @module fetchers/douyin/internal
 */

import { emitApiError, emitApiSuccess } from 'amagi/model/events'
import { DouyinDataOptionsMap } from 'amagi/types'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { createErrorResponse, createSuccessResponse, Result, validateDouyinParams } from 'amagi/validation'

import { DouyinData } from '../../../platform/douyin/getdata'
import type { FetcherConfig } from '../types'

/**
 * 搜索类型映射 (英文 -> 中文)
 */
export const searchTypeMapping = {
  general: '综合',
  user: '用户',
  video: '视频'
} as const

/**
 * 抖音 API 内部调用函数
 * @internal
 * @param methodType - 方法类型
 * @param options - 请求参数
 * @param config - 配置项 (cookie, requestConfig)
 * @returns Promise<Result<T>>
 */
export async function fetchDouyinInternal<T extends keyof DouyinDataOptionsMap> (
  methodType: T,
  options: Omit<DouyinDataOptionsMap[T]['opt'], 'methodType'>,
  config: FetcherConfig
): Promise<Result<DouyinReturnTypeMap[T]>> {
  try {
    const validatedParams = validateDouyinParams(methodType, options)
    const apiParams = { ...validatedParams } as DouyinDataOptionsMap[T]['opt']
    const rawData = await DouyinData(apiParams, config.cookie, config.requestConfig)

    if (rawData.data === '' || rawData.status_code !== 0) {
      emitApiError({
        platform: 'douyin',
        methodType,
        errorCode: rawData.status_code,
        errorMessage: rawData.status_msg ?? '抖音数据获取失败',
        url: undefined
      })
      return createErrorResponse(rawData.amagiError, rawData.status_msg ?? '抖音数据获取失败')
    }

    emitApiSuccess({ platform: 'douyin', methodType })
    return createSuccessResponse(rawData, '获取成功', 200)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    emitApiError({
      platform: 'douyin',
      methodType,
      errorMessage
    })
    throw new Error(`抖音数据获取失败: ${errorMessage}`)
  }
}
