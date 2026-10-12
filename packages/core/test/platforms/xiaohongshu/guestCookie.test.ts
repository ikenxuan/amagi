import { createFetcherFromRegistry, type ClientCtx } from 'amagi/client/fetcher'
import type { EndpointCtx } from 'amagi/contracts/endpoint'
import { xiaohongshuRegistry } from 'amagi/platforms/xiaohongshu/endpoints'
import { prepareXiaohongshuGuestCookie, resetXiaohongshuGuestCookieCache } from 'amagi/platforms/xiaohongshu/sign/guestCookie'
import { createXiaohongshuSigners } from 'amagi/platforms/xiaohongshu/sign/signers'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
import type { AxiosAdapter } from 'axios'
import { beforeEach, describe, expect, it } from 'vitest'
/**
 * 「下游不传有效用户 CK 时用游客 CK 解析接口」的降级契约。
 *
 * - `prepareXiaohongshuGuestCookie`：无 a1 才铸造、按 UA 进程缓存、并发去重、可 reset。
 * - `defineXiaohongshuEndpoint`：把该降级作为平台级 `prepare` 注入**全体**端点。
 * - 端到端：无 a1 的调用确实经管线 `ctx.send` 打出游客初始化请求（scripting）。
 *
 * 铸造函数经参数注入假实现，无需合成真实 scripting VMP 响应。
 */

/** 注入 mint 时真实 send 不该被触达 */
const neverSend: EndpointCtx['send'] = async () => {
  throw new Error('mint 注入时不应触达真实 send')
}

/** 构造降级钩子所需的最小上下文 */
const ctxOf = (cookie: string, userAgent = 'ua/guest'): Pick<EndpointCtx, 'cookie' | 'userAgent' | 'requestConfig' | 'send'> => ({
  cookie,
  userAgent,
  requestConfig: {},
  send: neverSend
})

beforeEach(() => resetXiaohongshuGuestCookieCache())

describe('prepareXiaohongshuGuestCookie（无有效用户 CK → 游客 CK 降级）', () => {
  it('cookie 带 a1：视作有效用户 CK，不铸造、保持原 cookie', async () => {
    let calls = 0
    const mint = async () => {
      calls++
      return 'a1=GUEST; web_session=g'
    }
    const out = await prepareXiaohongshuGuestCookie(ctxOf('a1=real0123; web_session=u'), mint)
    expect(out).toEqual({})
    expect(calls).toBe(0)
  })

  it('cookie 无 a1：铸造游客 cookie 作为升级凭证返回', async () => {
    let calls = 0
    const mint = async () => {
      calls++
      return 'a1=GUEST; web_session=g'
    }
    const out = await prepareXiaohongshuGuestCookie(ctxOf('web_session=only; webId=x'), mint)
    expect(out).toEqual({ cookie: 'a1=GUEST; web_session=g' })
    expect(calls).toBe(1)
  })

  it('同 UA 重复调用命中进程缓存：只铸一次', async () => {
    let calls = 0
    const mint = async () => {
      calls++
      return `a1=GUEST${calls}; web_session=g`
    }
    const first = await prepareXiaohongshuGuestCookie(ctxOf('', 'ua/same'), mint)
    const second = await prepareXiaohongshuGuestCookie(ctxOf('', 'ua/same'), mint)
    expect(calls).toBe(1)
    expect(second).toEqual(first)
  })

  it('并发首调去重：共享同一次在途铸造', async () => {
    let calls = 0
    const mint = async () => {
      calls++
      await new Promise((resolve) => setTimeout(resolve, 5))
      return 'a1=GUEST; web_session=g'
    }
    const [a, b] = await Promise.all([
      prepareXiaohongshuGuestCookie(ctxOf('', 'ua/race'), mint),
      prepareXiaohongshuGuestCookie(ctxOf('', 'ua/race'), mint)
    ])
    expect(calls).toBe(1)
    expect(a).toEqual(b)
  })

  it('reset 后重新铸造', async () => {
    let calls = 0
    const mint = async () => {
      calls++
      return 'a1=GUEST; web_session=g'
    }
    await prepareXiaohongshuGuestCookie(ctxOf('', 'ua/reset'), mint)
    resetXiaohongshuGuestCookieCache()
    await prepareXiaohongshuGuestCookie(ctxOf('', 'ua/reset'), mint)
    expect(calls).toBe(2)
  })

  it('铸造抛错不污染在途槽位：下次调用可重试', async () => {
    let calls = 0
    const mint = async () => {
      calls++
      if (calls === 1) throw new Error('boom')
      return 'a1=GUEST; web_session=g'
    }
    await expect(prepareXiaohongshuGuestCookie(ctxOf('', 'ua/err'), mint)).rejects.toThrow('boom')
    const out = await prepareXiaohongshuGuestCookie(ctxOf('', 'ua/err'), mint)
    expect(out).toEqual({ cookie: 'a1=GUEST; web_session=g' })
    expect(calls).toBe(2)
  })
})

describe('defineXiaohongshuEndpoint 平台级注入', () => {
  it('全体端点都带 prepare（游客降级横切覆盖，含将来新增的端点）', () => {
    const names = Object.keys(xiaohongshuRegistry)
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) {
      expect(typeof xiaohongshuRegistry[name as keyof typeof xiaohongshuRegistry].prepare, name).toBe('function')
    }
  })
})

describe('端到端：无 a1 的下游调用经 prepare 走游客初始化', () => {
  it('noteDetail 无 a1：scripting 请求经 ctx.send 打出；主请求在初始化失败前不发', async () => {
    const requests: string[] = []
    const adapter: AxiosAdapter = async (config) => {
      requests.push(config.url ?? '')
      // scripting 返回缺字段 → 游客初始化在 scripting 阶段失败（无需合成真实 VMP）
      return { data: { data: {} }, status: 200, statusText: 'OK', headers: {}, config: config as never }
    }
    const trace = new TraceCollector()
    const http = new HttpClient({ trace, requestConfig: { adapter } })
    const ctx: ClientCtx = {
      clientId: 'c',
      platform: 'xiaohongshu',
      cookie: '',
      userAgent: 'ua/noa1',
      requestConfig: {},
      trace,
      signers: createXiaohongshuSigners(),
      send: (spec, reason) => http.send(spec, reason)
    }
    const fetcher = createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, ctx)

    const result = await fetcher.fetchNoteDetail({ note_id: 'n1', xsec_token: 'tk' })

    expect(result.success).toBe(false)
    expect(requests.some((u) => u.includes('/api/sec/v1/scripting'))).toBe(true)
    expect(requests.some((u) => u.includes('/api/sns/web/v1/feed'))).toBe(false)
  })
})
