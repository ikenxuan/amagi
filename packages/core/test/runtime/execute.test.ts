import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { EndpointCtx } from 'amagi/contracts/endpoint'
import { defineEndpoint, type } from 'amagi/contracts/endpoint'
import { AmagiHeaders, type RawResponse, type RequestSpec } from 'amagi/contracts/request'
import { createEventBus } from 'amagi/runtime/events'
import { classifyThrown, execute, extractPlatformCode, extractPlatformMessage } from 'amagi/runtime/execute'
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
    [
      'decode',
      { build: () => ({ method: 'GET' as const, url: 'https://example.com/a' }), decode: boom('decode') }
    ],
    [
      'judge',
      { build: () => ({ method: 'GET' as const, url: 'https://example.com/a' }), judge: boom('judge') }
    ],
    [
      'normalize',
      { build: () => ({ method: 'GET' as const, url: 'https://example.com/a' }), normalize: boom('normalize') }
    ]
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

    const r = await execute(def, {}, {
      ctx: ctxOf(async () => {
        throw te
      })
    })

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

    const r = await execute(def, {}, {
      ctx: ctxOf(async () => {
        throw 'plain string'
      })
    })

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

    const r = await execute(def, {}, { ctx: ctxOf(sendOf({ code: -1 }).send), judge: () => ({ ok: false, kind: 'unknown', code: 'PLATFORM_ERROR' }) })
    expect(r.success).toBe(true)
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

  it("partial 缺省（fail）时任一分片失败即整体失败", async () => {
    let n = 0
    const r = await execute(multi(), { id: 'u1' }, {
      ctx: ctxOf(async () => {
        n += 1
        if (n === 2) throw new TransportError({ message: '断了', kind: 'network', code: 'NETWORK_ERROR', attempts: 1, url: 'x' })
        return responseOf({ ok: 1 })
      })
    })

    expect(r.success).toBe(false)
    expect(r.success === false && r.error.kind).toBe('network')
  })

  it("partial: 'tolerate' 时失败分片留空，整体仍成功", async () => {
    let n = 0
    const r = await execute(multi('tolerate'), { id: 'u1' }, {
      ctx: ctxOf(async () => {
        n += 1
        if (n === 2) throw new TransportError({ message: '断了', kind: 'network', code: 'NETWORK_ERROR', attempts: 1, url: 'x' })
        return responseOf({ ok: n })
      })
    })

    expect(r.success).toBe(true)
    const parts = (r.success && (r.data as { parts: unknown[] }).parts) as unknown[]
    expect(parts).toHaveLength(3)
    expect(parts.filter((p) => p === undefined)).toHaveLength(1)
  })

  it("partial: 'tolerate' 但全部分片都失败时，仍然返回失败信封", async () => {
    const r = await execute(multi('tolerate'), { id: 'u1' }, {
      ctx: ctxOf(async () => {
        throw new TransportError({ message: '全断了', kind: 'network', code: 'NETWORK_ERROR', attempts: 1, url: 'x' })
      })
    })

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
      nextParams: (params, page) => ({ ...params, cursor: (page as Page).cursor })
    },
    normalize: (decoded) => ({ comments: (decoded as { items: number[] }).items })
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

    const r = await execute(paged, { aweme_id: '7123', number: 60 }, {
      ctx,
      signers: { a_bogus: async (spec) => spec },
      judge: (raw) => ((raw as { code?: number }).code === -101 ? { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED' } : { ok: true })
    })

    expect(r.success).toBe(false)
    expect(r.success === false && r.error.message).toBe('未登录')
    expect(n).toBe(2)
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
