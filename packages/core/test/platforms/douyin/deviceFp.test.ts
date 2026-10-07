import { createFetcherFromRegistry } from 'amagi/client/fetcher'
import type { ClientCtx } from 'amagi/client/fetcher'
import { withDouyinDeviceFp } from 'amagi/platforms/douyin/deviceFp'
import { douyinRegistry } from 'amagi/platforms/douyin/endpoints'
import { douyinJudge } from 'amagi/platforms/douyin/judge'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
import type { AxiosAdapter } from 'axios'
/**
 * platforms/douyin/deviceFp 的契约。
 *
 * `verifyFp` / `fp` 与 cookie 的 `s_v_web_id` 在浏览器里恒为同一个值（2026-09-30
 * 登录态实测），cookie 里没有时发 `deviceFp.ts` 的进程级兜底值 `DOUYIN_PROCESS_FP`。
 * 这是与 {@link withDouyinWebid} 同一类的「设备参数 × cookie 会话」交叉校验，对不上时
 * 抖音回 HTTP 200 + 0 字节。判据围绕：① cookie 没有就别动；② 有就照抄；
 * ③ 形状不对不收；④ 换 cookie 跟着换。
 *
 * 注意两条路：`/aweme/v1/web/*` 的四段式版式由 `sign/steps.ts` 的主签名那一步整段写
 * tail（`verifyFp` / `fp` 在 `a_bogus` 之后），版式之外的三条才走这里测的
 * {@link withDouyinDeviceFp} 原位覆盖。
 */
import { describe, expect, it } from 'vitest'

/** 一个合形状的 `s_v_web_id`（与 `genVerifyFp` 同构，值本身是编的） */
const SV = 'verify_mfz9k2q1_7Ab3Cd4E_9f01_4a2b_8c3d_5e6f7a8b9c0d'
const SV2 = 'verify_mg0p8t5w_1Zy2Xw3V_4u56_4t7s_8r9q_0p1o2n3m4l5k'

const urlWith = (params: Record<string, string>): string =>
  `https://www.douyin.com/aweme/v1/web/aweme/detail/?${new URLSearchParams(params).toString()}`

const BOTH = urlWith({ aweme_id: '1', verifyFp: 'verify_local_random', fp: 'verify_local_random' })

describe('① cookie 里取不到 s_v_web_id 时是无操作', () => {
  it.each([[undefined], [null], [''], ['sessionid=x; ttwid=abc']])('cookie=%j 原样返回同一个字符串', (cookie) => {
    expect(withDouyinDeviceFp(BOTH, cookie)).toBe(BOTH)
  })

  it('cookie 名精确匹配，不会被 x_s_v_web_id 之类骗到', () => {
    expect(withDouyinDeviceFp(BOTH, `x_s_v_web_id=${SV}`)).toBe(BOTH)
  })
})

describe('② cookie 里有就照抄到 verifyFp 与 fp', () => {
  it('两个参数都被覆盖成 s_v_web_id', () => {
    const out = new URL(withDouyinDeviceFp(BOTH, `ttwid=abc; s_v_web_id=${SV}; sessionid=x`))
    expect(out.searchParams.get('verifyFp')).toBe(SV)
    expect(out.searchParams.get('fp')).toBe(SV)
  })

  it('其余 query 一个不动，键的顺序也不变', () => {
    const src = urlWith({ device_platform: 'webapp', verifyFp: 'verify_local_random', fp: 'verify_local_random', aweme_id: '7' })
    const out = new URL(withDouyinDeviceFp(src, `s_v_web_id=${SV}`))
    expect([...out.searchParams.keys()]).toEqual(['device_platform', 'verifyFp', 'fp', 'aweme_id'])
    expect(out.searchParams.get('aweme_id')).toBe('7')
    expect(out.searchParams.get('device_platform')).toBe('webapp')
  })

  it('值已经对上了就原样返回，不重建 URL', () => {
    const already = urlWith({ aweme_id: '1', verifyFp: SV, fp: SV })
    expect(withDouyinDeviceFp(already, `s_v_web_id=${SV}`)).toBe(already)
  })

  it('URL 上只有其中一个时只改那一个', () => {
    const onlyFp = urlWith({ aweme_id: '1', fp: 'verify_local_random' })
    const out = new URL(withDouyinDeviceFp(onlyFp, `s_v_web_id=${SV}`))
    expect(out.searchParams.get('fp')).toBe(SV)
    expect(out.searchParams.has('verifyFp')).toBe(false)
  })
})

describe('③ 形状不对的值一律不用 —— 传错比不传更糟', () => {
  it.each([['abc'], ['verify_'], ['verify_ABC_xxx'], ['VERIFY_abc_xxx'], ['_verify_abc_xxx']])('拒收 %j', (value) => {
    expect(withDouyinDeviceFp(BOTH, `s_v_web_id=${value}`)).toBe(BOTH)
  })
})

describe('④ URL 上没有这两个参数时是无操作', () => {
  it('免鉴权端点那种 query 原样返回', () => {
    const guest = 'https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=1'
    expect(withDouyinDeviceFp(guest, `s_v_web_id=${SV}`)).toBe(guest)
  })

  it('不是绝对 URL 时原样返回、不抛 —— 报错留给签名器的前置校验', () => {
    expect(withDouyinDeviceFp('/relative?verifyFp=x', `s_v_web_id=${SV}`)).toBe('/relative?verifyFp=x')
  })
})

describe('端到端：真签名器下发出去的 verifyFp / fp 等于 cookie 的 s_v_web_id', () => {
  const recordingAdapter = (): { adapter: AxiosAdapter; urls: string[] } => {
    const urls: string[] = []
    return {
      adapter: async (config) => {
        urls.push(config.url ?? '')
        return {
          data: { status_code: 0, aweme_detail: { aweme_id: '1' } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config as never
        }
      },
      urls
    }
  }

  const makeCtx = (adapter: AxiosAdapter, cookie: string): ClientCtx => {
    const trace = new TraceCollector()
    const http = new HttpClient({ trace, requestConfig: { adapter } })
    return {
      clientId: 'client-1',
      platform: 'douyin',
      cookie,
      userAgent: 'ua/1',
      requestConfig: {},
      trace,
      judge: douyinJudge,
      send: (spec, reason) => http.send(spec, reason)
    }
  }

  it('换 cookie 就跟着换，两次发出去的值互不串用', async () => {
    const { createDouyinSigners } = await import('amagi/platforms/douyin/sign/signers')
    const h = recordingAdapter()

    const first = createFetcherFromRegistry('douyin', douyinRegistry, {
      ...makeCtx(h.adapter, `ttwid=abc; s_v_web_id=${SV}`),
      signers: createDouyinSigners()
    })
    await first.parseWork({ aweme_id: '1' })

    const second = createFetcherFromRegistry('douyin', douyinRegistry, {
      ...makeCtx(h.adapter, `ttwid=zzz; s_v_web_id=${SV2}`),
      signers: createDouyinSigners()
    })
    await second.parseWork({ aweme_id: '1' })

    const q0 = new URL(h.urls[0]).searchParams
    const q1 = new URL(h.urls[1]).searchParams
    expect(q0.get('verifyFp')).toBe(SV)
    expect(q0.get('fp')).toBe(SV)
    expect(q1.get('verifyFp')).toBe(SV2)
    expect(q1.get('fp')).toBe(SV2)
  })

  it('cookie 里没有 s_v_web_id 时仍发进程级兜底值 —— 不注入、也不删', async () => {
    const { createDouyinSigners } = await import('amagi/platforms/douyin/sign/signers')
    const h = recordingAdapter()
    const fetcher = createFetcherFromRegistry('douyin', douyinRegistry, {
      ...makeCtx(h.adapter, 'ttwid=abc'),
      signers: createDouyinSigners()
    })

    await fetcher.parseWork({ aweme_id: '1' })

    const q = new URL(h.urls[0]).searchParams
    expect(q.get('verifyFp')).toMatch(/^verify_/)
    expect(q.get('verifyFp')).toBe(q.get('fp'))
    expect(q.get('verifyFp')).not.toBe(SV)
  })
})
