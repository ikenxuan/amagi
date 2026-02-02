/**
 * 抖音 Fetcher 接口定义
 * @module fetchers/douyin/types
 */

import { RequestConfig } from 'amagi/server'
import { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { Result } from 'amagi/validation'

import type { MethodOverload, NoParamMethodOverload } from '../shared/overload-types'
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

/** 抖音用户喜欢列表请求参数 */
export interface DouyinUserFavoriteOptions extends BaseRequestOptions {
  /** 用户 sec_uid，如 `MS4wLjABAAAA...` */
  sec_uid: string
  /** 获取数量，默认 18 */
  number?: number
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
  fetchVideoWork: MethodOverload<DouyinWorkOptions, DouyinReturnTypeMap['videoWork']>

  /**
   * 获取抖音图集作品数据
   */
  fetchImageAlbumWork: MethodOverload<DouyinWorkOptions, DouyinReturnTypeMap['imageAlbumWork']>

  /**
   * 获取抖音合辑作品数据
   */
  fetchSlidesWork: MethodOverload<DouyinWorkOptions, DouyinReturnTypeMap['slidesWork']>

  /**
   * 获取抖音文字作品数据
   */
  fetchTextWork: MethodOverload<DouyinWorkOptions, DouyinReturnTypeMap['textWork']>

  /**
   * 聚合解析抖音作品数据 (自动识别作品类型)
   */
  parseWork: MethodOverload<DouyinWorkOptions, DouyinReturnTypeMap['parseWork']>

  /**
   * 获取抖音视频弹幕数据
   */
  fetchDanmakuList: MethodOverload<DouyinDanmakuOptions, DouyinReturnTypeMap['danmakuList']>

  // ==================== 评论相关 ====================

  /**
   * 获取抖音作品评论数据
   */
  fetchWorkComments: MethodOverload<DouyinCommentsOptions, DouyinReturnTypeMap['comments']>

  /**
   * 获取抖音指定评论的回复数据
   */
  fetchCommentReplies: MethodOverload<DouyinCommentRepliesOptions, DouyinReturnTypeMap['commentReplies']>

  // ==================== 用户相关 ====================

  /**
   * 获取抖音用户主页数据
   */
  fetchUserProfile: MethodOverload<DouyinUserOptions, DouyinReturnTypeMap['userProfile']>

  /**
   * 获取抖音用户视频列表数据
   */
  fetchUserVideoList: MethodOverload<DouyinUserOptions, DouyinReturnTypeMap['userVideoList']>

  /**
   * 获取抖音用户喜欢列表数据
   */
  fetchUserFavoriteList: MethodOverload<DouyinUserFavoriteOptions, DouyinReturnTypeMap['userFavoriteList']>

  // ==================== 搜索相关 ====================

  /**
   * 抖音搜索内容
   */
  searchContent: MethodOverload<DouyinSearchOptions, DouyinReturnTypeMap['search']>

  /**
   * 获取抖音热词/搜索建议
   */
  fetchSuggestWords: MethodOverload<DouyinSuggestWordsOptions, DouyinReturnTypeMap['suggestWords']>

  // ==================== 其他 ====================

  /**
   * 获取抖音音乐数据
   */
  fetchMusicInfo: MethodOverload<DouyinMusicOptions, DouyinReturnTypeMap['musicInfo']>

  /**
   * 获取抖音直播间信息
   */
  fetchLiveRoomInfo: MethodOverload<DouyinLiveRoomOptions, DouyinReturnTypeMap['liveRoomInfo']>

  /**
   * 申请抖音登录二维码
   */
  requestLoginQrcode: MethodOverload<DouyinQrcodeOptions, DouyinReturnTypeMap['loginQrcode']>

  /**
   * 获取抖音表情列表
   */
  fetchEmojiList: NoParamMethodOverload<DouyinReturnTypeMap['emojiList']>

  /**
   * 获取抖音动态表情列表
   */
  fetchDynamicEmojiList: NoParamMethodOverload<DouyinReturnTypeMap['dynamicEmojiList']>
}
