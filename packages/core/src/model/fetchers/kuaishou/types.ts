/**
 * 快手 Fetcher 接口定义
 * @module fetchers/kuaishou/types
 */

import { RequestConfig } from 'amagi/server'
import { KuaishouReturnTypeMap } from 'amagi/types/ReturnDataType/Kuaishou'
import { Result } from 'amagi/validation'

import type { BaseRequestOptions, ConditionalReturnType, TypeMode } from '../types'

// ============================================================================
// 快手 Options 类型定义
// ============================================================================

/** 快手作品请求参数 */
export interface KuaishouVideoWorkOptions extends BaseRequestOptions {
  /** 作品 ID (photoId) */
  photoId: string
}

/** 快手评论请求参数 */
export interface KuaishouCommentsOptions extends BaseRequestOptions {
  /** 作品 ID (photoId) */
  photoId: string
}

/**
 * 快手 Fetcher 接口定义
 * 包含所有快手 API 方法的类型签名
 */
export interface IKuaishouFetcher {
  /**
   * 获取快手视频作品数据
   */
  fetchVideoWork: <M extends TypeMode = 'loose'>(
    options: KuaishouVideoWorkOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<KuaishouReturnTypeMap['videoWork'], M>>>

  /**
   * 获取快手作品评论数据
   */
  fetchWorkComments: <M extends TypeMode = 'loose'>(
    options: KuaishouCommentsOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<KuaishouReturnTypeMap['comments'], M>>>

  /**
   * 获取快手表情列表
   */
  fetchEmojiList: <M extends TypeMode = 'loose'>(
    options?: { typeMode?: M },
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<KuaishouReturnTypeMap['emojiList'], M>>>
}

/**
 * 绑定了 Cookie 的快手 Fetcher 接口
 * 调用方法时无需传递 cookie 参数
 */
export interface IBoundKuaishouFetcher {
  /** 获取快手视频作品数据 */
  fetchVideoWork: {
    (options: KuaishouVideoWorkOptions & { typeMode: 'strict' }): Promise<Result<KuaishouReturnTypeMap['videoWork']>>
    (options: KuaishouVideoWorkOptions): Promise<Result<any>>
  }

  /** 获取快手作品评论数据 */
  fetchWorkComments: {
    (options: KuaishouCommentsOptions & { typeMode: 'strict' }): Promise<Result<KuaishouReturnTypeMap['comments']>>
    (options: KuaishouCommentsOptions): Promise<Result<any>>
  }

  /** 获取快手表情列表 */
  fetchEmojiList: {
    (options: { typeMode: 'strict' }): Promise<Result<KuaishouReturnTypeMap['emojiList']>>
    (options?: BaseRequestOptions): Promise<Result<any>>
  }
}
