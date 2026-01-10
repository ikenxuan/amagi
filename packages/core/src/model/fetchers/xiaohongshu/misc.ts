/**
 * 小红书其他 API
 * @module fetchers/xiaohongshu/misc
 */

import { RequestConfig } from 'amagi/server'
import { XiaohongshuDataOptionsMap } from 'amagi/types'
import { Result } from 'amagi/validation'

import type { ConditionalReturnType, TypeMode } from '../types'
import { fetchXiaohongshuInternal } from './internal'

/**
 * 获取小红书表情列表
 * @param options - 请求选项 (可选)
 * @param options.typeMode - 类型模式: 'strict' 返回严格类型, 'loose' 返回 any
 * @param cookie - 小红书 Cookie (可选)
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
): Promise<Result<ConditionalReturnType<XiaohongshuDataOptionsMap['emojiList']['data'], M>>> {
  return fetchXiaohongshuInternal('emojiList', {}, { cookie, requestConfig })
}
