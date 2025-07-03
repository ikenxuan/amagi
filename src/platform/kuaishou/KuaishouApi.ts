import { KuaishouData } from 'amagi/platform/kuaishou/getdata'
import {
  KuaishouDataOptionsMap,
  KuaishouMethodOptionsMap,
  TypeControl,
} from 'amagi/types'
import { getKuaishouData } from 'amagi/model/DataFetchers'
import { createSuccessResponse, ApiResponse, createErrorResponse } from 'amagi/validation'

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
type KuaishouApiReturn<K extends keyof KuaishouDataOptionsMap, T extends TypeControl> = ApiResponse<T['typeMode'] extends 'strict' ? KuaishouDataOptionsMap[K]['data'] : any>

/**
 * 快手相关 API 的命名空间。
 */
export const kuaishou = {
  /**
   * 获取单个视频作品数据
   * @param options 请求参数，包含 photoId 和可选的 typeMode
   * @param cookie 可选的用户 Cookie
   * @returns 统一格式的API响应
   */
  getWorkInfo: async <T extends KuaishouApiOptions<'VideoInfoParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getKuaishouData<'单个视频作品数据', NonNullable<T['typeMode']>>>>> => {
    return await getKuaishouData('单个视频作品数据', { ...options }, cookie)
  },

  /**
   * 获取评论数据
   * @param options 请求参数，包含 photoId 和可选的 typeMode
   * @param cookie 可选的用户 Cookie
   * @returns 统一格式的API响应
   */
  getComments: async <T extends KuaishouApiOptions<'CommentParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getKuaishouData<'评论数据', NonNullable<T['typeMode']>>>>> => {
    return await getKuaishouData('评论数据', { ...options }, cookie)
  },

  /**
   * 获取 Emoji 数据
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 可选的用户 Cookie
   * @returns 统一格式的API响应
   */
  getEmojiList: async <T extends KuaishouApiOptions<'EmojiListParams'>> (
    options: T,
    cookie?: string
  ): Promise<Awaited<ReturnType<typeof getKuaishouData<'Emoji数据', NonNullable<T['typeMode']>>>>> => {
    return await getKuaishouData('Emoji数据', { ...options }, cookie)
  },
}