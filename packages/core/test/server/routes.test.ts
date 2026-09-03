/**
 * HTTP 服务层（阶段 6 改写版）。
 *
 * 阶段 6 起 `createXxxRoutes` 从 v7 registry 派生 —— 不再走 v6 的
 * `XxxMethodRoutes` 表 + 校验中间件 + `fetchXxxInternal`（getdata）。
 * 本文件锁定改道后的 HTTP 契约：
 *
 * - **注册**：层数 = registry 端点数、路径全部唯一（修 #47/#48/#54）、全 GET
 * - **信封**：成功 / 校验失败 / 业务失败都是 AmagiResult + `requestPath`，
 *   业务失败仍 200（信封语义，与 v7-routes.test.ts 一致）
 * - **作品路由拆分**：`/fetch_one_work` 只服务 parseWork，其余 4 个作品
 *   methodType 各自可达（v6 里被遮蔽）
 * - **鉴权 #50 保留**：服务默认无鉴权（opt-in token 见
 *   `server/auth.ts` 与 v7-auth.test.ts，默认行为 v8 才改）
 *
 * 曾经锁在快照里的 v6 行为（19 层 15 条唯一路径、校验 400、`body.code`）
 * 逐条被迁移矩阵改写 —— 见 06-migration.md。
 */
import { createBilibiliRoutes, createDouyinRoutes, createKuaishouRoutes, createXiaohongshuRoutes } from 'amagi/platform'
import { bilibiliRegistry } from 'amagi/platforms/bilibili/endpoints'
import { douyinRegistry } from 'amagi/platforms/douyin/endpoints'
import { kuaishouRegistry } from 'amagi/platforms/kuaishou/endpoints'
import { xiaohongshuRegistry } from 'amagi/platforms/xiaohongshu/endpoints'
import express from 'express'
import { afterEach, describe, expect, it } from 'vitest'

import { constantAdapter } from '../helpers/adapter'
import { closeAllServers, listenOnRandomPort } from '../helpers/listen'

/**
 * 起服务拿 base URL。原先本文件自带一份实现，两个坑：端口拿不到时兜底成 `0`
 * （报错现场变成 `fetch` 的 `bad port`，与成因无关），以及模块级 `server` 单例
 * （一条用例里起两台就漏掉第一台）。两者都收进 `helpers/listen.ts`。
 * @param app - Express 应用
 * @returns base URL
 */
const listen = async (app: express.Application): Promise<string> => (await listenOnRandomPort(app)).base

afterEach(closeAllServers)

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

/** 一次 HTTP 请求的响应信封（挑断言要用的字段） */
type Envelope = {
  success?: boolean
  data?: { aweme_detail?: { aweme_id?: string }; bvid?: string }
  error?: { kind?: string; code?: string }
  meta?: { endpoint?: string }
  requestPath?: string
}

const get = async (base: string, path: string): Promise<{ status: number; body: Envelope }> => {
  const res = await fetch(base + path)
  return { status: res.status, body: (await res.json()) as Envelope }
}

describe('路由注册（registry 派生）', () => {
  it('douyin 19 条路径全部唯一（修 #47/#48/#54：v6 是 19 层 15 条唯一路径）', () => {
    const paths = layerPaths(createDouyinRoutes('ck'))

    expect(paths).toHaveLength(Object.keys(douyinRegistry).length)
    expect(new Set(paths).size).toBe(Object.keys(douyinRegistry).length)
  })

  it.each([
    ['bilibili', () => createBilibiliRoutes('ck'), bilibiliRegistry],
    ['kuaishou', () => createKuaishouRoutes('ck'), kuaishouRegistry],
    ['xiaohongshu', () => createXiaohongshuRoutes('ck'), xiaohongshuRegistry]
  ] as const)('%s 的路径全部唯一且等于 registry 端点数', (_name, build, registry) => {
    const paths = layerPaths(build())

    expect(paths).toHaveLength(Object.keys(registry).length)
    expect(new Set(paths).size).toBe(Object.keys(registry).length)
  })

  it('所有路由都注册为 GET（与 v6 一致）', () => {
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

describe('HTTP 信封（AmagiResult + requestPath）', () => {
  it('成功：/fetch_one_work 走 parseWork 端点，带 requestPath', async () => {
    const h = constantAdapter({ status_code: 0, aweme_detail: { aweme_id: '7123' } })
    const base = await listen(buildApp(createDouyinRoutes('ck', { adapter: h.adapter }), '/api/douyin'))
    const { status, body } = await get(base, '/api/douyin/fetch_one_work?aweme_id=7123')

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data?.aweme_detail?.aweme_id).toBe('7123')
    expect(body.meta?.endpoint).toBe('douyin.parseWork')
    expect(body.requestPath).toBe('/api/douyin/fetch_one_work?aweme_id=7123')
  })

  it('成功响应的键集合被锁定（v6 的 code 键已随顶层 code 删除）', async () => {
    const h = constantAdapter({ status_code: 0, aweme_detail: {} })
    const base = await listen(buildApp(createDouyinRoutes('ck', { adapter: h.adapter }), '/api/douyin'))
    const res = await fetch(base + '/api/douyin/fetch_one_work?aweme_id=7123')
    const body = (await res.json()) as Record<string, unknown>

    expect(Object.keys(body).sort()).toMatchSnapshot()
  })

  it('缺必填参数时返回失败信封（HTTP 200，参数校验在管线里）', async () => {
    const base = await listen(buildApp(createDouyinRoutes('ck'), '/api/douyin'))
    const { status, body } = await get(base, '/api/douyin/fetch_user_info')

    expect(status).toBe(200)
    expect(body.success).toBe(false)
    expect(body.error?.kind).toBe('validation')
    expect(body.error?.code).toBe('PARAM_INVALID')
  })

  it('业务失败（风控）返回失败信封（HTTP 200），原始业务码留在信封里', async () => {
    const h = constantAdapter({ status_code: 2154, status_msg: '风控拦截' })
    const base = await listen(buildApp(createDouyinRoutes('ck', { adapter: h.adapter }), '/api/douyin'))
    const { status, body } = await get(base, '/api/douyin/fetch_one_work?aweme_id=7123')

    expect(status).toBe(200)
    expect(body.success).toBe(false)
    expect(body.error?.kind).toBeDefined()
  })

  it('未注册的路径返回 404', async () => {
    const base = await listen(buildApp(createDouyinRoutes('ck'), '/api/douyin'))
    const res = await fetch(base + '/api/douyin/not_exist')

    expect(res.status).toBe(404)
  })
})

describe('作品路由拆分（#47/#48/#54 修复：v6 只有 /fetch_one_work 可达）', () => {
  const CASES = [
    ['/fetch_video_work', 'douyin.videoWork'],
    ['/fetch_image_album_work', 'douyin.imageAlbumWork'],
    ['/fetch_slides_work', 'douyin.slidesWork'],
    ['/fetch_text_work', 'douyin.textWork'],
    ['/fetch_one_work', 'douyin.parseWork']
  ] as const

  it.each(CASES)('%s 命中 %s（不再是 5 个 methodType 抢同一条路由）', async (path, endpoint) => {
    const h = constantAdapter({ status_code: 0, aweme_detail: {} })
    const base = await listen(buildApp(createDouyinRoutes('ck', { adapter: h.adapter }), '/api/douyin'))
    const { status, body } = await get(base, `/api/douyin${path}?aweme_id=7123`)

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.meta?.endpoint).toBe(endpoint)
  })
})

describe('四平台端到端（每平台一个代表端点）', () => {
  it('bilibili /fetch_one_video → bilibili.videoInfo', async () => {
    const h = constantAdapter({ code: 0, message: '0', data: { bvid: 'BV1xx411c7mD' } })
    const base = await listen(buildApp(createBilibiliRoutes('ck', { adapter: h.adapter }), '/api/bilibili'))
    const { status, body } = await get(base, '/api/bilibili/fetch_one_video?bvid=BV1xx411c7mD')

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.meta?.endpoint).toBe('bilibili.videoInfo')
  })

  it('kuaishou /fetch_one_work → kuaishou.videoWork', async () => {
    const h = constantAdapter({ data: { visionVideoDetail: { status: 1, type: 'video' } } })
    const base = await listen(buildApp(createKuaishouRoutes('ck', { adapter: h.adapter }), '/api/kuaishou'))
    const { status, body } = await get(base, '/api/kuaishou/fetch_one_work?photoId=3x1')

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.meta?.endpoint).toBe('kuaishou.videoWork')
  })

  it('xiaohongshu /fetch_one_note → xiaohongshu.noteDetail', async () => {
    // xhs-post 签名器从 cookie 里取 a1（缺 a1 会直接报 internal 错误），
    // 与小红书端点的测试夹具同款
    const h = constantAdapter({ code: 0, success: true, msg: 'ok', data: { items: [] } })
    const base = await listen(
      buildApp(createXiaohongshuRoutes('a1=1900000000abcdef0123456789abcdef; web_session=040069abc; webId=deadbeef', { adapter: h.adapter }), '/api/xiaohongshu')
    )
    const { status, body } = await get(base, '/api/xiaohongshu/fetch_one_note?note_id=n1&xsec_token=tk')

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.meta?.endpoint).toBe('xiaohongshu.noteDetail')
  })
})

describe('HTTP 服务鉴权（默认关闭，opt-in token）', () => {
  it('无需凭证即可用运营者的 cookie 代理请求', async () => {
    const h = constantAdapter({ status_code: 0, aweme_detail: {} })
    const base = await listen(buildApp(createDouyinRoutes('operator-secret-cookie', { adapter: h.adapter }), '/api/douyin'))
    const res = await fetch(base + '/api/douyin/fetch_one_work?aweme_id=7123')

    expect(res.status).toBe(200)
    expect(h.last().headers.Cookie).toBe('operator-secret-cookie')
  })
})
