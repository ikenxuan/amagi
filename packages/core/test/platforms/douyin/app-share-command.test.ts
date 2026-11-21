import { createClient } from 'amagi/client/createClient'
import { createStaticAwemeFetcher } from 'amagi/model/fetchers/douyin/aweme'
import { awemeRegistry } from 'amagi/platforms/douyin/app/endpoints'
import { AppCookieJar } from 'amagi/platforms/douyin/app/guest/cookies'
import { createAppDevice } from 'amagi/platforms/douyin/app/guest/device'
import type { AppGuestSnapshot } from 'amagi/platforms/douyin/app/guest/state'
import type { AxiosAdapter } from 'axios'
import { describe, expect, it } from 'vitest'

const signerBaseUrl = 'http://signer.local'
const signerEndpoint = `${signerBaseUrl}/v1/app/sign`

interface SigningRequest {
  url: string
  method: string
  identity: { device_id: string; install_id: string; profile: Record<string, string> }
  headers: Record<string, string>
}

const sessionSnapshot = (): AppGuestSnapshot => {
  const device = createAppDevice()
  device.device_id = '123456789'
  device.install_id = '987654321'

  const cookies = new AppCookieJar()
  cookies.accept('https://aweme.snssdk.com/', ['ttwid=visitor; Domain=.snssdk.com; Path=/; Secure'])

  return { version: 1, device, cookies: cookies.serialize(), refreshedAt: Date.now() }
}

describe('Douyin App share command endpoints', () => {
  it('accepts the HTTP query timestamp as well as a numeric SDK timestamp', () => {
    expect(awemeRegistry.appCommandTrans.params.parse({ command: 'test', clipboard_timestamp: '1763000000000' })).toEqual({
      command: 'test',
      clipboard_timestamp: 1763000000000
    })
  })

  it('signs both calls with the same App session and preserves large work IDs', async () => {
    const signingRequests: SigningRequest[] = []
    const appRequests: Array<{ url: string; responseType?: string; signature: unknown; turingVersion: unknown }> = []
    const rawCommandResponse = '{"status_code":0,"extra_info":{"object_id":9007199254740993}}'
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === signerEndpoint) {
        const signing = JSON.parse(String(config.data)) as SigningRequest
        signingRequests.push(signing)
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: {
            ok: true,
            signObject: { url: signing.url, method: signing.method, headers: { ...signing.headers, 'X-Khan': 'signed' } }
          }
        }
      }

      appRequests.push({
        url: config.url ?? '',
        responseType: config.responseType,
        signature: config.headers.get('X-Khan'),
        turingVersion: config.headers.get('x-vc-bdturing-sdk-version')
      })
      const data =
        new URL(config.url ?? '').pathname === '/aweme/v2/platform/share/settings/'
          ? JSON.stringify({ status_code: 0, command_patterns: ['test-rule'] })
          : rawCommandResponse
      return { status: 200, statusText: 'OK', headers: {}, config, data }
    }

    const client = createClient({
      douyin: { app: { signerBaseUrl, session: sessionSnapshot() } },
      request: { adapter }
    })
    const legacy = createStaticAwemeFetcher()

    expect('appFetchShareSettings' in legacy).toBe(true)
    expect('appFetchCommandTrans' in legacy).toBe(true)

    const settings = await client.douyin.app.shareSettings()
    expect(settings.success).toBe(true)
    if (settings.success) expect(settings.data).toEqual({ status_code: 0, command_patterns: ['test-rule'] })

    const command = await client.douyin.app.commandTrans({
      command: 'AbCdEf12345',
      clipboard_timestamp: 1763000000000,
      support_type: '16',
      patterns: ['email', 'datetime'],
      start_from: ''
    })
    expect(command.success).toBe(true)
    if (command.success) expect(command.data).toEqual({ status_code: 0, extra_info: { object_id: '9007199254740993' } })

    expect(appRequests.map(({ url }) => new URL(url).pathname)).toEqual([
      '/aweme/v2/platform/share/settings/',
      '/aweme/v2/platform/share/command/trans/'
    ])
    expect(appRequests[1].responseType).toBe('text')

    expect(signingRequests).toHaveLength(2)
    for (const [index, signing] of signingRequests.entries()) {
      const signedUrl = new URL(signing.url)
      const sentUrl = new URL(appRequests[index].url)
      expect(signing.method).toBe('GET')
      expect(signedUrl.host).toBe('aweme.snssdk.com')
      expect(signing.identity.profile.device_type).toEqual(expect.any(String))
      expect(signedUrl.searchParams.get('device_platform')).toBe('android')
      expect(signedUrl.searchParams.get('aid')).toBe('1128')
      expect(signedUrl.searchParams.get('device_id')).toBe(signing.identity.device_id)
      expect(signedUrl.searchParams.get('iid')).toBe(signing.identity.install_id)
      expect(sentUrl.toString()).toBe(signing.url)
      expect(appRequests[index].signature).toBe('signed')
      expect(signing.headers['x-vc-bdturing-sdk-version']).toBe('4.2.1.cn')
      expect(appRequests[index].turingVersion).toBe(signing.headers['x-vc-bdturing-sdk-version'])
    }

    const commandUrl = new URL(appRequests[1].url)
    expect(commandUrl.searchParams.get('command')).toBe('AbCdEf12345')
    expect(commandUrl.searchParams.get('clipboard_timestamp')).toBe('1763000000000')
    expect(commandUrl.searchParams.get('support_type')).toBe('16')
    expect(commandUrl.searchParams.get('patterns')).toBe('["email","datetime"]')
    expect(commandUrl.searchParams.get('start_from')).toBe('')
  })

  it('judges command translation errors by the decoded platform status', async () => {
    const adapter: AxiosAdapter = async (config) => {
      const request = config.url === signerEndpoint ? (JSON.parse(String(config.data)) as SigningRequest) : undefined
      const data = request
        ? { ok: true, signObject: { url: request.url, method: request.method, headers: request.headers } }
        : '{"status_code":123,"status_msg":"invalid command"}'
      return { status: 200, statusText: 'OK', headers: {}, config, data }
    }
    const client = createClient({ douyin: { app: { signerBaseUrl, session: sessionSnapshot() } }, request: { adapter } })

    await expect(client.douyin.app.commandTrans({ command: 'test' })).resolves.toMatchObject({
      success: false,
      error: { platform: { code: 123 } }
    })
  })

  it('reports the signer HTTP status and does not forward its raw response or send the App request', async () => {
    const urls: string[] = []
    const adapter: AxiosAdapter = async (config) => {
      urls.push(config.url ?? '')
      return { status: 400, statusText: 'Bad Request', headers: {}, config, data: { ok: false, error: 'private diagnostic' } }
    }
    const client = createClient({ douyin: { app: { signerBaseUrl, session: sessionSnapshot() } }, request: { adapter } })
    const result = await client.douyin.app.shareSettings()

    expect(result).toMatchObject({ success: false, error: { code: 'APP_SIGNER_ERROR', message: '抖音 App 签名服务返回 HTTP 400' } })
    expect(result.message).not.toContain('private diagnostic')
    expect(urls).toEqual([signerEndpoint])
  })
})
