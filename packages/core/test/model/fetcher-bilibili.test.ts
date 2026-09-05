import { bilibiliFetcher, createBoundBilibiliFetcher } from 'amagi/model/fetchers'
/**
 * B站 fetcher 入口契约（阶段 6 改写版）。
 *
 * 阶段 6 起 `bilibiliFetcher`（静态）与 `createBoundBilibiliFetcher` 从
 * `bilibiliRegistry` 派生，不再走 v6 的手写方法层（internal → getdata）。
 * 本文件锁定入口形态层面的契约（端点级细节由
 * `test/platforms/bilibili/endpoints.test.ts` 锁）：
 * - 静态三参签名 + v7 信封；判定边界（code 缺失判成功等）在入口可见
 * - 纯计算端点（avToBv / bvToAv）零请求
 * - 失败全部是信封（不抛），业务码保留在 error 里
 * @see 06-migration.md「四种调用形态全部保留」
 */
import { describe, expect, it } from 'vitest'

import { constantAdapter, type AdapterHandle } from '../helpers/adapter'
import { BVID, bilibiliOk } from '../helpers/fixtures'

const COOKIE = 'SESSDATA=test; bili_jct=jct'

/** 大小写无关地读请求头（axios 会按写入大小写保留，平台默认头用小写） */
const headerOf = (h: AdapterHandle, name: string): string | undefined => {
  const req = h.last()
  const key = Object.keys(req.headers).find((k) => k.toLowerCase() === name)
  return key === undefined ? undefined : (req.headers[key] as string | undefined)
}

describe('bilibili 静态 fetcher（三参签名保持）', () => {
  it('返回 v7 成功信封，bvid 进查询参数、Cookie 随请求', async () => {
    const h = constantAdapter(bilibiliOk({ bvid: BVID }))
    const result = await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.meta.endpoint).toBe('bilibili.videoInfo')
    }
    expect(h.last().query.bvid).toBe(BVID)
    expect(headerOf(h, 'cookie')).toBe(COOKIE)
  })

  it('code 缺失时判成功（A2：v6 的 `code !== 0` 会把无 code 响应误判失败）', async () => {
    const h = constantAdapter({ data: { bvid: BVID } })
    const result = await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(true)
  })

  it('单次调用 headers.Cookie 覆盖绑定 cookie', async () => {
    const h = constantAdapter(bilibiliOk({ bvid: BVID }))
    await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, 'bound-ck', {
      adapter: h.adapter,
      headers: { Cookie: 'override-ck' }
    })

    expect(headerOf(h, 'cookie')).toBe('override-ck')
  })
})

describe('bilibili 失败路径（信封语义，不抛）', () => {
  it('业务失败 → 失败信封，业务码保留在 error.platform', async () => {
    const h = constantAdapter({ code: -404, message: '啥都木有' })
    const result = await bilibiliFetcher.fetchVideoInfo({ bvid: BVID }, COOKIE, { adapter: h.adapter })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.platform?.code).toBe(-404)
      expect(result.error.platform?.message).toBe('啥都木有')
    }
  })

  it('参数校验失败 → validation 失败信封', async () => {
    const result = await bilibiliFetcher.fetchVideoInfo({ bvid: '' }, COOKIE)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.kind).toBe('validation')
  })
})

describe('bilibili av / bv 纯计算端点（零请求）', () => {
  it('convertAvToBv 不发起任何 HTTP 请求，返回 { bvid }', async () => {
    const h = constantAdapter(bilibiliOk({}))
    const result = await bilibiliFetcher.convertAvToBv({ avid: 170001 }, COOKIE, { adapter: h.adapter })

    expect(h.count).toBe(0)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual({ bvid: 'BV17x411w7KC' })
  })

  it('convertBvToAv 返回 { aid: number }（A7：v6 带 av 前缀字符串）', async () => {
    const result = await bilibiliFetcher.convertBvToAv({ bvid: 'BV17x411w7KC' })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual({ aid: 170001 })
  })

  it('av -> bv -> av 往返一致', async () => {
    const toBv = await bilibiliFetcher.convertAvToBv({ avid: 170001 })
    if (!toBv.success) throw new Error('avToBv 失败')
    const toAv = await bilibiliFetcher.convertBvToAv({ bvid: toBv.data.bvid })

    expect(toAv.success).toBe(true)
    if (toAv.success) expect(toAv.data.aid).toBe(170001)
  })

  it('小数 avid 在入参阶段被拦（#35 修复）', async () => {
    const result = await bilibiliFetcher.convertAvToBv({ avid: 170.5 })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.kind).toBe('validation')
  })
})

describe('bilibili 绑定 fetcher', () => {
  it('cookie 绑在实例上，方法签名无 cookie 参', async () => {
    const h = constantAdapter(bilibiliOk({ bvid: BVID }))
    const bound = createBoundBilibiliFetcher(COOKIE)
    const result = await bound.fetchVideoInfo({ bvid: BVID }, { adapter: h.adapter })

    expect(result.success).toBe(true)
    expect(headerOf(h, 'cookie')).toBe(COOKIE)
  })
})
