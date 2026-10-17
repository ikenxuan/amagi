import { getCookieValue } from 'amagi/contracts/cookie'
import { AmagiHeaders } from 'amagi/contracts/request'
import { extractUifidFromCookie, normalizeDouyinCookie } from 'amagi/platforms/douyin/cookie'
import { parseWork } from 'amagi/platforms/douyin/endpoints/parseWork'
import { applySecsdkWebSign } from 'amagi/platforms/douyin/sign/secsdkWebSign'
import { createDouyinSigners } from 'amagi/platforms/douyin/sign/signers'
import { execute } from 'amagi/runtime/execute'
import { describe, expect, it } from 'vitest'

describe('douyin cookie normalization', () => {
  it.each([
    ['UIFID = test-value; sessionid=login', 'test-value', 'UIFID'],
    ['sessionid=login\nUIFID=test-value\nttwid=device', 'test-value', 'UIFID'],
    ['UIFID=test-value\nsessionid=login', 'test-value', 'UIFID'],
    ['UIFID=""test-value""; sessionid=login', 'test-value', 'UIFID'],
    ['UIFID=; UIFID_TEMP="test-temp"; sessionid=login', 'test-temp', 'UIFID_TEMP'],
    ['not_UIFID=wrong; UIFID_TEMP=test-temp', 'test-temp', 'UIFID_TEMP']
  ])('repairs exported cookie text without changing credential bytes: %s', (raw, expected, source) => {
    const result = normalizeDouyinCookie(raw)
    expect(result.uifidSource).toBe(source)
    expect(getCookieValue(result.cookie, 'UIFID')).toBe(expected)
    expect(extractUifidFromCookie(raw)).toBe(expected)
    expect(result.cookie).not.toMatch(/[\r\n]/)
    if (raw.includes('sessionid')) expect(getCookieValue(result.cookie, 'sessionid')).toBe('login')
  })

  it('preserves a valid cookie and never invents a device identity', () => {
    const raw = 'UIFID=real%2Bvalue==; ttwid=other; sessionid=account'
    expect(normalizeDouyinCookie(raw)).toEqual({ cookie: raw, uifidSource: 'UIFID' })
    expect(extractUifidFromCookie('sessionid=account')).toBe('')
    expect(normalizeDouyinCookie(null)).toEqual({ cookie: '', uifidSource: 'missing' })
  })

  it('signs with a normalized UIFID_TEMP rather than an empty identifier', () => {
    const signed = applySecsdkWebSign('https://www.douyin.com/aweme/v1/web/mix/aweme/?mix_id=1', {
      cookie: 'sessionid=account\nUIFID_TEMP="test-temp"',
      ts: 1234567890
    })
    expect(new URL(signed).searchParams.get('uifid')).toBe('test-temp')
    expect(new URL(signed).searchParams.get('x-secsdk-web-signature')).toMatch(/^[0-9a-f]{32}$/)
  })
})

it('normalizes the actual request cookie before signing and sending', async () => {
  let sent = false
  const result = await execute(
    parseWork,
    { aweme_id: '1' },
    {
      signers: createDouyinSigners(),
      ctx: {
        clientId: 'cookie-test',
        platform: 'douyin',
        userAgent: 'Chrome/142.0.0.0',
        cookie: 'sessionid=account\nUIFID_TEMP="test-temp"',
        requestConfig: {},
        send: async (spec) => {
          sent = true
          expect(new AmagiHeaders(spec.headers).get('cookie')).toBe('sessionid=account; UIFID_TEMP=test-temp; UIFID=test-temp')
          expect(new URL(spec.url).searchParams.get('uifid')).toBe('test-temp')
          return {
            body: { status_code: 0, aweme_detail: { aweme_id: '1' } },
            status: 200,
            headers: new AmagiHeaders(),
            durationMs: 0,
            url: spec.url
          }
        }
      }
    }
  )
  expect(result.success).toBe(true)
  expect(sent).toBe(true)
})
