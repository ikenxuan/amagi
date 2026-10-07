import type { RequestSpec } from 'amagi/contracts/request'
import { HttpClient } from 'amagi/transport/client'
import type { AxiosAdapter } from 'axios'
import { expect, it } from 'vitest'

it('keeps RequestSpec metadata off the wire without deleting an extra field in the request body', async () => {
  const wire: Array<{ url: string | undefined; data: unknown; metadata: unknown }> = []
  const adapter: AxiosAdapter = async (config) => {
    wire.push({ url: config.url, data: config.data, metadata: Reflect.get(config, 'extra') })
    return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }
  }
  const spec: RequestSpec = {
    method: 'POST',
    url: 'https://example.test/metadata',
    body: { extra: { content: 'wire-value' } },
    extra: { context: 'internal-only' }
  }
  const client = new HttpClient({ requestConfig: { adapter } })
  expect((await client.send(spec)).body).toEqual({ ok: true })
  expect(wire).toEqual([{ url: 'https://example.test/metadata', data: '{"extra":{"content":"wire-value"}}', metadata: undefined }])
  expect(spec.extra).toEqual({ context: 'internal-only' })
  expect(spec.body).toEqual({ extra: { content: 'wire-value' } })
})
