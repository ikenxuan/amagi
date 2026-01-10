/**
 * 小红书搜索相关 API
 * @module fetchers/xiaohongshu/search
 */

import { RequestConfig } from 'amagi/server'
import { XiaohongshuDataOptionsMap } from 'amagi/types'
import { Result } from 'amagi/validation'

import type { ConditionalReturnType, TypeMode, XiaohongshuSearchNotesOptions } from '../types'
import { fetchXiaohongshuInternal, SearchNoteType, sortTypeMapping } from './internal'

/**
 * 搜索小红书笔记
 * @param options - 搜索参数
 * @param options.keyword - 搜索关键词
 * @param options.sort - 排序方式: 'general' | 'time_descending' | 'popularity_descending'
 * @param options.note_type - 笔记类型 (可选)
 * @param cookie - 小红书 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 搜索结果列表
 * @example
 * ```typescript
 * // 综合搜索
 * const result = await searchNotes({ keyword: '美食', sort: 'general' }, cookie)
 *
 * // 按时间排序
 * const latest = await searchNotes({ keyword: '美食', sort: 'time_descending' }, cookie)
 *
 * // 按热度排序
 * const popular = await searchNotes({ keyword: '美食', sort: 'popularity_descending' }, cookie)
 * ```
 */
export async function searchNotes<M extends TypeMode = 'loose'> (
  options: XiaohongshuSearchNotesOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<XiaohongshuDataOptionsMap['searchNotes']['data'], M>>> {
  const { sort, note_type, ...rest } = options
  const mappedOptions = {
    ...rest,
    sort: sort ? sortTypeMapping[sort] : undefined,
    note_type: note_type as SearchNoteType | undefined
  }
  return fetchXiaohongshuInternal('searchNotes', mappedOptions, { cookie, requestConfig })
}
