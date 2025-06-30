export * from 'amagi/model'
export * from 'amagi/platform'
export * from './v4/server'
export * from 'amagi/types'
export * from './v4/DataFetchers'
import {
  createDouyinRoutes,
  createBilibiliRoutes,
  createKuaishouRoutes
} from 'amagi/platform'

import { amagiClient, cookiesOptions } from './v4/server'
import {
  douyinUtils,
  bilibiliUtils,
  kuaishouUtils
} from 'amagi/platform'
import { getBilibiliData, getDouyinData, getKuaishouData } from './v4/DataFetchers'

/** amagi 的构造函数类型 */
type AmagiConstructor = {
  new(options?: cookiesOptions): amagiClient
  (options?: cookiesOptions): amagiClient
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
  getDouyinData: typeof getDouyinData

  /**
   * 快捷获取B站数据
   * @param type - 请求数据类型
   * @param cookie - 有效的用户Cookie
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   */
  getBilibiliData: typeof getBilibiliData

  /**
   * 快捷获取快手数据
   * @param type - 请求数据类型
   * @param cookie - 有效的用户Cookie
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   */
  getKuaishouData: typeof getKuaishouData
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

createAmagiClient.getDouyinData = getDouyinData
createAmagiClient.getBilibiliData = getBilibiliData
createAmagiClient.getKuaishouData = getKuaishouData

/** After instantiation, it can interact with the specified platform API to quickly obtain data. */
export const CreateApp = createAmagiClient as AmagiConstructor

/** After instantiation, it can interact with the specified platform API to quickly obtain data. */
const Client = CreateApp
const amagi = Client

/*!
 * @ikenxuan/amagi v4 (default)
 * Copyright(c) 2023 ikenxuan
 * GPL-3.0 Licensed
 */
export { Client as default, amagi }

export {
  createDouyinRoutes as registerBilibiliRoutes,
  createBilibiliRoutes as registerDouyinRoutes,
  createKuaishouRoutes as registerKuaishouRoutes
}