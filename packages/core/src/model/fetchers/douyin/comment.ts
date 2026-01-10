/**
 * 抖音评论相关 API
 * @module fetchers/douyin/comment
 */

import { RequestConfig } from 'amagi/server'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { Result } from 'amagi/validation'

import type { ConditionalReturnType, DouyinCommentRepliesOptions, DouyinCommentsOptions, TypeMode } from '../types'
import { fetchDouyinInternal } from './internal'

/**
 * 获取抖音作品评论数据
 * @param options - 评论参数
 * @param options.aweme_id - 作品 ID
 * @param options.number - 获取数量 (可选)
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 评论列表数据
 * @example
 * ```typescript
 * const result = await fetchWorkComments({ aweme_id: '7123456789', number: 20 }, cookie)
 * console.log(result.data.comments) // 评论列表
 * ```
 */
export async function fetchWorkComments<M extends TypeMode = 'loose'> (
  options: DouyinCommentsOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['comments'], M>>> {
  return fetchDouyinInternal('comments', options, { cookie, requestConfig })
}

/**
 * 获取抖音指定评论的回复数据
 * @param options - 回复参数
 * @param options.aweme_id - 作品 ID
 * @param options.comment_id - 评论 ID
 * @param options.number - 获取数量 (可选)
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 评论回复列表
 * @example
 * ```typescript
 * const result = await fetchCommentReplies({
 *   aweme_id: '7123456789',
 *   comment_id: '7123456789012345678',
 *   number: 10
 * }, cookie)
 * console.log(result.data.comments) // 回复列表
 * ```
 */
export async function fetchCommentReplies<M extends TypeMode = 'loose'> (
  options: DouyinCommentRepliesOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['commentReplies'], M>>> {
  return fetchDouyinInternal('commentReplies', options, { cookie, requestConfig })
}
