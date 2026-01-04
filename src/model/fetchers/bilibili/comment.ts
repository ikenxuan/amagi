/**
 * B站评论相关 API
 * @module fetchers/bilibili/comment
 */

import { RequestConfig } from 'amagi/server'
import { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import { Result } from 'amagi/validation'

import type { BilibiliCommentRepliesOptions, BilibiliCommentsOptions, ConditionalReturnType, TypeMode } from '../types'
import { fetchBilibiliInternal } from './internal'

/**
 * 获取B站视频/动态评论列表
 * @param options - 评论参数
 * @param options.oid - 目标 ID (视频为 avid，动态为动态 ID)
 * @param options.type - 评论区类型 (1: 视频, 17: 动态)
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 评论列表数据
 * @example
 * ```typescript
 * const result = await fetchComments({ oid: 123456, type: 1 }, cookie)
 * console.log(result.data.replies) // 评论列表
 * ```
 */
export async function fetchComments<M extends TypeMode = 'loose'> (
  options: BilibiliCommentsOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['评论数据'], M>>> {
  return fetchBilibiliInternal('评论数据', options, { cookie, requestConfig })
}

/**
 * 获取B站指定评论的回复列表
 * @param options - 回复参数
 * @param options.oid - 目标 ID
 * @param options.type - 评论区类型
 * @param options.root - 根评论 ID
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 评论回复列表
 * @example
 * ```typescript
 * const result = await fetchCommentReplies({ oid: 123456, type: 1, root: 789 }, cookie)
 * console.log(result.data.replies) // 回复列表
 * ```
 */
export async function fetchCommentReplies<M extends TypeMode = 'loose'> (
  options: BilibiliCommentRepliesOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['指定评论的回复'], M>>> {
  return fetchBilibiliInternal('指定评论的回复', options, { cookie, requestConfig })
}
