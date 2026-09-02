import express from 'express'

import { bilibiliUtils, createBilibiliRoutes, createDouyinRoutes, createKuaishouRoutes, douyinUtils, kuaishouUtils } from '../platform'
import { createXiaohongshuRoutes, xiaohongshuUtils } from '../platform/xiaohongshu'
import { createEventBus } from '../runtime/events'
import type { Platform } from '../contracts/platform'
import type { RequestConfig } from '../contracts/request'
import { HttpClient } from '../transport/client'
import { TraceCollector } from '../transport/trace'
import type { ClientCtx } from './fetcher'
import { createFetcherFromRegistry } from './fetcher'
import { xiaohongshuRegistry } from '../platforms/xiaohongshu/endpoints'
import { kuaishouRegistry } from '../platforms/kuaishou/endpoints'
import { douyinRegistry } from '../platforms/douyin/endpoints'
import { bilibiliRegistry } from '../platforms/bilibili/endpoints'
import { createXiaohongshuSigners } from '../platforms/xiaohongshu/sign/signers'
import { createDouyinSigners } from '../platforms/douyin/sign/signers'
import { createBilibiliSigners } from '../platforms/bilibili/sign/signers'
import { xiaohongshuJudge } from '../platforms/xiaohongshu/judge'
import { douyinJudge } from '../platforms/douyin/judge'
import { bilibiliJudge } from '../platforms/bilibili/judge'
import type { SignFn } from '../contracts/endpoint'
import type { Judge } from '../contracts/error'

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

/**
 * 平台运行期依赖表：签名器表 + 默认 judge。
 *
 * 快手端点不声明 sign（URL 由 api.ts 预签名），judge 由端点各自声明。
 */
const PLATFORM_RUNTIME: Record<Platform, { signers?: Record<string, SignFn>; judge?: Judge }> = {
  xiaohongshu: { signers: createXiaohongshuSigners(), judge: xiaohongshuJudge },
  kuaishou: {},
  douyin: { signers: createDouyinSigners(), judge: douyinJudge },
  bilibili: {
    signers: (() => {
      const s = createBilibiliSigners()
      return { 'wbi': s['wbi'], 'qtparam': s['qtparam'] }
    })(),
    judge: bilibiliJudge
  }
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
  const makeCtx = (platform: Platform, cookie: string): ClientCtx => {
    const trace = new TraceCollector()
    const http = new HttpClient({ requestConfig, trace })
    const runtime = PLATFORM_RUNTIME[platform]
    return {
      clientId: 'client-1',
      platform,
      cookie,
      userAgent: '',
      requestConfig,
      trace,
      signers: runtime.signers,
      judge: runtime.judge,
      send: (spec, reason) => http.send(spec, reason)
    }
  }

  // —— 平台模块：四平台全部 registry 派生（MIGRATED 已全开） ——
  const douyinFetcher = createFetcherFromRegistry('douyin', douyinRegistry, makeCtx('douyin', cookies.douyin ?? ''))
  const bilibiliFetcher = createFetcherFromRegistry('bilibili', bilibiliRegistry, makeCtx('bilibili', cookies.bilibili ?? ''))
  const kuaishouFetcher = createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeCtx('kuaishou', cookies.kuaishou ?? ''))
  const xiaohongshuFetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeCtx('xiaohongshu', cookies.xiaohongshu ?? ''))

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
