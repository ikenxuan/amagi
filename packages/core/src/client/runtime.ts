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
import { type EventBus, createTransportEmitter } from '../runtime/events'
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
 * 装配选项：`ClientCtx` 上那些「有槽位、要有人来装」的可选能力。
 *
 * 收成一个具名对象而不是继续加位置参数 —— 位置参数式装配正是 BUG-4 / BUG-6
 * 的形状（槽位定义在一头、装配方在另一头，中间没人对得上）。
 */
export interface CtxAssembly {
  /** 事件总线。不传则整条链路不发事件（v6 遗留调用点就不传） */
  bus?: EventBus
  /** 把平台原始响应体放进失败信封的 `error.raw`（`ClientOptions.debug`） */
  debug?: boolean
}

/**
 * 造一个平台的运行期上下文：平台基线 + transport 的 send + 签名器表 + 默认 judge。
 *
 * 一个 client 实例在「新管线」这半边共享的东西（身份 / cookie / 请求配置 /
 * transport）每个平台一份 —— cookie 是**该平台**的 cookie。
 *
 * `clientId` 用于区分创建者（实例化 client / HTTP 路由 / 静态 fetcher），
 * 进入 meta 与事件负载。
 *
 * `assembly` 是**可选能力的装配点**（阶段 9.1 修 BUG-4 / BUG-6）：
 * - `bus`：`ctx.bus` 让 `runtime/execute.ts` 发 `api:success` / `api:error`，
 *   `ctx.scope` 让每次调用的 `HttpClient` 带上 `createTransportEmitter` 出口，
 *   于是 `http:*` / `network:*` / `log:warn` / `log:error` 也真的发出去。
 *   这三根线之前一根都没接，`client.events` 收不到任何东西。
 * - `debug`：`ctx.debug` 一路到 execute 的 `fromVerdict`，失败信封才有
 *   `error.raw`。之前没人设它，于是「client 开 debug 时才填」是句空话。
 * @param platform - 平台
 * @param cookie - 该平台的 cookie
 * @param requestConfig - 实例级请求配置
 * @param clientId - 创建者标识，进 `meta.clientId`
 * @param assembly - 装配选项（事件总线 / debug）
 * @returns 运行期上下文
 */
export const makeClientCtx = (
  platform: Platform,
  cookie: string,
  requestConfig: RequestConfig = {},
  clientId = 'shared',
  assembly: CtxAssembly = {}
): ClientCtx => {
  const { bus, debug } = assembly
  const def = PLATFORM_CONFIGS[platform](cookie, requestConfig)
  def.headers.delete('cookie')
  const headers = def.headers.toJSON()
  const trace = new TraceCollector()
  const http = new HttpClient({ headers, requestConfig: def.requestConfig, trace })
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
    ...(bus === undefined ? {} : { bus }),
    // 不写 `debug: undefined` —— ctx 上不该凭空多一个键（与信封「运行时形状
    // 与声明一致」同一条纪律）
    ...(debug === undefined ? {} : { debug }),
    // 第三参是单次调用的 per-call 配置：execute 会把调用级 requestConfig
    // 一路带到这里（实例配置在构造时已进 HttpClient）
    send: (spec, reason, perCall) => http.send(spec, reason, perCall),
    // 一次调用一份 trace + 一个绑本次 meta 的事件出口：
    // ① `TraceCollector` 的契约是「一次逻辑调用配一个」，而这个 ctx 是
    //    「实例 × 平台」一份、跨调用复用的 —— 共用一个收集器会让
    //    `meta.attempts` 越用越大（HTTP 路由那份还会无上限攒 records）。
    // ② `http:*` / `network:*` 的负载要带本次调用的 requestId / endpoint，
    //    所以出口只能按调用绑，不能在这里一次性绑死。
    scope: (meta) => {
      const callTrace = new TraceCollector()
      const callHttp = new HttpClient({
        headers,
        requestConfig: def.requestConfig,
        trace: callTrace,
        ...(bus === undefined ? {} : { emit: createTransportEmitter(bus, meta) })
      })
      return { trace: callTrace, send: (spec, reason, perCall) => callHttp.send(spec, reason, perCall) }
    }
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
