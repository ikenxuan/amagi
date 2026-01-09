/**
 * 快手 API 方法
 * @module fetchers/kuaishou/api
 */

import { RequestConfig } from 'amagi/server'
import { KuaishouReturnTypeMap } from 'amagi/types/ReturnDataType/Kuaishou'
import { Result } from 'amagi/validation'

import type { ConditionalReturnType, KuaishouCommentsOptions, KuaishouVideoWorkOptions, TypeMode } from '../types'
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
