import {
  KuaishouDataOptionsMap,
} from 'amagi/types'
import { getKuaishouData, TypeMode, ConditionalReturnType, ExtendedKuaishouOptions } from 'amagi/model/DataFetchers'
import { ApiResponse } from 'amagi/validation'

/**
 * 创建快手API方法的通用工厂函数
 * @template T - 快手方法类型键名
 * @param methodType - 方法类型
 * @returns 返回配置好的API方法
 */
const createKuaishouApiMethod = <T extends keyof KuaishouDataOptionsMap> (
  methodType: T
) => {
  return async <M extends TypeMode = 'loose'> (
    options: ExtendedKuaishouOptions<T> & { typeMode?: M },
    cookie?: string
  ): Promise<ApiResponse<ConditionalReturnType<KuaishouDataOptionsMap[T]['data'], M>>> => {
    return await getKuaishouData(methodType, options, cookie)
  }
}

/**
 * 创建绑定cookie的快手API方法工厂函数
 * @template T - 快手方法类型键名
 * @param methodType - 方法类型
 * @param cookie - 绑定的cookie
 * @returns 返回绑定了cookie的API方法
 */
const createBoundKuaishouApiMethod = <T extends keyof KuaishouDataOptionsMap> (
  methodType: T,
  cookie?: string
) => {
  return async <M extends TypeMode = 'loose'> (
    options: ExtendedKuaishouOptions<T> & { typeMode?: M }
  ): Promise<ApiResponse<ConditionalReturnType<KuaishouDataOptionsMap[T]['data'], M>>> => {
    return await getKuaishouData(methodType, options, cookie)
  }
}

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
  getWorkInfo: createKuaishouApiMethod('单个视频作品数据'),

  /**
   * 获取评论数据
   * @param options 请求参数，包含 photoId 和可选的 typeMode
   * @param cookie 可选的用户 Cookie
   * @returns 统一格式的API响应
   */
  getComments: createKuaishouApiMethod('评论数据'),

  /**
   * 获取 Emoji 数据
   * @param options 可选的请求参数 (主要用于 typeMode)
   * @param cookie 可选的用户 Cookie
   * @returns 统一格式的API响应
   */
  getEmojiList: createKuaishouApiMethod('Emoji数据'),
}

/**
 * 创建绑定了cookie的快手API对象
 * @param cookie - 要绑定的cookie（可选）
 * @returns 绑定了cookie的快手API对象，调用时不需要再传递cookie
 */
export const createBoundKuaishouApi = (cookie?: string) => {
  return {
    /**
     * 获取单个视频作品数据
     * @param options 请求参数，包含 photoId 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getWorkInfo: createBoundKuaishouApiMethod('单个视频作品数据', cookie),

    /**
     * 获取评论数据
     * @param options 请求参数，包含 photoId 和可选的 typeMode
     * @returns 统一格式的API响应
     */
    getComments: createBoundKuaishouApiMethod('评论数据', cookie),

    /**
     * 获取 Emoji 数据
     * @param options 可选的请求参数 (主要用于 typeMode)
     * @returns 统一格式的API响应
     */
    getEmojiList: createBoundKuaishouApiMethod('Emoji数据', cookie),
  }
}

/**
 * 绑定cookie的快手API对象类型
 */
export type BoundKuaishouApi = ReturnType<typeof createBoundKuaishouApi>