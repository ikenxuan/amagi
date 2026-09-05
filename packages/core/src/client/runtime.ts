import type { EndpointCtx, SignFn } from '../contracts/endpoint'
import type { ChallengeExtractor, Judge } from '../contracts/error'
import type { Platform } from '../contracts/platform'
import type { RawResponse, RequestConfig } from '../contracts/request'
import { createBilibiliConfig } from '../platforms/bilibili/config'
import { bilibiliJudge } from '../platforms/bilibili/judge'
import { createBilibiliSigners } from '../platforms/bilibili/sign/signers'
import { createDouyinConfig } from '../platforms/douyin/config'
import { douyinJudge } from '../platforms/douyin/judge'
import { createDouyinSigners } from '../platforms/douyin/sign/signers'
import { observeDouyinWebid } from '../platforms/douyin/webid'
import { parseKuaishouCaptcha } from '../platforms/kuaishou/captcha'
import { createKuaishouConfig } from '../platforms/kuaishou/config'
import { kuaishouJudge } from '../platforms/kuaishou/judge'
import { createKuaishouSigners } from '../platforms/kuaishou/sign/signers'
import { createXiaohongshuConfig } from '../platforms/xiaohongshu/config'
import { xiaohongshuJudge } from '../platforms/xiaohongshu/judge'
import { createXiaohongshuSigners } from '../platforms/xiaohongshu/sign/signers'
import { type EventBus, createTransportEmitter } from '../runtime/events'
import { HttpClient } from '../transport/client'
import { TraceCollector } from '../transport/trace'
import type { ClientCtx } from './fetcher'

/**
 * 平台运行期依赖表：签名器表 + 默认 judge + 可选的风控挑战提取器 / 响应旁观者。
 *
 * 四个平台都必须 `signers` / `judge` 齐全 —— 少一项**不报编译错误也不挂测试**，
 * 快手就是这么同时漏掉 `judge`（业务失败全被判成成功）和 `signers`（请求根本没
 * 签过名）的。`test/client/runtime.test.ts` 现在把「每个平台都要有 signers 与
 * judge」钉成断言。
 *
 * `challenge` 是**可选的第三项**：只有会给出验证页地址的平台才装（目前只有快手）。
 * 它在 judge 判出 `kind: 'risk'` 时被调用，结果进 `error.challenge`，不受
 * `debug` 开关影响 —— 理由见 `contracts/error.ts` 的 `RiskChallenge`。
 *
 * `observe` 是**可选的第四项**：只有「服务端把状态写在响应头里」的平台才装
 * （目前只有抖音，用它回收 `webid`）。每次 send 之后调用一次，只读、不影响判定。
 *
 * createClient 的 fetcher、四个 `createXxxRoutes` 与静态 fetcher 共用这张表，
 * 保证同一平台在任何入口下的签名 / 判定 / 风控行为一致。
 */
export const PLATFORM_RUNTIME: Record<
  Platform,
  {
    signers?: Record<string, SignFn>
    judge?: Judge
    challenge?: ChallengeExtractor
    observe?: (res: RawResponse, ctx: EndpointCtx) => void
  }
> = {
  xiaohongshu: { signers: createXiaohongshuSigners(), judge: xiaohongshuJudge },
  kuaishou: { signers: createKuaishouSigners(), judge: kuaishouJudge, challenge: parseKuaishouCaptcha },
  douyin: { signers: createDouyinSigners(), judge: douyinJudge, observe: observeDouyinWebid },
  bilibili: {
    signers: (() => {
      const s = createBilibiliSigners()
      return { wbi: s['wbi'], qtparam: s['qtparam'] }
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
  /**
   * 排障开关（`ClientOptions.debug`）：失败信封带 `error.raw`，
   * 且信封的 `meta.trace` 带每次底层请求的明细。两样东西一个开关 ——
   * 见 `client/createClient.ts` 的 `ClientOptions.debug`。
   */
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
 *   `error.raw`；同一位还开着 `TraceCollector.enabled`，于是 `meta.trace`
 *   才有明细（修 BUG-8：`trace` 没有独立开关，与 `debug` 是同一个）。
 *   之前没人设它，于是「client 开 debug / 开 trace 时才填」是两句空话。
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
  // enabled 决定「明细是否随信封带出」，计数与登记始终发生（attempts 与开关无关）
  const trace = new TraceCollector({ enabled: debug ?? false })
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
    ...(runtime.challenge === undefined ? {} : { challenge: runtime.challenge }),
    ...(runtime.observe === undefined ? {} : { observe: runtime.observe }),
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
      const callTrace = new TraceCollector({ enabled: debug ?? false })
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
