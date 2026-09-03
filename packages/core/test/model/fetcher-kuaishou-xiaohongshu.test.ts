import { createBoundKuaishouFetcher, createBoundXiaohongshuFetcher, kuaishouFetcher, xiaohongshuFetcher } from 'amagi/model/fetchers'
/**
 * 快手 / 小红书 fetcher 入口契约（阶段 6 改写版）。
 *
 * 阶段 6 起静态 fetcher 与 bound 工厂从各自 registry 派生，不再走 v6 的
 * 手写方法层（internal → getdata）。本文件锁定入口形态层面的契约：
 * - 快手 graphql POST、小红书 xhs-post 签名（需要 a1 cookie）
 * - 小红书 cookie 带 a1 时不再跑 guest-cookie 前置请求
 * - 失败全部是信封（不抛），业务码保留在 error 里
 * @see 06-migration.md「四种调用形态全部保留」
 */
import { describe, expect, it } from 'vitest'

import { constantAdapter, type AdapterHandle } from '../helpers/adapter'

const KS_COOKIE = 'kuaishou.community.cookiename=test'

/** 小红书测试 cookie（xhs-post 签名器从 a1 取值，缺了会直接 internal 报错） */
const XHS_COOKIE = 'a1=1900000000abcdef0123456789abcdef; web_session=040069abc; webId=deadbeef'

/** 大小写无关地读请求头（axios 会按写入大小写保留，平台默认头用小写） */
const headerOf = (h: AdapterHandle, name: string): string | undefined => {
  const req = h.last()
  const key = Object.keys(req.headers).find((k) => k.toLowerCase() === name)
  return key === undefined ? undefined : (req.headers[key] as string | undefined)
}

describe('kuaishou 静态 fetcher', () => {
  it('fetchVideoWork：graphql POST 成功信封，body 带 operationName/query/variables', async () => {
    const h = constantAdapter({ data: { visionVideoDetail: { status: 1, type: 'video' } } })
    const result = await kuaishouFetcher.fetchVideoWork({ photoId: '3x1' }, KS_COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    if (result.success) expect(result.meta.endpoint).toBe('kuaishou.videoWork')
    const body = JSON.parse(String(h.last().data)) as { operationName?: string; variables?: { photoId?: string } }
    expect(body.operationName).toBe('visionVideoDetail')
    expect(body.variables?.photoId).toBe('3x1')
    expect(headerOf(h, 'cookie')).toBe(KS_COOKIE)
  })

  it('平台基线注入浏览器 UA（集中维护的 DEFAULT_UA，无 Edg）', async () => {
    const h = constantAdapter({ data: { visionVideoDetail: { status: 1, type: 'video' } } })
    await kuaishouFetcher.fetchVideoWork({ photoId: '3x1' }, KS_COOKIE, { adapter: h.adapter })

    expect(headerOf(h, 'user-agent')).toContain('Chrome/142')
    expect(headerOf(h, 'user-agent')).not.toContain('Edg')
  })

  it('bound fetcher：cookie 绑在实例上', async () => {
    const h = constantAdapter({ data: { visionVideoDetail: { status: 1, type: 'video' } } })
    const bound = createBoundKuaishouFetcher(KS_COOKIE)
    const result = await bound.fetchVideoWork({ photoId: '3x1' }, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(headerOf(h, 'cookie')).toBe(KS_COOKIE)
  })
})

describe('xiaohongshu 静态 fetcher', () => {
  it('fetchNoteDetail：POST 成功信封（note_id 进请求体）', async () => {
    const h = constantAdapter({ code: 0, success: true, msg: 'ok', data: { items: [] } })
    const result = await xiaohongshuFetcher.fetchNoteDetail({ note_id: 'n1', xsec_token: 'tk' }, XHS_COOKIE, {
      adapter: h.adapter
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.meta.endpoint).toBe('xiaohongshu.noteDetail')
    expect(JSON.stringify(h.last().data)).toContain('n1')
    expect(headerOf(h, 'cookie')).toBe(XHS_COOKIE)
  })

  it('fetchHomeFeed：cookie 带 a1 时不再跑 guest-cookie 前置请求（只发一次）', async () => {
    const h = constantAdapter({ code: 0, success: true, msg: 'ok', data: { items: [] } })
    const result = await xiaohongshuFetcher.fetchHomeFeed({}, XHS_COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(h.count).toBe(1)
  })

  it('业务失败（code 非 0）→ 失败信封，业务码保留', async () => {
    const h = constantAdapter({ code: -1, success: false, msg: '账号异常' })
    const result = await xiaohongshuFetcher.fetchNoteDetail({ note_id: 'n1', xsec_token: 'tk' }, XHS_COOKIE, {
      adapter: h.adapter
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.platform?.code).toBe(-1)
  })

  it('bound fetcher：cookie 绑在实例上', async () => {
    const h = constantAdapter({ code: 0, success: true, msg: 'ok', data: { items: [] } })
    const bound = createBoundXiaohongshuFetcher(XHS_COOKIE)
    const result = await bound.fetchNoteDetail({ note_id: 'n1', xsec_token: 'tk' }, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(headerOf(h, 'cookie')).toBe(XHS_COOKIE)
  })
})

/**
 * 回归：快手 `{ result: 2 }` 的失败信封走完整管线后必须是 success: false。
 *
 * 现场是 HTTP 方式（`/kuaishou/fetch_one_work?photoId=...`），拿到
 * `{ result: 2, error_msg: null, request_id: '...' }` + HTTP 200，信封却是
 * `success: true`、`data` 就是那三个字段。HTTP 路由与 fetcher 共用同一条
 * 执行管线（`callEndpoint`），所以用 fetcher 复现等价。
 */
describe('回归：快手 result 状态位走完整管线', () => {
  it('result: 2 → 失败信封，业务码 2 进 error.platform.code', async () => {
    const h = constantAdapter({ result: 2, error_msg: null, request_id: '788470114808729440' })
    const result = await kuaishouFetcher.fetchVideoWork({ photoId: '3xkaju83ykw6rfs' }, KS_COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('unknown')
      expect(result.error.code).toBe('PLATFORM_ERROR')
      // result 排在 code / status_code / statusCode 之后兜底，这里没有前三个
      expect(result.error.platform?.code).toBe(2)
      expect(result.error.http?.status).toBe(200)
    }
    // 关键：那三个字段不能作为 data 透出去
    expect(result.data).toBeUndefined()
  })

  it('error_msg 有值时进 error.platform.message', async () => {
    const h = constantAdapter({ result: 2, error_msg: '作品不存在或已删除', request_id: 'r1' })
    const result = await kuaishouFetcher.fetchVideoWork({ photoId: '3x1' }, KS_COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.platform?.message).toBe('作品不存在或已删除')
      expect(result.error.message).toBe('作品不存在或已删除')
    }
  })

  it('正常 graphql 响应（无 result 字段）不受影响', async () => {
    const h = constantAdapter({ data: { visionVideoDetail: { photo: { id: '3x1' } } } })
    const result = await kuaishouFetcher.fetchVideoWork({ photoId: '3x1' }, KS_COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
  })
})
