import {
  DouyinDataOptionsMap,
  DouyinMethodOptionsMap,
  TypeControl,
} from 'amagi/types'
import { getDouyinData } from 'amagi/model/DataFetchers'

/**
 * 从 DouyinMethodOptionsMap 中提取特定 API 的选项类型，并移除 methodType，添加 TypeControl。
 * @template K - DouyinMethodOptionsMap 中的键名。
 */
type DouyinApiOptions<K extends keyof DouyinMethodOptionsMap> = Omit<DouyinMethodOptionsMap[K], 'methodType'> & TypeControl

/**
 * 封装了所有抖音相关的API请求，采用对象化的方式组织。
 * 
 * 提供了一系列方法，用于与抖音相关的 API 进行交互。
 * 
 * 每个方法都接受参数和 Cookie，返回 Promise，解析为统一格式的API响应。
 */
export const douyin = {
  /**
   * 聚合解析 (视频/图集/合辑)
   * @param options 请求参数，包含 aweme_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getWorkInfo: async <T extends DouyinApiOptions<'WorkParams'>> (
    options: T,
    cookie: string
  ): Promise<Awaited<ReturnType<typeof getDouyinData<'聚合解析', NonNullable<T['typeMode']>>>>> => {
    return await getDouyinData('聚合解析', { ...options }, cookie)
  },

  /**
   * 获取视频作品数据
   * @param options 请求参数，包含 aweme_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getVideoWorkInfo: async <T extends DouyinApiOptions<'VideoWorkParams'>> (
    options: T,
    cookie: string
  ): Promise<Awaited<ReturnType<typeof getDouyinData<'视频作品数据', NonNullable<T['typeMode']>>>>> => {
    return await getDouyinData('视频作品数据', { ...options }, cookie)
  },

  /**
   * 获取图集作品数据
   * @param options 请求参数，包含 aweme_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getImageAlbumWorkInfo: async <T extends DouyinApiOptions<'ImageAlbumWorkParams'>> (
    options: T,
    cookie: string
  ): Promise<Awaited<ReturnType<typeof getDouyinData<'图集作品数据', NonNullable<T['typeMode']>>>>> => {
    return await getDouyinData('图集作品数据', { ...options }, cookie)
  },

  /**
   * 获取合辑作品数据
   * @param options 请求参数，包含 aweme_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getSlidesWorkInfo: async <T extends DouyinApiOptions<'SlidesWorkParams'>> (
    options: T,
    cookie: string
  ): Promise<Awaited<ReturnType<typeof getDouyinData<'合辑作品数据', NonNullable<T['typeMode']>>>>> => {
    return await getDouyinData('合辑作品数据', { ...options }, cookie)
  },

  /**
   * 获取评论数据
   * @param options 请求参数，包含 aweme_id, 可选的 number, cursor 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getComments: async <T extends DouyinApiOptions<'CommentParams'>> (
    options: T,
    cookie: string
  ): Promise<Awaited<ReturnType<typeof getDouyinData<'评论数据', NonNullable<T['typeMode']>>>>> => {
    return await getDouyinData('评论数据', { ...options }, cookie)
  },

  /**
   * 获取指定评论回复数据
   * @param options 请求参数，包含 aweme_id, comment_id, 可选的 number, cursor 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getCommentReplies: async <T extends DouyinApiOptions<'CommentReplyParams'>> (
    options: T,
    cookie: string
  ): Promise<Awaited<ReturnType<typeof getDouyinData<'指定评论回复数据', NonNullable<T['typeMode']>>>>> => {
    return await getDouyinData('指定评论回复数据', { ...options }, cookie)
  },

  /**
   * 获取用户主页数据
   * @param options 请求参数，包含 sec_uid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getUserProfile: async <T extends DouyinApiOptions<'UserParams'>> (
    options: T,
    cookie: string
  ): Promise<Awaited<ReturnType<typeof getDouyinData<'用户主页数据', NonNullable<T['typeMode']>>>>> => {
    return await getDouyinData('用户主页数据', { ...options }, cookie)
  },

  /**
   * 获取 Emoji 数据
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 可选的用户 Cookie
   * @returns 统一格式的API响应
   */
  getEmojiList: async <T extends DouyinApiOptions<'EmojiListParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getDouyinData<'Emoji数据', NonNullable<T['typeMode']>>>>> => {
    return await getDouyinData('Emoji数据', { ...options }, cookie)
  },

  /**
   * 获取动态表情数据
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getEmojiProList: async <T extends DouyinApiOptions<'EmojiProParams'>> (
    options: T,
    cookie: string
  ): Promise<Awaited<ReturnType<typeof getDouyinData<'动态表情数据', NonNullable<T['typeMode']>>>>> => {
    return await getDouyinData('动态表情数据', { ...options }, cookie)
  },

  /**
   * 获取用户主页视频列表数据
   * @param options 请求参数，包含 sec_uid, 可选的 number, max_cursor 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getUserVideos: async <T extends DouyinApiOptions<'UserParams'>> (
    options: T,
    cookie: string
  ): Promise<Awaited<ReturnType<typeof getDouyinData<'用户主页视频列表数据', NonNullable<T['typeMode']>>>>> => {
    return await getDouyinData('用户主页视频列表数据', { ...options }, cookie)
  },

  /**
   * 获取音乐数据
   * @param options 请求参数，包含 music_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getMusicInfo: async <T extends DouyinApiOptions<'MusicParams'>> (
    options: T,
    cookie: string
  ): Promise<Awaited<ReturnType<typeof getDouyinData<'音乐数据', NonNullable<T['typeMode']>>>>> => {
    return await getDouyinData('音乐数据', { ...options }, cookie)
  },

  /**
   * 获取热点词数据
   * @param options 请求参数，包含 query, 可选的 number 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getSuggestWords: async <T extends DouyinApiOptions<'SearchParams'>> (
    options: T,
    cookie: string
  ): Promise<Awaited<ReturnType<typeof getDouyinData<'热点词数据', NonNullable<T['typeMode']>>>>> => {
    return await getDouyinData('热点词数据', { ...options }, cookie)
  },

  /**
   * 获取搜索数据
   * @param options 请求参数，包含 query, 可选的 number, search_id, cursor 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  search: async <T extends DouyinApiOptions<'SearchParams'>> (
    options: T,
    cookie: string
  ): Promise<Awaited<ReturnType<typeof getDouyinData<'搜索数据', NonNullable<T['typeMode']>>>>> => {
    return await getDouyinData('搜索数据', { ...options }, cookie)
  },

  /**
   * 获取直播间信息
   * @param options 请求参数，包含 sec_uid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getLiveRoomInfo: async <T extends DouyinApiOptions<'UserParams'>> (
    options: T,
    cookie: string
  ): Promise<Awaited<ReturnType<typeof getDouyinData<'直播间信息数据', NonNullable<T['typeMode']>>>>> => {
    return await getDouyinData('直播间信息数据', { ...options }, cookie)
  },

  /**
   * 申请二维码数据
   * @param options 请求参数，包含 verify_fp 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getLoginQrcode: async <T extends DouyinApiOptions<'QrcodeParams'>> (
    options: T,
    cookie: string
  ): Promise<Awaited<ReturnType<typeof getDouyinData<'申请二维码数据', NonNullable<T['typeMode']>>>>> => {
    return await getDouyinData('申请二维码数据', { ...options }, cookie)
  },
}