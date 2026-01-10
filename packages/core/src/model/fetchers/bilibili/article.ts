/**
 * B站专栏相关 API
 * @module fetchers/bilibili/article
 */

import { RequestConfig } from 'amagi/server'
import { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import { Result } from 'amagi/validation'

import type { BilibiliArticleCardOptions, BilibiliArticleOptions, ConditionalReturnType, TypeMode } from '../types'
import { fetchBilibiliInternal } from './internal'

/**
 * 获取B站专栏正文内容
 * @param options - 专栏参数
 * @param options.id - 专栏文章 ID (cvid)
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 专栏正文 HTML 内容
 * @example
 * ```typescript
 * const result = await fetchArticleContent({ id: 12345 }, cookie)
 * console.log(result.data) // 文章 HTML 内容
 * ```
 */
export async function fetchArticleContent<M extends TypeMode = 'loose'> (
  options: BilibiliArticleOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['articleContent'], M>>> {
  return fetchBilibiliInternal('articleContent', options, { cookie, requestConfig })
}

/**
 * 获取B站专栏卡片信息
 * @param options - 专栏卡片参数
 * @param options.id - 专栏文章 ID 列表
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 专栏卡片信息列表
 * @example
 * ```typescript
 * const result = await fetchArticleCards({ id: [12345, 67890] }, cookie)
 * console.log(result.data) // 卡片信息列表
 * ```
 */
export async function fetchArticleCards<M extends TypeMode = 'loose'> (
  options: BilibiliArticleCardOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['articleCards'], M>>> {
  return fetchBilibiliInternal('articleCards', options, { cookie, requestConfig })
}

/**
 * 获取B站专栏文章基本信息
 * @param options - 专栏参数
 * @param options.id - 专栏文章 ID (cvid)
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 专栏文章基本信息
 * @example
 * ```typescript
 * const result = await fetchArticleInfo({ id: 12345 }, cookie)
 * console.log(result.data.title) // 文章标题
 * ```
 */
export async function fetchArticleInfo<M extends TypeMode = 'loose'> (
  options: BilibiliArticleOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['articleInfo'], M>>> {
  return fetchBilibiliInternal('articleInfo', options, { cookie, requestConfig })
}

/**
 * 获取B站文集基本信息
 * @param options - 文集参数
 * @param options.id - 文集 ID
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 文集基本信息
 * @example
 * ```typescript
 * const result = await fetchArticleListInfo({ id: 12345 }, cookie)
 * console.log(result.data.name) // 文集名称
 * ```
 */
export async function fetchArticleListInfo<M extends TypeMode = 'loose'> (
  options: BilibiliArticleOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['articleListInfo'], M>>> {
  return fetchBilibiliInternal('articleListInfo', options, { cookie, requestConfig })
}
