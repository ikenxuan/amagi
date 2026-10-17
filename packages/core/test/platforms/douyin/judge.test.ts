import { PLATFORM_RUNTIME } from 'amagi/client/runtime'
import { errorMessageFor } from 'amagi/contracts/error'
import { AmagiHeaders } from 'amagi/contracts/request'
import { searchJudge } from 'amagi/platforms/douyin/endpoints/search'
import {
  douyinJudge,
  douyinSignatureRefusal,
  isDouyinArgusBody,
  isDouyinCaptchaBody,
  isDouyinCaptchaHeader
} from 'amagi/platforms/douyin/judge'
/**
 * platforms/douyin/judge 的契约。
 *
 * 判据：
 * ① `status_code` 缺失时判**成功**（修 v6 的 `undefined !== 0` 误判）
 * ② `filter_detail` → `kind: 'forbidden'`
 * ③ 空响应（`''`）→ `kind: 'auth'` / `code: 'EMPTY_RESPONSE'`
 * ④ Argus 拦截文本 → `kind: 'risk'` / `code: 'ANTIBOT_PAGE'`（可重试）
 * ⑤ 业务码没结论时看 HTTP 状态
 * ⑥ Argus 文本点名签名时 → `code: 'SIGNATURE_REFUSED'`（**不可**重试，是 amagi
 *    自己的签名问题，与「这个账号被风控」分开）
 * ⑦ 验证页（`verify_center_decision_conf`）→ `kind: 'risk'` / `code: 'CAPTCHA_REQUIRED'`
 *    （不可重试；这条通道只定性，不产出地址）
 * ⑧ 验证头（`bdturing-verify` / `x-vc-bdturing-parameters`）→ 同上，且排在一切 body 判据之前；
 *    验证页地址只从这条通道拼（`captcha.test.ts`）
 */
import { describe, expect, it } from 'vitest'

describe('① status_code 缺失判成功（修 undefined !== 0 误判）', () => {
  it('status_code: 0 判成功', () => {
    expect(douyinJudge({ status_code: 0, data: {} }, { status: 200 }).ok).toBe(true)
  })

  it('status_code 缺失判成功（v6 的 undefined !== 0 会误判失败）', () => {
    expect(douyinJudge({ some: 'payload' }, { status: 200 }).ok).toBe(true)
    expect(douyinJudge({ data: {} }, { status: 200 }).ok).toBe(true)
  })

  it('status_code 非 0 判失败', () => {
    const verdict = douyinJudge({ status_code: 2154, status_msg: '风控拦截' }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      // 刻意不按码分类：抖音没有公开业务码表，同一个码在不同接口含义还不一样。
      // 真实码由 runtime 放进 error.platform.code，这里只声明「不分类」
      expect(verdict.kind).toBe('unknown')
      expect(verdict.code).toBe('PLATFORM_ERROR')
      expect(verdict.retryable).toBe(false)
    }
  })

  it('status_code 是字符串数字时同样判定（字符串 "8" 判失败）', () => {
    expect(douyinJudge({ status_code: '0' }, { status: 200 }).ok).toBe(true)
    expect(douyinJudge({ status_code: '8' }, { status: 200 }).ok).toBe(false)
  })
})

describe('② filter_detail 判 forbidden', () => {
  it('filter_detail.filter_reason 存在判 forbidden / PRIVATE', () => {
    const verdict = douyinJudge({ status_code: 0, filter_detail: { filter_reason: '内容不可见' } }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('forbidden')
      expect(verdict.code).toBe('PRIVATE')
    }
  })

  it('filter_detail 存在但 filter_reason 为空判成功', () => {
    expect(douyinJudge({ status_code: 0, filter_detail: { filter_reason: '' } }, { status: 200 }).ok).toBe(true)
    expect(douyinJudge({ status_code: 0, filter_detail: {} }, { status: 200 }).ok).toBe(true)
  })
})

describe('③ 空响应判 auth / EMPTY_RESPONSE，④ Argus 判 risk', () => {
  it('空字符串判 auth / EMPTY_RESPONSE', () => {
    const verdict = douyinJudge('', { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      // kind 仍是 auth（三种成因里 ck 失效最常见，调用方的分支不该改行为），
      // code 换成 EMPTY_RESPONSE —— 「你的 ck 可能失效了」那句把排查带偏过两次，
      // 而空响应最常见的成因是设备类参数（多为 webid）与会话不匹配
      expect(verdict.kind).toBe('auth')
      expect(verdict.code).toBe('EMPTY_RESPONSE')
    }
  })

  it('EMPTY_RESPONSE 的兜底文案把三种成因都点名', () => {
    const message = errorMessageFor('EMPTY_RESPONSE')
    expect(message).toContain('cookie 会话不匹配')
    expect(message).toContain('不公开')
    expect(message).toContain('已失效')
  })

  it('Argus 拦截文本被认出来', () => {
    expect(isDouyinArgusBody('Blocked by ArgusSecurityPlugin Uifid Not Found')).toBe(true)
    expect(isDouyinArgusBody('blocked by something')).toBe(true)
    // 正常的 JSON 分块流不能被认成拦截（综合搜索的响应本来就是字符串）
    expect(isDouyinArgusBody('1f2\r\n{"status_code":0,"data":[]}')).toBe(false)
    expect(isDouyinArgusBody({ status_code: 0 })).toBe(false)
    expect(isDouyinArgusBody('')).toBe(false)
  })

  it('没点名签名的 Argus 拦截走公共前置判 risk / ANTIBOT_PAGE（可重试）', () => {
    // 拦截文本里没有「签名不对」那几个片段时，成因不明 —— 当作一般风控，重签可能有用
    const verdict = douyinJudge('Blocked by ArgusSecurityPlugin', { status: 403 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('ANTIBOT_PAGE')
      expect(verdict.retryable).toBe(true)
    }
  })

  it('null / undefined 判成功（交给 normalize）', () => {
    expect(douyinJudge(null, { status: 200 }).ok).toBe(true)
    expect(douyinJudge(undefined, { status: 200 }).ok).toBe(true)
  })
})

describe('④ 非 JSON 响应体判失败（WAF / 反爬页）', () => {
  it('非空字符串判 risk / ANTIBOT_PAGE', () => {
    const verdict = douyinJudge('some string', { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('ANTIBOT_PAGE')
      expect(verdict.retryable).toBe(true)
    }
  })

  it('回归：Argus 拦截页（403 + 纯文本）不再判成功', () => {
    // 真实响应：HTTP 403，body 是这一句纯文本，既不是 JSON 也没有 status_code。
    // 旧判定的第三条「非对象一律判成功」把它当成功透出，data 就是这句话，
    // 调用方读 data.aweme_detail 才炸。
    //
    // 这一句点名了 uifid，所以码是 SIGNATURE_REFUSED 而不是 ANTIBOT_PAGE
    // （见 ⑥）。这里只锁「不判成功」与 kind，码由那一组断言。
    const verdict = douyinJudge('Blocked by ArgusSecurityPlugin Uifid Not Found', { status: 403 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
    }
  })
})

describe('⑤ 业务码没结论时看 HTTP 状态', () => {
  it('403 + 合法 JSON 但无业务码 → risk / RISK_CONTROL', () => {
    const verdict = douyinJudge({ data: {} }, { status: 403 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('RISK_CONTROL')
    }
  })

  it('429 → rate_limit / RATE_LIMITED；503 → unavailable', () => {
    expect(douyinJudge({ status_code: 0 }, { status: 429 }).code).toBe('RATE_LIMITED')
    expect(douyinJudge({ status_code: 0 }, { status: 503 }).code).toBe('PLATFORM_UNAVAILABLE')
  })

  it('业务码已给出结论时不被 HTTP 状态改判', () => {
    // filter_detail 的 forbidden 结论优先于 403 的 risk 结论
    const verdict = douyinJudge({ status_code: 0, filter_detail: { filter_reason: '内容不可见' } }, { status: 403 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.kind).toBe('forbidden')
  })

  it('null 响应体 + 非 2xx 也判失败', () => {
    expect(douyinJudge(null, { status: 403 }).ok).toBe(false)
  })
})

describe('⑥ 签名被拒与一般风控分开归因', () => {
  it('四个片段都判 risk / SIGNATURE_REFUSED 且不可重试', () => {
    for (const body of [
      'Blocked by ArgusSecurityPlugin Uifid Not Found',
      'Blocked by ArgusSecurityPlugin Signature Not Found',
      'Blocked by ArgusSecurityPlugin Sign Invalid',
      'Blocked by ArgusSecurityPlugin Sign Expired'
    ]) {
      const verdict = douyinJudge(body, { status: 403 })
      expect(verdict.ok, body).toBe(false)
      if (!verdict.ok) {
        // kind 仍是 risk：请求确实被拒了，判成业务错误会让坏掉的签名器看起来很健康
        expect(verdict.kind, body).toBe('risk')
        expect(verdict.code, body).toBe('SIGNATURE_REFUSED')
        // 不可重试：retryFresh 换的是 msToken / a_bogus，补不出缺失的访客 id
        expect(verdict.retryable, body).toBe(false)
      }
    }
  })

  it('大小写与前后缀都不影响判定（平台原文大小写不稳定）', () => {
    expect(douyinJudge('blocked by argussecurityplugin uifid not found', { status: 403 }).code).toBe('SIGNATURE_REFUSED')
    expect(douyinJudge('403 Blocked by ArgusSecurityPlugin Sign Invalid\n', { status: 403 }).code).toBe('SIGNATURE_REFUSED')
  })

  it('没点名签名的 Argus 拦截仍判 ANTIBOT_PAGE（可重试，换一套令牌有意义）', () => {
    const verdict = douyinJudge('Blocked by ArgusSecurityPlugin', { status: 403 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.code).toBe('ANTIBOT_PAGE')
      expect(verdict.retryable).toBe(true)
    }
  })

  it('douyinSignatureRefusal 只认字符串，且回报命中的片段', () => {
    expect(douyinSignatureRefusal('Blocked by ArgusSecurityPlugin Uifid Not Found')).toBe('uifid not found')
    expect(douyinSignatureRefusal('Blocked by ArgusSecurityPlugin')).toBeUndefined()
    expect(douyinSignatureRefusal({ status_code: 0 })).toBeUndefined()
    expect(douyinSignatureRefusal('')).toBeUndefined()
  })

  it('兜底文案指明方向：是 amagi 的签名问题，换 cookie 无用', () => {
    const message = errorMessageFor('SIGNATURE_REFUSED')
    expect(message).toContain('签名')
    expect(message).toContain('换 cookie 无用')
  })
})

describe('⑦ 人机验证页（verify_center）', () => {
  /**
   * 实物形状：`status_code: 10000` + 字符串形式 JSON 的 `verify_center_decision_conf`。
   * 线上实物形状（合成样本：形状可信、具体值不可信）。这里只断言「定性」，
   * 不断言地址 —— 那份响应里本来就没有 URL。
   */
  const VERIFY_BODY = {
    status_code: 10000,
    status_msg: '',
    verify_center_decision_conf: JSON.stringify({
      verify_center_decision: 'verify_hit',
      decision_conf: { subtype: 'slide' }
    })
  }

  it('判 risk / CAPTCHA_REQUIRED，而不是 unknown / PLATFORM_ERROR', () => {
    const verdict = douyinJudge(VERIFY_BODY, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('CAPTCHA_REQUIRED')
      // 重试无用：要人过验证，不是换一套令牌的事
      expect(verdict.retryable).toBe(false)
    }
  })

  it('排在 status_code 之前 —— 否则 10000 会被那一支吃掉', () => {
    // 去掉判据字段，同一个 10000 就落回「不按码分类」那条
    const { verify_center_decision_conf: _omitted, ...withoutMarker } = VERIFY_BODY
    const verdict = douyinJudge(withoutMarker, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.code).toBe('PLATFORM_ERROR')
  })

  it('按字段名判，不扫全文：简介里提到验证码的正常作品仍判成功', () => {
    // 盲扫子串会因为用户文案误判，而误判是静默的 —— 一次就冤枉一个健康账号
    const normal = {
      status_code: 0,
      aweme_detail: { desc: '教你怎么过 captcha 验证码和 verify_center 滑块' }
    }
    expect(douyinJudge(normal, { status: 200 }).ok).toBe(true)
  })

  it('字段为空值时不判风控（宁可漏判，不可误判）', () => {
    expect(douyinJudge({ status_code: 0, verify_center_decision_conf: '' }, { status: 200 }).ok).toBe(true)
    expect(douyinJudge({ status_code: 0, verify_center_decision_conf: null }, { status: 200 }).ok).toBe(true)
  })

  it('这条通道不产出验证页地址：响应体里没有验证页要的 fp / aid', () => {
    // 提取器装了（地址从验证头拼），但对响应体通道必须空手而归 —— 实物的
    // `verify_center_decision_conf` 只有决策信息，拼出来的地址过不去。
    // 静态 import，不走测试体内的动态 import —— 后者在冷启动 + 全量并行的门禁下
    // 会吃满 testTimeout（模块求值在 import 阶段，不吃测试超时）。
    const challenge = PLATFORM_RUNTIME.douyin.challenge
    expect(challenge).toBeTypeOf('function')
    const raw = { status_code: 10000, verify_center_decision_conf: '{"verify_center_decision":"verify_hit"}' }
    expect(challenge!(raw, { status: 200, headers: new AmagiHeaders({}) })).toBeUndefined()
  })

  it('顶层 verify_center_decision_conf 判 risk / CAPTCHA_REQUIRED（不可重试）', () => {
    const verdict = douyinJudge({ verify_center_decision_conf: '{"verify_center":1}' }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('CAPTCHA_REQUIRED')
      // 与快手的 CAPTCHA_REQUIRED 一致：验证码要人过，退避过不去。
      // Argus 的 ANTIBOT_PAGE 才是可重试的那一类（换凭据就可能过）
      expect(verdict.retryable).toBe(false)
    }
  })

  it('回归：验证页 status_code 为 0 / 缺失时不再判成功', () => {
    // 改之前这三份全判 { ok: true }：验证页的 status_code 是 0 或者根本没有，
    // 落进业务码那一支就成了「成功」，调用方拿到一个装着风控页的成功信封，
    // 只能靠读 aweme_detail 读出 undefined 才发现被拦了
    expect(douyinJudge({ verify_center_decision_conf: '{}' }, { status: 200 }).ok).toBe(false)
    expect(douyinJudge({ status_code: 0, verify_center_decision_conf: '{}' }, { status: 200 }).ok).toBe(false)
    expect(douyinJudge({ status_code: 0, data: { verify_center_decision_conf: '{}' } }, { status: 200 }).ok).toBe(false)
  })

  it('验证页结论优先于 status_code 与 HTTP 状态', () => {
    // 两个都给了结论时验证页赢：PLATFORM_ERROR / RISK_CONTROL 都比「要过验证码」笼统
    expect(douyinJudge({ status_code: 10000, verify_center_decision_conf: '{}' }, { status: 200 }).code).toBe('CAPTCHA_REQUIRED')
    expect(douyinJudge({ verify_center_decision_conf: '{}' }, { status: 403 }).code).toBe('CAPTCHA_REQUIRED')
  })

  it('isDouyinCaptchaBody 只认顶层与 data 一层，不误伤正常响应', () => {
    expect(isDouyinCaptchaBody({ verify_center_decision_conf: '{}' })).toBe(true)
    expect(isDouyinCaptchaBody({ data: { verify_center_decision_conf: '{}' } })).toBe(true)
    // 正常响应不能被认成验证页 —— 这种误判是静默的，比漏判更难查
    expect(isDouyinCaptchaBody({ status_code: 0, aweme_detail: { aweme_id: '1' } })).toBe(false)
    expect(isDouyinCaptchaBody({ data: { captcha_token: '' } })).toBe(false)
    expect(isDouyinCaptchaBody('Blocked by ArgusSecurityPlugin')).toBe(false)
    expect(isDouyinCaptchaBody(null)).toBe(false)
    expect(isDouyinCaptchaBody('')).toBe(false)
  })

  it('CAPTCHA_REQUIRED 有兜底文案', () => {
    expect(errorMessageFor('CAPTCHA_REQUIRED')).toBe('需要完成验证码')
  })
})

describe('⑧ 验证头判 risk / CAPTCHA_REQUIRED（主通道）', () => {
  // 合成的验证参数。真实值由验证中心下发，这里只保留判据用得到的形状
  const verifyParams = (subtype: string): string => JSON.stringify({ region: 'cn', subtype, log_id: 'synthetic', fp: 'synthetic' })
  const b64 = (text: string): string => Buffer.from(text, 'utf8').toString('base64')
  const headersOf = (init: Record<string, string>): AmagiHeaders => new AmagiHeaders(init)

  it('bdturing-verify 直接给 JSON → CAPTCHA_REQUIRED（不可重试）', () => {
    const verdict = douyinJudge(
      { status_code: 0, aweme_detail: {} },
      { status: 200, headers: headersOf({ 'bdturing-verify': verifyParams('slide') }) }
    )
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('CAPTCHA_REQUIRED')
      expect(verdict.retryable).toBe(false)
    }
  })

  it('回归：HTTP 200 + 看着正常的 body，只有头在说要验证 —— 不再判成功', () => {
    // 这正是浏览器里「详情页吃滑块」的形状：SDK 只看头，body 该是什么还是什么
    const headers = headersOf({ 'x-vc-bdturing-parameters': b64(verifyParams('slide')) })
    expect(douyinJudge({ status_code: 0, aweme_detail: { aweme_id: '1' } }, { status: 200 }).ok).toBe(true)
    expect(douyinJudge({ status_code: 0, aweme_detail: { aweme_id: '1' } }, { status: 200, headers }).ok).toBe(false)
  })

  it('x-vc-bdturing-parameters 是 base64 时解码后判；不是 base64 时按原文判', () => {
    expect(isDouyinCaptchaHeader(headersOf({ 'x-vc-bdturing-parameters': b64(verifyParams('slide')) }))).toBe(true)
    expect(isDouyinCaptchaHeader(headersOf({ 'x-vc-bdturing-parameters': verifyParams('slide') }))).toBe(true)
  })

  it('nocaptcha_collect 是无感采集，不算验证（SDK 只上报采集、放行原响应，不弹）', () => {
    expect(isDouyinCaptchaHeader(headersOf({ 'bdturing-verify': verifyParams('nocaptcha_collect') }))).toBe(false)
    expect(isDouyinCaptchaHeader(headersOf({ 'x-vc-bdturing-parameters': b64(verifyParams('nocaptcha_collect')) }))).toBe(false)
    const verdict = douyinJudge(
      { status_code: 0, aweme_detail: {} },
      { status: 200, headers: headersOf({ 'x-vc-bdturing-parameters': b64(verifyParams('nocaptcha_collect')) }) }
    )
    expect(verdict.ok).toBe(true)
  })

  it('subtype 解析不出来时仍算验证（SDK 那种情况下也会拿去渲染）', () => {
    expect(isDouyinCaptchaHeader(headersOf({ 'bdturing-verify': 'not-json' }))).toBe(true)
    expect(isDouyinCaptchaHeader(headersOf({ 'bdturing-verify': '{}' }))).toBe(true)
  })

  it('按 SDK 的 XHR 路径顺序：bdturing-verify 优先，存在但为空就不再看下一个', () => {
    const silentFirst = headersOf({
      'bdturing-verify': verifyParams('nocaptcha_collect'),
      'x-vc-bdturing-parameters': b64(verifyParams('slide'))
    })
    expect(isDouyinCaptchaHeader(silentFirst)).toBe(false)
    expect(isDouyinCaptchaHeader(headersOf({ 'bdturing-verify': '' }))).toBe(false)
  })

  it('头名大小写不敏感', () => {
    expect(isDouyinCaptchaHeader(headersOf({ 'Bdturing-Verify': verifyParams('slide') }))).toBe(true)
    expect(isDouyinCaptchaHeader(headersOf({ 'X-VC-BDTURING-PARAMETERS': b64(verifyParams('slide')) }))).toBe(true)
  })

  it('没有验证头 / 没传 headers 时行为不变', () => {
    expect(isDouyinCaptchaHeader(undefined)).toBe(false)
    expect(isDouyinCaptchaHeader(headersOf({ 'content-type': 'application/json' }))).toBe(false)
    expect(douyinJudge({ status_code: 0 }, { status: 200, headers: headersOf({}) }).ok).toBe(true)
  })

  it('验证头优先于空响应与 body 判据', () => {
    const headers = headersOf({ 'bdturing-verify': verifyParams('slide') })
    expect(douyinJudge('', { status: 200, headers }).code).toBe('CAPTCHA_REQUIRED')
    expect(douyinJudge({ status_code: 2154 }, { status: 200, headers }).code).toBe('CAPTCHA_REQUIRED')
  })

  it('只认 2xx，与 SDK 一致：非 2xx 交给 HTTP 状态兜底', () => {
    const headers = headersOf({ 'bdturing-verify': verifyParams('slide') })
    expect(douyinJudge({ data: {} }, { status: 403, headers }).code).toBe('RISK_CONTROL')
  })

  it('searchJudge 自己也先看验证头（它绕开了 douyinJudge 的 body 判据）', () => {
    const headers = headersOf({ 'x-vc-bdturing-parameters': b64(verifyParams('slide')) })
    // 头在：body 不管是正常搜索结果还是空串，都判验证码
    const withHeader = searchJudge({ status_code: 0, data: [] }, { status: 200, headers })
    expect(withHeader.ok).toBe(false)
    if (!withHeader.ok) {
      expect(withHeader.kind).toBe('risk')
      expect(withHeader.code).toBe('CAPTCHA_REQUIRED')
      expect(withHeader.retryable).toBe(false)
    }
    expect(searchJudge('', { status: 200, headers }).code).toBe('CAPTCHA_REQUIRED')
    // 头不在 / 无感采集：照旧
    expect(searchJudge({ status_code: 0, data: [] }, { status: 200 }).ok).toBe(true)
    expect(searchJudge('', { status: 200 }).code).toBe('EMPTY_RESPONSE')
    const silent = headersOf({ 'bdturing-verify': verifyParams('nocaptcha_collect') })
    expect(searchJudge({ status_code: 0, data: [] }, { status: 200, headers: silent }).ok).toBe(true)
    // 非 2xx 不看头
    expect(searchJudge('', { status: 403, headers }).code).toBe('EMPTY_RESPONSE')
  })
})
