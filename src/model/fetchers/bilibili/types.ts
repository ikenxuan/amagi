/**
 * B站 Fetcher 接口定义
 * @module fetchers/bilibili/types
 */

import { RequestConfig } from 'amagi/server'
import { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import { Result } from 'amagi/validation'

import type { BaseRequestOptions, ConditionalReturnType, TypeMode } from '../types'

// ============================================================================
// B站 Options 类型定义
// ============================================================================

/** B站视频信息请求参数 */
export interface BilibiliVideoInfoOptions extends BaseRequestOptions {
  /** BV号，如 `BV1xx411c7mD` */
  bvid: string
}

/** B站视频流请求参数 */
export interface BilibiliVideoStreamOptions extends BaseRequestOptions {
  /** AV号 (纯数字)，如 `170001` */
  avid: number
  /** 视频分P的 CID，可从视频信息接口获取 */
  cid: number
}

/** B站评论请求参数 */
export interface BilibiliCommentsOptions extends BaseRequestOptions {
  /** 目标 ID，视频为 AV号，动态为动态ID */
  oid: string
  /** 评论区类型: 1=视频, 11=图文动态, 12=专栏, 17=纯文字动态 */
  type: number
  /** 获取数量 */
  number?: number
  /** 页码，从 1 开始 */
  pn?: number
}

/** B站评论回复请求参数 */
export interface BilibiliCommentRepliesOptions extends BaseRequestOptions {
  /** 目标 ID，视频为 AV号，动态为动态ID */
  oid: string
  /** 评论区类型: 1=视频, 11=图文动态, 12=专栏, 17=纯文字动态 */
  type: number
  /** 根评论 rpid */
  root: string
  /** 获取数量 */
  number?: number
  /** 页码，从 1 开始 */
  pn?: number
}

/** B站用户请求参数 */
export interface BilibiliUserOptions extends BaseRequestOptions {
  /** 用户 UID (纯数字)，如 `438881796` */
  host_mid: number
}

/** B站动态请求参数 */
export interface BilibiliDynamicOptions extends BaseRequestOptions {
  /** 动态 ID，如 `123456789012345678` */
  dynamic_id: string
}

/** B站番剧信息请求参数 */
export interface BilibiliBangumiInfoOptions extends BaseRequestOptions {
  /** 剧集 EP ID，与 season_id 二选一 */
  ep_id?: string
  /** 季度 ID，与 ep_id 二选一 */
  season_id?: string
}

/** B站番剧流请求参数 */
export interface BilibiliBangumiStreamOptions extends BaseRequestOptions {
  /** 视频 CID，可从番剧信息接口获取 */
  cid: number
  /** 剧集 EP ID */
  ep_id: string
}

/** B站直播间请求参数 */
export interface BilibiliLiveRoomOptions extends BaseRequestOptions {
  /** 直播间 ID (房间号) */
  room_id: string
}

/** B站二维码状态请求参数 */
export interface BilibiliQrcodeStatusOptions extends BaseRequestOptions {
  /** 二维码 key，从申请二维码接口获取 */
  qrcode_key: string
}

/** B站 AV 转 BV 请求参数 */
export interface BilibiliAv2BvOptions extends BaseRequestOptions {
  /** AV号 (纯数字)，如 `170001` */
  avid: number
}

/** B站 BV 转 AV 请求参数 */
export interface BilibiliBv2AvOptions extends BaseRequestOptions {
  /** BV号，如 `BV1xx411c7mD` */
  bvid: string
}

/** B站专栏请求参数 */
export interface BilibiliArticleOptions extends BaseRequestOptions {
  /** 专栏 cv 号 (纯数字)，如 `12345678` */
  id: string
}

/** B站专栏卡片请求参数 */
export interface BilibiliArticleCardOptions extends BaseRequestOptions {
  /** 专栏 cv 号列表，单个字符串或数组 */
  ids: string | string[]
}

/** B站弹幕请求参数 */
export interface BilibiliDanmakuOptions extends BaseRequestOptions {
  /** 视频分P的 CID */
  cid: number
  /** 分段序号，6分钟一段，从 1 开始 */
  segment_index?: number
}

/** B站验证码申请请求参数 */
export interface BilibiliApplyCaptchaOptions extends BaseRequestOptions {
  /** CSRF Token，从 Cookie 中的 bili_jct 获取 */
  csrf?: string
  /** v_voucher 凭证，风控触发时返回 */
  v_voucher: string
}

/** B站验证码验证请求参数 */
export interface BilibiliValidateCaptchaOptions extends BaseRequestOptions {
  /** CSRF Token，从 Cookie 中的 bili_jct 获取 */
  csrf?: string
  /** 极验 challenge */
  challenge: string
  /** 极验 token */
  token: string
  /** 极验 validate */
  validate: string
  /** 极验 seccode */
  seccode: string
}

/**
 * B站 Fetcher 接口定义
 * 包含所有 B站 API 方法的类型签名
 */
export interface IBilibiliFetcher {
  // ==================== 视频相关 ====================

  /**
   * 获取B站视频详细信息
   */
  fetchVideoInfo: <M extends TypeMode = 'loose'>(
    options: BilibiliVideoInfoOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['单个视频作品数据'], M>>>

  /**
   * 获取B站视频流地址
   */
  fetchVideoStreamUrl: <M extends TypeMode = 'loose'>(
    options: BilibiliVideoStreamOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['单个视频下载信息数据'], M>>>

  /**
   * 获取B站视频实时弹幕
   */
  fetchVideoDanmaku: <M extends TypeMode = 'loose'>(
    options: BilibiliDanmakuOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['实时弹幕'], M>>>

  // ==================== 评论相关 ====================

  /**
   * 获取B站视频/动态评论列表
   */
  fetchComments: <M extends TypeMode = 'loose'>(
    options: BilibiliCommentsOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['评论数据'], M>>>

  /**
   * 获取B站指定评论的回复列表
   */
  fetchCommentReplies: <M extends TypeMode = 'loose'>(
    options: BilibiliCommentRepliesOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['指定评论的回复'], M>>>

  // ==================== 用户相关 ====================

  /**
   * 获取B站用户名片信息
   */
  fetchUserCard: <M extends TypeMode = 'loose'>(
    options: BilibiliUserOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['用户主页数据'], M>>>

  /**
   * 获取B站用户动态列表
   */
  fetchUserDynamicList: <M extends TypeMode = 'loose'>(
    options: BilibiliUserOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['用户主页动态列表数据'], M>>>

  /**
   * 获取B站用户空间详细信息
   */
  fetchUserSpaceInfo: <M extends TypeMode = 'loose'>(
    options: BilibiliUserOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['用户空间详细信息'], M>>>

  /**
   * 获取B站 UP 主总播放量
   */
  fetchUploaderTotalViews: <M extends TypeMode = 'loose'>(
    options: BilibiliUserOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['获取UP主总播放量'], M>>>

  // ==================== 动态相关 ====================

  /**
   * 获取B站动态详情
   */
  fetchDynamicDetail: <M extends TypeMode = 'loose'>(
    options: BilibiliDynamicOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['动态详情数据'], M>>>

  /**
   * 获取B站动态卡片信息
   */
  fetchDynamicCard: <M extends TypeMode = 'loose'>(
    options: BilibiliDynamicOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['动态卡片数据'], M>>>

  // ==================== 番剧相关 ====================

  /**
   * 获取B站番剧基本信息
   */
  fetchBangumiInfo: <M extends TypeMode = 'loose'>(
    options: BilibiliBangumiInfoOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['番剧基本信息数据'], M>>>

  /**
   * 获取B站番剧视频流地址
   */
  fetchBangumiStreamUrl: <M extends TypeMode = 'loose'>(
    options: BilibiliBangumiStreamOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['番剧下载信息数据'], M>>>

  // ==================== 直播相关 ====================

  /**
   * 获取B站直播间信息
   */
  fetchLiveRoomInfo: <M extends TypeMode = 'loose'>(
    options: BilibiliLiveRoomOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['直播间信息'], M>>>

  /**
   * 获取B站直播间初始化信息
   */
  fetchLiveRoomInitInfo: <M extends TypeMode = 'loose'>(
    options: BilibiliLiveRoomOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['直播间初始化信息'], M>>>

  // ==================== 专栏相关 ====================

  /**
   * 获取B站专栏正文内容
   */
  fetchArticleContent: <M extends TypeMode = 'loose'>(
    options: BilibiliArticleOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['专栏正文内容'], M>>>

  /**
   * 获取B站专栏卡片信息
   */
  fetchArticleCards: <M extends TypeMode = 'loose'>(
    options: BilibiliArticleCardOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['专栏显示卡片信息'], M>>>

  /**
   * 获取B站专栏文章基本信息
   */
  fetchArticleInfo: <M extends TypeMode = 'loose'>(
    options: BilibiliArticleOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['专栏文章基本信息'], M>>>

  /**
   * 获取B站文集基本信息
   */
  fetchArticleListInfo: <M extends TypeMode = 'loose'>(
    options: BilibiliArticleOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['文集基本信息'], M>>>

  // ==================== 登录认证相关 ====================

  /**
   * 获取B站登录状态信息
   */
  fetchLoginStatus: <M extends TypeMode = 'loose'>(
    options?: { typeMode?: M },
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['登录基本信息'], M>>>

  /**
   * 申请B站登录二维码
   */
  requestLoginQrcode: <M extends TypeMode = 'loose'>(
    options?: { typeMode?: M },
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['申请二维码'], M>>>

  /**
   * 检查B站登录二维码扫描状态
   */
  checkQrcodeStatus: <M extends TypeMode = 'loose'>(
    options: BilibiliQrcodeStatusOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['二维码状态'], M>>>

  /**
   * 从 v_voucher 申请验证码
   */
  requestCaptchaFromVoucher: <M extends TypeMode = 'loose'>(
    options: BilibiliApplyCaptchaOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['从_v_voucher_申请_captcha'], M>>>

  /**
   * 验证验证码结果
   */
  validateCaptchaResult: <M extends TypeMode = 'loose'>(
    options: BilibiliValidateCaptchaOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['验证验证码结果'], M>>>

  // ==================== 工具相关 ====================

  /**
   * 将 AV 号转换为 BV 号
   */
  convertAvToBv: <M extends TypeMode = 'loose'>(
    options: BilibiliAv2BvOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['AV转BV'], M>>>

  /**
   * 将 BV 号转换为 AV 号
   */
  convertBvToAv: <M extends TypeMode = 'loose'>(
    options: BilibiliBv2AvOptions,
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['BV转AV'], M>>>

  /**
   * 获取B站表情包列表
   */
  fetchEmojiList: <M extends TypeMode = 'loose'>(
    options?: { typeMode?: M },
    cookie?: string,
    requestConfig?: RequestConfig
  ) => Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['Emoji数据'], M>>>
}
