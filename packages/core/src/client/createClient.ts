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
import { HttpClient } from '../transport/client'
import { TraceCollector } from '../transport/trace'
import type { ClientCtx } from './fetcher'
import { createFetcherFromRegistry } from './fetcher'
import { makeClientCtx } from './runtime'
import { xiaohongshuRegistry } from '../platforms/xiaohongshu/endpoints'
import { kuaishouRegistry } from '../platforms/kuaishou/endpoints'
import { douyinRegistry } from '../platforms/douyin/endpoints'
import { bilibiliRegistry } from '../platforms/bilibili/endpoints'

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

/** 客户端构造选项，形状与 v6 `Options` 一致 */
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
}

/**
 * 创建 Amagi 客户端（v7 门面）。
 *
 * 形状与 v6 `createAmagiClient` 一致：顶层 `startServer / events / on / once` +
 * 四个平台模块（`{ ...utils, fetcher }`），fetcher 全部是 registry 派生的
 * v7 fetcher（四平台已全部迁移，过渡期 `toV7Envelope` 已删）。
 *
 * `startServer` 保持 v6 行为（挂 v6 平台路由），阶段 6 换成 v7 的
 * `server/routes.ts` + `server/auth.ts`。
 */
export const createClient = (options: ClientOptions = {}) => {
  const cookies = options.cookies ?? {}
  const requestConfig = options.request ?? {}

  // —— 已迁移平台的运行期上下文（v7 管线） ——
  // 共享装配见 client/runtime.ts（PLATFORM_RUNTIME + makeClientCtx）
  const makeCtx = (platform: Platform, cookie: string): ClientCtx => makeClientCtx(platform, cookie, requestConfig, 'client-1')

  // —— 平台模块：四平台全部 registry 派生（MIGRATED 已全开） ——
  const douyinFetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx('douyin', cookies.douyin ?? ''))
  const bilibiliFetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx('bilibili', cookies.bilibili ?? ''))
  const kuaishouFetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx('kuaishou', cookies.kuaishou ?? ''))
  const xiaohongshuFetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx('xiaohongshu', cookies.xiaohongshu ?? ''))

  // 事件总线（实例级，v7 设计）
  const bus = createEventBus('client')

  /**
   * 造一个带可用 send 的会话初始上下文（引擎用它打真实请求）。
   * 单次调用的 requestConfig 会覆盖实例级的。
   */
  const makeSessionCtx = (platform: Platform, cookie: string, perCall?: RequestConfig): SessionCtx => {
    const trace = new TraceCollector()
    const http = new HttpClient({ requestConfig: { ...requestConfig, ...perCall }, trace })
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
    /** 启动本地 HTTP 服务（阶段 6 起挂 registry 派生的平台路由） */
    startServer: (port = 4567): express.Application => {
      const app = express()
      app.use(express.json())
      app.use(express.urlencoded({ extended: true }))
      app.get('/', (_req, res) => res.redirect(301, 'https://amagi.apifox.cn'))
      app.get('/docs', (_req, res) => res.redirect(301, 'https://amagi.apifox.cn'))
      app.use('/api/douyin', createDouyinRoutes(cookies.douyin ?? '', requestConfig))
      app.use('/api/bilibili', createBilibiliRoutes(cookies.bilibili ?? '', requestConfig))
      app.use('/api/kuaishou', createKuaishouRoutes(cookies.kuaishou ?? '', requestConfig))
      app.use('/api/xiaohongshu', createXiaohongshuRoutes(cookies.xiaohongshu ?? '', requestConfig))
      app.listen(port, '::', () => undefined)
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
  startServer: (port?: number) => express.Application
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
