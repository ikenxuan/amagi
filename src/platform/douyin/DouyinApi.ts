import { ConditionalReturnType, ExtendedDouyinOptions, getDouyinData, TypeMode } from 'amagi/model/DataFetchers'
import { RequestConfig } from 'amagi/server'
import type { DouyinReturnTypeMap } from 'amagi/types/ReturnDataType/Douyin'
import { ApiResponse, DouyinMethodType } from 'amagi/validation'

/**
 * 创建抖音API方法的通用工厂函数
 * @template T - 抖音方法类型键名
 * @param methodType - 方法类型
 * @returns 返回配置好的API方法
 */
const createDouyinApiMethod = <T extends DouyinMethodType> (
  methodType: T
) => {
  return async <M extends TypeMode> (
    options: ExtendedDouyinOptions<T> & { typeMode?: M },
    cookie: string,
    requestConfig?: RequestConfig
  ): Promise<ApiResponse<ConditionalReturnType<DouyinReturnTypeMap[T], M>>> => {
    return await getDouyinData(methodType, options, cookie, requestConfig)
  }
}

/**
 * 创建绑定cookie的抖音API方法工厂函数
 * @template T - 抖音方法类型键名
 * @param methodType - 方法类型
 * @param cookie - 绑定的cookie
 * @returns 返回绑定了cookie的API方法
 */
const createBoundDouyinApiMethod = <T extends DouyinMethodType> (
  methodType: T,
  cookie: string,
  requestConfig: RequestConfig
) => {
  return async <M extends TypeMode> (
    options: ExtendedDouyinOptions<T> & { typeMode?: M }
  ): Promise<ApiResponse<ConditionalReturnType<DouyinReturnTypeMap[T], M>>> => {
    return await getDouyinData(methodType, options, cookie, requestConfig)
  }
}

/**
 * 封装了所有抖音相关的API请求，采用对象化的方式组织。
 *
 * 提供了一系列方法，用于与抖音相关的 API 进行交互。
 *
 * 每个方法都接受参数和 Cookie，返回 Promise，解析为统一格式的API响应。
 */
export const douyin = {
  /**
   * 获取文字作品数据
   * @param options 请求参数
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应，包含文字作品详细信息
   */
  getTextWorkInfo: createDouyinApiMethod('文字作品数据'),

  /**
   * 聚合解析 (视频/图集/合辑)
   * @param options 请求参数
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应，包含视频、图集或合辑数据
   */
  getWorkInfo: createDouyinApiMethod('聚合解析'),

  /**
   * 获取视频作品数据
   * @param options 请求参数
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应，包含视频作品详细信息
   */
  getVideoWorkInfo: createDouyinApiMethod('视频作品数据'),

  /**
   * 获取图集作品数据
   * @param options 请求参数
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应，包含图集作品详细信息
   */
  getImageAlbumWorkInfo: createDouyinApiMethod('图集作品数据'),

  /**
   * 获取合辑作品数据
   * @param options 请求参数
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应，包含合辑作品详细信息
   */
  getSlidesWorkInfo: createDouyinApiMethod('合辑作品数据'),

  /**
   * 获取评论数据
   * @param options 请求参数
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应，包含评论列表数据
   */
  getComments: createDouyinApiMethod('评论数据'),

  /**
   * 获取指定评论回复数据
   * @param options 请求参数
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应，包含评论回复数据
   */
  getCommentReplies: createDouyinApiMethod('指定评论回复数据'),

  /**
   * 获取用户主页数据
   * @param options 请求参数
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应，包含用户详细信息
   */
  getUserProfile: createDouyinApiMethod('用户主页数据'),

  /**
   * 获取 Emoji 数据
   * @param options 请求参数
   * @param cookie 可选的用户 Cookie
   * @returns 统一格式的API响应，包含Emoji列表数据
   */
  getEmojiList: createDouyinApiMethod('Emoji数据'),

  /**
   * 获取动态表情数据
   * @param options 请求参数
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应，包含动态表情数据
   */
  getEmojiProList: createDouyinApiMethod('动态表情数据'),

  /**
   * 获取用户主页视频列表数据
   * @param options 请求参数
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应，包含用户发布的视频列表
   */
  getUserVideos: createDouyinApiMethod('用户主页视频列表数据'),

  /**
   * 获取音乐数据
   * @param options 请求参数
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应，包含音乐详细信息
   */
  getMusicInfo: createDouyinApiMethod('音乐数据'),

  /**
   * 获取热点词数据
   * @param options 请求参数
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应，包含热点搜索词列表
   */
  getSuggestWords: createDouyinApiMethod('热点词数据'),

  /**
   * 获取搜索数据
   * @param options 请求参数
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应，包含搜索结果数据
   */
  search: createDouyinApiMethod('搜索数据'),

  /**
   * 获取直播间信息
   * @param options 请求参数
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应，包含直播间详细信息
   */
  getLiveRoomInfo: createDouyinApiMethod('直播间信息数据'),

  /**
   * 获取弹幕数据
   * @param options 请求参数
   * @returns 统一格式的API响应，包含弹幕数据
   */
  getDanmaku: createDouyinApiMethod('弹幕数据'),

  /**
   * 调用抖音API方法
   * @param methodType 抖音API方法类型
   * @param options 请求参数
   * @param cookie 有效的用户 Cookie
   * @param requestConfig 可选的请求配置
   * @returns 统一格式的API响应，包含方法返回的数据
   */
  invoke: async <T extends DouyinMethodType, M extends TypeMode> (
    methodType: T,
    options: ExtendedDouyinOptions<T> & { typeMode?: M },
    cookie: string,
    requestConfig?: RequestConfig
  ): Promise<ApiResponse<ConditionalReturnType<DouyinReturnTypeMap[T], M>>> => {
    return await getDouyinData(methodType, options, cookie, requestConfig)
  }
}

/**
 * 创建绑定了cookie的抖音API对象
 * @param cookie - 要绑定的cookie
 * @returns 绑定了cookie的抖音API对象，调用时不需要再传递cookie
 */
export const createBoundDouyinApi = (cookie: string, requestConfig: RequestConfig) => {
  return {
    /**
     * 获取文字作品数据
     * @param options 请求参数
     * @returns 统一格式的API响应，包含文字作品详细信息
     */
    getTextWorkInfo: createBoundDouyinApiMethod('文字作品数据', cookie, requestConfig),

    /**
     * 聚合解析 (视频/图集/合辑)
     * @param options 请求参数
     * @returns 统一格式的API响应，包含视频、图集或合辑数据
     */
    getWorkInfo: createBoundDouyinApiMethod('聚合解析', cookie, requestConfig),

    /**
     * 获取视频作品数据
     * @param options 请求参数
     * @returns 统一格式的API响应，包含视频作品详细信息
     */
    getVideoWorkInfo: createBoundDouyinApiMethod('视频作品数据', cookie, requestConfig),

    /**
     * 获取图集作品数据
     * @param options 请求参数
     * @returns 统一格式的API响应，包含图集作品详细信息
     */
    getImageAlbumWorkInfo: createBoundDouyinApiMethod('图集作品数据', cookie, requestConfig),

    /**
     * 获取合辑作品数据
     * @param options 请求参数
     * @returns 统一格式的API响应，包含合辑作品详细信息
     */
    getSlidesWorkInfo: createBoundDouyinApiMethod('合辑作品数据', cookie, requestConfig),

    /**
     * 获取评论数据
     * @param options 请求参数
     * @returns 统一格式的API响应，包含评论列表数据
     */
    getComments: createBoundDouyinApiMethod('评论数据', cookie, requestConfig),

    /**
     * 获取指定评论回复数据
     * @param options 请求参数
     * @returns 统一格式的API响应，包含评论回复数据
     */
    getCommentReplies: createBoundDouyinApiMethod('指定评论回复数据', cookie, requestConfig),

    /**
     * 获取用户主页数据
     * @param options 请求参数
     * @returns 统一格式的API响应，包含用户详细信息
     */
    getUserProfile: createBoundDouyinApiMethod('用户主页数据', cookie, requestConfig),

    /**
     * 获取 Emoji 数据
     * @param options 请求参数
     * @returns 统一格式的API响应，包含Emoji列表数据
     */
    getEmojiList: createBoundDouyinApiMethod('Emoji数据', cookie, requestConfig),

    /**
     * 获取动态表情数据
     * @param options 请求参数
     * @returns 统一格式的API响应，包含动态表情数据
     */
    getEmojiProList: createBoundDouyinApiMethod('动态表情数据', cookie, requestConfig),

    /**
     * 获取用户主页视频列表数据
     * @param options 请求参数
     * @returns 统一格式的API响应，包含用户发布的视频列表
     */
    getUserVideos: createBoundDouyinApiMethod('用户主页视频列表数据', cookie, requestConfig),

    /**
     * 获取音乐数据
     * @param options 请求参数
     * @returns 统一格式的API响应，包含音乐详细信息
     */
    getMusicInfo: createBoundDouyinApiMethod('音乐数据', cookie, requestConfig),

    /**
     * 获取热点词数据
     * @param options 请求参数
     * @returns 统一格式的API响应，包含热点搜索词列表
     */
    getSuggestWords: createBoundDouyinApiMethod('热点词数据', cookie, requestConfig),

    /**
     * 获取搜索数据
     * @param options 请求参数
     * @returns 统一格式的API响应，包含搜索结果数据
     */
    getSearchData: createBoundDouyinApiMethod('搜索数据', cookie, requestConfig),

    /**
     * 获取直播间信息
     * @param options 请求参数
     * @returns 统一格式的API响应，包含直播间详细信息
     */
    getLiveRoomInfo: createBoundDouyinApiMethod('直播间信息数据', cookie, requestConfig),

    /**
     * 获取弹幕数据
     * @param options 请求参数
     * @returns 统一格式的API响应，包含弹幕数据
     */
    getDanmaku: createBoundDouyinApiMethod('弹幕数据', cookie, requestConfig),

    /**
     * 调用抖音API方法
     * @param methodType 抖音API方法类型
     * @param options 请求参数
     * @returns 统一格式的API响应，包含方法返回的数据
     */
    invoke: async <T extends DouyinMethodType, M extends TypeMode> (
      methodType: T,
      options: ExtendedDouyinOptions<T> & { typeMode?: M }
    ): Promise<ApiResponse<ConditionalReturnType<DouyinReturnTypeMap[T], M>>> => {
      return await getDouyinData(methodType, options, cookie, requestConfig)
    }
  }
}

/**
 * 绑定cookie的抖音API对象类型
 */
export type BoundDouyinApi = ReturnType<typeof createBoundDouyinApi>
