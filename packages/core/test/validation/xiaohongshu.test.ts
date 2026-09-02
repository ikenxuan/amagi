import { validateXiaohongshuParams } from 'amagi/validation'
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

describe('xiaohongshu homeFeed', () => {
  it('所有字段可选', () => {
    expect(validateXiaohongshuParams('homeFeed', {})).toEqual({ methodType: 'homeFeed' })
  })

  it('num 接受 1 到 100 并强转字符串', () => {
    expect(validateXiaohongshuParams('homeFeed', { num: '20' }).num).toBe(20)
    expect(validateXiaohongshuParams('homeFeed', { num: 1 }).num).toBe(1)
    expect(validateXiaohongshuParams('homeFeed', { num: 100 }).num).toBe(100)
  })

  it.each([0, -1, 101, 1.5])('num 为 %s 时报错', (num) => {
    expectIssue(() => validateXiaohongshuParams('homeFeed', { num }), 'num')
  })

  it('refresh_type 与 note_index 允许 0 与负数', () => {
    const out = validateXiaohongshuParams('homeFeed', { refresh_type: 0, note_index: -1 })
    expect(out).toMatchObject({ refresh_type: 0, note_index: -1 })
  })

  it('cursor_score / category / search_key 必须是字符串', () => {
    expectIssue(() => validateXiaohongshuParams('homeFeed', { cursor_score: 1 }), 'cursor_score')
    expectIssue(() => validateXiaohongshuParams('homeFeed', { category: 1 }), 'category')
    expectIssue(() => validateXiaohongshuParams('homeFeed', { search_key: 1 }), 'search_key')
  })
})

describe('xiaohongshu noteDetail', () => {
  it('note_id 与 xsec_token 都必填', () => {
    expectIssue(() => validateXiaohongshuParams('noteDetail', { note_id: 'n1' }), 'xsec_token')
    expectIssue(() => validateXiaohongshuParams('noteDetail', { xsec_token: 't' }), 'note_id')
  })
})

describe('xiaohongshu cursor 的类型', () => {
  // douyin 的 cursor 是 coerce.number，xiaohongshu 的是纯 string 且不强转。
  it.each(['noteComments', 'userNoteList'] as const)('%s 的 cursor 必须是字符串', (methodType) => {
    const base: Record<string, unknown> = methodType === 'noteComments' ? { note_id: 'n1', xsec_token: 't' } : { user_id: 'u1' }

    expect(validateXiaohongshuParams(methodType, { ...base, cursor: 'abc' }).cursor).toBe('abc')
    expectIssue(() => validateXiaohongshuParams(methodType, { ...base, cursor: 3 }), 'cursor', 'must be a string')
  })
})

describe('xiaohongshu userProfile / userNoteList', () => {
  it('userProfile 只保留 user_id', () => {
    expect(validateXiaohongshuParams('userProfile', { user_id: 'u1', num: 10 })).toEqual({
      methodType: 'userProfile',
      user_id: 'u1'
    })
  })

  it('userNoteList 接受 user_id / cursor / num', () => {
    expect(validateXiaohongshuParams('userNoteList', { user_id: 'u1', cursor: 'c', num: '30' })).toEqual({
      methodType: 'userNoteList',
      user_id: 'u1',
      cursor: 'c',
      num: 30
    })
  })
})

describe('xiaohongshu searchNotes', () => {
  it('page 与 sort 有默认值', () => {
    expect(validateXiaohongshuParams('searchNotes', { keyword: 'kw' })).toMatchSnapshot()
  })

  it('keyword 必填', () => {
    expectIssue(() => validateXiaohongshuParams('searchNotes', {}), 'keyword')
  })

  it('page 强转字符串', () => {
    expect(validateXiaohongshuParams('searchNotes', { keyword: 'kw', page: '3' }).page).toBe(3)
  })
})

describe('xiaohongshu emojiList', () => {
  it('忽略一切额外入参', () => {
    expect(validateXiaohongshuParams('emojiList', { user_id: 'x' })).toEqual({ methodType: 'emojiList' })
  })
})
