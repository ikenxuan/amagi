import type {
  BilibiliValidationSchemas,
  BilibiliMethodType
} from '../validation/bilibili'
import type {
  DouyinValidationSchemas,
  DouyinMethodType
} from '../validation/douyin'
import type {
  KuaishouValidationSchemas,
  KuaishouMethodType
} from '../validation/kuaishou'
import type {
  amagiAPIErrorCode,
  bilibiliAPIErrorCode,
  douoyinAPIErrorCode,
  ErrorDetail,
  kuaishouAPIErrorCode,
  NetworksConfigType,
  xiaohongshuAPIErrorCode
} from './NetworksConfigType'

import type { DouyinMethodOptionsMap } from './DouyinAPIParams'
import type { BilibiliMethodOptionsMap } from './BilibiliAPIParams'
import type { KuaishouMethodOptionsMap } from './KuaishouAPIParams'
import type { XiaohongshuMethodOptionsMap } from './XiaohongshuAPIParams'

import {
  DyDanmakuList,
  DyEmojiList,
  DyEmojiProList,
  DyImageAlbumWork,
  DyMusicWork,
  DySearchInfo,
  DySlidesWork,
  DySuggestWords,
  DyUserInfo,
  DyUserLiveVideos,
  DyUserPostVideos,
  DyVideoWork,
  DyWorkComments,
} from './ReturnDataType/Douyin'

import {
  BiliAv2Bv,
  BiliBangumiVideoInfo,
  BiliBangumiVideoPlayurlIsLogin,
  BiliBangumiVideoPlayurlNoLogin,
  BiliBiliVideoPlayurlNoLogin,
  BiliBv2AV,
  BiliCheckQrcode,
  BiliDynamicCard,
  BiliDynamicInfoUnion,
  BiliEmojiList,
  BiliLiveRoomDef,
  BiliLiveRoomDetail,
  BiliNewLoginQrcode,
  BiliOneWork,
  BiliUserDynamic,
  BiliUserFullView,
  BiliUserProfile,
  BiliVideoPlayurlIsLogin,
  BiliWorkComments,
} from './ReturnDataType/Bilibili'

import type {
  KsEmojiList,
  KsOneWork,
  KsWorkComments
} from './ReturnDataType/Kuaishou'
import { DyTextWork } from './ReturnDataType/Douyin/TextWork'
import { XiaohongshuValidationSchemas } from 'amagi/validation/xiaohongshu'

/**
 * 移除methodType字段的工具类型
 */
export type OmitMethodType<T> = Omit<T, 'methodType'>

/**
 * 类型精度控制参数
 */
export type TypeControl = {
  /**
   * 获取返回类型
   * 类型定义时间：2025-02-02
   * 
   * 类型解析模式：
   * - `strict`: 返回严格类型（基于接口响应定义，随时间推移可能缺少未声明的字段）
   * - `loose` 或 `未指定`: 返回宽松的 any 类型（默认）
   * 
   * @default 'loose'
   */
  typeMode?: 'strict' | 'loose'
}

// 数据选项映射类型
export interface BilibiliDataOptionsMap {
  单个视频作品数据: { opt: BilibiliMethodOptionsMap['VideoInfoParams'], data: BiliOneWork }
  单个视频下载信息数据: { opt: BilibiliMethodOptionsMap['VideoStreamParams'], data: BiliVideoPlayurlIsLogin | BiliBiliVideoPlayurlNoLogin }
  评论数据: { opt: BilibiliMethodOptionsMap['CommentParams'], data: BiliWorkComments }
  用户主页数据: { opt: BilibiliMethodOptionsMap['UserParams'], data: BiliUserProfile }
  用户主页动态列表数据: { opt: BilibiliMethodOptionsMap['UserParams'], data: BiliUserDynamic }
  Emoji数据: { opt: BilibiliMethodOptionsMap['EmojiParams'], data: BiliEmojiList }
  番剧基本信息数据: { opt: BilibiliMethodOptionsMap['BangumiInfoParams'], data: BiliBangumiVideoInfo }
  番剧下载信息数据: { opt: BilibiliMethodOptionsMap['BangumiStreamParams'], data: BiliBangumiVideoPlayurlIsLogin | BiliBangumiVideoPlayurlNoLogin }
  动态详情数据: { opt: BilibiliMethodOptionsMap['DynamicParams'], data: BiliDynamicInfoUnion }
  动态卡片数据: { opt: BilibiliMethodOptionsMap['DynamicParams'], data: BiliDynamicCard }
  直播间信息: { opt: BilibiliMethodOptionsMap['LiveRoomParams'], data: BiliLiveRoomDetail }
  直播间初始化信息: { opt: BilibiliMethodOptionsMap['LiveRoomParams'], data: BiliLiveRoomDef }
  登录基本信息: { opt: BilibiliMethodOptionsMap['LoginBaseInfoParams'], data: any }
  申请二维码: { opt: BilibiliMethodOptionsMap['GetQrcodeParams'], data: BiliNewLoginQrcode }
  二维码状态: { opt: BilibiliMethodOptionsMap['QrcodeParams'], data: BiliCheckQrcode }
  获取UP主总播放量: { opt: BilibiliMethodOptionsMap['UserParams'], data: BiliUserFullView }
  AV转BV: { opt: BilibiliMethodOptionsMap['Av2BvParams'], data: BiliAv2Bv }
  BV转AV: { opt: BilibiliMethodOptionsMap['Bv2AvParams'], data: BiliBv2AV }
}

export interface DouyinDataOptionsMap {
  文字作品数据: { opt: DouyinMethodOptionsMap['WorkParams'], data: DyTextWork }
  聚合解析: { opt: DouyinMethodOptionsMap['WorkParams'], data: DyVideoWork | DyImageAlbumWork | DySlidesWork }
  视频作品数据: { opt: DouyinMethodOptionsMap['VideoWorkParams'], data: DyVideoWork }
  图集作品数据: { opt: DouyinMethodOptionsMap['ImageAlbumWorkParams'], data: DyImageAlbumWork }
  合辑作品数据: { opt: DouyinMethodOptionsMap['SlidesWorkParams'], data: DySlidesWork }
  评论数据: { opt: DouyinMethodOptionsMap['CommentParams'], data: DyWorkComments }
  用户主页数据: { opt: DouyinMethodOptionsMap['UserParams'], data: DyUserInfo }
  用户主页视频列表数据: { opt: DouyinMethodOptionsMap['UserParams'], data: DyUserPostVideos }
  热点词数据: { opt: DouyinMethodOptionsMap['SearchParams'], data: DySuggestWords }
  搜索数据: { opt: DouyinMethodOptionsMap['SearchParams'], data: DySearchInfo }
  Emoji数据: { opt: DouyinMethodOptionsMap['EmojiListParams'], data: DyEmojiList }
  动态表情数据: { opt: DouyinMethodOptionsMap['EmojiProParams'], data: DyEmojiProList }
  弹幕数据: { opt: DouyinMethodOptionsMap['DanmakuParams'], data: DyDanmakuList }
  音乐数据: { opt: DouyinMethodOptionsMap['MusicParams'], data: DyMusicWork }
  直播间信息数据: { opt: DouyinMethodOptionsMap['UserParams'], data: DyUserLiveVideos }
  申请二维码数据: { opt: DouyinMethodOptionsMap['QrcodeParams'], data: any }
  指定评论回复数据: { opt: DouyinMethodOptionsMap['CommentReplyParams'], data: any }
}

export interface KuaishouDataOptionsMap {
  单个视频作品数据: { opt: KuaishouMethodOptionsMap['VideoInfoParams'], data: KsOneWork }
  评论数据: { opt: KuaishouMethodOptionsMap['CommentParams'], data: KsWorkComments }
  Emoji数据: { opt: KuaishouMethodOptionsMap['EmojiListParams'], data: KsEmojiList }
}

// 导出所有类型
export type {
  // 方法选项映射类型
  BilibiliMethodOptionsMap,
  DouyinMethodOptionsMap,
  KuaishouMethodOptionsMap,
  // 方法类型
  BilibiliMethodType,
  DouyinMethodType,
  KuaishouMethodType,
  // 网络配置类型
  NetworksConfigType
}

// 导出验证模式
export {
  BilibiliValidationSchemas,
  DouyinValidationSchemas,
  KuaishouValidationSchemas,
  XiaohongshuValidationSchemas,
}

// 导出返回数据类型
export * from './ReturnDataType'

// 导出平台数据选项类型
export interface XiaohongshuDataOptionsMap {
  首页推荐数据: { opt: XiaohongshuMethodOptionsMap['HomeFeedParams'], data: any }
  单个笔记数据: { opt: XiaohongshuMethodOptionsMap['NoteParams'], data: any }
  评论数据: { opt: XiaohongshuMethodOptionsMap['CommentParams'], data: any }
  用户数据: { opt: XiaohongshuMethodOptionsMap['UserParams'], data: any }
  用户笔记数据: { opt: XiaohongshuMethodOptionsMap['UserNoteParams'], data: any }
  表情列表: { opt: XiaohongshuMethodOptionsMap['EmojiListParams'], data: any }
  搜索笔记: { opt: XiaohongshuMethodOptionsMap['SearchNoteParams'], data: any }
}
export type XiaohongshuDataOptions<T extends keyof XiaohongshuDataOptionsMap> = OmitMethodType<XiaohongshuDataOptionsMap[T]['opt'] & TypeControl>
export type DouyinDataOptions<T extends keyof DouyinDataOptionsMap> = OmitMethodType<DouyinDataOptionsMap[T]['opt'] & TypeControl>
export type BilibiliDataOptions<T extends keyof BilibiliDataOptionsMap> = OmitMethodType<BilibiliDataOptionsMap[T]['opt'] & TypeControl>
export type KuaishouDataOptions<T extends keyof KuaishouDataOptionsMap> = OmitMethodType<KuaishouDataOptionsMap[T]['opt'] & TypeControl>

/**
 * API请求错误类型
 * 该类型是方法 `getXXXData` 封装后请求遇到错误时的返回类型
 */
export type APIErrorType<T extends 'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu' | 'default' = 'default'> = {
  /** 错误码 */
  code: T extends 'douyin'
  ? douoyinAPIErrorCode
  : T extends 'bilibili'
  ? bilibiliAPIErrorCode
  : T extends 'kuaishou'
  ? kuaishouAPIErrorCode
  : T extends 'xiaohongshu'
  ? xiaohongshuAPIErrorCode
  : amagiAPIErrorCode,
  /** 错误时的响应数据 */
  data: any,
  /** amagi 错误详情 */
  amagiError: ErrorDetail,
  /** 错误信息 */
  amagiMessage: string
}