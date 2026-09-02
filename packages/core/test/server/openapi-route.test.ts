import { createServer, type Server } from 'node:http'

import type express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { startServer } from 'amagi/server/auth'
/**
 * `startServer({ openapi })` 的自托管规范（PRD 阶段 8.4 第 2 项）。
 *
 * 判据的核心是**默认不挂**：v6 的 `startServer` 没有 `/openapi.json`，
 * 也把 `/docs` 301 到 apifox —— 不传 `openapi` 时这两条一个字都不许变。
 * 开了之后 `/openapi.json` 返回从注册表现算的规范（与装的这个版本同源），
 * `/docs` 改跳文档站的生成式参考。
 *
 * `startServer` 自己会 `app.listen`，这里注入 `listen` 拿到 app 后再用
 * node:http 起在随机端口上，避免占用 4567。
 */

let server: Server | undefined

const listenOnRandomPort = async (app: express.Application): Promise<string> => {
  server = createServer(app)
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  return `http://127.0.0.1:${port}`
}

/** 用注入式 listen 拿到 app（不真的监听 4567），再自己起随机端口 */
const start = async (options: Parameters<typeof startServer>[0] = {}): Promise<string> => {
  const app = startServer({ ...options, listen: () => undefined })
  return listenOnRandomPort(app)
}

beforeEach(() => {
  // host 默认 '::' 会打印一次警告，测试里静音
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()))
    server = undefined
  }
})

describe('默认不挂（v6 行为一个字不变）', () => {
  it('/openapi.json 是 404', async () => {
    const base = await start()
    expect((await fetch(`${base}/openapi.json`)).status).toBe(404)
  })

  it('/docs 仍 301 到 apifox', async () => {
    const base = await start()
    const res = await fetch(`${base}/docs`, { redirect: 'manual' })
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe('https://amagi.apifox.cn')
  })
})

describe('openapi: true 时自托管规范', () => {
  it('/openapi.json 返回 59 条 path 的 OpenAPI 3.1 规范', async () => {
    const base = await start({ openapi: true })
    const res = await fetch(`${base}/openapi.json`)
    expect(res.status).toBe(200)

    const spec = (await res.json()) as { openapi: string; paths: Record<string, unknown>; info: { title: string } }
    expect(spec.openapi).toBe('3.1.0')
    expect(Object.keys(spec.paths)).toHaveLength(59)
    expect(spec.paths['/api/bilibili/fetch_one_video']).toBeDefined()
    expect(spec.info.title).toBe('amagi HTTP API')
  })

  it('/docs 不再跳 apifox，改跳文档站的生成式端点参考（302，不被永久缓存）', async () => {
    const base = await start({ openapi: true })
    const res = await fetch(`${base}/docs`, { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/docs/v7/usage/api/http')
    expect(res.headers.get('location')).not.toContain('apifox')
  })

  it('/ 仍 301 到 apifox（只有 /docs 改口，根路径不动）', async () => {
    const base = await start({ openapi: true })
    const res = await fetch(`${base}/`, { redirect: 'manual' })
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe('https://amagi.apifox.cn')
  })

  it('设了 token 时规范也要鉴权（规范挂在鉴权之后）', async () => {
    const base = await start({ openapi: true, token: 'secret' })

    const anonymous = await fetch(`${base}/openapi.json`)
    expect(anonymous.status).toBe(401)

    const authorized = await fetch(`${base}/openapi.json`, { headers: { Authorization: 'Bearer secret' } })
    expect(authorized.status).toBe(200)
  })
})
