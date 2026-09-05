import { PLATFORM_RUNTIME } from 'amagi/client/runtime'
import { PLATFORMS } from 'amagi/contracts/platform'
/**
 * 平台运行期依赖表的装配契约。
 *
 * 这张表是「同一平台在任何入口（client fetcher / 静态 fetcher / HTTP 路由）下
 * 判定行为一致」的唯一来源。少写一项不会有编译错误也不会有测试失败 ——
 * `execute` 在 `ctx.judge` 缺失时会退到「HTTP 2xx 即成功」那条兜底，于是该平台
 * 的**全部业务失败都变成成功**。
 *
 * 快手就这么漏过两次：`PLATFORM_RUNTIME.kuaishou` 长期是 `{}`，
 * ① `kuaishouJudge` 写好了、单测覆盖了，却从未被调用过一次 —— 表现是
 * `{ result: 2, error_msg: null }` 带着 HTTP 200 判成 `success: true`；
 * ② `KuaishouSigner` 同样写好了、也导出了，却因为没有 `signers` 表而零调用点，
 * 于是每个快手请求都不带 `__NS_hxfalcon`，只能拿 cookie 当签名的替代凭证。
 * 两处是同一个位置的同一类漏项，所以下面按平台**遍历**断言，而不是逐个平台列。
 */
import { describe, expect, it } from 'vitest'

describe('PLATFORM_RUNTIME 的装配', () => {
  it('四个平台一个不少', () => {
    expect(Object.keys(PLATFORM_RUNTIME).sort()).toEqual([...PLATFORMS].sort())
  })

  it('每个平台都装了 judge —— 缺一个等于该平台永不判失败', () => {
    for (const platform of PLATFORMS) {
      expect(PLATFORM_RUNTIME[platform].judge, `${platform} 没装 judge`).toBeTypeOf('function')
    }
  })

  it('装的 judge 真的会判失败（拿一个非 2xx 过一遍）', () => {
    for (const platform of PLATFORMS) {
      const verdict = PLATFORM_RUNTIME[platform].judge!({}, { status: 403 })
      expect(verdict.ok, `${platform} 的 judge 放过了 HTTP 403`).toBe(false)
    }
  })

  it('每个平台都装了签名器表 —— 缺一个等于该平台的请求从不签名', () => {
    for (const platform of PLATFORMS) {
      const signers = PLATFORM_RUNTIME[platform].signers
      expect(signers, `${platform} 没装 signers`).toBeTypeOf('object')
      expect(Object.keys(signers!).length, `${platform} 的 signers 是空表`).toBeGreaterThan(0)
    }
  })

  it('表里每一项都是函数（混进实例之类的非 SignFn 会让 resolveSigner 直接抛）', () => {
    for (const platform of PLATFORMS) {
      for (const [name, fn] of Object.entries(PLATFORM_RUNTIME[platform].signers!)) {
        expect(fn, `${platform} 的签名器 '${name}' 不是函数`).toBeTypeOf('function')
      }
    }
  })

  // `challenge` 与前两项不同，是**可选**的：只有会给出验证页地址的平台才装。
  // 所以这里不能断言「四个平台都有」，只能钉住「装了的必须是函数」＋
  // 「快手必须装」—— 后者是 `error.challenge` 唯一的生产者，漏了就等于
  // `CAPTCHA_REQUIRED` 又变回一条不给出路的死信
  it('装了 challenge 的平台，装的是函数', () => {
    for (const platform of PLATFORMS) {
      const challenge = PLATFORM_RUNTIME[platform].challenge
      if (challenge !== undefined) {
        expect(challenge, `${platform} 的 challenge 不是函数`).toBeTypeOf('function')
      }
    }
  })

  it('快手装了 challenge，且能从真实 2001 响应里取出滑块地址', () => {
    const challenge = PLATFORM_RUNTIME.kuaishou.challenge
    expect(challenge, '快手没装 challenge —— error.challenge 会永远缺席').toBeTypeOf('function')

    const parsed = challenge!({
      result: 2001,
      error_msg: '[2001] antispam need captcha',
      // 平台给的是**字符串形式的 JSON**，忘了二次解析就拿到一串转义引号
      captchaConfig: JSON.stringify({
        type: 1,
        url: 'https://captcha.zt.kuaishou.com/rest/zt/captcha/sliding/config?captchaSession=SESSION1&bizName=DEFAULT',
        jsSdkUrl: '//ali2.a.yximgs.com/static/captcha/sdk/kwaiCaptcha.umd.min.js'
      })
    })

    expect(parsed?.url).toContain('captcha.zt.kuaishou.com')
    expect(parsed?.session).toBe('SESSION1')
    expect(parsed?.bizName).toBe('DEFAULT')
    // 省略协议的 jsSdkUrl 要补上 https，否则浏览器当相对路径
    expect(parsed?.jsSdkUrl).toBe('https://ali2.a.yximgs.com/static/captcha/sdk/kwaiCaptcha.umd.min.js')
    expect(parsed?.result).toBe(2001)
  })
})
