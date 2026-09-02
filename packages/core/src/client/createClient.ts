import express from 'express'

import {
  createBoundBilibiliFetcher,
  createBoundDouyinFetcher,
  createBoundKuaishouFetcher,
  createBoundXiaohongshuFetcher
} from '../model/fetchers'
import { bilibiliUtils, createBilibiliRoutes, createDouyinRoutes, createKuaishouRoutes, douyinUtils, kuaishouUtils } from '../platform'
import { createXiaohongshuRoutes, xiaohongshuUtils } from '../platform/xiaohongshu'
import { createEventBus } from '../runtime/events'
import type { AmagiError } from '../contracts/error'
import type { AmagiMeta } from '../contracts/meta'
import { STATIC_CLIENT_ID } from '../contracts/meta'
import type { Platform } from '../contracts/platform'
import type { AmagiResult } from '../contracts/result'
import type { RequestConfig } from '../contracts/request'
import { HttpClient } from '../transport/client'
import { TraceCollector } from '../transport/trace'
import type { Result as V6Result } from '../validation'
import type { ClientCtx } from './fetcher'
import { createFetcherFromRegistry } from './fetcher'
import { xiaohongshuRegistry } from '../platforms/xiaohongshu/endpoints'
import { kuaishouRegistry } from '../platforms/kuaishou/endpoints'
import { createXiaohongshuSigners } from '../platforms/xiaohongshu/sign/signers'
import { xiaohongshuJudge } from '../platforms/xiaohongshu/judge'

/**
 * 已迁移到 v7 新管线的平台。
 *
 * 一个平台是一个原子单位：MIGRATED 里打开的平台走 registry 派生 fetcher
 * （AmagiResult 信封），未打开的平台走 v6 原路径（`createBoundXxxFetcher`
 * 套 `toV7Envelope`，信封形状与 v7 统一）。阶段验收动作就是打开这里的开关，
 * 然后跑该平台全部用例，绿了才算这个阶段完成。
 */
export const MIGRATED: Partial<Record<Platform, true>> = {
  xiaohongshu: true,
  kuaishou: true
}

/**
 * 把 v6 的 `Result` 信封转成 v7 的 `AmagiResult` 信封。
 *
 * 过渡期让 legacy 路径也套这一层，调用方看到的信封形状从阶段 1 起就是统一的，
 * 与该平台是否已迁移无关。v6 的 `code` 塞进 `error.http.status`（若有），
 * `meta` 用 `STATIC_CLIENT_ID` 占位 —— 阶段 6 删 v6 时这层转换一起删。
 */
export const toV7Envelope = <T>(result: V6Result<T>, platform: Platform, endpoint: string): AmagiResult<T> => {
  const meta: AmagiMeta = {
    requestId: `legacy-${Math.random().toString(36).slice(2, 10)}`,
    clientId: STATIC_CLIENT_ID,
    platform,
    endpoint,
    durationMs: 0,
    attempts: 0
  }

  if (result.success) {
    return { success: true, data: result.data, message: result.message, meta }
  }

  const error: AmagiError = {
    kind: 'unknown',
    code: 'UNKNOWN_ERROR',
    message: result.error?.amagiMessage ?? result.message,
    retryable: false,
    ...(result.code !== undefined ? { http: { status: result.code } } : {}),
    ...(result.error !== undefined ? { raw: result.error } : {})
  }

  return { success: false, error, message: result.message, meta }
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

/** 给 v6 bound fetcher 的每个方法套 `toV7Envelope`，让 legacy 路径的信封与 v7 统一 */
const wrapLegacyFetcher = <T extends object>(fetcher: T, platform: Platform): T =>
  new Proxy(fetcher, {
    get: (target, prop) => {
      const fn = Reflect.get(target, prop)
      if (typeof fn !== 'function') return fn
      return async (...args: unknown[]) => {
        const result = await (fn as (...a: unknown[]) => Promise<V6Result<unknown>>)(...args)
        return toV7Envelope(result, platform, String(prop))
      }
    }
  })

/**
 * 创建 Amagi 客户端（v7 门面）。
 *
 * 形状与 v6 `createAmagiClient` 一致：顶层 `startServer / events / on / once` +
 * 四个平台模块（`{ ...utils, fetcher }`）。差异在 fetcher：
 * - MIGRATED 平台：registry 派生的 v7 fetcher。
 * - 未迁移平台：v6 bound fetcher 套 `toV7Envelope()`，信封形状与 v7 统一。
 *
 * `startServer` 保持 v6 行为（挂 v6 平台路由），阶段 6 换成 v7 的
 * `server/routes.ts` + `server/auth.ts`。
 */
export const createClient = (options: ClientOptions = {}) => {
  const cookies = options.cookies ?? {}
  const requestConfig = options.request ?? {}

  // —— 已迁移平台的运行期上下文（v7 管线） ——
  const makeCtx = (platform: Platform, cookie: string): ClientCtx => {
    const trace = new TraceCollector()
    const http = new HttpClient({ requestConfig, trace })
    return {
      clientId: 'client-1',
      platform,
      cookie,
      userAgent: '',
      requestConfig,
      trace,
      signers: createXiaohongshuSigners(),
      judge: xiaohongshuJudge,
      send: (spec, reason) => http.send(spec, reason)
    }
  }

  // —— 平台模块：MIGRATED 走 v7，其余走 v6 + toV7Envelope ——
  const douyinFetcher = MIGRATED.douyin
    ? createFetcherFromRegistry('douyin', {}, makeCtx('douyin', cookies.douyin ?? ''))
    : wrapLegacyFetcher(createBoundDouyinFetcher(cookies.douyin ?? '', requestConfig), 'douyin')
  const bilibiliFetcher = MIGRATED.bilibili
    ? createFetcherFromRegistry('bilibili', {}, makeCtx('bilibili', cookies.bilibili ?? ''))
    : wrapLegacyFetcher(createBoundBilibiliFetcher(cookies.bilibili ?? '', requestConfig), 'bilibili')
  const kuaishouFetcher = MIGRATED.kuaishou
    ? createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx('kuaishou', cookies.kuaishou ?? ''))
    : wrapLegacyFetcher(createBoundKuaishouFetcher(cookies.kuaishou ?? '', requestConfig), 'kuaishou')
  const xiaohongshuFetcher = MIGRATED.xiaohongshu
    ? createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx('xiaohongshu', cookies.xiaohongshu ?? ''))
    : wrapLegacyFetcher(createBoundXiaohongshuFetcher(cookies.xiaohongshu ?? '', requestConfig), 'xiaohongshu')

  // 事件总线（实例级，v7 设计）
  const bus = createEventBus('client')

  return {
    /** 启动本地 HTTP 服务（v6 行为，挂 v6 平台路由） */
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
    douyin: { ...douyinUtils, fetcher: douyinFetcher },
    bilibili: { ...bilibiliUtils, fetcher: bilibiliFetcher },
    kuaishou: { ...kuaishouUtils, fetcher: kuaishouFetcher },
    xiaohongshu: { ...xiaohongshuUtils, fetcher: xiaohongshuFetcher }
  }
}
