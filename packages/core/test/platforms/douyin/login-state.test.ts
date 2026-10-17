import type { EndpointCtx } from 'amagi/contracts/endpoint'
import { AmagiHeaders, type RawResponse } from 'amagi/contracts/request'
import { checkDouyinLoginState, clearDouyinLoginStateCache } from 'amagi/platforms/douyin/loginState'
import { beforeEach, describe, expect, it } from 'vitest'

const reply = (data: unknown, status = 200): RawResponse => ({
  body: data,
  durationMs: 0,
  status,
  headers: new AmagiHeaders(),
  url: 'https://www.douyin.com/passport/account/info/v2/'
})

beforeEach(() => clearDouyinLoginStateCache())

describe('douyin login state', () => {
  it.each([
    [{ message: 'success', data: { is_visitor_account: false, user_id_str: '123' } }, 'login'],
    [{ message: 'success', data: { is_visitor_account: true } }, 'guest'],
    [{ message: 'error', data: { error_code: 13, description: 'session expired' } }, 'expired'],
    [{ message: 'success', data: {} }, 'unknown'],
    [{ message: 'busy', data: { error_code: 500 } }, 'unknown'],
    ['<html>blocked</html>', 'unknown']
  ])('classifies only unambiguous passport responses', async (body, state) => {
    const send: EndpointCtx['send'] = async () => reply(body)
    expect((await checkDouyinLoginState('UIFID=test; sessionid=login', { send })).state).toBe(state)
  })

  it('sends repaired cookie text with the caller UA and request configuration', async () => {
    const send: EndpointCtx['send'] = async (spec, reason, config) => {
      const headers = new AmagiHeaders(spec.headers)
      expect(headers.get('cookie')).toBe('sessionid=login; UIFID_TEMP=device; UIFID=device')
      expect(headers.get('user-agent')).toBe('caller-ua')
      expect(reason).toBe('prepare')
      expect(config?.proxy).toBe(false)
      expect(config?.timeout).toBe(1234)
      return reply({ message: 'success', data: { is_visitor_account: false, user_id: 42 } })
    }
    const result = await checkDouyinLoginState('sessionid=login\nUIFID_TEMP="device"', {
      send,
      userAgent: 'caller-ua',
      timeoutMs: 1234,
      requestConfig: { proxy: false }
    })
    expect(result).toEqual({ state: 'login', cached: false })
  })

  it('deduplicates concurrent checks, caches known outcomes, and does not cache failures', async () => {
    let calls = 0
    const send: EndpointCtx['send'] = async () => {
      calls++
      return calls === 1 ? reply('') : reply({ message: 'success', data: { is_visitor_account: true } })
    }
    const raw = 'UIFID=device'
    expect((await checkDouyinLoginState(raw, { send })).state).toBe('unknown')
    const result = await Promise.all([checkDouyinLoginState(raw, { send }), checkDouyinLoginState(raw, { send })])
    expect(result.map((item) => item.state)).toEqual(['guest', 'guest'])
    expect(calls).toBe(2)
    expect((await checkDouyinLoginState(raw, { send })).cached).toBe(true)
    expect(calls).toBe(2)
  })

  it('does not let a cleared in-flight check repopulate the cache', async () => {
    let release!: (value: RawResponse) => void
    let calls = 0
    const send: EndpointCtx['send'] = async () => {
      calls++
      if (calls === 1)
        return new Promise((resolve) => {
          release = resolve
        })
      return reply({ message: 'success', data: { is_visitor_account: true } })
    }
    const old = checkDouyinLoginState('UIFID=device', { send })
    clearDouyinLoginStateCache()
    release(reply({ message: 'success', data: { is_visitor_account: false, user_id: 1 } }))
    await old
    const fresh = await checkDouyinLoginState('UIFID=device', { send })
    expect(fresh.state).toBe('guest')
    expect(fresh.cached).toBe(false)
    expect(calls).toBe(2)
  })

  it('treats HTTP failure as unknown even if its body resembles a success', async () => {
    const send: EndpointCtx['send'] = async () => reply({ message: 'success', data: { is_visitor_account: true } }, 503)
    expect((await checkDouyinLoginState('UIFID=device', { send })).state).toBe('unknown')
  })
})
