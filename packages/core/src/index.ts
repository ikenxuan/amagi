import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { bilibiliUtils, douyinUtils, kuaishouUtils } from './platform'

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

// 阶段 9.1（修 BUG-1）：默认导出的门面从 v6 换成 v7。`./server` 的
// `createAmagiClient` 现在只是 `createClient` 的 @deprecated 别名，这里直接引
// v7 门面本体，免得默认导出多绕一层别名
import type { ClientOptions } from './client/createClient'
import { createClient } from './client/createClient'

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

export * from './utils/errors'
// 阶段 6.2：validation 不再整体 export *（41 个 *ParamsSchema / 4 个
// *ValidationSchemas / 4 个 *MethodRoutes 随 06-migration 删除清单摘除）
// 阶段门 6：validateXxxParams 改 v7 形状（返回 ValidateOutcome 不抛），
// assertValidXxxParams 保留 v6 抛出行为；v6 信封与 Result 族类型只在
// validation/legacy.ts（内部模块，不进顶层），顶层信封是 AmagiResult。
export {
  assertValidBilibiliParams,
  assertValidDouyinParams,
  assertValidKuaishouParams,
  assertValidXiaohongshuParams,
  createErrorResponse,
  createSuccessResponse,
  validateBilibiliParams,
  validateDouyinParams,
  validateKuaishouParams,
  validateXiaohongshuParams
} from './validation'
export * from './model'
// v6 低层传输入口（阶段 6 迁到 transport/legacy.ts，@deprecated，行为保持 v6）
export { fetchData, fetchResponse, isNetworkErrorResult } from './transport/legacy'
export * from './platform'
export * from './server'
export * from './types'

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

// 阶段 9.2：信封读法（修 BUG-2）—— 三种读法的官方工具进顶层。
// `?: undefined` 解决「不收窄直接读 data」，守卫解决数组回调（filter 只认类型谓词），
// unwrap 解决「想让失败抛出」。信封类型一并进顶层，否则调用方写不出自己的签名。
export type { AmagiError } from './contracts/error'
export type { AmagiFailure, AmagiResult, AmagiSuccess } from './contracts/result'
export { AmagiThrownError, isFailure, isSuccess, unwrap } from './contracts/result'

// 阶段 9.1：v7 门面进顶层（修 BUG-1 的另一半）。在此之前 `createClient` 只住在
// `client/createClient.ts`，而 `package.json` 的 `exports` 不开子路径 —— 装包的人
// 根本够不到它，v7 的整条新管线对外等于不存在（仓库内也只有测试 import 它，
// 所以它连 dpdm 的主图都不在）。
//
// `ClientOptions` / `FacadeServerOptions` 是它两个入参的类型，跟着进顶层：不导出
// 的话调用方写不出自己的包装函数签名（`FacadeServerOptions` 已经出现在
// `startServer` 的公开签名里，不导出就是公开面上一个够不到的名字）。两者都是
// `export type`，不进运行时公开面。
export { createClient } from './client/createClient'
export type { ClientOptions, FacadeServerOptions } from './client/createClient'

// 实例总线的事件表。`AmagiBusEventMap` 一个名字就够 —— 15 个事件名背后的 11 个
// 负载 interface 一律用 `AmagiBusEventMap['api:success']` 这样的索引访问取，
// 不必逐个再占一个公开名（v6 那边 `AmagiEventMap` 与 9 个 `*EventData` 并列导出
// 是冗余，不照抄）。
// `EventBus` 只导出**类型**：它是 `client.events` 的类型，调用方要能写下来；
// 而没有任何 API 收外部传入的总线（`ClientOptions` 里没有 `bus`），把构造器
// `createEventBus` 也导出等于凭空多一个够不到落点的运行时公开名。
export type { AmagiBusEventMap, AmagiBusEventName, EventBus } from './runtime/events'
export { AMAGI_BUS_EVENT_NAMES } from './runtime/events'

/** amagi 的构造函数类型 */
type AmagiConstructor = {
  new (options?: ClientOptions): ReturnType<typeof createClient>
  (options?: ClientOptions): ReturnType<typeof createClient>
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
 *
 * 用于创建和初始化一个新的 amagi 客户端实例，支持通过 new 关键字或函数调用方式使用。
 *
 * 阶段 9.1（修 BUG-1）起返回的是 **v7 门面**（`client/createClient.ts`）：
 * `douyin` / `bilibili` 上多了 `login` 命名空间（扫码登录会话），`events`
 * 是**实例级**总线而不再是全局单例 `amagiEvents`（两个实例的 `events` 不是
 * 同一个对象），负载都带 `meta`。名字与顶层键一个都没变，读法差异逐条见
 * docs/v7/06-migration.md 的事件小节。构造函数上的静态面
 * （`amagi.events` / `amagi.on` / `amagi.douyinFetcher` …）仍是 v6 那一套，
 * 不受本次切换影响。
 * @param options - 客户端配置选项（cookies / request / debug）
 * @returns 返回一个新的 amagi 客户端实例
 */
function CreateAmagiApp(this: any, options: ClientOptions = {}): ReturnType<typeof createClient> {
  // 是否通过 new 关键字调用
  if (!(this instanceof CreateAmagiApp)) {
    return createClient(options)
  }

  return createClient(options)
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

