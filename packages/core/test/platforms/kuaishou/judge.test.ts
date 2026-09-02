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

  it('非对象响应判成功', () => {
    expect(kuaishouJudge(null, { status: 200 }).ok).toBe(true)
    expect(kuaishouJudge(undefined, { status: 200 }).ok).toBe(true)
    expect(kuaishouJudge('plain', { status: 200 }).ok).toBe(true)
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