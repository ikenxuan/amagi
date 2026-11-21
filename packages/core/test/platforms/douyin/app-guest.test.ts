import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { createClient } from 'amagi/client/createClient'
import type { EndpointCtx } from 'amagi/contracts/endpoint'
import { AmagiHeaders, type RawResponse } from 'amagi/contracts/request'
import { AppCookieJar } from 'amagi/platforms/douyin/app/guest/cookies'
import { appGuestSessionFor, AppGuestSession } from 'amagi/platforms/douyin/app/guest/session'
import { signerEndpointUrl } from 'amagi/platforms/douyin/app/guest/signer-url'
import * as storage from 'amagi/platforms/douyin/app/guest/storage'
import type { AxiosAdapter } from 'axios'
import { describe, expect, it, vi } from 'vitest'

const isolatedAppOptions = () => ({
  signerBaseUrl: 'http://signer.local',
  sessionFile: join(mkdtempSync(join(tmpdir(), 'amagi-app-')), 'session.json')
})

const guestAdapter = (state: { captcha?: boolean } = {}) => {
  const urls: string[] = []
  const adapter: AxiosAdapter = async (config) => {
    urls.push(config.url!)
    const url = new URL(config.url!)
    let data: unknown = { status_code: 0 }
    const headers: Record<string, string | string[]> = {}
    if (url.pathname.endsWith('tt-encrypt')) data = { ok: true, data: Buffer.from('ciphertext').toString('base64') }
    else if (url.pathname.includes('device_register')) data = { device_id_str: '123', install_id_str: '456' }
    else if (url.hostname === 'ttwid.bytedance.com')
      data = { status_code: 0, redirect_url: 'https://aweme.snssdk.com/ttwid/union/register/callback/?ticket=test' }
    else if (url.pathname.includes('callback')) headers['set-cookie'] = ['ttwid=visitor; Domain=.snssdk.com; Path=/; Secure']
    else if (url.hostname === 'signer.local') {
      const request = JSON.parse(String(config.data))
      data = { ok: true, signObject: { url: request.url, method: request.method, headers: request.headers } }
    } else if (url.pathname.includes('/feed/')) {
      data = { status_code: 0, aweme_list: [] }
      if (state.captcha) headers['bdturing-verify'] = '1'
      else headers['set-cookie'] = ['odin_tt=visitor; Domain=.snssdk.com; Path=/; Secure']
    }
    return { status: 200, statusText: 'OK', config, headers, data: JSON.stringify(data) }
  }
  return { adapter, urls }
}

describe('App 游客会话由 amagi 管理', () => {
  it('从签名服务站点地址派生两个本地密码操作端点', () => {
    expect(signerEndpointUrl('http://signer.local:8787', 'sign')).toBe('http://signer.local:8787/v1/app/sign')
    expect(signerEndpointUrl('http://signer.local:8787/', 'tt-encrypt')).toBe('http://signer.local:8787/v1/app/tt-encrypt')
    expect(() => signerEndpointUrl('http://signer.local:8787/v1/app/sign', 'sign')).toThrow('站点地址')
    expect(() => signerEndpointUrl('https://user:pass@signer.local:8787', 'sign')).toThrow('站点地址')
  })

  it('省略 sessionFile 时默认落盘，新的会话实例从文件恢复同一设备和 CK', async () => {
    const file = isolatedAppOptions().sessionFile
    vi.spyOn(storage, 'resolveAppSessionFile').mockImplementation((candidate) => (candidate ? resolve(candidate) : file))
    const { adapter, urls } = guestAdapter()
    const client = createClient({ douyin: { app: { signerBaseUrl: 'http://signer.local' } }, request: { adapter } })
    const snapshot = await client.douyin.app.guest.refresh()
    expect(existsSync(file)).toBe(true)
    expect(urls).toContain('http://signer.local/v1/app/tt-encrypt')
    expect(urls).toContain('http://signer.local/v1/app/sign')
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(snapshot)
    const restored = new AppGuestSession({ signerBaseUrl: 'http://signer.local' })
    expect(restored.snapshot()).toEqual(snapshot)
    expect(restored.cookie('https://aweme.snssdk.com/')).toContain('odin_tt=visitor')
  })

  it('默认会话文件相同的客户端共用初始化，显式不同文件保持隔离', () => {
    const options = isolatedAppOptions()
    vi.spyOn(storage, 'resolveAppSessionFile').mockImplementation((candidate) => (candidate ? resolve(candidate) : options.sessionFile))
    const first = appGuestSessionFor({ signerBaseUrl: options.signerBaseUrl })
    expect(appGuestSessionFor({ signerBaseUrl: options.signerBaseUrl })).toBe(first)
    expect(appGuestSessionFor(isolatedAppOptions())).not.toBe(first)
  })

  it.each(['text', 'arraybuffer'] as const)('业务使用 %s 时，游客初始化仍按 JSON 解析内部响应', async (responseType) => {
    const { adapter } = guestAdapter()
    const client = createClient({ douyin: { app: isolatedAppOptions() }, request: { adapter, responseType } })
    const snapshot = await client.douyin.app.guest.refresh()
    expect(snapshot.device.device_id).toBe('123')
    expect(snapshot.refreshedAt).toBeGreaterThan(0)
    expect(snapshot.cookies.cookies?.some((cookie) => cookie.key === 'odin_tt')).toBe(true)
  })

  it('初始化 Feed 要求验证码时不标记刷新成功；恢复后复用已注册的设备', async () => {
    const state = { captcha: true }
    const { adapter, urls } = guestAdapter(state)
    const client = createClient({ douyin: { app: isolatedAppOptions() }, request: { adapter } })
    await expect(client.douyin.app.guest.refresh()).rejects.toMatchObject({ code: 'CAPTCHA_REQUIRED' })
    const failed = client.douyin.app.guest.snapshot()!
    expect(failed.refreshedAt).toBe(0)
    expect(failed.device.device_id).toBe('123')
    state.captcha = false
    const recovered = await client.douyin.app.guest.refresh()
    expect(recovered.device).toEqual(failed.device)
    expect(recovered.refreshedAt).toBeGreaterThan(0)
    expect(urls.filter((url) => url.includes('device_register'))).toHaveLength(1)
  })

  it.each([
    { ok: false, headers: { 'X-Khan': 'signature' } },
    { ok: true, headers: { 'X-Khan': 123 } }
  ])('拒绝无效签名结果 $ok / $headers', async (invalid) => {
    const session = new AppGuestSession(isolatedAppOptions())
    const ctx = {
      send: async (spec) => {
        const request = JSON.parse(String(spec.body))
        return {
          status: 200,
          url: spec.url,
          headers: new AmagiHeaders(),
          durationMs: 0,
          body: {
            ok: invalid.ok,
            signObject: { url: request.url, method: request.method, headers: { ...request.headers, ...invalid.headers } }
          }
        }
      }
    } as EndpointCtx
    await expect(session.sign({ method: 'GET', url: 'https://aweme.snssdk.com/aweme/v1/feed/' }, ctx)).rejects.toMatchObject({
      code: 'APP_SIGNER_INVALID_RESPONSE'
    })
  })

  it('CookieJar 没有目标域 Cookie 时，不把调用方的 Web Cookie 带入 App 签名', async () => {
    const session = new AppGuestSession(isolatedAppOptions())
    const ctx = {
      send: async (spec) => {
        const request = JSON.parse(String(spec.body))
        return {
          status: 200,
          url: spec.url,
          headers: new AmagiHeaders(),
          durationMs: 0,
          body: { ok: true, signObject: { url: request.url, method: request.method, headers: request.headers } }
        }
      }
    } as EndpointCtx
    const signed = await session.sign(
      { method: 'GET', url: 'https://aweme.snssdk.com/aweme/v1/feed/', headers: { Cookie: 'web=only' } },
      ctx
    )
    expect(new AmagiHeaders(signed.headers).has('Cookie')).toBe(false)
  })

  it('Cookie 遵守域、路径、Secure 和删除指令，并能跨快照恢复', () => {
    const jar = new AppCookieJar()
    jar.accept('https://aweme.snssdk.com/a', ['odin_tt=one; Domain=.snssdk.com; Path=/; Secure', 'only=private; Path=/aweme/v1/'])
    expect(jar.header('https://aweme.snssdk.com/aweme/v1/feed/')).toBe('only=private; odin_tt=one')
    expect(jar.header('https://elsewhere.example/')).toBe('')
    expect(jar.header('http://aweme.snssdk.com/')).toBe('')
    const restored = new AppCookieJar(jar.serialize())
    restored.accept('https://aweme.snssdk.com/', ['odin_tt=gone; Domain=.snssdk.com; Path=/; Max-Age=0'])
    expect(restored.header('https://aweme.snssdk.com/')).toBe('')
  })

  it('并发初始化只注册一次；Cookie 在签名前收集并保存，重启不重新注册', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'amagi-app-')), 'session.json')
    const session = new AppGuestSession({ signerBaseUrl: 'http://signer.local', sessionFile: file })
    const requested: string[] = []
    const send: EndpointCtx['send'] = async (spec) => {
      requested.push(spec.url)
      const url = new URL(spec.url)
      let body: unknown = {}
      let setCookie: string[] = []
      if (url.pathname.endsWith('tt-encrypt')) body = { ok: true, data: Buffer.from([0x74, 0x63, 5, 16, 1]).toString('base64') }
      else if (url.pathname.includes('device_register'))
        body = { device_id_str: '123', install_id_str: '456', device_token: 'device-token' }
      else if (url.hostname === 'ttwid.bytedance.com')
        body = { status_code: 0, redirect_url: 'https://aweme.snssdk.com/ttwid/union/register/callback/?ticket=test' }
      else if (url.pathname.includes('callback')) setCookie = ['ttwid=visitor; Domain=.snssdk.com; Path=/; Secure']
      else if (url.hostname === 'signer.local') {
        const request = JSON.parse(String(spec.body))
        expect(request.identity.device_id).toBe('123')
        body = { ok: true, signObject: { url: request.url, method: request.method, headers: request.headers } }
      } else if (url.pathname.includes('/feed/')) setCookie = ['odin_tt=returned-by-platform; Domain=.snssdk.com; Path=/; Secure']
      return { url: spec.url, status: 200, body, headers: new AmagiHeaders(), setCookie, durationMs: 1 } as RawResponse
    }
    const ctx: EndpointCtx = { clientId: 'app-test', platform: 'douyin', cookie: '', userAgent: '', requestConfig: {}, send }
    await Promise.all([session.ensure(ctx), session.ensure(ctx)])
    expect(requested.filter((url) => url.includes('device_register'))).toHaveLength(1)
    expect(session.cookie('https://aweme.snssdk.com/aweme/v1/feed/')).toContain('odin_tt=returned-by-platform')
    expect(session.device.device_id).toBe('123')
    expect(JSON.parse(readFileSync(file, 'utf8')).device.device_id).toBe('123')
    const restored = new AppGuestSession({ signerBaseUrl: 'http://signer.local', sessionFile: file })
    const requestCount = requested.length
    await restored.ensure(ctx)
    expect(requested).toHaveLength(requestCount)
    expect(restored.cookie('https://aweme.snssdk.com/')).toContain('odin_tt=returned-by-platform')
    const signed = await restored.sign({ method: 'GET', url: 'https://aweme.snssdk.com/aweme/v1/feed/' }, ctx)
    expect(new AmagiHeaders(signed.headers).get('Cookie')).toBe('ttwid=visitor; odin_tt=returned-by-platform')
    expect(new URL(signed.url).searchParams.get('iid')).toBe('456')
    const beforeRefresh = restored.snapshot().device
    await restored.refresh(ctx)
    expect(restored.snapshot().device).toEqual(beforeRefresh)
    expect(requested.filter((url) => url.includes('device_register'))).toHaveLength(1)
    restored.observe({
      url: 'https://aweme.snssdk.com/',
      setCookie: ['odin_tt=rotated; Domain=.snssdk.com; Path=/; Secure']
    } as RawResponse)
    const rotated = new AppGuestSession({ signerBaseUrl: 'http://signer.local', sessionFile: file })
    expect(rotated.cookie('https://aweme.snssdk.com/')).toContain('odin_tt=rotated')
  })

  it('加密失败时不发注册请求或伪造设备 ID', async () => {
    const session = new AppGuestSession(isolatedAppOptions())
    const urls: string[] = []
    const ctx: EndpointCtx = {
      clientId: 'app-test',
      platform: 'douyin',
      cookie: '',
      userAgent: '',
      requestConfig: {},
      send: async (spec: { url: string }) => {
        urls.push(spec.url)
        return { status: 503, body: { ok: false }, headers: new AmagiHeaders(), url: spec.url, durationMs: 0 }
      }
    }
    await expect(session.ensure(ctx)).rejects.toMatchObject({ code: 'APP_SIGNER_ERROR' })
    expect(urls).toEqual(['http://signer.local/v1/app/tt-encrypt'])
    expect(session.device.device_id).toBe('')
  })
})
