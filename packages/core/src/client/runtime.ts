import type { SignFn } from '../contracts/endpoint'
import type { Judge } from '../contracts/error'
import type { Platform } from '../contracts/platform'
import type { RequestConfig } from '../contracts/request'
import { bilibiliJudge } from '../platforms/bilibili/judge'
import { createBilibiliSigners } from '../platforms/bilibili/sign/signers'
import { douyinJudge } from '../platforms/douyin/judge'
import { createDouyinSigners } from '../platforms/douyin/sign/signers'
import { xiaohongshuJudge } from '../platforms/xiaohongshu/judge'
import { createXiaohongshuSigners } from '../platforms/xiaohongshu/sign/signers'
import { HttpClient } from '../transport/client'
import { TraceCollector } from '../transport/trace'
import type { ClientCtx } from './fetcher'

/**
 * 平台运行期依赖表：签名器表 + 默认 judge。
 *
 * 快手端点不声明 sign（URL 由 api.ts 预签名），judge 由端点各自声明。
 * createClient 的 fetcher、四个 `createXxxRoutes` 与静态 fetcher 共用这张表，
 * 保证同一平台在任何入口下的签名 / 判定行为一致。
 */
export const PLATFORM_RUNTIME: Record<Platform, { signers?: Record<string, SignFn>; judge?: Judge }> = {
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

/**
 * 造一个平台的运行期上下文：trace + transport 的 send + 签名器表 + 默认 judge。
 *
 * 一个 client 实例在「新管线」这半边共享的东西（身份 / cookie / 请求配置 /
 * transport）每个平台一份 —— cookie 是**该平台**的 cookie。
 *
 * `clientId` 用于区分创建者（实例化 client / HTTP 路由 / 静态 fetcher），
 * 进入 meta 与事件负载。
 */
export const makeClientCtx = (
  platform: Platform,
  cookie: string,
  requestConfig: RequestConfig = {},
  clientId = 'shared'
): ClientCtx => {
  const trace = new TraceCollector()
  const http = new HttpClient({ requestConfig, trace })
  const runtime = PLATFORM_RUNTIME[platform]
  return {
    clientId,
    platform,
    cookie,
    userAgent: '',
    requestConfig,
    trace,
    signers: runtime.signers,
    judge: runtime.judge,
    // 第三参是单次调用的 per-call 配置：execute 会把调用级 requestConfig
    // 一路带到这里（实例配置在构造时已进 HttpClient）
    send: (spec, reason, perCall) => http.send(spec, reason, perCall)
  }
}
