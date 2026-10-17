import { createKuaishouRoutes } from 'amagi/platforms/kuaishou/routes'
import axios, { type AxiosAdapter } from 'axios'
import express from 'express'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeAllServers, listenOnRandomPort } from '../helpers/listen'

const originalAdapter = axios.defaults.adapter
beforeEach(() => {
  axios.defaults.adapter = async () => {
    throw new Error('Upstream request did not use the injected adapter')
  }
})
afterEach(async () => {
  axios.defaults.adapter = originalAdapter
  await closeAllServers()
})

const serve = async (response: unknown) => {
  const requests: Array<{ method: string | undefined; pathname: string; data: unknown }> = []
  const adapter: AxiosAdapter = async (config) => {
    requests.push({ method: config.method, pathname: new URL(config.url!).pathname, data: config.data })
    return { data: response, status: 200, statusText: 'OK', headers: {}, config }
  }
  const app = express()
  app.use('/api/kuaishou', createKuaishouRoutes('', { adapter }))
  const { base } = await listenOnRandomPort(app)
  return { base, requests }
}

describe('Kuaishou PC REST routes use the injected transport over localhost HTTP', () => {
  it.each([
    {
      route: '/fetch_search_user?keyword=fixture&number=1',
      endpoint: 'kuaishou.searchUser',
      upstream: '/rest/v/search/user',
      method: 'post',
      requestBody: { keyword: 'fixture', pcursor: '', searchSessionId: '' },
      response: '{"result":1,"users":[{"user_id":9007199254740993}],"pcursor":"no_more"}',
      data: { result: 1, users: [{ user_id: '9007199254740993' }], pcursor: 'no_more' }
    },
    {
      route: '/fetch_search_work_list?keyword=fixture&number=1',
      endpoint: 'kuaishou.searchWorkList',
      upstream: '/rest/v/search/feed',
      method: 'post',
      requestBody: { keyword: 'fixture', page: 'search', webPageArea: '', pcursor: '' },
      response: '{"result":1,"feeds":[{"photo":{"id":"fixture-work"}}],"pcursor":"no_more"}',
      data: { result: 1, feeds: [{ photo: { id: 'fixture-work' } }], pcursor: 'no_more' }
    },
    {
      route: '/fetch_login_user_profile',
      endpoint: 'kuaishou.loginUserProfile',
      upstream: '/rest/v/profile/get',
      method: 'get',
      requestBody: undefined,
      response: '{"result":1,"eid":"fixture-user","userId":123}',
      data: { result: 1, eid: 'fixture-user', userId: 123 }
    }
  ])('$endpoint forwards the upstream result through the HTTP envelope', async (fixture) => {
    const { base, requests } = await serve(fixture.response)
    const path = `/api/kuaishou${fixture.route}`
    const response = await fetch(base + path)
    const envelope = await response.json()

    expect(response.status).toBe(200)
    expect(envelope).toMatchObject({
      success: true,
      data: fixture.data,
      meta: { endpoint: fixture.endpoint },
      requestPath: path
    })
    expect(requests).toHaveLength(1)
    expect(requests[0]?.method).toBe(fixture.method)
    expect(requests[0]?.pathname).toBe(fixture.upstream)
    expect(requests[0]?.data).toBe(fixture.requestBody === undefined ? undefined : JSON.stringify(fixture.requestBody))
  })

  it.each(['/fetch_search_user', '/fetch_search_work_list?keyword=fixture&number=0'])(
    '%s rejects invalid parameters without sending upstream',
    async (route) => {
      const { base, requests } = await serve({ result: 1 })
      const response = await fetch(`${base}/api/kuaishou${route}`)
      expect(await response.json()).toMatchObject({ success: false, error: { kind: 'validation', code: 'PARAM_INVALID' } })
      expect(requests).toHaveLength(0)
    }
  )

  it('does not convert an upstream login rejection into a successful profile', async () => {
    const { base, requests } = await serve({ result: 109 })
    const response = await fetch(`${base}/api/kuaishou/fetch_login_user_profile`)
    expect(await response.json()).toMatchObject({
      success: false,
      error: { platform: { code: 109 } },
      meta: { endpoint: 'kuaishou.loginUserProfile' }
    })
    expect(requests).toHaveLength(1)
  })
})
