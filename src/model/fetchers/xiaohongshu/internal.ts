/**
 * 小红书 Fetcher 内部通用逻辑
 * @module fetchers/xiaohongshu/internal
 */

import { emitApiError, emitApiSuccess } from 'amagi/model/events'
import { SearchNoteType, SearchSortType } from 'amagi/platform/xiaohongshu/API'
import { XiaohongshuDataOptionsMap } from 'amagi/types'
import { xiaohongshuAPIErrorCode } from 'amagi/types/NetworksConfigType'
import { createErrorResponse, createSuccessResponse, Result, validateXiaohongshuParams } from 'amagi/validation'

import { XiaohongshuData } from '../../../platform/xiaohongshu/getdata'
import type { FetcherConfig } from '../types'

/**
 * 搜索排序类型映射
 */
export const sortTypeMapping: Record<string, SearchSortType> = {
  general: SearchSortType.GENERAL,
  time_descending: SearchSortType.LATEST,
  popularity_descending: SearchSortType.MOST_POPULAR
}

/**
 * 搜索笔记类型
 */
export { SearchNoteType }

/**
 * 小红书 API 内部调用函数
 * @internal
 * @param methodType - 方法类型
 * @param options - 请求参数
 * @param config - 配置项 (cookie, requestConfig)
 * @returns Promise<Result<T>>
 */
export async function fetchXiaohongshuInternal<T extends keyof XiaohongshuDataOptionsMap> (
  methodType: T,
  options: Omit<XiaohongshuDataOptionsMap[T]['opt'], 'methodType'>,
  config: FetcherConfig
): Promise<Result<XiaohongshuDataOptionsMap[T]['data']>> {
  try {
    const validatedParams = validateXiaohongshuParams(methodType, options)
    const apiParams = { ...validatedParams } as XiaohongshuDataOptionsMap[T]['opt']
    const rawData = await XiaohongshuData(apiParams, config.cookie, config.requestConfig)

    if (rawData.code && Object.values(xiaohongshuAPIErrorCode).includes(rawData.code)) {
      emitApiError({
        platform: 'xiaohongshu',
        methodType,
        errorCode: rawData.code,
        errorMessage: '小红书数据获取失败',
        url: undefined
      })
      return createErrorResponse(rawData.amagiError, '小红书数据获取失败')
    }

    emitApiSuccess({ platform: 'xiaohongshu', methodType })
    return createSuccessResponse(rawData, '获取成功', 200)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    emitApiError({
      platform: 'xiaohongshu',
      methodType,
      errorMessage
    })
    throw new Error(`小红书数据获取失败: ${errorMessage}`)
  }
}
