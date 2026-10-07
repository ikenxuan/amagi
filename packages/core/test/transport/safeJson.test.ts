import type { RequestSpec } from 'amagi/contracts/request'
import { HttpClient } from 'amagi/transport/client'
import axios, { type AxiosAdapter, type AxiosRequestConfig } from 'axios'
import { describe, expect, it, vi } from 'vitest'

const rawResponse =
  (body: unknown): AxiosAdapter =>
  async (config) => ({
    data: body,
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config
  })

const request = async (body: unknown, config: AxiosRequestConfig = {}, responseType?: RequestSpec['responseType']) => {
  const client = new HttpClient({ requestConfig: { adapter: rawResponse(body), ...config } })
  return (await client.send({ method: 'GET', url: 'https://example.test/data', responseType })).body
}

describe('transport JSON integer precision', () => {
  it('preserves unsafe IDs in objects, arrays and top-level JSON values', async () => {
    expect(await request('{"room_id":570461472695232183,"ids":[9007199254740991,9007199254740992,-9007199254740992],"count":27}')).toEqual({
      room_id: '570461472695232183',
      ids: [9007199254740991, '9007199254740992', '-9007199254740992'],
      count: 27
    })
    expect(await request('570461472695232183')).toBe('570461472695232183')
  })

  it('keeps escaped string content, decimal and exponent numbers intact', async () => {
    const text = String.raw`{"text":"prefix:570461472695232183, [9007199254740992] \\\"","decimal":1.25,"exponent":1e20,"id":570461472695232183}`
    expect(await request(text)).toEqual({ ...JSON.parse(text), id: '570461472695232183' })
  })

  it('keeps explicit text responses unchanged', async () => {
    const text = '{"id":570461472695232183}'
    expect(await request(text, {}, 'text')).toBe(text)
    expect(await request(text, { responseType: 'text' })).toBe(text)
    expect(await request(text, { transitional: { forcedJSONParsing: false } })).toBe(text)
  })

  it('parses explicit JSON despite disabled automatic JSON parsing', async () => {
    expect(await request('{"id":570461472695232183}', { transitional: { forcedJSONParsing: false } }, 'json')).toEqual({
      id: '570461472695232183'
    })
  })

  it('passes through objects and binary bodies', async () => {
    const object = { id: '570461472695232183' }
    const binary = Buffer.from([0x01, 0x02, 0x03])
    expect(await request(object)).toBe(object)
    expect(await request(binary, {}, 'arraybuffer')).toBe(binary)
  })

  it.each(['', '<html>access denied</html>', '{invalid}', '{570461472695232183:1}'])(
    'preserves non-JSON responses for platform classification: %s',
    async (body) => {
      expect(await request(body)).toBe(body)
    }
  )

  it('preserves user-supplied transforms and per-call override precedence', async () => {
    const client = new HttpClient({
      requestConfig: {
        adapter: rawResponse('value'),
        transformResponse: [(data) => `base:${data}`]
      }
    })
    expect((await client.send({ method: 'GET', url: 'https://example.test/data' })).body).toBe('base:value')
    expect(
      (
        await client.send({ method: 'GET', url: 'https://example.test/data' }, 'initial', {
          transformResponse: [(data) => `call:${data}`]
        })
      ).body
    ).toBe('call:value')
  })

  it('preserves custom global Axios transforms without pre-parsing their raw input', async () => {
    const previous = axios.defaults.transformResponse
    try {
      axios.defaults.transformResponse = [(data) => ({ custom: data })]
      expect(await request('{"id":570461472695232183}')).toEqual({ custom: '{"id":570461472695232183}' })
      expect(await request('body', { transformResponse: [(data) => `instance:${data}`] })).toBe('instance:body')
    } finally {
      axios.defaults.transformResponse = previous
    }
  })

  it('preserves a global transform chain extended in place', async () => {
    const previous = axios.defaults.transformResponse
    if (!Array.isArray(previous)) throw new Error('Axios native defaults should be a transform array')
    previous.push((data) => ({ transformed: data }))
    try {
      expect(await request('{"count":1}')).toEqual({ transformed: { count: 1 } })
    } finally {
      previous.pop()
    }
  })

  it('respects an explicitly configured JSON reviver', async () => {
    expect(await request('{"count":1}', { parseReviver: (key, value) => (key === 'count' ? value + 1 : value) })).toEqual({ count: 2 })
  })
})

/** 按 Node 18 的双参数 JSON reviver 约定，运行一份全新加载的 transport 模块。 */
const withLegacyJson = async (configure: () => void, run: (Client: typeof HttpClient) => Promise<void>): Promise<void> => {
  const previousTransforms = axios.defaults.transformResponse
  const previousReviver = axios.defaults.parseReviver
  const nativeParse = JSON.parse
  vi.resetModules()
  const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text, reviver) =>
    nativeParse(
      text,
      reviver
        ? function (key, value) {
            return reviver.call(this, key, value)
          }
        : undefined
    )
  )
  try {
    configure()
    const { HttpClient: LegacyClient } = await import('amagi/transport/client')
    await run(LegacyClient)
  } finally {
    axios.defaults.transformResponse = previousTransforms
    axios.defaults.parseReviver = previousReviver
    parseSpy.mockRestore()
    vi.resetModules()
  }
}

const sendWith = async (Client: typeof HttpClient, body: string, config: AxiosRequestConfig = {}, perCall?: AxiosRequestConfig) => {
  const client = new Client({ requestConfig: { adapter: rawResponse(body), ...config } })
  return (await client.send({ method: 'GET', url: 'https://example.test/data' }, 'initial', perCall)).body
}

const sendLegacy = async (method: 'fetchData' | 'fetchResponse', body: unknown, config: AxiosRequestConfig = {}) => {
  const legacy = await import('amagi/transport/legacy')
  const requestConfig = { url: 'https://example.test/data', adapter: rawResponse(body), ...config }
  if (method === 'fetchData') return legacy.fetchData(requestConfig, 0)
  const response = await legacy.fetchResponse(requestConfig, 0)
  if (legacy.isNetworkErrorResult(response)) throw new Error('Legacy request failed')
  return response.data
}

describe.each(['fetchData', 'fetchResponse'] as const)('%s without JSON reviver source context', (method) => {
  it('preserves long integers and explicit response modes', async () => {
    await withLegacyJson(
      () => {},
      async () => {
        const text = '{"id":9007199254740993,"count":2}'
        expect(await sendLegacy(method, text)).toEqual({ id: '9007199254740993', count: 2 })
        expect(await sendLegacy(method, text, { responseType: 'text' })).toBe(text)
        expect(await sendLegacy(method, text, { transitional: { forcedJSONParsing: false } })).toBe(text)
        expect(await sendLegacy(method, text, { responseType: 'json', transitional: { forcedJSONParsing: false } })).toEqual({
          id: '9007199254740993',
          count: 2
        })
        expect(await sendLegacy(method, '<html>not JSON</html>')).toBe('<html>not JSON</html>')
        const binary = Buffer.from([1, 2, 3])
        expect(await sendLegacy(method, binary, { responseType: 'arraybuffer' })).toBe(binary)
      }
    )
  })

  it('preserves pre-import global transforms and caller overrides', async () => {
    await withLegacyJson(
      () => {
        axios.defaults.transformResponse = [(data) => ({ global: data })]
      },
      async () => {
        const text = '{"id":9007199254740993}'
        expect(await sendLegacy(method, text)).toEqual({ global: text })
        expect(await sendLegacy(method, text, { transformResponse: [(data) => ({ caller: data })] })).toEqual({ caller: text })
      }
    )
  })

  it('gives caller revivers precedence over the global reviver', async () => {
    await withLegacyJson(
      () => {
        axios.defaults.parseReviver = (key, value) => (key === 'count' ? value + 1 : value)
      },
      async () => {
        expect(await sendLegacy(method, '{"count":1}')).toEqual({ count: 2 })
        expect(await sendLegacy(method, '{"count":1}', { parseReviver: (key, value) => (key === 'count' ? value + 2 : value) })).toEqual({
          count: 3
        })
      }
    )
  })
})

describe('transport on runtimes without JSON reviver source context', () => {
  it('preserves integer precision with the normal Axios transform', async () => {
    await withLegacyJson(
      () => {},
      async (Client) => {
        expect(await sendWith(Client, '{"id":570461472695232183,"count":2}')).toEqual({ id: '570461472695232183', count: 2 })
      }
    )
  })

  it('preserves a global transform configured before importing transport', async () => {
    await withLegacyJson(
      () => {
        axios.defaults.transformResponse = [
          function transformResponse(data) {
            return { global: data }
          }
        ]
      },
      async (Client) => {
        expect(await sendWith(Client, '{"id":570461472695232183}')).toEqual({ global: '{"id":570461472695232183}' })
        expect(await sendWith(Client, 'body', { transformResponse: [(data) => `instance:${data}`] })).toBe('instance:body')
        expect(
          await sendWith(
            Client,
            'body',
            { transformResponse: [(data) => `instance:${data}`] },
            {
              transformResponse: [(data) => `call:${data}`]
            }
          )
        ).toBe('call:body')
      }
    )
  })

  it('preserves a global transform chain extended before importing transport', async () => {
    await withLegacyJson(
      () => {
        const original = axios.defaults.transformResponse
        axios.defaults.transformResponse = [...(Array.isArray(original) ? original : [original!]), (data) => ({ transformed: data })]
      },
      async (Client) => {
        expect(await sendWith(Client, '{"count":1}')).toEqual({ transformed: { count: 1 } })
      }
    )
  })

  it('keeps global, instance and per-call custom reviver precedence', async () => {
    await withLegacyJson(
      () => {
        axios.defaults.parseReviver = (key, value) => (key === 'count' ? value + 1 : value)
      },
      async (Client) => {
        expect(await sendWith(Client, '{"count":1}')).toEqual({ count: 2 })
        expect(
          await sendWith(Client, '{"count":1}', {
            parseReviver: (key, value) => (key === 'count' ? value + 2 : value)
          })
        ).toEqual({ count: 3 })
        expect(
          await sendWith(
            Client,
            '{"count":1}',
            {
              parseReviver: (key, value) => (key === 'count' ? value + 2 : value)
            },
            { parseReviver: (key, value) => (key === 'count' ? value + 3 : value) }
          )
        ).toEqual({ count: 4 })
      }
    )
  })
})
