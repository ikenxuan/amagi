/**
 * 抖音搜索相关 API
 * @module fetchers/douyin/search
 */

import { RequestConfig } from 'amagi/server'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { Result } from 'amagi/validation'

import type { ConditionalReturnType, DouyinSearchOptions, DouyinSuggestWordsOptions, TypeMode } from '../types'
import { fetchDouyinInternal, searchTypeMapping } from './internal'

/**
 * 抖音搜索内容
 * @param options - 搜索参数
 * @param options.query - 搜索关键词
 * @param options.type - 搜索类型: 'general' | 'user' | 'video'
 * @param options.number - 获取数量 (可选)
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 搜索结果数据
 * @example
 * ```typescript
 * // 综合搜索
 * const result = await searchContent({ query: '美食', type: 'general' }, cookie)
 *
 * // 搜索用户
 * const users = await searchContent({ query: '张三', type: 'user' }, cookie)
 *
 * // 搜索视频
 * const videos = await searchContent({ query: '教程', type: 'video' }, cookie)
 * ```
 */
export async function searchContent<M extends TypeMode = 'loose'> (
  options: DouyinSearchOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['搜索数据'], M>>> {
  const { type, ...rest } = options
  const mappedType = type ? searchTypeMapping[type] : '综合'
  return fetchDouyinInternal('搜索数据', { ...rest, type: mappedType }, { cookie, requestConfig })
}

/**
 * 获取抖音热词/搜索建议
 * @param options - 热词参数
 * @param options.query - 搜索关键词
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 热词/搜索建议列表
 * @example
 * ```typescript
 * const result = await fetchSuggestWords({ query: '美' }, cookie)
 * console.log(result.data.sug_list) // 建议词列表
 * ```
 */
export async function fetchSuggestWords<M extends TypeMode = 'loose'> (
  options: DouyinSuggestWordsOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['热点词数据'], M>>> {
  return fetchDouyinInternal('热点词数据', options, { cookie, requestConfig })
}
