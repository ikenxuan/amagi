import type { AmagiError, AmagiErrorCode, ErrorKind, Judge, JudgeVerdict, ValidationIssue } from 'amagi/contracts/error'
import type { Platform } from 'amagi/contracts/platform'
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
