import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getBilibiliData, getDouyinData, getKuaishouData, getXiaohongshuData } from 'amagi/model/DataFetchers'
import {
  bilibiliUtils,
  createBilibiliRoutes,
  createDouyinRoutes,
  createKuaishouRoutes,
  createXiaohongshuRoutes,
  douyinUtils,
  kuaishouUtils
} from 'amagi/platform'

// v6 新增导出
import { amagiEvents } from './model/events'
import {
  bilibiliFetcher,
  createBoundBilibiliFetcher,
  createBoundDouyinFetcher,
  createBoundKuaishouFetcher,
  createBoundXiaohongshuFetcher,
  douyinFetcher,
  kuaishouFetcher,
  xiaohongshuFetcher
} from './model/fetchers'
import { xiaohongshuUtils } from './platform/xiaohongshu'
import { createAmagiClient, Options } from './server'

// 版本号会在构建时被替换
declare const __VERSION__: string

/**
 * 获取版本号
 * 构建后使用 __VERSION__，开发环境从 package.json 读取
 */
const getVersion = (): string => {
  if (typeof __VERSION__ !== 'undefined') {
    return __VERSION__
  }
  // 开发环境：从 package.json 读取版本号
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const require = createRequire(import.meta.url)
    const pkg = require(resolve(__dirname, '../package.json'))
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

const VERSION = getVersion()

export { getBilibiliData, getDouyinData, getKuaishouData } from './model/DataFetchers'
export * from './utils/errors'
export * from './validation'
export * from 'amagi/model'
export * from 'amagi/platform'
export * from 'amagi/server'
export * from 'amagi/types'

// v6 新增导出 - 事件系统
export type {
  AmagiEventMap,
  AmagiEventType,
  ApiErrorEventData,
  ApiSuccessEventData,
  HttpRequestEventData,
  HttpResponseEventData,
  LogEventData,
  NetworkErrorEventData,
  NetworkRetryEventData
} from './model/events'
export { amagiEvents } from './model/events'

// v6 新增导出 - 英文方法名 fetcher
export { bilibiliFetcher, douyinFetcher, kuaishouFetcher, xiaohongshuFetcher } from './model/fetchers'
export {
  createBoundBilibiliFetcher,
  createBoundDouyinFetcher,
  createBoundKuaishouFetcher,
  createBoundXiaohongshuFetcher
} from './model/fetchers'
export type { BilibiliFetcher, BoundBilibiliFetcher, IBilibiliFetcher, IBoundBilibiliFetcher } from './model/fetchers/bilibili'
export type { BoundDouyinFetcher, DouyinFetcher, IBoundDouyinFetcher, IDouyinFetcher } from './model/fetchers/douyin'
export type { BoundKuaishouFetcher, IBoundKuaishouFetcher, IKuaishouFetcher, KuaishouFetcher } from './model/fetchers/kuaishou'
export type { BoundXiaohongshuFetcher, IBoundXiaohongshuFetcher, IXiaohongshuFetcher, XiaohongshuFetcher } from './model/fetchers/xiaohongshu'

// v6 新增导出 - API 规范
export type {
  ApiEndpoint,
  BilibiliMethodKey,
  BilibiliMethodValue,
  DouyinMethodKey,
  DouyinMethodValue,
  HttpMethod,
  KuaishouMethodKey,
  KuaishouMethodValue,
  Platform,
  XiaohongshuMethodKey,
  XiaohongshuMethodValue
} from './types/api-spec'
export {
  BilibiliApiRoutes,
  BilibiliMethodMapping,
  DouyinApiRoutes,
  DouyinMethodMapping,
  getApiRoute,
  getEnglishMethodName,
  KuaishouApiRoutes,
  KuaishouMethodMapping,
  XiaohongshuApiRoutes,
  XiaohongshuMethodMapping
} from './types/api-spec'

/**
 * @deprecated 请使用 createAmagiClient 替代
 */
export const amagiClient: typeof createAmagiClient = createAmagiClient

/** amagi 的构造函数类型 */
type AmagiConstructor = {
  new(options?: Options): ReturnType<typeof createAmagiClient>
  (options?: Options): ReturnType<typeof createAmagiClient>
  /** 当前版本号 */
  readonly version: string
  /** 抖音相关功能模块 (工具集) */
  douyin: typeof douyinUtils
  /** B站相关功能模块 (工具集) */
  bilibili: typeof bilibiliUtils
  /** 快手相关功能模块 (工具集) */
  kuaishou: typeof kuaishouUtils
  /** 小红书相关功能模块 (工具集) */
  xiaohongshu: typeof xiaohongshuUtils
  /**
   * @deprecated v6 已废弃，请使用 douyinFetcher 替代
   * @throws {DeprecatedApiError} 调用时抛出废弃错误
   */
  getDouyinData: (...args: any[]) => never
  /**
   * @deprecated v6 已废弃，请使用 bilibiliFetcher 替代
   * @throws {DeprecatedApiError} 调用时抛出废弃错误
   */
  getBilibiliData: (...args: any[]) => never
  /**
   * @deprecated v6 已废弃，请使用 kuaishouFetcher 替代
   * @throws {DeprecatedApiError} 调用时抛出废弃错误
   */
  getKuaishouData: (...args: any[]) => never
  /**
   * @deprecated v6 已废弃，请使用 xiaohongshuFetcher 替代
   * @throws {DeprecatedApiError} 调用时抛出废弃错误
   */
  getXiaohongshuData: (...args: any[]) => never

  // ========== v6 新增静态 API ==========
  /** 事件系统 */
  events: typeof amagiEvents
  /**
   * 注册事件监听器
   * @param event - 事件名称
   * @param listener - 事件处理函数
   */
  on: typeof amagiEvents.on
  /**
   * 注册一次性事件监听器
   * @param event - 事件名称
   * @param listener - 事件处理函数 (只触发一次)
   */
  once: typeof amagiEvents.once
  /** B站数据获取器 (需要传递 cookie) */
  bilibiliFetcher: typeof bilibiliFetcher
  /** 抖音数据获取器 (需要传递 cookie) */
  douyinFetcher: typeof douyinFetcher
  /** 快手数据获取器 (需要传递 cookie) */
  kuaishouFetcher: typeof kuaishouFetcher
  /** 小红书数据获取器 (需要传递 cookie) */
  xiaohongshuFetcher: typeof xiaohongshuFetcher
  /** 创建绑定 cookie 的 B站 fetcher */
  createBoundBilibiliFetcher: typeof createBoundBilibiliFetcher
  /** 创建绑定 cookie 的抖音 fetcher */
  createBoundDouyinFetcher: typeof createBoundDouyinFetcher
  /** 创建绑定 cookie 的快手 fetcher */
  createBoundKuaishouFetcher: typeof createBoundKuaishouFetcher
  /** 创建绑定 cookie 的小红书 fetcher */
  createBoundXiaohongshuFetcher: typeof createBoundXiaohongshuFetcher
}

/**
 * 创建一个新的 amagi 客户端实例
 * 用于创建和初始化一个新的 amagi 客户端实例，支持通过 new 关键字或函数调用方式使用
 * @param options - cookies 配置选项，用于设置客户端的 cookies 相关参数
 * @returns 返回一个新的 amagi 客户端实例
 */
function CreateAmagiApp (this: any, options: Options = {}): ReturnType<typeof createAmagiClient> {
  // 是否通过 new 关键字调用
  if (!(this instanceof CreateAmagiApp)) {
    return createAmagiClient(options)
  }

  return createAmagiClient(options)
}

// 添加静态属性和方法
Object.defineProperty(CreateAmagiApp, 'version', {
  value: VERSION,
  writable: false,
  enumerable: true,
  configurable: false
})

CreateAmagiApp.douyin = douyinUtils
CreateAmagiApp.bilibili = bilibiliUtils
CreateAmagiApp.kuaishou = kuaishouUtils
CreateAmagiApp.xiaohongshu = xiaohongshuUtils

CreateAmagiApp.getDouyinData = getDouyinData
CreateAmagiApp.getBilibiliData = getBilibiliData
CreateAmagiApp.getKuaishouData = getKuaishouData
CreateAmagiApp.getXiaohongshuData = getXiaohongshuData

// v6 新增静态属性
CreateAmagiApp.events = amagiEvents
CreateAmagiApp.on = amagiEvents.on.bind(amagiEvents)
CreateAmagiApp.once = amagiEvents.once.bind(amagiEvents)
CreateAmagiApp.bilibiliFetcher = bilibiliFetcher
CreateAmagiApp.douyinFetcher = douyinFetcher
CreateAmagiApp.kuaishouFetcher = kuaishouFetcher
CreateAmagiApp.xiaohongshuFetcher = xiaohongshuFetcher
CreateAmagiApp.createBoundBilibiliFetcher = createBoundBilibiliFetcher
CreateAmagiApp.createBoundDouyinFetcher = createBoundDouyinFetcher
CreateAmagiApp.createBoundKuaishouFetcher = createBoundKuaishouFetcher
CreateAmagiApp.createBoundXiaohongshuFetcher = createBoundXiaohongshuFetcher

/** After instantiation, it can interact with the specified platform API to quickly obtain data. */
export const CreateApp = CreateAmagiApp as AmagiConstructor

/** After instantiation, it can interact with the specified platform API to quickly obtain data. */
const Client: typeof CreateApp = CreateApp
const amagi: typeof Client = Client

/*!
 * @ikenxuan/amagi
 * Copyright(c) 2023 ikenxuan
 * GPL-3.0 Licensed
 */
export { amagi, Client as default }

export {
  createBilibiliRoutes as registerBilibiliRoutes,
  createDouyinRoutes as registerDouyinRoutes,
  createKuaishouRoutes as registerKuaishouRoutes,
  createXiaohongshuRoutes as registerXiaohongshuRoutes
}
