/**
 * compat 入口（`@ikenxuan/amagi/compat`）—— 阶段门 7 判据：
 * **一份 v6 写法的用例在 compat 入口下全绿**。
 *
 * 断言面：toLegacy 纯转换（成功 / 失败 kind 映射）、client 工厂四平台
 * fetcher、静态 fetcher、bound 工厂，v6 的 try/catch + else 读法全绿；
 * v6 保留下来的方法（返回带 `code` 的 v6 信封）按透传规则不二次转换。
 */
import { ValidationError } from 'amagi/utils/errors'
import type { AmagiError } from 'amagi/contracts/error'
import type { AxiosAdapter } from 'axios'
import { describe, expect, it } from 'vitest'

import compatDefault, {
  toLegacy,
  compatDouyinFetcher,
  compatBilibiliFetcher,
  compatKuaishouFetcher,
  compatXiaohongshuFetcher,
  compatCreateBoundDouyinFetcher,
  createAmagiClient,
  douyinFetcher as compatShadowedDouyinFetcher,
  amagiEvents
} from '../../src/exports/compat'
import * as compatNamespace from '../../src/exports/compat'

/** 注入 adapter（不发真实请求），按 body 返回 200 */
const adapterOf = (body: unknown, status = 200): AxiosAdapter => {
  const adapter: AxiosAdapter = async (config) => ({
    data: body,
    status,
    statusText: status === 200 ? 'OK' : 'ERROR',
    headers: {},
    config: config as never
  })
  return adapter
}

const DY_OPTIONS = { aweme_id: '7123456789' }

/** 造一个失败信封（供 toLegacy 纯函数测试） */
const makeFailure = (over: Partial<AmagiError> = {}): AmagiError => ({
  kind: 'rate_limit',
  code: 'RATE_LIMITED',
  message: '请求过快，请稍后再试',
  retryable: true,
  platform: { code: 2202, message: '频率限制' },
  http: { status: 429 },
  ...over
})

const metaOf = () => ({
  requestId: 'req-1',
  clientId: 'cli-1',
  platform: 'douyin' as const,
  endpoint: 'douyin.videoWork',
  attempts: 1,
  durationMs: 12
})

describe('toLegacy（纯转换）', () => {
  it('成功信封：code 200、error 键运行时在（undefined）、无 meta', () => {
    const out = toLegacy({
      success: true,
      message: '获取成功',
      data: { ok: 1 },
      meta: metaOf()
    })
    expect(out).toEqual({
      success: true,
      code: 200,
      message: '获取成功',
      data: { ok: 1 },
      error: undefined
    })
    expect('meta' in out).toBe(false)
  })

  it('失败信封：kind → v6 数字 code，平台码进 error.code', () => {
    const out = toLegacy({
      success: false,
      message: '请求过快，请稍后再试',
      error: makeFailure(),
      meta: metaOf()
    })
    expect(out).toEqual({
      success: false,
      code: 429,
      message: '请求过快，请稍后再试',
      data: undefined,
      error: {
        code: 2202,
        data: null,
        amagiError: {
          errorDescription: '请求过快，请稍后再试',
          requestType: 'videoWork',
          requestUrl: undefined
        },
        amagiMessage: '请求过快，请稍后再试'
      }
    })
  })

  it('失败信封：无 platform 码时退回 amagi code，raw 进 error.data', () => {
    const out = toLegacy({
      success: false,
      message: '被风控',
      error: makeFailure({
        message: '被风控',
        platform: undefined,
        kind: 'risk',
        code: 'RISK_CONTROL',
        retryable: true,
        raw: { html: '<html>' }
      }),
      meta: metaOf()
    })
    expect(out).toEqual({
      success: false,
      code: 403,
      message: '被风控',
      data: undefined,
      error: {
        code: 'RISK_CONTROL',
        data: { html: '<html>' },
        amagiError: { errorDescription: '被风控', requestType: 'videoWork', requestUrl: undefined },
        amagiMessage: '被风控'
      }
    })
  })
})

describe('v6 写法：client 实例', () => {
  it('成功分支读法：r.success → r.code / r.data，无 meta', async () => {
    const client = compatDefault({ request: { adapter: adapterOf({ status_code: 0 }) } } as never)
    const r = await client.douyin.fetcher.fetchVideoWork(DY_OPTIONS)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.code).toBe(200)
      expect(r.data).toEqual({ status_code: 0 })
      expect('meta' in r).toBe(false)
    }
  })

  it('失败分支读法（v6 else）：r.code 数字 + r.error.amagiError.errorDescription', async () => {
    const client = compatDefault({ request: { adapter: adapterOf({ status_code: -5, status_msg: '内容不可见' }) } } as never)
    const r = await client.douyin.fetcher.fetchVideoWork(DY_OPTIONS)
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(typeof r.code).toBe('number')
      expect(r.error.amagiError.errorDescription.length).toBeGreaterThan(0)
      expect(r.error.amagiError.requestType).toBe('videoWork')
      expect(typeof r.error.amagiMessage).toBe('string')
    }
  })

  it('校验失败恢复抛出（v6 try/catch 分支仍可达）', async () => {
    const client = compatDefault({ request: { adapter: adapterOf({ status_code: 0 }) } } as never)
    // 缺必填 aweme_id → v7 是 validation 失败信封；compat 抛 ValidationError
    await expect(client.douyin.fetcher.fetchVideoWork({} as never)).rejects.toBeInstanceOf(ValidationError)
    try {
      await client.douyin.fetcher.fetchVideoWork({} as never)
    } catch (e) {
      const ve = e as ValidationError
      expect(ve.errors.some((er) => er.field === 'aweme_id')).toBe(true)
    }
  })

  it('事件与静态面仍可用（v6 的 client.events.on 读法）', () => {
    const client = compatDefault({} as never)
    expect(client.events).toBe(amagiEvents)
    expect(client.on).toBeTypeOf('function')
    expect(client.once).toBeTypeOf('function')
    expect(client.startServer).toBeTypeOf('function')
  })

  it('四平台模块齐全且 fetcher 都过包装', () => {
    const client = compatDefault({} as never)
    expect(Object.keys(client).sort()).toEqual(['bilibili', 'douyin', 'events', 'kuaishou', 'on', 'once', 'startServer', 'xiaohongshu'])
    for (const name of ['douyin', 'bilibili', 'kuaishou', 'xiaohongshu'] as const) {
      expect(client[name].fetcher).toBeTypeOf('object')
    }
  })
})

describe('v6 写法：静态 fetcher（具名导入也被 compat 遮蔽）', () => {
  it('compat 命名空间的 douyinFetcher 是包装版', async () => {
    const r = await compatShadowedDouyinFetcher.fetchVideoWork(DY_OPTIONS, 'ck=1', {
      adapter: adapterOf({ status_code: 0 })
    } as never)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toEqual({ status_code: 0 })
  })

  it('导出面：四个包装版静态 fetcher 名字存在', () => {
    expect(compatNamespace.douyinFetcher).toBe(compatDouyinFetcher)
    expect(compatNamespace.bilibiliFetcher).toBe(compatBilibiliFetcher)
    expect(compatNamespace.kuaishouFetcher).toBe(compatKuaishouFetcher)
    expect(compatNamespace.xiaohongshuFetcher).toBe(compatXiaohongshuFetcher)
  })
})

describe('v6 写法：bound 工厂', () => {
  it('compat 版 createBoundDouyinFetcher 返回 v6 信封', async () => {
    const bound = compatCreateBoundDouyinFetcher('ck=1', { adapter: adapterOf({ status_code: 0 }) } as never)
    const r = await bound.fetchVideoWork(DY_OPTIONS)
    expect(r.code).toBe(200)
  })
})

describe('createAmagiClient（具名工厂也被遮蔽）', () => {
  it('与默认导出的行为一致', () => {
    const a = createAmagiClient({} as never)
    expect(a.douyin.fetcher).toBeTypeOf('object')
  })
})
