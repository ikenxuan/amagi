import { KUAISHOU_H5_CAPTCHA_RESULT, KUAISHOU_PC_CAPTCHA_RESULT, parseKuaishouCaptcha } from 'amagi/platforms/kuaishou/captcha'
import { describe, expect, it } from 'vitest'

/**
 * 风控滑块地址的中转契约。
 *
 * amagi 对风控的立场是**只中转不绕过**：把地址交给调用方，不引入识别或轨迹模拟。
 * 所以这里验的是「地址能不能被正确取出来」，不是「能不能过验证」。
 *
 * 两种响应格式各有一个坑，两个都在下面被钉住：
 * - H5 的 `captchaConfig` 是**字符串形式的 JSON**，忘了二次解析就拿到一串转义引号
 * - PC 的 `jsSdkUrl` 省略协议（`//static.yximgs.com/…`），不补协议会被当成相对路径
 *
 * 业务码 2001 是实测撞到过的：2026-09-04 的无 cookie 探针里 `/rest/wd/photo/info`
 * 稳定命中，而同样签名、同样带 body 的 `comment/list` 正常返回 —— 所以它不是签名
 * 问题（签名错是 50），是那条接口上的行为风控。
 */

const H5_URL = 'https://captcha.zt.kuaishou.com/mobile/h5/redirect/index.html?captchaSession=SESSION123&type=1&bizName=ANTICRAWL_DEFAULT'
const PC_URL = 'https://captcha.zt.kuaishou.com/iframe/index.html?captchaSession=PCSESSION&type=1&bizName=ANTICRAWL_DEFAULT'

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

describe('PC GraphQL 风控响应（result 400002）', () => {
  it('服务端原始形状：地址在 data.url', () => {
    const challenge = parseKuaishouCaptcha({
      data: { result: KUAISHOU_PC_CAPTCHA_RESULT, url: PC_URL, jsSdkUrl: '//static.yximgs.com/iv.umd.js' }
    })
    expect(challenge?.url).toBe(PC_URL)
    expect(challenge?.jsSdkUrl).toBe('https://static.yximgs.com/iv.umd.js')
    expect(challenge?.result).toBe(400002)
    expect(challenge?.session).toBe('PCSESSION')
  })

  it('前端 afterware 改写后的形状：地址在 data.captcha', () => {
    expect(parseKuaishouCaptcha({ data: { captcha: { url: PC_URL, jsSdkUrl: '//x/y.js' } } })?.url).toBe(PC_URL)
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
