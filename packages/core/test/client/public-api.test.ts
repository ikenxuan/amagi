import amagi, { tools } from 'amagi/index'
import type { AxiosAdapter } from 'axios'
import { describe, expect, it } from 'vitest'

describe('包根公开 API', () => {
  it('平台对象按端和业务组织，不包含工具与 fetcher', () => {
    const client = amagi()
    expect(Object.keys(client.douyin).sort()).toEqual(['app', 'web'])
    expect(typeof client.douyin.web.comments).toBe('function')
    expect(typeof client.douyin.app.comments).toBe('function')
    expect(typeof client.bilibili.videoInfo).toBe('function')
    expect(typeof client.kuaishou.work).toBe('function')
    expect(typeof client.xiaohongshu.note).toBe('function')
    for (const api of [client.douyin.web, client.douyin.app, client.bilibili, client.kuaishou, client.xiaohongshu]) {
      expect(Object.keys(api).filter((key) => /^(fetch|app|web)[A-Z]/.test(key))).toEqual([])
      expect(api).not.toHaveProperty('fetcher')
      expect(api).not.toHaveProperty('sign')
      expect(api).not.toHaveProperty('apiUrls')
    }
    expect(typeof client.douyin.web.auth.qrcode).toBe('function')
    expect(typeof client.bilibili.auth.qrcode).toBe('function')
  })

  it('工具从包根 tools 获取，无需客户端实例', () => {
    expect(tools.bilibili.avToBv(170001)).toBe('BV17x411w7KC')
    expect(tools.bilibili.bvToAv('BV17x411w7KC')).toBe(170001)
    expect(typeof tools.bilibili.decodeDanmaku).toBe('function')
    expect(typeof tools.douyin.normalizeCookie).toBe('function')
    expect(typeof tools.douyin.sign.AB).toBe('function')
  })

  it('历史 Android 表情资源接口归 App，Web 仅保留 Web 与 H5 协议', async () => {
    const seen: Array<{ url: string; timeout?: number; cookie: unknown }> = []
    const adapter: AxiosAdapter = async (config) => {
      seen.push({ url: config.url!, timeout: config.timeout, cookie: config.headers.get('Cookie') })
      return { status: 200, statusText: 'OK', headers: {}, config, data: { status_code: 0, android_emoji_resource: {} } }
    }
    const client = amagi({
      request: { adapter },
      douyin: { web: { cookie: 'sessionid=web', request: { timeout: 1000 } }, app: { request: { timeout: 2000 } } }
    })
    expect(client.douyin.web).not.toHaveProperty('emojiResource')
    const result = await client.douyin.app.guestEmojiResource({})
    expect(result.success).toBe(true)
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ timeout: 2000 })
    expect(new URL(seen[0].url).hostname).toBe('api.amemv.com')
    expect(seen[0].cookie).toBeUndefined()
    expect(typeof client.douyin.app.emojiResource).toBe('function')
    expect(typeof client.douyin.web.guestUserInfo).toBe('function')
  })

  it('App 签名配置归到 douyin.app，默认不配置时返回错误信封', async () => {
    const result = await amagi().douyin.app.comments({ aweme_id: '1' })
    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('APP_SIGNER_NOT_CONFIGURED')
    expect(result.message).toContain('douyin.app.signerBaseUrl')
    expect(result.meta.attempts).toBe(0)
  })

  it.each(['', 'http://signer.test'])('表情资源免签且无 Cookie，签名地址为 %s', async (signerBaseUrl) => {
    const seen: string[] = []
    const adapter: AxiosAdapter = async (config) => {
      seen.push(config.url!)
      const url = new URL(config.url!)
      expect(url.hostname).toBe('aweme.snssdk.com')
      expect(url.searchParams.get('device_platform')).toBe('android')
      expect(url.searchParams.get('version_name')).toBeTruthy()
      expect(config.headers.get('Cookie')).toBeUndefined()
      expect(config.headers.get('X-Khan')).toBeUndefined()
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: { status_code: 0, android_emoji_resource: { id: 1419, md5: 'resource-md5', resource_url: 'https://cdn.test/emoji.zip' } }
      }
    }
    const result = await amagi({ douyin: { app: { signerBaseUrl } }, request: { adapter } }).douyin.app.emojiResource()
    expect(result.success).toBe(true)
    expect(result.data?.android_emoji_resource.id).toBe(1419)
    expect(seen).toHaveLength(1)
  })

  it.each(['emojiResource', 'guestEmojiResource'] as const)('%s 可按调用方的 APK 版本选择资源', async (method) => {
    const adapter: AxiosAdapter = async (config) => {
      expect(new URL(config.url!).searchParams.get('version_name')).toBe('17.4.0')
      return { status: 200, statusText: 'OK', headers: {}, config, data: { status_code: 0, android_emoji_resource: { id: 1 } } }
    }
    const client = amagi({ request: { adapter } })
    expect((await client.douyin.app[method]({ version_name: '17.4.0' })).success).toBe(true)
  })

  it.each(['text', 'arraybuffer'] as const)('签名服务总按 JSON 解析，不继承业务 responseType=%s', async (responseType) => {
    const types: unknown[] = []
    const adapter: AxiosAdapter = async (config) => {
      types.push(config.responseType)
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data:
          config.url === 'http://signer.test/v1/app/sign'
            ? JSON.stringify({ ok: true, signObject: { url: JSON.parse(config.data).url, method: 'GET', headers: { 'X-Khan': 'signed' } } })
            : { status_code: 0, comments: [], has_more: 0 }
      }
    }
    await amagi({
      douyin: { app: { signerBaseUrl: 'http://signer.test', session: false, request: { responseType } } },
      request: { adapter }
    }).douyin.app.comments({ aweme_id: '1' })
    expect(types).toEqual(['json', responseType])
  })

  it('抖音登录与恢复会话使用平台、端和单次合并配置', async () => {
    const seen: Array<{ timeout?: number; headers: Record<string, unknown> }> = []
    const adapter: AxiosAdapter = async (config) => {
      seen.push({
        timeout: config.timeout,
        headers: Object.fromEntries(Object.entries(config.headers.toJSON()).map(([key, value]) => [key.toLowerCase(), value]))
      })
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: JSON.stringify({
          data: { token: 'TOKEN1', qrcode_index_url: 'https://qr.test/', expire_time: 2000000000, status: 'confirming' }
        })
      }
    }
    const client = amagi({
      request: {
        adapter: async () => {
          throw new Error('不能丢失平台 adapter')
        },
        headers: { 'X-Global': 'global' }
      },
      douyin: {
        request: { timeout: 2000, headers: { 'X-Platform': 'platform' } },
        web: {
          cookie: 'ttwid=fixed; __ac_nonce=nonce',
          request: { adapter, timeout: 3000, headers: { 'X-Channel': 'channel', 'User-Agent': 'Wrong Browser' } }
        }
      }
    })
    const session = client.douyin.web.auth.qrcode({ timeout: 4000, headers: { 'X-Call': 'call' } })
    expect((await session.start()).ok).toBe(true)
    expect(seen[0]).toMatchObject({
      timeout: 4000,
      headers: { 'x-global': 'global', 'x-platform': 'platform', 'x-channel': 'channel', 'x-call': 'call' }
    })
    expect(seen[0].headers['user-agent']).not.toBe('Wrong Browser')
    seen.length = 0
    await client.douyin.web.auth.resume(session.serialize()).next()
    expect(seen.length).toBeGreaterThan(0)
    expect(seen[0]).toMatchObject({ timeout: 3000, headers: { 'x-channel': 'channel' } })
  })

  it('网络配置按全局、平台、端、调用合并，App 不继承 Web Cookie', async () => {
    const seen: Array<{ url: string; timeout?: number; params?: unknown; headers: Record<string, unknown> }> = []
    const adapter: AxiosAdapter = async (config) => {
      seen.push({ url: config.url!, timeout: config.timeout, params: config.params, headers: config.headers.toJSON() })
      const body = config.url === 'http://127.0.0.1:8787/v1/app/sign' ? JSON.parse(config.data) : null
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: body
          ? { ok: true, signObject: { url: body.url + '&device_id=1', method: 'GET', headers: { 'X-Khan': 'signature' } } }
          : { status_code: 0, comments: [{ cid: '1' }], has_more: 0, cursor: 1 }
      }
    }
    const client = amagi({
      request: { adapter, timeout: 1000 },
      douyin: {
        request: { timeout: 2000 },
        web: { cookie: 'sessionid=web' },
        app: { signerBaseUrl: 'http://127.0.0.1:8787', session: false, request: { timeout: 3000 } }
      }
    })
    const result = await client.douyin.app.comments({ aweme_id: '1', number: 1 }, { timeout: 4000 })
    expect(result.success).toBe(true)
    expect(seen).toHaveLength(2)
    expect(seen.every((x) => x.timeout === 4000)).toBe(true)
    expect(seen.every((x) => !Object.keys(x.headers).some((k) => k.toLowerCase() === 'cookie'))).toBe(true)
  })

  it('App 自定义请求同样先签名，并按实际发送字节签名 JSON body', async () => {
    let signedBody = ''
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === 'http://signer.test/v1/app/sign') {
        const payload = JSON.parse(config.data)
        signedBody = payload.body
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: {
            ok: true,
            signObject: {
              url: payload.url,
              method: 'POST',
              headers: { 'X-Khan': 'signed' }
            }
          }
        }
      }
      expect(config.data).toBe(signedBody)
      expect(config.headers.get('X-Khan')).toBe('signed')
      return { status: 200, statusText: 'OK', headers: {}, config, data: { status_code: 0 } }
    }
    const client = amagi({ douyin: { app: { signerBaseUrl: 'http://signer.test', session: false } }, request: { adapter } })
    const result = await client.douyin.app.request.post('https://aweme.snssdk.com/aweme/v1/custom/', { data: { text: '中文' } })
    expect(result.success).toBe(true)
    expect(signedBody).toBe('{"text":"中文"}')
  })

  it('App 自定义请求保留显式业务头与模块默认头，签名服务覆盖身份头', async () => {
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === 'http://signer.test/v1/app/sign') {
        const payload = JSON.parse(config.data)
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: {
            ok: true,
            signObject: {
              url: payload.url,
              method: 'POST',
              headers: { 'User-Agent': 'App/Signed', 'X-Khan': 'signed' }
            }
          }
        }
      }
      expect(config.headers.get('Content-Type')).toBe('application/json')
      expect(config.headers.get('X-Default')).toBe('default')
      expect(config.headers.get('X-Call')).toBe('call')
      expect(config.headers.get('User-Agent')).toBe('App/Signed')
      expect(config.headers.get('Cookie')).toBeUndefined()
      expect(config.headers.get('Referer')).toBeUndefined()
      return { status: 200, statusText: 'OK', headers: {}, config, data: { status_code: 0 } }
    }
    const client = amagi({
      douyin: { app: { signerBaseUrl: 'http://signer.test', session: false } },
      request: { adapter, headers: { Cookie: 'global=web' } }
    })
    const request = client.douyin.app.request.create({ headers: { 'X-Default': 'default' } })
    const result = await request.post('https://aweme.snssdk.com/aweme/v1/custom/', {
      data: '{"value":1}',
      headers: { 'Content-Type': 'application/json', 'X-Call': 'call', Cookie: 'caller=web', Referer: 'https://www.douyin.com/' }
    })
    expect(result.success).toBe(true)
  })
})
