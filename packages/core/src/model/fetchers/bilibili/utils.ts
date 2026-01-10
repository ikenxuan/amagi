/**
 * B站工具类 API
 * @module fetchers/bilibili/utils
 */

import { RequestConfig } from 'amagi/server'
import { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import { Result } from 'amagi/validation'

import type { BilibiliAv2BvOptions, BilibiliBv2AvOptions, ConditionalReturnType, TypeMode } from '../types'
import { fetchBilibiliInternal } from './internal'

/**
 * 将 AV 号转换为 BV 号
 * @param options - 转换参数
 * @param options.aid - AV 号 (数字)
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 转换后的 BV 号
 * @example
 * ```typescript
 * const result = await convertAvToBv({ aid: 170001 }, cookie)
 * console.log(result.data.bvid) // BV17x411w7KC
 * ```
 */
export async function convertAvToBv<M extends TypeMode = 'loose'> (
  options: BilibiliAv2BvOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['avToBv'], M>>> {
  return fetchBilibiliInternal('avToBv', options, { cookie, requestConfig })
}

/**
 * 将 BV 号转换为 AV 号
 * @param options - 转换参数
 * @param options.bvid - BV 号 (字符串)
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 转换后的 AV 号
 * @example
 * ```typescript
 * const result = await convertBvToAv({ bvid: 'BV17x411w7KC' }, cookie)
 * console.log(result.data.aid) // 170001
 * ```
 */
export async function convertBvToAv<M extends TypeMode = 'loose'> (
  options: BilibiliBv2AvOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['bvToAv'], M>>> {
  return fetchBilibiliInternal('bvToAv', options, { cookie, requestConfig })
}

/**
 * 获取B站表情包列表
 * @param options - 请求选项 (可选)
 * @param options.typeMode - 类型模式: 'strict' 返回严格类型, 'loose' 返回 any
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 表情包列表数据
 * @example
 * ```typescript
 * const result = await fetchEmojiList({ typeMode: 'strict' }, cookie)
 * console.log(result.data.packages) // 表情包列表
 * ```
 */
export async function fetchEmojiList<M extends TypeMode = 'loose'> (
  options?: { typeMode?: M },
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['emojiList'], M>>> {
  return fetchBilibiliInternal('emojiList', {}, { cookie, requestConfig })
}
