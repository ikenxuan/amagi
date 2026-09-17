import { createAmagiAdapter, makeRequestDef, NOT_FORWARDED_KEYS } from 'amagi/client/request/adapter'
import { AmagiHeaders } from 'amagi/contracts/request'
import axios from 'axios'
import { describe, expect, it } from 'vitest'

import { makeRequestCtx } from '../helpers/request-ctx'

const DETAIL = 'https://www.douyin.com/aweme/v1/web/aweme/detail/'

/** 造一个挂了 adapter 的真 axios 实例 */
const makeInstance = (ctx: Parameters<typeof createAmagiAdapter>[1], amagi = {}) => {
  const holder: { instance?: ReturnType<typeof axios.create> } = {}
  const instance = axios.create({
    adapter: createAmagiAdapter('douyin', ctx, () => holder.instance!, amagi),
    transformRequest: [(data: unknown) => data],
    transformResponse: [(data: unknown) => data]
  })
  holder.instance = instance
  return instance
}

/**
 * 读 per-call 请求配置里的某个 header（大小写不敏感）。
 *
 * 调用方塞给 axios 的头走的是 `requestConfig.headers`，不在 `spec.headers` 上，
 * 所以要断言它们到没到、有没有被改，都得看这个。
 * @param calls - 助手记录下来的 per-call 配置
 * @param name - header 名，任意大小写
 * @returns 头值；没设过则 `undefined`
 */
const sentHeader = (calls: unknown[], name: string): string | undefined => {
  const perCall = (calls[0] ?? {}) as { headers?: Record<string, string> }
  return new AmagiHeaders(perCall.headers).get(name)
}

describe('adapter 交给管线的请求描述', () => {
  it('params 进 URL 且不重复出现（序列化只发生一次）', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', 'ttwid=abc')

    await makeInstance(ctx).get(DETAIL, { params: { aweme_id: '7' } })

    expect(sent).toHaveLength(1)
    expect(sent[0].url).toContain('aweme_id=7')
    expect(sent[0].url.match(/aweme_id/g)).toHaveLength(1)
    expect(sent[0].url).toContain('a_bogus=')
  })

  it('baseURL 与 params 都只拼一次', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', '')
    const holder: { instance?: ReturnType<typeof axios.create> } = {}
    const instance = axios.create({
      baseURL: 'https://www.douyin.com',
      adapter: createAmagiAdapter('douyin', ctx, () => holder.instance!, {})
    })
    holder.instance = instance

    await instance.get('/aweme/v1/web/aweme/detail/', { params: { aweme_id: '7' } })

    expect(sent[0].url.match(/www\.douyin\.com/g)).toHaveLength(1)
    expect(sent[0].url.match(/aweme_id/g)).toHaveLength(1)
  })

  it('绑定的 ck 自动带上', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', 'ttwid=abc')

    await makeInstance(ctx).get(DETAIL)

    expect(sent[0].headers).toMatchObject({ Cookie: 'ttwid=abc' })
  })

  it('amagi.cookie: false 转成 dropHeaders 交给管线（真删头在 transport，那里已有覆盖）', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', 'ttwid=abc')

    await makeInstance(ctx, { cookie: false }).get(DETAIL, { headers: { Cookie: 'other=1' } })

    // 本模块的职责是**填对** dropHeaders —— 真正的删头发生在
    // transport/client.ts 的 buildAxiosConfig（在所有 header 合并之后），
    // 手搓 ctx 的用例够不到那一层，那是 transport 自己的覆盖范围
    expect(sent[0].dropHeaders).toEqual(['cookie'])
  })

  it('不给 cookie 开关时 dropHeaders 是空数组', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', 'ttwid=abc')

    await makeInstance(ctx).get(DETAIL)

    expect(sent[0].dropHeaders).toEqual([])
  })

  it('amagi.sign === false 时不签名', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', '')

    await makeInstance(ctx, { sign: false }).get(DETAIL)

    expect(sent[0].url).not.toContain('a_bogus')
  })

  it('amagi.signPath 原样进 spec', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', '')

    await makeInstance(ctx, { signPath: '/api/sns/web/v1/feed' }).get(DETAIL)

    expect(sent[0].signPath).toBe('/api/sns/web/v1/feed')
  })

  it('body 保持对象形态（不能被外层 axios 提前 JSON 化）', async () => {
    const { ctx, sent } = makeRequestCtx('douyin', '')

    await makeInstance(ctx).post(DETAIL, { a: 1 })

    expect(typeof sent[0].body).toBe('object')
    expect(sent[0].body).toEqual({ a: 1 })
  })

  it('axios 的键原样到达 transport（per-call 请求配置，不在 spec.headers 上）', async () => {
    const { ctx, calls } = makeRequestCtx('douyin', '')

    await makeInstance(ctx).get(DETAIL, { timeout: 8000 })

    expect(calls[0]?.timeout).toBe(8000)
  })

  it('对象体的 POST 不把 axios 注入的表单 CT 带下去，让平台基线说了算', async () => {
    const { ctx, calls } = makeRequestCtx('douyin', '')

    await makeInstance(ctx).post(DETAIL, { a: 1 })

    // 外层 axios 的 `dispatchRequest` 对 POST / PUT / PATCH 会补
    // `application/x-www-form-urlencoded`（body 非字符串时它就是唯一的值），
    // 漏下去会盖掉快手 / 小红书的平台基线
    expect(sentHeader(calls, 'content-type')).toBeUndefined()
  })

  it('调用方显式给的 CT 原样保留（删的只有 axios 那个注入值）', async () => {
    const { ctx, calls } = makeRequestCtx('douyin', '')

    await makeInstance(ctx).post(DETAIL, { a: 1 }, { headers: { 'Content-Type': 'application/json;charset=UTF-8' } })

    expect(sentHeader(calls, 'content-type')).toBe('application/json;charset=UTF-8')
  })

  it('字符串体 + 显式表单 CT 原样保留（调用方自己序列化了）', async () => {
    const { ctx, calls } = makeRequestCtx('douyin', '')

    await makeInstance(ctx).post(DETAIL, 'a=1', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    expect(sentHeader(calls, 'content-type')).toBe('application/x-www-form-urlencoded')
  })

  it('无 body 时同一个表单项也不删：GET 上它只可能是调用方自己写的', async () => {
    const { ctx, calls } = makeRequestCtx('douyin', '')

    // axios 的注入只发生在 POST / PUT / PATCH。GET 上没有 body 还带着这个头，
    // 就一定是调用方写的（`platforms/douyin/passport/client.ts` 正是这么用的），
    // 删掉等于替调用方改他明写的头
    await makeInstance(ctx).get(DETAIL, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })

    expect(sentHeader(calls, 'content-type')).toBe('application/x-www-form-urlencoded')
  })

  it('不跑端点的 decode：字符串响应原样进 error.raw，没有被切块', async () => {
    const raw = '{"a":1}{"b":2}'
    const { ctx } = makeRequestCtx('douyin', '', (spec) => ({
      status: 200,
      statusText: 'OK',
      headers: new AmagiHeaders(),
      body: raw,
      durationMs: 1,
      url: spec.url
    }))
    // debug 打开，失败信封才带 error.raw（关着时连这个键都没有）
    ;(ctx as { debug?: boolean }).debug = true

    // 字符串响应体在抖音 judge 下会被判成 ANTIBOT_PAGE（风控文本），这是**对的** ——
    // 我们要断言的是那串**原样**没被 decode 切块合并。
    // 这条请求产出的确实是**失败信封**，但它是随 **resolved** 的响应回来的：
    // adapter 恒 resolve，抛不抛由 axios 轨按信封决定（见下面那条用例）
    const res = await makeInstance(ctx, { sign: false }).get(DETAIL)

    expect(res.data.error.raw).toBe(raw)
    expect(res.data.success).toBe(false)
  })

  it('自定义 adapter 的返回值不经状态校验：非 2xx 照旧 resolve（抛不抛由 axios 轨按信封决定）', async () => {
    const { ctx } = makeRequestCtx('douyin', '', (spec) => ({
      status: 418,
      statusText: "I'm a teapot",
      headers: new AmagiHeaders(),
      body: { status_code: 0, aweme_detail: { aweme_id: '1' } },
      durationMs: 1,
      url: spec.url
    }))

    // `validateStatus: () => false` 是给「axios 会校验」这个误解留的对照组：
    // `settle` 只在内置 adapter 里，自定义函数 adapter 的返回值不经过它
    const res = await makeInstance(ctx).get(DETAIL, { validateStatus: () => false })

    // 状态码只进信封的 error.http，判别键始终是信封自己的 success
    expect(res.status).toBe(418)
    expect(res.data.success).toBe(false)
    expect(res.data.error.http.status).toBe(418)
  })

  it('合成的端点声明不带 decode / normalize / paginate', () => {
    const def = makeRequestDef('douyin', { method: 'GET', url: DETAIL }, 'GET', {})

    // 这条断言是「薄内核」的落点：request 给的是平台原始载荷，
    // 要解码（multi-JSON / protobuf）请走端点
    expect(def.decode).toBeUndefined()
    expect(def.normalize).toBeUndefined()
    expect(def.paginate).toBeUndefined()
    expect(def.compute).toBeUndefined()
  })

  it('不往下传的键里没有 timeout / proxy / signal', () => {
    expect(NOT_FORWARDED_KEYS).not.toContain('timeout')
    expect(NOT_FORWARDED_KEYS).not.toContain('proxy')
    expect(NOT_FORWARDED_KEYS).not.toContain('signal')
  })
})
