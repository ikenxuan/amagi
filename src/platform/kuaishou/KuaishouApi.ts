import { KuaishouData } from 'amagi/platform/kuaishou/getdata'
import {
  KuaishouDataOptionsMap,
  KuaishouMethodOptionsMap,
  TypeControl,
} from 'amagi/types'

/**
 * 从 KuaishouMethodOptionsMap 中提取特定 API 的选项类型，并移除 methodType，添加 TypeControl。
 * @template K - KuaishouMethodOptionsMap 中的键名。
 */
type KuaishouApiOptions<K extends keyof KuaishouMethodOptionsMap> = Omit<KuaishouMethodOptionsMap[K], 'methodType'> & TypeControl

/**
 * 根据传入的选项中的 typeMode 决定 Kuaishou API 的返回类型。
 * @template K - KuaishouDataOptionsMap 中的键名。
 * @template T - 包含可选 typeMode 的选项对象。
 */
type KuaishouApiReturn<K extends keyof KuaishouDataOptionsMap, T extends TypeControl> = T['typeMode'] extends 'strict' ? KuaishouDataOptionsMap[K]['data'] : any

// --- Kuaishou API 命名空间实现 ---

/**
 * 快手相关 API 的命名空间。
 */
export const kuaishou = {
  /**
   * 获取单个视频作品数据
   * @param options 请求参数，包含 photoId 和可选的 typeMode
   * @param cookie 可选的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getWorkInfo<T extends KuaishouApiOptions<'VideoInfoParams'>> (
    options: T,
    cookie?: string
  ): Promise<KuaishouApiReturn<'单个视频作品数据', T>> {
    // 注意：KuaishouData 函数内部会处理 typeMode，这里我们不需要显式移除它
    // KuaishouData 的第一个参数需要包含 methodType
    const data = await KuaishouData({ ...options, methodType: '单个视频作品数据' }, cookie)
    return data
  },

  /**
   * 获取评论数据
   * @param options 请求参数，包含 photoId 和可选的 typeMode
   * @param cookie 可选的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getComments<T extends KuaishouApiOptions<'CommentParams'>> (
    options: T,
    cookie?: string
  ): Promise<KuaishouApiReturn<'评论数据', T>> {
    const data = await KuaishouData({ ...options, methodType: '评论数据' }, cookie)
    return data
  },

  /**
   * 获取 Emoji 数据
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 可选的用户 Cookie
   * @returns 接口返回的原始数据
   */
  async getEmojiList<T extends KuaishouApiOptions<'EmojiListParams'>> (
    options: T,
    cookie?: string
  ): Promise<KuaishouApiReturn<'Emoji数据', T>> {
    // EmojiParams 可能为空，所以 options 可能只包含 typeMode
    const data = await KuaishouData({ ...options, methodType: 'Emoji数据' }, cookie)
    return data
  },
}