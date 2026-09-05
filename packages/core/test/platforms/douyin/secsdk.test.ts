import crypto from 'node:crypto'

import {
  applySecsdkWebSign,
  canonicalQuery,
  extractUifidFromCookie,
  isSecsdkProtected,
  PROTECTED_PATHS_GET,
  PROTECTED_PATHS_POST,
  SECSDK_SIG_KEY,
  SECSDK_TS_KEY,
  signSecsdkWebQuery,
  signSecsdkWebUrl,
  WEBSIGN_CONST
} from 'amagi/platforms/douyin/sign/secsdkWebSign'
/**
 * `x-secsdk-web-signature` 的契约（#188 搬迁）。
 *
 * 这份算法是从 `cv-cat/DouYin_Spider` 的 `utils/secsdk_web_sign.py` 移植的，
 * 常量与规范化规则逐条对齐。测试分三组：
 * ① 策略表 —— 表内加签、表外原样返回、GET/POST 表不同；
 * ② 明文与规范化 —— 顺序不排序、value 重编码、key 只解码、裸参数补 `=`、
 *    孤立百分号当字面量、uifid 从 cookie 兜底；
 * ③ 幂等 —— 重复调用不会叠加 `timestamp` / 签名字段。
 */
import { describe, expect, it } from 'vitest'

/** 策略表里的一条 GET path（作品详情） */
const PROTECTED_URL = 'https://www-hj.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=1&a_bogus=xx'
/** 表外的 path（表情列表） */
const PLAIN_URL = 'https://www.douyin.com/aweme/v1/web/emoji/list?need_all=true'

describe('① 策略表：表内才加签', () => {
  it('表内 GET path 被改写成带签名的 URL', () => {
    const signed = applySecsdkWebSign(PROTECTED_URL, { uifid: 'u1', ts: 1_700_000_000 })
    const query = new URL(signed).searchParams

    expect(signed).not.toBe(PROTECTED_URL)
    expect(query.get(SECSDK_TS_KEY)).toBe('1700000000')
    expect(query.get(SECSDK_SIG_KEY)).toMatch(/^[0-9a-f]{32}$/)
    // 原有参数一个不丢
    expect(query.get('aweme_id')).toBe('1')
    expect(query.get('a_bogus')).toBe('xx')
  })

  it('表外 path 原样返回 —— 所以可以无条件套用', () => {
    expect(applySecsdkWebSign(PLAIN_URL, { uifid: 'u1' })).toBe(PLAIN_URL)
  })

  it('不是合法 URL 时原样返回，不抛', () => {
    expect(applySecsdkWebSign('not a url', { uifid: 'u1' })).toBe('not a url')
    expect(applySecsdkWebSign('', {})).toBe('')
  })

  it('GET 与 POST 是两张表：`music/detail` 只在 GET 表里', () => {
    expect(isSecsdkProtected('/aweme/v1/web/music/detail/')).toBe(true)
    expect(isSecsdkProtected('/aweme/v1/web/music/detail/', 'POST')).toBe(false)
    // 两张表都有的那几条
    expect(isSecsdkProtected('/aweme/v1/web/aweme/detail/', 'post')).toBe(true)
    expect(PROTECTED_PATHS_GET).toHaveLength(14)
    expect(PROTECTED_PATHS_POST).toHaveLength(6)
  })

  it('#188 点名的四条都在 GET 表里', () => {
    for (const path of [
      '/aweme/v1/web/aweme/detail/', // 作品详情
      '/aweme/v1/web/aweme/post/', // 用户作品
      '/aweme/v1/web/aweme/favorite/', // 喜欢列表
      '/aweme/v1/web/music/detail/' // 原声（此前 15/15 被拦）
    ]) {
      expect(isSecsdkProtected(path), path).toBe(true)
    }
  })

  it('免鉴权那四条的 path 都不在表里', () => {
    for (const path of ['/web/api/v2/user/info/', '/web/api/v2/music/info/', '/web/api/v2/music/list/aweme/', '/aweme/v1/im/resources/emoji/']) {
      expect(isSecsdkProtected(path), path).toBe(false)
    }
  })
})

describe('② 明文与 query 规范化', () => {
  it('顺序不排序、value 重编码、key 只解码', () => {
    expect(canonicalQuery('b=2&a=1')).toBe('b=2&a=1') // 不排序
    expect(canonicalQuery('kw=%E7%8C%AB')).toBe('kw=%E7%8C%AB') // 解码再编码，等价
    expect(canonicalQuery('kw=猫')).toBe('kw=%E7%8C%AB') // 原始中文被编码
    expect(canonicalQuery('a+b=c+d')).toBe('a b=c%20d') // key 只解码不重编码
  })

  it('无等号的裸参数补成 `k=`', () => {
    expect(canonicalQuery('flag')).toBe('flag=')
    expect(canonicalQuery('a=1&flag&b=2')).toBe('a=1&flag=&b=2')
  })

  it('孤立百分号当字面量而不是抛异常（decodeURIComponent 会炸）', () => {
    expect(() => decodeURIComponent('100%')).toThrow()
    expect(canonicalQuery('v=100%')).toBe('v=100%25')
  })

  it('明文形如 `uifid_ts_盐_signedQuery`，签名是它的 md5', () => {
    const { ts, signature, signedQuery } = signSecsdkWebQuery(PROTECTED_URL, { uifid: 'u1', ts: 1_700_000_000 })
    const plain = `u1_${ts}_${WEBSIGN_CONST}_${signedQuery}`

    expect(signature).toBe(crypto.createHash('md5').update(plain, 'utf8').digest('hex'))
    expect(signedQuery).toContain('uifid=u1') // query 里没有 uifid 时从选项追加到末尾
    expect(signedQuery.endsWith(`${SECSDK_TS_KEY}=${ts}`)).toBe(true) // timestamp 在最后
    expect(signedQuery).not.toContain(SECSDK_SIG_KEY) // 签名字段本身不参与签名
  })

  it('query 里已有 uifid 时不再从 cookie 追加', () => {
    const { signedQuery } = signSecsdkWebQuery(`${PROTECTED_URL}&uifid=inQuery`, { uifid: 'fromCookie', ts: 1 })
    expect(signedQuery).toContain('uifid=inQuery')
    expect(signedQuery).not.toContain('fromCookie')
  })

  it('uifid 从 cookie 里取，且不会被 UIFID_TEMP 骗到', () => {
    expect(extractUifidFromCookie('UIFID_TEMP=temp; UIFID=real; ttwid=x')).toBe('real')
    expect(extractUifidFromCookie('ttwid=x; UIFID_TEMP=temp')).toBe('')
    expect(extractUifidFromCookie(undefined)).toBe('')
    expect(extractUifidFromCookie('')).toBe('')
  })

  it('applySecsdkWebSign 在 uifid 缺省时读 cookie', () => {
    const withOption = applySecsdkWebSign(PROTECTED_URL, { uifid: 'real', ts: 1 })
    const withCookie = applySecsdkWebSign(PROTECTED_URL, { cookie: 'UIFID=real; ttwid=x', ts: 1 })
    expect(withCookie).toBe(withOption)
  })
})

describe('③ 幂等：重复调用不叠加', () => {
  it('对已签过的 URL 再签一次，参数个数不增长、结果与首次一致', () => {
    const once = signSecsdkWebUrl(PROTECTED_URL, { uifid: 'u1', ts: 1_700_000_000 })
    const twice = signSecsdkWebUrl(once, { uifid: 'u1', ts: 1_700_000_000 })

    expect(twice).toBe(once)
    expect([...new URL(twice).searchParams.keys()].filter((k) => k === SECSDK_TS_KEY)).toHaveLength(1)
    expect([...new URL(twice).searchParams.keys()].filter((k) => k === SECSDK_SIG_KEY)).toHaveLength(1)
  })

  it('ts 缺省时取当前秒级时间戳', () => {
    const before = Math.trunc(Date.now() / 1000)
    const { ts } = signSecsdkWebQuery(PROTECTED_URL, { uifid: 'u1' })
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(String(ts)).toHaveLength(10)
  })
})
