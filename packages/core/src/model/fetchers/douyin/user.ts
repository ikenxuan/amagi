/**
 * 抖音用户相关 API
 * @module fetchers/douyin/user
 */

import { RequestConfig } from 'amagi/server'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { Result } from 'amagi/validation'

import type { ConditionalReturnType, DouyinUserListOptions, DouyinUserOptions, TypeMode } from '../types'
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
 * @param options.number - 获取数量，默认 18
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 用户视频列表
 * @example
 * ```typescript
 * const result = await fetchUserVideoList({ sec_uid: 'MS4wLjABAAAA...', number: 30 }, cookie)
 * console.log(result.data.aweme_list) // 视频列表
 * console.log(result.data.max_cursor) // 下一页游标
 * ```
 */
export async function fetchUserVideoList<M extends TypeMode = 'loose'> (
  options: DouyinUserListOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['userVideoList'], M>>> {
  return fetchDouyinInternal('userVideoList', options, { cookie, requestConfig })
}

/**
 * 获取抖音用户喜欢列表数据
 * @param options - 用户参数
 * @param options.sec_uid - 用户安全 ID
 * @param options.number - 获取数量，默认 18
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 用户喜欢列表
 * @example
 * ```typescript
 * const result = await fetchUserFavoriteList({ sec_uid: 'MS4wLjABAAAA...', number: 30 }, cookie)
 * console.log(result.data.aweme_list) // 喜欢的视频列表
 * console.log(result.data.max_cursor) // 下一页游标
 * ```
 */
export async function fetchUserFavoriteList<M extends TypeMode = 'loose'> (
  options: DouyinUserListOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['userFavoriteList'], M>>> {
  return fetchDouyinInternal('userFavoriteList', options, { cookie, requestConfig })
}

/**
 * 获取抖音用户推荐列表数据
 * @param options - 用户参数
 * @param options.sec_uid - 用户安全 ID
 * @param options.number - 获取数量，默认 18
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 用户推荐列表
 * @example
 * ```typescript
 * const result = await fetchUserRecommendList({ sec_uid: 'MS4wLjABAAAA...', number: 30 }, cookie)
 * console.log(result.data.aweme_list) // 推荐的视频列表
 * console.log(result.data.max_cursor) // 下一页游标
 * ```
 */
export async function fetchUserRecommendList<M extends TypeMode = 'loose'> (
  options: DouyinUserListOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['userRecommendList'], M>>> {
  return fetchDouyinInternal('userRecommendList', options, { cookie, requestConfig })
}
