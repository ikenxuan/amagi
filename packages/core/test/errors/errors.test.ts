import type { AmagiError } from 'amagi/contracts/error'
import type { AmagiMeta } from 'amagi/contracts/meta'
import { SUCCESS_MESSAGE } from 'amagi/contracts/result'
import type { AmagiFailure, AmagiResult, AmagiSuccess } from 'amagi/contracts/result'
import { ApiError, handleError, ValidationError } from 'amagi/utils/errors'
import { createErrorResponse, createSuccessResponse } from 'amagi/validation'
import { describe, expect, it } from 'vitest'
import zod from 'zod'

/** 测试用的最小 meta（AmagiMeta 的全部必填字段） */
const META: AmagiMeta = {
  requestId: 'x',
  clientId: 'y',
  platform: 'douyin',
  endpoint: 't',
  attempts: 1,
  durationMs: 0
}

describe('ApiError', () => {
  it('默认 code 500、platform unknown', () => {
    const e = new ApiError('boom')
    expect(e.code).toBe(500)
    expect(e.platform).toBe('unknown')
    expect(e.name).toBe('ApiError')
    expect(e).toBeInstanceOf(Error)
  })

  it('code 与 platform 可自定义且只读', () => {
    const e = new ApiError('boom', 429, 'douyin')
    expect(e.code).toBe(429)
    expect(e.platform).toBe('douyin')
  })

  it('message 保留', () => {
    expect(new ApiError('specific message').message).toBe('specific message')
  })
})

describe('ValidationError', () => {
  it('携带字段级错误列表', () => {
    const e = new ValidationError('参数验证失败', [{ field: 'a', message: 'bad' }], '/api/x')
    expect(e.name).toBe('ValidationError')
    expect(e.errors).toEqual([{ field: 'a', message: 'bad' }])
    expect(e.requestPath).toBe('/api/x')
  })

  it('fromZodError 把 issues 摊平为 field / message', () => {
    const schema = zod.object({ a: zod.string(), b: zod.object({ c: zod.number() }) })
    let zodError: zod.ZodError | undefined
    try {
      schema.parse({ b: { c: 'x' } })
    } catch (error) {
      zodError = error as zod.ZodError
    }

    const e = ValidationError.fromZodError(zodError!, '/api/y')
    expect(e.message).toBe('参数验证失败')
    expect(e.requestPath).toBe('/api/y')
    expect(e.errors.map((i) => i.field).sort()).toEqual(['a', 'b.c'])
  })

  it('fromZodError 用点号拼接嵌套路径', () => {
    const schema = zod.object({ x: zod.object({ y: zod.object({ z: zod.string() }) }) })
    let zodError: zod.ZodError | undefined
    try {
      schema.parse({ x: { y: {} } })
    } catch (error) {
      zodError = error as zod.ZodError
    }
    expect(ValidationError.fromZodError(zodError!).errors[0].field).toBe('x.y.z')
  })
})

describe('handleError', () => {
  it('ValidationError -> 400 并带 errors', () => {
    const out = handleError(new ValidationError('bad', [{ field: 'a', message: 'm' }], '/p'))
    expect(out).toEqual({
      code: 400,
      message: 'bad',
      data: null,
      errors: [{ field: 'a', message: 'm' }],
      requestPath: '/p'
    })
  })

  it('ValidationError 自身无 requestPath 时回落到入参', () => {
    const out = handleError(new ValidationError('bad', []), '/fallback')
    expect(out.requestPath).toBe('/fallback')
  })

  it('ApiError -> 保留自身 code 与 platform', () => {
    const out = handleError(new ApiError('boom', 429, 'douyin'), '/p')
    expect(out).toEqual({ code: 429, message: 'boom', data: null, platform: 'douyin', requestPath: '/p' })
  })

  it('ZodError -> 转成 ValidationError 后返回 400', () => {
    let zodError: unknown
    try {
      zod.object({ a: zod.string() }).parse({})
    } catch (error) {
      zodError = error
    }

    const out = handleError(zodError, '/p')
    expect(out.code).toBe(400)
    expect(out.errors?.[0].field).toBe('a')
  })

  it.each([
    ['普通 Error', new Error('plain'), 'plain'],
    ['字符串', 'just a string', '未知错误'],
    ['null', null, '未知错误'],
    ['undefined', undefined, '未知错误'],
    ['数字', 42, '未知错误'],
    ['普通对象', { message: 'not an Error' }, '未知错误']
  ])('%s -> 500 且 message 为 %s', (_label, input, message) => {
    const out = handleError(input)
    expect(out.code).toBe(500)
    expect(out.message).toBe(message)
    expect(out.data).toBeNull()
  })

  it('data 字段恒为 null，不透传原始响应', () => {
    expect(handleError(new ApiError('x', 500)).data).toBeNull()
  })
})

describe('createSuccessResponse', () => {
  it('返回 AmagiSuccess<T>：结构为 success / data / message / meta，无顶层 code', () => {
    const out: AmagiSuccess<{ a: number }> = createSuccessResponse({ a: 1 }, META, 'ok')
    expect(out).toEqual({ success: true, data: { a: 1 }, message: 'ok', meta: META })
    expect(Object.keys(out).sort()).toEqual(['data', 'message', 'meta', 'success'])
    expect('code' in out).toBe(false)
    expect('error' in out).toBe(false)
  })

  it('message 缺省为 SUCCESS_MESSAGE，meta 原样透传', () => {
    const out: AmagiSuccess<null> = createSuccessResponse(null, META)
    expect(out.message).toBe(SUCCESS_MESSAGE)
    expect(out.meta).toEqual(META)
  })
})

describe('createErrorResponse', () => {
  it('返回 AmagiFailure：结构为 success / error / message / meta，无 data 与顶层 code', () => {
    const err: AmagiError = {
      kind: 'unavailable',
      code: 'PLATFORM_UNAVAILABLE',
      message: '平台服务暂时不可用',
      retryable: true,
      http: { status: 503 }
    }
    const out: AmagiFailure = createErrorResponse(err, META)
    expect(out).toEqual({ success: false, error: err, message: '平台服务暂时不可用', meta: META })
    expect(Object.keys(out).sort()).toEqual(['error', 'message', 'meta', 'success'])
    expect('data' in out).toBe(false)
    expect('code' in out).toBe(false)
  })

  it('message 等价于 error.message，error 引用原样保留', () => {
    const err: AmagiError = { kind: 'validation', code: 'PARAM_INVALID', message: '参数不合法', retryable: false }
    const out: AmagiFailure = createErrorResponse(err, META)
    expect(out.message).toBe('参数不合法')
    expect(out.error).toBe(err)
  })
})

describe('Result 判别', () => {
  it('success 字段可用于收窄', () => {
    const results: AmagiResult<number>[] = [
      createSuccessResponse(1, META),
      createErrorResponse({ kind: 'auth', code: 'COOKIE_EXPIRED', message: '登录状态已失效', retryable: false }, META)
    ]
    const successes = results.filter((r) => r.success)
    const failures = results.filter((r) => !r.success)

    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(1)
    // 收窄后 data / error 均可读
    expect(successes[0]?.data).toBe(1)
    expect(failures[0]?.error.code).toBe('COOKIE_EXPIRED')
  })
})
