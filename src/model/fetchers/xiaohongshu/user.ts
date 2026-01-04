/**
 * 小红书用户相关 API
 * @module fetchers/xiaohongshu/user
 */

import { RequestConfig } from 'amagi/server'
import { XiaohongshuDataOptionsMap } from 'amagi/types'
import { Result } from 'amagi/validation'

import type { ConditionalReturnType, TypeMode, XiaohongshuUserNotesOptions, XiaohongshuUserProfileOptions } from '../types'
import { fetchXiaohongshuInternal } from './internal'

/**
 * 获取小红书用户主页数据
 * @param options - 用户参数
 * @param options.user_id - 用户 ID
 * @param cookie - 小红书 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 用户主页信息
 * @example
 * ```typescript
 * const result = await fetchUserProfile({ user_id: '5a1234567890abcdef' }, cookie)
 * console.log(result.data.nickname) // 用户昵称
 * ```
 */
export async function fetchUserProfile<M extends TypeMode = 'loose'> (
  options: XiaohongshuUserProfileOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<XiaohongshuDataOptionsMap['用户数据']['data'], M>>> {
  return fetchXiaohongshuInternal('用户数据', options, { cookie, requestConfig })
}

/**
 * 获取小红书用户笔记列表
 * @param options - 用户笔记参数
 * @param options.user_id - 用户 ID
 * @param cookie - 小红书 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 用户笔记列表
 * @example
 * ```typescript
 * const result = await fetchUserNoteList({ user_id: '5a1234567890abcdef' }, cookie)
 * console.log(result.data.notes) // 笔记列表
 * ```
 */
export async function fetchUserNoteList<M extends TypeMode = 'loose'> (
  options: XiaohongshuUserNotesOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<XiaohongshuDataOptionsMap['用户笔记数据']['data'], M>>> {
  return fetchXiaohongshuInternal('用户笔记数据', options, { cookie, requestConfig })
}
