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
}

/**
 * 创建一个新的 amagi 客户端实例
 * @param options - cookies 配置选项
 * @returns 返回一个新的 amagi 客户端实例
 */
const createAmagiClient = (options: cookiesOptions): amagiClient => {
  return new amagiClient(options)
}

/** After instantiation, it can interact with the specified platform API to quickly obtain data. */
export const amagi = Object.assign(
  createAmagiClient as AmagiConstructor,
  {
    /** 抖音相关功能模块 (工具集) */
    douyin: douyinUtils,
    /** B站相关功能模块 (工具集) */
    bilibili: bilibiliUtils,
    /** 快手相关功能模块 (工具集) */
    kuaishou: kuaishouUtils
  }
)

/** After instantiation, it can interact with the specified platform API to quickly obtain data. */
const Client = amagi

export { Client as default }