export * from 'amagi/model'
export * from 'amagi/platform'
export * from 'amagi/server'
export * from 'amagi/types'

// 导出新的API
export { getDouyinData, getBilibiliData, getKuaishouData } from './model/DataFetchers'
export * from './validation'
export * from './utils/errors'

import { getDouyinData, getBilibiliData, getKuaishouData } from 'amagi/model/DataFetchers'
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
  getDouyinData: typeof getDouyinData
  getBilibiliData: typeof getBilibiliData
  getKuaishouData: typeof getKuaishouData
}

/**
 * 创建一个新的 amagi 客户端实例
 * @description 用于创建和初始化一个新的 amagi 客户端实例，支持通过 new 关键字或函数调用方式使用
 * @param options - cookies 配置选项，用于设置客户端的 cookies 相关参数
 * @returns 返回一个新的 amagi 客户端实例
 */
function CreateAmagiApp (this: any, options: CookieOptions = {}): ReturnType<typeof createAmagiClient> {
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

/** After instantiation, it can interact with the specified platform API to quickly obtain data. */
export const CreateApp = CreateAmagiApp as AmagiConstructor

/** After instantiation, it can interact with the specified platform API to quickly obtain data. */
const amagi = CreateApp

export { CreateApp as Client }
export default amagi