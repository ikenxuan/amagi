/**
 * B站视频相关 API
 * @module fetchers/bilibili/video
 */

import { RequestConfig } from 'amagi/server'
import { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import { Result } from 'amagi/validation'

import type { BilibiliDanmakuOptions, BilibiliVideoInfoOptions, BilibiliVideoStreamOptions, ConditionalReturnType, TypeMode } from '../types'
import { fetchBilibiliInternal } from './internal'

/**
 * 获取B站视频详细信息
 * @param options - 视频参数
 * @param options.bvid - 视频 BV 号
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 视频详细信息
 * @example
 * ```typescript
 * const result = await fetchVideoInfo({ bvid: 'BV1xx411c7mD' }, cookie)
 * console.log(result.data.title) // 视频标题
 * ```
 */
export async function fetchVideoInfo<M extends TypeMode = 'loose'> (
  options: BilibiliVideoInfoOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['单个视频作品数据'], M>>> {
  return fetchBilibiliInternal('单个视频作品数据', options, { cookie, requestConfig })
}

/**
 * 获取B站视频流地址
 * @param options - 视频流参数
 * @param options.avid - 视频 AV 号
 * @param options.cid - 视频 CID
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 视频流信息，包含下载地址
 * @example
 * ```typescript
 * const result = await fetchVideoStreamUrl({ avid: 123456, cid: 789012 }, cookie)
 * console.log(result.data.durl) // 视频下载地址列表
 * ```
 */
export async function fetchVideoStreamUrl<M extends TypeMode = 'loose'> (
  options: BilibiliVideoStreamOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['单个视频下载信息数据'], M>>> {
  return fetchBilibiliInternal('单个视频下载信息数据', options, { cookie, requestConfig })
}

/**
 * 获取B站视频实时弹幕
 * @param options - 弹幕参数
 * @param options.cid - 视频 CID
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 弹幕数据列表
 * @example
 * ```typescript
 * const result = await fetchVideoDanmaku({ cid: 789012 }, cookie)
 * console.log(result.data) // 弹幕列表
 * ```
 */
export async function fetchVideoDanmaku<M extends TypeMode = 'loose'> (
  options: BilibiliDanmakuOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['实时弹幕'], M>>> {
  return fetchBilibiliInternal('实时弹幕', options, { cookie, requestConfig })
}
