/**
 * 快手 Fetcher 内部通用逻辑
 * @module fetchers/kuaishou/internal
 */

import { emitApiError, emitApiSuccess } from 'amagi/model/events'
import { KuaishouDataOptionsMap } from 'amagi/types'
import { kuaishouAPIErrorCode } from 'amagi/types/NetworksConfigType'
import { KuaishouReturnTypeMap } from 'amagi/types/ReturnDataType/Kuaishou'
import { createErrorResponse, createSuccessResponse, Result, validateKuaishouParams } from 'amagi/validation'

import { KuaishouData } from '../../../platform/kuaishou/getdata'
import type { FetcherConfig } from '../types'

/**
 * 快手 API 内部调用函数
 * @internal
 * @param methodType - 方法类型
 * @param options - 请求参数
 * @param config - 配置项 (cookie, requestConfig)
 * @returns Promise<Result<T>>
 */
export async function fetchKuaishouInternal<T extends keyof KuaishouDataOptionsMap> (
  methodType: T,
  options: Omit<KuaishouDataOptionsMap[T]['opt'], 'methodType'>,
  config: FetcherConfig
): Promise<Result<KuaishouReturnTypeMap[T]>> {
  const startTime = Date.now()
  try {
    const validatedParams = validateKuaishouParams(methodType, options)
    const apiParams = { ...validatedParams } as KuaishouDataOptionsMap[T]['opt']
    const rawData = await KuaishouData(apiParams, config.cookie, config.requestConfig)
    const duration = Date.now() - startTime

    if (rawData.code && Object.values(kuaishouAPIErrorCode).includes(rawData.code)) {
      emitApiError({
        platform: 'kuaishou',
        methodType,
        errorCode: rawData.code,
        errorMessage: '快手数据获取失败',
        url: undefined,
        duration
      })
      return createErrorResponse(rawData.amagiError, '快手数据获取失败')
    }

    const result = createSuccessResponse(rawData, '获取成功', 200)
    emitApiSuccess({ platform: 'kuaishou', methodType, response: result, statusCode: 200, duration })
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    emitApiError({
      platform: 'kuaishou',
      methodType,
      errorMessage,
      duration
    })
    throw new Error(`快手数据获取失败: ${errorMessage}`)
  }
}
