/**
 * 快手 Fetcher 接口定义
 * @module fetchers/kuaishou/types
 */

import { KuaishouReturnTypeMap } from 'amagi/types/ReturnDataType/Kuaishou'

import type { BoundMethodOverload, BoundNoParamMethodOverload, MethodOverload, NoParamMethodOverload } from '../shared/overload-types'
import type { BaseRequestOptions } from '../types'

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

/** 快手用户资料请求参数 */
export interface KuaishouUserProfileOptions extends BaseRequestOptions {
  /** 用户主页 principalId，可直接取 profile 页 URL 末段 */
  principalId: string
}

/** 快手用户作品列表请求参数 */
export interface KuaishouUserWorkListOptions extends BaseRequestOptions {
  /** 用户主页 principalId，可直接取 profile 页 URL 末段 */
  principalId: string
  /** 分页游标；为空时请求首屏作品列表 */
  pcursor?: string
  /** 每页数量，默认 12 */
  count?: number
}

/** 快手直播间信息请求参数 */
export interface KuaishouLiveRoomInfoOptions extends BaseRequestOptions {
  /** 直播间 principalId，可直接取 /u/{principalId} URL 末段 */
  principalId: string
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

  /** 获取快手用户主页数据 */
  fetchUserProfile: MethodOverload<KuaishouUserProfileOptions, KuaishouReturnTypeMap['userProfile']>

  /** 获取快手用户作品列表数据 */
  fetchUserWorkList: MethodOverload<KuaishouUserWorkListOptions, KuaishouReturnTypeMap['userWorkList']>

  /** 获取快手直播间信息数据 */
  fetchLiveRoomInfo: MethodOverload<KuaishouLiveRoomInfoOptions, KuaishouReturnTypeMap['liveRoomInfo']>

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

  /** 获取快手用户主页数据 */
  fetchUserProfile: BoundMethodOverload<KuaishouUserProfileOptions, KuaishouReturnTypeMap['userProfile']>

  /** 获取快手用户作品列表数据 */
  fetchUserWorkList: BoundMethodOverload<KuaishouUserWorkListOptions, KuaishouReturnTypeMap['userWorkList']>

  /** 获取快手直播间信息数据 */
  fetchLiveRoomInfo: BoundMethodOverload<KuaishouLiveRoomInfoOptions, KuaishouReturnTypeMap['liveRoomInfo']>

  /** 获取快手表情列表 */
  fetchEmojiList: BoundNoParamMethodOverload<KuaishouReturnTypeMap['emojiList']>
}
