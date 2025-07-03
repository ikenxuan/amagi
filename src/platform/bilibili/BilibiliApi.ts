import {
  BilibiliMethodOptionsMap,
  TypeControl,
} from 'amagi/types'
import { getBilibiliData } from 'amagi/model/DataFetchers'

/**
 * 从 BilibiliMethodOptionsMap 中提取特定 API 的选项类型，并移除 methodType，添加 TypeControl。
 * @template K - BilibiliMethodOptionsMap 中的键名。
 */
type BilibiliApiOptions<K extends keyof BilibiliMethodOptionsMap> = Omit<BilibiliMethodOptionsMap[K], 'methodType'> & TypeControl

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
  getVideoInfo: async <T extends BilibiliApiOptions<'VideoInfoParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'单个视频作品数据', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('单个视频作品数据', { ...options }, cookie)
  },

  /**
   * 获取单个视频下载信息数据
   * @param options 请求参数，包含 avid, cid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getVideoStream: async <T extends BilibiliApiOptions<'VideoStreamParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'单个视频下载信息数据', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('单个视频下载信息数据', { ...options }, cookie)
  },

  /**
   * 获取评论数据
   * @param options 请求参数，包含 type, oid, 可选的 number, pn 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getComments: async <T extends BilibiliApiOptions<'CommentParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'评论数据', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('评论数据', { ...options }, cookie)
  },

  /**
   * 获取用户主页数据
   * @param options 请求参数，包含 host_mid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getUserProfile: async <T extends BilibiliApiOptions<'UserParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'用户主页数据', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('用户主页数据', { ...options }, cookie)
  },

  /**
   * 获取用户主页动态列表数据
   * @param options 请求参数，包含 host_mid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getUserDynamic: async <T extends BilibiliApiOptions<'UserParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'用户主页动态列表数据', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('用户主页动态列表数据', { ...options }, cookie)
  },

  /**
   * 获取 Emoji 数据
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getEmojiList: async <T extends BilibiliApiOptions<'EmojiParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'Emoji数据', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('Emoji数据', { ...options }, cookie)
  },

  /**
   * 获取番剧基本信息数据
   * @param options 请求参数，包含可选的 season_id, ep_id 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getBangumiInfo: async <T extends BilibiliApiOptions<'BangumiInfoParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'番剧基本信息数据', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('番剧基本信息数据', { ...options }, cookie)
  },

  /**
   * 获取番剧下载信息数据
   * @param options 请求参数，包含 cid, ep_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getBangumiStream: async <T extends BilibiliApiOptions<'BangumiStreamParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'番剧下载信息数据', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('番剧下载信息数据', { ...options }, cookie)
  },

  /**
   * 获取动态详情数据
   * @param options 请求参数，包含 dynamic_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getDynamicInfo: async <T extends BilibiliApiOptions<'DynamicParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'动态详情数据', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('动态详情数据', { ...options }, cookie)
  },

  /**
   * 获取动态卡片数据
   * @param options 请求参数，包含 dynamic_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getDynamicCard: async <T extends BilibiliApiOptions<'DynamicParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'动态卡片数据', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('动态卡片数据', { ...options }, cookie)
  },

  /**
   * 获取直播间信息
   * @param options 请求参数，包含 room_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getLiveRoomDetail: async <T extends BilibiliApiOptions<'LiveRoomParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'直播间信息', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('直播间信息', { ...options }, cookie)
  },

  /**
   * 获取直播间初始化信息
   * @param options 请求参数，包含 room_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getLiveRoomInitInfo: async <T extends BilibiliApiOptions<'LiveRoomParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'直播间初始化信息', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('直播间初始化信息', { ...options }, cookie)
  },

  /**
   * 获取登录基本信息
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getLoginBasicInfo: async <T extends BilibiliApiOptions<'LoginBaseInfoParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'登录基本信息', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('登录基本信息', { ...options }, cookie)
  },

  /**
   * 申请登录二维码
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getLoginQrcode: async <T extends BilibiliApiOptions<'GetQrcodeParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'申请二维码', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('申请二维码', { ...options }, cookie)
  },

  /**
   * 检查二维码状态
   * @param options 请求参数，包含 qrcode_key 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  checkQrcodeStatus: async <T extends BilibiliApiOptions<'QrcodeParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'二维码状态', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('二维码状态', { ...options }, cookie)
  },

  /**
   * 获取 UP 主总播放量
   * @param options 请求参数，包含 host_mid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应
   */
  getUserTotalPlayCount: async <T extends BilibiliApiOptions<'UserParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'获取UP主总播放量', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('获取UP主总播放量', { ...options }, cookie)
  },

  /**
   * 将 AV 号转换为 BV 号
   * @param options 请求参数，包含 avid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie (此接口通常不需要)
   * @returns 统一格式的API响应
   */
  convertAvToBv: async <T extends BilibiliApiOptions<'Av2BvParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'AV转BV', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('AV转BV', { ...options }, cookie)
  },

  /**
   * 将 BV 号转换为 AV 号
   * @param options 请求参数，包含 bvid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie (此接口通常不需要)
   * @returns 统一格式的API响应
   */
  convertBvToAv: async <T extends BilibiliApiOptions<'Bv2AvParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getBilibiliData<'BV转AV', NonNullable<T['typeMode']>>>>> => {
    return await getBilibiliData('BV转AV', { ...options }, cookie)
  },
}