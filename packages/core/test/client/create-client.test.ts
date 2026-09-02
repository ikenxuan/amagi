import { MIGRATED, createClient, toV7Envelope } from 'amagi/client/createClient'
import { defineEndpoint, type } from 'amagi/contracts/endpoint'
import type { AmagiResult } from 'amagi/contracts/result'
import type { Result } from 'amagi/validation'
import { describe, expect, it } from 'vitest'
import zod from 'zod'
/**
 * client/createClient 的契约。
 *
 * 1.3 判据两条：
 * ① 打开 `MIGRATED.xiaohongshu`
 * ② legacy 路径套 `toV7Envelope()`（让其余三平台的信封形状也统一）
 */

describe('client/createClient - MIGRATED 开关（判据 ①）', () => {
  it('MIGRATED.xiaohongshu 已打开', () => {
    expect(MIGRATED.xiaohongshu).toBe(true)
  })

  it('MIGRATED.kuaishou 已打开（阶段 2 验收动作）', () => {
    expect(MIGRATED.kuaishou).toBe(true)
  })

  it('其他平台尚未打开', () => {
    expect(MIGRATED.douyin).toBeUndefined()
    expect(MIGRATED.bilibili).toBeUndefined()
  })
})

describe('client/createClient - toV7Envelope（判据 ②）', () => {
  it('成功信封：data 透传，meta 占位，顶层无 code', () => {
    const v6: Result<{ id: string }> = { success: true, data: { id: '1' }, message: '获取成功', code: 200, error: undefined as never }
    const envelope = toV7Envelope(v6, 'douyin', 'fetchVideoWork')

    expect(envelope.success).toBe(true)
    if (envelope.success) {
      expect(envelope.data).toEqual({ id: '1' })
      expect(envelope.message).toBe('获取成功')
      expect(envelope.meta.platform).toBe('douyin')
      expect(envelope.meta.endpoint).toBe('fetchVideoWork')
      expect('code' in envelope).toBe(false) // v7 顶层无 code
    }
  })

  it('失败信封：error 是 AmagiError 形状，code 进 http.status', () => {
    const v6: Result<never> = {
      success: false,
      message: '登录状态失效',
      code: 403,
      data: undefined as never,
      error: {
        code: 403 as unknown as never,
        data: null,
        amagiError: { errorDescription: '登录状态失效', requestType: 'douyin', requestUrl: 'https://x' },
        amagiMessage: '登录状态失效'
      }
    }
    const envelope = toV7Envelope(v6, 'douyin', 'fetchVideoWork')

    expect(envelope.success).toBe(false)
    if (!envelope.success) {
      expect(envelope.error.http?.status).toBe(403)
      expect(envelope.error.message).toBe('登录状态失效')
      expect(envelope.message).toBe('登录状态失效')
      expect('code' in envelope).toBe(false)
    }
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

  it('legacy 平台 fetcher 方法套 toV7Envelope：返回 AmagiResult 形状', async () => {
    const fetcher = client.douyin.fetcher as unknown as Record<string, (options?: unknown, cfg?: unknown) => Promise<AmagiResult<unknown>>>
    // 不真发请求：用一个必败的传输错误触发 v6 bound fetcher 的失败路径，
    // 信封形状必须是 AmagiResult（success / error / message / meta，无顶层 code）
    const result = await fetcher.fetchVideoWork(
      { aweme_id: '1' },
      { adapter: async () => {
          throw new Error('network down')
        } }
    )
    expect(result.success).toBe(false)
    expect(result).toHaveProperty('meta')
    expect('code' in result).toBe(false)
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