/**
 * 抖音用户相关 API
 * @module fetchers/douyin/user
 */

import { RequestConfig } from 'amagi/server'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { Result } from 'amagi/validation'

import type { ConditionalReturnType, DouyinUserOptions, TypeMode } from '../types'
import { fetchDouyinInternal } from './internal'

/**
 * 获取抖音用户主页数据
 * @param options - 用户参数
 * @param options.sec_uid - 用户安全 ID
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 用户主页信息
 * @example
 * ```typescript
 * const result = await fetchUserProfile({ sec_uid: 'MS4wLjABAAAA...' }, cookie)
 * console.log(result.data.user.nickname) // 用户昵称
 * ```
 */
export async function fetchUserProfile<M extends TypeMode = 'loose'> (
  options: DouyinUserOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['userProfile'], M>>> {
  return fetchDouyinInternal('userProfile', options, { cookie, requestConfig })
}

/**
 * 获取抖音用户视频列表数据
 * @param options - 用户参数
 * @param options.sec_uid - 用户安全 ID
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 用户视频列表
 * @example
 * ```typescript
 * const result = await fetchUserVideoList({ sec_uid: 'MS4wLjABAAAA...' }, cookie)
 * console.log(result.data.aweme_list) // 视频列表
 * ```
 */
export async function fetchUserVideoList<M extends TypeMode = 'loose'> (
  options: DouyinUserOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['userVideoList'], M>>> {
  return fetchDouyinInternal('userVideoList', options, { cookie, requestConfig })
}
