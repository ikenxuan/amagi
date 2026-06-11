/**
 * B站动态相关 API
 * @module fetchers/bilibili/dynamic
 */

import { RequestConfig } from 'amagi/server'
import { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import { checkDeprecation } from 'amagi/utils/deprecation'
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
export async function fetchDynamicDetail<M extends TypeMode = 'loose'>(
  options: BilibiliDynamicOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['dynamicDetail'], M>>> {
  return fetchBilibiliInternal('dynamicDetail', options, { cookie, requestConfig })
}

/**
 * 获取B站动态卡片信息
 *
 * @deprecated v6.1.3 已废弃，B站官方已于 `2025-08-09` 删除原 `dynamic_svr` 接口。
 * 调用将返回错误信息
 * 计划于 v7.0.0 移除。
 *
 * @param options - 动态参数
 * @param options.dynamic_id - 动态 ID
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 动态卡片数据（已停用，返回错误信息）
 * @example
 * ```typescript
 * const result = await fetchDynamicCard({ dynamic_id: '123456789' }, cookie)
 * // result.success === false，错误信息提示接口已停用
 * ```
 */
export async function fetchDynamicCard<M extends TypeMode = 'loose'>(
  options: BilibiliDynamicOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['dynamicCard'], M>>> {
  checkDeprecation('fetchDynamicCard')
  return fetchBilibiliInternal('dynamicCard', options, { cookie, requestConfig })
}
