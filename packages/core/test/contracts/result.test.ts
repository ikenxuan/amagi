import type { AmagiError } from 'amagi/contracts/error'
import type { AmagiResult } from 'amagi/contracts/result'
import { AmagiThrownError, isFailure, isSuccess, SUCCESS_MESSAGE, unwrap } from 'amagi/contracts/result'
/**
 * contracts/result 的运行时契约。
 *
 * 类型层的形状断言在 `test/types/contracts.test-d.ts`、四种读法在
 * `test/types/result-reading.test-d.ts`；这里管运行时。
 *
 * 阶段 9.2 起两支各声明一个 `?: undefined` 的对侧键（`AmagiSuccess.error` /
 * `AmagiFailure.data`），**运行时形状一个字节都没变**：那个键根本不存在。
 * 本文件的 `'error' in ok === false` / `'data' in bad === false` 就是这条分界线
 * —— v6 才会把 `error: undefined` / `data: undefined` 留在对象上。
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

/** 取一次调用抛出的东西。写成函数而不是在用例里 try/catch，是为了不留 unreachable 分支 */
const thrownBy = (fn: () => unknown): AmagiThrownError => {
  try {
    fn()
  } catch (e) {
    return e as AmagiThrownError
  }
  throw new Error('期望 unwrap 抛出，但它返回了')
}

describe('信封读法工具（阶段 9.2，修 BUG-2）', () => {
  const authError: AmagiError = { kind: 'auth', code: 'COOKIE_EXPIRED', message: '登录状态已失效', retryable: false }
  const ok: AmagiResult<{ id: string }> = { success: true, data: { id: 'x' }, message: SUCCESS_MESSAGE, meta }
  const bad: AmagiResult<{ id: string }> = { success: false, error: authError, message: authError.message, meta }

  it('isSuccess / isFailure 是 success 的两面', () => {
    expect(isSuccess(ok)).toBe(true)
    expect(isFailure(ok)).toBe(false)
    expect(isSuccess(bad)).toBe(false)
    expect(isFailure(bad)).toBe(true)
  })

  it('filter(isSuccess) 在数组上取到全部成功项，filter(isFailure) 取到全部失败项', () => {
    const list: AmagiResult<{ id: string }>[] = [ok, bad, ok]
    expect(list.filter(isSuccess).map((r) => r.data)).toEqual([{ id: 'x' }, { id: 'x' }])
    expect(list.filter(isFailure).map((r) => r.error.code)).toEqual(['COOKIE_EXPIRED'])
  })

  it('unwrap 成功时返回 data 本身（引用相等，不复制）', () => {
    // 右边这个 `ok.data` 就是 9.2 放宽的读法：未收窄也能读，类型是 `T | undefined`
    expect(unwrap(ok)).toBe(ok.data)
  })

  it('unwrap 失败时抛 AmagiThrownError：Error 子类，四个必填字段齐全', () => {
    expect(() => unwrap(bad)).toThrow(AmagiThrownError)
    const thrown = thrownBy(() => unwrap(bad))
    expect(thrown).toBeInstanceOf(Error)
    expect(thrown.name).toBe('AmagiThrownError')
    expect(thrown.kind).toBe('auth')
    expect(thrown.code).toBe('COOKIE_EXPIRED')
    expect(thrown.message).toBe('登录状态已失效')
    expect(thrown.retryable).toBe(false)
    // 原始错误对象引用相等：一个字段都没丢，也没被复制走形
    expect(thrown.error).toBe(authError)
    // 抛 Error 子类而不是抛裸对象，换来的就是这个
    expect(thrown.stack).toBeTruthy()
  })

  it('不吞 error.cause：cause 原样进 Error.cause（引用相等）', () => {
    const cause = new Error('socket hang up')
    const netFailure: AmagiResult<never> = {
      success: false,
      error: { kind: 'network', code: 'NETWORK_ERROR', message: '网络请求失败', retryable: true, cause },
      message: '网络请求失败',
      meta
    }
    expect(thrownBy(() => unwrap(netFailure)).cause).toBe(cause)
  })

  it('error 没带 cause 时不凭空造一个 cause 键', () => {
    expect('cause' in thrownBy(() => unwrap(bad))).toBe(false)
  })

  it('可选字段一并平铺：platform / http / issues / raw', () => {
    const rich: AmagiError = {
      kind: 'validation',
      code: 'PARAM_INVALID',
      message: '参数不合法',
      retryable: false,
      platform: { code: -352, message: '风控校验失败' },
      http: { status: 412 },
      issues: [{ path: 'oid', message: 'OID不能为空' }],
      raw: '<html/>'
    }
    const thrown = thrownBy(() => unwrap({ success: false, error: rich, message: rich.message, meta }))
    expect(thrown.platform).toEqual({ code: -352, message: '风控校验失败' })
    expect(thrown.http).toEqual({ status: 412 })
    expect(thrown.issues).toEqual([{ path: 'oid', message: 'OID不能为空' }])
    expect(thrown.raw).toBe('<html/>')
  })

  it('unwrap 不改动传入的信封，失败信封上依旧没有 data 键', () => {
    const snapshot = { ...bad }
    expect(() => unwrap(bad)).toThrow()
    expect(bad).toEqual(snapshot)
    expect('data' in bad).toBe(false)
  })
})
