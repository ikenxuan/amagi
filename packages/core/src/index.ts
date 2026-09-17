import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// 默认导出的门面本体。`./server` 的 `createAmagiClient` 只是它的 @deprecated
// 别名，这里直接引本体，默认导出少绕一层
import type { ClientOptions } from './client/createClient'
import { createClient } from './client/createClient'
// 全局单例事件总线
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
import { bilibiliUtils } from './platforms/bilibili/utils'
import { douyinUtils } from './platforms/douyin/utils'
import { kuaishouUtils } from './platforms/kuaishou/utils'
import { xiaohongshuUtils } from './platforms/xiaohongshu/utils'

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
// 参数校验与 v6 信封工具。`validateXxxParams` 返回 `ValidateOutcome`，不抛；
// `assertValidXxxParams` 失败即抛。`createSuccessResponse` / `createErrorResponse`
// 造的是 v6 旧信封，v7 的信封以 `AmagiResult` 为准。
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
// v6 低层传输入口（@deprecated，行为逐字保持 v6）
export { fetchData, fetchResponse, isNetworkErrorResult } from './transport/legacy'
// 四平台的公开工具面与路由工厂。**这里不写 `export * from './platforms'`** ——
// `platforms/` 是实现层，整体 star 出去会把签名器、判定、端点声明这些内部构件
// 一并泄漏到公开面。要公开什么，逐个平台在 `<平台>/utils.ts` 里点名。
export * from './platforms/bilibili/utils'
export * from './platforms/douyin/utils'
export * from './platforms/kuaishou/utils'
export * from './platforms/xiaohongshu/utils'
export * from './server'
export * from './types'

// 生成的响应类型（`@ikenxuan/amagi-response-types`，仓库内私有包）。
//
// 名字带**完整平台名**前缀 + `Response` 后缀（`BilibiliCommentsResponse`），与手写树的
// 短前缀（`BiliEmojiList`，上面那行 `export * from './types'`）不同名 —— 调用处一眼
// 可辨这个类型是生成的还是手写的。
//
// 用法：`import type { BilibiliCommentsResponse } from '@ikenxuan/amagi'`。
export type * from './types/generated'

// 全局单例总线的事件表与负载类型（实例总线用 `AmagiBusEventMap`，见下）
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

// 快手风控：撞到滑块时把地址交给调用方（**只中转不绕过**）。
// judge 只负责把这类响应判成 `risk` / `CAPTCHA_REQUIRED`（JudgeVerdict 只有
// 四个槽位，装不下一个 URL），地址由管线自动填进失败信封的 `error.challenge`
// —— 那一份**不受 `debug` 管**，client / HTTP 路由 / 静态 fetcher 三个入口都有。
// 这里仍导出解析器与两个业务码：自己拿着一份原始响应（抓包、日志）要认风控时用它。
export type { KuaishouCaptchaChallenge } from './platforms/kuaishou/captcha'
export { KUAISHOU_H5_CAPTCHA_RESULT, KUAISHOU_PC_CAPTCHA_RESULT, parseKuaishouCaptcha } from './platforms/kuaishou/captcha'

// 信封读法的官方工具：`?: undefined` 解决「不收窄直接读 data」，守卫解决数组
// 回调（`filter` 只认类型谓词），`unwrap` 解决「想让失败抛出」。信封类型一并
// 进顶层，否则调用方写不出自己的签名。
export type { AmagiError } from './contracts/error'
export type { AmagiFailure, AmagiResult, AmagiSuccess } from './contracts/result'
export { AmagiThrownError, isFailure, isSuccess, unwrap } from './contracts/result'

// 错误契约的成员类型与 meta。`AmagiError` 进了顶层，但它的字段类型没进 ——
// 下游想在自己的类型里写下 `kind` / `code` / `issues`（比如把 v7 的错误字段
// 透到自己的错误页数据结构上）就只能抄字面量联合或退回 `string`。
// `RiskChallenge` 同理：它挂在 `error.challenge` 上，是撞验证码时唯一的出路，
// 不导出的话调用方能读到值却写不出承接它的类型。
// `AmagiMeta` 同理：它挂在每个信封与每条事件负载上，是公开面的一部分。
export type { AmagiErrorCode, ErrorKind, RiskChallenge, ValidationIssue } from './contracts/error'
export type { AmagiMeta, RequestTrace, TraceReason } from './contracts/meta'
export type { Platform } from './contracts/platform'

// 会话（扫码登录）契约。`client.douyin.login` / `client.bilibili.login` 是公开
// API，但在此之前它返回值的类型一个都够不到 —— 调用方能调用却写不出
// `LoginSession` / `LoginState` / `Credential`，只能落到 `any`。
// 全部 `export type`，运行时公开面不变。
export type {
  CaptchaChallenge,
  ChallengeAnswer,
  Credential,
  LoginChallenge,
  LoginNamespace,
  LoginSession,
  LoginState,
  Qrcode,
  QrcodeLoginStrategy,
  SessionCtx,
  SmsChallenge,
  WatchHandlers,
  WatchOptions
} from './contracts/session'

// 门面工厂。`ClientOptions` / `FacadeServerOptions` 是它两个入参的类型，跟着进
// 顶层：不导出的话调用方写不出自己的包装函数签名（`FacadeServerOptions` 已经
// 出现在 `startServer` 的公开签名里，不导出就是公开面上一个够不到的名字）。
// 两者都是 `export type`，不进运行时公开面。
export { createClient } from './client/createClient'
export type { ClientOptions, FacadeServerOptions } from './client/createClient'

// 请求模块的类型。`client.<平台>.request` 是公开 API，调用方要能把它写进自己的
// 签名里（包一层重试、塞进依赖注入容器、写 d.ts 桩）—— 不导出的话这些只能落到 any。
// 全部 `export type`，运行时公开面不变。
export type { AmagiAxiosTrack, AmagiRequest, AmagiRequestConfig, AmagiRequestMethod } from './client/request'

// 实例总线的事件表。`AmagiBusEventMap` 一个名字就够 —— 15 个事件名背后的 11 个
// 负载 interface 一律用 `AmagiBusEventMap['api:success']` 这样的索引访问取，
// 不必逐个再占一个公开名。
// `EventBus` 只导出**类型**：它是 `client.events` 的类型，调用方要能写下来；
// 而没有任何 API 收外部传入的总线，构造器不必进公开面。
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

  // ========== 全局单例静态 API ==========
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
 * 返回 **v7 门面**（{@link createClient}）：`douyin` / `bilibili` 上带 `login`
 * 命名空间（扫码登录会话），`events` 是**实例级**总线（两个实例的 `events` 不是
 * 同一个对象），负载都带 `meta`。构造函数上的静态面（`amagi.events` /
 * `amagi.on` / `amagi.douyinFetcher` …）走的是全局单例，与实例总线不互通。
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

// 全局单例静态属性
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
