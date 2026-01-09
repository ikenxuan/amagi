/**
 * B站直播相关 API
 * @module fetchers/bilibili/live
 */

import { RequestConfig } from 'amagi/server'
import { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import { Result } from 'amagi/validation'

import type { BilibiliLiveRoomOptions, ConditionalReturnType, TypeMode } from '../types'
import { fetchBilibiliInternal } from './internal'

/**
 * 获取B站直播间信息
 * @param options - 直播间参数
 * @param options.room_id - 直播间 ID
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 直播间详细信息
 * @example
 * ```typescript
 * const result = await fetchLiveRoomInfo({ room_id: 12345 }, cookie)
 * console.log(result.data.title) // 直播间标题
 * ```
 */
export async function fetchLiveRoomInfo<M extends TypeMode = 'loose'> (
  options: BilibiliLiveRoomOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['liveRoomInfo'], M>>> {
  return fetchBilibiliInternal('liveRoomInfo', options, { cookie, requestConfig })
}

/**
 * 获取B站直播间初始化信息
 * @param options - 直播间参数
 * @param options.room_id - 直播间 ID
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 直播间初始化信息
 * @example
 * ```typescript
 * const result = await fetchLiveRoomInitInfo({ room_id: 12345 }, cookie)
 * console.log(result.data.live_status) // 直播状态
 * ```
 */
export async function fetchLiveRoomInitInfo<M extends TypeMode = 'loose'> (
  options: BilibiliLiveRoomOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['liveRoomInit'], M>>> {
  return fetchBilibiliInternal('liveRoomInit', options, { cookie, requestConfig })
}
