import { validateKuaishouParams } from 'amagi/validation'
import { describe, expect, it } from 'vitest'

const expectIssue = (fn: () => unknown, path: string, messagePart?: string) => {
  let thrown: unknown
  try {
    fn()
  } catch (error) {
    thrown = error
  }
  expect(thrown, 'expected a validation error at ' + path).toBeDefined()
  const issues = (thrown as { issues?: Array<{ path: unknown[]; message: string }> }).issues ?? []
  const hit = issues.find((i) => i.path.join('.') === path)
  expect(hit, 'no issue on "' + path + '", got: ' + JSON.stringify(issues)).toBeDefined()
  if (messagePart) expect(hit?.message).toContain(messagePart)
}

describe('kuaishou photoId 系接口', () => {
  it.each(['videoWork', 'comments'] as const)('%s 只保留 photoId', (methodType) => {
    expect(validateKuaishouParams(methodType, { photoId: 'p1', count: 10, pcursor: 'x' })).toEqual({
      methodType,
      photoId: 'p1'
    })
  })

  it.each(['videoWork', 'comments'] as const)('%s 的 photoId 必填且非空', (methodType) => {
    expectIssue(() => validateKuaishouParams(methodType, {}), 'photoId')
    expectIssue(() => validateKuaishouParams(methodType, { photoId: '' }), 'photoId', 'cannot be empty')
  })

  // 快手评论接口没有任何翻页参数，无法请求第二页。
  it('KNOWN-DEFECT: comments 不接受 pcursor / count，无法翻页', () => {
    const out = validateKuaishouParams('comments', { photoId: 'p1', pcursor: 'next', count: 20 }) as Record<string, unknown>
    expect(out.pcursor).toBeUndefined()
    expect(out.count).toBeUndefined()
  })
})

describe('kuaishou principalId 系接口', () => {
  it.each(['userProfile', 'liveRoomInfo'] as const)('%s 只保留 principalId', (methodType) => {
    expect(validateKuaishouParams(methodType, { principalId: 'u1', count: 5 })).toEqual({
      methodType,
      principalId: 'u1'
    })
  })

  it.each(['userProfile', 'userWorkList', 'liveRoomInfo'] as const)('%s 的 principalId 必填', (methodType) => {
    expectIssue(() => validateKuaishouParams(methodType, {}), 'principalId')
  })
})

describe('kuaishou userWorkList', () => {
  it('pcursor 与 count 可选', () => {
    expect(validateKuaishouParams('userWorkList', { principalId: 'u1' })).toEqual({
      methodType: 'userWorkList',
      principalId: 'u1'
    })
  })

  it('count 接受 1 到 100', () => {
    expect(validateKuaishouParams('userWorkList', { principalId: 'u1', count: 1 }).count).toBe(1)
    expect(validateKuaishouParams('userWorkList', { principalId: 'u1', count: 100 }).count).toBe(100)
  })

  it.each([0, -1, 101, 1.5])('count 为 %s 时报错', (count) => {
    expectIssue(() => validateKuaishouParams('userWorkList', { principalId: 'u1', count }), 'count')
  })

  // count 用的是 zod.number() 而非 zod.coerce.number()，
  // 而 HTTP query 参数一律是字符串 -> 通过 HTTP 传 count 必然失败。
  it('KNOWN-DEFECT: count 不做字符串强转，HTTP 路径下不可用', () => {
    expectIssue(() => validateKuaishouParams('userWorkList', { principalId: 'u1', count: '20' }), 'count', 'must be a number')
  })

  it('pcursor 必须是字符串', () => {
    expect(validateKuaishouParams('userWorkList', { principalId: 'u1', pcursor: 'c1' }).pcursor).toBe('c1')
    expectIssue(() => validateKuaishouParams('userWorkList', { principalId: 'u1', pcursor: 1 }), 'pcursor')
  })
})

describe('kuaishou emojiList', () => {
  it('忽略一切额外入参', () => {
    expect(validateKuaishouParams('emojiList', { photoId: 'x' })).toEqual({ methodType: 'emojiList' })
  })
})

describe('kuaishou 校验文案为英文', () => {
  // douyin / bilibili 用中文，kuaishou / xiaohongshu 用英文 —— v7 应统一。
  it('KNOWN-DEFECT: 与 douyin / bilibili 的中文文案不一致', () => {
    let thrown: unknown
    try {
      validateKuaishouParams('videoWork', {})
    } catch (error) {
      thrown = error
    }
    const issues = (thrown as { issues: Array<{ message: string }> }).issues
    expect(issues[0].message).toBe('photoId must be a string')
  })
})
