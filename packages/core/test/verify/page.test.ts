import { Script } from 'node:vm'

import type { RiskChallenge } from 'amagi/contracts/error'
import { renderVerifyPage } from 'amagi/verify'
import type { VerifyPageData } from 'amagi/verify/data'
import { VERIFY_PAGE_SOURCE_HASH } from 'amagi/verify/page.generated'
import { describe, expect, it } from 'vitest'

import { sourceHash } from '../../scripts/gen-verify-page.mjs'

/**
 * 风控验证页渲染的契约。
 *
 * amagi 的立场是**只中转不绕过**：页面只内嵌官方验证页 / 官方 SDK 交给真人，这里验的是
 * 「数据有没有被安全、完整地搬进页面」以及「料齐才给自建模式」，不是「能不能过验证」。
 * 页面行为（React）不在这里跑，只验内联脚本能被解析。
 */

/** 抖音响应体中间页通道：三样料俱全（可走自建模式） */
const douyinFull = (): RiskChallenge => ({
  url: 'https://rmc.bytedance.com/verifycenter/captcha/v2?aid=0&fp=verify_x&verify_data=%7B%7D',
  jsSdkUrl: 'https://lf-cdn-tos.bytescm.com/obj/static/sec_sdk_build/3.5.2/captcha/index.js',
  session: 'SYNTHETIC_SESSION',
  type: 'slide',
  result: '10000',
  verifyData: { code: '10000', subtype: 'slide', detail: 'SYNTHETIC_DETAIL', fp: 'verify_x', aid: 0 }
})

/** 取出页面内联的 `window.__AMAGI_VERIFY__` 数据 */
const dataOf = (html: string): VerifyPageData => {
  const m = /window\.__AMAGI_VERIFY__=(.*?);<\/script>/.exec(html)
  expect(m).not.toBeNull()
  return JSON.parse(m![1]!) as VerifyPageData
}

/** 页面里所有内联脚本的源码 */
const inlineScripts = (html: string): string[] => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!)

describe('产物', () => {
  it('page.generated.ts 与 verify-page/ 源码同步（不一致跑 pnpm gen:verify-page）', () => {
    expect(VERIFY_PAGE_SOURCE_HASH).toBe(sourceHash())
  })

  it('是一张自包含 HTML：内联样式与脚本，无外部 CSS/JS', () => {
    const html = renderVerifyPage(douyinFull(), { platform: 'douyin' })
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('</html>')
    expect(html).toContain('<style>')
    expect(html).not.toMatch(/<link[^>]+stylesheet/)
    expect(html).not.toMatch(/<script[^>]+src=/)
    expect(html).toContain('只中转不绕过')
  })

  it('占位符全部被替换', () => {
    const html = renderVerifyPage(douyinFull(), { platform: 'douyin' })
    expect(html).not.toContain('__AMAGI_TITLE__')
    expect(html).not.toContain('__AMAGI_VERIFY_JSON__')
  })

  it('内联脚本都能被 JS 引擎解析', () => {
    const html = renderVerifyPage(douyinFull(), { platform: 'douyin' })
    const scripts = inlineScripts(html)
    expect(scripts).toHaveLength(2)
    for (const src of scripts) expect(() => new Script(src)).not.toThrow()
  })
})

describe('数据：按平台与料的齐全度决定模式', () => {
  it('抖音料齐 → 带 sdk（宿主常量写死，verifyData 原样）', () => {
    const data = dataOf(renderVerifyPage(douyinFull(), { platform: 'douyin' }))
    expect(data.platform).toBe('douyin')
    expect(data.title).toBe('抖音验证')
    expect(data.sdk?.jsSdkUrl).toBe(douyinFull().jsSdkUrl)
    expect(data.sdk?.verifyData).toEqual(douyinFull().verifyData)
    // 宿主 aid 与 verifyData.aid 是两回事，两者并存不互相覆盖
    expect(data.sdk?.commonOptions).toEqual({ aid: 339757, iid: '0', did: '0' })
    expect(data.sdk?.captchaOptions).toEqual({ ele: 'root', hideCloseBtn: true, showMode: 'mask' })
  })

  it('抖音只有 url → sdk 为 null，只能托管', () => {
    const data = dataOf(renderVerifyPage({ url: douyinFull().url, type: 'slide' }, { platform: 'douyin' }))
    expect(data.sdk).toBeNull()
    expect(data.url).toBe(douyinFull().url)
  })

  it('快手 / 小红书即便带了 jsSdkUrl + verifyData 也只走托管', () => {
    for (const [platform, label] of [
      ['kuaishou', '快手'],
      ['xiaohongshu', '小红书']
    ] as const) {
      const data = dataOf(renderVerifyPage(douyinFull(), { platform }))
      expect(data.platform).toBe(platform)
      expect(data.title).toBe(`${label}验证`)
      expect(data.sdk).toBeNull()
      expect(data.url).toBe(douyinFull().url)
    }
  })

  it('对渲染无用的 session / type / result 不外泄进页面数据', () => {
    const raw = /window\.__AMAGI_VERIFY__=(.*?);<\/script>/.exec(renderVerifyPage(douyinFull(), { platform: 'douyin' }))![1]!
    expect(raw).not.toContain('SYNTHETIC_SESSION')
    expect(raw).not.toContain('"session"')
    expect(raw).not.toContain('"result"')
    expect(raw).not.toContain('"type"')
  })

  it('自定义标题进 <title>，数据里保留原文', () => {
    const html = renderVerifyPage(douyinFull(), { platform: 'douyin', title: '请完成验证' })
    expect(html).toContain('<title>请完成验证</title>')
    expect(dataOf(html).title).toBe('请完成验证')
  })
})

describe('安全', () => {
  it('verifyData 里的 </script> 被转义，不截断脚本', () => {
    const html = renderVerifyPage(
      { ...douyinFull(), verifyData: { detail: '</script><img src=x onerror=alert(1)>' } },
      { platform: 'douyin' }
    )
    expect(html).not.toContain('</script><img')
    expect(html).toContain('\\u003c/script\\u003e')
    expect(dataOf(html).sdk?.verifyData).toEqual({ detail: '</script><img src=x onerror=alert(1)>' })
  })

  it('url 里的 < > & 同样转义', () => {
    const html = renderVerifyPage({ url: 'https://e.com/?a=<b>&c=1' }, { platform: 'kuaishou' })
    expect(html).not.toContain('?a=<b>&c=1')
    expect(html).toContain('\\u003cb\\u003e')
    expect(dataOf(html).url).toBe('https://e.com/?a=<b>&c=1')
  })

  it('title 做 HTML 转义，不能注入标签', () => {
    const html = renderVerifyPage(douyinFull(), { platform: 'douyin', title: '<img src=x onerror=alert(1)>' })
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('<title>&lt;img src=x onerror=alert(1)&gt;</title>')
  })

  it('U+2028 / U+2029 被转义（合法 JSON 但老引擎当行终止符）', () => {
    const ls = String.fromCharCode(0x2028)
    const ps = String.fromCharCode(0x2029)
    const html = renderVerifyPage({ ...douyinFull(), verifyData: { detail: `a${ls}b${ps}c` } }, { platform: 'douyin' })
    expect(html).not.toContain(ls)
    expect(html).not.toContain(ps)
    expect(html).toContain('\\u2028')
    expect(html).toContain('\\u2029')
  })

  it('非 http(s) 地址一律丢弃（url 进 iframe/a，jsSdkUrl 进 script src）', () => {
    const data = dataOf(
      renderVerifyPage({ ...douyinFull(), url: 'javascript:alert(1)', jsSdkUrl: 'data:text/javascript,alert(1)' }, { platform: 'douyin' })
    )
    expect(data.url).toBeUndefined()
    expect(data.sdk).toBeNull()
  })

  it('标题里的占位符字样不会被二次替换', () => {
    const html = renderVerifyPage(douyinFull(), { platform: 'douyin', title: '__AMAGI_VERIFY_JSON__' })
    expect(html).toContain('<title>__AMAGI_VERIFY_JSON__</title>')
    expect(inlineScripts(html)).toHaveLength(2)
  })
})

describe('不抛错', () => {
  it('url 为空串也能渲染（托管不可用，页面自己报错）', () => {
    const html = renderVerifyPage({ url: '' }, { platform: 'xiaohongshu' })
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(dataOf(html).url).toBeUndefined()
  })
})
