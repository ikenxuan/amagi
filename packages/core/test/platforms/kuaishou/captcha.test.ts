import { KUAISHOU_H5_CAPTCHA_RESULT, KUAISHOU_PC_CAPTCHA_RESULT, parseKuaishouCaptcha } from 'amagi/platforms/kuaishou/captcha'
import { describe, expect, it } from 'vitest'

/**
 * 风控滑块地址的中转契约。
 *
 * amagi 对风控的立场是**只中转不绕过**：把地址交给调用方，不引入识别或轨迹模拟。
 * 所以这里验的是「地址能不能被正确取出来」，不是「能不能过验证」。
 *
 * 三个坑，都在下面被钉住：
 * - H5 的 `captchaConfig` 是**字符串形式的 JSON**，忘了二次解析就拿到一串转义引号
 * - H5 给的地址**不是验证页而是配置接口**（`…/rest/zt/captcha/sliding/config`，
 *   浏览器打开只有 JSON），原样交出去人过不了验证，要拼成验证页入口
 * - PC 的 `jsSdkUrl` 省略协议（`//static.yximgs.com/…`），不补协议会被当成相对路径
 *
 * 业务码 2001 是实测撞到过的：2026-09-04 的无 cookie 探针里 `/rest/wd/photo/info`
 * 稳定命中，而同样签名、同样带 body 的 `comment/list` 正常返回 —— 所以它不是签名
 * 问题（签名错是 50），是那条接口上的行为风控。
 */

// 平台**已经给了页面地址**时的样本。故意用 redirect 页：我们自己拼入口时不选它，
// 但平台明确给出的页面地址一律原样透出，不猜、不改写 —— 这条边界由下面那个用例钉住。
const H5_URL = 'https://captcha.zt.kuaishou.com/mobile/h5/redirect/index.html?captchaSession=SESSION123&type=1&bizName=ANTICRAWL_DEFAULT'
const H5_CONFIG_URL = 'https://captcha.zt.kuaishou.com/rest/zt/captcha/sliding/config'
const PC_URL =
  'https://captcha.zt.kuaishou.com/iframe/index.html?captchaSession=PCSESSION&type=1&configUrl=https%3A%2F%2Fcaptcha.zt.kuaishou.com%2Frest%2Fzt%2Fcaptcha%2Fsliding%2Fconfig&bizName=ANTICRAWL_COMMON'

describe('H5 风控响应（result 2001）', () => {
  const body = {
    result: KUAISHOU_H5_CAPTCHA_RESULT,
    error_msg: '[2001] antispam need captcha',
    captchaConfig: JSON.stringify({ type: 1, url: H5_URL, captchaSession: 'SESSION123', jsSdkUrl: '//static.yximgs.com/sdk.js' })
  }

  it('captchaConfig 是字符串 JSON，要二次解析才拿得到地址', () => {
    const challenge = parseKuaishouCaptcha(body)
    expect(challenge?.url).toBe(H5_URL)
    expect(challenge?.result).toBe(2001)
  })

  it('省略协议的 jsSdkUrl 补成 https', () => {
    expect(parseKuaishouCaptcha(body)?.jsSdkUrl).toBe('https://static.yximgs.com/sdk.js')
  })

  it('会话票据与业务名从地址 query 里抽出来', () => {
    const challenge = parseKuaishouCaptcha(body)
    expect(challenge?.session).toBe('SESSION123')
    expect(challenge?.bizName).toBe('ANTICRAWL_DEFAULT')
  })

  it('captchaConfig 已经是对象时也认（平台哪天改了不至于全瞎）', () => {
    expect(parseKuaishouCaptcha({ result: 2001, captchaConfig: { url: H5_URL } })?.url).toBe(H5_URL)
  })

  it('captchaConfig 解不开时不报错，返回 undefined', () => {
    expect(parseKuaishouCaptcha({ result: 2001, captchaConfig: '{不是合法 JSON' })).toBeUndefined()
  })
})

/**
 * H5 真实形状：`captchaConfig.url` 给的**不是验证页，是配置接口**。
 *
 * 2026-09-26 在浏览器里核对过：`…/rest/zt/captcha/sliding/config` 打开只有一串
 * JSON，人在上面过不了验证。原样交出去等于给了一个死链，所以要拼成
 * `iframe/index.html?…&configUrl=<配置接口>` —— 地址给人打开，配置接口另存进
 * `configUrl`，两者都不丢。
 *
 * 入口页是 `iframe/index.html` 而**不是** `mobile/h5/redirect/index.html`：后者是快手
 * H5 前端自己用的跳转壳，读的是 `captchaConfig` 原字段名 `url`，不认 `configUrl`，
 * SDK 拿到空值后把配置请求 POST 到页面自身，
 * 返回 405，滑块图出不来。2026-09-27 用 H5 端点签发的会话配 `iframe/index.html`
 * 实测：配置接口 `result=1`、图正常出、滑动校验 `desc="ok"` —— 会话是通用的。
 */
describe('H5 给的是配置接口时拼出验证页入口', () => {
  const challenge = parseKuaishouCaptcha({
    result: KUAISHOU_H5_CAPTCHA_RESULT,
    error_msg: '[2001] antispam need captcha',
    captchaConfig: JSON.stringify({ type: 1, url: H5_CONFIG_URL, captchaSession: 'SESSION1', bizName: 'ANTICRAWL_DEFAULT' })
  })

  it('交出去的 url 是人能打开的验证页，不是配置接口', () => {
    expect(challenge?.url.startsWith('https://captcha.zt.kuaishou.com/iframe/index.html?')).toBe(true)
    expect(challenge?.configUrl).toBe(H5_CONFIG_URL)
  })

  it('拼出来的 query 带齐 captchaSession / type / configUrl / bizName', () => {
    const query = new URL(challenge?.url ?? '').searchParams
    expect(query.get('captchaSession')).toBe('SESSION1')
    expect(query.get('type')).toBe('1')
    expect(query.get('configUrl')).toBe(H5_CONFIG_URL)
    expect(query.get('bizName')).toBe('ANTICRAWL_DEFAULT')
  })

  it('票据字段同时平铺在结果上，调用方不必自己解 URL', () => {
    expect(challenge?.session).toBe('SESSION1')
    expect(challenge?.bizName).toBe('ANTICRAWL_DEFAULT')
    // `type` 原样透出：H5 给的是数字 1，不强转成字符串
    expect(challenge?.type).toBe(1)
  })

  it('已经是验证页的地址不再拼一层', () => {
    expect(parseKuaishouCaptcha({ result: 2001, captchaConfig: JSON.stringify({ url: H5_URL }) })?.url).toBe(H5_URL)
  })
})

describe('PC GraphQL 风控响应（result 400002）', () => {
  it('形状二：业务码嵌在 data 里，地址在 data.url', () => {
    const challenge = parseKuaishouCaptcha({
      data: { result: KUAISHOU_PC_CAPTCHA_RESULT, url: PC_URL, jsSdkUrl: '//static.yximgs.com/iv.umd.js' }
    })
    expect(challenge?.url).toBe(PC_URL)
    expect(challenge?.jsSdkUrl).toBe('https://static.yximgs.com/iv.umd.js')
    expect(challenge?.result).toBe(400002)
    expect(challenge?.session).toBe('PCSESSION')
  })

  it('形状一：地址在 data.captcha —— 服务端直接这么返回，不是前端改写的', () => {
    // 2026-09-26 用 credentials: 'omit' 打 www.kuaishou.com/graphql 实测
    const challenge = parseKuaishouCaptcha({
      errors: [{ message: 'Need captcha', path: ['visionSubCommentList'] }],
      data: { visionSubCommentList: null, captcha: { url: PC_URL, jsSdkUrl: '//x/y.js' } }
    })
    expect(challenge?.url).toBe(PC_URL)
    expect(challenge?.jsSdkUrl).toBe('https://x/y.js')
    // errors 那条形状顶层与 data 里都没有业务码，兜底成 PC 的 400002
    expect(challenge?.result).toBe(400002)
  })

  it('票据字段从验证页 query 里抽出来平铺', () => {
    const challenge = parseKuaishouCaptcha({ data: { captcha: { url: PC_URL } } })
    expect(challenge?.session).toBe('PCSESSION')
    expect(challenge?.bizName).toBe('ANTICRAWL_COMMON')
    // query 里的 type 是字符串，原样透出不强转成数字
    expect(challenge?.type).toBe('1')
    expect(challenge?.configUrl).toBe('https://captcha.zt.kuaishou.com/rest/zt/captcha/sliding/config')
  })
})

describe('不该误报的情形', () => {
  it('正常响应返回 undefined', () => {
    expect(parseKuaishouCaptcha({ result: 1, photo: { id: 'p1' } })).toBeUndefined()
    expect(parseKuaishouCaptcha({ data: { visionVideoDetail: { status: 1 } } })).toBeUndefined()
  })

  it('非对象输入不炸', () => {
    for (const input of [null, undefined, '', 'text', 42, []]) {
      expect(parseKuaishouCaptcha(input)).toBeUndefined()
    }
  })

  it('地址不在滑块域上时宁可不认 —— 不把来路不明的 URL 当验证页交出去', () => {
    expect(parseKuaishouCaptcha({ result: 2001, captchaConfig: JSON.stringify({ url: 'https://evil.example.com/x' }) })).toBeUndefined()
    expect(parseKuaishouCaptcha({ data: { result: 400002, url: 'https://evil.example.com/x' } })).toBeUndefined()
  })
})
