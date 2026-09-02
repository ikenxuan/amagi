import { ApiError, handleError, ValidationError } from 'amagi/utils/errors'
import { createErrorResponse, createSuccessResponse } from 'amagi/validation'
import { describe, expect, it } from 'vitest'
import zod from 'zod'

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
  it('结构为 success / data / message / code / error', () => {
    const out = createSuccessResponse({ a: 1 }, 'ok')
    expect(out).toEqual({ success: true, data: { a: 1 }, message: 'ok', code: 200, error: undefined })
  })

  it('code 可自定义', () => {
    expect(createSuccessResponse(null, 'ok', 201).code).toBe(201)
  })
})

describe('createErrorResponse', () => {
  it('结构为 success / error / message / code / data', () => {
    const err = { code: 'X', data: null, amagiError: { errorDescription: 'd', requestType: 't', requestUrl: 'u' }, amagiMessage: 'm' }
    const out = createErrorResponse(err as never, 'failed')
    expect(out).toEqual({ success: false, error: err, message: 'failed', code: 500, data: undefined })
  })

  it('code 与 data 可自定义', () => {
    const out = createErrorResponse({} as never, 'failed', 404, { raw: 1 })
    expect(out.code).toBe(404)
    expect(out.data).toEqual({ raw: 1 })
  })
})

describe('Result 判别', () => {
  it('success 字段可用于收窄', () => {
    const results = [createSuccessResponse(1, 'ok'), createErrorResponse({} as never, 'bad')]
    const successes = results.filter((r) => r.success)
    const failures = results.filter((r) => !r.success)

    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(1)
  })
})
