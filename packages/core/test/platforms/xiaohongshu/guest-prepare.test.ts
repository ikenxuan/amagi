import { createCipheriv, createHash, createPublicKey, diffieHellman, generateKeyPairSync } from 'node:crypto'
import { Agent } from 'node:http'
import { crc32 } from 'node:zlib'

import { Base64Encoder, FingerprintGenerator } from '@ikenxuan/xhshow-ts'
import { createClient } from 'amagi/client/createClient'
import { makeClientCtx } from 'amagi/client/runtime'
import { getCookieValue } from 'amagi/contracts/cookie'
import { AmagiHeaders, type RequestConfig, type RequestSpec } from 'amagi/contracts/request'
import { createBoundXiaohongshuFetcher, xiaohongshuFetcher } from 'amagi/model/fetchers/xiaohongshu'
import { createXiaohongshuRoutes } from 'amagi/platforms/xiaohongshu/routes'
import { xiaohongshuSigningSession } from 'amagi/platforms/xiaohongshu/session'
import { generateXSCommon } from 'amagi/platforms/xiaohongshu/sign'
import * as cryptoConfigModule from 'amagi/platforms/xiaohongshu/sign/config'
import { liveXs, xs } from 'amagi/platforms/xiaohongshu/sign/steps'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import type { Request, Response, Router } from 'express'
import { describe, expect, it, vi } from 'vitest'

const scriptingPayload = () => {
  const encoded = Buffer.from(String.fromCharCode(1, 1, 101, 1, 1).repeat(802)).toString('base64')
  return 'callback({"b":"' + encoded + '","d":{"92":0,"93":801,"100":97}})'
}

const transport = () => {
  const requests: InternalAxiosRequestConfig[] = []
  let failScripting = false
  let session = 0
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config)
    const scripting = config.url?.endsWith('/scripting')
    const activate = config.url?.endsWith('/login/activate')
    const fail = scripting && failScripting
    if (fail) failScripting = false
    return {
      status: 200,
      statusText: 'OK',
      config,
      headers: activate ? { 'set-cookie': [`web_session=guest-${++session}; Path=/`] } : {},
      data: scripting ? (fail ? {} : { data: { data: scriptingPayload(), secPoisonId: 'poison' } }) : { code: 0, success: true, data: {} }
    }
  }
  const client = (cookie = '') => createClient({ cookies: { xiaohongshu: cookie }, request: { adapter } })
  return {
    requests,
    adapter,
    client,
    failNextScripting: () => {
      failScripting = true
    },
    handshakes: () => requests.filter((request) => request.url?.endsWith('/scripting')),
    business: () => requests.filter((request) => request.url?.endsWith('/hot_list_h5'))
  }
}

const fetchHotList = (client: ReturnType<typeof createClient>, config?: RequestConfig) =>
  client.xiaohongshu.fetcher.fetchSearchHotList({}, config)

const businessCookies = (h: ReturnType<typeof transport>) => h.business().map((request) => String(request.headers.get('cookie')))

const encoder = new Base64Encoder()
const sessionInput = (name: string) => ({
  cookie: `a1=1900000000abcdef0123456789abcdef; web_session=${name}; webBuild=fixture-build`,
  webSsk: { 'xhs-pc-web': Buffer.alloc(48, name.charCodeAt(0)).toString('base64') },
  b1: `fixture-b1-${name}`
})
const signatures = (request: Pick<RequestSpec, 'headers'>) => {
  const headers = new AmagiHeaders(request.headers)
  return {
    xs: JSON.parse(encoder.decode(String(headers.get('x-s')).slice(4))),
    common: JSON.parse(encoder.decode(String(headers.get('x-s-common'))))
  }
}
const expectProof = (request: Pick<RequestSpec, 'headers'>, keyBase64: string, appId = 'xhs-pc-web') => {
  const { xs } = signatures(request)
  expect(xs.x5).toMatch(/^[a-f0-9]{32}$/)
  const packet = Buffer.from(xs.x7[appId], 'base64')
  const key = Buffer.from(keyBase64, 'base64')
  expect(packet.subarray(4, 24)).toEqual(
    createHash('sha1')
      .update(Buffer.concat([key, packet.subarray(0, 4)]))
      .digest()
  )
  expect(packet.subarray(24)).toEqual(key.subarray(32))
  expect(xs.x6[appId]).toBe(
    createHash('sha1')
      .update(Buffer.concat([Buffer.from(xs.x5, 'hex'), packet]))
      .digest('base64')
  )
}

describe('xiaohongshu explicit session binding', () => {
  it('uses supplied b1 without generating a fingerprint and proves the final POST body', async () => {
    const h = transport()
    const input = sessionInput('first')
    const before = JSON.stringify(input)
    const client = createClient({ xiaohongshuSession: input, request: { adapter: h.adapter } })
    vi.spyOn(FingerprintGenerator.prototype, 'generate').mockImplementation(() => {
      throw new Error('unexpected fingerprint')
    })
    const result = await client.xiaohongshu.fetcher.fetchNoteDetail({ note_id: 'n1', xsec_token: 'tk' })
    expect(result.success).toBe(true)
    expect(h.requests).toHaveLength(1)
    const request = h.requests[0]
    expectProof(request, input.webSsk['xhs-pc-web'])
    const { xs, common } = signatures(request)
    expect(xs.x5).toBe(
      createHash('md5')
        .update(new URL(request.url!).pathname + request.data)
        .digest('hex')
    )
    expect(common).toMatchObject({
      x5: getCookieValue(input.cookie, 'a1'),
      x4: 'fixture-build',
      x8: input.b1,
      x9: crc32(input.b1) ^ 0xedb88320
    })
    expect(JSON.stringify(input)).toBe(before)
  })

  it('copies the input and isolates concurrent clients with the same a1', async () => {
    const h = transport()
    const first = sessionInput('first')
    const second = sessionInput('second')
    const firstKey = first.webSsk['xhs-pc-web']
    const clientA = createClient({ xiaohongshuSession: first, request: { adapter: h.adapter } })
    const clientB = createClient({ xiaohongshuSession: second, request: { adapter: h.adapter } })
    first.webSsk['xhs-pc-web'] = second.webSsk['xhs-pc-web']
    first.b1 = 'mutated'
    expect((await Promise.all([fetchHotList(clientA), fetchHotList(clientB)])).every((result) => result.success)).toBe(true)
    const byCookie = (cookie: string) => h.requests.find((request) => request.headers.get('cookie') === cookie)!
    expectProof(byCookie(first.cookie), firstKey)
    expectProof(byCookie(second.cookie), second.webSsk['xhs-pc-web'])
    expect(signatures(byCookie(first.cookie)).common.x8).toBe('fixture-b1-first')
    expect(signatures(byCookie(second.cookie)).common.x8).toBe(second.b1)
  })

  it('does not inherit session material after a per-call or derived-request Cookie override', async () => {
    const h = transport()
    const input = sessionInput('first')
    const client = createClient({ xiaohongshuSession: input, request: { adapter: h.adapter } })
    const override = sessionInput('second').cookie
    expect((await fetchHotList(client, { headers: { COOKIE: override } })).success).toBe(true)
    const derived = client.xiaohongshu.request.create({ headers: { Cookie: override } })
    expect((await derived.get('https://edith.xiaohongshu.com/api/sns/web/v1/test')).success).toBe(true)
    for (const request of h.requests) {
      expect(request.headers.get('cookie')).toBe(override)
      expect(signatures(request).xs.x6).toBeUndefined()
      expect(signatures(request).xs.x7).toBeUndefined()
      expect(signatures(request).common.x8).not.toBe(input.b1)
    }
    expect((await fetchHotList(client)).success).toBe(true)
    expectProof(h.requests[2], input.webSsk['xhs-pc-web'])
  })

  it('inherits session state in custom request without leaking inputs into configs, errors or events', async () => {
    const h = transport()
    const input = sessionInput('first')
    const events: unknown[] = []
    const client = createClient({ xiaohongshuSession: input, request: { adapter: h.adapter }, debug: true })
    client.on('http:request', (event) => events.push(event))
    client.on('api:success', (event) => events.push(event))
    client.on('api:error', (event) => events.push(event))
    const request = client.xiaohongshu.request.create({ timeout: 987 })
    const response = await request.axios.get('https://edith.xiaohongshu.com/api/sns/web/v1/test')
    expect(response.data.success).toBe(true)
    expectProof(h.requests[0], input.webSsk['xhs-pc-web'])
    const error = await request.axios
      .get('https://edith.xiaohongshu.com/api/sns/web/v1/test', {
        amagi: { sign: 'missing-test-signer' }
      })
      .catch((value: unknown) => value)
    const publicData = JSON.stringify([response.config, response.data, error, events, h.requests[0]])
    expect(publicData).not.toContain(input.webSsk['xhs-pc-web'])
    expect(publicData).not.toContain(input.b1)
    expect(publicData).not.toContain('xiaohongshuSession')
    expect(publicData).not.toContain('webSsk')
    expect(h.requests).toHaveLength(1)
  })

  it.each([{ cookie: false as const }, { dropHeaders: ['COOKIE'] }])(
    'omits inherited proof and b1 when Cookie is disabled: %j',
    async (amagi) => {
      const h = transport()
      const input = sessionInput('first')
      const client = createClient({ xiaohongshuSession: input, request: { adapter: h.adapter } })
      expect(
        (
          await client.xiaohongshu.request.get('https://edith.xiaohongshu.com/api/sns/web/v1/test', {
            amagi: {
              ...amagi,
              sign: (spec, ctx) => {
                expect(ctx.xiaohongshuSession).toBeUndefined()
                return xs('get', 'xys').apply(spec, ctx)
              }
            }
          })
        ).success
      ).toBe(true)
      const request = h.requests[0]
      expect(request.headers.get('cookie')).toBeUndefined()
      expect(signatures(request).xs.x6).toBeUndefined()
      expect(signatures(request).xs.x7).toBeUndefined()
      expect(signatures(request).common.x8).not.toBe(input.b1)
    }
  )

  it('accepts explicit sessions at static and bound fetcher entrances', async () => {
    const h = transport()
    const input = sessionInput('first')
    const bound = createBoundXiaohongshuFetcher(input, { adapter: h.adapter })
    expect((await bound.fetchSearchHotList()).success).toBe(true)
    expect((await xiaohongshuFetcher.fetchSearchHotList({}, input, { adapter: h.adapter })).success).toBe(true)
    expect(h.requests).toHaveLength(2)
    for (const request of h.requests) expectProof(request, input.webSsk['xhs-pc-web'])
  })

  it.each(['routes', 'facade'] as const)(
    'inherits explicit session state through the %s server entrance without opening a socket',
    async (entrance) => {
      const h = transport()
      const input = sessionInput('first')
      const client = createClient({ xiaohongshuSession: input, request: { adapter: h.adapter } })
      const app = entrance === 'facade' ? client.startServer(0, { listen: () => undefined }) : undefined
      const routers: Router[] = app
        ? app.router.stack
            .map((layer) => layer.handle)
            .filter((handler): handler is Router => 'stack' in handler && Array.isArray(handler.stack))
        : [createXiaohongshuRoutes(input, { adapter: h.adapter })]
      const layers = routers.flatMap((router) => router.stack)
      const route = layers.find((layer) => layer.route?.path === '/fetch_search_hot_list')?.route
      if (!route) throw new Error('missing hot-list route')
      let result: unknown
      await route.stack[0].handle(
        { query: {}, originalUrl: '/api/xiaohongshu/fetch_search_hot_list' } as Request,
        {
          json: (value: unknown) => {
            result = value
          }
        } as Response,
        () => undefined
      )
      expect(result).toMatchObject({ success: true })
      expect(h.requests).toHaveLength(1)
      expectProof(h.requests[0], input.webSsk['xhs-pc-web'])
      expect(signatures(h.requests[0]).common.x8).toBe(input.b1)
    }
  )

  it('keeps the same session while signing distinct comment pages', async () => {
    const h = transport()
    const input = sessionInput('first')
    const adapter: AxiosAdapter = async (config) => {
      const response = await h.adapter(config)
      const first = h.requests.length === 1
      response.data = {
        code: 0,
        success: true,
        data: { comments: [{ id: first ? 'c1' : 'c2' }], cursor: first ? 'next' : '', has_more: first }
      }
      return response
    }
    const client = createClient({ xiaohongshuSession: input, request: { adapter } })
    const result = await client.xiaohongshu.fetcher.fetchSubComments({ note_id: 'n1', root_comment_id: 'r1', xsec_token: 'tk', number: 2 })
    expect(result.success).toBe(true)
    expect(h.requests).toHaveLength(2)
    expect(signatures(h.requests[0]).xs.x5).not.toBe(signatures(h.requests[1]).xs.x5)
    for (const request of h.requests) {
      expectProof(request, input.webSsk['xhs-pc-web'])
      expect(request.headers.get('cookie')).toBe(input.cookie)
      expect(signatures(request).common.x8).toBe(input.b1)
    }
  })

  it('accepts JSON SSK with browser-compatible padding and preserves valid b1 whitespace', async () => {
    const h = transport()
    const key = Buffer.alloc(32).toString('base64').slice(0, -2) + 'B='
    const input = { cookie: sessionInput('first').cookie, webSsk: JSON.stringify({ 'xhs-pc-web': key }), b1: ' \tfixture-b1\n ' }
    const client = createClient({ xiaohongshuSession: input, request: { adapter: h.adapter } })
    vi.spyOn(FingerprintGenerator.prototype, 'generate').mockImplementation(() => {
      throw new Error('unexpected fingerprint')
    })
    expect((await fetchHotList(client)).success).toBe(true)
    expectProof(h.requests[0], key)
    expect(signatures(h.requests[0]).common.x8).toBe(input.b1)
    const common = JSON.parse(encoder.decode(generateXSCommon(input.cookie, input.b1)))
    expect(common.x8).toBe(input.b1)
    expect(common.x9).toBe(crc32(input.b1) ^ 0xedb88320)
  })

  it.each((['session', 'common'] as const).flatMap((entrance) => ['', ' \t\r\n ', null, false, 0, {}, []].map((b1) => ({ entrance, b1 }))))(
    'rejects invalid $entrance b1 without generating a replacement: $b1',
    ({ entrance, b1: invalid }) => {
      const input = sessionInput('first')
      const b1 = invalid as string
      const generate = vi.spyOn(FingerprintGenerator.prototype, 'generate').mockImplementation(() => {
        throw new Error('unexpected fingerprint')
      })
      const call =
        entrance === 'session' ? () => createClient({ xiaohongshuSession: { ...input, b1 } }) : () => generateXSCommon(input.cookie, b1)
      expect(call).toThrow(TypeError)
      expect(call).toThrow('小红书会话 b1 必须是非空白字符串')
      expect(generate).not.toHaveBeenCalled()
    }
  )

  it('retains the existing common-signing path when b1 is undefined', async () => {
    const h = transport()
    const input = { ...sessionInput('first'), b1: undefined }
    const client = createClient({ xiaohongshuSession: input, request: { adapter: h.adapter } })
    expect((await fetchHotList(client)).success).toBe(true)
    expectProof(h.requests[0], input.webSsk['xhs-pc-web'])
    expect(signatures(h.requests[0]).common.x8).toEqual(expect.any(String))
    const common = JSON.parse(encoder.decode(generateXSCommon(input.cookie, undefined)))
    expect(common.x8).toEqual(expect.any(String))
    expect(common.x8.length).toBeGreaterThan(0)
  })

  it('passes the bound session through the liveXs sign step without sending a request', async () => {
    const h = transport()
    const input = sessionInput('live')
    const ctx = makeClientCtx('xiaohongshu', input, { adapter: h.adapter }, 'live-fixture')
    const spec: RequestSpec = {
      method: 'GET',
      url: 'https://live-room.xiaohongshu.com/api/sns/web/v1/live/current_room_info?room_id=fixture-room',
      extra: { signParams: { room_id: 'fixture-room' } },
      headers: { 'x-xray-traceid': 'drop-xray', 'x-b3-traceid': 'drop-b3' }
    }
    vi.spyOn(FingerprintGenerator.prototype, 'generate').mockImplementation(() => {
      throw new Error('unexpected fingerprint')
    })
    const signed = await liveXs().apply(spec, ctx)
    expectProof(signed, input.webSsk['xhs-pc-web'])
    expect(signatures(signed).common.x8).toBe(input.b1)
    expect(signatures(signed).xs.x5).toBe(
      createHash('md5')
        .update(new URL(spec.url).pathname + '?room_id=fixture-room')
        .digest('hex')
    )
    const headers = new AmagiHeaders(signed.headers)
    expect(headers.get('xy-common-params')).toBe('platform=web')
    expect(headers.get('x-ratelimit-meta')).toBe('roomId=fixture-room')
    expect(headers.get('x-xray-traceid')).toBeUndefined()
    expect(headers.get('x-b3-traceid')).toBeUndefined()
    expect(h.requests).toHaveLength(0)
  })

  it('passes every appId through independently isolated signing sessions', async () => {
    const h = transport()
    const inputs = ['first', 'second'].map((name, index) => ({
      ...sessionInput(name),
      webSsk: {
        ...sessionInput(name).webSsk,
        'fixture-app-32': Buffer.alloc(32, index + 1).toString('base64'),
        'fixture-app-64': Buffer.alloc(64, index + 3).toString('base64')
      }
    }))
    const clients = inputs.map((input) => createClient({ xiaohongshuSession: input, request: { adapter: h.adapter } }))
    expect((await Promise.all(clients.map((client) => fetchHotList(client)))).every((result) => result.success)).toBe(true)
    expect(h.requests).toHaveLength(2)
    for (const input of inputs) {
      const request = h.requests.find((item) => item.headers.get('cookie') === input.cookie)!
      const { xs, common } = signatures(request)
      expect(Object.keys(xs.x6).sort()).toEqual(Object.keys(input.webSsk).sort())
      expect(Object.keys(xs.x7).sort()).toEqual(Object.keys(input.webSsk).sort())
      for (const [appId, key] of Object.entries(input.webSsk)) expectProof(request, key, appId)
      expect(common.x8).toBe(input.b1)
    }
  })

  it('copies and isolates explicit userId with the bound Cookie', () => {
    const h = transport()
    const first = { ...sessionInput('first'), userId: 'fixture-user-first' }
    const second = { ...sessionInput('second'), userId: 'fixture-user-second' }
    const firstCtx = makeClientCtx('xiaohongshu', first, { adapter: h.adapter }, 'first')
    const secondCtx = makeClientCtx('xiaohongshu', second, { adapter: h.adapter }, 'second')
    first.userId = second.userId
    const spec: RequestSpec = { method: 'GET', url: 'https://edith.xiaohongshu.com/api/sns/web/v1/feed' }
    expect(xiaohongshuSigningSession(firstCtx, spec)?.userId).toBe('fixture-user-first')
    expect(xiaohongshuSigningSession(secondCtx, spec)?.userId).toBe('fixture-user-second')
    expect(Object.isFrozen(firstCtx.xiaohongshuSession)).toBe(true)
    expect(xiaohongshuSigningSession({ ...firstCtx, cookie: second.cookie }, spec)).toBeUndefined()
    expect(xiaohongshuSigningSession(firstCtx, { ...spec, headers: { Cookie: second.cookie } })).toBeUndefined()
    expect(xiaohongshuSigningSession(firstCtx, { ...spec, dropHeaders: ['COOKIE'] })).toBeUndefined()
    expect(h.requests).toHaveLength(0)
  })

  it('rejects invalid explicit userId instead of creating a substitute', () => {
    for (const value of ['', ' \t\n ', null, false, 0, {}, []]) {
      const input = { ...sessionInput('first'), userId: value as string }
      expect(() => createClient({ xiaohongshuSession: input })).toThrow(TypeError)
      expect(() => createClient({ xiaohongshuSession: input })).toThrow('小红书会话 userId 必须是非空白字符串')
    }
  })

  it('rejects conflicting cookies and invalid SSK without including the values in errors', () => {
    const input = sessionInput('first')
    expect(() => createClient({ cookies: { xiaohongshu: sessionInput('second').cookie }, xiaohongshuSession: input })).toThrow()
    for (const webSsk of [
      'secret-invalid-json',
      { 'xhs-pc-web': 'secret-invalid-base64' },
      { 'xhs-pc-web': Buffer.alloc(31).toString('base64') },
      JSON.stringify({ ['__proto__']: input.webSsk['xhs-pc-web'] }),
      { 'xhs-pc-web': Buffer.alloc(32).toString('base64').replace(/=/g, '') }
    ]) {
      let error: unknown
      try {
        createClient({ xiaohongshuSession: { ...input, webSsk } })
      } catch (caught) {
        error = caught
      }
      expect(error).toBeInstanceOf(Error)
      expect(String(error)).not.toContain('secret-invalid')
      expect(String(error)).not.toContain(input.cookie)
      expect(String(error)).not.toContain(input.b1)
    }
  })
})

const encryptedTransport = (failure?: 'webprofile' | 'activate-replay') => {
  const h = transport()
  const server = generateKeyPairSync('x25519')
  const originalConfig = cryptoConfigModule.createXiaohongshuCryptoConfig
  vi.spyOn(cryptoConfigModule, 'createXiaohongshuCryptoConfig').mockImplementation((ua) => {
    const config = originalConfig(ua)
    Object.defineProperty(config, 'SSK_SERVER_PUBLIC_KEY', {
      value: server.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64')
    })
    return config
  })
  const profileKey = Buffer.alloc(48, 17).toString('base64')
  const issued: string[] = []
  let profileCiphertext = ''
  let failNext = Boolean(failure)
  const encrypt = (cpk: string, key: string) => {
    const publicKey = createPublicKey({
      key: Buffer.concat([Buffer.from('302a300506032b656e032100', 'hex'), Buffer.from(cpk, 'base64')]),
      type: 'spki',
      format: 'der'
    })
    const shared = diffieHellman({ privateKey: server.privateKey, publicKey })
    const nonce = Buffer.alloc(12, 9)
    const cipher = createCipheriv('aes-256-gcm', shared, nonce)
    return Buffer.concat([nonce, cipher.update(Buffer.from(key, 'base64')), cipher.final(), cipher.getAuthTag()]).toString('base64')
  }
  const adapter: AxiosAdapter = async (config) => {
    const response = await h.adapter(config)
    if (config.url?.endsWith('/webprofile')) {
      const data = JSON.parse(config.data)
      if (data.ext?.cpk) {
        profileCiphertext = encrypt(data.ext.cpk, profileKey)
        response.data = {
          code: 0,
          success: true,
          data: { ext: { ssk: failNext && failure === 'webprofile' ? 'invalid-secret-ciphertext' : profileCiphertext } }
        }
        if (failure === 'webprofile') failNext = false
      }
    } else if (config.url?.endsWith('/login/activate')) {
      const data = JSON.parse(config.data)
      if (data.client_public_key_base64) {
        const key = Buffer.alloc(48, issued.length + 34).toString('base64')
        issued.push(key)
        response.data = {
          code: 0,
          success: true,
          data: {
            login_info: { ssk: failNext && failure === 'activate-replay' ? profileCiphertext : encrypt(data.client_public_key_base64, key) }
          }
        }
        failNext = false
      }
    }
    return response
  }
  return { ...h, adapter, profileKey, issued, client: () => createClient({ request: { adapter }, debug: true }) }
}

describe('xiaohongshu guest SSK exchange', () => {
  it.each(
    (['webprofile', 'activate'] as const).flatMap((stage) =>
      ['', ' \t\n ', null, undefined, false, 0, {}, []].map((ssk) => ({ stage, ssk }))
    )
  )('rejects a present invalid $stage SSK field instead of downgrading: $ssk', async ({ stage, ssk }) => {
    const h = encryptedTransport()
    let failNext = true
    const adapter: AxiosAdapter = async (config) => {
      const response = await h.adapter(config)
      if (failNext && config.url?.endsWith(`/${stage}`)) {
        if (stage === 'webprofile') response.data.data.ext.ssk = ssk
        else response.data.data.login_info.ssk = ssk
        failNext = false
      }
      return response
    }
    const client = createClient({ request: { adapter }, debug: true })
    const failures = await Promise.all([fetchHotList(client), fetchHotList(client)])
    expect(failures.map((result) => result.success)).toEqual([false, false])
    expect(h.business()).toHaveLength(0)
    expect(h.handshakes()).toHaveLength(1)
    expect(JSON.stringify(failures)).toContain('小红书游客 SSK 交换失败')
    expect(JSON.stringify(failures)).not.toContain(h.profileKey)
    expect((await fetchHotList(client)).success).toBe(true)
    expect(h.handshakes()).toHaveLength(2)
    expectProof(h.business()[0], h.issued.at(-1)!)
  })

  it.each(['webprofile', 'activate'] as const)('allows an absent %s SSK field without discarding a valid exchange', async (stage) => {
    const h = encryptedTransport()
    const adapter: AxiosAdapter = async (config) => {
      const response = await h.adapter(config)
      if (config.url?.endsWith(`/${stage}`)) {
        if (stage === 'webprofile') delete response.data.data.ext.ssk
        else delete response.data.data.login_info.ssk
      }
      return response
    }
    const client = createClient({ request: { adapter } })
    expect((await fetchHotList(client)).success).toBe(true)
    expect(h.handshakes()).toHaveLength(1)
    expectProof(h.business()[0], stage === 'activate' ? h.profileKey : h.issued[0])
  })

  it.each(['higher', 'lower'].flatMap((priority) => ['', Buffer.alloc(48).toString('base64')].map((ssk) => ({ priority, ssk }))))(
    'does not hide an invalid $priority-priority SSK field behind a valid one: $ssk',
    async ({ priority, ssk }) => {
      const h = encryptedTransport()
      const adapter: AxiosAdapter = async (config) => {
        const response = await h.adapter(config)
        if (config.url?.endsWith('/webprofile')) {
          if (priority === 'higher') response.data.ssk = ssk
          else {
            response.data.ssk = response.data.data.ext.ssk
            response.data.data.ext.ssk = ssk
          }
        }
        return response
      }
      expect((await fetchHotList(createClient({ request: { adapter } }))).success).toBe(false)
      expect(h.business()).toHaveLength(0)
      expect(h.requests.some((request) => request.url?.endsWith('/activate'))).toBe(false)
    }
  )

  it('signs both final handshake bodies and uses only their respective exchange results', async () => {
    const h = encryptedTransport()
    expect((await fetchHotList(h.client())).success).toBe(true)
    expect(h.requests).toHaveLength(4)
    const profile = h.requests[1]
    const activate = h.requests[2]
    const profilePublicKey = JSON.parse(profile.data).ext?.cpk
    const activatePublicKey = JSON.parse(activate.data).client_public_key_base64
    expect(typeof profilePublicKey).toBe('string')
    expect(typeof activatePublicKey).toBe('string')
    expect(Buffer.from(profilePublicKey, 'base64')).toHaveLength(32)
    expect(Buffer.from(activatePublicKey, 'base64')).toHaveLength(32)
    expect(profilePublicKey).not.toBe(activatePublicKey)
    for (const request of [profile, activate]) {
      expect(signatures(request).xs.x5).toBe(
        createHash('md5')
          .update(new URL(request.url!).pathname + request.data)
          .digest('hex')
      )
    }
    expectProof(activate, h.profileKey)
    expectProof(h.business()[0], h.issued[0])
    expect(h.business()[0].headers.get('cookie')).toContain('web_session=guest-1')
  })

  it('coalesces and renews the complete Cookie plus SSK session', async () => {
    let now = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const h = encryptedTransport()
    const client = h.client()
    expect((await Promise.all([fetchHotList(client), fetchHotList(client)])).every((result) => result.success)).toBe(true)
    expect((await fetchHotList(client)).success).toBe(true)
    expect(h.handshakes()).toHaveLength(1)
    expect(h.issued).toHaveLength(1)
    for (const request of h.business()) expectProof(request, h.issued[0])
    now += 5 * 60 * 1000
    expect((await fetchHotList(client)).success).toBe(true)
    expect(h.handshakes()).toHaveLength(2)
    expect(h.issued).toHaveLength(2)
    expect(h.business()[3].headers.get('cookie')).toContain('web_session=guest-2')
    expectProof(h.business()[3], h.issued[1])
    expect(h.issued[0]).not.toBe(h.issued[1])
  })

  it.each(['webprofile', 'activate-replay'] as const)(
    'aborts and evicts failed %s exchanges without leaking ciphertext',
    async (failure) => {
      const h = encryptedTransport(failure)
      const client = h.client()
      const failures = await Promise.all([fetchHotList(client), fetchHotList(client)])
      expect(failures.map((result) => result.success)).toEqual([false, false])
      expect(h.business()).toHaveLength(0)
      expect(h.handshakes()).toHaveLength(1)
      expect(JSON.stringify(failures)).not.toContain('invalid-secret-ciphertext')
      expect(JSON.stringify(failures)).not.toContain(h.profileKey)
      expect((await fetchHotList(client)).success).toBe(true)
      expect(h.handshakes()).toHaveLength(2)
      expectProof(h.business()[0], h.issued.at(-1)!)
    }
  )
})

describe('xiaohongshu guest preparation through the client pipeline', () => {
  it.each(['web_session=logged-in', 'userId=viewer-1', 'a1=; web_session=logged-in; userId=viewer-1'])(
    'reports missing a1 without replacing explicit identity: %s',
    async (cookie) => {
      const h = transport()
      const result = await fetchHotList(h.client(cookie))
      expect(result).toMatchObject({ success: false, error: { kind: 'auth', code: 'COOKIE_MISSING', retryable: false } })
      if (!result.success) expect(result.error.message).toContain('a1')
      expect(h.requests).toHaveLength(0)
    }
  )

  it('rejects an incomplete per-call login cookie even when a guest is already cached', async () => {
    const h = transport()
    const client = h.client()
    expect((await fetchHotList(client)).success).toBe(true)
    const result = await fetchHotList(client, { headers: { COOKIE: 'web_session=logged-in' } })
    expect(result).toMatchObject({ success: false, error: { kind: 'auth', code: 'COOKIE_MISSING' } })
    expect(h.requests).toHaveLength(4)
  })

  it('keeps a complete explicit cookie and avoids guest initialization', async () => {
    const h = transport()
    const cookie = 'a1=1900000000abcdef0123456789abcdef; web_session=logged-in; userId=viewer-1'
    expect((await fetchHotList(h.client(cookie))).success).toBe(true)
    expect(h.requests).toHaveLength(1)
    expect(businessCookies(h)).toEqual([cookie])
  })

  it('coalesces concurrent handshakes and reuses the session across later calls', async () => {
    const h = transport()
    const client = h.client()
    const concurrent = await Promise.all([fetchHotList(client), fetchHotList(client)])
    expect(concurrent.map((result) => result.success)).toEqual([true, true])
    expect((await fetchHotList(client)).success).toBe(true)
    expect(h.handshakes()).toHaveLength(1)
    expect(h.requests).toHaveLength(6)
    expect(new Set(businessCookies(h)).size).toBe(1)
    expect(getCookieValue(businessCookies(h)[0], 'web_session')).toBe('guest-1')
  })

  it('coalesces static fetcher calls while keeping different adapters separate', async () => {
    const h = transport()
    const other = transport()
    const call = (adapter: AxiosAdapter) => xiaohongshuFetcher.fetchSearchHotList({}, '', { adapter })
    const concurrent = await Promise.all([call(h.adapter), call(h.adapter)])
    expect(concurrent.map((result) => result.success)).toEqual([true, true])
    expect((await call(h.adapter)).success).toBe(true)
    expect((await call(other.adapter)).success).toBe(true)
    expect(h.handshakes()).toHaveLength(1)
    expect(h.requests).toHaveLength(6)
    expect(other.handshakes()).toHaveLength(1)
  })

  it('isolates clients even when they have the same public clientId and adapter', async () => {
    const h = transport()
    const first = h.client()
    const second = h.client()
    expect((await fetchHotList(first)).success).toBe(true)
    expect((await fetchHotList(second)).success).toBe(true)
    expect(h.handshakes()).toHaveLength(2)
    expect(getCookieValue(businessCookies(h)[0], 'a1')).not.toBe(getCookieValue(businessCookies(h)[1], 'a1'))
  })

  it('separates UA, proxy and header values while reusing equivalent normalized config', async () => {
    const h = transport()
    const client = h.client()
    const first: RequestConfig = {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0)', 'X-Session-Scope': 'one' },
      proxy: { host: 'proxy.test', port: 8080, protocol: 'http' }
    }
    const equivalent: RequestConfig = {
      proxy: { protocol: 'http', port: 8080, host: 'proxy.test' },
      headers: { 'x-session-scope': 'one', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0)' }
    }
    const configs = [
      first,
      equivalent,
      { ...first, headers: { ...first.headers, 'User-Agent': 'Mozilla/5.0 (Macintosh)' } },
      { ...first, proxy: { host: 'other-proxy.test', port: 8080, protocol: 'http' } },
      { ...first, headers: { ...first.headers, 'X-Session-Scope': 'two' } }
    ]
    for (const config of configs) expect((await fetchHotList(client, config)).success).toBe(true)
    expect(h.handshakes()).toHaveLength(4)
    const cookies = businessCookies(h)
    expect(cookies[0]).toBe(cookies[1])
    expect(new Set(cookies).size).toBe(4)
  })

  it('isolates adapter and agent references without serializing agent internals', async () => {
    const h = transport()
    const other = transport()
    const client = h.client()
    const agent = new Agent()
    const anotherAgent = new Agent()
    expect((await fetchHotList(client, { httpAgent: agent })).success).toBe(true)
    expect((await fetchHotList(client, { httpAgent: agent })).success).toBe(true)
    expect((await fetchHotList(client, { httpAgent: anotherAgent })).success).toBe(true)
    expect((await fetchHotList(client, { httpAgent: agent, adapter: other.adapter })).success).toBe(true)
    expect(h.handshakes()).toHaveLength(2)
    expect(other.handshakes()).toHaveLength(1)
    agent.destroy()
    anotherAgent.destroy()
  })

  it('renews a cached guest session after five minutes', async () => {
    let now = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const h = transport()
    const client = h.client()
    expect((await fetchHotList(client)).success).toBe(true)
    now += 5 * 60 * 1000 - 1
    expect((await fetchHotList(client)).success).toBe(true)
    expect(h.handshakes()).toHaveLength(1)
    now += 1
    expect((await fetchHotList(client)).success).toBe(true)
    expect(h.handshakes()).toHaveLength(2)
    expect(getCookieValue(businessCookies(h)[2], 'web_session')).toBe('guest-2')
  })

  it('shares a failed inflight attempt but retries initialization on the next call', async () => {
    const h = transport()
    const client = h.client()
    h.failNextScripting()
    const failed = await Promise.all([fetchHotList(client), fetchHotList(client)])
    expect(failed.map((result) => result.success)).toEqual([false, false])
    expect(h.handshakes()).toHaveLength(1)
    expect(h.business()).toHaveLength(0)
    expect((await fetchHotList(client)).success).toBe(true)
    expect(h.handshakes()).toHaveLength(2)
    expect(h.requests).toHaveLength(5)
  })
})
