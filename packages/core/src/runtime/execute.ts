import type zod from 'zod'

import type { AggregatedValue, AnyEndpointDef, EndpointCtx, EndpointDef, PaginatedValue, SignFn } from '../contracts/endpoint'
import { stepsToSigner } from '../contracts/endpoint'
import {
  type AmagiError,
  type AmagiErrorCode,
  type ChallengeExtractor,
  type ChallengeSolver,
  EndpointError,
  type ErrorKind,
  errorMessageFor,
  isRetryableKind,
  type Judge,
  type JudgeVerdict,
  type ValidationIssue,
  verdictFromHttpStatus
} from '../contracts/error'
import type { AmagiMeta, TraceReason } from '../contracts/meta'
import { STATIC_CLIENT_ID } from '../contracts/meta'
import type { Platform } from '../contracts/platform'
import { AmagiHeaders, type RawResponse, type RequestSpec } from '../contracts/request'
import { type AmagiFailure, type AmagiResult, type AmagiSuccess, SUCCESS_MESSAGE } from '../contracts/result'
import { TransportError } from '../transport/client'
import { backoffDelayMs, DEFAULT_MAX_RETRIES } from '../transport/retry'
import { TraceCollector } from '../transport/trace'
import type { EventBus } from './events'
import { runPaginated } from './paginate'

/**
 * 执行管线。
 *
 * `validate → prepare → build → sign → send → decode → judge → normalize`
 *
 * 三条硬约束：
 *
 * 1. **唯一一处 catch。** 异常统一经 `classifyThrown` 归因；并发分片先收齐 settled
 *    结果，不新增 catch，也不丢失结构化信息。
 * 2. **永不 reject。** 参数校验失败、签名器抛错、decode 崩、judge 崩、
 *    网络中断，全部收口成 `success: false` 的信封。
 * 3. **异常按发生阶段归因。** 串行管线与并发分片分别记录阶段：
 *    decode 阶段 → `parse` / `DECODE_FAILED`，传输层 → `network` / `timeout`，
 *    端点明确抛出的 EndpointError 保留业务归因，其余归为 `internal` 并保留 `cause`。
 */

/** 管线阶段。单一 catch 靠它给异常归因 */
export type ExecuteStage = 'validate' | 'compute' | 'prepare' | 'build' | 'sign' | 'send' | 'decode' | 'judge' | 'normalize'

/**
 * 把执行期身份（`ctx.cookie`）写进请求头，若请求描述还没显式带 Cookie。
 *
 * 端点声明只描述 URL / 签名 / 解码，cookie 是执行期身份，统一在 send 前补。
 * 这里取的是当刻的 `ctx.cookie` —— prepare 换过凭证（小红书 guest cookie）的话，
 * 发的正是换完的值。空 cookie（匿名请求）不写 Cookie 头。
 */
const attachCookie = (spec: RequestSpec, cookie: string): RequestSpec => {
  if (!cookie) return spec
  const headers = new AmagiHeaders(spec.headers)
  if (headers.has('cookie')) return spec
  headers.set('Cookie', cookie)
  return { ...spec, headers: headers.toJSON() }
}

/** `execute` 的运行期依赖 */
export interface ExecuteOptions {
  /** 端点钩子拿到的上下文，`send` 由 transport 注入 */
  ctx: EndpointCtx
  /** 平台默认 judge。端点声明的 `judge` 优先 */
  judge?: Judge
  /**
   * 平台的风控挑战提取器。只在 judge 判出 `kind: 'risk'` 时调用，
   * 结果进 `error.challenge`（**不受 `debug` 管**）。
   */
  challenge?: ChallengeExtractor
  /**
   * 平台的风控挑战**自动解算器**（可选）。只在 judge 判出 `kind: 'risk'` 时调用：
   * 返回合并好的完整 cookie 串就更新 `ctx.cookie` 并**立即重放同一请求**（不 sleep，
   * 挑战页自己也只是 `location.reload()`）；返回 `undefined` 则照原样把失败信封交出去
   * （`error.challenge` 那条中转路径不受影响）。
   *
   * 与 {@link ExecuteOptions.challenge} 互补，分界线是**有没有人机判定**：WAF 工作量
   * 证明那类纯算法挑战自动解掉、免打扰；真人滑块永不自动重放（解算器对那种形态恒返回
   * `undefined`）。重放上限见 {@link SOLVE_ROUNDS}。
   *
   * 它**不吃 `retryOn` 的重试额度**：两者成因与处置都不同（业务码重试要退避，
   * 解算重放要立刻），所以各有独立的轮次预算。
   */
  solveChallenge?: ChallengeSolver
  /** 平台签名器表，供 `sign: '<name>'` 查名 */
  signers?: Record<string, SignFn>
  /**
   * 平台的响应旁观者：每次 `send` 拿到响应之后调用一次，**不影响判定**。
   *
   * 存在的理由是「有些平台把状态写在响应头里」：抖音的 `webid` 由服务端按 ttwid
   * 算好、通过每个响应的 `cookie_ttwidinfo_webid` 头下发，客户端算不出来。
   * 能拿到 `RawResponse` 的地方只有端点自己的 `decode`（要改 19 个端点）和
   * `prepare` 里自己发的那次请求（要多发一个请求），都不合适 —— 所以做成
   * 平台级的一个钩子，落点与 {@link ExecuteOptions.challenge} 同构：
   * 声明在这里、值来自 `PLATFORM_RUNTIME`、三个入口统一注入。
   *
   * 约定：**只读、不抛、不改判定**。它拿到的是本次请求的响应与当刻的 ctx
   * （`cookie` 用于给缓存分键）。抛错会被 execute 的单一 catch 归因为
   * `kind: 'internal'`，所以实现里自己吞掉异常。
   */
  observe?: (res: RawResponse, ctx: EndpointCtx) => void
  /**
   * 平台的 cookie 审计：每次调用在 prepare 之后、build/sign 之前执行一次，返回
   * 升级后的 cookie（`undefined` / 与入参相同 = 保持原样）。落点与
   * {@link ExecuteOptions.observe} 同构：声明在这里、值来自 `PLATFORM_RUNTIME`、
   * 三个入口统一注入。
   *
   * 存在的理由是「有些平台在 cookie 里要求客户端自己才认得的身份」：抖音的受
   * secsdk 保护端点要求访客 id（`UIFID` 家族），而它不由登录颁发——缺了它稳定
   * 回 `403 Uifid Not Found`。审计钩子让平台在请求前自愈（缺就铸造并合并），
   * 调用方零感知。实现必须**永不为调用增加失败**：任何异常吞掉、原样返回。
   *
   * 时点取 prepare **之后**：prepare 可能整串换 cookie（换 guest cookie），审计要
   * 对最终生效的那份负责；取 build/sign **之前**：Cookie 头在 send 时才从
   * `ctx.cookie` 现取，build（referer / webid）与 secsdk（uifid）也都读它。
   */
  ensureCookie?: (cookie: string, userAgent?: string) => Promise<string | undefined>
  /** trace 收集器。不传则自建（只计数） */
  trace?: TraceCollector
  /** 事件总线。不传则不发事件 */
  bus?: EventBus
  /** 是否把原始响应放进 `error.raw` */
  debug?: boolean
  /** 时钟，便于测试注入 */
  now?: () => number
  /** requestId 生成器，便于测试注入 */
  requestId?: () => string
  /** 退避等待实现，测试可注入（`retryOn` 重试用） */
  sleep?: (ms: number) => Promise<void>
}

/**
 * 默认 requestId：时间戳 + 随机后缀，够用且无依赖。
 *
 * 导出是给 `client/fetcher.ts` 用的：它要在调用一开始就拿到 id，
 * 好让 transport 事件（`http:*` / `network:*`）与信封事件
 * （`api:*`）落在**同一个** `requestId` 上。
 * @returns 一次调用的 requestId
 */
export const defaultRequestId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** 默认睡眠：`setTimeout` 包装。测试可经 `ExecuteOptions.sleep` 注入 */
const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 反爬自动解算的连续轮次上限（{@link ExecuteOptions.solveChallenge}）。
 *
 * 每解一次就多发一次请求：解出的 cookie 只够过当前这一关，重放后服务器可能继续
 * 下发下一关。上限 4 意味着「最多 4 次解算 + 1 次初始请求」，解不动就把失败信封
 * 交出去 —— 没有上限的自动重放撞上一条永远解不开的挑战就是死循环。
 *
 * 取 4 沿用参考实现的取值（它那边的理由是 WAF → VMP 连发不止一次）。本仓只自动解
 * WAF 一种形态，连发几次我们**没有线上观测**（游客流量撞不到挑战，见
 * `platforms/douyin/anticrawler/solver.ts`），所以这是个保守上界而非实测值。
 */
export const SOLVE_ROUNDS = 4

/**
 * 从平台原始响应里提取业务文案。
 *
 * 依次尝试 `message` / `status_msg` / `msg` —— 各平台的文案字段名不统一，
 * 收在 runtime 一处实现，避免某个平台漏捞之后只剩兜底文案。
 * @param raw - 平台原始响应体
 * @returns 平台文案；没有则 `undefined`
 */
export const extractPlatformMessage = (raw: unknown): string | undefined => {
  if (raw === null || typeof raw !== 'object') return undefined
  const body = raw as Record<string, unknown>
  for (const key of ['message', 'status_msg', 'msg', 'error_msg'] as const) {
    const value = body[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return undefined
}

/**
 * 从平台原始响应里提取业务码。
 *
 * 依次尝试 `code` / `status_code` / `statusCode` / `result`，覆盖四个平台的现有形状。
 * `result` 排最后且只在前三个都没命中时才用：它是快手的状态位
 * （`result: 2` 那类失败信封没有 `code`），而 B站番剧那类响应里 `result` 是**负载
 * 对象** —— 靠「只收 number / string」把后者挡在外面，靠排序保证有 `code` 时不会
 * 被它抢。本函数只在失败分支调用，成功响应根本走不到这里。
 * @param raw - 平台原始响应体
 * @returns 平台业务码；没有则 `undefined`
 */
export const extractPlatformCode = (raw: unknown): string | number | undefined => {
  if (raw === null || typeof raw !== 'object') return undefined
  const body = raw as Record<string, unknown>
  for (const key of ['code', 'status_code', 'statusCode', 'result'] as const) {
    const value = body[key]
    if (typeof value === 'number' || typeof value === 'string') return value
  }
  return undefined
}

/**
 * 把 zod 的 issues 转成契约里的字段级错误
 * @param error - zod 校验错误
 * @returns 字段级错误列表
 */
const toValidationIssues = (error: zod.ZodError): ValidationIssue[] =>
  error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
    ...('received' in issue ? { received: (issue as { received?: unknown }).received } : {})
  }))

/**
 * 造一个 `AmagiError`，`retryable` 缺省时按 `kind` 推导
 * @param parts - 错误字段
 * @returns 错误载体
 */
const makeError = (parts: {
  kind: ErrorKind
  code: AmagiErrorCode
  message?: string
  retryable?: boolean
  platform?: AmagiError['platform']
  http?: AmagiError['http']
  issues?: ValidationIssue[]
  raw?: unknown
  challenge?: AmagiError['challenge']
  cause?: unknown
}): AmagiError => ({
  kind: parts.kind,
  code: parts.code,
  message: parts.message ?? errorMessageFor(parts.code),
  retryable: parts.retryable ?? isRetryableKind(parts.kind),
  ...(parts.platform === undefined ? {} : { platform: parts.platform }),
  ...(parts.http === undefined ? {} : { http: parts.http }),
  ...(parts.issues === undefined ? {} : { issues: parts.issues }),
  ...(parts.raw === undefined ? {} : { raw: parts.raw }),
  ...(parts.challenge === undefined ? {} : { challenge: parts.challenge }),
  ...(parts.cause === undefined ? {} : { cause: parts.cause })
})

/**
 * 把 judge 的失败结论补成完整的 `AmagiError`。
 *
 * 平台业务码与文案由 runtime 统一从原始响应提取，judge 只管分类。
 * `kind === 'risk'` 时额外过一次平台的 `challenge` 钩子把验证页地址取出来 ——
 * 那一份**不受 `debug` 管**，理由见 `contracts/error.ts` 的 `RiskChallenge`。
 * 钩子同时拿到 status 与响应头，因为有的平台把验证票据只放在响应头上
 * （小红书的 `verifyuuid` / `verifytype`，见 `platforms/xiaohongshu/captcha.ts`）。
 * @param verdict - judge 的结论
 * @param res - 拿到的原始响应
 * @param decoded - decode 之后的响应体
 * @param debug - 是否把原始响应放进 `error.raw`
 * @param challenge - 平台的风控挑战提取器，可选
 * @returns 错误载体
 */
const fromVerdict = (
  verdict: JudgeVerdict,
  res: RawResponse,
  decoded: unknown,
  debug: boolean,
  challenge?: ChallengeExtractor
): AmagiError => {
  const platformCode = extractPlatformCode(decoded)
  const platformMessage = extractPlatformMessage(decoded)
  const risk = verdict.kind === 'risk' ? challenge?.(decoded, { status: res.status, headers: res.headers }) : undefined
  return makeError({
    kind: verdict.kind ?? 'unknown',
    code: verdict.code ?? 'PLATFORM_ERROR',
    message: platformMessage,
    retryable: verdict.retryable,
    ...(platformCode === undefined && platformMessage === undefined
      ? {}
      : { platform: { code: platformCode ?? '', ...(platformMessage === undefined ? {} : { message: platformMessage }) } }),
    http: { status: res.status, ...(res.statusText === undefined ? {} : { statusText: res.statusText }) },
    ...(risk === undefined ? {} : { challenge: risk }),
    ...(debug ? { raw: decoded } : {})
  })
}

/**
 * 单一 catch 里的归因：把任意异常映射成 `AmagiError`
 * @param cause - 捕获到的异常
 * @param stage - 异常发生在哪一阶段
 * @returns 错误载体
 */
export const classifyThrown = (cause: unknown, stage: ExecuteStage): AmagiError => {
  if (cause instanceof EndpointError) {
    return makeError({ kind: cause.kind, code: cause.code, message: cause.message, cause })
  }

  if (cause instanceof TransportError) {
    return makeError({
      kind: cause.kind,
      code: cause.code,
      message: cause.message,
      platform: cause.errno === undefined ? undefined : { code: cause.errno },
      cause
    })
  }

  if (stage === 'decode') {
    return makeError({
      kind: 'parse',
      code: 'DECODE_FAILED',
      message: `响应解析失败：${cause instanceof Error ? cause.message : String(cause)}`,
      cause
    })
  }

  return makeError({
    kind: 'internal',
    code: 'INTERNAL_ERROR',
    message: `amagi 内部错误（${stage} 阶段）：${cause instanceof Error ? cause.message : String(cause)}`,
    cause
  })
}

/**
 * 解析签名声明为一个可调用的签名器
 * @param decl - 端点的 `sign` 声明
 * @param signers - 平台签名器表
 * @returns 签名函数；声明为 `false` 或缺省时返回 `undefined`
 */
const resolveSigner = (decl: AnyEndpointDef['sign'], signers: Record<string, SignFn> | undefined): SignFn | undefined => {
  if (decl === undefined || decl === false) return undefined
  if (typeof decl === 'function') return decl
  if (Array.isArray(decl)) return stepsToSigner(decl)
  if (typeof decl === 'object') return stepsToSigner([decl])
  const signer = signers?.[decl]
  if (!signer) throw new Error(`未注册的签名器：'${decl}'`)
  return signer
}

/** 一个请求分片的结局 */
type PartOutcome = { ok: true; value: unknown } | { ok: false; error: AmagiError }

/** 分片独立记录阶段，避免其它分片覆盖异常归因。 */
type StageState = { stage: ExecuteStage }

/**
 * 多分片 send / decode / judge（含重试）的在途上限；build 与首次签名不在池内。
 * 完成一个补一个，结果按输入顺序收齐，strict 也等待全部分片 settled。
 */
export const SEGMENT_CONCURRENCY = 10

/**
 * FIFO 限额派发，单任务结局与 Promise.allSettled 一致。
 * @param items - 输入任务
 * @param limit - 在途上限
 * @param task - 异步任务
 * @returns 按输入顺序排列的全部结局
 */
const settledWithConcurrency = async <T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> => {
  const queue = items.map((item, index) => ({ item, index })).reverse()
  const settled: PromiseSettledResult<R>[] = new Array(items.length)
  const worker = async (): Promise<void> => {
    while (true) {
      const job = queue.pop()
      if (job === undefined) return
      settled[job.index] = await task(job.item, job.index).then(
        (value): PromiseSettledResult<R> => ({ status: 'fulfilled', value }),
        (reason): PromiseSettledResult<R> => ({ status: 'rejected', reason })
      )
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return settled
}

/**
 * 执行一条端点声明，产出信封。
 *
 * **永不 reject。** 唯一的例外是调用方自己传入的回调抛出（如会话的
 * `onChallenge`），那属于调用方的代码，原样上抛。
 * @param def - 端点声明
 * @param input - 未校验的入参
 * @param options - 运行期依赖
 * @returns 成功或失败的信封
 */
export const execute = async <TParams extends zod.ZodType, TData>(
  // 端点具体的 TSign / TPage / TItem 在执行器这一层无关，且 TPage / TItem 在逆变位
  // （items / merge 的形参），具体端点的窄类型无法赋给默认宽类型 —— 用 any 吃任意端点
  // oxlint-disable-next-line typescript/no-explicit-any
  def: EndpointDef<TParams, TData, any, any, any>,
  input: unknown,
  options: ExecuteOptions
): Promise<AmagiResult<TData>> => {
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? defaultSleep
  const tracer = options.trace ?? new TraceCollector()
  const startedAt = now()
  const debug = options.debug ?? false

  const meta: AmagiMeta = {
    requestId: (options.requestId ?? defaultRequestId)(),
    clientId: options.ctx.clientId || STATIC_CLIENT_ID,
    platform: options.ctx.platform as Platform,
    endpoint: def.name,
    durationMs: 0,
    attempts: 0
  }

  /** 收尾 meta：耗时、请求数与 trace 快照 */
  const finalize = (): AmagiMeta => {
    meta.durationMs = now() - startedAt
    meta.attempts = tracer.attempts
    const snapshot = tracer.snapshot()
    if (snapshot !== undefined) meta.trace = snapshot
    return meta
  }

  const succeed = (data: TData): AmagiSuccess<TData> => {
    const settled = finalize()
    options.bus?.emit('api:success', { meta: settled, data })
    return { success: true, data, message: SUCCESS_MESSAGE, meta: settled }
  }

  const failWith = (error: AmagiError): AmagiFailure => {
    const settled = finalize()
    options.bus?.emit('api:error', { meta: settled, error })
    return { success: false, error, message: error.message, meta: settled }
  }

  let stage: ExecuteStage = 'validate'

  // ⬇︎ 全仓唯一一处 catch。管线里的函数都不需要自己造错误对象
  try {
    const parsed = def.params.safeParse(input)
    if (!parsed.success) {
      const issues = toValidationIssues(parsed.error)
      return failWith(
        makeError({
          kind: 'validation',
          code: 'PARAM_INVALID',
          message: issues[0]?.message,
          issues
        })
      )
    }
    const params = parsed.data as zod.infer<TParams>

    if (def.compute) {
      stage = 'compute'
      return succeed(def.compute(params))
    }

    stage = 'prepare'
    // 把「实例 → 单次」合并后的请求配置绑进 send：管线内任何内部请求
    // （prepare 换 guest cookie、取 wbi key）都与主请求共用同一份配置，
    // 单次调用传的 adapter / headers / timeout 因此才真的到达请求。
    const baseCtx = { ...options.ctx, transportIdentity: options.ctx.transportIdentity ?? options.ctx.send }
    const boundSend: EndpointCtx['send'] = (spec, reason, perCall) => baseCtx.send(spec, reason, perCall ?? baseCtx.requestConfig)
    const ctx: EndpointCtx = def.prepare
      ? { ...baseCtx, send: boundSend, ...(await def.prepare({ ...baseCtx, send: boundSend })) }
      : { ...baseCtx, send: boundSend }

    // 平台级 cookie 审计：prepare 可能整串换 cookie（换 guest cookie），审计要对
    // 最终生效的那份负责；Cookie 头在 send 时才从 ctx.cookie 现取，build 与
    // secsdk（uifid）也读它 —— 所以放在 prepare 之后、build 之前。实现侧吞异常
    // （审计永不为调用增加失败），这里不再包一层。
    if (options.ensureCookie) {
      const upgraded = await options.ensureCookie(ctx.cookie, ctx.userAgent)
      if (upgraded !== undefined && upgraded !== ctx.cookie) ctx.cookie = upgraded
    }

    stage = 'build'
    if (!def.build) throw new Error(`端点 ${def.name} 既没有 build 也没有 compute`)

    stage = 'sign'
    const signer = resolveSigner(def.sign, options.signers)
    const judge = def.judge ?? options.judge

    /**
     * 跑完一个请求分片：send → decode → judge。
     *
     * **不在这里 catch** —— 异常交给外层 catch 或分片 settled 处理，
     * 统一用发生时的阶段归因。
     *
     * `def.retryOn` 命中的业务码在这里退避重试：trace 里每条重试都带
     * `reason: 'retry'` 与 `retryOf`。
     * @param spec - 请求描述
     * @param partReason - 这次请求在 trace 里的来源
     * @returns 这个分片的结局
     */
    const runSpec = async (
      spec: RequestSpec,
      partReason: TraceReason,
      refresh?: (progress: StageState) => Promise<RequestSpec>,
      progress: StageState = { stage: 'send' }
    ): Promise<PartOutcome> => {
      const maxAttempts = (def.retryOn?.length ?? 0) > 0 ? DEFAULT_MAX_RETRIES + 1 : 1
      let lastError: AmagiError | undefined
      let current = spec
      // 反爬解算已用掉的轮次。它不吃 retryOn 的额度，所以循环上限按「重试额度 +
      // 已用解算轮次」动态放宽；没装 solveChallenge 时它恒为 0，上限与从前完全一致
      let solveRounds = 0
      /** 本次迭代是不是「解出 cookie 后的原样重放」 */
      let replayingSolved = false
      /**
       * 本分片解过至少一次挑战。
       *
       * 用来区分「还没解过，失败可能是令牌不对」与「已经解开了，这一发还是失败」——
       * 后者走 `retryOn` 是白发，见下面那段收口判据。
       */
      let solvedOnce = false

      for (let attempt = 1; attempt <= maxAttempts + solveRounds; attempt++) {
        // retryFresh 的端点在这里换一整套参数：重新 build（新 msToken）+ 重新签名
        // （新 a_bogus）。默认是原样重放，那对「等一会儿就好」的平台足够。
        // 解算重放**不换参**：挑战拦的是 cookie，挑战页自己也只是 location.reload()
        if (attempt > 1 && refresh && !replayingSolved) {
          progress.stage = stage = 'build'
          current = await refresh(progress)
        }
        // 解算重放在 trace 里有自己的 reason（见 contracts/meta.ts 的 `'challenge'`）：
        // 与业务重试混在 `'retry'` 里的话，「解了 n 次」与「退避重试了 n 次」在 trace
        // 上分不出来 —— 两者能凑出同一个请求数
        const sendReason: TraceReason = attempt === 1 ? partReason : replayingSolved ? 'challenge' : 'retry'
        replayingSolved = false

        progress.stage = stage = 'send'
        const res = await ctx.send(attachCookie(current, ctx.cookie), sendReason)

        // 平台旁观者：只读、不影响判定（抖音在这里回收响应头里的 webid）。
        // 它自己吞异常，这里不再包一层 —— 抛出来就该被单一 catch 归因为 internal
        options.observe?.(res, ctx)

        progress.stage = stage = 'decode'
        const decoded = def.decode ? def.decode(res.body, res) : res.body

        progress.stage = stage = 'judge'
        // 业务失败与响应头风控优先；成功 judge 不能放行非 2xx。
        // `responseType` 是调用方声明的期望响应形态，judge 据此决定要不要对字符串 body
        // 发表意见（见 contracts/error.ts 的 verdictFromNonJsonBody）。取 `current` 而非
        // 最初的 `spec`：retryFresh 重新 build 过的话，形态以本次实际发出的那份为准
        const judged = judge?.(decoded, {
          status: res.status,
          headers: res.headers,
          ...(current.responseType === undefined ? {} : { responseType: current.responseType })
        })
        const verdict = judged && !judged.ok ? judged : (verdictFromHttpStatus(res.status) ?? judged ?? { ok: true })
        if (verdict.ok) return { ok: true, value: decoded }

        const error = fromVerdict(verdict, res, decoded, debug, options.challenge)
        lastError = error

        // 反爬挑战自动解算（WAF 工作量证明这类纯算法挑战）：解出 cookie 就**立即
        // 重放**，不 sleep。要人手的形态（滑块）解算器恒返回 undefined，于是落到
        // 下面的 retryOn / 失败分支，信封原样交出去 —— 错不会被吞掉。
        // 解出的 cookie 与当刻相同时**不重放**：那说明没有任何进展，再发一次只会死循环
        if (error.kind === 'risk' && options.solveChallenge && solveRounds < SOLVE_ROUNDS) {
          const solved = options.solveChallenge(
            decoded,
            { status: res.status, headers: res.headers },
            { cookie: ctx.cookie, userAgent: ctx.userAgent }
          )
          if (solved !== undefined && solved !== ctx.cookie) {
            ctx.cookie = solved
            solveRounds += 1
            solvedOnce = true
            replayingSolved = true
            continue
          }
        }

        // **解算重放之后解算器不再出手，就地收口**，不进 `retryOn`。
        //
        // 抖音首页实测（2026-10-11）：第 1 发 VMP 挑战页 → 解出 cookie → 重放拿到真
        // 首页。真首页没有挑战锚点，解算器返回 `undefined`，而它被判成 `ANTIBOT_PAGE`
        // （可重试），于是又退避重发 3 次 —— 挑战已经解开了，这 3 发不可能有不同结果，
        // 只是白发请求、白等 1s+2s+4s。
        //
        // 判据取「本分片解过挑战」而不是「这一发解过」：解算是连续的（解一关可能下发
        // 下一关），要收口的是**整条解算链结束之后**那段退避重试。
        //
        // 没走过解算的路径完全不受影响 —— `solvedOnce` 恒 false，Argus 换令牌重试、
        // B站 -412、空响应重试一条都不变。只有装了 `solveChallenge` 的平台（目前只有
        // 抖音）会走到这里。
        //
        // ## 代价是实测过的：解完之后撞上**与挑战无关**的可重试失败，也不再换令牌重试
        //
        // 2026-10-11 离线实测（假 adapter，第 1 发 VMP 挑战页 + `__ac_nonce`，第 2 发
        // `Blocked by ArgusSecurityPlugin`）：**恰好 2 发**，reason 为 `initial` +
        // `challenge`，收口在 `ANTIBOT_PAGE` / `kind: 'risk'` / `retryable: true` ——
        // `retryFresh` 那 3 次换令牌重试**不发生**。同一次实测的对照组（同样的 Argus
        // 文本，但第 1 发就是它、没解算过）发 4 发、退避 1s+2s+4s，共 7.0s，说明
        // `retryOn` 这条路本身没被动过，变的只是「解算链之后」那一段。
        //
        // 为什么仍然收口：两种 body 判出来的码**完全相同**（都是 `ANTIBOT_PAGE`）——
        // 真首页那条走 `contracts/error.ts` 的 `verdictFromNonJsonBody`，Argus 那条走
        // `platforms/douyin/judge.ts` 自己的 `isDouyinArgusBody`，但 `JudgeVerdict` 上
        // 没有任何能把两者分开的字段。想把判据收窄成「这一发的失败是不是解算相关」，
        // 就得先给 Argus 一条自己的错误码或给 verdict 加来源标记，那是跨平台契约改动。
        // 而两边的量级差得很远：真首页那条是**每次**裸打首页都要白发 3 次、白等 7 秒
        // （零 cookie 必撞 VMP，2026-10-11 实测），VMP→Argus 这个组合**一次都没观测到**；
        // 且收口后信封仍带 `retryable: true`，调用方自己重试照旧有效。
        if (solvedOnce) return { ok: false, error }

        // 命中的业务码才重试（如 B站 -412 → RISK_CONTROL），其余直接返回
        if (!def.retryOn?.includes(error.code) || attempt >= maxAttempts + solveRounds) {
          return { ok: false, error }
        }
        await sleep(backoffDelayMs(attempt))
      }

      // maxAttempts 恒 ≥ 1，这里到不了；类型收窄需要
      return { ok: false, error: lastError ?? makeError({ kind: 'unknown', code: 'UNKNOWN_ERROR' }) }
    }

    /**
     * 重建第 `index` 个分片：重新 build + 重新签名。
     *
     * 只在 `def.retryFresh` 时被 `runSpec` 调到。按下标取是为了让多请求聚合 /
     * 分段并发的端点也能用 —— 失败的那一段单独换参重来。
     * @param params - 本次调用（或本页）的参数
     * @param index - 这一片在 build 结果里的下标
     * @returns 重新签名后的请求描述
     */
    const rebuildAt = async (buildParams: zod.infer<TParams>, index: number, progress: StageState): Promise<RequestSpec> => {
      const rebuilt = def.build?.(buildParams, ctx)
      const list = Array.isArray(rebuilt) ? rebuilt : [rebuilt as RequestSpec]
      const one = list[index] ?? list[0]
      progress.stage = stage = 'sign'
      return signer ? await signer(one, ctx) : one
    }

    /** `retryFresh` 关掉时不传 refresh，`runSpec` 就退化成原样重放 */
    const refreshFor = (buildParams: zod.infer<TParams>, index: number): ((progress: StageState) => Promise<RequestSpec>) | undefined =>
      def.retryFresh ? (progress) => rebuildAt(buildParams, index, progress) : undefined

    // 翻页分支必须在首次 build / sign **之前**：不然会白签一次名，
    // 而快手那类带可变状态的签名器会因此被推进一格
    if (def.paginate) {
      const paged = await runPaginated(
        def.paginate,
        params,
        async (pageParams, pageReason) => {
          stage = 'build'
          const pageBuilt = def.build?.(pageParams, ctx)
          const pageSpecs = Array.isArray(pageBuilt) ? pageBuilt : [pageBuilt as RequestSpec]
          if (pageSpecs.length !== 1) throw new Error(`分页端点 ${def.name} 的 build 必须只返回一个请求`)

          stage = 'sign'
          // 每页都重新签名：签名器在这里被再调一次，不是复用首页的结果
          const pageSpec = signer ? await signer(pageSpecs[0], ctx) : pageSpecs[0]
          return runSpec(pageSpec, pageReason, refreshFor(pageParams, 0))
        },
        { sleep, tolerate: def.partial === 'tolerate' }
      )
      if (!paged.ok) return failWith(paged.error)

      stage = 'normalize'
      const outcome = paged.value
      // 空跑（target === 0）：所有分页端点的 `number` 都带 zod `.min(1)` / `.positive()`，
      // 真实端点到不了此支，它仅为 PaginateOutcome 的类型完整。没有页可 merge，回退未定义 data
      if (outcome.empty) return succeed(undefined as TData)
      // 翻页中途被打断时 `paginate` 已返回部分结果，信封照常成功。声明了 `partial: 'tolerate'`
      // 的端点再把失败页的错误挂到 meta 上（截断对它们不是静默的）；其余端点与正常收尾同路
      if (outcome.interrupted) {
        const { kind, code, message } = outcome.interrupted
        meta.incomplete = { kind, code, message }
      }
      // merge 的具体页 / 条目类型在执行器这一层已擦除，取成宽签名调用
      const merge = def.paginate.merge as ((value: PaginatedValue, params: zod.infer<TParams>) => TData) | undefined
      return succeed(merge ? merge(outcome, params) : (outcome as unknown as TData))
    }

    stage = 'build'
    const built = def.build(params, ctx)
    const specs = Array.isArray(built) ? built : [built]
    if (specs.length === 0) throw new Error(`端点 ${def.name} 的 build 返回了空数组`)

    stage = 'sign'
    const signed = signer ? await Promise.all(specs.map((spec) => signer(spec, ctx))) : specs

    const isMulti = signed.length > 1 || Array.isArray(built)
    const reason = isMulti ? 'segment' : 'initial'

    const tolerate = def.partial === 'tolerate'
    const progress = signed.map((): StageState => ({ stage: 'send' }))
    const settled = await settledWithConcurrency(signed, SEGMENT_CONCURRENCY, (spec, index) =>
      runSpec(spec, reason, refreshFor(params, index), progress[index])
    )
    // strict 等全部分片结束再失败；抛错优先于业务失败，按输入顺序取首个。
    if (!tolerate) {
      const rejectedIndex = settled.findIndex((part) => part.status === 'rejected')
      const rejected = settled[rejectedIndex]
      if (rejected?.status === 'rejected') {
        return failWith(classifyThrown(rejected.reason, progress[rejectedIndex].stage))
      }
    }
    const outcomes: PartOutcome[] = settled.map((part, index) =>
      part.status === 'fulfilled' ? part.value : { ok: false, error: classifyThrown(part.reason, progress[index].stage) }
    )
    if (tolerate) {
      if (outcomes.every((o) => !o.ok)) return failWith((outcomes[0] as { ok: false; error: AmagiError }).error)
    } else {
      const firstFailure = outcomes.find((o): o is { ok: false; error: AmagiError } => !o.ok)
      if (firstFailure) return failWith(firstFailure.error)
    }

    stage = 'normalize'
    // build 返回数组、各段同构：走 typed 的 aggregate。到这里必有一段成功（tolerate 全失败、
    // 非 tolerate 有失败都已在上面 return），所以 head 找得到、恒有值 —— 端点里可直接 `...head`。
    if (isMulti && def.aggregate) {
      const parts = outcomes.map((o) => (o.ok ? o.value : undefined))
      const head = parts.find((p) => p !== undefined)
      // 具体段类型在执行器这层已擦除，取成宽签名调用（与 paginate.merge 同处置）
      const aggregate = def.aggregate as (value: AggregatedValue, params: zod.infer<TParams>) => TData
      return succeed(aggregate({ parts, head }, params))
    }

    const decodedValue = isMulti ? outcomes.map((o) => (o.ok ? o.value : undefined)) : (outcomes[0] as { ok: true; value: unknown }).value

    return succeed(def.normalize ? def.normalize(decodedValue, params) : (decodedValue as TData))
  } catch (cause) {
    return failWith(classifyThrown(cause, stage))
  }
}
