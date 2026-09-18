import { createRequestModule } from 'amagi/client/request'
import { AmagiHeaders } from 'amagi/contracts/request'
import { isAxiosError } from 'axios'
import { describe, expect, it } from 'vitest'

import { makeRequestCtx } from '../helpers/request-ctx'

const URL_DOUYIN = 'https://www.douyin.com/aweme/v1/web/aweme/detail/'

/**
 * B站形状的 ctx：judge 认 code，用来测「业务失败 → 失败信封」。
 *
 * 只是把固定的响应体喂给共享助手 —— 自己手搓一份会漏掉它注入的
 * `sleep: async () => {}`（这些用例一旦变成可重试就真睡 1s+2s+4s），
 * 也会与助手漂移（签名器表、UA、userAgent 都得跟着改）。
 */
const makeBilibiliCtx = (body: unknown) =>
  makeRequestCtx('bilibili', 'SESSDATA=x', (spec) => ({
    status: 200,
    statusText: 'OK',
    headers: new AmagiHeaders(),
    body,
    durationMs: 1,
    url: spec.url
  }))

describe('信封轨', () => {
  it('成功时给 success 信封，data 是平台原始载荷', async () => {
    const { ctx } = makeRequestCtx('douyin', 'ttwid=abc')
    const r = await createRequestModule('douyin', ctx).get(URL_DOUYIN)

    expect(r.success).toBe(true)
    expect(r.data).toEqual({ status_code: 0, aweme_detail: { aweme_id: '1' } })
  })

  it('平台业务失败时给失败信封，不抛', async () => {
    const { ctx } = makeBilibiliCtx({ code: -101, message: '账号未登录' })
    const r = await createRequestModule('bilibili', ctx).get('https://api.bilibili.com/x/web-interface/view')

    expect(r.success).toBe(false)
    // 守卫是给类型检查看的：`expect()` 不收窄，而 `test:types` 把 test/ 整棵树都编
    // （上一行已经把「真成功」挡掉了，所以这里不会空跑）
    if (!r.success) expect(r.error.kind).toBe('auth')
  })

  it('签名器抛错也收口成信封，不裸抛', async () => {
    const { ctx } = makeRequestCtx('douyin', '')
    // 相对 URL 不满足 a_bogus 的「必须是绝对地址」前置条件
    const r = await createRequestModule('douyin', ctx).get('/aweme/v1/web/aweme/detail/')

    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.kind).toBe('internal')
    expect(r.meta.attempts).toBe(0)
  })
})

describe('axios 轨', () => {
  it('成功时 resolve AxiosResponse，data 是信封、status 是真实 HTTP 状态', async () => {
    const { ctx } = makeRequestCtx('douyin', 'ttwid=abc')
    const res = await createRequestModule('douyin', ctx).axios.get(URL_DOUYIN)

    expect(res.status).toBe(200)
    expect(res.data.success).toBe(true)
  })

  it('失败时 reject AxiosError，err.response.data 是信封', async () => {
    const { ctx } = makeBilibiliCtx({ code: -101, message: '账号未登录' })
    const request = createRequestModule('bilibili', ctx)

    await expect(request.axios.get('https://api.bilibili.com/x/web-interface/view')).rejects.toSatisfy(
      (e: unknown) => isAxiosError(e) && e.response?.data?.success === false && e.response.data.error.kind === 'auth'
    )
  })

  it('没拿到响应时 err.response 是 undefined', async () => {
    const { ctx } = makeRequestCtx('douyin', '')
    const request = createRequestModule('douyin', ctx)

    await expect(request.axios.get('/aweme/v1/web/aweme/detail/')).rejects.toSatisfy(
      (e: unknown) => isAxiosError(e) && e.response === undefined
    )
  })
})

describe('自定义面', () => {
  it('请求拦截器两条轨都跑，且改的头真的到达请求', async () => {
    const { ctx, calls } = makeRequestCtx('douyin', '')
    const request = createRequestModule('douyin', ctx)
    request.interceptors.request.use((config) => {
      config.headers.set('x-probe', '1')
      return config
    })

    await request.get(URL_DOUYIN)
    await request.axios.get(URL_DOUYIN)

    expect(calls).toHaveLength(2)
    // 拦截器改的头经 toRequestConfig 落进 requestConfig.headers，
    // 不在 spec.headers 上 —— 所以要断言 send 的第三参
    expect(calls[0]?.headers).toMatchObject({ 'x-probe': '1' })
    expect(calls[1]?.headers).toMatchObject({ 'x-probe': '1' })
  })

  it('request.create 继承默认值', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', '')
    const derived = createRequestModule('douyin', ctx).create({ amagi: { sign: false } })

    await derived.get(URL_DOUYIN)

    expect(sent[0].url).not.toContain('a_bogus')
  })

  it('create 的 amagi 默认值不会被单次 amagi 整对象冲掉', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', 'ttwid=abc')
    const derived = createRequestModule('douyin', ctx).create({ amagi: { cookie: false } })

    await derived.get(URL_DOUYIN, { amagi: { sign: false } }).catch(() => undefined)

    expect(sent[0].dropHeaders).toEqual(['cookie'])
  })

  it('paramsSerializer 被尊重', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', '')
    const request = createRequestModule('douyin', ctx)

    // 不吞异常：签名与判定在这条 URL 上都会走成功路径，抛了就是真有 bug
    await request.get(URL_DOUYIN, {
      params: { a: '1', b: '2' },
      paramsSerializer: {
        serialize: (p) =>
          Object.entries(p as Record<string, string>)
            .map(([k, v]) => `${k}:${v}`)
            .join('|')
      }
    })

    expect(sent[0].url).toContain('a:1|b:2')
  })
})

describe('动词的实参落点', () => {
  it('post 的请求体来自 config.data，不是整份 config', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', '')
    const request = createRequestModule('douyin', ctx)

    await request.post(URL_DOUYIN, { data: { a: 1 }, amagi: { sign: false } })

    // axios 自己的 post 是 `(url, data, config)`：config 直接当第二参会被当成**请求体**，
    // 于是整个 config（含 amagi 选项）发给平台，而 amagi 自己也静默失效
    expect(sent[0].body).toEqual({ a: 1 })
    expect(sent[0].url).not.toContain('a_bogus')
  })

  it('post 的 config 其它键没被 body 位吞掉', async () => {
    const { ctx, calls } = makeRequestCtx('douyin', '')
    const request = createRequestModule('douyin', ctx)

    await request.post(URL_DOUYIN, { data: { a: 1 }, timeout: 8000 })

    expect(calls[0]?.timeout).toBe(8000)
  })

  it('put 同样把请求体落在 data 位', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', '')
    const request = createRequestModule('douyin', ctx)

    await request.put(URL_DOUYIN, { data: { b: 2 }, amagi: { sign: false } })

    expect(sent[0].method).toBe('PUT')
    expect(sent[0].body).toEqual({ b: 2 })
  })

  it('get 的 (url, config) 形态不变（回归保护）', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', '')
    const request = createRequestModule('douyin', ctx)

    await request.get(URL_DOUYIN, { params: { aweme_id: '7' }, amagi: { sign: false } })

    expect(sent[0].url).toContain('aweme_id=7')
    expect(sent[0].body).toBeUndefined()
  })
})

/**
 * 抖音档案（`profile.ts`）的重试三件套在**组合起来**之后确实生效：
 * `retryOn: ['ANTIBOT_PAGE']` 让它重发，`retryFresh: true` + `refresh` 让重发的那次
 * 换掉 URL 里已有的 `msToken`。`refreshDouyinMsToken` 单独有单测，但「配上了没有」
 * 只有在真跑一遍管线时才会暴露 —— 档案里的一个键写错就是静默不重试。
 */
describe('抖音档案的重试接线', () => {
  // 184 是作品详情接口真实的 msToken 长度：`refresh` 保持长度不变（长度本身是
  // 参数的一部分），这里用来断言「换过、但没改长度」
  const MS_TOKEN = 'A'.repeat(184)

  it('Argus 拦截后重发，且 retryFresh 把 URL 里的 msToken 换掉（长度不变）', async () => {
    let attempt = 0
    const { ctx, sent } = makeRequestCtx('douyin', 'ttwid=abc', (spec) => ({
      status: 200,
      statusText: 'OK',
      headers: new AmagiHeaders(),
      // 第一次是 Argus 拦截（纯文本，judge 判 ANTIBOT_PAGE 且标了 retryable），之后正常
      body: attempt++ === 0 ? 'Blocked by ArgusSecurityPlugin Uifid Not Found' : { status_code: 0, aweme_detail: { aweme_id: '1' } },
      durationMs: 1,
      url: spec.url
    }))

    const r = await createRequestModule('douyin', ctx).get(`${URL_DOUYIN}?msToken=${MS_TOKEN}`)

    // 重试真的发生了（不是「重试逻辑看起来对」）：发出去的请求不止一次，最后成功
    expect(r.success).toBe(true)
    expect(sent.length).toBeGreaterThan(1)

    const msTokenOf = (url: string): string => new URL(url).searchParams.get('msToken') ?? ''
    // 第一次发的还是调用方给的那个 token
    expect(msTokenOf(sent[0].url)).toBe(MS_TOKEN)
    // 第二次换了值 —— 重放同一个 token 组 Argus 必然再拦一次，换了才有意义
    expect(msTokenOf(sent[1].url)).not.toBe(MS_TOKEN)
    // 长度保持原样：长度本身就是参数的一部分
    expect(msTokenOf(sent[1].url)).toHaveLength(MS_TOKEN.length)
  })
})
