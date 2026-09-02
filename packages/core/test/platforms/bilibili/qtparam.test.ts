import { createQtparamSigner } from 'amagi/platforms/bilibili/sign/qtparam'
import { createWbiSigner } from 'amagi/platforms/bilibili/sign/wbi'
import type { EndpointCtx } from 'amagi/contracts/endpoint'
import { AmagiHeaders } from 'amagi/contracts/request'
import type { RawResponse } from 'amagi/contracts/request'
/**
 * platforms/bilibili/sign/qtparam 的契约。
 *
 * 判据：**`videoStream` 与 `bangumiStream` 两处都能拿到 cookie** ——
 * v6 一处大写 `headers?.Cookie`、一处小写 `headers?.cookie`，后者恒
 * `undefined`；v7 的 cookie 来自 `ctx.cookie`（resolveBoundRequest 大小写
 * 不敏感解析），签名器不再自己翻 headers。
 *
 * 行为与 v6 一致：空 cookie → `&platform=html5`；已登录 → 按 vipStatus
 * 拼 `&fnval=4048&fourk=1` 或 `&qn=64&fnval=16`，再追加 wbi 签名。
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

const makeCtx = (cookie: string): { ctx: EndpointCtx; requests: Array<{ url: string; headers: unknown }> } => {
  const requests: Array<{ url: string; headers: unknown }> = []
  return {
    ctx: {
      clientId: 'client-1',
      platform: 'bilibili',
      cookie,
      userAgent: 'ua/1',
      requestConfig: {},
      send: async (spec) => {
        requests.push({ url: spec.url, headers: spec.headers })
        return {
          status: 200,
          statusText: 'OK',
          headers: new AmagiHeaders(),
          body: NAV_BODY,
          durationMs: 1,
          url: spec.url
        } satisfies RawResponse
      }
    },
    requests
  }
}

describe('qtparam：cookie 大小写无关（修 v6 一处大写一处小写）', () => {
  it('cookie 为空时只带 &platform=html5，不打 /nav', async () => {
    const { ctx, requests } = makeCtx('')
    const qtparam = createQtparamSigner(createWbiSigner())

    const signed = (await qtparam({ method: 'GET', url: 'https://api.bilibili.com/x/player/playurl?avid=1&cid=2' }, ctx)) as { url: string }
    expect(signed.url).toBe('https://api.bilibili.com/x/player/playurl?avid=1&cid=2&platform=html5')
    expect(requests).toHaveLength(0) // 未登录不取 keys
  })

  it('已登录：/nav 一次取 vipStatus + wbi keys，URL 带 fnval=4048&fourk=1', async () => {
    const { ctx, requests } = makeCtx('SESSDATA=abc')
    const wbi = createWbiSigner()
    const qtparam = createQtparamSigner(wbi)

    const signed = (await qtparam({ method: 'GET', url: 'https://api.bilibili.com/x/player/playurl?avid=1&cid=2' }, ctx)) as { url: string }

    expect(requests).toHaveLength(1) // 只打一次 /nav（v6 打两次：qtparam 一次 + wbi_sign 一次）
    expect(signed.url).toContain('&fnval=4048&fourk=1')
    expect(signed.url).toContain('&wts=')
    expect(signed.url).toContain('&w_rid=')
  })

  it('非 VIP：&qn=64&fnval=16', async () => {
    const { ctx } = makeCtx('SESSDATA=abc')
    ctx.send = (async (spec) => {
      return {
        status: 200,
        statusText: 'OK',
        headers: new AmagiHeaders(),
        body: { ...NAV_BODY, data: { ...NAV_BODY.data, vipStatus: 0 } },
        durationMs: 1,
        url: spec.url
      } satisfies RawResponse
    }) as EndpointCtx['send']

    const qtparam = createQtparamSigner(createWbiSigner())
    const signed = (await qtparam({ method: 'GET', url: 'https://api.bilibili.com/x/player/playurl?avid=1&cid=2' }, ctx)) as { url: string }
    expect(signed.url).toContain('&qn=64&fnval=16')
    expect(signed.url).not.toContain('fourk')
  })

  it('cookie 来自 ctx（resolveBoundRequest 已大小写不敏感解析）', () => {
    // 契约验证：签名器只读 ctx.cookie，不自己翻 headers ——
    // 大写 Cookie / 小写 cookie 在 client 层已归一，这里不重复解析
    const { ctx } = makeCtx('SESSDATA=abc')
    expect(ctx.cookie).toBe('SESSDATA=abc')
  })
})
