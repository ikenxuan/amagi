/**
 * B站 Fetcher 内部通用逻辑
 * @module fetchers/bilibili/internal
 */

import { emitApiError, emitApiSuccess } from 'amagi/model/events'
import { BilibiliDataOptionsMap } from 'amagi/types'
import { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import { createErrorResponse, createSuccessResponse, Result, validateBilibiliParams } from 'amagi/validation'

import { fetchBilibili } from '../../../platform/bilibili/getdata'
import type { FetcherConfig } from '../types'

/**
 * B站 API 内部调用函数
 * @internal
 * @param methodType - 方法类型
 * @param options - 请求参数
 * @param config - 配置项 (cookie, requestConfig)
 * @returns Promise<Result<T>>
 */
export async function fetchBilibiliInternal<T extends keyof BilibiliDataOptionsMap> (
  methodType: T,
  options: Omit<BilibiliDataOptionsMap[T]['opt'], 'methodType'>,
  config: FetcherConfig
): Promise<Result<BilibiliReturnTypeMap[T]>> {
  try {
    const validatedParams = validateBilibiliParams(methodType, options)
    const apiParams = { ...validatedParams } as BilibiliDataOptionsMap[T]['opt']
    const rawData = await fetchBilibili(apiParams, config.cookie, config.requestConfig)

    if (rawData.code !== 0) {
      emitApiError({
        platform: 'bilibili',
        methodType,
        errorCode: rawData.code,
        errorMessage: 'B站数据获取失败',
        url: undefined
      })
      return createErrorResponse(rawData.amagiError, 'B站数据获取失败', rawData.code, rawData.data)
    }

    emitApiSuccess({ platform: 'bilibili', methodType })
    return createSuccessResponse(rawData, '获取成功', 200)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    emitApiError({
      platform: 'bilibili',
      methodType,
      errorMessage
    })
    throw new Error(`B站数据获取失败: ${errorMessage}`)
  }
}
