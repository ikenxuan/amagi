import type { ClientCtx } from 'amagi/client/fetcher'
import { createFetcherFromRegistry } from 'amagi/client/fetcher'
import { kuaishouApiUrls } from 'amagi/platforms/kuaishou/api'
import { createKuaishouConfig } from 'amagi/platforms/kuaishou/config'
import { kuaishouRegistry } from 'amagi/platforms/kuaishou/endpoints'
import { kuaishouJudge } from 'amagi/platforms/kuaishou/judge'
import { resetKuaishouSignerState } from 'amagi/platforms/kuaishou/sign/steps'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
import type { AxiosAdapter } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const setup = (pages: unknown[]) => {
  const requests: Array<{ method?: string; url: URL; body: unknown; headers: Record<string, unknown> }> = []
  const adapter: AxiosAdapter = async (config) => {
    requests.push({ method: config.method, url: new URL(config.url!), body: config.data, headers: config.headers.toJSON() })
    return { data: pages[requests.length - 1], status: 200, statusText: 'OK', headers: {}, config }
  }
  const trace = new TraceCollector()
  const cookie = 'did=test-device; kwfv1=test-credential'
  const baseline = createKuaishouConfig(cookie, {})
  const http = new HttpClient({ trace, requestConfig: { adapter }, headers: baseline.headers.toJSON() })
  const sleep = vi.fn(async (_ms: number) => {})
  const ctx: ClientCtx = {
    clientId: 'rest-test',
    platform: 'kuaishou',
    cookie,
    userAgent: 'test-browser/1',
    requestConfig: {},
    trace,
    judge: kuaishouJudge,
    sleep,
    send: (spec, reason) => http.send(spec, reason)
  }
  return { fetcher: createFetcherFromRegistry('kuaishou', kuaishouRegistry, ctx), requests, sleep }
}

const users = (n: number, offset = 0) => Array.from({ length: n }, (_, i) => ({ user_id: `test-user-${offset + i}` }))
const feeds = (n: number, offset = 0) => Array.from({ length: n }, (_, i) => ({ photo: { id: `test-work-${offset + i}` } }))

beforeEach(() => resetKuaishouSignerState())

describe('快手 PC REST 搜索', () => {
  it('用户首屏三键按抓包顺序发送，签名与设备凭据进入请求', async () => {
    const h = setup([{ result: 1, users: users(30), pcursor: '1', searchSessionId: 'test-session' }])
    const result = await h.fetcher.fetchSearchUser({ keyword: '测试' })
    expect(result.success).toBe(true)
    expect(result.data?.users).toHaveLength(30)
    expect(h.requests).toHaveLength(1)
    const req = h.requests[0]!
    expect(req.method).toBe('post')
    expect(req.url.origin).toBe('https://www.kuaishou.com')
    expect(req.url.pathname).toBe('/rest/v/search/user')
    expect(req.body).toBe(JSON.stringify({ keyword: '测试', pcursor: '', searchSessionId: '' }))
    expect(req.url.searchParams.get('__NS_hxfalcon')).toMatch(/^HUDR_/)
    expect(req.url.searchParams.get('caver')).toBe('2')
    expect(req.headers.kww).toEqual(expect.any(String))
    expect(req.headers.Cookie ?? req.headers.cookie).toBe('did=test-device; kwfv1=test-credential')
    expect(h.sleep).not.toHaveBeenCalled()
  })

  it('作品分页切换三键形状，保留会话并裁剪目标条数', async () => {
    const h = setup([
      { result: 1, feeds: feeds(19), pcursor: '1', searchSessionId: 'test-session' },
      { result: 1, feeds: feeds(20, 19), pcursor: '2' },
      { result: 1, feeds: feeds(20, 39), pcursor: 'no_more' }
    ])
    const result = await h.fetcher.fetchSearchWorkList({ keyword: '测试', number: 42 })
    expect(result.success).toBe(true)
    expect(result.data?.feeds).toHaveLength(42)
    expect(result.data?.feeds?.[41]?.photo?.id).toBe('test-work-41')
    expect(h.requests.map((r) => r.url.pathname)).toEqual(Array(3).fill('/rest/v/search/feed'))
    expect(h.requests.map((r) => r.body)).toEqual([
      JSON.stringify({ keyword: '测试', page: 'search', webPageArea: '', pcursor: '' }),
      JSON.stringify({ keyword: '测试', pcursor: '1', searchSessionId: 'test-session' }),
      JSON.stringify({ keyword: '测试', pcursor: '2', searchSessionId: 'test-session' })
    ])
    expect(h.sleep.mock.calls).toEqual([[10_000], [10_000]])
  })

  it('作品默认目标为 20，用户分页保留搜索会话', async () => {
    const works = setup([{ result: 1, feeds: feeds(20), pcursor: '1', searchSessionId: 'test-session' }])
    expect((await works.fetcher.fetchSearchWorkList({ keyword: '测试' })).data?.feeds).toHaveLength(20)
    expect(works.requests).toHaveLength(1)
    const h = setup([
      { result: 1, users: users(30), pcursor: '1', searchSessionId: 'test-session' },
      { result: 1, users: users(30, 30), pcursor: '2' },
      { result: 1, users: users(30, 60), pcursor: 'no_more' }
    ])
    const result = await h.fetcher.fetchSearchUser({ keyword: '测试', number: 65 })
    expect(result.data?.users).toHaveLength(65)
    expect(h.requests[2]!.body).toBe(JSON.stringify({ keyword: '测试', pcursor: '2', searchSessionId: 'test-session' }))
  })

  it.each(['no_more', '', undefined])('结束游标 %s 不翻页', async (pcursor) => {
    const h = setup([{ result: 1, users: users(2), pcursor }])
    const result = await h.fetcher.fetchSearchUser({ keyword: '测试', number: 50 })
    expect(result.data?.users).toHaveLength(2)
    expect(h.requests).toHaveLength(1)
  })

  it('空列表即使带后续游标也停止', async () => {
    const h = setup([{ result: 1, feeds: [], pcursor: '1', searchSessionId: 'test-session' }])
    expect((await h.fetcher.fetchSearchWorkList({ keyword: '测试' })).data?.feeds).toEqual([])
    expect(h.requests).toHaveLength(1)
  })

  it.each(['fetchSearchUser', 'fetchSearchWorkList'] as const)('%s 缺失分页会话时明确失败，不重发首屏', async (method) => {
    const h = setup([{ result: 1, users: users(1), feeds: feeds(1), pcursor: '1' }])
    const result = await h.fetcher[method]({ keyword: '测试', number: 2 })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('DECODE_FAILED')
    expect(h.requests).toHaveLength(1)
  })

  it('中途业务拒绝保留已有结果并标注 incomplete，不重试', async () => {
    const h = setup([{ result: 1, users: users(2), pcursor: '1', searchSessionId: 'test-session' }, { result: 2 }])
    const result = await h.fetcher.fetchSearchUser({ keyword: '测试', number: 3 })
    expect(result.success).toBe(true)
    expect(result.data?.users).toHaveLength(2)
    expect(result.meta.incomplete?.code).toBe('RATE_LIMITED')
    expect(h.requests).toHaveLength(2)
  })

  it('首屏拒绝保持失败', async () => {
    const h = setup([{ result: 2 }])
    const result = await h.fetcher.fetchSearchWorkList({ keyword: '测试' })
    expect(result.success).toBe(false)
    expect(h.requests).toHaveLength(1)
  })

  it.each([0, 501, 1.5])('非法 number %s 不发送请求', async (number) => {
    const h = setup([])
    expect((await h.fetcher.fetchSearchUser({ keyword: '测试', number })).success).toBe(false)
    expect(h.requests).toHaveLength(0)
  })

  it('number 接受数字字符串；空关键词不发送请求', async () => {
    const h = setup([{ result: 1, users: users(2) }])
    // @ts-expect-error SDK 只接收 number；这里覆盖 JS/HTTP 入口仍保留的运行时 coerce。
    expect((await h.fetcher.fetchSearchUser({ keyword: '测试', number: '1' })).data?.users).toHaveLength(1)
    expect((await h.fetcher.fetchSearchWorkList({ keyword: '' })).success).toBe(false)
    expect(h.requests).toHaveLength(1)
  })
})

describe('快手当前账号资料', () => {
  it('GET 无请求体，响应资料保持顶层结构', async () => {
    const payload = { result: 1, eid: 'test-eid', userDefineId: 'test-kwaiid', userId: 123, userTex: '' }
    const h = setup([payload])
    const result = await h.fetcher.fetchLoginUserProfile({})
    expect(result.success).toBe(true)
    expect(result.data).toEqual(payload)
    expect(h.requests[0]!.method).toBe('get')
    expect(h.requests[0]!.url.pathname).toBe('/rest/v/profile/get')
    expect(h.requests[0]!.body).toBeUndefined()
    expect(h.requests[0]!.url.searchParams.has('__NS_hxfalcon')).toBe(true)
  })

  it('注册游客的 result 109 判为失败', async () => {
    const h = setup([{ result: 109 }])
    const result = await h.fetcher.fetchLoginUserProfile({})
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.platform?.code).toBe(109)
    expect(h.requests).toHaveLength(1)
  })

  it('低层构造器同样拒绝缺会话的翻页', () => {
    expect(() => kuaishouApiUrls.searchUser({ keyword: '测试', pcursor: '1' })).toThrow('searchSessionId')
    expect(() => kuaishouApiUrls.searchWorkList({ keyword: '测试', pcursor: '1' })).toThrow('searchSessionId')
  })
})
