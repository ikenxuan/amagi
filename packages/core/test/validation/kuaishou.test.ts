import { type ValidateOutcome, validateKuaishouParams } from 'amagi/validation'
import { describe, expect, it } from 'vitest'

// v7 形状：validateKuaishouParams 不再抛错 —— 成功返回 { ok: true, value }，
// 失败返回 { ok: false, issues }（issue 的 path 是点号字符串）。
const expectOk = <T>(out: ValidateOutcome<T>): asserts out is { ok: true; value: T } => {
  expect(out.ok, 'expected validation to pass, got: ' + JSON.stringify(out)).toBe(true)
}

const expectReject = <T>(out: ValidateOutcome<T>, path: string, messagePart?: string) => {
  expect(out.ok, 'expected a validation failure at ' + path).toBe(false)
  if (out.ok) return
  const hit = out.issues.find((i) => i.path === path)
  expect(hit, 'no issue on "' + path + '", got: ' + JSON.stringify(out.issues)).toBeDefined()
  if (messagePart) expect(hit?.message).toContain(messagePart)
}

describe('kuaishou photoId 系接口', () => {
  it.each(['videoWork', 'comments'] as const)('%s 只保留 photoId', (methodType) => {
    const out = validateKuaishouParams(methodType, { photoId: 'p1', count: 10, pcursor: 'x' })
    expectOk(out)
    expect(out.value).toEqual({
      methodType,
      photoId: 'p1'
    })
  })

  it.each(['videoWork', 'comments'] as const)('%s 的 photoId 必填且非空', (methodType) => {
    expectReject(validateKuaishouParams(methodType, {}), 'photoId')
    expectReject(validateKuaishouParams(methodType, { photoId: '' }), 'photoId', 'cannot be empty')
  })
})

describe('kuaishou principalId 系接口', () => {
  it.each(['userProfile', 'liveRoomInfo'] as const)('%s 只保留 principalId', (methodType) => {
    const out = validateKuaishouParams(methodType, { principalId: 'u1', count: 5 })
    expectOk(out)
    expect(out.value).toEqual({
      methodType,
      principalId: 'u1'
    })
  })

  it.each(['userProfile', 'userWorkList', 'liveRoomInfo'] as const)('%s 的 principalId 必填', (methodType) => {
    expectReject(validateKuaishouParams(methodType, {}), 'principalId')
  })
})

describe('kuaishou userWorkList', () => {
  it('pcursor 与 count 可选', () => {
    const out = validateKuaishouParams('userWorkList', { principalId: 'u1' })
    expectOk(out)
    expect(out.value).toEqual({
      methodType: 'userWorkList',
      principalId: 'u1'
    })
  })

  it('count 接受 1 到 100', () => {
    const min = validateKuaishouParams('userWorkList', { principalId: 'u1', count: 1 })
    expectOk(min)
    expect(min.value.count).toBe(1)

    const max = validateKuaishouParams('userWorkList', { principalId: 'u1', count: 100 })
    expectOk(max)
    expect(max.value.count).toBe(100)
  })

  it.each([0, -1, 101, 1.5])('count 为 %s 时报错', (count) => {
    expectReject(validateKuaishouParams('userWorkList', { principalId: 'u1', count }), 'count')
  })

  it('pcursor 必须是字符串', () => {
    const out = validateKuaishouParams('userWorkList', { principalId: 'u1', pcursor: 'c1' })
    expectOk(out)
    expect(out.value.pcursor).toBe('c1')
    expectReject(validateKuaishouParams('userWorkList', { principalId: 'u1', pcursor: 1 }), 'pcursor')
  })
})

describe('kuaishou emojiList', () => {
  it('忽略一切额外入参', () => {
    const out = validateKuaishouParams('emojiList', { photoId: 'x' })
    expectOk(out)
    expect(out.value).toEqual({ methodType: 'emojiList' })
  })
})
