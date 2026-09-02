import { MIGRATED, createClient } from 'amagi/client/createClient'
import { defineEndpoint, type } from 'amagi/contracts/endpoint'
import type { AmagiResult } from 'amagi/contracts/result'
import { describe, expect, it } from 'vitest'
import zod from 'zod'
/**
 * client/createClient 的契约。
 *
 * 判据：四平台全部打开 `MIGRATED`（阶段 4.3 验收动作），fetcher 全部是
 * registry 派生，过渡期的 `toV7Envelope` 已删。
 */

describe('client/createClient - MIGRATED 开关', () => {
  it('MIGRATED.xiaohongshu 已打开', () => {
    expect(MIGRATED.xiaohongshu).toBe(true)
  })

  it('MIGRATED.kuaishou 已打开（阶段 2 验收动作）', () => {
    expect(MIGRATED.kuaishou).toBe(true)
  })

  it('MIGRATED.douyin 已打开（阶段 3 验收动作）', () => {
    expect(MIGRATED.douyin).toBe(true)
  })

  it('MIGRATED.bilibili 已打开（阶段 4 验收动作）', () => {
    expect(MIGRATED.bilibili).toBe(true)
  })
})

describe('client/createClient - 门面形状', () => {
  const client = createClient({ cookies: { xiaohongshu: 'a1=ck' } })

  it('顶层键与 v6 一致', () => {
    expect(Object.keys(client).sort()).toEqual(['bilibili', 'douyin', 'events', 'kuaishou', 'on', 'once', 'startServer', 'xiaohongshu'])
  })

  it('每平台模块带 fetcher 与 utils', () => {
    for (const platform of ['douyin', 'bilibili', 'kuaishou', 'xiaohongshu'] as const) {
      expect(client[platform]).toHaveProperty('fetcher')
    }
    expect(client.xiaohongshu).toHaveProperty('sign')
    expect(client.douyin).toHaveProperty('douyinApiUrls')
  })

  it('startServer / events / on / once 齐全', () => {
    expect(typeof client.startServer).toBe('function')
    expect(typeof client.on).toBe('function')
    expect(typeof client.once).toBe('function')
    expect(client.events).toBeDefined()
  })

  it('xiaohongshu fetcher 是 registry 派生的 v7 fetcher（方法名与 v6 一致）', () => {
    const fetcher = client.xiaohongshu.fetcher as unknown as Record<string, unknown>
    expect(typeof fetcher.fetchHomeFeed).toBe('function')
    expect(typeof fetcher.fetchNoteDetail).toBe('function')
    expect(typeof fetcher.fetchNoteComments).toBe('function')
    expect(typeof fetcher.fetchUserProfile).toBe('function')
    expect(typeof fetcher.fetchUserNoteList).toBe('function')
    expect(typeof fetcher.fetchEmojiList).toBe('function')
    expect(typeof fetcher.searchNotes).toBe('function') // 不规则映射
    expect(fetcher.fetchSearchNotes).toBeUndefined()
  })

  it('kuaishou fetcher 是 registry 派生的 v7 fetcher（方法名与 v6 一致）', () => {
    const fetcher = client.kuaishou.fetcher as unknown as Record<string, unknown>
    expect(typeof fetcher.fetchVideoWork).toBe('function')
    expect(typeof fetcher.fetchWorkComments).toBe('function')
    expect(typeof fetcher.fetchUserProfile).toBe('function')
    expect(typeof fetcher.fetchUserWorkList).toBe('function')
    expect(typeof fetcher.fetchLiveRoomInfo).toBe('function')
    expect(typeof fetcher.fetchEmojiList).toBe('function')
  })

  it('douyin fetcher 是 registry 派生的 v7 fetcher（方法名与 v6 一致，含不规则映射）', () => {
    const fetcher = client.douyin.fetcher as unknown as Record<string, unknown>
    expect(typeof fetcher.fetchVideoWork).toBe('function')
    expect(typeof fetcher.parseWork).toBe('function') // 不规则：无 fetch 前缀
    expect(fetcher.fetchParseWork).toBeUndefined()
    expect(typeof fetcher.fetchWorkComments).toBe('function') // 不规则：comments
    expect(typeof fetcher.searchContent).toBe('function') // 不规则：search
    expect(fetcher.fetchSearch).toBeUndefined()
    expect(typeof fetcher.requestLoginQrcode).toBe('function') // 不规则：request 前缀
    expect(typeof fetcher.fetchDanmakuList).toBe('function')
  })

  it('bilibili fetcher 是 registry 派生的 v7 fetcher（方法名与 v6 一致）', () => {
    const fetcher = client.bilibili.fetcher as unknown as Record<string, unknown>
    expect(typeof fetcher.fetchVideoInfo).toBe('function')
    expect(typeof fetcher.fetchComments).toBe('function')
    expect(typeof fetcher.fetchVideoStreamUrl).toBe('function') // 不规则：多了 Url 后缀
    expect(typeof fetcher.convertAvToBv).toBe('function') // 不规则：convert 前缀
    expect(typeof fetcher.requestLoginQrcode).toBe('function')
  })
})

describe('client/createClient - 假端点走 v7 管线', () => {
  it('xiaohongshu fetcher 走完整管线产出 AmagiResult（adapter 注入）', async () => {
    const fakeEcho = defineEndpoint({
      name: 'xiaohongshu.fakeEcho',
      route: '/__fake_echo',
      params: zod.object({ aweme_id: zod.string().min(1) }),
      build: (p) => ({ method: 'GET', url: `https://example.com/echo?id=${p.aweme_id}` }),
      response: type<{ ok: true }>()
    })

    const client = createClient({
      cookies: { xiaohongshu: 'a1=1900000000abcdef0123456789abcdef' },
      request: {
        adapter: async (config) => ({
          data: { code: 0, success: true, msg: 'ok', data: { ok: true } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config as never
        })
      }
    })

    // createClient 用的是固定 registry，这里直接验证注册表里的端点方法可调用
    const fetcher = client.xiaohongshu.fetcher as unknown as Record<string, (options?: unknown) => Promise<AmagiResult<unknown>>>
    const result = await fetcher.fetchHomeFeed({ num: 5 })
    expect(result.success).toBe(true)
    expect(result).toHaveProperty('meta')
    expect('code' in result).toBe(false)
    void fakeEcho
  })
})