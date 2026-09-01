import type { AmagiErrorCode } from '../contracts/error'
import type { RequestTrace, TraceReason } from '../contracts/meta'

/**
 * `RequestTrace` 收集器。
 *
 * 一次逻辑调用配一个收集器，transport 每发一次请求就在上面登记一条。
 * 它同时是 `AmagiMeta.attempts` 的唯一来源 —— **`attempts` 恒等于登记条数**，
 * 这个不变式由构造保证（每条登记都 +1），所以「一次调用打了 16 个请求」
 * 这种 A4 式的重试叠乘不可能再被藏起来。
 *
 * 明细是否随信封带出由 `enabled` 决定（对应 client 的 trace 开关），
 * 但**计数与登记始终发生**，否则 `attempts` 就会和明细对不上。
 */

/** 开一条 trace 记录时能确定的信息 */
export interface TraceEntryDraft {
  /** 实际请求的 URL（含签名参数） */
  url: string
  /** HTTP 方法 */
  method: string
  /** 这次请求为什么会发出 */
  reason: TraceReason
  /** `reason === 'retry'` 时，被重试的那次失败的错误码 */
  retryOf?: AmagiErrorCode
}

/** 一条请求结束时才知道的信息 */
export interface TraceEntryOutcome {
  /** 平台返回的状态码；请求未发出（DNS 失败等）时不填 */
  status?: number
}

/** 收集器的构造选项 */
export interface TraceCollectorOptions {
  /** 是否把明细随信封带出。默认 `false`（只计数，不带明细） */
  enabled?: boolean
  /** 时钟，便于测试注入。默认 `Date.now` */
  now?: () => number
}

/** `RequestTrace` 收集器 */
export class TraceCollector {
  private readonly enabled: boolean
  private readonly now: () => number
  private readonly records: RequestTrace[] = []

  /**
   * @param options - 构造选项
   */
  constructor(options: TraceCollectorOptions = {}) {
    this.enabled = options.enabled ?? false
    this.now = options.now ?? Date.now
  }

  /** 实际发出的请求数，含重试、分页、分段与 prepare 前置请求 */
  get attempts(): number {
    return this.records.length
  }

  /** 全部明细，按发出顺序。与 {@link attempts} 恒等长 */
  get entries(): readonly RequestTrace[] {
    return this.records
  }

  /**
   * 登记一次请求的开始。
   *
   * 调用即计数 —— 即使这次请求最终失败也算一次 attempt。
   * @param draft - 开始时已知的信息
   * @returns 收尾函数，请求结束后调用它补上状态码与耗时
   */
  begin(draft: TraceEntryDraft): (outcome?: TraceEntryOutcome) => RequestTrace {
    const startedAt = this.now()
    const record: RequestTrace = {
      url: draft.url,
      method: draft.method,
      durationMs: 0,
      reason: draft.reason,
      ...(draft.retryOf === undefined ? {} : { retryOf: draft.retryOf })
    }
    this.records.push(record)

    return (outcome?: TraceEntryOutcome) => {
      record.durationMs = this.now() - startedAt
      if (outcome?.status !== undefined) record.status = outcome.status
      return record
    }
  }

  /**
   * 取供 `AmagiMeta.trace` 使用的快照
   * @returns 开启时返回明细副本；未开启时返回 `undefined`（信封里就没有 `trace` 键）
   */
  snapshot(): RequestTrace[] | undefined {
    if (!this.enabled) return undefined
    return this.records.map((r) => ({ ...r }))
  }

  /**
   * 按 `reason` 统计条数，用于断言与诊断
   * @returns `reason` → 条数
   */
  countByReason(): Partial<Record<TraceReason, number>> {
    const out: Partial<Record<TraceReason, number>> = {}
    for (const r of this.records) out[r.reason] = (out[r.reason] ?? 0) + 1
    return out
  }
}
