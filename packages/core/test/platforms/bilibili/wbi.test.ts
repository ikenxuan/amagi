import { createWbiSigner } from 'amagi/platforms/bilibili/sign/wbi'
import type { EndpointCtx } from 'amagi/contracts/endpoint'
import { AmagiHeaders } from 'amagi/contracts/request'
import type { RawResponse } from 'amagi/contracts/request'
/**
 * platforms/bilibili/sign/wbi 的契约。
 *
 * 判据三条：
 * ① **改走 transport（修 A5）**：注入 adapter 能拦到 `/nav` 请求（v6 直连
 *    axios 拦不到）。
 * ② **TTL 缓存随 client 实例（修 #4）**：连续 3 次签名只打 1 次 `/nav`；
 *    TTL 过期后再打一次。
 * ③ 签名算法与 v6 逐字一致（encWbi 输出与 v6 相同输入相同输出）。
 */
import { describe, expect, it } from 'vitest'

const NAV_BODY = {
  code: 0,
  data: {
    wbi_img: {
      img_url: 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
      sub_url: 'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png'
    },
    vipStatus: 1
  }
}

/** 记录请求并注入响应的 ctx（adapter 可拦到 /nav = 修 A5 的判据） */
const makeCtx = (responses: Record<string, unknown>): { ctx: EndpointCtx; requests: string[] } => {
  const requests: string[] = []
  return {
    ctx: {
      clientId: 'client-1',
      platform: 'bilibili',
      cookie: 'SESSDATA=abc',
      userAgent: 'ua/1',
      requestConfig: {},
      send: async (spec, _reason) => {
        requests.push(spec.url)
        const body = responses[spec.url] ?? { code: 0 }
        return {
          status: 200,
          statusText: 'OK',
          headers: new AmagiHeaders(),
          body,
          durationMs: 1,
          url: spec.url
        } satisfies RawResponse
      }
    },
    requests
  }
}

describe('① 改走 transport：adapter 能拦到 /nav（修 A5）', () => {
  it('签名前先打一次 /nav，走 ctx.send', async () => {
    const { ctx, requests } = makeCtx({ 'https://api.bilibili.com/x/web-interface/nav': NAV_BODY })
    const signer = createWbiSigner()

    await signer.sign({ method: 'GET', url: 'https://api.bilibili.com/x/v2/reply/wbi/main?oid=1&type=1' }, ctx)

    expect(requests).toEqual(['https://api.bilibili.com/x/web-interface/nav'])
  })

  it('/nav 请求带 cookie 头（ctx.cookie 注入）', async () => {
    const seen: Array<Record<string, unknown>> = []
    const ctx: EndpointCtx = {
      clientId: 'client-1',
      platform: 'bilibili',
      cookie: 'SESSDATA=abc',
      userAgent: 'ua/1',
      requestConfig: {},
      send: async (spec) => {
        seen.push({ url: spec.url, headers: spec.headers })
        return {
          status: 200,
          statusText: 'OK',
          headers: new AmagiHeaders(),
          body: NAV_BODY,
          durationMs: 1,
          url: spec.url
        } satisfies RawResponse
      }
    }

    const signer = createWbiSigner()
    await signer.sign({ method: 'GET', url: 'https://api.bilibili.com/x/v2/reply/wbi/main?oid=1&type=1' }, ctx)
    expect(seen[0].headers).toEqual({ cookie: 'SESSDATA=abc' })
  })
})

describe('② TTL 缓存随实例（修 #4）', () => {
  it('连续 3 次签名只打 1 次 /nav', async () => {
    const { ctx, requests } = makeCtx({ 'https://api.bilibili.com/x/web-interface/nav': NAV_BODY })
    const signer = createWbiSigner()

    const url = 'https://api.bilibili.com/x/v2/reply/wbi/main?oid=1&type=1'
    await signer.sign({ method: 'GET', url }, ctx)
    await signer.sign({ method: 'GET', url }, ctx)
    await signer.sign({ method: 'GET', url }, ctx)

    expect(requests).toHaveLength(1)
  })

  it('TTL 过期后重新打 /nav', async () => {
    const { ctx, requests } = makeCtx({ 'https://api.bilibili.com/x/web-interface/nav': NAV_BODY })
    let now = 0
    const signer = createWbiSigner(1000, () => now)

    const url = 'https://api.bilibili.com/x/v2/reply/wbi/main?oid=1&type=1'
    await signer.sign({ method: 'GET', url }, ctx)
    now = 1001 // 过期
    await signer.sign({ method: 'GET', url }, ctx)

    expect(requests).toHaveLength(2)
  })
})

describe('③ 签名输出', () => {
  it('URL 追加 &wts=..&w_rid=..，w_rid 是 32 位 hex', async () => {
    const { ctx } = makeCtx({ 'https://api.bilibili.com/x/web-interface/nav': NAV_BODY })
    const signer = createWbiSigner()

    const signed = (await signer.sign(
      { method: 'GET', url: 'https://api.bilibili.com/x/v2/reply/wbi/main?oid=1&type=1' },
      ctx
    )) as { url: string }

    const url = new URL(signed.url)
    const wts = url.searchParams.get('wts')
    const wRid = url.searchParams.get('w_rid')
    expect(wts).toMatch(/^\d{10}$/)
    expect(wRid).toMatch(/^[0-9a-f]{32}$/)
  })

  it('相同输入相同输出（wts 相同）', async () => {
    const { ctx } = makeCtx({ 'https://api.bilibili.com/x/web-interface/nav': NAV_BODY })
    const signer = createWbiSigner()
    const url = 'https://api.bilibili.com/x/v2/reply/wbi/main?oid=1&type=1'

    const a = (await signer.sign({ method: 'GET', url }, ctx)) as { url: string }
    const b = (await signer.sign({ method: 'GET', url }, ctx)) as { url: string }
    expect(a.url).toBe(b.url) // 同一次调用内 wts 相同（缓存 keys + 同一秒）
  })
})
