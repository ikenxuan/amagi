/**
 * B站用户相关 API
 * @module fetchers/bilibili/user
 */

import { RequestConfig } from 'amagi/server'
import { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import { Result } from 'amagi/validation'

import type { BilibiliUserOptions, ConditionalReturnType, TypeMode } from '../types'
import { fetchBilibiliInternal } from './internal'

/**
 * 获取B站用户名片信息
 * @param options - 用户参数
 * @param options.host_mid - 用户 UID
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 用户名片信息
 * @example
 * ```typescript
 * const result = await fetchUserCard({ host_mid: 123456 }, cookie)
 * console.log(result.data.card.name) // 用户昵称
 * ```
 */
export async function fetchUserCard<M extends TypeMode = 'loose'> (
  options: BilibiliUserOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['用户主页数据'], M>>> {
  return fetchBilibiliInternal('用户主页数据', options, { cookie, requestConfig })
}

/**
 * 获取B站用户动态列表
 * @param options - 用户参数
 * @param options.host_mid - 用户 UID
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 用户动态列表
 * @example
 * ```typescript
 * const result = await fetchUserDynamicList({ host_mid: 123456 }, cookie)
 * console.log(result.data.items) // 动态列表
 * ```
 */
export async function fetchUserDynamicList<M extends TypeMode = 'loose'> (
  options: BilibiliUserOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['用户主页动态列表数据'], M>>> {
  return fetchBilibiliInternal('用户主页动态列表数据', options, { cookie, requestConfig })
}

/**
 * 获取B站用户空间详细信息
 * @param options - 用户参数
 * @param options.host_mid - 用户 UID
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 用户空间详细信息
 * @example
 * ```typescript
 * const result = await fetchUserSpaceInfo({ host_mid: 123456 }, cookie)
 * console.log(result.data) // 空间信息
 * ```
 */
export async function fetchUserSpaceInfo<M extends TypeMode = 'loose'> (
  options: BilibiliUserOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['用户空间详细信息'], M>>> {
  return fetchBilibiliInternal('用户空间详细信息', options, { cookie, requestConfig })
}

/**
 * 获取B站 UP 主总播放量
 * @param options - 用户参数
 * @param options.host_mid - UP 主 UID
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns UP 主总播放量数据
 * @example
 * ```typescript
 * const result = await fetchUploaderTotalViews({ host_mid: 123456 }, cookie)
 * console.log(result.data.archive.view) // 总播放量
 * ```
 */
export async function fetchUploaderTotalViews<M extends TypeMode = 'loose'> (
  options: BilibiliUserOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['获取UP主总播放量'], M>>> {
  return fetchBilibiliInternal('获取UP主总播放量', options, { cookie, requestConfig })
}
