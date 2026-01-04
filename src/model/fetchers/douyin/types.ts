/**
 * 抖音 Fetcher 接口定义
 * @module fetchers/douyin/types
 */

import { RequestConfig } from 'amagi/server'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { Result } from 'amagi/validation'

import type { BaseRequestOptions, ConditionalReturnType, TypeMode } from '../types'

// ============================================================================
// 抖音 Options 类型定义
// ============================================================================

/** 抖音作品请求参数 */
export interface DouyinWorkOptions extends BaseRequestOptions {
  /** 作品 ID，如 `7123456789012345678` */
  aweme_id: string
}

/** 抖音评论请求参数 */
export interface DouyinCommentsOptions extends BaseRequestOptions {
  /** 作品 ID */
  aweme_id: string
  /** 获取数量，默认 20 */
  number?: number
  /** 游标，用于翻页，从上一次请求结果获取 */
  cursor?: number
}

/** 抖音评论回复请求参数 */
export interface DouyinCommentRepliesOptions extends BaseRequestOptions {
  /** 作品 ID */
  aweme_id: string
  /** 评论 ID */
  comment_id: string
  /** 获取数量，默认 20 */
  number?: number
  /** 游标，用于翻页 */
  cursor?: number
}

/** 抖音用户请求参数 */
export interface DouyinUserOptions extends BaseRequestOptions {
  /** 用户 sec_uid，如 `MS4wLjABAAAA...` */
  sec_uid: string
}

/** 抖音搜索请求参数 */
export interface DouyinSearchOptions extends BaseRequestOptions {
  /** 搜索关键词 */
  query: string
  /** 搜索类型: general=综合, user=用户, video=视频 */
  type?: 'general' | 'user' | 'video'
  /** 获取数量 */
  number?: number
  /** 搜索 ID，用于翻页，从上一次请求结果获取 */
  search_id?: string
}

/** 抖音热词请求参数 */
export interface DouyinSuggestWordsOptions extends BaseRequestOptions {
  /** 搜索词，用于获取联想词 */
  query: string
}

/** 抖音音乐请求参数 */
export interface DouyinMusicOptions extends BaseRequestOptions {
  /** 音乐 ID */
  music_id: string
}

/** 抖音直播间请求参数 */
export interface DouyinLiveRoomOptions extends BaseRequestOptions {
  /** 直播间 ID */
  room_id: string
  /** 直播间真实房间号 (web_rid) */
  web_rid: string
}

/** 抖音二维码请求参数 */
export interface DouyinQrcodeOptions extends BaseRequestOptions {
  /** fp 指纹，用于设备标识 */
  verify_fp: string
}

/** 抖音弹幕请求参数 */
export interface DouyinDanmakuOptions extends BaseRequestOptions {
  /** 作品 ID */
  aweme_id: string
  /** 开始时间 (毫秒) */
  start_time?: number
  /** 结束时间 (毫秒) */
  end_time?: number
  /** 视频总时长 (毫秒)，必填 */
  duration: number
}

/**
 * 抖音 Fetcher 接口定义
 * 包含所有抖音 API 方法的类型签名
 */
export interface IDouyinFetcher {
  // ==================== 作品相关 ====================

  /**
   * 获取抖音视频作品数据
   */
  fetchVideoWork: <M extends TypeMode = 'loose'>(
    options: DouyinWorkOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['视频作品数据'], M>>>

  /**
   * 获取抖音图集作品数据
   */
  fetchImageAlbumWork: <M extends TypeMode = 'loose'>(
    options: DouyinWorkOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['图集作品数据'], M>>>

  /**
   * 获取抖音合辑作品数据
   */
  fetchSlidesWork: <M extends TypeMode = 'loose'>(
    options: DouyinWorkOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['合辑作品数据'], M>>>

  /**
   * 获取抖音文字作品数据
   */
  fetchTextWork: <M extends TypeMode = 'loose'>(
    options: DouyinWorkOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['文字作品数据'], M>>>

  /**
   * 聚合解析抖音作品数据 (自动识别作品类型)
   */
  parseWork: <M extends TypeMode = 'loose'>(
    options: DouyinWorkOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['聚合解析'], M>>>

  /**
   * 获取抖音视频弹幕数据
   */
  fetchDanmakuList: <M extends TypeMode = 'loose'>(
    options: DouyinDanmakuOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['弹幕数据'], M>>>

  // ==================== 评论相关 ====================

  /**
   * 获取抖音作品评论数据
   */
  fetchWorkComments: <M extends TypeMode = 'loose'>(
    options: DouyinCommentsOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['评论数据'], M>>>

  /**
   * 获取抖音指定评论的回复数据
   */
  fetchCommentReplies: <M extends TypeMode = 'loose'>(
    options: DouyinCommentRepliesOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['指定评论回复数据'], M>>>

  // ==================== 用户相关 ====================

  /**
   * 获取抖音用户主页数据
   */
  fetchUserProfile: <M extends TypeMode = 'loose'>(
    options: DouyinUserOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['用户主页数据'], M>>>

  /**
   * 获取抖音用户视频列表数据
   */
  fetchUserVideoList: <M extends TypeMode = 'loose'>(
    options: DouyinUserOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['用户主页视频列表数据'], M>>>

  // ==================== 搜索相关 ====================

  /**
   * 抖音搜索内容
   */
  searchContent: <M extends TypeMode = 'loose'>(
    options: DouyinSearchOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['搜索数据'], M>>>

  /**
   * 获取抖音热词/搜索建议
   */
  fetchSuggestWords: <M extends TypeMode = 'loose'>(
    options: DouyinSuggestWordsOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['热点词数据'], M>>>

  // ==================== 其他 ====================

  /**
   * 获取抖音音乐数据
   */
  fetchMusicInfo: <M extends TypeMode = 'loose'>(
    options: DouyinMusicOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['音乐数据'], M>>>

  /**
   * 获取抖音直播间信息
   */
  fetchLiveRoomInfo: <M extends TypeMode = 'loose'>(
    options: DouyinLiveRoomOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['直播间信息数据'], M>>>

  /**
   * 申请抖音登录二维码
   */
  requestLoginQrcode: <M extends TypeMode = 'loose'>(
    options: DouyinQrcodeOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['申请二维码数据'], M>>>

  /**
   * 获取抖音表情列表
   */
  fetchEmojiList: <M extends TypeMode = 'loose'>(
    options?: { typeMode?: M },
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['Emoji数据'], M>>>

  /**
   * 获取抖音动态表情列表
   */
  fetchDynamicEmojiList: <M extends TypeMode = 'loose'>(
    options?: { typeMode?: M },
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<DouyinReturnTypeMap['动态表情数据'], M>>>
}
