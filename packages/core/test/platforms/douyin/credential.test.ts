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

  it('does no networking when guest fallback is disabled', async () => {
    const send: EndpointCtx['send'] = async () => {
      throw new Error('should not send')
    }
    expect(await resolveDouyinCredential('', { send, noGuestFallback: true })).toMatchObject({ cookie: '', origin: 'unresolved' })
  })
})
