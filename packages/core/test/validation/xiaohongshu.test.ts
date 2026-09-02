import { type ValidateOutcome, validateXiaohongshuParams } from 'amagi/validation'
import { describe, expect, it } from 'vitest'

// v7 形状：validateXiaohongshuParams 不再抛错 —— 成功返回 { ok: true, value }，
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

describe('xiaohongshu homeFeed', () => {
  it('所有字段可选', () => {
    const out = validateXiaohongshuParams('homeFeed', {})
    expectOk(out)
    expect(out.value).toEqual({ methodType: 'homeFeed' })
  })

  it('num 接受 1 到 100 并强转字符串', () => {
    const fromString = validateXiaohongshuParams('homeFeed', { num: '20' })
    expectOk(fromString)
    expect(fromString.value.num).toBe(20)

    const min = validateXiaohongshuParams('homeFeed', { num: 1 })
    expectOk(min)
    expect(min.value.num).toBe(1)

    const max = validateXiaohongshuParams('homeFeed', { num: 100 })
    expectOk(max)
    expect(max.value.num).toBe(100)
  })

  it.each([0, -1, 101, 1.5])('num 为 %s 时报错', (num) => {
    expectReject(validateXiaohongshuParams('homeFeed', { num }), 'num')
  })

  it('refresh_type 与 note_index 允许 0 与负数', () => {
    const out = validateXiaohongshuParams('homeFeed', { refresh_type: 0, note_index: -1 })
    expectOk(out)
    expect(out.value).toMatchObject({ refresh_type: 0, note_index: -1 })
  })

  it('cursor_score / category / search_key 必须是字符串', () => {
    expectReject(validateXiaohongshuParams('homeFeed', { cursor_score: 1 }), 'cursor_score')
    expectReject(validateXiaohongshuParams('homeFeed', { category: 1 }), 'category')
    expectReject(validateXiaohongshuParams('homeFeed', { search_key: 1 }), 'search_key')
  })
})

describe('xiaohongshu noteDetail', () => {
  it('note_id 与 xsec_token 都必填', () => {
    expectReject(validateXiaohongshuParams('noteDetail', { note_id: 'n1' }), 'xsec_token')
    expectReject(validateXiaohongshuParams('noteDetail', { xsec_token: 't' }), 'note_id')
  })
})

describe('xiaohongshu cursor 的类型', () => {
  // douyin 的 cursor 是 coerce.number，xiaohongshu 的是纯 string 且不强转。
  it.each(['noteComments', 'userNoteList'] as const)('%s 的 cursor 必须是字符串', (methodType) => {
    const base: Record<string, unknown> = methodType === 'noteComments' ? { note_id: 'n1', xsec_token: 't' } : { user_id: 'u1' }

    const out = validateXiaohongshuParams(methodType, { ...base, cursor: 'abc' })
    expectOk(out)
    expect(out.value.cursor).toBe('abc')
    expectReject(validateXiaohongshuParams(methodType, { ...base, cursor: 3 }), 'cursor', 'must be a string')
  })
})

describe('xiaohongshu userProfile / userNoteList', () => {
  it('userProfile 只保留 user_id', () => {
    const out = validateXiaohongshuParams('userProfile', { user_id: 'u1', num: 10 })
    expectOk(out)
    expect(out.value).toEqual({
      methodType: 'userProfile',
      user_id: 'u1'
    })
  })

  it('userNoteList 接受 user_id / cursor / num', () => {
    const out = validateXiaohongshuParams('userNoteList', { user_id: 'u1', cursor: 'c', num: '30' })
    expectOk(out)
    expect(out.value).toEqual({
      methodType: 'userNoteList',
      user_id: 'u1',
      cursor: 'c',
      num: 30
    })
  })
})

describe('xiaohongshu searchNotes', () => {
  it('page 与 sort 有默认值', () => {
    const out = validateXiaohongshuParams('searchNotes', { keyword: 'kw' })
    expectOk(out)
    expect(out.value).toMatchSnapshot()
  })

  it('keyword 必填', () => {
    expectReject(validateXiaohongshuParams('searchNotes', {}), 'keyword')
  })

  it('page 强转字符串', () => {
    const out = validateXiaohongshuParams('searchNotes', { keyword: 'kw', page: '3' })
    expectOk(out)
    expect(out.value.page).toBe(3)
  })
})

describe('xiaohongshu emojiList', () => {
  it('忽略一切额外入参', () => {
    const out = validateXiaohongshuParams('emojiList', { user_id: 'x' })
    expectOk(out)
    expect(out.value).toEqual({ methodType: 'emojiList' })
  })
})
