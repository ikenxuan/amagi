/**
 * 快手 Fetcher 接口定义
 * @module fetchers/kuaishou/types
 */

import { RequestConfig } from 'amagi/server'
import { KuaishouReturnTypeMap } from 'amagi/types/ReturnDataType/Kuaishou'
import { Result } from 'amagi/validation'

import type { BoundMethodOverload, BoundNoParamMethodOverload, MethodOverload, NoParamMethodOverload } from '../shared/overload-types'
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
  fetchVideoWork: MethodOverload<KuaishouVideoWorkOptions, KuaishouReturnTypeMap['videoWork']>

  /**
   * 获取快手作品评论数据
   */
  fetchWorkComments: MethodOverload<KuaishouCommentsOptions, KuaishouReturnTypeMap['comments']>

  /**
   * 获取快手表情列表
   */
  fetchEmojiList: NoParamMethodOverload<KuaishouReturnTypeMap['emojiList']>
}

/**
 * 绑定了 Cookie 的快手 Fetcher 接口
 * 调用方法时无需传递 cookie 参数
 */
export interface IBoundKuaishouFetcher {
  /** 获取快手视频作品数据 */
  fetchVideoWork: BoundMethodOverload<KuaishouVideoWorkOptions, KuaishouReturnTypeMap['videoWork']>

  /** 获取快手作品评论数据 */
  fetchWorkComments: BoundMethodOverload<KuaishouCommentsOptions, KuaishouReturnTypeMap['comments']>

  /** 获取快手表情列表 */
  fetchEmojiList: BoundNoParamMethodOverload<KuaishouReturnTypeMap['emojiList']>
}
