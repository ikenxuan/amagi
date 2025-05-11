import { DouyinData } from 'amagi/platform/douyin/getdata'
import {
  DouyinDataOptionsMap,
  DouyinMethodOptionsMap,
  TypeControl,
} from 'amagi/types'

/**
 * 从 DouyinMethodOptionsMap 中提取特定 API 的选项类型，并移除 methodType，添加 TypeControl。
 * @template K - DouyinMethodOptionsMap 中的键名。
 */
type DouyinApiOptions<K extends keyof DouyinMethodOptionsMap> = Omit<DouyinMethodOptionsMap[K], 'methodType'> & TypeControl

/**
 * 根据传入的选项中的 typeMode 决定 Douyin API 的返回类型。
 * @template K - DouyinDataOptionsMap 中的键名。
 * @template T - 包含可选 typeMode 的选项对象。
 */
type DouyinApiReturn<K extends keyof DouyinDataOptionsMap, T extends TypeControl> = T['typeMode'] extends 'strict' ? DouyinDataOptionsMap[K]['data'] : any

/**
 * 封装了所有抖音相关的API请求，采用对象化的方式组织。
 * 
 * 提供了一系列方法，用于与抖音相关的 API 进行交互。
 * 
 * 每个方法都接受参数和 Cookie，返回 Promise，解析为接口返回的原始数据。
 */
export const douyin = {
  /**
   * 聚合解析 (视频/图集/合辑)
   * @param options 请求参数，包含 aweme_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  getWorkInfo: async <T extends DouyinApiOptions<'WorkParams'>> (
    options: T,
    cookie: string
  ): Promise<DouyinApiReturn<'聚合解析', T>> => {
    const { typeMode, ...restOptions } = options
    const data = await DouyinData({ ...restOptions, methodType: '聚合解析' }, cookie)
    return data
  },

  /**
   * 获取视频作品数据
   * @param options 请求参数，包含 aweme_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  getVideoWorkInfo: async <T extends DouyinApiOptions<'VideoWorkParams'>> (
    options: T,
    cookie: string
  ): Promise<DouyinApiReturn<'视频作品数据', T>> => {
    const { typeMode, ...restOptions } = options
    const data = await DouyinData({ ...restOptions, methodType: '视频作品数据' }, cookie)
    return data
  },

  /**
   * 获取图集作品数据
   * @param options 请求参数，包含 aweme_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  getImageAlbumWorkInfo: async <T extends DouyinApiOptions<'ImageAlbumWorkParams'>> (
    options: T,
    cookie: string
  ): Promise<DouyinApiReturn<'图集作品数据', T>> => {
    const { typeMode, ...restOptions } = options
    const data = await DouyinData({ ...restOptions, methodType: '图集作品数据' }, cookie)
    return data
  },

  /**
   * 获取合辑作品数据
   * @param options 请求参数，包含 aweme_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  getSlidesWorkInfo: async <T extends DouyinApiOptions<'SlidesWorkParams'>> (
    options: T,
    cookie: string
  ): Promise<DouyinApiReturn<'合辑作品数据', T>> => {
    const { typeMode, ...restOptions } = options
    const data = await DouyinData({ ...restOptions, methodType: '合辑作品数据' }, cookie)
    return data
  },

  /**
   * 获取评论数据
   * @param options 请求参数，包含 aweme_id, 可选的 number, cursor 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  getComments: async <T extends DouyinApiOptions<'CommentParams'>> (
    options: T,
    cookie: string
  ): Promise<DouyinApiReturn<'评论数据', T>> => {
    const { typeMode, ...restOptions } = options
    const data = await DouyinData({ ...restOptions, methodType: '评论数据' }, cookie)
    return data
  },

  /**
   * 获取指定评论回复数据
   * @param options 请求参数，包含 aweme_id, comment_id, 可选的 number, cursor 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  getCommentReplies: async <T extends DouyinApiOptions<'CommentReplyParams'>> (
    options: T,
    cookie: string
  ): Promise<DouyinApiReturn<'指定评论回复数据', T>> => {
    const { typeMode, ...restOptions } = options
    const data = await DouyinData({ ...restOptions, methodType: '指定评论回复数据' }, cookie)
    return data
  },

  /**
   * 获取用户主页数据
   * @param options 请求参数，包含 sec_uid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  getUserProfile: async <T extends DouyinApiOptions<'UserParams'>> (
    options: T,
    cookie: string
  ): Promise<DouyinApiReturn<'用户主页数据', T>> => {
    const { typeMode, ...restOptions } = options
    const data = await DouyinData({ ...restOptions, methodType: '用户主页数据' }, cookie)
    return data
  },

  /**
   * 获取 Emoji 数据
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 可选的用户 Cookie
   * @returns 接口返回的原始数据
   */
  getEmojiList: async <T extends DouyinApiOptions<'EmojiListParams'>> (
    options: T,
    cookie?: string
  ): Promise<DouyinApiReturn<'Emoji数据', T>> => {
    const { typeMode, ...restOptions } = options
    const data = await DouyinData({ ...restOptions, methodType: 'Emoji数据' }, cookie)
    return data
  },

  /**
   * 获取动态表情数据
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  getEmojiProList: async <T extends DouyinApiOptions<'EmojiProParams'>> (
    options: T,
    cookie: string
  ): Promise<DouyinApiReturn<'动态表情数据', T>> => {
    const { typeMode, ...restOptions } = options
    const data = await DouyinData({ ...restOptions, methodType: '动态表情数据' }, cookie)
    return data
  },

  /**
   * 获取用户主页视频列表数据
   * @param options 请求参数，包含 sec_uid, 可选的 number, max_cursor 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  getUserVideos: async <T extends DouyinApiOptions<'UserParams'>> (
    options: T,
    cookie: string
  ): Promise<DouyinApiReturn<'用户主页视频列表数据', T>> => {
    const { typeMode, ...restOptions } = options
    const data = await DouyinData({ ...restOptions, methodType: '用户主页视频列表数据' }, cookie)
    return data
  },

  /**
   * 获取音乐数据
   * @param options 请求参数，包含 music_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  getMusicInfo: async <T extends DouyinApiOptions<'MusicParams'>> (
    options: T,
    cookie: string
  ): Promise<DouyinApiReturn<'音乐数据', T>> => {
    const { typeMode, ...restOptions } = options
    const data = await DouyinData({ ...restOptions, methodType: '音乐数据' }, cookie)
    return data
  },

  /**
   * 获取热点词数据
   * @param options 请求参数，包含 query, 可选的 number 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  getSuggestWords: async <T extends DouyinApiOptions<'SearchParams'>> (
    options: T,
    cookie: string
  ): Promise<DouyinApiReturn<'热点词数据', T>> => {
    const { typeMode, ...restOptions } = options
    const data = await DouyinData({ ...restOptions, methodType: '热点词数据' }, cookie)
    return data
  },

  /**
   * 获取搜索数据
   * @param options 请求参数，包含 query, 可选的 number, search_id, cursor 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  search: async <T extends DouyinApiOptions<'SearchParams'>> ( // Renamed from getSearch
    options: T,
    cookie: string
  ): Promise<DouyinApiReturn<'搜索数据', T>> => {
    const { typeMode, ...restOptions } = options
    const data = await DouyinData({ ...restOptions, methodType: '搜索数据' }, cookie)
    return data
  },

  /**
   * 获取直播间信息
   * @param options 请求参数，包含 sec_uid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  getLiveRoomInfo: async <T extends DouyinApiOptions<'UserParams'>> (
    options: T,
    cookie: string
  ): Promise<DouyinApiReturn<'直播间信息数据', T>> => {
    const { typeMode, ...restOptions } = options
    const data = await DouyinData({ ...restOptions, methodType: '直播间信息数据' }, cookie)
    return data
  },

  /**
   * 申请二维码数据
   * @param options 请求参数，包含 verify_fp 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据 (any)
   */
  getLoginQrcode: async <T extends DouyinApiOptions<'QrcodeParams'>> (
    options: T,
    cookie: string
  ): Promise<DouyinApiReturn<'申请二维码数据', T>> => {
    const { typeMode, ...restOptions } = options
    const data = await DouyinData({ ...restOptions, methodType: '申请二维码数据' }, cookie)
    return data
  },
}