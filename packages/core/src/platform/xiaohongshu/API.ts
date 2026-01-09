import { XiaohongshuMethodOptionsMap } from 'amagi/types/XiaohongshuAPIParams'

import { xiaohongshuSign } from './sign'

/**
 * 根据 XiaohongshuMethodOptionsMap 创建一个新的类型，去除每个字段中的 methodType
 */
export type XiaohongshuMethodOptionsWithoutMethodType = {
  [K in keyof XiaohongshuMethodOptionsMap]: Omit<XiaohongshuMethodOptionsMap[K], 'methodType'>
}

/**
 * 搜索排序类型枚举
 */
export enum SearchSortType {
  /**
   * 默认排序
   */
  GENERAL = 'general',

  /**
   * 最受欢迎（按热度降序）
   */
  MOST_POPULAR = 'popularity_descending',

  /**
   * 最新发布（按时间降序）
   */
  LATEST = 'time_descending'
}

/**
 * 搜索笔记类型枚举
 */
export enum SearchNoteType {
  /**
   * 默认（全部类型）
   */
  ALL = 0,

  /**
   * 仅视频
   */
  VIDEO = 1,

  /**
   * 仅图片
   */
  IMAGE = 2
}

/**
 * 构建查询字符串
 * @param params - 参数对象
 * @returns 查询字符串
 */
const buildQueryString = (params: Record<string, any>): string => {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

/**
 * 小红书API地址配置
 */
export const xiaohongshuApiUrls = {
  /**
   * 获取首页推荐数据的接口地址
   * @param data - 请求参数
   * @returns 完整的接口URL
   */
  homeFeed (data: XiaohongshuMethodOptionsWithoutMethodType['HomeFeedParams'] = {}) {
    return {
      apiPath: '/api/sns/web/v1/homefeed',
      Url: 'https://edith.xiaohongshu.com/api/sns/web/v1/homefeed',
      Body: {
        cursor_score: data.cursor_score ?? '1.7599348899670024E9',
        num: data.num ?? 33,
        refresh_type: data.refresh_type ?? 3,
        note_index: data.note_index ?? 33,
        category: data.category ?? 'homefeed_recommend',
        search_key: data.search_key ?? '',
        image_formats: ['jpg', 'webp', 'avif']
      }
    }
  },

  /**
   * 获取单个笔记数据的接口地址
   * @param data - 请求参数
   * @returns 完整的接口URL
   */
  noteDetail (data: XiaohongshuMethodOptionsWithoutMethodType['NoteParams']) {
    return {
      apiPath: '/api/sns/web/v1/feed',
      Url: 'https://edith.xiaohongshu.com/api/sns/web/v1/feed',
      Body: {
        source_note_id: data.note_id,
        image_formats: ['jpg', 'webp', 'avif'],
        extra: {
          need_body_topic: '1'
        },
        xsec_source: 'pc_feed',
        xsec_token: data.xsec_token
      }
    }
  },

  /**
   * 获取评论数据的接口地址
   * @param data - 请求参数
   * @returns 完整的接口URL
   */
  noteComments (data: XiaohongshuMethodOptionsWithoutMethodType['CommentParams']) {
    const baseUrl = 'https://edith.xiaohongshu.com/api/sns/web/v2/comment/page'
    const params = {
      note_id: data.note_id,
      cursor: data.cursor ?? '',
      image_formats: ['jpg', 'webp', 'avif'].join(','),
      xsec_token: data.xsec_token
    }
    return {
      apiPath: '/api/sns/web/v2/comment/page',
      Url: `${baseUrl}?${buildQueryString(params)}`
    }
  },

  /**
   * 获取用户数据的接口地址
   * @param data - 请求参数
   * @returns 完整的接口URL
   */
  userProfile (data: XiaohongshuMethodOptionsWithoutMethodType['UserParams']) {
    return {
      apiPath: '/api/sns/web/v1/user/otherinfo',
      Url: `https://www.xiaohongshu.com/user/profile/${data.user_id}`
    }
  },

  /**
   * 获取用户笔记数据的接口地址
   * @param data - 请求参数
   * @returns 完整的接口URL
   */
  userNoteList (data: XiaohongshuMethodOptionsWithoutMethodType['UserNoteParams']) {
    const baseUrl = 'https://edith.xiaohongshu.com/api/sns/web/v1/user_posted'
    const params = {
      user_id: data.user_id,
      cursor: data.cursor ?? '',
      num: data.num ?? 30,
      image_formats: ['jpg', 'webp', 'avif'].join(','),
      xsec_source: 'pc_feed'
    }
    return {
      apiPath: '/api/sns/web/v1/user_posted',
      Url: `${baseUrl}?${buildQueryString(params)}`
    }
  },

  /**
   * 获取笔记表情列表的接口地址
   * @param data - 请求参数
   * @returns 完整的接口URL
   */
  emojiList (data: XiaohongshuMethodOptionsWithoutMethodType['EmojiListParams']) {
    return {
      apiPath: '/api/im/redmoji/detail',
      Url: 'https://edith.xiaohongshu.com/api/im/redmoji/detail'
    }
  },

  /**
   * 搜索笔记的接口地址
   * @param data - 请求参数
   * @returns 完整的接口URL
   */
  searchNotes (data: XiaohongshuMethodOptionsWithoutMethodType['SearchNoteParams']) {
    return {
      apiPath: '/api/sns/web/v1/search/notes',
      Body: {
        keyword: data.keyword,
        page: data.page ?? 1,
        page_size: data.page_size ?? 20,
        sort: SearchSortType.GENERAL,
        note_type: SearchNoteType.ALL,
        search_id: xiaohongshuSign.getSearchId(),
        image_formats: ['jpg', 'webp', 'avif']
      },
      Url: 'https://edith.xiaohongshu.com/api/sns/web/v1/search/notes'
    }
  }
}

/**
 * 创建小红书API URLs实例
 * @returns 小红书API URLs对象
 */
export const createXiaohongshuApiUrls = () => {
  return xiaohongshuApiUrls
}
