import { errorMessageFor } from 'amagi/contracts/error'
import { douyinJudge, douyinSignatureRefusal, isDouyinArgusBody } from 'amagi/platforms/douyin/judge'
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
 * ⑦ `verify_center_decision_conf` → `code: 'CAPTCHA_REQUIRED'`（人机验证；
 *    只定性，不产出地址）
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
   * 取自 dtk 的 `tests/fixtures/douyin/risk_control_captcha.json`（合成样本：形状可信、
   * 具体值不可信），所以这里只断言「定性」，不断言地址 —— 那份响应里本来就没有 URL。
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
    // dtk 在 RISK_BODY_MARKERS 那里记过这个坑：盲扫子串会因为用户文案误判，
    // 而误判是静默的 —— 一次就冷却一个健康账号
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

  it('不产出验证页地址：error.challenge 那条路径没装抖音提取器', async () => {
    // 这是一条**刻意为之**的边界，不是遗漏：目前掌握的风控响应里没有可跳转的 URL，
    // 装一个提取器只能返回 undefined，或者编一个地址出来。等线上样本再说。
    const { PLATFORM_RUNTIME } = await import('amagi/client/runtime')
    expect(PLATFORM_RUNTIME.douyin.challenge).toBeUndefined()
    // 对照：快手有实物地址，所以它装了
    expect(PLATFORM_RUNTIME.kuaishou.challenge).toBeTypeOf('function')
  })
})
