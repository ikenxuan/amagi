/**
 * 小红书笔记相关 API
 * @module fetchers/xiaohongshu/note
 */

import { RequestConfig } from 'amagi/server'
import { XiaohongshuDataOptionsMap } from 'amagi/types'
import { Result } from 'amagi/validation'

import type { ConditionalReturnType, TypeMode, XiaohongshuCommentsOptions, XiaohongshuHomeFeedOptions, XiaohongshuNoteDetailOptions } from '../types'
import { fetchXiaohongshuInternal } from './internal'

/**
 * 获取小红书首页推荐数据
 * @param options - 首页参数 (可选)
 * @param cookie - 小红书 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 首页推荐笔记列表
 * @example
 * ```typescript
 * const result = await fetchHomeFeed({}, cookie)
 * console.log(result.data.items) // 推荐笔记列表
 * ```
 */
export async function fetchHomeFeed<M extends TypeMode = 'loose'> (
  options: XiaohongshuHomeFeedOptions = {},
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<XiaohongshuDataOptionsMap['homeFeed']['data'], M>>> {
  return fetchXiaohongshuInternal('homeFeed', options, { cookie, requestConfig })
}

/**
 * 获取小红书笔记详情
 * @param options - 笔记参数
 * @param options.note_id - 笔记 ID
 * @param options.xsec_token - 安全 token
 * @param cookie - 小红书 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 笔记详细信息
 * @example
 * ```typescript
 * const result = await fetchNoteDetail({
 *   note_id: '691db851000000001e037279',
 *   xsec_token: 'xxx'
 * }, cookie)
 * console.log(result.data.title) // 笔记标题
 * ```
 */
export async function fetchNoteDetail<M extends TypeMode = 'loose'> (
  options: XiaohongshuNoteDetailOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<XiaohongshuDataOptionsMap['noteDetail']['data'], M>>> {
  return fetchXiaohongshuInternal('noteDetail', options, { cookie, requestConfig })
}

/**
 * 获取小红书笔记评论数据
 * @param options - 评论参数
 * @param options.note_id - 笔记 ID
 * @param options.xsec_token - 安全 token
 * @param cookie - 小红书 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 评论列表数据
 * @example
 * ```typescript
 * const result = await fetchNoteComments({
 *   note_id: '691db851000000001e037279',
 *   xsec_token: 'xxx'
 * }, cookie)
 * console.log(result.data.comments) // 评论列表
 * ```
 */
export async function fetchNoteComments<M extends TypeMode = 'loose'> (
  options: XiaohongshuCommentsOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<XiaohongshuDataOptionsMap['noteComments']['data'], M>>> {
  return fetchXiaohongshuInternal('noteComments', options, { cookie, requestConfig })
}
