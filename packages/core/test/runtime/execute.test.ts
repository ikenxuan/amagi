import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { EndpointCtx } from 'amagi/contracts/endpoint'
import { defineEndpoint, type } from 'amagi/contracts/endpoint'
import { AmagiHeaders, type RawResponse, type RequestSpec } from 'amagi/contracts/request'
import { createEventBus } from 'amagi/runtime/events'
import {
  classifyThrown,
  execute,
  extractPlatformCode,
  extractPlatformMessage,
  SEGMENT_CONCURRENCY,
  SOLVE_ROUNDS
} from 'amagi/runtime/execute'
import { TransportError } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
/**
 * runtime/execute 的契约。
 *
 * 三条判据：唯一一处 catch；任何异常映射为 kind: 'internal' 且 cause 保留；
 * 永不 reject（让每个环节各抛一次）。这三条一起替掉 v6 的形状 ——
 * 4 个 internal.ts 各写一个 try/catch，catch 里 `throw new Error(字符串)`，
 * 声明返回 Result 却抛，结构化信息全丢，调用方必须同时处理返回值与异常。
 */
import { describe, expect, it } from 'vitest'
import zod from 'zod'

/** 造一个响应 */
const responseOf = (body: unknown, status = 200): RawResponse => ({
  status,
  statusText: status === 200 ? 'OK' : String(status),
  headers: new AmagiHeaders({ 'Content-Type': 'application/json' }),
  body,
  durationMs: 1,
  url: 'https://example.com/a'
})

/** 造一个上下文，`send` 可注入 */
const ctxOf = (send: EndpointCtx['send']): EndpointCtx => ({
  clientId: 'client-1',
  platform: 'douyin',
  cookie: 'ck=1',
  userAgent: 'ua/1',
  requestConfig: {},
  send
})

/** 恒定返回同一个响应体的 send，并记录收到的 spec */
const sendOf = (body: unknown, status = 200) => {
  const specs: RequestSpec[] = []
  return {
    specs,
    send: (async (spec: RequestSpec) => {
      specs.push(spec)
      return responseOf(body, status)
    }) as EndpointCtx['send']
  }
}

/** 最简端点：一个必填参数，GET 一次，judge 恒成功 */
const simple = defineEndpoint({
  name: 'douyin.simple',
  route: '/__simple',
  params: zod.object({ aweme_id: zod.string().min(1, '作品 ID 不能为空') }),
  build: (p) => ({ method: 'GET', url: `https://example.com/a?id=${p.aweme_id}` }),
  response: type<{ ok: boolean }>()
})

describe('runtime/execute - 唯一一处 catch（判据 ①）', () => {
  it('源码里 catch 子句恰好一处', () => {
    const source = readFileSync(fileURLToPath(new URL('../../src/runtime/execute.ts', import.meta.url)), 'utf8')
    const clauses = source.match(/\}\s*catch\s*\(/g) ?? []
    expect(clauses).toHaveLength(1)
  })

  it('源码里没有 .catch( 兜底（那也是一处 catch）', () => {
    const source = readFileSync(fileURLToPath(new URL('../../src/runtime/execute.ts', import.meta.url)), 'utf8')
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/\.catch\s*\(/)
  })
})

describe('runtime/execute - 正常路径', () => {
  it.each([302, 400, 503])('HTTP %s 不能被 body code 0 或成功 judge 覆盖', async (status) => {
    const result = await execute(
      simple,
      { aweme_id: '1' },
      {
        ctx: ctxOf(sendOf({ code: 0 }, status).send),
        judge: () => ({ ok: true })
      }
    )
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.http?.status).toBe(status)
    expect(result.error.platform?.code).toBe(0)
  })

  it('HTTP 失败仍保留 judge 的业务归因与响应头挑战', async () => {
    const result = await execute(
      simple,
      { aweme_id: '1' },
      {
        ctx: ctxOf(async () => ({ ...responseOf({ code: 0 }, 403), headers: new AmagiHeaders({ 'x-challenge': 'synthetic' }) })),
        judge: (_body, http) =>
          http.headers?.get('x-challenge') === 'synthetic' ? { ok: false, kind: 'risk', code: 'RISK_CONTROL' } : { ok: true },
        challenge: (_body, http) => ({ url: 'https://example.com/challenge', type: http?.headers?.get('x-challenge') })
      }
    )
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.code).toBe('RISK_CONTROL')
    expect(result.error.http?.status).toBe(403)
    expect(result.error.challenge).toEqual({ url: 'https://example.com/challenge', type: 'synthetic' })
  })
  it('产出成功信封：data / message / meta 齐全，没有 error 键', async () => {
    const h = sendOf({ ok: true })
    const r = await execute(simple, { aweme_id: '7123' }, { ctx: ctxOf(h.send), requestId: () => 'req-x' })

    expect(r.success).toBe(true)
    expect(r).toEqual({
      success: true,
      data: { ok: true },
      message: '获取成功',
      meta: {
        requestId: 'req-x',
        clientId: 'client-1',
        platform: 'douyin',
        endpoint: 'douyin.simple',
        durationMs: expect.any(Number),
        attempts: 0
      }
    })
    expect('error' in r).toBe(false)
  })

  it('校验后的参数才进 build', async () => {
    const h = sendOf({ ok: true })
    await execute(simple, { aweme_id: '7123', 多余字段: 1 }, { ctx: ctxOf(h.send) })
    expect(h.specs[0].url).toBe('https://example.com/a?id=7123')
  })

  it('compute 端点不发请求', async () => {
    const bvToAv = defineEndpoint({
      name: 'bilibili.bvToAv',
      route: '/__bv_to_av',
      params: zod.object({ bvid: zod.string().regex(/^BV1[0-9A-Za-z]{9}$/, 'BV 号格式不正确') }),
      compute: (p) => ({ aid: p.bvid.length })
    })
    const h = sendOf({ never: true })

    const r = await execute(bvToAv, { bvid: 'BV1xx411c7mD' }, { ctx: ctxOf(h.send) })

    expect(r.success && r.data).toEqual({ aid: 12 })
    expect(h.specs).toHaveLength(0)
  })

  it('normalize 能裁剪整形', async () => {
    const def = defineEndpoint({
      name: 'douyin.normalized',
      route: '/__normalized',
      params: zod.object({}),
      build: () => ({ method: 'GET', url: 'https://example.com/a' }),
      normalize: (decoded) => ({ title: (decoded as { t: string }).t.toUpperCase() })
    })
    const h = sendOf({ t: 'hi' })

    const r = await execute(def, {}, { ctx: ctxOf(h.send) })
    expect(r.success && r.data).toEqual({ title: 'HI' })
  })
})

describe('runtime/execute - 永不 reject：每个环节各抛一次（判据 ③）', () => {
  const boom = (stage: string) => () => {
    throw new Error(`${stage} 炸了`)
  }

  it('validate 阶段：zod 校验失败不抛，返回 validation 信封并带 issues', async () => {
    const h = sendOf({ ok: true })
    const r = await execute(simple, { aweme_id: '' }, { ctx: ctxOf(h.send) })

    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.kind).toBe('validation')
    expect(r.error.code).toBe('PARAM_INVALID')
    expect(r.error.retryable).toBe(false)
    expect(r.error.issues).toEqual([{ path: 'aweme_id', message: '作品 ID 不能为空' }])
    expect(r.message).toBe('作品 ID 不能为空')
    expect(h.specs).toHaveLength(0)
    // 与成功侧的 `'error' in r === false` 对称：真管线产出的失败信封运行时没有 data 键
    // （9.2 给两支各加的 `?: undefined` 对侧键只在类型层，运行时形状一个字节没变）
    expect('data' in r).toBe(false)
  })

  it('validate 阶段：缺必填字段时 path 指向该字段', async () => {
    const r = await execute(simple, {}, { ctx: ctxOf(sendOf({}).send) })
    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.issues?.[0].path).toBe('aweme_id')
  })

  it('compute 阶段抛错 → internal，cause 保留', async () => {
    const def = defineEndpoint({
      name: 'bilibili.badCompute',
      route: '/__bad_compute',
      params: zod.object({}),
      compute: boom('compute')
    })
    const r = await execute(def, {}, { ctx: ctxOf(sendOf({}).send) })

    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.kind).toBe('internal')
    expect(r.error.code).toBe('INTERNAL_ERROR')
    expect(r.error.message).toContain('compute 阶段')
    expect(r.error.cause).toBeInstanceOf(Error)
    expect((r.error.cause as Error).message).toBe('compute 炸了')
  })

  it.each([
    ['prepare', { prepare: async () => boom('prepare')() }],
    ['build', { build: boom('build') }],
    ['sign', { build: () => ({ method: 'GET' as const, url: 'https://example.com/a' }), sign: boom('sign') }],
    ['decode', { build: () => ({ method: 'GET' as const, url: 'https://example.com/a' }), decode: boom('decode') }],
    ['judge', { build: () => ({ method: 'GET' as const, url: 'https://example.com/a' }), judge: boom('judge') }],
    ['normalize', { build: () => ({ method: 'GET' as const, url: 'https://example.com/a' }), normalize: boom('normalize') }]
  ])('%s 阶段抛错也不 reject，收口成失败信封且 cause 保留', async (stageName, slots) => {
    const def = defineEndpoint({
      name: 'douyin.boom',
      route: '/__boom',
      params: zod.object({}),
      ...(slots as Record<string, unknown>)
    })
    const h = sendOf({ ok: true })

    const r = await execute(def, {}, { ctx: ctxOf(h.send) })

    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.cause).toBeInstanceOf(Error)
    expect((r.error.cause as Error).message).toBe(`${stageName} 炸了`)
    // decode 阶段单独归到 parse / DECODE_FAILED，其余是 internal
    if (stageName === 'decode') {
      expect(r.error.kind).toBe('parse')
      expect(r.error.code).toBe('DECODE_FAILED')
    } else {
      expect(r.error.kind).toBe('internal')
      expect(r.error.code).toBe('INTERNAL_ERROR')
      expect(r.error.message).toContain(`${stageName} 阶段`)
    }
  })

  it('send 阶段的 TransportError 归为 network，不落进 internal', async () => {
    const def = defineEndpoint({
      name: 'douyin.netFail',
      route: '/__net_fail',
      params: zod.object({}),
      build: () => ({ method: 'GET', url: 'https://example.com/a' })
    })
    const te = new TransportError({
      message: '网络请求失败 [ECONNRESET]',
      kind: 'network',
      code: 'NETWORK_ERROR',
      errno: 'ECONNRESET',
      attempts: 4,
      url: 'https://example.com/a'
    })

    const r = await execute(
      def,
      {},
      {
        ctx: ctxOf(async () => {
          throw te
        })
      }
    )

    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.kind).toBe('network')
    expect(r.error.code).toBe('NETWORK_ERROR')
    expect(r.error.retryable).toBe(true)
    expect(r.error.platform).toEqual({ code: 'ECONNRESET' })
    expect(r.error.cause).toBe(te)
  })

  it('send 抛非 Error 的东西也不 reject', async () => {
    const def = defineEndpoint({
      name: 'douyin.throwString',
      route: '/__throw_string',
      params: zod.object({}),
      build: () => ({ method: 'GET', url: 'https://example.com/a' })
    })

    const r = await execute(
      def,
      {},
      {
        ctx: ctxOf(async () => {
          throw 'plain string'
        })
      }
    )

    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.kind).toBe('internal')
    expect(r.error.message).toContain('plain string')
    expect(r.error.cause).toBe('plain string')
  })

  it('既没有 build 也没有 compute 的端点 → internal，而不是崩', async () => {
    const def = defineEndpoint({ name: 'douyin.empty', route: '/__empty', params: zod.object({}) })
    const r = await execute(def, {}, { ctx: ctxOf(sendOf({}).send) })

    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.kind).toBe('internal')
    expect(r.error.message).toContain('既没有 build 也没有 compute')
  })

  it('sign 声明了未注册的签名器名 → internal', async () => {
    const def = defineEndpoint({
      name: 'douyin.badSigner',
      route: '/__bad_signer',
      params: zod.object({}),
      build: () => ({ method: 'GET', url: 'https://example.com/a' }),
      sign: 'a_bogus'
    })

    const r = await execute(def, {}, { ctx: ctxOf(sendOf({}).send), signers: {} })

    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.kind).toBe('internal')
    expect(r.error.message).toContain("未注册的签名器：'a_bogus'")
  })
})

describe('runtime/execute - judge 失败与 A3 的文案提取', () => {
  const withJudge = defineEndpoint({
    name: 'bilibili.judged',
    route: '/__judged',
    params: zod.object({}),
    build: () => ({ method: 'GET', url: 'https://example.com/a' }),
    judge: (raw) => {
      const body = raw as { code?: number }
      if (body.code === 0) return { ok: true }
      if (body.code === -101) return { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED' }
      return { ok: false, kind: 'unknown', code: 'PLATFORM_ERROR' }
    }
  })

  it('平台文案优先于兜底文案（修 A3：v6 只剩兜底）', async () => {
    const h = sendOf({ code: -101, message: '账号未登录' })
    const r = await execute(withJudge, {}, { ctx: ctxOf(h.send) })

    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.message).toBe('账号未登录')
    expect(r.message).toBe('账号未登录')
    expect(r.error.platform).toEqual({ code: -101, message: '账号未登录' })
  })

  it('平台没给文案时用兜底文案', async () => {
    const h = sendOf({ code: -101 })
    const r = await execute(withJudge, {}, { ctx: ctxOf(h.send) })

    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.message).toBe('登录状态已失效')
    expect(r.error.platform).toEqual({ code: -101 })
  })

  it('http 状态原样进 error.http，与平台业务码分开放', async () => {
    const h = sendOf({ code: -412, message: '请求被拦截' }, 412)
    const r = await execute(withJudge, {}, { ctx: ctxOf(h.send) })

    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.http).toEqual({ status: 412, statusText: '412' })
    expect(r.error.platform?.code).toBe(-412)
  })

  it('retryable 由 kind 推导，judge 可覆盖', async () => {
    const h = sendOf({ code: -101 })
    const r1 = await execute(withJudge, {}, { ctx: ctxOf(h.send) })
    expect(r1.success === false && r1.error.retryable).toBe(false)

    const overriding = defineEndpoint({
      name: 'bilibili.overriding',
      route: '/__overriding',
      params: zod.object({}),
      build: () => ({ method: 'GET', url: 'https://example.com/a' }),
      judge: () => ({ ok: false, kind: 'auth', code: 'COOKIE_EXPIRED', retryable: true })
    })
    const r2 = await execute(overriding, {}, { ctx: ctxOf(h.send) })
    expect(r2.success === false && r2.error.retryable).toBe(true)
  })

  it('debug 开启时 error.raw 带上解码后的响应体，默认不带', async () => {
    const h = sendOf({ code: -101, message: '未登录' })
    const off = await execute(withJudge, {}, { ctx: ctxOf(h.send) })
    const on = await execute(withJudge, {}, { ctx: ctxOf(h.send), debug: true })

    expect(off.success === false && 'raw' in off.error).toBe(false)
    expect(on.success === false && on.error.raw).toEqual({ code: -101, message: '未登录' })
  })

  it('没有 judge 时按 HTTP 2xx 判定', async () => {
    const def = defineEndpoint({
      name: 'douyin.noJudge',
      route: '/__no_judge',
      params: zod.object({}),
      build: () => ({ method: 'GET', url: 'https://example.com/a' })
    })

    const ok = await execute(def, {}, { ctx: ctxOf(sendOf({ a: 1 }, 200).send) })
    const bad = await execute(def, {}, { ctx: ctxOf(sendOf({ a: 1 }, 404).send) })

    expect(ok.success).toBe(true)
    expect(bad.success).toBe(false)
    expect(bad.success === false && bad.error.http?.status).toBe(404)
  })

  it('端点自己的 judge 覆盖平台默认 judge', async () => {
    const def = defineEndpoint({
      name: 'bilibili.protobuf',
      route: '/__protobuf',
      params: zod.object({}),
      build: () => ({ method: 'GET', url: 'https://example.com/a' }),
      judge: () => ({ ok: true })
    })

    const r = await execute(
      def,
      {},
      { ctx: ctxOf(sendOf({ code: -1 }).send), judge: () => ({ ok: false, kind: 'unknown', code: 'PLATFORM_ERROR' }) }
    )
    expect(r.success).toBe(true)
  })
})

describe('runtime/execute - observe 平台旁观者', () => {
  it('每次 send 之后被调一次，拿到响应与当刻的 ctx', async () => {
    const seen: Array<{ header?: string; cookie: string }> = []
    const h = sendOf({ status_code: 0 })

    await execute(
      simple,
      { aweme_id: '1' },
      {
        ctx: ctxOf(h.send),
        observe: (res, ctx) => seen.push({ header: res.headers.get('content-type'), cookie: ctx.cookie })
      }
    )

    expect(seen).toEqual([{ header: 'application/json', cookie: 'ck=1' }])
  })

  it('失败的请求也照样调 —— 它是旁观者，不参与判定', async () => {
    let calls = 0
    const h = sendOf({ code: -1 }, 403)
    const r = await execute(
      simple,
      { aweme_id: '1' },
      {
        ctx: ctxOf(h.send),
        judge: () => ({ ok: false, kind: 'unknown', code: 'PLATFORM_ERROR' }),
        observe: () => calls++
      }
    )

    expect(r.success).toBe(false)
    expect(calls).toBe(1)
  })

  it('重试的每一次都调（3 次重试 = 4 次 observe）', async () => {
    let calls = 0
    const risk = defineEndpoint({
      name: 'douyin.observeRetry',
      route: '/__observe_retry',
      params: zod.object({}),
      build: () => ({ method: 'GET', url: 'https://example.com/a' }),
      judge: () => ({ ok: false, kind: 'risk', code: 'RISK_CONTROL' }),
      retryOn: ['RISK_CONTROL']
    })
    await execute(risk, {}, { ctx: ctxOf(sendOf({ code: -412 }).send), sleep: async () => {}, observe: () => calls++ })

    expect(calls).toBe(4)
  })

  it('不传 observe 时一切照旧', async () => {
    const r = await execute(simple, { aweme_id: '1' }, { ctx: ctxOf(sendOf({ status_code: 0 }).send) })
    expect(r.success).toBe(true)
  })

  it('observe 抛错会被单一 catch 归因为 internal —— 所以实现方必须自己吞', async () => {
    const r = await execute(
      simple,
      { aweme_id: '1' },
      {
        ctx: ctxOf(sendOf({ status_code: 0 }).send),
        observe: () => {
          throw new Error('旁观者炸了')
        }
      }
    )

    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.kind).toBe('internal')
  })
})

describe('runtime/execute - retryOn 退避重试（修 A4 的叠乘）', () => {
  const riskEndpoint = defineEndpoint({
    name: 'bilibili.risk',
    route: '/__risk',
    params: zod.object({}),
    build: () => ({ method: 'GET', url: 'https://example.com/a' }),
    judge: (raw) => {
      const code = (raw as { code?: number }).code
      if (code === -412) return { ok: false, kind: 'risk', code: 'RISK_CONTROL' }
      if (code === 0) return { ok: true }
      return { ok: false, kind: 'unknown', code: 'PLATFORM_ERROR' }
    },
    retryOn: ['RISK_CONTROL']
  })

  it('命中 retryOn 的业务码：退避重试，默认 3 次重试共 4 次请求', async () => {
    const h = sendOf({ code: -412, message: '请求被拦截' })
    const sleeps: number[] = []
    const r = await execute(
      riskEndpoint,
      {},
      {
        ctx: ctxOf(h.send),
        sleep: async (ms) => {
          sleeps.push(ms)
        }
      }
    )

    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.code).toBe('RISK_CONTROL')
      expect(r.error.platform?.code).toBe(-412)
    }
    expect(h.specs).toHaveLength(4) // 1 次初始 + 3 次退避重试
    expect(sleeps).toEqual([1000, 2000, 4000]) // 与 transport 同款退避曲线
  })

  it('第 2 次请求成功时提前返回成功', async () => {
    let n = 0
    const ctx = ctxOf(async () => {
      n += 1
      return responseOf(n === 1 ? { code: -412 } : { code: 0, data: { ok: true } })
    })
    const r = await execute(riskEndpoint, {}, { ctx, sleep: async () => {} })

    expect(r.success).toBe(true)
    expect(n).toBe(2)
  })

  it('未命中 retryOn 的错误码不重试', async () => {
    const h = sendOf({ code: -404, message: '啥都木有' })
    const r = await execute(riskEndpoint, {}, { ctx: ctxOf(h.send), sleep: async () => {} })

    expect(r.success).toBe(false)
    expect(h.specs).toHaveLength(1)
  })

  it('没声明 retryOn 的端点不重试（即使 judge 返回同款错误码）', async () => {
    const plain = defineEndpoint({
      name: 'bilibili.plain',
      route: '/__plain',
      params: zod.object({}),
      build: () => ({ method: 'GET', url: 'https://example.com/a' }),
      judge: () => ({ ok: false, kind: 'risk', code: 'RISK_CONTROL' })
    })
    const h = sendOf({ code: -412 })
    const r = await execute(plain, {}, { ctx: ctxOf(h.send), sleep: async () => {} })

    expect(r.success).toBe(false)
    expect(h.specs).toHaveLength(1)
  })

  it('默认是原样重放：四次请求的 URL 一模一样', async () => {
    const h = sendOf({ code: -412 })
    await execute(riskEndpoint, {}, { ctx: ctxOf(h.send), sleep: async () => {} })

    expect(h.specs).toHaveLength(4)
    expect(new Set(h.specs.map((s) => s.url)).size).toBe(1)
  })

  it('retryFresh: true 时每次重试都重新 build + 重新签名', async () => {
    let builds = 0
    let signs = 0
    const fresh = defineEndpoint({
      name: 'douyin.fresh',
      route: '/__fresh',
      params: zod.object({}),
      // 每次 build 现算一个 token —— 抖音的 msToken 就是这个形态
      build: () => ({ method: 'GET', url: `https://example.com/a?token=${++builds}` }),
      judge: () => ({ ok: false, kind: 'risk', code: 'RISK_CONTROL' }),
      retryOn: ['RISK_CONTROL'],
      retryFresh: true
    })

    const h = sendOf({ code: -412 })
    const r = await execute(
      fresh,
      {},
      {
        ctx: ctxOf(h.send),
        sleep: async () => {},
        signers: {
          stamp: (spec) => {
            signs++
            const url = new URL(spec.url)
            url.searchParams.set('sig', String(signs))
            return { ...spec, url: url.toString() }
          }
        }
      }
    )

    expect(r.success).toBe(false)
    expect(h.specs).toHaveLength(4)
    expect(builds).toBe(4) // 首次 + 3 次重建
    // 四次请求的参数各不相同 —— 这正是 Argus 那类「按单次 token 组判定」需要的
    expect(new Set(h.specs.map((s) => s.url)).size).toBe(4)
  })

  it('retryFresh 端点声明了签名器时，重试也重新签名', async () => {
    const signed: string[] = []
    const fresh = defineEndpoint({
      name: 'douyin.freshSigned',
      route: '/__fresh_signed',
      params: zod.object({}),
      build: () => ({ method: 'GET', url: 'https://example.com/a' }),
      sign: 'stamp',
      judge: () => ({ ok: false, kind: 'risk', code: 'RISK_CONTROL' }),
      retryOn: ['RISK_CONTROL'],
      retryFresh: true
    })

    let n = 0
    const h = sendOf({ code: -412 })
    await execute(
      fresh,
      {},
      {
        ctx: ctxOf(h.send),
        sleep: async () => {},
        signers: {
          stamp: (spec) => {
            const url = new URL(spec.url)
            url.searchParams.set('sig', String(++n))
            signed.push(url.toString())
            return { ...spec, url: url.toString() }
          }
        }
      }
    )

    expect(signed).toHaveLength(4)
    expect(new Set(h.specs.map((s) => s.url)).size).toBe(4)
  })
})

describe('runtime/execute - 多请求聚合与 partial', () => {
  const multi = (partial?: 'tolerate' | 'fail') =>
    defineEndpoint({
      name: 'kuaishou.multi',
      route: '/__multi',
      params: zod.object({ id: zod.string() }),
      build: (p) => [1, 2, 3].map((n) => ({ method: 'GET' as const, url: `https://example.com/${p.id}/${n}`, tag: `part:${n}` })),
      ...(partial === undefined ? {} : { partial }),
      normalize: (parts) => ({ parts })
    })

  it('build 返回数组时并发发送，normalize 收到数组', async () => {
    const h = sendOf({ ok: 1 })
    const r = await execute(multi(), { id: 'u1' }, { ctx: ctxOf(h.send) })

    expect(h.specs.map((s) => s.tag)).toEqual(['part:1', 'part:2', 'part:3'])
    expect(r.success && r.data).toEqual({ parts: [{ ok: 1 }, { ok: 1 }, { ok: 1 }] })
  })

  it('分片派发限额并发：在途不超过 SEGMENT_CONCURRENCY，结果仍按下标收齐', async () => {
    const count = 25
    let inFlight = 0
    let maxInFlight = 0
    const def = defineEndpoint({
      name: 'kuaishou.pool',
      route: '/__pool',
      params: zod.object({}),
      build: () => Array.from({ length: count }, (_, i) => ({ method: 'GET' as const, url: `https://example.com/${i}`, tag: `part:${i}` })),
      normalize: (parts) => ({ parts })
    })
    const r = await execute(
      def,
      {},
      {
        ctx: ctxOf(async (spec) => {
          inFlight += 1
          maxInFlight = Math.max(maxInFlight, inFlight)
          // 后发的先完成：若按完成顺序收齐就会乱序，借此验证按下标收齐
          const index = Number(spec.url.split('/').pop())
          await new Promise((resolve) => setTimeout(resolve, count - index))
          inFlight -= 1
          return responseOf({ index })
        })
      }
    )

    expect(maxInFlight).toBe(SEGMENT_CONCURRENCY)
    expect(r.success).toBe(true)
    if (r.success) {
      expect((r.data as { parts: Array<{ index: number }> }).parts.map((p) => p.index)).toEqual(Array.from({ length: count }, (_, i) => i))
    }
  })

  it('build 返回单元素数组时 normalize 仍收到数组', async () => {
    const def = defineEndpoint({
      name: 'kuaishou.single',
      route: '/__single',
      params: zod.object({}),
      build: () => [{ method: 'GET' as const, url: 'https://example.com/a' }],
      normalize: (parts) => ({ parts })
    })
    const r = await execute(def, {}, { ctx: ctxOf(sendOf({ ok: 1 }).send) })
    expect(r.success && r.data).toEqual({ parts: [{ ok: 1 }] })
  })

  it('partial 缺省（fail）时任一分片失败即整体失败', async () => {
    let n = 0
    const r = await execute(
      multi(),
      { id: 'u1' },
      {
        ctx: ctxOf(async () => {
          n += 1
          if (n === 2) throw new TransportError({ message: '断了', kind: 'network', code: 'NETWORK_ERROR', attempts: 1, url: 'x' })
          return responseOf({ ok: 1 })
        })
      }
    )

    expect(r.success).toBe(false)
    expect(r.success === false && r.error.kind).toBe('network')
  })

  it("partial: 'tolerate' 时失败分片留空，整体仍成功", async () => {
    let n = 0
    const r = await execute(
      multi('tolerate'),
      { id: 'u1' },
      {
        ctx: ctxOf(async () => {
          n += 1
          if (n === 2) throw new TransportError({ message: '断了', kind: 'network', code: 'NETWORK_ERROR', attempts: 1, url: 'x' })
          return responseOf({ ok: n })
        })
      }
    )

    expect(r.success).toBe(true)
    const parts = (r.success && (r.data as { parts: unknown[] }).parts) as unknown[]
    expect(parts).toHaveLength(3)
    expect(parts.filter((p) => p === undefined)).toHaveLength(1)
  })

  it("partial: 'tolerate' 但全部分片都失败时，仍然返回失败信封", async () => {
    const r = await execute(
      multi('tolerate'),
      { id: 'u1' },
      {
        ctx: ctxOf(async () => {
          throw new TransportError({ message: '全断了', kind: 'network', code: 'NETWORK_ERROR', attempts: 1, url: 'x' })
        })
      }
    )

    expect(r.success).toBe(false)
    expect(r.success === false && r.error.kind).toBe('network')
  })

  it('多分片走 reason: segment，单请求走 initial', async () => {
    const tracer = new TraceCollector({ enabled: true })
    const seen: string[] = []
    const ctx = ctxOf(async (_spec, reason) => {
      seen.push(reason ?? 'initial')
      return responseOf({ ok: 1 })
    })

    await execute(multi(), { id: 'u1' }, { ctx, trace: tracer })
    expect(seen).toEqual(['segment', 'segment', 'segment'])

    seen.length = 0
    await execute(simple, { aweme_id: '1' }, { ctx })
    expect(seen).toEqual(['initial'])
  })
})

/**
 * 分段并发上限。
 *
 * 分段数由调用方的入参算出来（弹幕按时长切窗），所以「同时在飞几个」必须与入参解耦，
 * 否则一个大 `duration` 就能把一次调用展开成上千个并发请求。
 */
describe('runtime/execute - 分段并发有上限', () => {
  /** 造一个 n 段的端点 */
  const segmented = (n: number) =>
    defineEndpoint({
      name: 'kuaishou.segmented',
      route: '/__segmented',
      params: zod.object({}),
      partial: 'tolerate' as const,
      build: () => Array.from({ length: n }, (_v, i) => ({ method: 'GET' as const, url: `https://example.com/${i}`, tag: `s${i}` })),
      aggregate: ({ parts }) => ({ parts })
    })

  /** 记录并发峰值的 send：进来 +1、出去 -1，中间让出一次事件循环 */
  const peakTrackingCtx = () => {
    const state = { inFlight: 0, peak: 0, calls: 0 }
    const ctx = ctxOf(async () => {
      state.inFlight += 1
      state.calls += 1
      state.peak = Math.max(state.peak, state.inFlight)
      await new Promise((resolve) => setTimeout(resolve, 0))
      state.inFlight -= 1
      return responseOf({ ok: 1 })
    })
    return { ctx, state }
  }

  it('50 段受共享并发上限约束，但全部发出', async () => {
    const { ctx, state } = peakTrackingCtx()
    const r = await execute(segmented(50), {}, { ctx })

    expect(r.success).toBe(true)
    expect(state.calls).toBe(50)
    expect(state.peak).toBeLessThanOrEqual(SEGMENT_CONCURRENCY)
    expect(state.peak).toBeGreaterThan(1)
  })

  it('段数不超过上限时一次性全发（不引入多余调度）', async () => {
    const { ctx, state } = peakTrackingCtx()
    await execute(segmented(5), {}, { ctx })

    expect(state.calls).toBe(5)
    expect(state.peak).toBe(5)
  })

  it('超上限时结果顺序仍与分段顺序一致', async () => {
    // 故意让后面的段先返回：靠 tag 取序号，序号越大睡得越短
    const ctx = ctxOf(async (spec) => {
      const i = Number(/s(\d+)$/.exec(spec.tag ?? '')?.[1] ?? 0)
      await new Promise((resolve) => setTimeout(resolve, (30 - i) % 7))
      return responseOf({ i })
    })

    const r = await execute(segmented(30), {}, { ctx })
    const parts = r.success ? (r.data as { parts: Array<{ i: number }> }).parts : []

    expect(parts.map((p) => p.i)).toEqual(Array.from({ length: 30 }, (_v, i) => i))
  })

  it('25 段非 tolerate 请求受共享并发上限约束且按输入顺序返回', async () => {
    const def = { ...segmented(25), partial: undefined }
    let inFlight = 0
    let peak = 0
    const result = await execute(
      def,
      {},
      {
        ctx: ctxOf(async (spec) => {
          const i = Number(spec.tag?.slice(1))
          inFlight += 1
          peak = Math.max(peak, inFlight)
          await new Promise((resolve) => setTimeout(resolve, (25 - i) % 5))
          inFlight -= 1
          return responseOf({ i })
        })
      }
    )
    expect(result.success && result.data).toEqual({ parts: Array.from({ length: 25 }, (_, i) => ({ i })) })
    expect(peak).toBe(SEGMENT_CONCURRENCY)
  })

  it('非 tolerate 分片抛错后继续清空队列，全部 settled 后才返回失败', async () => {
    const completed: string[] = []
    const result = await execute(
      { ...segmented(25), partial: undefined },
      {},
      {
        ctx: ctxOf(async (spec) => {
          if (spec.tag === 's0')
            throw new TransportError({ message: '断了', kind: 'network', code: 'NETWORK_ERROR', attempts: 1, url: 'x' })
          await new Promise((resolve) => setTimeout(resolve, 1))
          completed.push(spec.tag!)
          return responseOf({ ok: true })
        })
      }
    )
    expect(result.success).toBe(false)
    expect(result.success === false && result.error.code).toBe('NETWORK_ERROR')
    expect(completed).toHaveLength(24)
    expect(completed).toContain('s24')
  })

  it('早期 decode 失败不被后续成功分片的 judge 阶段覆盖', async () => {
    const cause = new SyntaxError('invalid segment')
    const result = await execute(
      {
        ...segmented(25),
        partial: undefined,
        decode: (body) => {
          if (body === 'bad') throw cause
          return body
        }
      },
      {},
      {
        ctx: ctxOf(async (spec) => {
          if (spec.tag === 's0') return responseOf('bad')
          await new Promise((resolve) => setTimeout(resolve, 1))
          return responseOf({ ok: true })
        })
      }
    )
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.code).toBe('DECODE_FAILED')
    expect(result.error.cause).toBe(cause)
  })

  it('tolerate 全部 decode 失败仍保留解析归因', async () => {
    const result = await execute(
      {
        ...segmented(12),
        decode: () => {
          throw new SyntaxError('invalid segment')
        }
      },
      {},
      { ctx: ctxOf(sendOf('bad').send) }
    )
    expect(result.success).toBe(false)
    expect(result.success === false && result.error.code).toBe('DECODE_FAILED')
  })

  it('非 tolerate 且超上限时，失败仍然整体失败', async () => {
    const def = defineEndpoint({
      name: 'kuaishou.segFail',
      route: '/__segfail',
      params: zod.object({}),
      build: () => Array.from({ length: 20 }, (_v, i) => ({ method: 'GET' as const, url: `https://example.com/${i}`, tag: `s${i}` })),
      normalize: (parts) => ({ parts })
    })

    const r = await execute(
      def,
      {},
      {
        ctx: ctxOf(async (spec) => {
          if (spec.tag === 's15')
            throw new TransportError({ message: '断了', kind: 'network', code: 'NETWORK_ERROR', attempts: 1, url: 'x' })
          return responseOf({ ok: 1 })
        })
      }
    )

    expect(r.success).toBe(false)
    expect(r.success === false && r.error.code).toBe('NETWORK_ERROR')
  })
})

describe('runtime/execute - prepare、meta 与事件', () => {
  it('prepare 的产物并入 ctx，后续 build 能读到', async () => {
    const def = defineEndpoint({
      name: 'xiaohongshu.prepared',
      route: '/__prepared',
      params: zod.object({}),
      prepare: async () => ({ cookie: 'a1=guest' }),
      build: (_p, ctx) => ({ method: 'GET', url: `https://example.com/a?ck=${ctx.cookie}` })
    })
    const h = sendOf({ ok: 1 })

    await execute(def, {}, { ctx: ctxOf(h.send) })

    expect(h.specs[0].url).toBe('https://example.com/a?ck=a1=guest')
  })

  it('prepare 不改写原 ctx 对象', async () => {
    const def = defineEndpoint({
      name: 'xiaohongshu.prepared2',
      route: '/__prepared2',
      params: zod.object({}),
      prepare: async () => ({ cookie: 'replaced' }),
      build: () => ({ method: 'GET', url: 'https://example.com/a' })
    })
    const ctx = ctxOf(sendOf({ ok: 1 }).send)

    await execute(def, {}, { ctx })

    expect(ctx.cookie).toBe('ck=1')
  })

  it('meta.attempts 来自 trace 收集器，trace 开启时随信封带出', async () => {
    const tracer = new TraceCollector({ enabled: true })
    const ctx = ctxOf(async (spec, reason) => {
      tracer.begin({ url: spec.url, method: spec.method, reason: reason ?? 'initial' })({ status: 200 })
      return responseOf({ ok: 1 })
    })

    const r = await execute(simple, { aweme_id: '1' }, { ctx, trace: tracer })

    expect(r.meta.attempts).toBe(1)
    expect(r.meta.trace).toHaveLength(1)
    expect(r.meta.trace?.[0].reason).toBe('initial')
  })

  it('trace 未开启时信封里没有 trace 键', async () => {
    const r = await execute(simple, { aweme_id: '1' }, { ctx: ctxOf(sendOf({ ok: 1 }).send), trace: new TraceCollector() })
    expect('trace' in r.meta).toBe(false)
  })

  it('成功发 api:success，失败发 api:error，负载都带 meta', async () => {
    const bus = createEventBus('client-1')
    const success: unknown[] = []
    const failure: unknown[] = []
    bus.on('api:success', (p) => success.push(p))
    bus.on('api:error', (p) => failure.push(p))

    await execute(simple, { aweme_id: '1' }, { ctx: ctxOf(sendOf({ ok: 1 }).send), bus, requestId: () => 'r-ok' })
    await execute(simple, { aweme_id: '' }, { ctx: ctxOf(sendOf({ ok: 1 }).send), bus, requestId: () => 'r-bad' })

    expect(success).toHaveLength(1)
    expect(failure).toHaveLength(1)
    expect((success[0] as { meta: { requestId: string } }).meta.requestId).toBe('r-ok')
    expect((failure[0] as { meta: { requestId: string } }).meta.requestId).toBe('r-bad')
    expect((failure[0] as { error: { kind: string } }).error.kind).toBe('validation')
  })

  it('requestId 每次调用都不同（默认生成器）', async () => {
    const ctx = ctxOf(sendOf({ ok: 1 }).send)
    const a = await execute(simple, { aweme_id: '1' }, { ctx })
    const b = await execute(simple, { aweme_id: '1' }, { ctx })
    expect(a.meta.requestId).not.toBe(b.meta.requestId)
  })

  it('clientId 为空串时退化为 static（静态 fetcher 的口径）', async () => {
    const ctx = { ...ctxOf(sendOf({ ok: 1 }).send), clientId: '' }
    const r = await execute(simple, { aweme_id: '1' }, { ctx })
    expect(r.meta.clientId).toBe('static')
  })
})

describe('runtime/execute - 导出的纯函数', () => {
  it('extractPlatformMessage 依次尝试 message / status_msg / msg', () => {
    expect(extractPlatformMessage({ message: 'a', status_msg: 'b', msg: 'c' })).toBe('a')
    expect(extractPlatformMessage({ status_msg: 'b', msg: 'c' })).toBe('b')
    expect(extractPlatformMessage({ msg: 'c' })).toBe('c')
    expect(extractPlatformMessage({ message: '' })).toBeUndefined()
    expect(extractPlatformMessage({})).toBeUndefined()
    expect(extractPlatformMessage(null)).toBeUndefined()
    expect(extractPlatformMessage('html')).toBeUndefined()
  })

  it('extractPlatformCode 依次尝试 code / status_code / statusCode', () => {
    expect(extractPlatformCode({ code: -101, status_code: 8 })).toBe(-101)
    expect(extractPlatformCode({ status_code: 8 })).toBe(8)
    expect(extractPlatformCode({ statusCode: '500' })).toBe('500')
    expect(extractPlatformCode({ code: 0 })).toBe(0)
    expect(extractPlatformCode({})).toBeUndefined()
    expect(extractPlatformCode(undefined)).toBeUndefined()
  })

  it('classifyThrown 对 decode 阶段归 parse，其余归 internal', () => {
    const err = new Error('x')
    expect(classifyThrown(err, 'decode')).toMatchObject({ kind: 'parse', code: 'DECODE_FAILED', cause: err })
    expect(classifyThrown(err, 'build')).toMatchObject({ kind: 'internal', code: 'INTERNAL_ERROR', cause: err })
  })

  it('classifyThrown 对 TransportError 用它自带的归因', () => {
    const te = new TransportError({ message: '超时', kind: 'timeout', code: 'TIMEOUT', errno: 'ETIMEDOUT', attempts: 1, url: 'x' })
    expect(classifyThrown(te, 'decode')).toMatchObject({ kind: 'timeout', code: 'TIMEOUT', retryable: true })
  })
})

describe('runtime/execute - 翻页接入（每页重新签名）', () => {
  interface Page {
    list: number[]
    has_more: number
    cursor: number
  }

  const paged = defineEndpoint({
    name: 'douyin.comments',
    route: '/__comments',
    params: zod.object({
      aweme_id: zod.string().min(1),
      number: zod.coerce.number().int().default(20),
      cursor: zod.coerce.number().int().default(0)
    }),
    build: (p) => ({ method: 'GET', url: `https://example.com/c?id=${p.aweme_id}&n=${p.number}&cursor=${p.cursor}` }),
    sign: 'a_bogus',
    paginate: {
      maxPageSize: 20,
      items: (page) => (page as Page).list,
      hasMore: (page) => (page as Page).has_more === 1,
      nextParams: (params, page) => ({ ...params, cursor: (page as Page).cursor }),
      merge: ({ items }) => ({ comments: items })
    }
  })

  /** 每次被调用就在 URL 上追加一次签名标记 */
  const countingSigner = () => {
    let calls = 0
    return {
      get calls() {
        return calls
      },
      signer: async (spec: RequestSpec) => {
        calls += 1
        return { ...spec, url: `${spec.url}&sig=${calls}` }
      }
    }
  }

  it('每页都重新签名：3 页 → 签名器被调 3 次，且每页 URL 上的签名不同', async () => {
    const s = countingSigner()
    const urls: string[] = []
    let n = 0
    const ctx = ctxOf(async (spec) => {
      urls.push(spec.url)
      n += 1
      return responseOf({ list: Array.from({ length: 20 }, (_, i) => n * 100 + i), has_more: 1, cursor: n })
    })

    const r = await execute(paged, { aweme_id: '7123', number: 60 }, { ctx, signers: { a_bogus: s.signer } })

    expect(s.calls).toBe(3)
    expect(urls).toHaveLength(3)
    expect(urls.map((u) => u.slice(u.indexOf('&sig=')))).toEqual(['&sig=1', '&sig=2', '&sig=3'])
    expect(r.success && (r.data as { comments: number[] }).comments).toHaveLength(60)
  })

  it('每页都重新 build：游标与本页条数都进了新 URL', async () => {
    const s = countingSigner()
    const urls: string[] = []
    let n = 0
    const ctx = ctxOf(async (spec) => {
      urls.push(spec.url)
      n += 1
      return responseOf({ list: Array.from({ length: 20 }, (_, i) => i), has_more: 1, cursor: n * 77 })
    })

    await execute(paged, { aweme_id: '7123', number: 45 }, { ctx, signers: { a_bogus: s.signer } })

    expect(urls[0]).toContain('n=20&cursor=0')
    expect(urls[1]).toContain('n=20&cursor=77')
    expect(urls[2]).toContain('n=5&cursor=154')
  })

  it('attempts 与实际页数一致，trace 里第二页起是 page', async () => {
    const tracer = new TraceCollector({ enabled: true })
    let n = 0
    const ctx = ctxOf(async (spec, reason) => {
      n += 1
      tracer.begin({ url: spec.url, method: spec.method, reason: reason ?? 'initial' })({ status: 200 })
      return responseOf({ list: Array.from({ length: 20 }, (_, i) => i), has_more: n < 2 ? 1 : 0, cursor: n })
    })

    const r = await execute(paged, { aweme_id: '7123', number: 60 }, { ctx, signers: { a_bogus: async (spec) => spec }, trace: tracer })

    expect(r.meta.attempts).toBe(2)
    expect(r.meta.trace?.map((t) => t.reason)).toEqual(['initial', 'page'])
  })

  it('翻页中某页判失败时整体失败', async () => {
    let n = 0
    const ctx = ctxOf(async () => {
      n += 1
      return responseOf(n === 2 ? { code: -101, message: '未登录' } : { list: [1], has_more: 1, cursor: n }, n === 2 ? 401 : 200)
    })

    const r = await execute(
      paged,
      { aweme_id: '7123', number: 60 },
      {
        ctx,
        signers: { a_bogus: async (spec) => spec },
        judge: (raw) => ((raw as { code?: number }).code === -101 ? { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED' } : { ok: true })
      }
    )

    expect(r.success).toBe(false)
    expect(r.success === false && r.error.message).toBe('未登录')
    expect(n).toBe(2)
  })

  it("partial: 'tolerate'：第 2 页失败时信封仍成功，带回首页数据，meta.incomplete 挂出失败原因", async () => {
    const tolerant = { ...paged, partial: 'tolerate' as const }
    let n = 0
    const ctx = ctxOf(async () => {
      n += 1
      return responseOf(
        n === 2 ? { code: -101, message: '未登录' } : { list: Array.from({ length: 20 }, (_, i) => i), has_more: 1, cursor: n }
      )
    })

    const r = await execute(
      tolerant,
      { aweme_id: '7123', number: 60 },
      {
        ctx,
        signers: { a_bogus: async (spec) => spec },
        judge: (raw) => ((raw as { code?: number }).code === -101 ? { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED' } : { ok: true })
      }
    )

    expect(n).toBe(2)
    expect(r.success).toBe(true)
    expect(r.success && (r.data as { comments: number[] }).comments).toHaveLength(20)
    expect(r.meta.incomplete).toEqual({ kind: 'auth', code: 'COOKIE_EXPIRED', message: '未登录' })
  })

  it('完整结果的 meta 上没有 incomplete 这个键', async () => {
    const r = await execute(
      { ...paged, partial: 'tolerate' as const },
      { aweme_id: '7123', number: 5 },
      { ctx: ctxOf(async () => responseOf({ list: [1, 2, 3, 4, 5], has_more: 0, cursor: 1 })), signers: { a_bogus: async (spec) => spec } }
    )
    expect(r.success).toBe(true)
    expect('incomplete' in r.meta).toBe(false)
  })

  it('pageIntervalMs 走 execute 的可注入 sleep：3 页等 2 次', async () => {
    const waits: number[] = []
    const spaced = { ...paged, paginate: { ...paged.paginate!, pageIntervalMs: 1200 } }
    let n = 0
    const ctx = ctxOf(async () => {
      n += 1
      return responseOf({ list: Array.from({ length: 20 }, (_, i) => i), has_more: 1, cursor: n })
    })

    await execute(
      spaced,
      { aweme_id: '7123', number: 60 },
      {
        ctx,
        signers: { a_bogus: async (spec) => spec },
        sleep: async (ms) => void waits.push(ms)
      }
    )

    expect(n).toBe(3)
    expect(waits).toEqual([1200, 1200])
  })

  it('分页端点的 build 返回数组时报 internal', async () => {
    const bad = defineEndpoint({
      name: 'douyin.badPaged',
      route: '/__bad_paged',
      params: zod.object({ number: zod.coerce.number().default(10) }),
      build: () => [
        { method: 'GET' as const, url: 'https://example.com/a' },
        { method: 'GET' as const, url: 'https://example.com/b' }
      ],
      paginate: {
        maxPageSize: 20,
        items: () => [1],
        hasMore: () => false,
        nextParams: (p) => p
      }
    })

    const r = await execute(bad, {}, { ctx: ctxOf(sendOf({}).send) })

    expect(r.success).toBe(false)
    expect(r.success === false && r.error.kind).toBe('internal')
    expect(r.success === false && r.error.message).toContain('必须只返回一个请求')
  })
})

describe('runtime/execute - SignStep 清单（原子反爬参数，按 phase 排序）', () => {
  const mk = (phase: 'prepare' | 'token' | 'sign' | 'finalize', log: string[], tag: string) => ({
    phase,
    apply: (spec: RequestSpec) => {
      log.push(tag)
      return spec
    }
  })

  it('按 phase 排序执行，乱序声明也不翻车', async () => {
    const order: string[] = []
    const def = defineEndpoint({
      name: 'douyin.signsteps',
      route: '/__signsteps',
      params: zod.object({}),
      // 故意乱序：finalize 在前、prepare 在后 —— runtime 应排成 prepare→token→sign→finalize
      sign: [mk('finalize', order, 'F'), mk('sign', order, 'S'), mk('token', order, 'T'), mk('prepare', order, 'P')],
      build: () => ({ method: 'GET', url: 'https://example.com/a?x=1' }),
      response: type<{ ok: boolean }>()
    })
    const r = await execute(def, {}, { ctx: ctxOf(sendOf({ ok: true }).send) })
    expect(r.success).toBe(true)
    expect(order).toEqual(['P', 'T', 'S', 'F'])
  })

  it('同 phase 内保留声明顺序', async () => {
    const order: string[] = []
    const def = defineEndpoint({
      name: 'douyin.signsteps2',
      route: '/__signsteps2',
      params: zod.object({}),
      sign: [mk('sign', order, 'A'), mk('sign', order, 'B'), mk('sign', order, 'C')],
      build: () => ({ method: 'GET', url: 'https://example.com/a' }),
      response: type<{ ok: boolean }>()
    })
    await execute(def, {}, { ctx: ctxOf(sendOf({ ok: true }).send) })
    expect(order).toEqual(['A', 'B', 'C'])
  })

  it('单个 SignStep 可省数组，异步 apply 被 await', async () => {
    const order: string[] = []
    const def = defineEndpoint({
      name: 'douyin.signsteps3',
      route: '/__signsteps3',
      params: zod.object({}),
      sign: {
        phase: 'sign',
        apply: async (spec: RequestSpec) => {
          await Promise.resolve()
          order.push('async')
          return spec
        }
      },
      build: () => ({ method: 'GET', url: 'https://example.com/a' }),
      response: type<{ ok: boolean }>()
    })
    const r = await execute(def, {}, { ctx: ctxOf(sendOf({ ok: true }).send) })
    expect(r.success).toBe(true)
    expect(order).toEqual(['async'])
  })
})

/**
 * 反爬挑战的自动解算槽位。
 *
 * 与 `challenge`（只中转、交给真人）互补，分界线是**有没有人机判定**：WAF 工作量
 * 证明那类纯算法挑战在管线内解掉并立即重放；真人滑块的解算器恒返回 `undefined`，
 * 于是落到失败分支、信封原样交出去 —— 滑块**永不进自动重放**，这一条下面单独锁住
 * （自动重试滑块毫无意义，还会放大风控）。
 *
 * 另一条要锁的是**预算隔离**：解算的额外轮次只服务「解出之后的重放」，不能顺带把
 * `retryOn` 的既有重试次数抬高一档（参考实现的
 * `Math.max(retryAttempts, SOLVE_ROUNDS + 1)` 就有这个副作用）。
 */
describe('runtime/execute - solveChallenge 反爬自动解算', () => {
  /** 判成 risk 的端点：业务码 -412，与挑战页落到的 kind 一致 */
  const guarded = defineEndpoint({
    name: 'douyin.guarded',
    route: '/__guarded',
    params: zod.object({}),
    build: () => ({ method: 'GET', url: 'https://example.com/a' }),
    judge: (raw) => ((raw as { code?: number }).code === -412 ? { ok: false, kind: 'risk', code: 'RISK_CONTROL' } : { ok: true }),
    response: type<{ code: number }>()
  })

  /** 同一形状但声明了 retryOn，用来验「解算不抬高业务重试的既有次数」 */
  const guardedRetry = defineEndpoint({
    name: 'douyin.guardedRetry',
    route: '/__guarded_retry',
    params: zod.object({}),
    build: () => ({ method: 'GET', url: 'https://example.com/a' }),
    judge: () => ({ ok: false, kind: 'risk', code: 'RISK_CONTROL' }),
    retryOn: ['RISK_CONTROL'],
    response: type<{ code: number }>()
  })

  it('解出 cookie：更新 ctx.cookie 后立即重放（不 sleep），第二次成功', async () => {
    const cookies: Array<string | undefined> = []
    const slept: number[] = []
    let n = 0
    const r = await execute(
      guarded,
      {},
      {
        ctx: ctxOf(async (spec) => {
          n += 1
          cookies.push(new AmagiHeaders(spec.headers).get('cookie'))
          return responseOf(n === 1 ? { code: -412 } : { code: 0 })
        }),
        solveChallenge: (_raw, _http, identity) => `${identity.cookie}; _wafchallengeid=solved`,
        sleep: async (ms) => {
          slept.push(ms)
        }
      }
    )

    expect(r.success).toBe(true)
    expect(n).toBe(2) // 初始 + 一次解算重放
    expect(cookies[0]).toBe('ck=1')
    expect(cookies[1]).toBe('ck=1; _wafchallengeid=solved')
    expect(slept).toEqual([]) // 挑战页本就是 location.reload()，解算重放不退避
  })

  it('滑块那种解不出的形态：原样交出失败信封，一次重放都不做', async () => {
    const h = sendOf({ code: -412 })
    const r = await execute(
      guarded,
      {},
      {
        ctx: ctxOf(h.send),
        challenge: () => ({ url: 'https://rmc.bytedance.com/verifycenter/captcha/v2?aid=0', bizName: 'TTGCaptcha', result: '10000' }),
        /** 滑块要真人拖，解算器对这一形态恒返回 undefined */
        solveChallenge: () => undefined,
        sleep: async () => {}
      }
    )

    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.kind).toBe('risk')
      // 错不被吞：中转路径照旧，验证页信息原样带出
      expect(r.error.challenge?.bizName).toBe('TTGCaptcha')
    }
    expect(h.specs).toHaveLength(1) // 解不了 → 不重放、不死循环
  })

  it('连续都解得出：到 SOLVE_ROUNDS 上限就失败，不无限重放', async () => {
    let n = 0
    const r = await execute(
      guarded,
      {},
      {
        ctx: ctxOf(async () => {
          n += 1
          return responseOf({ code: -412 })
        }),
        // 每次都给一个**新**的 cookie，否则会被「没有进展」那条短路挡下
        solveChallenge: (_raw, _http, identity) => `${identity.cookie}; r${n}=1`,
        sleep: async () => {}
      }
    )

    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.kind).toBe('risk')
    expect(n).toBe(SOLVE_ROUNDS + 1) // 初始 + SOLVE_ROUNDS 次解算重放
  })

  it('解出的 cookie 与当刻相同：不重放 —— 没有进展再发一次就是死循环', async () => {
    const h = sendOf({ code: -412 })
    const r = await execute(
      guarded,
      {},
      { ctx: ctxOf(h.send), solveChallenge: (_raw, _http, identity) => identity.cookie, sleep: async () => {} }
    )

    expect(r.success).toBe(false)
    expect(h.specs).toHaveLength(1)
  })

  it('装了解算器不抬高 retryOn 的既有重试次数（解不出时次数与从前一致）', async () => {
    let n = 0
    const slept: number[] = []
    const r = await execute(
      guardedRetry,
      {},
      {
        ctx: ctxOf(async () => {
          n += 1
          return responseOf({ code: -412 })
        }),
        solveChallenge: () => undefined,
        sleep: async (ms) => {
          slept.push(ms)
        }
      }
    )

    expect(r.success).toBe(false)
    expect(n).toBe(4) // 默认 3 次重试共 4 次请求 —— 与没装解算器时一模一样
    // 业务重试仍然退避，且序列是 1s / 2s / 4s。断言**具体值**而不只是条数：
    // 2026-10-11 用真 setTimeout 在假 adapter 上计过时（gap 1011 / 2014 / 4008 ms，
    // 总 7.0s），这三个数就是那次实测的无时钟复现 —— 只断言 `toHaveLength(3)` 的话，
    // `backoffDelayMs` 的基数或指数被改掉都测不出来
    expect(slept).toEqual([1000, 2000, 4000])
  })

  it('解算重放用满额度后就地收口，不再续业务重试', async () => {
    let n = 0
    const slept: number[] = []
    const r = await execute(
      guardedRetry,
      {},
      {
        ctx: ctxOf(async () => {
          n += 1
          return responseOf({ code: -412 })
        }),
        solveChallenge: (_raw, _http, identity) => `${identity.cookie}; r${n}=1`,
        sleep: async (ms) => {
          slept.push(ms)
        }
      }
    )

    expect(r.success).toBe(false)
    // 首发 + SOLVE_ROUNDS 次解算重放。**解算链结束后不再进 retryOn** —— 挑战已经解过，
    // 再换一套业务令牌重发不可能有不同结果（线上形态见 client/request.test.ts 的
    // 「解算重放后 solver 不再出手时直接收口」）。
    //
    // 这一条原先断言的是 `4 + SOLVE_ROUNDS`（= 8）：两套预算各自独立、互不侵占。
    // 那个上限现在只在「解算器一次都没出手」时成立，由上面那条用例钉住（恒 4 次）。
    expect(n).toBe(1 + SOLVE_ROUNDS)
    // 解算重放不 sleep，收口也不 sleep —— 一次退避都没有
    expect(slept).toHaveLength(0)
  })

  it('ensureCookie 既有语义不变：prepare 之后跑一次，解算重放不再跑第二次', async () => {
    let audits = 0
    const cookies: Array<string | undefined> = []
    let n = 0
    const r = await execute(
      guarded,
      {},
      {
        ctx: ctxOf(async (spec) => {
          n += 1
          cookies.push(new AmagiHeaders(spec.headers).get('cookie'))
          return responseOf(n === 1 ? { code: -412 } : { code: 0 })
        }),
        ensureCookie: async (cookie) => {
          audits += 1
          return `${cookie}; minted=1`
        },
        solveChallenge: (_raw, _http, identity) => `${identity.cookie}; _wafchallengeid=solved`,
        sleep: async () => {}
      }
    )

    expect(r.success).toBe(true)
    expect(audits).toBe(1)
    // 解算是在**审计之后**的那份 cookie 上叠加的，两者不互相覆盖
    expect(cookies[0]).toBe('ck=1; minted=1')
    expect(cookies[1]).toBe('ck=1; minted=1; _wafchallengeid=solved')
  })
})
