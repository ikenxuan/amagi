export * from 'amagi/model'
export * from 'amagi/platform'
export * from 'amagi/server'
export * from 'amagi/types'

// 导出新的API
export { getDouyinData, getBilibiliData, getKuaishouData } from './model/DataFetchers'
export * from './validation'
export * from './utils/errors'

import { getDouyinData, getBilibiliData, getKuaishouData } from 'amagi/model'
import { CookieOptions, createAmagiClient } from './server'
import {
  douyinUtils,
  bilibiliUtils,
  kuaishouUtils
} from 'amagi/platform'

/**
 * @deprecated 请使用 createAmagiClient 替代
 */
export const amagiClient = createAmagiClient

/** amagi 的构造函数类型 */
type AmagiConstructor = {
  new(options?: CookieOptions): ReturnType<typeof createAmagiClient>
  (options?: CookieOptions): ReturnType<typeof createAmagiClient>
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
function CreateAmagiApp(this: any, options: CookieOptions = {}): ReturnType<typeof createAmagiClient> {
  // 是否通过 new 关键字调用
  if (!(this instanceof CreateAmagiApp)) {
    return createAmagiClient(options)
  }
  
  return createAmagiClient(options)
}

// 添加静态属性和方法
CreateAmagiApp.douyin = douyinUtils
CreateAmagiApp.bilibili = bilibiliUtils
CreateAmagiApp.kuaishou = kuaishouUtils

CreateAmagiApp.getDouyinData = getDouyinData
CreateAmagiApp.getBilibiliData = getBilibiliData
CreateAmagiApp.getKuaishouData = getKuaishouData

/** 主要的 amagi 应用构造器，同时具有函数、构造器和对象特性 */
export const CreateApp = CreateAmagiApp as AmagiConstructor

/** 默认导出，同时具有函数、构造器和对象特性 */
const amagi = CreateApp

export { CreateApp as Client }
export default amagi