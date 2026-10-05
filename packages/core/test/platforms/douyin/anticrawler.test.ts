import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  detectAnticrawler,
  parseDouyinCaptcha,
  solveAcrawlerVmp,
  solveDouyinAnticrawler,
  solveWafChallenge
} from 'amagi/platforms/douyin/anticrawler'
import { describe, expect, it } from 'vitest'

/**
 * 抖音 Argus 反爬的单元测试，全部跑在**真实挑战页** fixture 上：
 *
 * - `waf_challenge.html`：2026-10 实测抓到的 WAF PoW 页（2492B，`cs="…"` 内嵌）
 * - `acrawler_vmp.html`：acrawler VMP 页（72KB，`byted_acrawler`）
 * - `slider_captcha.html`：TTGCaptcha 滑块中间页（`verify_data` 单行 JSON）
 *
 * 三个 fixture 都来自真实服务器下发、无任何凭据。WAF / VMP 是纯程序化可解
 * 的匿名挑战，这里验「解出来的形状对不对」；滑块夹带会话票据只能转人工，
 * 这里验「能不能把地址与票据正确衔接下来」。
 */

const readFixture = (name: string): string => readFileSync(fileURLToPath(new URL(`../../fixtures/douyin/${name}`, import.meta.url)), 'utf8')

const WAF = readFixture('waf_challenge.html')
const VMP = readFixture('acrawler_vmp.html')
const SLIDER = readFixture('slider_captcha.html')

/** 与导致挑战的请求一致的浏览器指纹（参考 DOUYIN_WEB_UA） */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'
const PAGE_URL = 'https://www.douyin.com/discover'

describe('形态识别 detectAnticrawler', () => {
  it('WAF PoW 页（_wafchallengeid）', () => {
    expect(detectAnticrawler(WAF)).toBe('waf')
  })

  it('acrawler VMP 页（_$jsvmprt）', () => {
    expect(detectAnticrawler(VMP)).toBe('vmp')
  })

  it('TTGCaptcha 滑块中间页', () => {
    expect(detectAnticrawler(SLIDER)).toBe('captcha')
  })

  it('正常页面（_ROUTER_DATA 水合数据）与随机文本都短路到 none', () => {
    expect(detectAnticrawler('window._ROUTER_DATA = {...}')).toBe('data')
    expect(detectAnticrawler('<html>随便一段文本</html>')).toBe('none')
    expect(detectAnticrawler('')).toBe('none')
  })
})

describe('WAF PoW 解算 solveWafChallenge', () => {
  it('真实 WAF 页解出 _wafchallengeid 段', () => {
    const segment = solveWafChallenge(WAF)
    expect(segment).toMatch(/^_wafchallengeid=[A-Za-z0-9+/=]+$/)
  })

  it('非 WAF 输入安全返回 undefined', () => {
    expect(solveWafChallenge('<html>普通页面</html>')).toBeUndefined()
    expect(solveWafChallenge('')).toBeUndefined()
    // VMP 页里也有不少 JS，但缺 cs="…" 锚点，不能误解
    expect(solveWafChallenge(VMP)).toBeUndefined()
  })
})

describe('acrawler VMP 解算 solveAcrawlerVmp', () => {
  it('真实 VMP 页在 node:vm 里跑出 __ac_signature', () => {
    const result = solveAcrawlerVmp(VMP, 'test-nonce-20261005', {
      userAgent: UA,
      pageUrl: PAGE_URL,
      referrer: 'https://www.douyin.com/'
    })
    expect(result.signature).toBeDefined()
    expect(result.signature!.length).toBeGreaterThan(0)
  })

  it('无脚本的非挑战页安全返回空产物', () => {
    expect(solveAcrawlerVmp('<html>无脚本</html>', 'n', { userAgent: UA, pageUrl: PAGE_URL, referrer: '' })).toEqual({})
  })
})

describe('TTGCaptcha 滑块中转 parseDouyinCaptcha', () => {
  it('真实滑块页取出 jsSdkUrl 与 detail 票据', () => {
    const challenge = parseDouyinCaptcha(SLIDER, { url: PAGE_URL })
    expect(challenge?.url).toBe(PAGE_URL)
    expect(challenge?.jsSdkUrl).toMatch(/^https:\/\/.+captcha\/index\.js$/)
    expect(challenge?.bizName).toBe('TTGCaptcha')
    expect(challenge?.result).toBe(10000)
    expect(challenge?.session).toBeDefined()
    expect(challenge!.session!.length).toBeGreaterThan(0)
  })

  it('缺 res.url 时不认 —— 没有归属的挑战不交出去', () => {
    expect(parseDouyinCaptcha(SLIDER)).toBeUndefined()
    expect(parseDouyinCaptcha(SLIDER, { url: '' })).toBeUndefined()
  })

  it('非滑块 / 非字符串输入安全返回 undefined', () => {
    expect(parseDouyinCaptcha('<html>普通页面</html>', { url: PAGE_URL })).toBeUndefined()
    expect(parseDouyinCaptcha(WAF, { url: PAGE_URL })).toBeUndefined()
    for (const input of [null, undefined, '', 42, { code: '10000' }]) {
      expect(parseDouyinCaptcha(input, { url: PAGE_URL })).toBeUndefined()
    }
  })
})

describe('解算编排 solveDouyinAnticrawler', () => {
  it('WAF 页：解出 cookie 并保留入参 cookie', () => {
    const solved = solveDouyinAnticrawler(WAF, {
      url: PAGE_URL,
      cookie: 'foo=1',
      userAgent: UA
    })
    expect(solved).toBeDefined()
    expect(solved).toContain('foo=1')
    expect(solved).toMatch(/_wafchallengeid=[A-Za-z0-9+/=]+/)
  })

  it('VMP 页：从 Set-Cookie 取 nonce 解出 __ac_signature', () => {
    const solved = solveDouyinAnticrawler(VMP, {
      url: PAGE_URL,
      cookie: 'ttwid=abc',
      userAgent: UA,
      setCookie: ['__ac_nonce=test-nonce-20261005; Path=/; Max-Age=7200']
    })
    expect(solved).toBeDefined()
    expect(solved).toContain('ttwid=abc')
    expect(solved).toMatch(/__ac_signature=[\w.~-]+/)
  })

  it('VMP 页但缺 nonce：解不了返回 undefined', () => {
    expect(solveDouyinAnticrawler(VMP, { url: PAGE_URL, cookie: '', userAgent: UA })).toBeUndefined()
  })

  it('滑块页转人工：自动解算不给路，返回 undefined', () => {
    expect(solveDouyinAnticrawler(SLIDER, { url: PAGE_URL, cookie: '', userAgent: UA })).toBeUndefined()
  })

  it('非挑战输入安全返回 undefined', () => {
    expect(solveDouyinAnticrawler('<html>普通页面</html>', { url: PAGE_URL, cookie: '', userAgent: UA })).toBeUndefined()
    expect(solveDouyinAnticrawler(null, { url: PAGE_URL, cookie: '', userAgent: UA })).toBeUndefined()
    expect(solveDouyinAnticrawler(undefined, { url: PAGE_URL, cookie: '', userAgent: UA })).toBeUndefined()
  })
})
