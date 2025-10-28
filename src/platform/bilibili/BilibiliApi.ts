import {
  BilibiliDataOptionsMap,
} from 'amagi/types'
import { getBilibiliData, TypeMode, ConditionalReturnType, ExtendedBilibiliOptions } from 'amagi/model/DataFetchers'
import { ApiResponse } from 'amagi/validation'
import { RequestConfig } from 'amagi/server'

/**
 * 创建B站API方法的通用工厂函数
 * @template T - B站方法类型键名
 * @param methodType - 方法类型
 * @returns 返回配置好的API方法
 */
const createBilibiliApiMethod = <T extends keyof BilibiliDataOptionsMap> (
  methodType: T
) => {
  return async <M extends TypeMode = 'loose'> (
    options: ExtendedBilibiliOptions<T> & { typeMode?: M },
    cookie?: string
  ): Promise<ApiResponse<ConditionalReturnType<BilibiliDataOptionsMap[T]['data'], M>>> => {
    return await getBilibiliData(methodType, options, cookie)
  }
}

/**
 * 创建绑定cookie的B站API方法工厂函数
 * @template T - B站方法类型键名
 * @param methodType - 方法类型
 * @param cookie - 绑定的cookie
 * @returns 返回绑定了cookie的API方法
 */
const createBoundBilibiliApiMethod = <T extends keyof BilibiliDataOptionsMap> (
  methodType: T,
  cookie?: string
) => {
  return async <M extends TypeMode = 'loose'> (
    options: ExtendedBilibiliOptions<T> & { typeMode?: M }
  ): Promise<ApiResponse<ConditionalReturnType<BilibiliDataOptionsMap[T]['data'], M>>> => {
    return await getBilibiliData(methodType, options, cookie)
  }
}

/**
 * B站相关 API 的命名空间。
 * 
 * 部分接口可能不需要 Cookie 但建议传递有效的用户 Cookie，以获取更多数据。
 *
 * 提供了一系列方法，用于与B站相关的 API 进行交互。
 * 
 * 每个方法都接受参数和 Cookie，返回 Promise，解析为统一格式的API响应。
 */
export const bilibili = {
  /**
   * 获取单个视频作品数据
   * @param options 请求参数，包含 bvid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getVideoInfo: createBilibiliApiMethod('单个视频作品数据'),

  /**
   * 获取单个视频下载信息数据
   * @param options 请求参数，包含 avid, cid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getVideoStream: createBilibiliApiMethod('单个视频下载信息数据'),

  /**
   * 获取评论数据
   * @param options 请求参数，包含 type, oid, 可选的 number, pn 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getComments: createBilibiliApiMethod('评论数据'),

  /**
   * 获取用户主页数据
   * @param options 请求参数，包含 host_mid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getUserProfile: createBilibiliApiMethod('用户主页数据'),

  /**
   * 获取用户主页动态列表数据
   * @param options 请求参数，包含 host_mid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getUserDynamic: createBilibiliApiMethod('用户主页动态列表数据'),

  /**
   * 获取 Emoji 数据
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getEmojiList: createBilibiliApiMethod('Emoji数据'),

  /**
   * 获取番剧基本信息数据
   * @param options 请求参数，包含可选的 season_id, ep_id 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getBangumiInfo: createBilibiliApiMethod('番剧基本信息数据'),

  /**
   * 获取番剧下载信息数据
   * @param options 请求参数，包含 cid, ep_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getBangumiStream: createBilibiliApiMethod('番剧下载信息数据'),

  /**
   * 获取动态详情数据
   * @param options 请求参数，包含 dynamic_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getDynamicInfo: createBilibiliApiMethod('动态详情数据'),

  /**
   * 获取动态卡片数据
   * @param options 请求参数，包含 dynamic_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getDynamicCard: createBilibiliApiMethod('动态卡片数据'),

  /**
   * 获取直播间信息
   * @param options 请求参数，包含 room_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getLiveRoomDetail: createBilibiliApiMethod('直播间信息'),

  /**
   * 获取直播间初始化信息
   * @param options 请求参数，包含 room_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getLiveRoomInitInfo: createBilibiliApiMethod('直播间初始化信息'),

  /**
   * 获取登录基本信息
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getLoginBasicInfo: createBilibiliApiMethod('登录基本信息'),

  /**
   * 申请登录二维码
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getLoginQrcode: createBilibiliApiMethod('申请二维码'),

  /**
   * 检查二维码状态
   * @param options 请求参数，包含 qrcode_key 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  checkQrcodeStatus: createBilibiliApiMethod('二维码状态'),

  /**
   * 获取 UP 主总播放量
   * @param options 请求参数，包含 host_mid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getUserTotalPlayCount: createBilibiliApiMethod('获取UP主总播放量'),

  /**
   * 将 AV 号转换为 BV 号
   * @param options 请求参数，包含 avid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie (此接口通常不需要)
   * @returns 统一格式的API响应
   */
  convertAvToBv: createBilibiliApiMethod('AV转BV'),

  /**
   * 将 BV 号转换为 AV 号
   * @param options 请求参数，包含 bvid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie (此接口通常不需要)
   * @returns 统一格式的API响应
   */
  convertBvToAv: createBilibiliApiMethod('BV转AV'),

  /**
   * 获取专栏正文内容
   * @param options 请求参数，包含 id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getArticleContent: createBilibiliApiMethod('专栏正文内容'),

  /**
   * 获取专栏显示卡片信息
   * @param options 请求参数，包含 ids 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getArticleCard: createBilibiliApiMethod('专栏显示卡片信息'),

  /**
   * 获取专栏文章基本信息
   * @param options 请求参数，包含 id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getArticleInfo: createBilibiliApiMethod('专栏文章基本信息'),

  /**
   * 获取文集基本信息
   * @param options 请求参数，包含 id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getColumnInfo: createBilibiliApiMethod('文集基本信息'),
}

/**
 * 创建绑定了cookie的B站API对象
 * @param cookie - 要绑定的cookie（可选）
 * @returns 绑定了cookie的B站API对象，调用时不需要再传递cookie
 */
export const createBoundBilibiliApi = (cookie: string, requestConfig: RequestConfig) => {
  return {
    /**
     * 获取单个视频作品数据
     * @param options 请求参数，包含 bvid 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getVideoInfo: createBoundBilibiliApiMethod('单个视频作品数据', cookie),

    /**
     * 获取单个视频下载信息数据
     * @param options 请求参数，包含 avid, cid 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getVideoStream: createBoundBilibiliApiMethod('单个视频下载信息数据', cookie),

    /**
     * 获取评论数据
     * @param options 请求参数，包含 type, oid, 可选的 number, pn 和 typeMode
     * @returns 统一格式的API响应
     */
    getComments: createBoundBilibiliApiMethod('评论数据', cookie),

    /**
     * 获取用户主页数据
     * @param options 请求参数，包含 host_mid 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getUserProfile: createBoundBilibiliApiMethod('用户主页数据', cookie),

    /**
     * 获取用户主页动态列表数据
     * @param options 请求参数，包含 host_mid 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getUserDynamic: createBoundBilibiliApiMethod('用户主页动态列表数据', cookie),

    /**
     * 获取 Emoji 数据
     * @param options 可选的请求参数 (主要用于 typeMode)
     * @returns 统一格式的API响应
     */
    getEmojiList: createBoundBilibiliApiMethod('Emoji数据', cookie),

    /**
     * 获取番剧基本信息数据
     * @param options 请求参数，包含可选的 season_id, ep_id 和 typeMode
     * @returns 统一格式的API响应
     */
    getBangumiInfo: createBoundBilibiliApiMethod('番剧基本信息数据', cookie),

    /**
     * 获取番剧下载信息数据
     * @param options 请求参数，包含 cid, ep_id 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getBangumiStream: createBoundBilibiliApiMethod('番剧下载信息数据', cookie),

    /**
     * 获取动态详情数据
     * @param options 请求参数，包含 dynamic_id 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getDynamicInfo: createBoundBilibiliApiMethod('动态详情数据', cookie),

    /**
     * 获取动态卡片数据
     * @param options 请求参数，包含 dynamic_id 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getDynamicCard: createBoundBilibiliApiMethod('动态卡片数据', cookie),

    /**
     * 获取直播间信息
     * @param options 请求参数，包含 room_id 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getLiveRoomDetail: createBoundBilibiliApiMethod('直播间信息', cookie),

    /**
     * 获取直播间初始化信息
     * @param options 请求参数，包含 room_id 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getLiveRoomInitInfo: createBoundBilibiliApiMethod('直播间初始化信息', cookie),

    /**
     * 获取登录基本信息
     * @param options 可选的请求参数 (主要用于 typeMode)
     * @returns 统一格式的API响应
     */
    getLoginBasicInfo: createBoundBilibiliApiMethod('登录基本信息', cookie),

    /**
     * 申请登录二维码
     * @param options 可选的请求参数 (主要用于 typeMode)
     * @returns 统一格式的API响应
     */
    getLoginQrcode: createBoundBilibiliApiMethod('申请二维码', cookie),

    /**
     * 检查二维码状态
     * @param options 请求参数，包含 qrcode_key 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    checkQrcodeStatus: createBoundBilibiliApiMethod('二维码状态', cookie),

    /**
     * 获取 UP 主总播放量
     * @param options 请求参数，包含 host_mid 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getUserTotalPlayCount: createBoundBilibiliApiMethod('获取UP主总播放量', cookie),

    /**
     * 将 AV 号转换为 BV 号
     * @param options 请求参数，包含 avid 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    convertAvToBv: createBoundBilibiliApiMethod('AV转BV', cookie),

    /**
     * 将 BV 号转换为 AV 号
     * @param options 请求参数，包含 bvid 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    convertBvToAv: createBoundBilibiliApiMethod('BV转AV', cookie),

    /**
     * 获取专栏正文内容
     * @param options 请求参数，包含 id 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getArticleContent: createBoundBilibiliApiMethod('专栏正文内容', cookie),

    /**
     * 获取专栏显示卡片信息
     * @param options 请求参数，包含 ids 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getArticleCard: createBoundBilibiliApiMethod('专栏显示卡片信息', cookie),

    /**
     * 获取专栏文章基本信息
     * @param options 请求参数，包含 id 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getArticleInfo: createBoundBilibiliApiMethod('专栏文章基本信息', cookie),

    /**
     * 获取文集基本信息
     * @param options 请求参数，包含 id 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getColumnInfo: createBoundBilibiliApiMethod('文集基本信息', cookie),
  }
}

/**
 * 绑定cookie的B站API对象类型
 */
export type BoundBilibiliApi = ReturnType<typeof createBoundBilibiliApi>