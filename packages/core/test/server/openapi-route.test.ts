import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createClient, type FacadeServerOptions } from 'amagi/client/createClient'
import { GENERATED_REFERENCE_URL, mountOpenApiSpec, startServer } from 'amagi/server/auth'

import { closeAllServers, listenOnRandomPort as listenHelper } from '../helpers/listen'
/**
 * `startServer({ openapi })` 的自托管规范（PRD 阶段 8.4 第 2 项）
 * 与 v7 门面 `createClient().startServer(port, { openapi })`（阶段 9.1）。
 *
 * 判据的核心是**默认不挂**：v6 的 `startServer` 没有 `/openapi.json`，
 * 也把 `/docs` 301 到 apifox —— 不传 `openapi` 时这两条一个字都不许变。
 * 开了之后 `/openapi.json` 返回从注册表现算的规范（与装的这个版本同源），
 * `/docs` 改跳文档站的生成式参考。
 *
 * 两个 `startServer`（门面版 / 选项版）共用 `mountOpenApiSpec`，最后一条用例正面
 * 比对门面版与选项版返回的是同一份规范。阶段 9.1 之前是三个 —— v6 门面
 * `createAmagiClient` 自带一份 `startServer`，它已经变成 `createClient` 的别名。
 *
 * `startServer` 自己会 `app.listen`，这里注入 `listen` 拿到 app 后再用
 * node:http 起在随机端口上，避免占用 4567。
 */

/**
 * 起服务拿 base URL（实现与两个坑的说明见 `helpers/listen.ts`）。
 *
 * 本文件原先自带一份实现 + 一个手写的 `closeCurrentServer()` —— 后者存在的原因
 * 就是那份实现用模块级 `server` 单例，「同一条用例里起第二台」会把第一台的句柄
 * 冲掉。改用 helper 之后每台服务各自持有句柄，那个绕行不再需要。
 * @param app - Express 应用
 * @returns base URL
 */
const listenOnRandomPort = async (app: express.Application): Promise<string> => (await listenHelper(app)).base

/** 用注入式 listen 拿到 app（不真的监听 4567），再自己起随机端口 */
const start = async (options: Parameters<typeof startServer>[0] = {}): Promise<string> => {
  const app = startServer({ ...options, listen: () => undefined })
  return listenOnRandomPort(app)
}

/**
 * v7 门面版：做法与 `start` 一致 —— 门面自己 `app.listen(port, '::')` 且不回传
 * server 句柄，注入 `listen` 才能拿到 app 又不占 4567、不留悬空 handle。
 * `openapi` 缺省即「第二参不带这一项」，也就是 v6 行为。
 */
const startFacade = async (serverOptions: FacadeServerOptions = {}): Promise<string> => {
  const app = createClient().startServer(4567, { ...serverOptions, listen: () => undefined })
  return listenOnRandomPort(app)
}

beforeEach(() => {
  // host 默认 '::' 会打印一次警告，测试里静音
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(closeAllServers)

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
  it('/openapi.json 返回 60 条 path 的 OpenAPI 3.1 规范', async () => {
    const base = await start({ openapi: true })
    const res = await fetch(`${base}/openapi.json`)
    expect(res.status).toBe(200)

    const spec = (await res.json()) as { openapi: string; paths: Record<string, unknown>; info: { title: string } }
    expect(spec.openapi).toBe('3.1.0')
    expect(Object.keys(spec.paths)).toHaveLength(60)
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

describe('mountOpenApiSpec 是两个 startServer 的公共实现', () => {
  // 门面版 / 选项版共用这一个挂载函数（不许写第二遍），
  // 先在裸 app 上验证它本身，门面版的端到端行为见下一个 describe
  it('挂到裸 Express 应用上就有 /openapi.json，内容与现算的规范一致', async () => {
    const app = express()
    mountOpenApiSpec(app)
    const base = await listenOnRandomPort(app)

    const res = await fetch(`${base}/openapi.json`)
    expect(res.status).toBe(200)
    const spec = (await res.json()) as { openapi: string; paths: Record<string, unknown> }
    expect(spec.openapi).toBe('3.1.0')
    expect(Object.keys(spec.paths)).toHaveLength(60)
  })
})

describe('v7 门面的 startServer 第二参 { openapi }（阶段 9.1，与 v6 门面同款）', () => {
  it('{ openapi: true } 下 /openapi.json 返回 60 条 path 的 OpenAPI 3.1 规范', async () => {
    const base = await startFacade({ openapi: true })
    const res = await fetch(`${base}/openapi.json`)
    expect(res.status).toBe(200)

    const spec = (await res.json()) as { openapi: string; paths: Record<string, unknown>; info: { title: string } }
    expect(spec.openapi).toBe('3.1.0')
    expect(Object.keys(spec.paths)).toHaveLength(60)
    expect(spec.paths['/api/bilibili/fetch_one_video']).toBeDefined()
    expect(spec.info.title).toBe('amagi HTTP API')
  })

  it('{ openapi: true } 下 /docs 是 302 且 Location 指向端点参考（不是 apifox）', async () => {
    const base = await startFacade({ openapi: true })
    const res = await fetch(`${base}/docs`, { redirect: 'manual' })
    // 302 而非 301 是刻意的：301 会被浏览器永久缓存
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(GENERATED_REFERENCE_URL)
    expect(res.headers.get('location')).toContain('/docs/v7/usage/api/http')
    expect(res.headers.get('location')).not.toContain('apifox')
  })

  it('{ openapi: true } 下 / 仍 301 到 apifox（只有 /docs 改口，根路径不动）', async () => {
    const base = await startFacade({ openapi: true })
    const res = await fetch(`${base}/`, { redirect: 'manual' })
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe('https://amagi.apifox.cn')
  })

  it('不传 openapi 时 /openapi.json 仍 404（v6 行为一个字不变）', async () => {
    const base = await startFacade()
    expect((await fetch(`${base}/openapi.json`)).status).toBe(404)
  })

  it('不传 openapi 时 / 与 /docs 都仍 301 到 apifox', async () => {
    const base = await startFacade()
    for (const path of ['/', '/docs']) {
      const res = await fetch(`${base}${path}`, { redirect: 'manual' })
      expect(res.status).toBe(301)
      expect(res.headers.get('location')).toBe('https://amagi.apifox.cn')
    }
  })

  it('平台路由照旧挂在 /api/*（开了 openapi 不影响原有表面）', async () => {
    const base = await startFacade({ openapi: true })
    // 缺必填参数 → 校验在管线里，业务失败仍 200；关键是路径存在（不是 404）
    const res = await fetch(`${base}/api/bilibili/fetch_one_video`)
    expect(res.status).not.toBe(404)
  })

  it('门面版与选项版返回的是同一份规范（共用 mountOpenApiSpec，不是各写一遍）', async () => {
    // 两台服务同时开着 —— 每次 listen 各自持有句柄，不必先关掉第一台
    // （原先这里必须插一句 `closeCurrentServer()`，那是模块级 server 单例的症状）
    const facadeBase = await startFacade({ openapi: true })
    const optionBase = await start({ openapi: true })

    const facadeSpec = await (await fetch(`${facadeBase}/openapi.json`)).json()
    const optionSpec = await (await fetch(`${optionBase}/openapi.json`)).json()

    expect(facadeSpec).toEqual(optionSpec)
  })
})
