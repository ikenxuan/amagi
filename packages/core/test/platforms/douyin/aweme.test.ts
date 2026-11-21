import { createClient } from 'amagi/client/createClient'
import { AmagiHeaders } from 'amagi/contracts/request'
import { awemeJudge } from 'amagi/platforms/douyin/app/judge'
import { TransportError } from 'amagi/transport/client'
import type { AxiosAdapter } from 'axios'
import express from 'express'
import { afterEach, describe, expect, it } from 'vitest'

import { createDouyinAppSessionSnapshot, signedAppResponse } from '../../helpers/douyin-app-session'
import { closeAllServers, listenOnRandomPort } from '../../helpers/listen'

afterEach(closeAllServers)

const signerBaseUrl = 'http://127.0.0.1:8793'
const signerEndpoint = signerBaseUrl + '/v1/app/sign'

describe('douyin.fetcher.aweme App 接口', () => {
  it('搜索将实际表单和 Content-Type 一起交给 App 签名服务', async () => {
    let signing: Record<string, any> = {}
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === signerEndpoint) signing = JSON.parse(config.data)
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data:
          config.url === signerEndpoint
            ? signedAppResponse(config.data, { 'X-Khan': 'signed' })
            : { status_code: 0, data: [], cursor: 0, has_more: 0 }
      }
    }
    const result = await createClient({
      douyin: { app: { signerBaseUrl, session: createDouyinAppSessionSnapshot() } },
      request: { adapter }
    }).douyin.app.search({
      query: '风景'
    })
    expect(result.success).toBe(true)
    expect(signing.headers).toMatchObject({ 'Content-Type': 'application/x-www-form-urlencoded' })
    const form = new URLSearchParams(signing.body)
    expect(form.get('keyword')).toBe('风景')
    expect(form.get('token')).toBe('search')
    expect(form.get('search_scene')).toBe('douyin_search')
    expect(form.get('vlm_config')).toBe('1')
  })

  it('合集从第零集向后获取，每页使用上游返回的集数游标', async () => {
    const signedQueries: URLSearchParams[] = []
    let page = 0
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === signerEndpoint) {
        const body = JSON.parse(config.data)
        signedQueries.push(new URL(body.url).searchParams)
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: signedAppResponse(config.data, { 'X-Khan': 'signed' })
        }
      }
      page += 1
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: {
          status_code: 0,
          aweme_list: page === 1 ? Array.from({ length: 20 }, (_, index) => ({ aweme_id: String(index + 1) })) : [{ aweme_id: '21' }],
          cursor: page === 1 ? 25 : 29,
          min_cursor: page === 1 ? 0 : 25,
          has_more: page === 1 ? 1 : 0
        }
      }
    }
    const result = await createClient({
      douyin: { app: { signerBaseUrl, session: createDouyinAppSessionSnapshot() } },
      request: { adapter }
    }).douyin.app.mixWorks({
      mix_id: '7628535323965786138',
      number: 21
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.aweme_list).toHaveLength(21)
    expect(signedQueries.map((query) => query.get('cursor'))).toEqual(['0', '25'])
    for (const query of signedQueries) {
      expect(query.get('pull_type')).toBe('2')
      expect(query.get('skip_local_cache')).toBe('false')
      expect(query.get('req_from')).toBe('app')
    }
  })

  it.each([
    ['null', { aweme_list: null, has_more: 0, status_code: 0 }, false],
    ['缺失', { has_more: 0, status_code: 0 }, false],
    ['空数组', { aweme_list: [], has_more: 0, status_code: 0 }, true]
  ] as const)('合集列表为%s时，不把缺失的数据伪装成成功空列表', async (_label, data, success) => {
    const adapter: AxiosAdapter = async (config) => ({
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      data: config.url === signerEndpoint ? signedAppResponse(config.data, { 'X-Khan': 'signed' }) : data
    })
    const result = await createClient({
      douyin: { app: { signerBaseUrl, session: createDouyinAppSessionSnapshot() } },
      request: { adapter }
    }).douyin.app.mixWorks({
      mix_id: '1'
    })
    expect(result.success).toBe(success)
    if (result.success) expect(result.data.aweme_list).toEqual([])
    else expect(result.error.code).toBe('EMPTY_RESPONSE')
  })

  it.each(['http', 'invalid', 'timeout'] as const)('第二页签名 %s 失败时保留第一页，并标记结果不完整', async (failure) => {
    let signatures = 0
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === signerEndpoint) {
        signatures += 1
        if (signatures > 1 && failure === 'timeout')
          throw new TransportError({ kind: 'timeout', code: 'TIMEOUT', message: '签名请求超时', url: signerEndpoint, attempts: 1 })
        return {
          status: signatures === 1 ? 200 : 503,
          statusText: 'signer',
          headers: {},
          config,
          ...(signatures > 1 && failure === 'invalid' ? { status: 200 } : {}),
          data: signatures === 1 ? signedAppResponse(config.data, { 'X-Khan': 'signed' }) : { error: 'unavailable' }
        }
      }
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: { status_code: 0, comments: Array.from({ length: 20 }, (_, i) => ({ cid: String(i) })), cursor: 20, has_more: 1 }
      }
    }
    const result = await createClient({
      douyin: { app: { signerBaseUrl, session: createDouyinAppSessionSnapshot() } },
      request: { adapter }
    }).douyin.app.comments({
      aweme_id: '1',
      number: 21
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.comments).toHaveLength(20)
    expect(result.meta.incomplete?.code).toBe(
      failure === 'timeout' ? 'TIMEOUT' : failure === 'invalid' ? 'APP_SIGNER_INVALID_RESPONSE' : 'APP_SIGNER_ERROR'
    )
  })
  it('空响应体的验证码头优先于解析错误', () => {
    const result = awemeJudge('', { status: 200, headers: new AmagiHeaders({ 'bdturing-verify': '{"subtype":"slide"}' }) })
    expect(result.code).toBe('CAPTCHA_REQUIRED')
  })

  it('相邻页全部重复时继续翻页，以唯一评论数判断目标', async () => {
    let page = 0
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === signerEndpoint) {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: {
            ok: true,
            signObject: signedAppResponse(config.data, { 'X-Khan': 'signed' }).signObject
          }
        }
      }
      page += 1
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: {
          status_code: 0,
          comments: page === 1 ? Array.from({ length: 20 }, (_, i) => ({ cid: String(i) })) : [{ cid: page === 2 ? '19' : '20' }],
          cursor: page * 20,
          has_more: page < 3 ? 1 : 0
        }
      }
    }
    const result = await createClient({
      douyin: { app: { signerBaseUrl, session: createDouyinAppSessionSnapshot() } },
      request: { adapter }
    }).douyin.app.comments({
      aweme_id: '1',
      number: 21
    })
    expect(result.success).toBe(true)
    expect(page).toBe(3)
    if (result.success) expect(result.data.comments).toHaveLength(21)
  })
  it('默认不配置签名地址，调用正常 resolve 失败信封且不出网', async () => {
    const requests: string[] = []
    const adapter: AxiosAdapter = async (config) => {
      requests.push(config.url ?? '')
      throw new Error('未配置签名服务时不应出网')
    }
    const client = createClient({ request: { adapter } })
    const result = await client.douyin.app.comments({ aweme_id: '1' })
    expect(result.success).toBe(false)
    expect(result.error).toMatchObject({ code: 'APP_SIGNER_NOT_CONFIGURED', retryable: false })
    expect(result.message).toContain('douyin.app.signerBaseUrl')
    expect(result.meta.attempts).toBe(0)
    expect(requests).toEqual([])
  })

  it('先获取签名，再原样发送最终 URL 与 App 请求头，不混入 Web 身份', async () => {
    const requests: Array<{ url: string; headers: Record<string, unknown>; data: unknown }> = []
    let signing: Record<string, any> = {}
    const adapter: AxiosAdapter = async (config) => {
      const headers = Object.fromEntries(Object.entries(config.headers).map(([key, value]) => [key.toLowerCase(), value]))
      requests.push({ url: config.url ?? '', headers, data: config.data })
      if (config.url === signerEndpoint) {
        signing = JSON.parse(String(config.data))
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: signedAppResponse(config.data, { 'X-Khan': 'signed' })
        }
      }
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: { status_code: 0, comments: [{ cid: 'c1' }, { cid: 'c2' }], cursor: 2, has_more: 0 }
      }
    }
    const session = createDouyinAppSessionSnapshot()
    const client = createClient({
      douyin: { web: { cookie: 'sessionid=WEB_ONLY' }, app: { signerBaseUrl, session } },
      request: {
        adapter,
        headers: { Cookie: 'sessionid=WEB_OVERRIDE', Referer: 'https://www.douyin.com/', 'sec-ch-ua': 'WebBrowser' },
        params: { must_not_append: '1' }
      },
      debug: true
    })
    const result = await client.douyin.app.comments({ aweme_id: '1', number: 2 })
    expect(result.success).toBe(true)
    expect(requests.map((x) => x.url)).toEqual([signerEndpoint, signing.url])
    expect(signing).toMatchObject({
      method: 'GET',
      identity: { device_id: '123456789', install_id: '987654321' },
      headers: { Cookie: 'ttwid=visitor' }
    })
    expect(new URL(signing.url).searchParams.get('aweme_id')).toBe('1')
    expect(new URL(signing.url).searchParams.get('count')).toBe('2')
    expect(new URL(signing.url).searchParams.get('device_id')).toBe('123456789')
    expect(requests[0].headers.cookie).toBeUndefined()
    expect(requests[1].headers).toMatchObject({ 'user-agent': signing.headers['User-Agent'], 'x-khan': 'signed', cookie: 'ttwid=visitor' })
    expect(requests[1].headers.cookie).not.toContain('sessionid=WEB_ONLY')
    for (const name of ['referer', 'sec-ch-ua']) expect(requests[1].headers[name]).toBeUndefined()
    expect(result.meta.attempts).toBe(2)
    expect(result.meta.trace?.map((x) => x.reason)).toEqual(['prepare', 'initial'])
  })

  it('平台登录错误仍按业务失败返回', async () => {
    const adapter: AxiosAdapter = async (config) => ({
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      data:
        config.url === signerEndpoint
          ? signedAppResponse(config.data, { 'X-Khan': 'signed' })
          : { status_code: 8, status_msg: '用户未登录' }
    })
    const result = await createClient({
      douyin: { app: { signerBaseUrl, session: createDouyinAppSessionSnapshot() } },
      request: { adapter }
    }).douyin.app.userRecommendations({
      sec_uid: 'public-user'
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatchObject({ code: 'LOGIN_REQUIRED', platform: { code: 8, message: '用户未登录' } })
  })

  it('HTTP 未配置签名地址时返回 HTTP 200 和明确错误', async () => {
    const client = createClient()
    const app = client.startServer(0, { listen: () => {} })
    const { base } = await listenOnRandomPort(app as express.Application)
    const response = await fetch(`${base}/api/douyin/app_fetch_work_comments?aweme_id=1`)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: false, error: { code: 'APP_SIGNER_NOT_CONFIGURED' } })
  })

  it('每页按服务端 cursor 重新签名，合并时按评论 ID 去重', async () => {
    const signed: Array<{ url: string; headers: Record<string, string> }> = []
    let page = 0
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === signerEndpoint) {
        const body = JSON.parse(config.data)
        signed.push(body)
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: {
            ok: true,
            signObject: {
              url: body.url,
              method: body.method,
              headers: { ...body.headers, 'X-Khan': 'page-' + signed.length }
            }
          }
        }
      }
      page += 1
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: {
          status_code: 0,
          comments: page === 1 ? [{ cid: 'a' }, { cid: 'b' }] : [{ cid: 'b' }, { cid: 'c' }],
          cursor: page === 1 ? 37 : 92,
          has_more: page === 1 ? 1 : 0
        }
      }
    }
    const result = await createClient({
      douyin: { app: { signerBaseUrl, session: createDouyinAppSessionSnapshot() } },
      request: { adapter }
    }).douyin.app.comments({
      aweme_id: '1',
      number: 4
    })
    expect(result.success).toBe(true)
    expect(signed).toHaveLength(2)
    expect(new URL(signed[1].url).searchParams.get('cursor')).toBe('37')
    expect(signed[0].headers.Cookie).toBe('ttwid=visitor')
    if (result.success) expect(result.data.comments.map((x: { cid: string }) => x.cid)).toEqual(['a', 'b', 'c'])
    expect(result.meta.attempts).toBe(4)
  })

  it.each([
    [503, { error: 'identity_not_ready' }, 'APP_SIGNER_ERROR'],
    [200, { ok: false, error: 'sign_failed' }, 'APP_SIGNER_INVALID_RESPONSE'],
    [200, { ok: true, headers: {} }, 'APP_SIGNER_INVALID_RESPONSE'],
    [200, { ok: true, signObject: { url: 'https://other.example/steal', method: 'GET', headers: {} } }, 'APP_SIGNER_INVALID_RESPONSE']
  ] as const)('签名服务 HTTP %s / 无效响应不会继续请求抖音', async (status, data, code) => {
    const requests: string[] = []
    const adapter: AxiosAdapter = async (config) => {
      requests.push(config.url ?? '')
      return { status, statusText: 'signer', headers: {}, config, data }
    }
    const result = await createClient({
      douyin: { app: { signerBaseUrl, session: createDouyinAppSessionSnapshot() } },
      request: { adapter }
    }).douyin.app.work({
      aweme_id: '1'
    })
    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(code)
    expect(requests).toEqual([signerEndpoint])
  })

  it('用户资料只对外接收 sec_uid，游客 Cookie 交给签名服务', async () => {
    let payload: Record<string, unknown> = {}
    const adapter: AxiosAdapter = async (config) => {
      if (config.url === signerEndpoint) {
        payload = JSON.parse(config.data)
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: signedAppResponse(config.data, { 'X-Khan': 'signed' })
        }
      }
      expect(config.headers.get('Cookie')).toBe('ttwid=visitor')
      return { status: 200, statusText: 'OK', headers: {}, config, data: { status_code: 0, user: { uid: 'u1' } } }
    }
    const result = await createClient({
      douyin: { app: { signerBaseUrl, session: createDouyinAppSessionSnapshot() } },
      request: { adapter }
    }).douyin.app.userProfile({
      sec_uid: 's1'
    })
    expect(result.success).toBe(true)
    expect(payload.headers).toMatchObject({ Cookie: 'ttwid=visitor' })
    expect(new URL(String(payload.url)).searchParams.get('sec_user_id')).toBe('s1')
  })

  it('搜索风控即使 status_code=0 也返回失败，保留实际原因', async () => {
    const adapter: AxiosAdapter = async (config) => ({
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      data:
        config.url === signerEndpoint
          ? signedAppResponse(config.data, { 'X-Khan': 'signed' })
          : { status_code: 0, data: [], search_nil_info: { search_nil_type: 'antispam_check', search_nil_item: 'hit_whale' } }
    })
    const result = await createClient({
      douyin: { app: { signerBaseUrl, session: createDouyinAppSessionSnapshot() } },
      request: { adapter }
    }).douyin.app.search({
      query: '风景'
    })
    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('RISK_CONTROL')
  })
})
