/**
 * B站动态相关 API
 * @module fetchers/bilibili/dynamic
 */

import { RequestConfig } from 'amagi/server'
import { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import { Result } from 'amagi/validation'

import type { BilibiliDynamicOptions, ConditionalReturnType, TypeMode } from '../types'
import { fetchBilibiliInternal } from './internal'

/**
 * 获取B站动态详情
 * @param options - 动态参数
 * @param options.dynamic_id - 动态 ID
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 动态详情数据
 * @example
 * ```typescript
 * const result = await fetchDynamicDetail({ dynamic_id: '123456789' }, cookie)
 * console.log(result.data.item) // 动态内容
 * ```
 */
export async function fetchDynamicDetail<M extends TypeMode = 'loose'> (
  options: BilibiliDynamicOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['dynamicDetail'], M>>> {
  return fetchBilibiliInternal('dynamicDetail', options, { cookie, requestConfig })
}

/**
 * 获取B站动态卡片信息
 * @param options - 动态参数
 * @param options.dynamic_id - 动态 ID
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 动态卡片数据
 * @example
 * ```typescript
 * const result = await fetchDynamicCard({ dynamic_id: '123456789' }, cookie)
 * console.log(result.data.card) // 动态卡片
 * ```
 */
export async function fetchDynamicCard<M extends TypeMode = 'loose'> (
  options: BilibiliDynamicOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['dynamicCard'], M>>> {
  return fetchBilibiliInternal('dynamicCard', options, { cookie, requestConfig })
}
