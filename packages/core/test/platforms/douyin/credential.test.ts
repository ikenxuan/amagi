import { getCookieValue } from 'amagi/contracts/cookie'
import type { EndpointCtx } from 'amagi/contracts/endpoint'
import { AmagiHeaders, type RawResponse } from 'amagi/contracts/request'
import { resolveDouyinCredential } from 'amagi/platforms/douyin/credential'
import { configureDouyinGuestCache } from 'amagi/platforms/douyin/guestCredential'
import { clearDouyinLoginStateCache } from 'amagi/platforms/douyin/loginState'
import { beforeEach, describe, expect, it } from 'vitest'

const reply = (body: unknown, setCookie?: string[]): RawResponse => ({
  body,
  setCookie,
  status: 200,
  durationMs: 0,
  headers: new AmagiHeaders(),
  url: 'https://www.douyin.com/'
})
beforeEach(() => {
  clearDouyinLoginStateCache()
  configureDouyinGuestCache(null)
})

describe('douyin credential resolution', () => {
  it('keeps a login session when device identity is missing instead of swapping in a guest', async () => {
    let calls = 0
    const send: EndpointCtx['send'] = async () => {
      calls++
      return reply('', ['UIFID_TEMP=guest-device; Path=/'])
    }
    const result = await resolveDouyinCredential('sessionid=account; ttwid=account-device', { send })
    expect(getCookieValue(result.cookie, 'sessionid')).toBe('account')
    expect(getCookieValue(result.cookie, 'ttwid')).toBe('account-device')
    expect(result.origin).not.toBe('guest-minted')
    expect(calls).toBe(0)
  })

  it('never substitutes a guest for endpoints requiring login', async () => {
    const requests: string[] = []
    const send: EndpointCtx['send'] = async (spec) => {
      requests.push(spec.url)
      return reply({ message: 'error', data: { error_code: 13 } })
    }
    const raw = 'UIFID=device; sessionid=expired'
    const result = await resolveDouyinCredential(raw, { send, needLogin: true })
    expect(result.cookie).toBe(raw)
    expect(result.loginState).toBe('expired')
    expect(requests).toHaveLength(1)
    expect(requests[0]).toContain('/passport/account/info/v2/')
  })

  it('preserves the original normalized credential on guest handshake failure', async () => {
    const send: EndpointCtx['send'] = async () => {
      throw new Error('offline')
    }
    expect((await resolveDouyinCredential('ttwid=original', { send })).cookie).toBe('ttwid=original')
  })

  it('resolves an anonymous request into a real server-issued device identity', async () => {
    const send: EndpointCtx['send'] = async () => reply('', ['UIFID_TEMP=device; Path=/'])
    const result = await resolveDouyinCredential('', { send })
    expect(result.origin).toBe('guest-minted')
    expect(result.loginState).toBe('guest')
    expect(getCookieValue(result.cookie, 'UIFID')).toBe('device')
  })

  /**
   * 服务端**扣发访客 id**、只给了 `ttwid` 时，`origin` 要如实说话。
   *
   * 「挑战过没过」与「发不发访客 id」是服务端两个独立决定（2026-10-11 实测到「真页 +
   * ttwid + enter_pc_once + web_sign_token、独独没有 UIFID_TEMP」的那一发）。旧代码把
   * 后者缺失算进「签名被拒」，整串丢弃；改结构化返回之后，到手的 `ttwid` 留着，但
   * `origin` **不能**叫 `guest-minted` —— 那一支的语义是「拿到了游客凭据」，而这里只有
   * 设备标识、没有访客 id（`uifidSource` 同时如实回 `missing`）。
   *
   * 另有一条硬约束：`credential.ts` 把非 null 当作「拿到了游客凭据」并整串替换调用方
   * cookie，所以判据必须是结构化结果里的 `visitorId` 有无，不能是「返回串非空」。
   */
  it('服务端只给 ttwid 不给访客 id 时，origin 如实反映这一结局', async () => {
    const send: EndpointCtx['send'] = async (spec) =>
      new AmagiHeaders(spec.headers).get('cookie')
        ? reply('<html>_ROUTER_DATA</html>', ['ttwid=device; Path=/', 'enter_pc_once=1; Path=/', 'web_sign_token=token; Path=/'])
        : reply('', ['__ac_nonce=nonce; Path=/'])
    const result = await resolveDouyinCredential('', { send })
    expect(result.origin).toBe('guest-device')
    expect(result.uifidSource).toBe('missing')
    expect(getCookieValue(result.cookie, 'ttwid')).toBe('device')
    expect(result.loginState).toBeUndefined()
  })

  it('does no networking when guest fallback is disabled', async () => {
    const send: EndpointCtx['send'] = async () => {
      throw new Error('should not send')
    }
    expect(await resolveDouyinCredential('', { send, noGuestFallback: true })).toMatchObject({ cookie: '', origin: 'unresolved' })
  })
})
