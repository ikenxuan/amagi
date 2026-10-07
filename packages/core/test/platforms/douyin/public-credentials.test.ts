import { AmagiHeaders } from 'amagi/contracts/request'
import amagi, {
  checkDouyinLoginState,
  clearDouyinLoginStateCache,
  configureDouyinGuestCache,
  isDouyinCookieUsable,
  mintDouyinGuestCookie,
  normalizeDouyinCookie,
  resolveDouyinCredential
} from 'amagi/index'
import type { DouyinCredentialRequestOptions } from 'amagi/index'
import { beforeEach, describe, expect, it } from 'vitest'

beforeEach(() => {
  clearDouyinLoginStateCache()
  configureDouyinGuestCache(null)
})

describe('public Douyin credential tools', () => {
  it('repairs cookie text through the named, static and client package entry points', () => {
    const client = amagi()
    const cookie = 'sessionid=account\nUIFID_TEMP="device"'
    for (const normalize of [normalizeDouyinCookie, amagi.douyin.credentials.normalizeCookie, client.douyin.credentials.normalizeCookie]) {
      expect(normalize(cookie)).toEqual({
        cookie: 'sessionid=account; UIFID_TEMP=device; UIFID=device',
        uifidSource: 'UIFID_TEMP'
      })
    }
  })

  it('exposes offline resolution and unusable-state checks without sending any requests', async () => {
    expect(await resolveDouyinCredential('', { noGuestFallback: true })).toEqual({
      cookie: '',
      origin: 'unresolved',
      uifidSource: 'missing'
    })
    expect(await amagi.douyin.credentials.resolve('sessionid=account', { noGuestFallback: true })).toMatchObject({
      cookie: 'sessionid=account'
    })
    expect(await checkDouyinLoginState('')).toEqual({ state: 'unusable', cached: false })
    expect(await isDouyinCookieUsable('')).toBe(false)
  })

  it('uses one login cache across named exports and the credentials namespace', async () => {
    let requests = 0
    const options: DouyinCredentialRequestOptions = {
      send: async (spec) => {
        requests++
        return {
          body: { message: 'success', data: { is_visitor_account: false, user_id: 42 } },
          status: 200,
          headers: new AmagiHeaders(),
          durationMs: 0,
          url: spec.url
        }
      }
    }
    expect((await checkDouyinLoginState('UIFID=device', options)).state).toBe('login')
    expect(await amagi.douyin.credentials.isCookieUsable('UIFID=device', options)).toBe(true)
    expect(requests).toBe(1)
    amagi.douyin.credentials.clearLoginStateCache()
    expect((await amagi.douyin.credentials.checkLoginState('UIFID=device', options)).cached).toBe(false)
    expect(requests).toBe(2)
  })

  it('exposes explicit guest minting and cache resets without requiring internal imports', async () => {
    let requests = 0
    const options: DouyinCredentialRequestOptions = {
      send: async (spec) => {
        requests++
        return {
          body: '',
          status: 200,
          setCookie: ['UIFID_TEMP=guest-device'],
          headers: new AmagiHeaders(),
          durationMs: 0,
          url: spec.url
        }
      }
    }
    expect(await mintDouyinGuestCookie(options)).toBe('UIFID_TEMP=guest-device')
    expect(await amagi.douyin.credentials.mintGuestCookie(options)).toBe('UIFID_TEMP=guest-device')
    expect(requests).toBe(1)
    amagi.douyin.credentials.configureGuestCache(null)
    expect(await amagi.douyin.credentials.mintGuestCookie(options)).toBe('UIFID_TEMP=guest-device')
    expect(requests).toBe(2)
  })
})
