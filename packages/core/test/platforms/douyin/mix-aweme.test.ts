import { createFetcherFromRegistry, type ClientCtx } from 'amagi/client/fetcher'
import { douyinRegistry } from 'amagi/platforms/douyin/endpoints'
import { HttpClient } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
import type { AxiosAdapter } from 'axios'
import { describe, expect, it } from 'vitest'

const setup = () => {
  const requests: URL[] = []
  const adapter: AxiosAdapter = async (config) => {
    const url = new URL(config.url!)
    requests.push(url)
    const cursor = Number(url.searchParams.get('cursor'))
    const count = Number(url.searchParams.get('count'))
    const length = Math.min(count, 26 - cursor)
    return {
      data: {
        status_code: 0,
        cursor: cursor + length,
        has_more: cursor + length < 26 ? 1 : 0,
        aweme_list: Array.from({ length }, (_, i) => ({ aweme_id: String(cursor + i + 1) }))
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    }
  }
  const trace = new TraceCollector()
  const http = new HttpClient({ trace, requestConfig: { adapter } })
  const ctx: ClientCtx = {
    clientId: 'mix-test',
    platform: 'douyin',
    cookie: '',
    userAgent: 'test',
    requestConfig: {},
    trace,
    signers: { 'a-bogus': (spec) => spec },
    send: (spec, reason) => http.send(spec, reason)
  }
  return { fetcher: createFetcherFromRegistry('douyin', douyinRegistry, ctx), requests }
}

describe('douyin mixAweme', () => {
  it('lists a full collection using the upstream cursor and page size cap', async () => {
    const { fetcher, requests } = setup()
    const result = await fetcher.fetchMixAweme({ mix_id: 'mix-1', number: 26 })
    expect(result.success).toBe(true)
    expect(requests.map((url) => url.pathname)).toEqual(['/aweme/v1/web/mix/aweme/', '/aweme/v1/web/mix/aweme/'])
    expect(requests.map((url) => url.searchParams.get('mix_id'))).toEqual(['mix-1', 'mix-1'])
    expect(requests.map((url) => url.searchParams.get('cursor'))).toEqual(['0', '20'])
    expect(requests.map((url) => url.searchParams.get('count'))).toEqual(['20', '6'])
    if (result.success) {
      expect(result.data.aweme_list).toHaveLength(26)
      expect(result.data.aweme_list[25]).toEqual({ aweme_id: '26' })
      expect(result.data.cursor).toBe(26)
      expect(result.data.has_more).toBe(0)
    }
  })

  it('resumes from a supplied cursor and defaults to one page', async () => {
    const { fetcher, requests } = setup()
    // `cursor` 是内部参数（声明了 paginate 的端点由端点接管游标），经变量传入以避开字面量的多余属性检查
    const params = { mix_id: 'mix-1', cursor: 20 }
    const result = await fetcher.fetchMixAweme(params)
    expect(result.success).toBe(true)
    expect(requests).toHaveLength(1)
    expect(requests[0].searchParams.get('cursor')).toBe('20')
    if (result.success) expect(result.data.aweme_list).toHaveLength(6)
  })

  it.each([{ mix_id: '' }, { mix_id: 'm', cursor: -1 }, { mix_id: 'm', number: 0 }])(
    'rejects invalid params before sending: %j',
    async (params) => {
      const { fetcher, requests } = setup()
      const result = await fetcher.fetchMixAweme(params)
      expect(result.success).toBe(false)
      expect(requests).toHaveLength(0)
    }
  )
})
