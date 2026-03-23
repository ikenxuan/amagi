/**
 * 快手 API 方法
 * @module fetchers/kuaishou/api
 */

import { RequestConfig } from 'amagi/server'
import { KuaishouReturnTypeMap } from 'amagi/types/ReturnDataType/Kuaishou'
import { Result } from 'amagi/validation'

import type {
  ConditionalReturnType,
  KuaishouCommentsOptions,
  KuaishouLiveRoomInfoOptions,
  KuaishouUserProfileOptions,
  KuaishouUserWorkListOptions,
  KuaishouVideoWorkOptions,
  TypeMode
} from '../types'
import { fetchKuaishouInternal } from './internal'

/**
 * 获取快手视频作品数据
 * @param options - 作品参数
 * @param options.photoId - 作品 ID
 * @param cookie - 快手 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 视频作品详细信息
 * @example
 * ```typescript
 * const result = await fetchVideoWork({ photoId: '3x123456789' }, cookie)
 * console.log(result.data.caption) // 视频描述
 * ```
 */
export async function fetchVideoWork<M extends TypeMode = 'loose'> (
  options: KuaishouVideoWorkOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<KuaishouReturnTypeMap['videoWork'], M>>> {
  return fetchKuaishouInternal('videoWork', options, { cookie, requestConfig })
}

/**
 * 获取快手作品评论数据
 * @param options - 评论参数
 * @param options.photoId - 作品 ID
 * @param options.pcursor - 分页游标 (可选)
 * @param cookie - 快手 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 评论列表数据
 * @example
 * ```typescript
 * const result = await fetchWorkComments({ photoId: '3x123456789' }, cookie)
 * console.log(result.data.commentList) // 评论列表
 * ```
 */
export async function fetchWorkComments<M extends TypeMode = 'loose'> (
  options: KuaishouCommentsOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<KuaishouReturnTypeMap['comments'], M>>> {
  return fetchKuaishouInternal('comments', options, { cookie, requestConfig })
}

/**
 * 获取快手用户主页数据
 * @param options - 用户主页参数
 * @param options.principalId - 用户 principalId
 * @param cookie - 快手 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 用户主页纯协议聚合结果
 */
export async function fetchUserProfile<M extends TypeMode = 'loose'> (
  options: KuaishouUserProfileOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<KuaishouReturnTypeMap['userProfile'], M>>> {
  return fetchKuaishouInternal('userProfile', options, { cookie, requestConfig })
}

/**
 * 获取快手用户作品列表数据
 * @param options - 用户作品列表参数
 * @param options.principalId - 用户 principalId
 * @param options.pcursor - 分页游标 (可选)
 * @param options.count - 每页数量，默认 12
 * @param cookie - 快手 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 用户作品列表纯协议分页结果
 */
export async function fetchUserWorkList<M extends TypeMode = 'loose'> (
  options: KuaishouUserWorkListOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<KuaishouReturnTypeMap['userWorkList'], M>>> {
  return fetchKuaishouInternal('userWorkList', options, { cookie, requestConfig })
}

/**
 * 获取快手直播间信息数据
 * @param options - 直播间参数
 * @param options.principalId - 直播间 principalId
 * @param cookie - 快手 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 当前直播间纯协议聚合结果
 */
export async function fetchLiveRoomInfo<M extends TypeMode = 'loose'> (
  options: KuaishouLiveRoomInfoOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<KuaishouReturnTypeMap['liveRoomInfo'], M>>> {
  return fetchKuaishouInternal('liveRoomInfo', options, { cookie, requestConfig })
}

/**
 * 获取快手表情列表
 * @param options - 请求选项 (可选)
 * @param options.typeMode - 类型模式: 'strict' 返回严格类型, 'loose' 返回 any
 * @param cookie - 快手 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 表情列表数据
 * @example
 * ```typescript
 * const result = await fetchEmojiList({ typeMode: 'strict' }, cookie)
 * console.log(result.data) // 表情列表
 * ```
 */
export async function fetchEmojiList<M extends TypeMode = 'loose'> (
  options?: { typeMode?: M },
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<KuaishouReturnTypeMap['emojiList'], M>>> {
  return fetchKuaishouInternal('emojiList', {}, { cookie, requestConfig })
}
