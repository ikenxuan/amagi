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
  const startTime = Date.now()
  try {
    const validatedParams = validateBilibiliParams(methodType, options)
    const apiParams = { ...validatedParams } as BilibiliDataOptionsMap[T]['opt']
    const rawData = await fetchBilibili(apiParams, config.cookie, config.requestConfig)
    const duration = Date.now() - startTime

    if (rawData.code !== 0) {
      emitApiError({
        platform: 'bilibili',
        methodType,
        errorCode: rawData.code,
        errorMessage: 'B站数据获取失败',
        url: undefined,
        duration
      })
      return createErrorResponse(rawData.amagiError, 'B站数据获取失败', rawData.code, rawData.data)
    }

    const result = createSuccessResponse(rawData, '获取成功', 200)
    emitApiSuccess({ platform: 'bilibili', methodType, response: result, statusCode: 200, duration })
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    emitApiError({
      platform: 'bilibili',
      methodType,
      errorMessage,
      duration
    })
    throw new Error(`B站数据获取失败: ${errorMessage}`)
  }
}
