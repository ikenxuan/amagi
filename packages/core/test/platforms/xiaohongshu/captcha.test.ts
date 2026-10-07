import { AmagiHeaders } from 'amagi/contracts/request'
import { XIAOHONGSHU_ANTI_SPAM_STATUS, XIAOHONGSHU_ANTI_SPIDER_STATUS, parseXiaohongshuCaptcha } from 'amagi/platforms/xiaohongshu/captcha'
import { describe, expect, it } from 'vitest'

/**
 * 小红书验证码挑战的中转契约。
 *
 * amagi 对风控的立场是**只中转不绕过**：把验证页地址交给调用方，不引入识别或
 * 轨迹模拟。所以这里验的是「地址能不能被正确取出来」，不是「能不能过验证」。
 *
 * 与快手那一份最大的不同：**信号只在响应头上**。2026-10-01 实测一条真实 461 —— 响应体
 * 是 `{"code":0,"success":true,"data":{},"msg":""}`（请求在协议层是被接受的），
 * 可用信息只有 `verifyuuid` 与 `verifytype` 两个响应头。所以只读 body 的提取器在
 * 小红书上必然空手而归，这也是 `ChallengeExtractor` 从 `(raw)` 扩宽到 `(raw, http)`
 * 的原因。下面「body 是 null 也照样给出挑战」那条用例钉的就是这件事。
 *
 * 三个坑，都在下面被钉住：
 * - 验证页 query 名**大小写敏感**（`verifyUuid` / `verifyType`），与全小写的响应头名不同
 * - `verifytype: 301` 不在平台 SDK 自己的枚举（101~290）里，但**照抄不改**
 * - 没票据就什么都不给 —— 空壳验证页打开也过不去
 */

/** 一条真实 461 的响应体：`code` 是 0，一个字都用不上 */
const BODY_461 = { code: 0, success: true, data: {}, msg: '' }

/** 实测形状的票据（值本身是随机 uuid，不是真票据） */
const UUID = '1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8'

/** 真实管线递进来的就是 `AmagiHeaders`（`execute` 传的 `res.headers`） */
const res461 = (headers: Record<string, string>, status = XIAOHONGSHU_ANTI_SPIDER_STATUS) => ({
  status,
  headers: new AmagiHeaders(headers)
})

describe('461 响应头 → 验证页地址', () => {
  const challenge = parseXiaohongshuCaptcha(BODY_461, res461({ verifyuuid: UUID, verifytype: '301' }))

  it('拼出真站确认过的验证页地址', () => {
    // 2026-10-01 在真站确认：这个地址配 verifyType=102 渲染出可拖动的真实滑块
    expect(challenge?.url).toBe(`https://www.xiaohongshu.com/website-login/captcha?verifyUuid=${UUID}&verifyType=301`)
  })

  it('query 名大小写敏感：是 verifyUuid / verifyType，不是响应头的全小写写法', () => {
    // 前端 SDK 读的是 `getSearchValue('verifyUuid')`，写成 verifyuuid 它取不到
    expect(challenge?.url).toContain('verifyUuid=')
    expect(challenge?.url).toContain('verifyType=')
    expect(challenge?.url).not.toContain('verifyuuid=')
  })

  it('票据进 session，配置接口进 configUrl', () => {
    expect(challenge?.session).toBe(UUID)
    expect(challenge?.configUrl).toBe('https://edith.xiaohongshu.com/api/redcaptcha/v2/getconfig')
  })

  it('verifytype 原样透出，不替换成 SDK 枚举里「能渲染」的值', () => {
    // 301 不在平台 SDK 的 verifyType 枚举（101~290）里。换成 102 虽然能渲染出滑块，
    // 但那是在编一个平台没说过的验证流程 —— 页面并不对应手里这张票据
    expect(challenge?.type).toBe('301')
  })

  it('result 放 HTTP 状态：461 的响应体 code 是 0，放它没有信息', () => {
    expect(challenge?.result).toBe(461)
  })
})

describe('raw 一个字都不用', () => {
  it('body 是 null 也照样给出挑战 —— 信号全在响应头上', () => {
    expect(parseXiaohongshuCaptcha(null, res461({ verifyuuid: UUID }))?.session).toBe(UUID)
  })

  it('契约只要求 headers 能按名取值，不绑定 AmagiHeaders', () => {
    // 调用方自己拿着一份抓包响应时，`fetch` 的 Headers 直接能传
    const challenge = parseXiaohongshuCaptcha(BODY_461, {
      status: 461,
      headers: { get: (name: string) => (name.toLowerCase() === 'verifyuuid' ? UUID : undefined) }
    })
    expect(challenge?.session).toBe(UUID)
  })

  it('响应头名大小写不敏感', () => {
    expect(parseXiaohongshuCaptcha(BODY_461, res461({ VerifyUuid: UUID, VerifyType: '301' }))?.type).toBe('301')
  })
})

describe('没票据就什么都不给', () => {
  it('缺 verifyuuid 时返回 undefined', () => {
    // 不带票据的验证页打开只是一个空壳，宁可不给，也不交出一个过不去的地址
    expect(parseXiaohongshuCaptcha(BODY_461, res461({ verifytype: '301' }))).toBeUndefined()
  })

  it('verifyuuid 是空串或纯空白时也不给', () => {
    expect(parseXiaohongshuCaptcha(BODY_461, res461({ verifyuuid: '' }))).toBeUndefined()
    expect(parseXiaohongshuCaptcha(BODY_461, res461({ verifyuuid: '   ' }))).toBeUndefined()
  })

  it('完全没有响应头时不给，也不抛', () => {
    expect(parseXiaohongshuCaptcha(BODY_461, { status: 461 })).toBeUndefined()
    expect(parseXiaohongshuCaptcha(BODY_461)).toBeUndefined()
  })
})

describe('边界', () => {
  it('没有 verifytype 时只带票据，不编一个类型出来', () => {
    const challenge = parseXiaohongshuCaptcha(BODY_461, res461({ verifyuuid: UUID }))
    expect(challenge?.url).toBe(`https://www.xiaohongshu.com/website-login/captcha?verifyUuid=${UUID}`)
    expect(challenge?.type).toBeUndefined()
  })

  it('海外票据前缀走 rednote 配置域', () => {
    // SDK 的判据：verifyUuid 以 sg__ / ae__ / gcp__ 开头时 getconfig 打 webapi.rednote.com
    for (const prefix of ['sg__', 'ae__', 'gcp__']) {
      const challenge = parseXiaohongshuCaptcha(BODY_461, res461({ verifyuuid: `${prefix}${UUID}` }))
      expect(challenge?.configUrl).toBe('https://webapi.rednote.com/api/redcaptcha/v2/getconfig')
    }
  })

  it('471（antiSpam）的状态同样原样透出', () => {
    const challenge = parseXiaohongshuCaptcha(BODY_461, res461({ verifyuuid: UUID }, XIAOHONGSHU_ANTI_SPAM_STATUS))
    expect(challenge?.result).toBe(471)
  })

  it('票据里的特殊字符被编码进 query，不污染地址结构', () => {
    const challenge = parseXiaohongshuCaptcha(BODY_461, res461({ verifyuuid: 'a&verifyType=102#x' }))
    expect(challenge?.url).toBe('https://www.xiaohongshu.com/website-login/captcha?verifyUuid=a%26verifyType%3D102%23x')
    expect(challenge?.session).toBe('a&verifyType=102#x')
  })
})

describe('两个状态码常量', () => {
  it('461 = antiSpider，471 = antiSpam（平台 SDK 自己的命名）', () => {
    expect(XIAOHONGSHU_ANTI_SPIDER_STATUS).toBe(461)
    expect(XIAOHONGSHU_ANTI_SPAM_STATUS).toBe(471)
  })
})
