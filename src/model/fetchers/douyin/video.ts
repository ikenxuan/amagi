/**
 * 抖音作品相关 API
 * @module fetchers/douyin/video
 */

import { RequestConfig } from 'amagi/server'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { Result } from 'amagi/validation'

import type { ConditionalReturnType, DouyinDanmakuOptions, DouyinWorkOptions, TypeMode } from '../types'
import { fetchDouyinInternal } from './internal'

/**
 * 获取抖音视频作品数据
 * @param options - 作品参数
 * @param options.aweme_id - 作品 ID
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 视频作品详细信息
 * @example
 * ```typescript
 * const result = await fetchVideoWork({ aweme_id: '7123456789' }, cookie)
 * console.log(result.data.desc) // 视频描述
 * ```
 */
export async function fetchVideoWork<M extends TypeMode = 'loose'> (
  options: DouyinWorkOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['视频作品数据'], M>>> {
  return fetchDouyinInternal('视频作品数据', options, { cookie, requestConfig })
}

/**
 * 获取抖音图集作品数据
 * @param options - 作品参数
 * @param options.aweme_id - 作品 ID
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 图集作品详细信息
 * @example
 * ```typescript
 * const result = await fetchImageAlbumWork({ aweme_id: '7123456789' }, cookie)
 * console.log(result.data.images) // 图片列表
 * ```
 */
export async function fetchImageAlbumWork<M extends TypeMode = 'loose'> (
  options: DouyinWorkOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['图集作品数据'], M>>> {
  return fetchDouyinInternal('图集作品数据', options, { cookie, requestConfig })
}

/**
 * 获取抖音合辑作品数据
 * @param options - 作品参数
 * @param options.aweme_id - 作品 ID
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 合辑作品详细信息
 * @example
 * ```typescript
 * const result = await fetchSlidesWork({ aweme_id: '7123456789' }, cookie)
 * console.log(result.data) // 合辑数据
 * ```
 */
export async function fetchSlidesWork<M extends TypeMode = 'loose'> (
  options: DouyinWorkOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['合辑作品数据'], M>>> {
  return fetchDouyinInternal('合辑作品数据', options, { cookie, requestConfig })
}

/**
 * 获取抖音文字作品数据
 * @param options - 作品参数
 * @param options.aweme_id - 作品 ID
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 文字作品详细信息
 * @example
 * ```typescript
 * const result = await fetchTextWork({ aweme_id: '7123456789' }, cookie)
 * console.log(result.data.desc) // 文字内容
 * ```
 */
export async function fetchTextWork<M extends TypeMode = 'loose'> (
  options: DouyinWorkOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['文字作品数据'], M>>> {
  return fetchDouyinInternal('文字作品数据', options, { cookie, requestConfig })
}

/**
 * 聚合解析抖音作品数据 (自动识别作品类型)
 * @param options - 作品参数
 * @param options.aweme_id - 作品 ID
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 作品详细信息
 * @example
 * ```typescript
 * const result = await parseWork({ aweme_id: '7123456789' }, cookie)
 * console.log(result.data) // 自动解析的作品数据
 * ```
 */
export async function parseWork<M extends TypeMode = 'loose'> (
  options: DouyinWorkOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['聚合解析'], M>>> {
  return fetchDouyinInternal('聚合解析', options, { cookie, requestConfig })
}

/**
 * 获取抖音视频弹幕数据
 * @param options - 弹幕参数
 * @param options.aweme_id - 作品 ID
 * @param cookie - 抖音 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 弹幕数据列表
 * @example
 * ```typescript
 * const result = await fetchDanmakuList({ aweme_id: '7123456789' }, cookie)
 * console.log(result.data) // 弹幕列表
 * ```
 */
export async function fetchDanmakuList<M extends TypeMode = 'loose'> (
  options: DouyinDanmakuOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['弹幕数据'], M>>> {
  return fetchDouyinInternal('弹幕数据', options, { cookie, requestConfig })
}
