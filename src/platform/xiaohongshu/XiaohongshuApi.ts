import {
  XiaohongshuDataOptionsMap,
} from 'amagi/types'
import { ConditionalReturnType, ExtendedXiaohongshuOptions, getXiaohongshuData, TypeMode } from 'amagi/model/DataFetchers'
import { ApiResponse } from 'amagi/validation'
import { RequestConfig } from 'amagi/server'

/**
 * 创建小红书API方法的通用工厂函数
 * @template T - 小红书方法类型键名
 * @param methodType - 方法类型
 * @returns 返回配置好的API方法
 */
const createXiaohongshuApiMethod = <T extends keyof XiaohongshuDataOptionsMap> (
  methodType: T
) => {
  return async <M extends TypeMode> (
    options: ExtendedXiaohongshuOptions<T> & { typeMode?: M },
    cookie: string,
    requestConfig?: RequestConfig
  ): Promise<ApiResponse<ConditionalReturnType<XiaohongshuDataOptionsMap[T]['data'], M>>> => {
    return await getXiaohongshuData(methodType, options, cookie, requestConfig)
  }
}

/**
 * 创建绑定cookie的小红书API方法工厂函数
 * @template T - 小红书方法类型键名
 * @param methodType - 方法类型
 * @param cookie - 绑定的cookie
 * @returns 返回绑定了cookie的API方法
 */
const createBoundXiaohongshuApiMethod = <T extends keyof XiaohongshuDataOptionsMap> (
  methodType: T,
  cookie: string,
  requestConfig: RequestConfig
) => {
  return async <M extends TypeMode> (
    options: ExtendedXiaohongshuOptions<T> & { typeMode?: M }
  ): Promise<ApiResponse<ConditionalReturnType<XiaohongshuDataOptionsMap[T]['data'], M>>> => {
    return await getXiaohongshuData(methodType, options, cookie, requestConfig)
  }
}

/**
 * 封装了所有小红书相关的API请求，采用对象化的方式组织。
 * 
 * 提供了一系列方法，用于与小红书相关的 API 进行交互。
 * 
 * 每个方法都接受参数和 Cookie，返回 Promise，解析为统一格式的API响应。
 */
export const xiaohongshu = {
  /**
   * 获取首页推荐数据
   * @param options 请求参数，包含分页和过滤选项
   * @param cookie 有效的用户 Cookie
   * @returns 统一格式的API响应，包含首页推荐笔记列表
   */
  getHomeFeed: createXiaohongshuApiMethod('首页推荐数据')
}

/**
 * 创建绑定了cookie的小红书API对象
 * @param cookie - 要绑定的cookie
 * @returns 绑定了cookie的小红书API对象，调用时不需要再传递cookie
 */
export const createBoundXiaohongshuApi = (cookie: string, requestConfig: RequestConfig) => {
  return {
    /**
     * 获取首页推荐数据
     * @param options 请求参数，包含分页和过滤选项
     * @returns 统一格式的API响应，包含首页推荐笔记列表
     */
    getHomeFeed: createBoundXiaohongshuApiMethod('首页推荐数据', cookie, requestConfig)
  }
}

/**
 * 绑定cookie的小红书API对象类型
 */
export type BoundXiaohongshuApi = ReturnType<typeof createBoundXiaohongshuApi>