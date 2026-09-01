import type zod from 'zod'

import type { AnyEndpointDef, EndpointCtx, EndpointDef, SignFn } from '../contracts/endpoint'
import {
  type AmagiError,
  type AmagiErrorCode,
  type ErrorKind,
  errorMessageFor,
  isRetryableKind,
  type Judge,
  type JudgeVerdict,
  type ValidationIssue
} from '../contracts/error'
import type { AmagiMeta, TraceReason } from '../contracts/meta'
import { STATIC_CLIENT_ID } from '../contracts/meta'
import type { Platform } from '../contracts/platform'
import type { RawResponse, RequestSpec } from '../contracts/request'
import { type AmagiFailure, type AmagiResult, type AmagiSuccess, SUCCESS_MESSAGE } from '../contracts/result'
import { TransportError } from '../transport/client'
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
 * 1. **唯一一处 catch。** 整条管线只有一个 `catch`，所以「错误要不要造对象、
 *    造成什么形状」这件事只有一个答案。v6 是 4 个 `internal.ts` 各写一个
 *    try/catch，且 catch 里 `throw new Error(字符串)` —— 声明返回 `Result` 却抛，
 *    结构化信息全丢。
 * 2. **永不 reject。** 参数校验失败、签名器抛错、decode 崩、judge 崩、
 *    网络中断，全部收口成 `success: false` 的信封。
 * 3. **异常按发生阶段归因。** 单一 catch 靠 `stage` 变量知道自己在哪一步炸的：
 *    decode 阶段 → `parse` / `DECODE_FAILED`，传输层 → `network` / `timeout`，
 *    其余一律 `internal` 且 `cause` 原样保留。
 */

/** 管线阶段。单一 catch 靠它给异常归因 */
export type ExecuteStage = 'validate' | 'compute' | 'prepare' | 'build' | 'sign' | 'send' | 'decode' | 'judge' | 'normalize'

/** `execute` 的运行期依赖 */
export interface ExecuteOptions {
  /** 端点钩子拿到的上下文，`send` 由 transport 注入 */
  ctx: EndpointCtx
  /** 平台默认 judge。端点声明的 `judge` 优先 */
  judge?: Judge
  /** 平台签名器表，供 `sign: '<name>'` 查名 */
  signers?: Record<string, SignFn>
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
}

/** 默认 requestId：时间戳 + 随机后缀，够用且无依赖 */
const defaultRequestId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/**
 * 从平台原始响应里提取业务文案。
 *
 * 依次尝试 `message` / `status_msg` / `msg` —— **这是 A3 的根治点**：
 * v6 让各平台自己捞文案，B站那条路径漏了，于是平台明确给了
 * 「账号未登录」也只剩兜底文案。放在 runtime 就只有一份实现。
 * @param raw - 平台原始响应体
 * @returns 平台文案；没有则 `undefined`
 */
export const extractPlatformMessage = (raw: unknown): string | undefined => {
  if (raw === null || typeof raw !== 'object') return undefined
  const body = raw as Record<string, unknown>
  for (const key of ['message', 'status_msg', 'msg'] as const) {
    const value = body[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return undefined
}

/**
 * 从平台原始响应里提取业务码。
 *
 * 依次尝试 `code` / `status_code` / `statusCode`，覆盖四个平台的现有形状。
 * @param raw - 平台原始响应体
 * @returns 平台业务码；没有则 `undefined`
 */
export const extractPlatformCode = (raw: unknown): string | number | undefined => {
  if (raw === null || typeof raw !== 'object') return undefined
  const body = raw as Record<string, unknown>
  for (const key of ['code', 'status_code', 'statusCode'] as const) {
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
  ...(parts.cause === undefined ? {} : { cause: parts.cause })
})

/**
 * 把 judge 的失败结论补成完整的 `AmagiError`。
 *
 * 平台业务码与文案由 runtime 统一从原始响应提取（A3），judge 只管分类。
 * @param verdict - judge 的结论
 * @param res - 拿到的原始响应
 * @param decoded - decode 之后的响应体
 * @param debug - 是否把原始响应放进 `error.raw`
 * @returns 错误载体
 */
const fromVerdict = (verdict: JudgeVerdict, res: RawResponse, decoded: unknown, debug: boolean): AmagiError => {
  const platformCode = extractPlatformCode(decoded)
  const platformMessage = extractPlatformMessage(decoded)
  return makeError({
    kind: verdict.kind ?? 'unknown',
    code: verdict.code ?? 'PLATFORM_ERROR',
    message: platformMessage,
    retryable: verdict.retryable,
    ...(platformCode === undefined && platformMessage === undefined
      ? {}
      : { platform: { code: platformCode ?? '', ...(platformMessage === undefined ? {} : { message: platformMessage }) } }),
    http: { status: res.status, ...(res.statusText === undefined ? {} : { statusText: res.statusText }) },
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
  const signer = signers?.[decl]
  if (!signer) throw new Error(`未注册的签名器：'${decl}'`)
  return signer
}

/** 一个请求分片的结局 */
type PartOutcome = { ok: true; value: unknown } | { ok: false; error: AmagiError }

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
  def: EndpointDef<TParams, TData>,
  input: unknown,
  options: ExecuteOptions
): Promise<AmagiResult<TData>> => {
  const now = options.now ?? Date.now
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
    const ctx: EndpointCtx = def.prepare ? { ...options.ctx, ...(await def.prepare(options.ctx)) } : options.ctx

    stage = 'build'
    if (!def.build) throw new Error(`端点 ${def.name} 既没有 build 也没有 compute`)

    stage = 'sign'
    const signer = resolveSigner(def.sign, options.signers)
    const judge = def.judge ?? options.judge

    /**
     * 跑完一个请求分片：send → decode → judge。
     *
     * 刻意**不在这里 catch** —— 传输失败与 decode 崩溃都让它往外抛，
     * 由管线唯一的那处 catch 归因。
     * @param spec - 请求描述
     * @param partReason - 这次请求在 trace 里的来源
     * @returns 这个分片的结局
     */
    const runSpec = async (spec: RequestSpec, partReason: TraceReason): Promise<PartOutcome> => {
      stage = 'send'
      const res = await ctx.send(spec, partReason)

      stage = 'decode'
      const decoded = def.decode ? def.decode(res.body, res) : res.body

      stage = 'judge'
      const verdict = judge ? judge(decoded, { status: res.status }) : { ok: res.status >= 200 && res.status < 300 }
      if (!verdict.ok) return { ok: false, error: fromVerdict(verdict, res, decoded, debug) }
      return { ok: true, value: decoded }
    }

    // 翻页分支必须在首次 build / sign **之前**：不然会白签一次名，
    // 而快手那类带可变状态的签名器会因此被推进一格（A10）
    if (def.paginate) {
      const paged = await runPaginated(def.paginate, params, async (pageParams, pageReason) => {
        stage = 'build'
        const pageBuilt = def.build?.(pageParams, ctx)
        const pageSpecs = Array.isArray(pageBuilt) ? pageBuilt : [pageBuilt as RequestSpec]
        if (pageSpecs.length !== 1) throw new Error(`分页端点 ${def.name} 的 build 必须只返回一个请求`)

        stage = 'sign'
        // 每页都重新签名：签名器在这里被再调一次，不是复用首页的结果
        const pageSpec = signer ? await signer(pageSpecs[0], ctx) : pageSpecs[0]
        return runSpec(pageSpec, pageReason)
      })
      if (!paged.ok) return failWith(paged.error)

      stage = 'normalize'
      return succeed(def.normalize ? def.normalize(paged.value, params) : (paged.value as TData))
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
    let outcomes: PartOutcome[]
    if (tolerate) {
      // allSettled 而不是 .catch()：既让失败分片不炸掉整体，又不引入第二处 catch
      const settled = await Promise.allSettled(signed.map((spec) => runSpec(spec, reason)))
      outcomes = settled.map((r) => (r.status === 'fulfilled' ? r.value : { ok: false, error: classifyThrown(r.reason, 'send') }))
      if (outcomes.every((o) => !o.ok)) return failWith((outcomes[0] as { ok: false; error: AmagiError }).error)
    } else {
      outcomes = await Promise.all(signed.map((spec) => runSpec(spec, reason)))
      const firstFailure = outcomes.find((o): o is { ok: false; error: AmagiError } => !o.ok)
      if (firstFailure) return failWith(firstFailure.error)
    }

    stage = 'normalize'
    const decodedValue = isMulti ? outcomes.map((o) => (o.ok ? o.value : undefined)) : (outcomes[0] as { ok: true; value: unknown }).value

    return succeed(def.normalize ? def.normalize(decodedValue, params) : (decodedValue as TData))
  } catch (cause) {
    return failWith(classifyThrown(cause, stage))
  }
}
