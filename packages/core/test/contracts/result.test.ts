import type { AmagiResult } from 'amagi/contracts/result'
import { SUCCESS_MESSAGE } from 'amagi/contracts/result'
/**
 * contracts/result 的运行时契约。
 *
 * 类型层的「成功分支无 error 键、失败分支无 data 键」断言在
 * `test/types/contracts.test-d.ts`；这里验证运行时的键集合确实也是干净的
 * —— v6 会把 `error: undefined` / `data: undefined` 留在对象上。
 */
import { describe, expect, it } from 'vitest'

const meta = {
  requestId: 'r-1',
  clientId: 'static',
  platform: 'douyin',
  endpoint: 'douyin.videoWork',
  durationMs: 1,
  attempts: 1
} as const

describe('contracts/result', () => {
  it("SUCCESS_MESSAGE 与 v6 的成功文案一致（'获取成功'）", () => {
    expect(SUCCESS_MESSAGE).toBe('获取成功')
  })

  it('成功信封的运行时键集合里没有 error', () => {
    const ok: AmagiResult<{ id: string }> = { success: true, data: { id: 'x' }, message: SUCCESS_MESSAGE, meta }
    expect(Object.keys(ok).sort()).toEqual(['data', 'message', 'meta', 'success'])
    expect('error' in ok).toBe(false)
  })

  it('失败信封的运行时键集合里没有 data', () => {
    const bad: AmagiResult<{ id: string }> = {
      success: false,
      error: { kind: 'auth', code: 'COOKIE_EXPIRED', message: '登录状态已失效', retryable: false },
      message: '登录状态已失效',
      meta
    }
    expect(Object.keys(bad).sort()).toEqual(['error', 'message', 'meta', 'success'])
    expect('data' in bad).toBe(false)
  })

  it('success 能把联合收窄到唯一一侧', () => {
    const read = (r: AmagiResult<number>): string => (r.success ? `ok:${r.data}` : `err:${r.error.code}`)
    expect(read({ success: true, data: 7, message: SUCCESS_MESSAGE, meta })).toBe('ok:7')
    expect(
      read({
        success: false,
        error: { kind: 'not_found', code: 'NOT_FOUND', message: '资源不存在', retryable: false },
        message: '资源不存在',
        meta
      })
    ).toBe('err:NOT_FOUND')
  })
})
