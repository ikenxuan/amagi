import express from 'express'

import type { Platform } from '../contracts/platform'
import type { RequestConfig } from '../contracts/request'
import type { LoginNamespace, QrcodeLoginStrategy, SessionCtx } from '../contracts/session'
// 下面四个 `xxxApiUrls as xxxV7ApiUrls` 别名引的是 **v7 那份** URL 构造器
// （`platforms/<平台>/api.ts`），挂在 `client.<平台>.apiUrls` 上。后缀别名不是洁癖：
// `...bilibiliUtils` 那几个 utils 里已经摊进来一个**同名但含义相反**的 `xxxApiUrls`
// （`legacy/<平台>/API.ts` 的 v6 实现）。不带别名的话，同一个文件里会有两个同名绑定，
// `apiUrls: douyinUtils.douyinApiUrls` 这种写法能一行编译通过、却把 v6 那份当成 v7 挂上去。
import { bilibiliApiUrls as bilibiliV7ApiUrls } from '../platforms/bilibili/api'
import { bilibiliRegistry } from '../platforms/bilibili/endpoints'
import { bilibiliQrcodeStrategy } from '../platforms/bilibili/session/qrcode'
import { bilibiliUtils, createBilibiliRoutes } from '../platforms/bilibili/utils'
import { douyinApiUrls as douyinV7ApiUrls } from '../platforms/douyin/api'
import { douyinRegistry } from '../platforms/douyin/endpoints'
import { douyinQrcodeStrategy } from '../platforms/douyin/session/qrcode'
import { douyinUtils, createDouyinRoutes } from '../platforms/douyin/utils'
import { kuaishouApiUrls as kuaishouV7ApiUrls } from '../platforms/kuaishou/api'
import { kuaishouRegistry } from '../platforms/kuaishou/endpoints'
import { kuaishouUtils, createKuaishouRoutes } from '../platforms/kuaishou/utils'
import { xiaohongshuApiUrls as xiaohongshuV7ApiUrls } from '../platforms/xiaohongshu/api'
import { xiaohongshuRegistry } from '../platforms/xiaohongshu/endpoints'
import { xiaohongshuUtils, createXiaohongshuRoutes } from '../platforms/xiaohongshu/utils'
import { createEventBus } from '../runtime/events'
import { createLoginSession } from '../runtime/session'
// 门面的 startServer 是服务端的活儿，本来就要够到 server 层：`platforms/<平台>/routes.ts` 的四个
// 路由工厂内部已经在引 `server/routes.ts`。自托管规范这一项同理直接引
// `server/auth.ts` —— 挂载函数只有一份，不存在写第二遍
import { GENERATED_REFERENCE_URL, mountOpenApiSpec } from '../server/auth'
import type { ClientCtx } from './fetcher'
import { createFetcherFromRegistry } from './fetcher'
import { createRequestModule } from './request'
import { makeClientCtx, makeSessionHttp } from './runtime'

/**
 * 走 registry 派生 fetcher（`AmagiResult` 信封）的平台开关。
 *
 * 一个平台是一个原子单位：这里打开的平台，其 fetcher 方法集合由
 * `platforms/<p>/endpoints` 的注册表派生。四个平台目前全部打开。
 */
export const MIGRATED: Partial<Record<Platform, true>> = {
  xiaohongshu: true,
  kuaishou: true,
  douyin: true,
  bilibili: true
}

/** 客户端构造选项 */
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
   * `debug` 一个开关同时管 `error.raw` 与 `meta.trace` 两样：两者都只服务排障，
   * 分成两个名字等于让人多记一个。要**不受开关影响**地逐条观测请求，监听
   * `http:request` / `http:response` 事件 —— 它们的负载恒带 `trace`。
   *
   * 原始响应可能很大、也可能带敏感字段，`trace` 里的 URL 含签名参数，
   * 别在生产里无条件打印。只作用于 client 实例上的 fetcher：静态 fetcher
   * （`amagi.douyinFetcher.*`）与 HTTP 服务的平台路由没有这个开关。
   */
  debug?: boolean
}

/**
 * 门面版 `startServer` 的第二参。
 *
 * 只透出 `openapi` 一项；`port` / `host` / `token` / `routers` 这些全选项留给
 * `server/auth.ts` 的选项版 `startServer`。
 */
export interface FacadeServerOptions {
  /**
   * 自托管 OpenAPI 规范。默认 `false`（不挂）。
   *
   * 传 `true` 后：`GET /openapi.json` 返回从端点注册表**现算**的规范（与调用方
   * 装的这个版本同源，不会像外挂文档那样脱节）；`GET /docs` 不再 301 到 apifox，
   * 改 302 跳文档站的生成式端点参考。
   */
  openapi?: boolean
  /**
   * 自定义监听实现，替代真实的 `app.listen`。
   *
   * `startServer` 不回传 server 句柄，所以需要自己控制端口、时机或关闭服务时
   * 用它。注入后 `log:mark` 不发（那句话在默认实现的回调里）。
   * @param app - Express 应用
   * @param port - 端口
   * @param host - 监听地址
   */
  listen?: (app: express.Application, port: number, host: string) => void
}

/**
 * 创建 Amagi 客户端（门面）。
 *
 * 顶层 `startServer / events / on / once` + 四个平台模块
 * （`{ ...utils, fetcher }`）：fetcher 方法集合由各平台的端点注册表派生，
 * 统一返回 `AmagiResult` 信封。
 *
 * `startServer` 挂的平台路由同样从 registry 派生（token / host 选项见
 * `server/auth.ts`）。第二参 `{ openapi }` 不传时保持默认行为。
 */
export const createClient = (options: ClientOptions = {}) => {
  const cookies = options.cookies ?? {}
  const requestConfig = options.request ?? {}

  // 事件总线（实例级）。必须先于 fetcher 造出来 —— 它要往下传给
  // 每个平台的运行期上下文，否则 `client.events` 收不到任何东西
  const bus = createEventBus('client')

  // —— 各平台的运行期上下文 ——
  // 共享装配见 client/runtime.ts（PLATFORM_RUNTIME + makeClientCtx）
  const makeCtx = (platform: Platform, cookie: string): ClientCtx =>
    makeClientCtx(platform, cookie, requestConfig, 'client-1', { bus, ...(options.debug === undefined ? {} : { debug: options.debug }) })

  // —— 平台模块：四个平台全部 registry 派生 ——
  // ctx 造一次、fetcher 与 request 共用。理由**不是**缓存：B站那个 30 分钟的 /nav
  // 缓存跟着 `PLATFORM_RUNTIME` 里模块加载时造的那一个 WbiSigner 实例走，本来就是
  // 进程级的，ctx 造几份都不影响它。真正的理由是「一个平台一份 HttpClient +
  // TraceCollector + 装配点」与「这个平台的身份（cookie / requestConfig / debug / bus）
  // 只在一个地方被解析」—— 各造一份会多出成对的传输层与追踪器，事件与 trace 也跟着分叉。
  const douyinCtx = makeCtx('douyin', cookies.douyin ?? '')
  const douyinFetcher = createFetcherFromRegistry('douyin', douyinRegistry, douyinCtx)
  const douyinRequest = createRequestModule('douyin', douyinCtx)

  const bilibiliCtx = makeCtx('bilibili', cookies.bilibili ?? '')
  const bilibiliFetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, bilibiliCtx)
  const bilibiliRequest = createRequestModule('bilibili', bilibiliCtx)

  const kuaishouCtx = makeCtx('kuaishou', cookies.kuaishou ?? '')
  const kuaishouFetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, kuaishouCtx)
  const kuaishouRequest = createRequestModule('kuaishou', kuaishouCtx)

  const xiaohongshuCtx = makeCtx('xiaohongshu', cookies.xiaohongshu ?? '')
  const xiaohongshuFetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, xiaohongshuCtx)
  const xiaohongshuRequest = createRequestModule('xiaohongshu', xiaohongshuCtx)

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
     * 启动本地 HTTP 服务（平台路由从 registry 派生）。
     * @param port - 监听端口，默认 4567
     * @param serverOptions - 可选，见 `FacadeServerOptions`
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
      // 自托管规范：与选项版（`server/auth.ts`）共用同一个 mountOpenApiSpec，
      // 同一件事不写第二遍
      if (serverOptions.openapi === true) {
        mountOpenApiSpec(app)
      }
      app.use('/api/douyin', createDouyinRoutes(cookies.douyin ?? '', requestConfig))
      app.use('/api/bilibili', createBilibiliRoutes(cookies.bilibili ?? '', requestConfig))
      app.use('/api/kuaishou', createKuaishouRoutes(cookies.kuaishou ?? '', requestConfig))
      app.use('/api/xiaohongshu', createXiaohongshuRoutes(cookies.xiaohongshu ?? '', requestConfig))
      // 这里不带 chalk：颜色是展示层的事，事件负载只给文本，监听器自己决定怎么印
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
    douyin: {
      ...douyinUtils, // 这里的 douyinApiUrls 是 v6 那份，保持不动
      apiUrls: douyinV7ApiUrls,
      fetcher: douyinFetcher,
      request: douyinRequest,
      login: makeLogin('douyin', douyinQrcodeStrategy, cookies.douyin ?? '')
    },
    bilibili: {
      ...bilibiliUtils, // 这里的 bilibiliApiUrls 是 v6 那份，保持不动
      apiUrls: bilibiliV7ApiUrls,
      fetcher: bilibiliFetcher,
      request: bilibiliRequest,
      login: makeLogin('bilibili', bilibiliQrcodeStrategy, cookies.bilibili ?? '')
    },
    kuaishou: {
      ...kuaishouUtils, // 这里的 kuaishouApiUrls 是 v6 那份，保持不动
      apiUrls: kuaishouV7ApiUrls,
      fetcher: kuaishouFetcher,
      request: kuaishouRequest
    },
    xiaohongshu: {
      ...xiaohongshuUtils, // 这里的 xiaohongshuApiUrls 是 v6 那份，保持不动
      apiUrls: xiaohongshuV7ApiUrls,
      fetcher: xiaohongshuFetcher,
      request: xiaohongshuRequest
    }
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

/**
 * 平台模块形状：douyin / bilibili 带 login，其余平台没有。
 *
 * `apiUrls` 与摊进来的 v6 `xxxApiUrls` **同时存在**：前者是 v7 那份（端点在用），
 * 后者是 v6 那份（公开面原样保留）。两个键并存是决议 4，不是漏改名。
 */
type PlatformModuleShape<P extends Platform> = P extends 'douyin' | 'bilibili'
  ? { apiUrls: unknown; fetcher: unknown; request: unknown; login: LoginNamespace }
  : { apiUrls: unknown; fetcher: unknown; request: unknown }
