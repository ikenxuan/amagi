import { createBoundDouyinFetcher, createBoundXiaohongshuFetcher } from 'amagi/model/fetchers'
import { mergeRequestConfig, resolveBoundRequest } from 'amagi/model/fetchers/shared/request-config'
import { describe, expect, it } from 'vitest'

import { constantAdapter } from '../helpers/adapter'
import { AWEME_ID, douyinOk, xiaohongshuOk } from '../helpers/fixtures'

describe('mergeRequestConfig', () => {
  it('override 为空时原样返回 base', () => {
    const base = { timeout: 100 }
    expect(mergeRequestConfig(base, undefined)).toBe(base)
  })

  it('base 为空时返回 override 的合并结果', () => {
    expect(mergeRequestConfig(undefined, { timeout: 5 })).toEqual({ timeout: 5, headers: {} })
  })

  it('两者都为空时返回 undefined', () => {
    expect(mergeRequestConfig(undefined, undefined)).toBeUndefined()
  })

  it('override 的同名字段优先', () => {
    expect(mergeRequestConfig({ timeout: 100 }, { timeout: 5 })?.timeout).toBe(5)
  })

  it('headers 逐键合并而非整体替换', () => {
    const merged = mergeRequestConfig({ headers: { A: '1', B: '2' } }, { headers: { B: '9', C: '3' } })
    expect(merged?.headers).toEqual({ A: '1', B: '9', C: '3' })
  })

  it('不修改任何入参', () => {
    const base = { headers: { A: '1' }, timeout: 1 }
    const override = { headers: { B: '2' } }
    const baseSnapshot = JSON.stringify(base)
    const overrideSnapshot = JSON.stringify(override)

    mergeRequestConfig(base, override)

    expect(JSON.stringify(base)).toBe(baseSnapshot)
    expect(JSON.stringify(override)).toBe(overrideSnapshot)
  })

  it('override 显式给空 headers 时不清空 base 的 headers', () => {
    const merged = mergeRequestConfig({ headers: { A: '1' } }, { headers: {} })
    expect(merged?.headers).toEqual({ A: '1' })
  })
})

describe('resolveBoundRequest', () => {
  it('无 override 时返回绑定的 cookie', () => {
    const [cookie, config] = resolveBoundRequest('bound-ck')
    expect(cookie).toBe('bound-ck')
    expect(config).toBeUndefined()
  })

  it('实例级 headers.Cookie 覆盖绑定 cookie', () => {
    const [cookie] = resolveBoundRequest('bound-ck', { headers: { Cookie: 'instance-ck' } })
    expect(cookie).toBe('instance-ck')
  })

  it('单次 headers.Cookie 优先于实例级', () => {
    const [cookie] = resolveBoundRequest('bound-ck', { headers: { Cookie: 'instance-ck' } }, { headers: { Cookie: 'call-ck' } })
    expect(cookie).toBe('call-ck')
  })

  it('Cookie 为空字符串时也会覆盖（显式声明即生效）', () => {
    const [cookie] = resolveBoundRequest('bound-ck', { headers: { Cookie: '' } })
    expect(cookie).toBe('')
  })

  it('Cookie 为非字符串时回落到绑定 cookie', () => {
    const [cookie] = resolveBoundRequest('bound-ck', { headers: { Cookie: 123 } as never })
    expect(cookie).toBe('bound-ck')
  })

  // hasOwnProperty(headers, 'Cookie') 只认大写 C，
  // 而小红书自身的 defaultConfigs 用的是小写 cookie。
  it('KNOWN-DEFECT: 小写 cookie 头不会覆盖绑定 cookie', () => {
    const [cookie] = resolveBoundRequest('bound-ck', { headers: { cookie: 'lowercase-ck' } })
    expect(cookie).toBe('bound-ck')
  })

  it('KNOWN-DEFECT: COOKIE 全大写同样不生效', () => {
    const [cookie] = resolveBoundRequest('bound-ck', { headers: { COOKIE: 'upper-ck' } })
    expect(cookie).toBe('bound-ck')
  })
})

describe('bound fetcher 的配置传递', () => {
  it('绑定的 cookie 进入请求头', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    const fetcher = createBoundDouyinFetcher('bound-ck', { adapter: h.adapter })
    await fetcher.fetchVideoWork({ aweme_id: AWEME_ID })

    expect(h.last().headers.Cookie).toBe('bound-ck')
  })

  it('单次 requestConfig 与实例级合并，不污染实例', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    const fetcher = createBoundDouyinFetcher('bound-ck', { adapter: h.adapter, headers: { 'X-Base': '1' } })

    await fetcher.fetchVideoWork({ aweme_id: AWEME_ID }, { headers: { 'X-Once': '2' } })
    await fetcher.fetchVideoWork({ aweme_id: AWEME_ID })

    expect(h.at(0).headers['X-Base']).toBe('1')
    expect(h.at(0).headers['X-Once']).toBe('2')
    expect(h.at(1).headers['X-Base']).toBe('1')
    expect(h.at(1).headers['X-Once']).toBeUndefined()
  })

  it('单次 headers.Cookie 同时替换签名用的 cookie 与请求头', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    const fetcher = createBoundDouyinFetcher('bound-ck', { adapter: h.adapter })

    await fetcher.fetchVideoWork({ aweme_id: AWEME_ID }, { headers: { Cookie: 'call-ck' } })

    expect(h.last().headers.Cookie).toBe('call-ck')
  })

  it('并发调用互不干扰', async () => {
    const h = constantAdapter(douyinOk({ aweme_detail: {} }))
    const fetcher = createBoundDouyinFetcher('bound-ck', { adapter: h.adapter })

    await Promise.all([
      fetcher.fetchVideoWork({ aweme_id: '1' }, { headers: { 'X-Tag': 'a' } }),
      fetcher.fetchVideoWork({ aweme_id: '2' }, { headers: { 'X-Tag': 'b' } })
    ])

    const tags = h.requests.map((r) => r.headers['X-Tag']).sort()
    expect(tags).toEqual(['a', 'b'])
  })

  it('KNOWN-DEFECT: 小红书 bound fetcher 传小写 cookie 时签名仍用绑定 cookie', async () => {
    const h = constantAdapter(xiaohongshuOk({ data: {} }))
    const fetcher = createBoundXiaohongshuFetcher('a1=BOUNDA1VALUE', { adapter: h.adapter })

    await fetcher.fetchHomeFeed({}, { headers: { cookie: 'a1=OVERRIDEA1VALUE' } })

    // 请求头被 override 覆盖了……
    expect(h.last().headers.cookie).toBe('a1=OVERRIDEA1VALUE')
    // ……但 resolveBoundRequest 没识别小写 cookie，签名仍基于绑定值计算。
    // 也就是签名身份与实际发出的 Cookie 不一致。
    const signedWithBound = h.last().headers['x-s']
    expect(signedWithBound).toBeTruthy()
  })
})
