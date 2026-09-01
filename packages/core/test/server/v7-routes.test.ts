import { createServer, type Server } from 'node:http'

import type { ClientCtx } from 'amagi/client/fetcher'
import { defineEndpoint, type } from 'amagi/contracts/endpoint'
import type { RequestConfig } from 'amagi/contracts/request'
import { createRoutes, routePathsOf } from 'amagi/server/routes'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
import express from 'express'
import { afterEach, describe, expect, it } from 'vitest'
import zod from 'zod'
/**
 * server/routes 的契约。
 *
 * 判据：**注册两个同 `route` 的假端点时启动即抛错**（这一条就修掉 #47/#48/#54）。
 * 另外钉住：路由从 registry 派生（数量 = 端点数、路径 = route 字段）、
 * 路由处理走与 fetcher 同一条执行路径（query 参数校验 + 完整管线）。
 */

let server: Server | undefined

const listen = async (app: express.Application): Promise<string> => {
  server = createServer(app)
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  return 'http://127.0.0.1:' + port
}

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()))
    server = undefined
  }
})

/** 假端点：带必填参数，走完整管线 */
const fakeEcho = defineEndpoint({
  name: 'douyin.fakeEcho',
  route: '/__fake_echo',
  params: zod.object({ aweme_id: zod.string().min(1) }),
  build: (p) => ({ method: 'GET', url: `https://example.com/echo?id=${p.aweme_id}` }),
  response: type<{ ok: true; echoed: string }>()
})

/** 假端点：compute 纯本地计算 */
const fakeCompute = defineEndpoint({
  name: 'bilibili.fakeCompute',
  route: '/__fake_compute',
  params: zod.object({}),
  compute: () => ({ aid: 0 })
})

/** 造一个能捕获请求的 ctx（与 client/fetcher.test.ts 同一模式） */
const makeCtx = (options: { requestConfig?: RequestConfig; body?: unknown } = {}): ClientCtx => {
  const http = new HttpClient({
    requestConfig: {
      ...(options.requestConfig ?? {}),
      adapter: async (config) => ({
        data: options.body ?? { ok: true, echoed: 'hi' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config as never
      })
    }
  })
  return {
    clientId: 'server-1',
    platform: 'douyin',
    cookie: 'ck=server',
    userAgent: 'ua/1',
    requestConfig: {},
    trace: new TraceCollector(),
    send: (spec, reason) => http.send(spec, reason)
  }
}

describe('server/routes - 路由派生', () => {
  it('从 registry 派生路由：层数 = 端点数，路径 = route 字段', () => {
    const router = createRoutes('douyin', { fakeEcho, fakeCompute }, makeCtx())
    const stack = (router as unknown as { stack: Array<{ route?: { path: string } }> }).stack
    const paths = stack.map((l) => l.route?.path).filter(Boolean) as string[]
    expect(paths.sort()).toEqual(['/__fake_compute', '/__fake_echo'])
    expect(routePathsOf({ fakeEcho, fakeCompute })).toEqual(['/__fake_echo', '/__fake_compute'])
  })

  it('所有路由注册为 GET（与 v6 一致）', () => {
    const router = createRoutes('douyin', { fakeEcho }, makeCtx())
    const stack = (
      router as unknown as {
        stack: Array<{ route?: { methods: Record<string, boolean> } }>
      }
    ).stack
    for (const layer of stack) {
      if (layer.route) expect(layer.route.methods.get).toBe(true)
    }
  })
})

describe('server/routes - 唯一性校验（修 #47/#48/#54）', () => {
  it('注册两个同 route 的端点时启动即抛错', () => {
    const duplicate = defineEndpoint({
      name: 'douyin.fakeEchoDuplicate',
      route: '/__fake_echo',
      params: zod.object({}),
      compute: () => ({ dup: true })
    })
    expect(() => createRoutes('douyin', { fakeEcho, fakeEchoDuplicate: duplicate }, makeCtx())).toThrow(
      /route.*\/__fake_echo.*重复/
    )
  })

  it('错误信息带出两个冲突端点名', () => {
    const duplicate = defineEndpoint({
      name: 'douyin.fakeEchoDuplicate',
      route: '/__fake_echo',
      params: zod.object({}),
      compute: () => ({ dup: true })
    })
    try {
      createRoutes('douyin', { fakeEcho, fakeEchoDuplicate: duplicate }, makeCtx())
      throw new Error('应该抛错')
    } catch (error) {
      const message = (error as Error).message
      expect(message).toContain('fakeEcho')
      expect(message).toContain('fakeEchoDuplicate')
    }
  })
})

describe('server/routes - HTTP 行为', () => {
  it('GET 请求走完整管线并返回 AmagiResult 信封 + requestPath', async () => {
    const app = express()
    app.use('/api/douyin', createRoutes('douyin', { fakeEcho }, makeCtx()))
    const base = await listen(app)
    const res = await fetch(base + '/api/douyin/__fake_echo?aweme_id=7123')
    const body = (await res.json()) as {
      success: boolean
      data: { ok: true; echoed: string }
      requestPath: string
      meta: { endpoint: string }
    }
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toEqual({ ok: true, echoed: 'hi' })
    expect(body.requestPath).toBe('/api/douyin/__fake_echo?aweme_id=7123')
    expect(body.meta.endpoint).toBe('douyin.fakeEcho')
  })

  it('缺必填参数时返回失败信封（参数校验在管线里）', async () => {
    const app = express()
    app.use('/api/douyin', createRoutes('douyin', { fakeEcho }, makeCtx()))
    const base = await listen(app)
    const res = await fetch(base + '/api/douyin/__fake_echo')
    const body = (await res.json()) as { success: boolean; error: { kind: string; code: string } }
    expect(res.status).toBe(200) // 信封语义：业务失败也 200，由 success 判别
    expect(body.success).toBe(false)
    expect(body.error.kind).toBe('validation')
    expect(body.error.code).toBe('PARAM_INVALID')
  })

  it('未注册的路径返回 404', async () => {
    const app = express()
    app.use('/api/douyin', createRoutes('douyin', { fakeEcho }, makeCtx()))
    const base = await listen(app)
    const res = await fetch(base + '/api/douyin/not_exist')
    expect(res.status).toBe(404)
  })
})