import type { SignFn } from '../contracts/endpoint'
import type { Judge } from '../contracts/error'
import type { Platform } from '../contracts/platform'
import type { RequestConfig } from '../contracts/request'
import { bilibiliJudge } from '../platforms/bilibili/judge'
import { createBilibiliConfig } from '../platforms/bilibili/config'
import { createBilibiliSigners } from '../platforms/bilibili/sign/signers'
import { douyinJudge } from '../platforms/douyin/judge'
import { createDouyinConfig } from '../platforms/douyin/config'
import { createDouyinSigners } from '../platforms/douyin/sign/signers'
import { createKuaishouConfig } from '../platforms/kuaishou/config'
import { xiaohongshuJudge } from '../platforms/xiaohongshu/judge'
import { createXiaohongshuConfig } from '../platforms/xiaohongshu/config'
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
 * 平台默认 header 基线（UA / sec-ch-ua / referer / timeout 等）。
 *
 * v7 的 `platforms/<p>/config.ts` 各自导出 `createXxxConfig(cookie, requestConfig?)`
 * （从 v6 `platform/defaultConfigs.ts` 搬迁，UA 集中到 contracts/ua.ts）。
 * 所有入口统一经这里装配 —— 修掉 v6→v7 过渡期的断链：config 造好了但从没
 * 人调用，导致请求不带浏览器基线、`ctx.userAgent` 恒空（a_bogus 等签名器
 * 用空 UA 签名，服务端必然拒绝）。
 *
 * cookie **不进基线**：cookie 是执行期身份（`ctx.cookie` + execute 的
 * `attachCookie` 管理），基线里若带创建时的 cookie，单次调用的 cookie 覆盖
 * 会被实例头里的旧值遮蔽（resolveBoundRequest 先读 base headers）。
 */
/** 平台默认基线构造器表（四个 config.ts 的 createXxxConfig 同构） */
type PlatformConfigBuilder = (cookie: string, requestConfig: RequestConfig) => ReturnType<typeof createDouyinConfig>

const PLATFORM_CONFIGS: Record<Platform, PlatformConfigBuilder> = {
  xiaohongshu: createXiaohongshuConfig,
  kuaishou: createKuaishouConfig,
  douyin: createDouyinConfig,
  bilibili: createBilibiliConfig
}

/**
 * 造一个平台的运行期上下文：平台基线 + transport 的 send + 签名器表 + 默认 judge。
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
  const def = PLATFORM_CONFIGS[platform](cookie, requestConfig)
  def.headers.delete('cookie')
  const trace = new TraceCollector()
  const http = new HttpClient({ headers: def.headers.toJSON(), requestConfig: def.requestConfig, trace })
  const runtime = PLATFORM_RUNTIME[platform]
  return {
    clientId,
    platform,
    cookie,
    userAgent: def.headers.get('user-agent') ?? '',
    requestConfig: def.requestConfig,
    trace,
    signers: runtime.signers,
    judge: runtime.judge,
    // 第三参是单次调用的 per-call 配置：execute 会把调用级 requestConfig
    // 一路带到这里（实例配置在构造时已进 HttpClient）
    send: (spec, reason, perCall) => http.send(spec, reason, perCall)
  }
}

/** 会话 / 一次性请求用的运行期 HttpClient（带平台基线，不带签名器） */
export const makeSessionHttp = (
  platform: Platform,
  cookie: string,
  requestConfig: RequestConfig = {}
): { http: HttpClient; trace: TraceCollector } => {
  const def = PLATFORM_CONFIGS[platform](cookie, requestConfig)
  def.headers.delete('cookie')
  const trace = new TraceCollector()
  return { http: new HttpClient({ headers: def.headers.toJSON(), requestConfig: def.requestConfig, trace }), trace }
}
