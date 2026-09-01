import type { AmagiError, AmagiErrorCode, ErrorKind, Judge, JudgeVerdict, ValidationIssue } from 'amagi/contracts/error'
import type { AmagiMeta, RequestTrace, TraceReason } from 'amagi/contracts/meta'
import type { Platform } from 'amagi/contracts/platform'
import type { AmagiFailure, AmagiResult, AmagiSuccess } from 'amagi/contracts/result'
/**
 * contracts/ 的类型层契约（由 `pnpm test:types` 运行）。
 *
 * 这些断言是 v7 契约层的编译期防线：契约类型的形状一旦被改坏，
 * 这里立刻是类型错误，而不是等到某个平台端点搬迁时才炸。
 */
import { describe, expectTypeOf, it } from 'vitest'

describe('contracts/platform', () => {
  it('Platform 恰好是四个平台名的联合', () => {
    expectTypeOf<Platform>().toEqualTypeOf<'douyin' | 'bilibili' | 'kuaishou' | 'xiaohongshu'>()
  })
})

describe('contracts/error', () => {
  it('ErrorKind 恰好是 12 个成员的联合', () => {
    expectTypeOf<ErrorKind>().toEqualTypeOf<
      | 'validation'
      | 'auth'
      | 'rate_limit'
      | 'risk'
      | 'not_found'
      | 'forbidden'
      | 'unavailable'
      | 'network'
      | 'timeout'
      | 'parse'
      | 'internal'
      | 'unknown'
    >()
  })

  it('AmagiError 的四个字段是必填，其余可选', () => {
    expectTypeOf<AmagiError>().toHaveProperty('kind').toEqualTypeOf<ErrorKind>()
    expectTypeOf<AmagiError>().toHaveProperty('code').toEqualTypeOf<AmagiErrorCode>()
    expectTypeOf<AmagiError>().toHaveProperty('message').toEqualTypeOf<string>()
    expectTypeOf<AmagiError>().toHaveProperty('retryable').toEqualTypeOf<boolean>()
    expectTypeOf<Required<Pick<AmagiError, 'kind' | 'code' | 'message' | 'retryable'>>>().toEqualTypeOf<
      Pick<AmagiError, 'kind' | 'code' | 'message' | 'retryable'>
    >()
  })

  it('ValidationIssue 的 path / message 必填', () => {
    expectTypeOf<ValidationIssue>().toEqualTypeOf<{ path: string; message: string; received?: unknown }>()
  })

  it('Judge 接受 (raw, http) 并返回 JudgeVerdict', () => {
    expectTypeOf<Judge>().parameters.toEqualTypeOf<[unknown, { status: number }]>()
    expectTypeOf<Judge>().returns.toEqualTypeOf<JudgeVerdict>()
  })
})

describe('contracts/meta', () => {
  it('TraceReason 恰好覆盖五个取值', () => {
    expectTypeOf<TraceReason>().toEqualTypeOf<'initial' | 'retry' | 'page' | 'segment' | 'prepare'>()
  })

  it('AmagiMeta 只有 trace 是可选字段', () => {
    expectTypeOf<keyof AmagiMeta>().toEqualTypeOf<'requestId' | 'clientId' | 'platform' | 'endpoint' | 'durationMs' | 'attempts' | 'trace'>()
    expectTypeOf<Required<Omit<AmagiMeta, 'trace'>>>().toEqualTypeOf<Omit<AmagiMeta, 'trace'>>()
    expectTypeOf<AmagiMeta['platform']>().toEqualTypeOf<Platform>()
    expectTypeOf<AmagiMeta['trace']>().toEqualTypeOf<RequestTrace[] | undefined>()
  })

  it('RequestTrace 的 reason 必填，status / retryOf 可选', () => {
    expectTypeOf<RequestTrace>().toHaveProperty('reason').toEqualTypeOf<TraceReason>()
    expectTypeOf<Required<Omit<RequestTrace, 'status' | 'retryOf'>>>().toEqualTypeOf<Omit<RequestTrace, 'status' | 'retryOf'>>()
  })
})

describe('contracts/result', () => {
  it('成功分支的键集合里没有 error', () => {
    expectTypeOf<keyof AmagiSuccess<number>>().toEqualTypeOf<'success' | 'data' | 'message' | 'meta'>()
    // @ts-expect-error 成功分支不声明 error 键
    expectTypeOf<AmagiSuccess<number>>().toHaveProperty('error')
  })

  it('失败分支的键集合里没有 data', () => {
    expectTypeOf<keyof AmagiFailure>().toEqualTypeOf<'success' | 'error' | 'message' | 'meta'>()
    // @ts-expect-error 失败分支不声明 data 键
    expectTypeOf<AmagiFailure>().toHaveProperty('data')
  })

  it('success 是判别键，收窄后两侧字段互斥可用', () => {
    const r = {} as AmagiResult<{ id: string }>
    if (r.success) {
      expectTypeOf(r.data).toEqualTypeOf<{ id: string }>()
      expectTypeOf(r).toEqualTypeOf<AmagiSuccess<{ id: string }>>()
    } else {
      expectTypeOf(r.error).toEqualTypeOf<AmagiError>()
      expectTypeOf(r).toEqualTypeOf<AmagiFailure>()
    }
  })

  it('信封顶层没有 code 字段（v6 的 HTTP 码与平台业务码混用点）', () => {
    expectTypeOf<keyof AmagiResult<number>>().toEqualTypeOf<'success' | 'message' | 'meta'>()
  })
})
