import { renderDouyinVerifyPage } from 'amagi/platforms/douyin/verifyPage'
import { describe, expect, it } from 'vitest'

/**
 * 抖音手动滑块验证页渲染的契约。
 *
 * amagi 对风控的立场是**只中转不绕过**：这张页只把官方 TTGCaptcha 滑块渲染出来给真人拖，
 * 不含任何识别 / 轨迹 / 自动过验证代码。所以这里验的是「数据有没有被安全、完整地搬进页面」，
 * 以及「料齐 → 默认自建、料缺 → 托管」这条自动选择，不是「能不能过验证」。
 *
 * 坑都在下面被钉住：
 * - challenge 数据注入 `<script>` 必须防 `</script>` 截断与 HTML 注入（toInlineJson 转义）
 * - 响应头通道的 challenge 只有 url，页面不能假设 verifyData 一定在
 * - 中间页宿主常量（aid 339757 等）写死在页面，但 verifyData.aid（0）两者不混
 * - SDK 由脚本动态注入，jsSdkUrl 不进 HTML 的 src 属性
 */

/** 响应体中间页通道的完整挑战：三样料俱全（走自建模式） */
const fullChallenge = () => ({
  url: 'https://rmc.bytedance.com/verifycenter/captcha/v2?aid=0&fp=verify_x&host=https%3A%2F%2Fverify.zijieapi.com&verify_data=%7B%7D',
  jsSdkUrl: 'https://lf-cdn-tos.bytescm.com/obj/static/sec_sdk_build/3.5.2/captcha/index.js',
  session: 'SYNTHETIC_DETAIL',
  type: 'slide',
  result: '10000',
  verifyData: { code: '10000', subtype: 'slide', detail: 'SYNTHETIC_DETAIL', fp: 'verify_x', aid: 0 }
})

/** 响应头通道的挑战：只有 url（走托管模式） */
const urlOnlyChallenge = () => ({
  url: 'https://rmc.bytedance.com/verifycenter/captcha/v2?aid=6383&fp=verify_y&host=https%3A%2F%2Fverify.zijieapi.com&verify_data=%7B%7D',
  type: 'slide',
  result: 10000
})

describe('基本结构', () => {
  const html = renderDouyinVerifyPage(fullChallenge())

  it('是一张完整的 HTML 文档', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('</html>')
  })

  it('自包含：内联样式与脚本，无外部 CSS/JS 依赖（SDK 运行时才动态拉）', () => {
    expect(html).toContain('<style>')
    expect(html).toContain('<script>')
    // 不应有外部 <link rel=stylesheet> 或 <script src=...>（SDK 由 JS 动态注入，不写死在 HTML）
    expect(html).not.toMatch(/<link[^>]+stylesheet/)
    expect(html).not.toMatch(/<script[^>]+src=/)
  })

  it('挑战数据进了页面全局，verifyData 一字不差', () => {
    expect(html).toContain('window.__DOUYIN_CHALLENGE__=')
    expect(html).toContain('window.__DOUYIN_PAGE__=')
    expect(html).toContain('"subtype":"slide"')
    expect(html).toContain('"detail":"SYNTHETIC_DETAIL"')
  })

  it('中间页宿主常量写死在页面（aid 339757），与 verifyData.aid=0 不混', () => {
    expect(html).toContain('339757')
    // verifyData 里的 aid 是 0，两者都在页面但语义不同
    expect(html).toContain('"aid":0')
  })

  it('红线声明在页面里（只中转不绕过）', () => {
    expect(html).toContain('只中转不绕过')
    expect(html).toContain('同一份 cookie')
  })
})

describe('安全：注入进 <script> 的数据不能破坏页面结构', () => {
  it('verifyData 里的 </script> 被转义，不会截断脚本', () => {
    const html = renderDouyinVerifyPage({
      ...fullChallenge(),
      verifyData: { detail: '</script><img src=x onerror=alert(1)>', subtype: 'slide' }
    })
    // 原始的 </script> 不应原样出现在数据注入段
    expect(html).not.toContain('</script><img')
    // < 被转义成 \u003c
    expect(html).toContain('\\u003c/script\\u003e')
  })

  it('url 里的 < > & 同样转义', () => {
    const html = renderDouyinVerifyPage({ url: 'https://e.com/?a=<b>&c=1' })
    expect(html).not.toContain('?a=<b>&c=1')
    expect(html).toContain('\\u003cb\\u003e')
  })

  it('title 做 HTML 转义，不能注入标签', () => {
    const html = renderDouyinVerifyPage(fullChallenge(), { title: '<img src=x onerror=alert(1)>' })
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('U+2028 / U+2029 被转义（合法 JSON 但非法 JS 行终止符）', () => {
    const html = renderDouyinVerifyPage({ ...fullChallenge(), verifyData: { detail: 'a\u2028b\u2029c' } })
    expect(html).toContain('\\u2028')
    expect(html).toContain('\\u2029')
    expect(html).not.toContain('a\u2028b')
  })
})

describe('料齐全度决定可用模式', () => {
  it('只有 url 的挑战也能渲染（托管模式兜底）', () => {
    const html = renderDouyinVerifyPage(urlOnlyChallenge())
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    // 页面带 url，但数据块里没有 jsSdkUrl / verifyData（脚本里有同名属性引用，所以只查数据注入段）
    const dataBlock = html.slice(html.indexOf('window.__DOUYIN_CHALLENGE__='), html.indexOf('window.__DOUYIN_PAGE__='))
    expect(dataBlock).toContain('verifycenter/captcha/v2')
    expect(dataBlock).not.toContain('jsSdkUrl')
    expect(dataBlock).not.toContain('verifyData')
  })

  it('对渲染无用的字段（session/type/result）不外泄进页面全局', () => {
    const html = renderDouyinVerifyPage(fullChallenge())
    // session 的值是 detail，它只应作为 verifyData.detail 出现，不单独注入
    const challengeBlock = html.slice(html.indexOf('window.__DOUYIN_CHALLENGE__='), html.indexOf('window.__DOUYIN_PAGE__='))
    expect(challengeBlock).not.toContain('"session"')
    expect(challengeBlock).not.toContain('"result"')
    expect(challengeBlock).not.toContain('"type"')
  })
})

describe('选项覆盖', () => {
  it('自定义标题进 title 与 h1', () => {
    const html = renderDouyinVerifyPage(fullChallenge(), { title: '请完成验证' })
    expect(html).toContain('<title>请完成验证</title>')
    expect(html).toContain('<h1>请完成验证</h1>')
  })

  it('可覆盖 commonOptions（换宿主 aid）', () => {
    const html = renderDouyinVerifyPage(fullChallenge(), { commonOptions: { aid: 111, iid: '0', did: '0' } })
    expect(html).toContain('"aid":111')
    expect(html).not.toContain('339757')
  })

  it('captchaOptions 在默认之上浅合并', () => {
    const html = renderDouyinVerifyPage(fullChallenge(), { captchaOptions: { showMode: 'popup' } })
    expect(html).toContain('"showMode":"popup"')
    // 默认的 ele:root 仍在
    expect(html).toContain('"ele":"root"')
  })
})

describe('不抛错', () => {
  it('空对象也能渲染（极端兜底，不崩）', () => {
    // RiskChallenge 要求 url，但渲染函数对缺字段应健壮
    const html = renderDouyinVerifyPage({ url: '' })
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
  })
})
