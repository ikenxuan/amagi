import { kuaishouJudge } from 'amagi/platforms/kuaishou/judge'
/**
 * platforms/kuaishou/judge 的契约。
 *
 * 判据：**`code: 0` 不再因短路求值必然判成功（修 #13）** —— 判定用显式
 * switch，成功/失败的边界由表决定。`code: 0` 与未命中枚举的值判成功
 * （与 v6 实际行为一致），`INVALID_COOKIE` 判 auth 失败。
 */
import { describe, expect, it } from 'vitest'

describe('platforms/kuaishou/judge - code: 0 不再靠短路（#13）', () => {
  it('code: 0 判成功（显式 default 分支，不靠 && 短路）', () => {
    expect(kuaishouJudge({ code: 0, data: {} }, { status: 200 }).ok).toBe(true)
  })

  it('未命中枚举的 truthy code 判成功（与 v6 一致）', () => {
    expect(kuaishouJudge({ code: 12345, data: {} }, { status: 200 }).ok).toBe(true)
    expect(kuaishouJudge({ code: 'SOME_UNKNOWN', data: {} }, { status: 200 }).ok).toBe(true)
  })

  it('无 code 字段的对象判成功（交给 normalize）', () => {
    expect(kuaishouJudge({ data: {} }, { status: 200 }).ok).toBe(true)
  })

  it('null / undefined 判成功（交给 normalize）', () => {
    expect(kuaishouJudge(null, { status: 200 }).ok).toBe(true)
    expect(kuaishouJudge(undefined, { status: 200 }).ok).toBe(true)
  })

  it('非空字符串判 risk / ANTIBOT_PAGE（WAF / 反爬页）', () => {
    const verdict = kuaishouJudge('plain', { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('risk')
      expect(verdict.code).toBe('ANTIBOT_PAGE')
    }
  })

  it('业务码没结论时看 HTTP 状态：无 code 字段 + 403 判失败', () => {
    // 快手这条路径原先连「对象里没有 code 字段」都判成功，403 拦截页完全无人认领
    const verdict = kuaishouJudge({ data: {} }, { status: 403 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.code).toBe('RISK_CONTROL')
  })

  it('code: 0 + 403 同样判失败', () => {
    expect(kuaishouJudge({ code: 0, data: {} }, { status: 403 }).ok).toBe(false)
  })
})

describe('platforms/kuaishou/judge - 枚举错误码显式判失败', () => {
  it('INVALID_COOKIE 判 auth / COOKIE_EXPIRED', () => {
    const verdict = kuaishouJudge({ code: 'INVALID_COOKIE', data: {} }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('auth')
      expect(verdict.code).toBe('COOKIE_EXPIRED')
    }
  })

  it('UNKNOWN 判失败（kind/code 由 runtime 兜底）', () => {
    const verdict = kuaishouJudge({ code: 'UNKNOWN_ERROR', data: {} }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('unknown')
      expect(verdict.code).toBe('UNKNOWN_ERROR')
    }
  })
})
/**
 * 回归：`result !== 1` 的失败信封必须判失败。
 *
 * 现场：HTTP 方式请求 `/kuaishou/fetch_one_work` 拿到
 * `{ result: 2, error_msg: null, request_id: '...' }`（HTTP 200），信封却是
 * `success: true`、`data` 就是那三个字段。它既没有 `code` 也没有 `status_code`，
 * 旧判定第一步 `!('code' in raw)` 就把它放走了。
 *
 * `result !== 1` 是失败这条约定 assemble 层早在用（两处 `result !== 1` 就回退），
 * 只有 judge 不知道。
 */
describe('回归：快手的 result 状态位', () => {
  it('result: 2 + error_msg: null 判失败（真实现场）', () => {
    const verdict = kuaishouJudge({ result: 2, error_msg: null, request_id: '788470114808729440' }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      // `2` 现在有实测语义：平台拒绝 / IP 级冷却，按分钟算，不在一次调用里重试
      expect(verdict.kind).toBe('rate_limit')
      expect(verdict.code).toBe('RATE_LIMITED')
      expect(verdict.retryable).toBe(false)
    }
  })

  it('result: 1 判成功；result 缺失（graphql 正常响应）也判成功', () => {
    expect(kuaishouJudge({ result: 1, list: [], pcursor: '' }, { status: 200 }).ok).toBe(true)
    expect(kuaishouJudge({ data: { visionVideoDetail: {} } }, { status: 200 }).ok).toBe(true)
  })

  it('result 是字符串数字时同样判定', () => {
    expect(kuaishouJudge({ result: '1' }, { status: 200 }).ok).toBe(true)
    expect(kuaishouJudge({ result: '2' }, { status: 200 }).ok).toBe(false)
  })

  it('result: 0 判失败（assemble 层同样把 0 当失败）', () => {
    expect(kuaishouJudge({ result: 0 }, { status: 200 }).ok).toBe(false)
  })

  it('result 是对象时不当状态位看（B站番剧那类响应里 result 是负载）', () => {
    expect(kuaishouJudge({ result: { episodes: [] } }, { status: 200 }).ok).toBe(true)
  })

  it('graphql 的 errors 非空判失败', () => {
    const verdict = kuaishouJudge({ data: null, errors: [{ message: 'photo not found' }] }, { status: 200 })
    expect(verdict.ok).toBe(false)
  })

  it('errors 是空数组时不判失败', () => {
    expect(kuaishouJudge({ data: { visionVideoDetail: {} }, errors: [] }, { status: 200 }).ok).toBe(true)
  })

  it('枚举里的错误码优先于 result（更具体）', () => {
    const verdict = kuaishouJudge({ code: 'INVALID_COOKIE', result: 2 }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.code).toBe('COOKIE_EXPIRED')
  })
})

/**
 * GraphQL 空壳：`{ "data": { "visionVideoDetail": null } }`。
 *
 * 未登录访问 PC GraphQL 时快手就回这个 —— HTTP 200、没有 errors、没有 result、
 * 没有 code。补这条之前它是「成功信封 + data 里啥也没有」，与 `{ result: 2 }`
 * 是同一族漏判：判据只覆盖了三种响应形状，空壳不在其中。
 */
describe('GraphQL 空壳判成未登录', () => {
  it('data 下唯一的键为 null → auth / LOGIN_REQUIRED', () => {
    const verdict = kuaishouJudge({ data: { visionVideoDetail: null } }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('auth')
      expect(verdict.code).toBe('LOGIN_REQUIRED')
      expect(verdict.retryable).toBe(false)
    }
  })

  it('评论那条空壳同样命中', () => {
    expect(kuaishouJudge({ data: { visionCommentList: null } }, { status: 200 }).ok).toBe(false)
  })

  it('部分字段为 null 不算空壳（作品没有 tags 是正常的）', () => {
    expect(kuaishouJudge({ data: { visionVideoDetail: { tags: null }, other: 1 } }, { status: 200 }).ok).toBe(true)
    expect(kuaishouJudge({ data: { visionVideoDetail: {}, extra: null } }, { status: 200 }).ok).toBe(true)
  })

  it('data 本身是 null / 数组 / 空对象时不由这条判（避免误杀）', () => {
    expect(kuaishouJudge({ data: null }, { status: 200 }).ok).toBe(true)
    expect(kuaishouJudge({ data: [] }, { status: 200 }).ok).toBe(true)
    expect(kuaishouJudge({ data: {} }, { status: 200 }).ok).toBe(true)
  })
})

/**
 * H5 / live_api 的 result 码语义。
 *
 * 实测来源是 @OduckO 的 kuaishou-parser（GPL-3.0-only）的 TODO.md。补这张表之前
 * 所有非 1 的 result 一律 `unknown` / `PLATFORM_ERROR` / 不可重试 —— 于是「签名写错了」
 * 和「平台在冷却」在信封上长得一模一样，排障时分不开。
 */
describe('快手 result 码的语义表', () => {
  it('50 是签名验证失败 —— 归 internal，因为这是 amagi 自己的 bug', () => {
    const verdict = kuaishouJudge({ result: 50 }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('internal')
      expect(verdict.code).toBe('INTERNAL_ERROR')
      expect(verdict.retryable).toBe(false)
    }
  })

  it('11 是字段全 null —— 短退避重试有意义（弹幕接口约 13% 概率）', () => {
    const verdict = kuaishouJudge({ result: 11 }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('unavailable')
      expect(verdict.retryable).toBe(true)
    }
  })

  it('21 是缺 position 参数 —— 入参问题，重试不会变对', () => {
    const verdict = kuaishouJudge({ result: 21 }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('validation')
      expect(verdict.code).toBe('PARAM_MISSING')
    }
  })

  it('2001（H5）与 400002（PC）都是风控滑块 —— 只中转不绕过', () => {
    for (const result of [2001, 400002]) {
      const verdict = kuaishouJudge({ result }, { status: 200 })
      expect(verdict.ok, `result=${result} 应判失败`).toBe(false)
      if (!verdict.ok) {
        expect(verdict.kind).toBe('risk')
        expect(verdict.code).toBe('CAPTCHA_REQUIRED')
        // 需要人介入，自动重试无意义
        expect(verdict.retryable).toBe(false)
      }
    }
  })

  it('表里没有的非 1 值仍落到「不说明原因」那条兜底', () => {
    const verdict = kuaishouJudge({ result: 999 }, { status: 200 })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.kind).toBe('unknown')
      expect(verdict.code).toBe('PLATFORM_ERROR')
    }
  })

  it('字符串形式的码同样命中表', () => {
    const verdict = kuaishouJudge({ result: '50' }, { status: 200 })
    if (!verdict.ok) expect(verdict.code).toBe('INTERNAL_ERROR')
  })
})
