/**
 * HTTP 服务层。
 *
 * 用真实的 http.Server + fetch 驱动 Express，覆盖路由注册、参数校验中间件、
 * 状态码语义与已知的路由遮蔽缺陷。
 */
import { createServer, type Server } from 'node:http'

import { createBilibiliRoutes, createDouyinRoutes, createKuaishouRoutes, createXiaohongshuRoutes } from 'amagi/platform'
import { BilibiliMethodRoutes } from 'amagi/validation/bilibili'
import { DouyinMethodRoutes } from 'amagi/validation/douyin'
import express from 'express'
import { afterEach, describe, expect, it } from 'vitest'

import { constantAdapter } from '../helpers/adapter'

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

const buildApp = (router: express.Router, mount: string) => {
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(mount, router)
  return app
}

const layerPaths = (router: unknown): string[] => {
  const stack = (router as { stack: Array<{ route?: { path: string } }> }).stack
  return stack.map((l) => l.route?.path).filter(Boolean) as string[]
}

describe('路由注册', () => {
  it('douyin 路由层数等于 methodType 数量', () => {
    expect(layerPaths(createDouyinRoutes('ck'))).toHaveLength(Object.keys(DouyinMethodRoutes).length)
  })

  // 5 个 methodType 共用 /fetch_one_work，Express 只会命中第一个（parseWork），
  // 其余 4 个通过 HTTP 不可达。
  it('KNOWN-DEFECT: douyin 注册 19 层但只有 15 个唯一路径', () => {
    const paths = layerPaths(createDouyinRoutes('ck'))

    expect(paths).toHaveLength(19)
    expect(new Set(paths).size).toBe(15)
    expect(paths.filter((p) => p === '/fetch_one_work')).toHaveLength(5)
  })

  it.each([
    ['bilibili', () => createBilibiliRoutes('ck'), Object.keys(BilibiliMethodRoutes).length],
    ['kuaishou', () => createKuaishouRoutes('ck'), 6],
    ['xiaohongshu', () => createXiaohongshuRoutes('ck'), 7]
  ])('%s 的路径全部唯一', (_name, build, count) => {
    const paths = layerPaths(build())

    expect(paths).toHaveLength(count)
    expect(new Set(paths).size).toBe(count)
  })

  it('所有路由都注册为 GET', () => {
    const stack = (
      createDouyinRoutes('ck') as unknown as {
        stack: Array<{ route?: { methods: Record<string, boolean> } }>
      }
    ).stack
    for (const layer of stack) {
      if (layer.route) expect(layer.route.methods.get).toBe(true)
    }
  })
})

describe('参数校验中间件', () => {
  it('缺少必填参数时返回 400 与字段级错误', async () => {
    const base = await listen(buildApp(createDouyinRoutes('ck'), '/api/douyin'))
    const res = await fetch(base + '/api/douyin/fetch_user_info')

    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: number; message: string; errors: Array<{ field: string }> }
    expect(body.code).toBe(400)
    expect(body.message).toBe('参数验证失败')
    expect(body.errors.map((e) => e.field)).toContain('sec_uid')
  })

  it('校验失败时带上 requestPath', async () => {
    const base = await listen(buildApp(createDouyinRoutes('ck'), '/api/douyin'))
    const res = await fetch(base + '/api/douyin/fetch_work_comments?number=abc')
    const body = (await res.json()) as { requestPath: string }

    expect(body.requestPath).toContain('/api/douyin/fetch_work_comments')
  })

  it('query 参数被强转后进入业务层', async () => {
    const h = constantAdapter({ status_code: 0, comments: [], cursor: 0, has_more: 0 })
    const base = await listen(buildApp(createDouyinRoutes('ck', { adapter: h.adapter }), '/api/douyin'))
    await fetch(base + '/api/douyin/fetch_work_comments?aweme_id=7123&number=3')

    expect(Number(h.at(0).query.count)).toBe(3)
  })

  it('未注册的路径返回 404', async () => {
    const base = await listen(buildApp(createDouyinRoutes('ck'), '/api/douyin'))
    const res = await fetch(base + '/api/douyin/not_exist')

    expect(res.status).toBe(404)
  })
})

describe('KNOWN-DEFECT: /fetch_one_work 只会命中 parseWork', () => {
  it('请求成功，但行为固定为 parseWork', async () => {
    const h = constantAdapter({ status_code: 0, aweme_detail: { aweme_id: '7123' } })
    const base = await listen(buildApp(createDouyinRoutes('ck', { adapter: h.adapter }), '/api/douyin'))
    const res = await fetch(base + '/api/douyin/fetch_one_work?aweme_id=7123')

    expect(res.status).toBe(200)
    expect(h.count).toBe(1)
  })

  it('无法通过 HTTP 指定 videoWork / imageAlbumWork / slidesWork / textWork', () => {
    const routes = Object.entries(DouyinMethodRoutes).filter(([, path]) => path === '/fetch_one_work')

    expect(routes.map(([method]) => method)).toEqual(['parseWork', 'textWork', 'videoWork', 'imageAlbumWork', 'slidesWork'])
    expect(new Set(routes.map(([, path]) => path)).size).toBe(1)
  })
})

describe('响应状态码语义', () => {
  it('KNOWN-DEFECT: 业务失败仍返回 HTTP 200', async () => {
    const h = constantAdapter({ status_code: 2154, status_msg: '风控拦截' })
    const base = await listen(buildApp(createDouyinRoutes('ck', { adapter: h.adapter }), '/api/douyin'))
    const res = await fetch(base + '/api/douyin/fetch_one_work?aweme_id=7123')
    const body = (await res.json()) as { success: boolean; code: number }

    expect(res.status).toBe(200)
    expect(body.success).toBe(false)
    expect(body.code).toBe(500)
  })

  it('成功响应带 requestPath', async () => {
    const h = constantAdapter({ status_code: 0, aweme_detail: {} })
    const base = await listen(buildApp(createDouyinRoutes('ck', { adapter: h.adapter }), '/api/douyin'))
    const res = await fetch(base + '/api/douyin/fetch_one_work?aweme_id=7123')
    const body = (await res.json()) as { requestPath: string }

    expect(body.requestPath).toBe('/api/douyin/fetch_one_work?aweme_id=7123')
  })

  it('成功响应的键集合被锁定', async () => {
    const h = constantAdapter({ status_code: 0, aweme_detail: {} })
    const base = await listen(buildApp(createDouyinRoutes('ck', { adapter: h.adapter }), '/api/douyin'))
    const res = await fetch(base + '/api/douyin/fetch_one_work?aweme_id=7123')
    const body = (await res.json()) as Record<string, unknown>

    expect(Object.keys(body).sort()).toMatchSnapshot()
  })
})

describe('KNOWN-DEFECT: 服务没有任何鉴权', () => {
  it('无需凭证即可用运营者的 cookie 代理请求', async () => {
    const h = constantAdapter({ status_code: 0, aweme_detail: {} })
    const base = await listen(buildApp(createDouyinRoutes('operator-secret-cookie', { adapter: h.adapter }), '/api/douyin'))
    const res = await fetch(base + '/api/douyin/fetch_one_work?aweme_id=7123')

    expect(res.status).toBe(200)
    expect(h.last().headers.Cookie).toBe('operator-secret-cookie')
  })
})
