import { AmagiHeaders } from 'amagi/contracts/request'
import { parseDouyinCaptcha } from 'amagi/platforms/douyin/captcha'
import { douyinJudge, douyinVerifyParams } from 'amagi/platforms/douyin/judge'
import { describe, expect, it } from 'vitest'

/**
 * 抖音验证码挑战的中转契约。
 *
 * amagi 对风控的立场是**只中转不绕过**：把验证页地址交给调用方，不引入识别或
 * 轨迹模拟。所以这里验的是「地址能不能被正确拼出来」，不是「能不能过验证」。
 *
 * 与小红书一样，**信号只在响应头上**；不同的是头里只有验证参数、没有地址 ——
 * 验证页地址是验证中心渲染层自己拼的（`rmc.bytedance.com/verifycenter/captcha/v2`
 * + query），这里照它的拼法来。
 *
 * 坑都在下面被钉住：
 * - `fp` / `aid` 缺一个就什么都不给 —— 缺 `aid` 取不了题，缺 `fp` 放行落不到请求的指纹上
 * - `nocaptcha_collect` 是无感采集，不是验证，不给地址
 * - 判定与提取共用一份「取哪个头」的规则，不会一边认、一边不认
 */

/**
 * 验证参数。键集合照 2026-09-26 实测（游客 `favorite`，`subtype: slide`）的那一份，
 * **值全是合成的** —— 真实的 `fp` / `detail` / `log_id` 不进仓库。
 */
const verifyParams = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  code: 10000,
  from: 'synthetic',
  type: 'verify',
  version: '',
  region: 'cn',
  subtype: 'slide',
  ui_type: '',
  detail: 'SYNTHETIC_DETAIL',
  verify_event: '',
  fp: 'verify_synthetic_fp',
  server_sdk_env: '{"idc":"synthetic"}',
  log_id: 'SYNTHETIC_LOG_ID',
  is_assist_mobile: false,
  is_complex_sms: false,
  identity_action: '',
  identity_scene: '',
  login_status: 0,
  aid: 6383,
  ...overrides
})

const b64 = (text: string): string => Buffer.from(text, 'utf8').toString('base64')

/** 真实管线递进来的就是 `AmagiHeaders`（`execute` 传的 `res.headers`） */
const res200 = (headers: Record<string, string>, status = 200) => ({ status, headers: new AmagiHeaders(headers) })

/** 实测形状：HTTP 200、body 0 字节、`x-vc-bdturing-parameters` 是 base64 JSON */
const sampleHeaders = (overrides: Record<string, unknown> = {}) => ({
  'x-vc-bdturing-parameters': b64(JSON.stringify(verifyParams(overrides)))
})

describe('验证头 → 验证页地址', () => {
  const challenge = parseDouyinCaptcha('', res200(sampleHeaders()))
  const url = new URL(challenge?.url ?? 'about:blank')

  it('落在渲染层拼 iframe 的那个入口上', () => {
    expect(`${url.origin}${url.pathname}`).toBe('https://rmc.bytedance.com/verifycenter/captcha/v2')
  })

  it('aid / fp 取自验证参数本身，不另编', () => {
    expect(url.searchParams.get('aid')).toBe('6383')
    expect(url.searchParams.get('fp')).toBe('verify_synthetic_fp')
  })

  it('host 是渲染层 outputParams() 的默认验证域', () => {
    expect(url.searchParams.get('host')).toBe('https://verify.zijieapi.com')
  })

  it('verify_data 是解码后的原文，验证页 JSON.parse 回来与下发的一致', () => {
    expect(JSON.parse(url.searchParams.get('verify_data') ?? 'null')).toEqual(verifyParams())
  })

  it('type 放 subtype，result 放验证参数里的 code（HTTP 200 没有信息）', () => {
    expect(challenge?.type).toBe('slide')
    expect(challenge?.result).toBe(10000)
  })

  it('不编会话票据：放行挂在 fp 上，调用方用同一份 cookie 重发即可', () => {
    expect(challenge?.session).toBeUndefined()
  })

  it('raw 一个字都不用：body 是空串、null 还是正常 JSON 都一样', () => {
    for (const raw of ['', null, { status_code: 0, aweme_list: [] }]) {
      expect(parseDouyinCaptcha(raw, res200(sampleHeaders()))?.url).toBe(challenge?.url)
    }
  })
})

describe('两个头、两种编码都认（与判定同一份规则）', () => {
  it('bdturing-verify 直接给 JSON', () => {
    const challenge = parseDouyinCaptcha('', res200({ 'bdturing-verify': JSON.stringify(verifyParams({ subtype: 'text' })) }))
    expect(challenge?.type).toBe('text')
  })

  it('x-vc-bdturing-parameters 不是 base64 时按原文', () => {
    const challenge = parseDouyinCaptcha('', res200({ 'x-vc-bdturing-parameters': JSON.stringify(verifyParams()) }))
    expect(challenge?.type).toBe('slide')
  })

  it('bdturing-verify 优先：它是无感采集时不再看下一个头', () => {
    const headers = {
      'bdturing-verify': JSON.stringify(verifyParams({ subtype: 'nocaptcha_collect' })),
      ...sampleHeaders()
    }
    expect(parseDouyinCaptcha('', res200(headers))).toBeUndefined()
    // 判定那边同样不认 —— 两边共用 douyinVerifyParams
    expect(douyinJudge('', res200(headers)).code).toBe('EMPTY_RESPONSE')
  })

  it('头名大小写不敏感', () => {
    const challenge = parseDouyinCaptcha('', res200({ 'X-VC-BDTURING-PARAMETERS': sampleHeaders()['x-vc-bdturing-parameters'] }))
    expect(challenge?.type).toBe('slide')
  })

  it('douyinVerifyParams 交出的就是解码后的文本', () => {
    expect(douyinVerifyParams(new AmagiHeaders(sampleHeaders()))).toBe(JSON.stringify(verifyParams()))
    expect(douyinVerifyParams(undefined)).toBeUndefined()
  })
})

describe('拼不出能过的地址就什么都不给', () => {
  it('无感采集（nocaptcha_collect）不是验证', () => {
    expect(parseDouyinCaptcha('', res200(sampleHeaders({ subtype: 'nocaptcha_collect' })))).toBeUndefined()
  })

  it('缺 fp：过了验证放行也落不到这次请求的指纹上', () => {
    expect(parseDouyinCaptcha('', res200(sampleHeaders({ fp: undefined })))).toBeUndefined()
    expect(parseDouyinCaptcha('', res200(sampleHeaders({ fp: '' })))).toBeUndefined()
    expect(parseDouyinCaptcha('', res200(sampleHeaders({ fp: '   ' })))).toBeUndefined()
  })

  it('缺 aid：验证页取不了题', () => {
    expect(parseDouyinCaptcha('', res200(sampleHeaders({ aid: undefined })))).toBeUndefined()
    expect(parseDouyinCaptcha('', res200(sampleHeaders({ aid: null })))).toBeUndefined()
  })

  it('验证参数不是 JSON 对象：判定照样认（SDK 也会去渲染），但拼不出地址', () => {
    for (const text of ['not-json', '[]', '"slide"', 'null']) {
      const http = res200({ 'bdturing-verify': text })
      expect(douyinJudge('', http).code).toBe('CAPTCHA_REQUIRED')
      expect(parseDouyinCaptcha('', http)).toBeUndefined()
    }
  })

  it('非 2xx 不认，与 SDK、与判定一致', () => {
    expect(parseDouyinCaptcha('', res200(sampleHeaders(), 403))).toBeUndefined()
  })

  it('没有验证头、没传 http 时不给，也不抛', () => {
    expect(parseDouyinCaptcha('', res200({ 'content-type': 'application/json' }))).toBeUndefined()
    expect(parseDouyinCaptcha('', { status: 200 })).toBeUndefined()
    expect(parseDouyinCaptcha('')).toBeUndefined()
  })

  it('响应体通道（verify_center_decision_conf）没有 fp / aid，不出地址', () => {
    const raw = { status_code: 10000, verify_center_decision_conf: '{"verify_center_decision":"verify_hit"}' }
    expect(douyinJudge(raw, { status: 200 }).code).toBe('CAPTCHA_REQUIRED')
    expect(parseDouyinCaptcha(raw, res200({}))).toBeUndefined()
  })
})

describe('边界', () => {
  it('aid 是字符串时同样认', () => {
    expect(new URL(parseDouyinCaptcha('', res200(sampleHeaders({ aid: '6383' })))?.url ?? '').searchParams.get('aid')).toBe('6383')
  })

  it('参数里的特殊字符被编码进 query，不污染地址结构', () => {
    const challenge = parseDouyinCaptcha('', res200(sampleHeaders({ fp: 'verify_a&host=https://evil.example#x' })))
    const url = new URL(challenge?.url ?? '')
    expect(url.searchParams.get('fp')).toBe('verify_a&host=https://evil.example#x')
    expect(url.searchParams.getAll('host')).toEqual(['https://verify.zijieapi.com'])
    expect(url.hash).toBe('')
  })

  it('没有 subtype / code 时不编', () => {
    const challenge = parseDouyinCaptcha('', res200(sampleHeaders({ subtype: undefined, code: undefined })))
    expect(challenge?.url).toBeTypeOf('string')
    expect(challenge?.type).toBeUndefined()
    expect(challenge?.result).toBeUndefined()
  })
})
