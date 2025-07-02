import { KuaishouData } from 'amagi/platform/kuaishou/getdata'
import {
  KuaishouDataOptionsMap,
  KuaishouMethodOptionsMap,
  TypeControl,
} from 'amagi/types'
import { createSuccessResponse, ApiResponse } from 'amagi/validation'

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
  ): Promise<KuaishouApiReturn<'单个视频作品数据', T>> => {
    try {
      const data = await KuaishouData({ ...options, methodType: '单个视频作品数据' }, cookie)
      return createSuccessResponse(data, '获取视频作品数据成功', 200)
    } catch (error) {
      return createSuccessResponse(null, `获取视频作品数据失败: ${error instanceof Error ? error.message : '未知错误'}`, 500)
    }
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
  ): Promise<KuaishouApiReturn<'评论数据', T>> => {
    try {
      const data = await KuaishouData({ ...options, methodType: '评论数据' }, cookie)
      return createSuccessResponse(data, '获取评论数据成功', 200)
    } catch (error) {
      return createSuccessResponse(null, `获取评论数据失败: ${error instanceof Error ? error.message : '未知错误'}`, 500)
    }
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
  ): Promise<KuaishouApiReturn<'Emoji数据', T>> => {
    try {
      const data = await KuaishouData({ ...options, methodType: 'Emoji数据' }, cookie)
      return createSuccessResponse(data, '获取Emoji数据成功', 200)
    } catch (error) {
      return createSuccessResponse(null, `获取Emoji数据失败: ${error instanceof Error ? error.message : '未知错误'}`, 500)
    }
  },
}