import { BilibiliData } from 'amagi/platform/bilibili/getdata'
import {
  BilibiliDataOptionsMap,
  BilibiliMethodOptionsMap,
  TypeControl,
} from 'amagi/types'

/**
 * 从 BilibiliMethodOptionsMap 中提取特定 API 的选项类型，并移除 methodType，添加 TypeControl。
 * @template K - BilibiliMethodOptionsMap 中的键名。
 */
type BilibiliApiOptions<K extends keyof BilibiliMethodOptionsMap> = Omit<BilibiliMethodOptionsMap[K], 'methodType'> & TypeControl

/**
 * 根据传入的选项中的 typeMode 决定 Bilibili API 的返回类型。
 * @template K - BilibiliDataOptionsMap 中的键名。
 * @template T - 包含可选 typeMode 的选项对象。
 */
type BilibiliApiReturn<K extends keyof BilibiliDataOptionsMap, T extends TypeControl> = T['typeMode'] extends 'strict' ? BilibiliDataOptionsMap[K]['data'] : any

/**
 * B站相关 API 的命名空间。
 * 
 * 部分接口可能不需要 Cookie 但建议传递有效的用户 Cookie，以获取更多数据。
 *
 * 提供了一系列方法，用于与B站相关的 API 进行交互。
 * 
 * 每个方法都接受参数和 Cookie，返回 Promise，解析为接口返回的原始数据。
 */
export const bilibili = {
  /**
   * 获取单个视频作品数据
   * @param options 请求参数，包含 bvid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getVideoInfo<T extends BilibiliApiOptions<'VideoInfoParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'单个视频作品数据', T>> {
    const { typeMode, ...restOptions } = options
    const data = await BilibiliData({ ...restOptions, methodType: '单个视频作品数据' }, cookie)
    return data
  },

  /**
   * 获取单个视频下载信息数据
   * @param options 请求参数，包含 avid, cid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getVideoStream<T extends BilibiliApiOptions<'VideoStreamParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'单个视频下载信息数据', T>> {
    const { typeMode, ...restOptions } = options
    const data = await BilibiliData({ ...restOptions, methodType: '单个视频下载信息数据' }, cookie)
    return data
  },

  /**
   * 获取评论数据
   * @param options 请求参数，包含 type, oid, 可选的 number, pn 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getComments<T extends BilibiliApiOptions<'CommentParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'评论数据', T>> {
    const { typeMode, ...restOptions } = options
    const data = await BilibiliData({ ...restOptions, methodType: '评论数据' }, cookie)
    return data
  },

  /**
   * 获取用户主页数据
   * @param options 请求参数，包含 host_mid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getUserProfile<T extends BilibiliApiOptions<'UserParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'用户主页数据', T>> {
    const { typeMode, ...restOptions } = options
    // 注意：UserParams 用于多个 methodType，这里指定为 '用户主页数据'
    const data = await BilibiliData({ ...restOptions, methodType: '用户主页数据' }, cookie)
    return data
  },

  /**
   * 获取用户主页动态列表数据
   * @param options 请求参数，包含 host_mid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getUserDynamic<T extends BilibiliApiOptions<'UserParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'用户主页动态列表数据', T>> {
    const { typeMode, ...restOptions } = options
    // 注意：UserParams 用于多个 methodType，这里指定为 '用户主页动态列表数据'
    const data = await BilibiliData({ ...restOptions, methodType: '用户主页动态列表数据' }, cookie)
    return data
  },

  /**
   * 获取 Emoji 数据
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getEmojiList<T extends BilibiliApiOptions<'EmojiParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'Emoji数据', T>> {
    const { typeMode, ...restOptions } = options
    const data = await BilibiliData({ ...restOptions, methodType: 'Emoji数据' }, cookie)
    return data
  },

  /**
   * 获取番剧基本信息数据
   * @param options 请求参数，包含可选的 season_id, ep_id 和 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getBangumiInfo<T extends BilibiliApiOptions<'BangumiInfoParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'番剧基本信息数据', T>> {
    const { typeMode, ...restOptions } = options
    const data = await BilibiliData({ ...restOptions, methodType: '番剧基本信息数据' }, cookie)
    return data
  },

  /**
   * 获取番剧下载信息数据
   * @param options 请求参数，包含 cid, ep_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getBangumiStream<T extends BilibiliApiOptions<'BangumiStreamParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'番剧下载信息数据', T>> {
    const { typeMode, ...restOptions } = options
    const data = await BilibiliData({ ...restOptions, methodType: '番剧下载信息数据' }, cookie)
    return data
  },

  /**
   * 获取动态详情数据
   * @param options 请求参数，包含 dynamic_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getDynamicInfo<T extends BilibiliApiOptions<'DynamicParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'动态详情数据', T>> {
    const { typeMode, ...restOptions } = options
    // 注意：DynamicParams 用于多个 methodType，这里指定为 '动态详情数据'
    const data = await BilibiliData({ ...restOptions, methodType: '动态详情数据' }, cookie)
    return data
  },

  /**
   * 获取动态卡片数据
   * @param options 请求参数，包含 dynamic_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getDynamicCard<T extends BilibiliApiOptions<'DynamicParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'动态卡片数据', T>> {
    const { typeMode, ...restOptions } = options
    // 注意：DynamicParams 用于多个 methodType，这里指定为 '动态卡片数据'
    const data = await BilibiliData({ ...restOptions, methodType: '动态卡片数据' }, cookie)
    return data
  },

  /**
   * 获取直播间信息
   * @param options 请求参数，包含 room_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getLiveRoomDetail<T extends BilibiliApiOptions<'LiveRoomParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'直播间信息', T>> {
    const { typeMode, ...restOptions } = options
    // 注意：LiveRoomParams 用于多个 methodType，这里指定为 '直播间信息'
    const data = await BilibiliData({ ...restOptions, methodType: '直播间信息' }, cookie)
    return data
  },

  /**
   * 获取直播间初始化信息
   * @param options 请求参数，包含 room_id 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getLiveRoomInitInfo<T extends BilibiliApiOptions<'LiveRoomParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'直播间初始化信息', T>> {
    const { typeMode, ...restOptions } = options
    // 注意：LiveRoomParams 用于多个 methodType，这里指定为 '直播间初始化信息'
    const data = await BilibiliData({ ...restOptions, methodType: '直播间初始化信息' }, cookie)
    return data
  },

  /**
   * 获取登录基本信息
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getLoginBasicInfo<T extends BilibiliApiOptions<'LoginBaseInfoParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'登录基本信息', T>> {
    const { typeMode, ...restOptions } = options
    const data = await BilibiliData({ ...restOptions, methodType: '登录基本信息' }, cookie)
    return data
  },

  /**
   * 申请登录二维码
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getLoginQrcode<T extends BilibiliApiOptions<'GetQrcodeParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'申请二维码', T>> {
    const { typeMode, ...restOptions } = options
    const data = await BilibiliData({ ...restOptions, methodType: '申请二维码' }, cookie)
    return data
  },

  /**
   * 检查二维码状态
   * @param options 请求参数，包含 qrcode_key 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async checkQrcodeStatus<T extends BilibiliApiOptions<'QrcodeParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'二维码状态', T>> {
    const { typeMode, ...restOptions } = options
    const data = await BilibiliData({ ...restOptions, methodType: '二维码状态' }, cookie)
    return data
  },

  /**
   * 获取 UP 主总播放量
   * @param options 请求参数，包含 host_mid 和可选的 typeMode
   * @param cookie 有效的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getUserTotalPlayCount<T extends BilibiliApiOptions<'UserParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliApiReturn<'获取UP主总播放量', T>> {
    const { typeMode, ...restOptions } = options
    // 注意：UserParams 用于多个 methodType，这里指定为 '获取UP主总播放量'
    const data = await BilibiliData({ ...restOptions, methodType: '获取UP主总播放量' }, cookie)
    return data
  },

  /**
   * 将 AV 号转换为 BV 号
   * @param options 请求参数，包含 avid
   * @param cookie 有效的用户 Cookie (此接口通常不需要)
   * @returns 接口返回的原始数据
   */
  async convertAvToBv<T extends BilibiliApiOptions<'Av2BvParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliDataOptionsMap['AV转BV']['data']> {
    const { typeMode, ...restOptions } = options
    // AV转BV 是本地计算，不需要调用 BilibiliData，但为了统一结构和 typeMode 处理，仍然调用
    // 注意：BilibiliData 内部会处理本地转换逻辑
    const data = await BilibiliData({ ...restOptions, methodType: 'AV转BV' }, cookie)
    return data
  },

  /**
   * 将 BV 号转换为 AV 号
   * @param options 请求参数，包含 bvid
   * @param cookie 有效的用户 Cookie (此接口通常不需要)
   * @returns 接口返回的原始数据
   */
  async convertBvToAv<T extends BilibiliApiOptions<'Bv2AvParams'>> (
    options: T,
    cookie?: string
  ): Promise<BilibiliDataOptionsMap['BV转AV']['data']> {
    const { typeMode, ...restOptions } = options
    // BV转AV 是本地计算，不需要调用 BilibiliData，但为了统一结构和 typeMode 处理，仍然调用
    // 注意：BilibiliData 内部会处理本地转换逻辑
    const data = await BilibiliData({ ...restOptions, methodType: 'BV转AV' }, cookie)
    return data
  },
}