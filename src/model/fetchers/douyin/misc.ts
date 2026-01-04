/**
 * 抖音其他 API (音乐、直播、登录、表情等)
 * @module fetchers/douyin/misc
 */

import { RequestConfig } from 'amagi/server'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { Result } from 'amagi/validation'

import type { ConditionalReturnType, DouyinLiveRoomOptions, DouyinMusicOptions, DouyinQrcodeOptions, TypeMode } from '../types'
import { fetchDouyinInternal } from './internal'

/**
 * 获取抖音音乐数据
 * @param options - 音乐参数
 * @param options.music_id - 音乐 ID
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 音乐详细信息
 * @example
 * ```typescript
 * const result = await fetchMusicInfo({ music_id: '7123456789' }, cookie)
 * console.log(result.data.title) // 音乐标题
 * ```
 */
export async function fetchMusicInfo<M extends TypeMode = 'loose'> (
  options: DouyinMusicOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['音乐数据'], M>>> {
  return fetchDouyinInternal('音乐数据', options, { cookie, requestConfig })
}

/**
 * 获取抖音直播间信息
 * @param options - 直播间参数
 * @param options.room_id - 直播间 ID
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 直播间详细信息
 * @example
 * ```typescript
 * const result = await fetchLiveRoomInfo({ room_id: '7123456789' }, cookie)
 * console.log(result.data.title) // 直播间标题
 * ```
 */
export async function fetchLiveRoomInfo<M extends TypeMode = 'loose'> (
  options: DouyinLiveRoomOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['直播间信息数据'], M>>> {
  return fetchDouyinInternal('直播间信息数据', options, { cookie, requestConfig })
}

/**
 * 申请抖音登录二维码
 * @param options - 二维码参数
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 二维码信息
 * @example
 * ```typescript
 * const result = await requestLoginQrcode({}, cookie)
 * console.log(result.data.qrcode) // 二维码图片
 * ```
 */
export async function requestLoginQrcode<M extends TypeMode = 'loose'> (
  options: DouyinQrcodeOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['申请二维码数据'], M>>> {
  return fetchDouyinInternal('申请二维码数据', options, { cookie, requestConfig })
}

/**
 * 获取抖音表情列表
 * @param options - 请求选项 (可选)
 * @param options.typeMode - 类型模式: 'strict' 返回严格类型, 'loose' 返回 any
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 表情列表数据
 * @example
 * ```typescript
 * const result = await fetchEmojiList({ typeMode: 'strict' }, cookie)
 * console.log(result.data.emoji_list) // 表情列表
 * ```
 */
export async function fetchEmojiList<M extends TypeMode = 'loose'> (
  options?: { typeMode?: M },
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['Emoji数据'], M>>> {
  return fetchDouyinInternal('Emoji数据', {}, { cookie, requestConfig })
}

/**
 * 获取抖音动态表情列表
 * @param options - 请求选项 (可选)
 * @param options.typeMode - 类型模式: 'strict' 返回严格类型, 'loose' 返回 any
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 动态表情列表数据
 * @example
 * ```typescript
 * const result = await fetchDynamicEmojiList({ typeMode: 'strict' }, cookie)
 * console.log(result.data) // 动态表情列表
 * ```
 */
export async function fetchDynamicEmojiList<M extends TypeMode = 'loose'> (
  options?: { typeMode?: M },
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['动态表情数据'], M>>> {
  return fetchDouyinInternal('动态表情数据', {}, { cookie, requestConfig })
}
