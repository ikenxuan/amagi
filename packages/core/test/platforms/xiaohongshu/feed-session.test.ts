import type { Server } from 'node:http'

import { createClient } from 'amagi/client/createClient'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'

const session = {
  cookie: 'a1=1900000000abcdef0123456789abcdef; web_session=fixture-session',
  b1: 'fixture-b1',
  userId: 'fixture-user'
}
const params = { note_id: 'fixture-note', xsec_token: 'fixture-token' }
const transport = () => {
  const requests: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config)
    return { status: 200, statusText: 'OK', config, headers: {}, data: { code: 0, success: true, data: {} } }
  }
  return { requests, adapter }
}

describe('小红书 feed 会话分片与追踪头', () => {
  it('按会话用户分片，不按笔记 ID 分片，并补齐追踪头', async () => {
    const h = transport()
    const client = createClient({ xiaohongshuSession: session, request: { adapter: h.adapter } })
    for (const note_id of ['first-note', 'second-note']) {
      expect((await client.xiaohongshu.fetcher.fetchNoteDetail({ ...params, note_id })).success).toBe(true)
    }
    expect(h.requests).toHaveLength(2)
    for (const request of h.requests) {
      expect(request.headers.get('xy-direction')).toBe('57')
      expect(request.headers.get('x-b3-traceid')).toMatch(/^[a-f0-9]{16}$/)
      expect(request.headers.get('content-type')).toBe('application/json;charset=UTF-8')
      expect(JSON.stringify(request)).not.toContain(session.userId)
    }
  })

  it('homeFeed 也按会话用户分片并补齐追踪头', async () => {
    // 2026-10-06 抓包：explore 页的 `homefeed` 与笔记详情的 `feed` 同形，
    // 两个头都在。这条盯住 homeFeed 的签名清单别退回只有 x-s + rap。
    const h = transport()
    const client = createClient({ xiaohongshuSession: session, request: { adapter: h.adapter } })
    expect((await client.xiaohongshu.fetcher.fetchHomeFeed({ num: 10 })).success).toBe(true)
    expect(h.requests).toHaveLength(1)
    expect(h.requests[0].headers.get('xy-direction')).toBe('57')
    expect(h.requests[0].headers.get('x-b3-traceid')).toMatch(/^[a-f0-9]{16}$/)
    expect(h.requests[0].headers.get('x-rap-param')).toBeTruthy()
  })

  it('用户 ID 缺失或 Cookie 被替换时不使用旧会话分片', async () => {
    const h = transport()
    const client = createClient({ xiaohongshuSession: session, request: { adapter: h.adapter } })
    const withoutUser = createClient({
      xiaohongshuSession: { cookie: session.cookie, b1: session.b1 },
      request: { adapter: h.adapter }
    })
    expect((await withoutUser.xiaohongshu.fetcher.fetchNoteDetail(params)).success).toBe(true)
    expect(
      (
        await client.xiaohongshu.fetcher.fetchNoteDetail(params, {
          headers: { Cookie: session.cookie.replace('fixture-session', 'another-session') }
        })
      ).success
    ).toBe(true)
    for (const request of h.requests) expect(request.headers.get('xy-direction')).toBeUndefined()
    expect((await client.xiaohongshu.fetcher.fetchNoteDetail(params)).success).toBe(true)
    expect(h.requests[2].headers.get('xy-direction')).toBe('57')
  })

  it('通过真实本地 HTTP 路由传递绑定会话，不访问上游', async () => {
    const h = transport()
    const client = createClient({ xiaohongshuSession: session, request: { adapter: h.adapter } })
    let server: Server | undefined
    try {
      await new Promise<void>((resolve, reject) => {
        client.startServer(0, {
          listen: (app) => {
            server = app.listen(0, '127.0.0.1', (error) => (error ? reject(error) : resolve()))
          }
        })
      })
      const address = server!.address()
      if (!address || typeof address === 'string') throw new Error('本地测试服务未监听')
      const response = await fetch(`http://127.0.0.1:${address.port}/api/xiaohongshu/fetch_one_note?${new URLSearchParams(params)}`)
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ success: true })
      expect(h.requests).toHaveLength(1)
      expect(h.requests[0].headers.get('cookie')).toBe(session.cookie)
      expect(h.requests[0].headers.get('xy-direction')).toBe('57')
      expect(h.requests[0].headers.get('x-b3-traceid')).toMatch(/^[a-f0-9]{16}$/)
    } finally {
      if (server) await new Promise<void>((resolve, reject) => server!.close((error) => (error ? reject(error) : resolve())))
    }
  })
})
