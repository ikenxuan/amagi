/**
 * 小红书 Fetcher 接口定义
 * @module fetchers/xiaohongshu/types
 */

import { XiaohongshuReturnTypeMap } from 'amagi/types'

import type { BoundMethodOverload, BoundNoParamMethodOverload, BoundOptionalParamMethodOverload, MethodOverload, NoParamMethodOverload, OptionalParamMethodOverload } from '../shared/overload-types'
import type { BaseRequestOptions } from '../types'

// ============================================================================
// 小红书 Options 类型定义
// ============================================================================

/** 小红书首页推荐请求参数 */
export interface XiaohongshuHomeFeedOptions extends BaseRequestOptions {
  /** 游标分数，用于翻页 */
  cursor_score?: string
  /** 获取数量，默认 20 */
  num?: number
  /** 刷新类型: 1=下拉刷新, 3=上拉加载 */
  refresh_type?: number
  /** 笔记索引 */
  note_index?: number
  /** 未读开始笔记 ID */
  unread_begin_note_id?: string
  /** 未读结束笔记 ID */
  unread_end_note_id?: string
  /** 未读笔记数量 */
  unread_note_count?: number
}

/** 小红书笔记详情请求参数 */
export interface XiaohongshuNoteDetailOptions extends BaseRequestOptions {
  /** 笔记 ID，如 `64a1b2c3d4e5f6` */
  note_id: string
  /** xsec_token，从笔记链接或首页获取，必填 */
  xsec_token: string
}

/** 小红书评论请求参数 */
export interface XiaohongshuCommentsOptions extends BaseRequestOptions {
  /** 笔记 ID */
  note_id: string
  /** 游标，用于翻页 */
  cursor?: string
  /** xsec_token，从笔记链接或首页获取，必填 */
  xsec_token: string
}

/** 小红书用户请求参数 */
export interface XiaohongshuUserProfileOptions extends BaseRequestOptions {
  /** 用户 ID */
  user_id: string
}

/** 小红书用户笔记请求参数 */
export interface XiaohongshuUserNotesOptions extends BaseRequestOptions {
  /** 用户 ID */
  user_id: string
  /** 游标，用于翻页 */
  cursor?: string
  /** 获取数量，默认 30 */
  num?: number
}

/** 小红书搜索请求参数 */
export interface XiaohongshuSearchNotesOptions extends BaseRequestOptions {
  /** 搜索关键词 */
  keyword: string
  /** 页码，从 1 开始 */
  page?: number
  /** 每页数量，默认 20 */
  page_size?: number
  /** 排序方式: general=综合, time_descending=最新, popularity_descending=最热 */
  sort?: 'general' | 'time_descending' | 'popularity_descending'
  /** 笔记类型: 0=全部, 1=视频, 2=图文 */
  note_type?: 0 | 1 | 2
}

/**
 * 小红书 Fetcher 接口定义
 * 包含所有小红书 API 方法的类型签名
 */
export interface IXiaohongshuFetcher {
  /** 获取小红书首页推荐数据 */
  fetchHomeFeed: OptionalParamMethodOverload<XiaohongshuHomeFeedOptions, XiaohongshuReturnTypeMap['homeFeed']>

  /** 获取小红书笔记详情 */
  fetchNoteDetail: MethodOverload<XiaohongshuNoteDetailOptions, XiaohongshuReturnTypeMap['noteDetail']>

  /** 获取小红书笔记评论数据 */
  fetchNoteComments: MethodOverload<XiaohongshuCommentsOptions, XiaohongshuReturnTypeMap['noteComments']>

  /** 获取小红书用户主页数据 */
  fetchUserProfile: MethodOverload<XiaohongshuUserProfileOptions, XiaohongshuReturnTypeMap['userProfile']>

  /** 获取小红书用户笔记列表 */
  fetchUserNoteList: MethodOverload<XiaohongshuUserNotesOptions, XiaohongshuReturnTypeMap['userNoteList']>

  /** 搜索小红书笔记 */
  searchNotes: MethodOverload<XiaohongshuSearchNotesOptions, XiaohongshuReturnTypeMap['searchNotes']>

  /** 获取小红书表情列表 */
  fetchEmojiList: NoParamMethodOverload<XiaohongshuReturnTypeMap['emojiList']>
}

/**
 * 绑定了 Cookie 的小红书 Fetcher 接口
 * 调用方法时无需传递 cookie 参数
 */
export interface IBoundXiaohongshuFetcher {
  /** 获取小红书首页推荐数据 */
  fetchHomeFeed: BoundOptionalParamMethodOverload<XiaohongshuHomeFeedOptions, XiaohongshuReturnTypeMap['homeFeed']>

  /** 获取小红书笔记详情 */
  fetchNoteDetail: BoundMethodOverload<XiaohongshuNoteDetailOptions, XiaohongshuReturnTypeMap['noteDetail']>

  /** 获取小红书笔记评论数据 */
  fetchNoteComments: BoundMethodOverload<XiaohongshuCommentsOptions, XiaohongshuReturnTypeMap['noteComments']>

  /** 获取小红书用户主页数据 */
  fetchUserProfile: BoundMethodOverload<XiaohongshuUserProfileOptions, XiaohongshuReturnTypeMap['userProfile']>

  /** 获取小红书用户笔记列表 */
  fetchUserNoteList: BoundMethodOverload<XiaohongshuUserNotesOptions, XiaohongshuReturnTypeMap['userNoteList']>

  /** 搜索小红书笔记 */
  searchNotes: BoundMethodOverload<XiaohongshuSearchNotesOptions, XiaohongshuReturnTypeMap['searchNotes']>

  /** 获取小红书表情列表 */
  fetchEmojiList: BoundNoParamMethodOverload<XiaohongshuReturnTypeMap['emojiList']>
}
