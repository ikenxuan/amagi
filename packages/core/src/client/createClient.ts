import express from 'express'

import { bilibiliUtils, createBilibiliRoutes, createDouyinRoutes, createKuaishouRoutes, douyinUtils, kuaishouUtils } from '../platform'
import { createXiaohongshuRoutes, xiaohongshuUtils } from '../platform/xiaohongshu'
import { createEventBus } from '../runtime/events'
import { createLoginSession } from '../runtime/session'
import { bilibiliQrcodeStrategy } from '../platforms/bilibili/session/qrcode'
import { douyinQrcodeStrategy } from '../platforms/douyin/session/qrcode'
import type { LoginNamespace, QrcodeLoginStrategy, SessionCtx } from '../contracts/session'
import type { Platform } from '../contracts/platform'
import type { RequestConfig } from '../contracts/request'
import type { ClientCtx } from './fetcher'
import { createFetcherFromRegistry } from './fetcher'
import { makeClientCtx, makeSessionHttp } from './runtime'
import { xiaohongshuRegistry } from '../platforms/xiaohongshu/endpoints'
import { kuaishouRegistry } from '../platforms/kuaishou/endpoints'
import { douyinRegistry } from '../platforms/douyin/endpoints'
import { bilibiliRegistry } from '../platforms/bilibili/endpoints'
// 门面的 startServer 是服务端的活儿，本来就要够到 server 层：`../platform` 的四个
// 路由工厂内部已经在引 `server/routes.ts`。自托管规范这一项同理直接引
// `server/auth.ts`，与 v6 门面（`server/index.ts:19`）引的是同一个模块 ——
// 挂载函数只有一份，不存在写第二遍
import { GENERATED_REFERENCE_URL, mountOpenApiSpec } from '../server/auth'

/**
 * 已迁移到 v7 新管线的平台。
 *
 * 一个平台是一个原子单位：MIGRATED 里打开的平台走 registry 派生 fetcher
 * （AmagiResult 信封）。阶段 4.3 四平台全部迁移完成，v6 过渡路径
 * （`createBoundXxxFetcher` + `toV7Envelope`）随之删除。
 */
export const MIGRATED: Partial<Record<Platform, true>> = {
  xiaohongshu: true,
  kuaishou: true,
  douyin: true,
  bilibili: true
}

/** 客户端构造选项，形状与 v6 `Options` 一致（`debug` 是 v7 新增） */
export interface ClientOptions {
  /** Cookie 配置 */
  cookies?: {
    douyin?: string
    bilibili?: string
    kuaishou?: string
    xiaohongshu?: string
  }
  /** 请求配置 */
  request?: RequestConfig
  /**
   * 排障开关。打开后两样东西同时出现：失败信封的 `error.raw` 带平台原始响应体，
   * 每个信封的 `meta.trace` 带这次调用发出的每一条底层请求（URL / 方法 /
   * 状态码 / 耗时 / 发出原因）。用于排查协议变更、风控页、业务码含义不明，
   * 以及「这一次调用到底打了几个请求」。
   *
   * 默认 `false`，此时失败信封上**没有** `raw` 这个键、`meta` 上也**没有**
   * `trace` 这个键（不是 `undefined` 占位）。`meta.attempts` 与本开关无关，
   * 一直是准的 —— 计数始终发生，只有明细受开关控制。
   *
   * 一个开关管两样是刻意的：两者都只服务排障，分成 `debug` 与 `trace` 两个名字
   * 等于让人多记一个，而漏开哪一个都是「排查时手上只有一半信息」。要**不受开关
   * 影响**地逐条观测请求，监听 `http:request` / `http:response` 事件 ——
   * 它们的负载恒带 `trace`。
   *
   * 原始响应可能很大、也可能带敏感字段，`trace` 里的 URL 含签名参数，
   * 别在生产里无条件打印。只作用于 client 实例上的 fetcher：静态 fetcher
   * （`amagi.douyinFetcher.*`）与 HTTP 服务的平台路由没有这个开关。
   */
  debug?: boolean
}

/**
 * 门面版 `startServer` 的第二参，与 v6 门面（`server/index.ts`）同款。
 *
 * 全选项版（`port` / `host` / `token` / `routers`）在 `server/auth.ts`，门面只
 * 透出 `openapi` 一项 —— 再扩要先定公开面口径（PRD「推后的事」里有一条）。
 */
export interface FacadeServerOptions {
  /**
   * 自托管 OpenAPI 规范。默认 `false` —— 不挂，行为与 v6 一字不变。
   *
   * 传 `true` 后：`GET /openapi.json` 返回从端点注册表**现算**的规范（与调用方
   * 装的这个版本同源，不会像外挂文档那样脱节）；`GET /docs` 不再 301 到 apifox，
   * 改 302 跳文档站的生成式端点参考。
   */
  openapi?: boolean
  /**
   * 测试注入用：替代真实的 `app.listen`，做法与选项版 `startServer` 的同名槽位一致。
   *
   * 门面自己 listen 且不回传 server 句柄，用例没法关掉它 —— 注入后先拿到 app，
   * 再自己起随机端口，既不占 4567 也不留悬空 handle。注入后 `log:mark` 不发
   * （那句话在默认 listen 的回调里）。
   * @param app - Express 应用
   * @param port - 端口
   * @param host - 监听地址（门面固定 `'::'`，与 v6 一致）
   */
  listen?: (app: express.Application, port: number, host: string) => void
}

/**
 * 创建 Amagi 客户端（v7 门面）。
 *
 * 形状与 v6 `createAmagiClient` 一致：顶层 `startServer / events / on / once` +
 * 四个平台模块（`{ ...utils, fetcher }`），fetcher 全部是 registry 派生的
 * v7 fetcher（四平台已全部迁移，过渡期 `toV7Envelope` 已删）。
 *
 * `startServer` 挂的平台路由在阶段 6 起由各平台 routes.ts 从 registry
 * 派生（token / host 选项见 `server/auth.ts`，默认行为 v8 才改）。第二参
 * `{ openapi }`（阶段 9.1）与 v6 门面同款：不传时行为与 v6 一字不变。
 */
export const createClient = (options: ClientOptions = {}) => {
  const cookies = options.cookies ?? {}
  const requestConfig = options.request ?? {}

  // 事件总线（实例级，v7 设计）。必须先于 fetcher 造出来 —— 它要往下传给
  // 每个平台的运行期上下文，否则 `client.events` 收不到任何东西（BUG-4）
  const bus = createEventBus('client')

  // —— 已迁移平台的运行期上下文（v7 管线） ——
  // 共享装配见 client/runtime.ts（PLATFORM_RUNTIME + makeClientCtx）
  const makeCtx = (platform: Platform, cookie: string): ClientCtx =>
    makeClientCtx(platform, cookie, requestConfig, 'client-1', { bus, ...(options.debug === undefined ? {} : { debug: options.debug }) })

  // —— 平台模块：四平台全部 registry 派生（MIGRATED 已全开） ——
  const douyinFetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx('douyin', cookies.douyin ?? ''))
  const bilibiliFetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx('bilibili', cookies.bilibili ?? ''))
  const kuaishouFetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx('kuaishou', cookies.kuaishou ?? ''))
  const xiaohongshuFetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx('xiaohongshu', cookies.xiaohongshu ?? ''))

  /**
   * 造一个带可用 send 的会话初始上下文（引擎用它打真实请求）。
   * 单次调用的 requestConfig 会覆盖实例级的。
   */
  const makeSessionCtx = (platform: Platform, cookie: string, perCall?: RequestConfig): SessionCtx => {
    const { http } = makeSessionHttp(platform, cookie, { ...requestConfig, ...perCall })
    return {
      platform,
      cookie,
      requestConfig: { ...requestConfig, ...perCall },
      send: (spec, reason) => http.send(spec, reason),
      data: {}
    }
  }

  /** 会话命名空间：qrcode() 新建，resume() 从 opaque string 恢复 */
  const makeLogin = (platform: Platform, strategy: QrcodeLoginStrategy, cookie: string): LoginNamespace => ({
    qrcode: (perCall) =>
      createLoginSession(strategy, {
        bus,
        initialCtx: makeSessionCtx(platform, cookie, perCall)
      }),
    resume: (blob) => {
      const restored = strategy.deserialize(blob)
      return createLoginSession(strategy, {
        bus,
        initialCtx: { ...restored, send: makeSessionCtx(platform, cookie).send }
      })
    }
  })

  return {
    /**
     * 启动本地 HTTP 服务（阶段 6 起挂 registry 派生的平台路由）。
     * @param port - 监听端口，默认 4567
     * @param serverOptions - 可选，见 `FacadeServerOptions`；不传时行为与 v6 一字不变
     * @returns Express 应用实例
     */
    startServer: (port = 4567, serverOptions: FacadeServerOptions = {}): express.Application => {
      const app = express()
      app.use(express.json())
      app.use(express.urlencoded({ extended: true }))
      app.get('/', (_req, res) => res.redirect(301, 'https://amagi.apifox.cn'))
      // 开了 openapi 时 /docs 指向生成的端点参考。302 而非 301：301 会被浏览器
      // 永久缓存，先访问过未开 openapi 的服务就再也跳不过来了
      app.get('/docs', (_req, res) =>
        serverOptions.openapi === true ? res.redirect(302, GENERATED_REFERENCE_URL) : res.redirect(301, 'https://amagi.apifox.cn')
      )
      // 自托管规范：与 v6 门面（`server/index.ts`）、选项版（`server/auth.ts`）
      // 共用同一个 mountOpenApiSpec，同一件事不写第二遍
      if (serverOptions.openapi === true) {
        mountOpenApiSpec(app)
      }
      app.use('/api/douyin', createDouyinRoutes(cookies.douyin ?? '', requestConfig))
      app.use('/api/bilibili', createBilibiliRoutes(cookies.bilibili ?? '', requestConfig))
      app.use('/api/kuaishou', createKuaishouRoutes(cookies.kuaishou ?? '', requestConfig))
      app.use('/api/xiaohongshu', createXiaohongshuRoutes(cookies.xiaohongshu ?? '', requestConfig))
      // v6 在同一处发 log:mark（`server/index.ts:109`）。这里不带 chalk：
      // 颜色是展示层的事，事件负载只给文本，监听器自己决定怎么印
      const doListen =
        serverOptions.listen ??
        ((target, listenPort, listenHost) =>
          target.listen(listenPort, listenHost, () =>
            bus.emit('log:mark', {
              level: 'mark',
              message: `Amagi server listening on http://localhost:${listenPort} API docs: https://amagi.apifox.cn`
            })
          ))
      doListen(app, port, '::')
      return app
    },
    /** 事件系统（实例级总线） */
    events: bus,
    on: bus.on.bind(bus),
    once: bus.once.bind(bus),
    douyin: { ...douyinUtils, fetcher: douyinFetcher, login: makeLogin('douyin', douyinQrcodeStrategy, cookies.douyin ?? '') },
    bilibili: { ...bilibiliUtils, fetcher: bilibiliFetcher, login: makeLogin('bilibili', bilibiliQrcodeStrategy, cookies.bilibili ?? '') },
    kuaishou: { ...kuaishouUtils, fetcher: kuaishouFetcher },
    xiaohongshu: { ...xiaohongshuUtils, fetcher: xiaohongshuFetcher }
  } satisfies ClientShape
}

/**
 * client 返回值的形状。
 *
 * 用条件类型表达「只有支持登录的平台才有 `login`」：
 * `client.kuaishou.login` 是**编译错误**，不是运行时 `undefined.qrcode()`
 * （05-session-and-polling.md 的类型约束落点）。
 */
type ClientShape = {
  startServer: (port?: number, serverOptions?: FacadeServerOptions) => express.Application
  events: unknown
  on: (...args: never[]) => unknown
  once: (...args: never[]) => unknown
} & {
  [P in Platform]: PlatformModuleShape<P>
}

/** 平台模块形状：douyin / bilibili 带 login，其余平台没有 */
type PlatformModuleShape<P extends Platform> = P extends 'douyin' | 'bilibili'
  ? { fetcher: unknown; login: LoginNamespace }
  : { fetcher: unknown }
