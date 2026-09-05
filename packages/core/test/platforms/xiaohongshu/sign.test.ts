import { generateXB3Traceid, generateXSCommon, generateXSGet, generateXSPost, generateXT, getSearchId } from 'amagi/platforms/xiaohongshu/sign'
/**
 * platforms/xiaohongshu/sign 的契约。
 *
 * 判据：**v6 的 `sign-xiaohongshu.test.ts` 快照一字不变**。
 * 这里不复制快照，而是直接 import v6 的 `xiaohongshuSign` 类，对同一入参
 * 断言 v7 输出与 v6 输出完全相等 —— v6 快照由 `test/platform/sign-xiaohongshu.test.ts`
 * 锁死，v7 与 v6 相等由本文件锁死，两条链合起来就是「快照不变」。
 *
 * v6 的静态方法依赖 `this.client`（static 类字段），必须用
 * `v6Sign.method.call(v6Sign, ...)` 保持 this，不能解构出来调用。
 *
 * 注意：v6 的 `extractA1FromCookie` 已废弃，v7 改用 `contracts/cookie.ts` 的
 * `getCookieValue`，此处不对比。
 */
import { xiaohongshuSign } from 'amagi/platform/xiaohongshu/sign'
import { describe, expect, it } from 'vitest'

import { freezeEntropy } from '../../helpers/deterministic'

/** 以类为 this 调用 v6 静态方法 */
const v6Call = <Args extends unknown[], R>(method: (...args: Args) => R, ...args: Args): R => method.call(xiaohongshuSign, ...args)

const A1 = '1900000000abcdef0123456789abcdef'
const COOKIE = 'a1=' + A1 + '; web_session=040069abc; webId=deadbeef'
const PATH = '/api/sns/web/v1/feed'

describe('platforms/xiaohongshu/sign 与 v6 逐项对照', () => {
  it('generateXSGet：固定入参输出与 v6 一致', () => {
    freezeEntropy()
    const v7 = generateXSGet(PATH, A1)
    freezeEntropy()
    expect(v7).toBe(v6Call(xiaohongshuSign.generateXSGet, PATH, A1))
  })

  it('generateXSGet：带 params 输出与 v6 一致', () => {
    freezeEntropy()
    const v7 = generateXSGet(PATH, A1, 'xhs-pc-web', { note_id: 'n1' })
    freezeEntropy()
    expect(v7).toBe(v6Call(xiaohongshuSign.generateXSGet, PATH, A1, 'xhs-pc-web', { note_id: 'n1' }))
  })

  it('generateXSPost：固定入参输出与 v6 一致', () => {
    freezeEntropy()
    const v7 = generateXSPost(PATH, A1, 'xhs-pc-web', { num: 20 })
    freezeEntropy()
    expect(v7).toBe(v6Call(xiaohongshuSign.generateXSPost, PATH, A1, 'xhs-pc-web', { num: 20 }))
  })

  it('generateXSPost：空 body 输出与 v6 一致', () => {
    freezeEntropy()
    const v7 = generateXSPost(PATH, A1)
    freezeEntropy()
    expect(v7).toBe(v6Call(xiaohongshuSign.generateXSPost, PATH, A1))
  })

  it('generateXSCommon：固定 cookie 输出与 v6 一致', () => {
    freezeEntropy()
    const v7 = generateXSCommon(COOKIE)
    freezeEntropy()
    expect(v7).toBe(v6Call(xiaohongshuSign.generateXSCommon, COOKIE))
  })

  it('generateXT：返回毫秒时间戳，与 v6 一致', () => {
    freezeEntropy()
    const v7 = generateXT()
    freezeEntropy()
    expect(v7).toBe(v6Call(xiaohongshuSign.generateXT))
  })

  it('generateXB3Traceid：返回 16 位字符串，与 v6 一致', () => {
    freezeEntropy()
    const v7 = generateXB3Traceid()
    freezeEntropy()
    expect(v7).toBe(v6Call(xiaohongshuSign.generateXB3Traceid))
  })
})

describe('platforms/xiaohongshu/sign 行为与 v6 一致', () => {
  it('generateXT 返回数字', () => {
    freezeEntropy()
    expect(typeof generateXT()).toBe('number')
  })

  it('generateXB3Traceid 返回 16 位十六进制字符串', () => {
    freezeEntropy()
    expect(generateXB3Traceid()).toMatch(/^[0-9a-f]{16}$/)
  })

  it('getSearchId 返回字符串', () => {
    freezeEntropy()
    expect(typeof getSearchId()).toBe('string')
  })

  it('path 不同则签名不同', () => {
    freezeEntropy()
    const a = generateXSGet('/api/a', A1)
    freezeEntropy()
    const b = generateXSGet('/api/b', A1)
    expect(b).not.toBe(a)
  })

  it('a1 不同则签名不同', () => {
    freezeEntropy()
    const a = generateXSGet(PATH, A1)
    freezeEntropy()
    const b = generateXSGet(PATH, A1.replace('1900', '1901'))
    expect(b).not.toBe(a)
  })

  it('GET 与 POST 的签名结果不同', () => {
    freezeEntropy()
    const get = generateXSGet(PATH, A1)
    freezeEntropy()
    const post = generateXSPost(PATH, A1)
    expect(post).not.toBe(get)
  })
})