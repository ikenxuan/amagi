import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createRequestModule } from 'amagi/client/request'
import { PLATFORM_RUNTIME } from 'amagi/client/runtime'
import { AmagiHeaders, type RawResponse, type RequestSpec } from 'amagi/contracts/request'
import {
  AC_NONCE_CACHE_MAX_ENTRIES,
  applyDouyinAcNonce,
  rememberDouyinAcNonce,
  resetDouyinAcNonceCache
} from 'amagi/platforms/douyin/anticrawler/acNonce'
import { computeAcSignature } from 'amagi/platforms/douyin/sign/acSignature'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeRequestCtx } from '../../helpers/request-ctx'

/**
 * `__ac_nonce` 的进程内缓存与预置签名（`platforms/douyin/anticrawler/acNonce.ts`）。
 *
 * 两条已实测的前提（2026-10-11，不再复验）：
 *
 * - **`__ac_nonce` 可复用**：签发约 45 秒后仍被接受；服务端自己标 `Max-Age=1800`。
 * - **签名必须按当刻时钟重算**（整秒时间戳进签名），所以值得缓存的只有 nonce 这一个值。
 *
 * 缓存**按调用方 cookie 的身份分键**，不按 UA：不同凭证不共用同一个服务端可见的令牌。
 * 代价是每份凭证各多撞一次挑战，这是用户拍板接受的代价。
 *
 * 真值不进仓库：下面所有 nonce / 设备值都是合成的形状占位。
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

/** 从发出去的 Cookie 头里取一项 */
const cookieValueOf = (spec: RequestSpec, name: string): string | undefined =>
  new AmagiHeaders(spec.headers)
    .get('cookie')
    ?.split('; ')
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)

/** 从一段 cookie 串里取 `__ac_signature`（`__ac_signature=` 是 16 字符） */
const signatureOf = (cookie: string): string | undefined => cookieValueOf({ url: '', method: 'GET', headers: { cookie } }, '__ac_signature')

beforeEach(() => resetDouyinAcNonceCache())
afterEach(() => {
  resetDouyinAcNonceCache()
  vi.useRealTimers()
})

describe('__ac_nonce 缓存：按 cookie 身份分键', () => {
  it('同一身份命中，别的身份不命中', () => {
    rememberDouyinAcNonce('UIFID_TEMP=device-a', 'NONCE_A')
    expect(applyDouyinAcNonce('UIFID_TEMP=device-a', UA)).toContain('__ac_nonce=NONCE_A')
    // 另一份凭证拿不到：不让不同凭证共用同一个服务端可见的令牌
    expect(applyDouyinAcNonce('UIFID_TEMP=device-b', UA)).toBeUndefined()
  })

  it('同一身份下无关字段变化不击穿缓存（键不是整串 cookie）', () => {
    rememberDouyinAcNonce('UIFID_TEMP=device-a; foo=1', 'NONCE_A')
    expect(applyDouyinAcNonce('UIFID_TEMP=device-a; bar=2; baz=3', UA)).toContain('__ac_nonce=NONCE_A')
  })

  it('账号会话优先于设备标识：同一 ttwid 上换账号就是换身份', () => {
    rememberDouyinAcNonce('sessionid=account-a; ttwid=device', 'NONCE_A')
    expect(applyDouyinAcNonce('sessionid=account-a; ttwid=device; foo=1', UA)).toContain('__ac_nonce=NONCE_A')
    expect(applyDouyinAcNonce('sessionid=account-b; ttwid=device', UA)).toBeUndefined()
  })

  it('预置的签名按当刻时钟重算，且与 solver 用的是同一份算法与 href', () => {
    const nonce = '0123456789abcdef01234'
    rememberDouyinAcNonce('UIFID_TEMP=device-a', nonce)
    const before = Date.now()
    const applied = applyDouyinAcNonce('UIFID_TEMP=device-a', UA)
    const after = Date.now()
    expect(applied).toBeTypeOf('string')
    expect([computeAcSignature(nonce, UA, before), computeAcSignature(nonce, UA, after)]).toContain(signatureOf(applied!))
  })

  it('没有 UA 就不预置：签名摘 UA，拿不出与请求自洽的那一份', () => {
    rememberDouyinAcNonce('UIFID_TEMP=device-a', 'NONCE_A')
    expect(applyDouyinAcNonce('UIFID_TEMP=device-a', undefined)).toBeUndefined()
    expect(applyDouyinAcNonce('UIFID_TEMP=device-a', '')).toBeUndefined()
  })

  it('预置是「调用方自己的 cookie 叠加 nonce 段」，原 cookie 一条不丢', () => {
    rememberDouyinAcNonce('UIFID_TEMP=device-a', 'NONCE_A')
    const applied = applyDouyinAcNonce('UIFID_TEMP=device-a; foo=1', UA)!
    expect(applied).toContain('UIFID_TEMP=device-a')
    expect(applied).toContain('foo=1')
    // 同名后写覆盖：不出现两份
    expect(applied.match(/__ac_nonce=/g)).toHaveLength(1)
  })

  it('只补缺失的名字：调用方自己带了完整一对就原样返回', () => {
    rememberDouyinAcNonce('UIFID_TEMP=device-a', 'NONCE_A')
    const own = '__ac_nonce=own-nonce; __ac_signature=own-signature; UIFID_TEMP=device-a'
    expect(applyDouyinAcNonce(own, UA)).toBe(own)
  })

  it('半对（有 nonce 没签名）会被补成完整的一对', () => {
    rememberDouyinAcNonce('UIFID_TEMP=device-a', 'NONCE_A')
    const half = applyDouyinAcNonce('__ac_nonce=own-nonce; UIFID_TEMP=device-a', UA)!
    expect(half).toContain('__ac_nonce=NONCE_A')
    expect(half).toContain('__ac_signature=')
    expect(half.match(/__ac_nonce=/g)).toHaveLength(1)
  })

  it('过了过期时间就不再用（复用上界实测 45 秒）', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-11T00:00:00Z'))
    rememberDouyinAcNonce('UIFID_TEMP=device-a', 'NONCE_A')
    vi.setSystemTime(new Date('2026-10-11T00:00:44Z'))
    expect(applyDouyinAcNonce('UIFID_TEMP=device-a', UA)).toContain('__ac_nonce=NONCE_A')
    vi.setSystemTime(new Date('2026-10-11T00:00:46Z'))
    expect(applyDouyinAcNonce('UIFID_TEMP=device-a', UA)).toBeUndefined()
  })

  it('超过上限淘汰最早的一条（参考 mint.ts 的 CACHE_MAX_ENTRIES）', () => {
    for (let i = 0; i <= AC_NONCE_CACHE_MAX_ENTRIES; i++) rememberDouyinAcNonce(`UIFID_TEMP=device-${i}`, `NONCE_${i}`)
    expect(applyDouyinAcNonce('UIFID_TEMP=device-0', UA)).toBeUndefined()
    expect(applyDouyinAcNonce(`UIFID_TEMP=device-${AC_NONCE_CACHE_MAX_ENTRIES}`, UA)).toContain(
      `__ac_nonce=NONCE_${AC_NONCE_CACHE_MAX_ENTRIES}`
    )
  })

  it('reset 之后不再命中（测试与换凭证场景用）', () => {
    rememberDouyinAcNonce('UIFID_TEMP=device-a', 'NONCE_A')
    resetDouyinAcNonceCache()
    expect(applyDouyinAcNonce('UIFID_TEMP=device-a', UA)).toBeUndefined()
  })
})

/**
 * 裸打页面这条路的整链：真 `PLATFORM_RUNTIME` 的 `solveChallenge` 与 `ensureCookie`
 * 都装上，只把网络那一跳换成假出口。
 *
 * 假出口的判据就是服务端认不认 pair：带了 `__ac_signature` 就当挑战已过（回真页），
 * 否则下发挑战页 + 一个**新的** `__ac_nonce`。这正是预置签名要换来的那一发。
 */
const PAGE_URL = 'https://www.douyin.com/'
const VMP = readFileSync(fileURLToPath(new URL('../../fixtures/douyin/challenge-page.html', import.meta.url)), 'utf8')
/** 过完挑战的真页替身：无任何挑战锚点 */
const REAL_PAGE = `<!doctype html><html><body>${'x'.repeat(2048)}</body></html>`

const makeServer = () => {
  const issued: string[] = []
  let counter = 0
  const respond = (spec: RequestSpec): RawResponse => {
    const cookie = new AmagiHeaders(spec.headers).get('cookie') ?? ''
    if (cookie.includes('__ac_signature=')) {
      return { status: 200, statusText: 'OK', headers: new AmagiHeaders(), body: REAL_PAGE, durationMs: 1, url: spec.url }
    }
    const nonce = `0000000000000000000${++counter}`.slice(-20)
    issued.push(nonce)
    return {
      status: 200,
      statusText: 'OK',
      headers: new AmagiHeaders({ 'set-cookie': `__ac_nonce=${nonce}; Path=/; Max-Age=1800; Secure; SameSite=None` }),
      body: VMP,
      durationMs: 1,
      url: spec.url
    }
  }
  return { respond, issued }
}

/** cookie 自带访客 id，于是 `PLATFORM_RUNTIME` 上那段访客审计当场返回、不出网 */
const pageCtx = (cookie: string, respond: (spec: RequestSpec) => RawResponse) => {
  const made = makeRequestCtx('douyin', cookie, respond)
  made.ctx.ensureCookie = PLATFORM_RUNTIME.douyin.ensureCookie
  return made
}

describe('裸打页面：解出的 __ac_nonce 跨调用复用', () => {
  it('同一 ctx 身份连续两次打页面，第二次 1 发就成功', async () => {
    const { respond, issued } = makeServer()
    const { ctx, sent } = pageCtx('UIFID_TEMP=device-a', respond)
    const request = createRequestModule('douyin', ctx)

    const first = await request.get(PAGE_URL, { responseType: 'text' })
    expect(first.success).toBe(true)
    expect(sent).toHaveLength(2) // 挑战 + 解算重放

    const second = await request.get(PAGE_URL, { responseType: 'text' })
    expect(second.success).toBe(true)
    // 第二次带的是缓存的 nonce + 现算的签名，服务端直接放行 —— 不再撞一次挑战
    expect(sent.length - 2).toBe(1)
    // 服务端总共只下发过一个 nonce
    expect(issued).toHaveLength(1)
  })

  it('不同 cookie 身份各自撞一次挑战，不共用 nonce', async () => {
    const { respond, issued } = makeServer()
    const a = pageCtx('UIFID_TEMP=device-a', respond)
    const b = pageCtx('UIFID_TEMP=device-b', respond)

    await createRequestModule('douyin', a.ctx).get(PAGE_URL, { responseType: 'text' })
    expect(a.sent).toHaveLength(2)

    await createRequestModule('douyin', b.ctx).get(PAGE_URL, { responseType: 'text' })
    expect(b.sent).toHaveLength(2)
    // B 的第一发不能带 A 那个 nonce 的签名
    expect(new AmagiHeaders(b.sent[0].headers).get('cookie')).not.toContain('__ac_signature')
    expect(issued).toHaveLength(2)
    // 各自的重放用的是自己那一个 nonce
    expect(cookieValueOf(a.sent[1], '__ac_nonce')).toBe(issued[0])
    expect(cookieValueOf(b.sent[1], '__ac_nonce')).toBe(issued[1])
  })
})
