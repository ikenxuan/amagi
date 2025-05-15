export * from 'amagi/model'
export * from 'amagi/platform'
export * from 'amagi/server'
export * from 'amagi/types'

import { amagiClient, cookiesOptions } from 'amagi/server'
import {
  douyinUtils,
  bilibiliUtils,
  kuaishouUtils
} from 'amagi/platform'

/** amagi 的构造函数类型 */
type AmagiConstructor = {
  new(options: cookiesOptions): amagiClient
  (options: cookiesOptions): amagiClient
  /** 抖音相关功能模块 (工具集) */
  douyin: typeof douyinUtils
  /** B站相关功能模块 (工具集) */
  bilibili: typeof bilibiliUtils
  /** 快手相关功能模块 (工具集) */
  kuaishou: typeof kuaishouUtils

  /**
   * 快捷获取抖音数据
   * @param type - 请求数据类型
   * @param cookie - 有效的用户Cookie
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   */
  getDouyinData: () => typeof douyinUtils.getDouyinData

  /**
   * 快捷获取B站数据
   * @param type - 请求数据类型
   * @param cookie - 有效的用户Cookie
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   */
  getBilibiliData: () => typeof bilibiliUtils.getBilibiliData

  /**
   * 快捷获取快手数据
   * @param type - 请求数据类型
   * @param cookie - 有效的用户Cookie
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   */
  getKuaishouData: () => typeof kuaishouUtils.getKuaishouData
}

/**
 * 创建一个新的 amagi 客户端实例
 * @description 用于创建和初始化一个新的 amagi 客户端实例，支持通过 new 关键字或函数调用方式使用
 * @param options - cookies 配置选项，用于设置客户端的 cookies 相关参数
 * @returns 返回一个新的 amagi 客户端实例
 */
function createAmagiClient (this: AmagiConstructor, options: cookiesOptions = {}): amagiClient {
  // 是否通过 new 关键字调用
  if (!(this instanceof createAmagiClient)) {
    return new (createAmagiClient as unknown as new (options: cookiesOptions) => amagiClient)(options)
  }

  return new amagiClient(options)
}

createAmagiClient.douyin = douyinUtils
createAmagiClient.bilibili = bilibiliUtils
createAmagiClient.kuaishou = kuaishouUtils

createAmagiClient.getDouyinData = () => douyinUtils.getDouyinData
createAmagiClient.getBilibiliData = () => bilibiliUtils.getBilibiliData
createAmagiClient.getKuaishouData = () => kuaishouUtils.getKuaishouData

/** After instantiation, it can interact with the specified platform API to quickly obtain data. */
export const CreateApp = createAmagiClient as AmagiConstructor

/** After instantiation, it can interact with the specified platform API to quickly obtain data. */
const Client = CreateApp
const amagi = Client

export { Client as default, amagi }