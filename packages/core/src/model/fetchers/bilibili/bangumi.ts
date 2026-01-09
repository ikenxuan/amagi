/**
 * B站番剧相关 API
 * @module fetchers/bilibili/bangumi
 */

import { RequestConfig } from 'amagi/server'
import { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import { Result } from 'amagi/validation'

import type { BilibiliBangumiInfoOptions, BilibiliBangumiStreamOptions, ConditionalReturnType, TypeMode } from '../types'
import { fetchBilibiliInternal } from './internal'

/**
 * 获取B站番剧基本信息
 * @param options - 番剧参数
 * @param options.season_id - 番剧季度 ID (可选)
 * @param options.ep_id - 番剧单集 ID (可选)
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 番剧基本信息
 * @example
 * ```typescript
 * const result = await fetchBangumiInfo({ season_id: 12345 }, cookie)
 * console.log(result.data.title) // 番剧标题
 * ```
 */
export async function fetchBangumiInfo<M extends TypeMode = 'loose'> (
  options: BilibiliBangumiInfoOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['bangumiInfo'], M>>> {
  return fetchBilibiliInternal('bangumiInfo', options, { cookie, requestConfig })
}

/**
 * 获取B站番剧视频流地址
 * @param options - 番剧流参数
 * @param options.ep_id - 番剧单集 ID
 * @param options.cid - 视频 CID
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 番剧视频流信息
 * @example
 * ```typescript
 * const result = await fetchBangumiStreamUrl({ ep_id: 12345, cid: 67890 }, cookie)
 * console.log(result.data.durl) // 视频流地址
 * ```
 */
export async function fetchBangumiStreamUrl<M extends TypeMode = 'loose'> (
  options: BilibiliBangumiStreamOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['bangumiStream'], M>>> {
  return fetchBilibiliInternal('bangumiStream', options, { cookie, requestConfig })
}
