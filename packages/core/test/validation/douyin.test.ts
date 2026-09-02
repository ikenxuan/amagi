import { type ValidateOutcome, validateDouyinParams } from 'amagi/validation'
import { describe, expect, it } from 'vitest'

// v7 形状：validateDouyinParams 不再抛错 —— 成功返回 { ok: true, value }，
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

const WORK_TYPES = ['videoWork', 'imageAlbumWork', 'slidesWork', 'parseWork', 'textWork'] as const

describe('douyin 作品类', () => {
  it.each(WORK_TYPES)('%s 只保留 aweme_id', (methodType) => {
    const out = validateDouyinParams(methodType, { aweme_id: '7123', number: 99, sec_uid: 'x' })
    expectOk(out)
    expect(out.value).toEqual({ methodType, aweme_id: '7123' })
  })

  it.each(WORK_TYPES)('%s 缺少 aweme_id 时报错', (methodType) => {
    expectReject(validateDouyinParams(methodType, {}), 'aweme_id')
  })

  it.each(WORK_TYPES)('%s 的 aweme_id 为空字符串时报错', (methodType) => {
    expectReject(validateDouyinParams(methodType, { aweme_id: '' }), 'aweme_id', '不能为空')
  })

  it('aweme_id 为数字时不做强转，直接报错', () => {
    expectReject(validateDouyinParams('videoWork', { aweme_id: 7123 }), 'aweme_id', '必须是字符串')
  })

  it.each([
    ['单个空格', ' '],
    ['超长 ID', '9'.repeat(64)],
    ['含 unicode', 'aweme_中文_id']
  ])('aweme_id 为 %s 时被接受，v6 不做格式校验', (_label, value) => {
    const out = validateDouyinParams('videoWork', { aweme_id: value })
    expectOk(out)
    expect(out.value.aweme_id).toBe(value)
  })
})

describe('douyin comments', () => {
  it('number 默认 50，cursor 默认 0', () => {
    const out = validateDouyinParams('comments', { aweme_id: '1' })
    expectOk(out)
    expect(out.value).toEqual({
      methodType: 'comments',
      aweme_id: '1',
      number: 50,
      cursor: 0
    })
  })

  it.each([
    ['字符串数字', '20', 20],
    ['数字', 20, 20],
    ['带小数点的整数字符串', '20.0', 20]
  ])('number 强转 %s', (_label, input, expected) => {
    const out = validateDouyinParams('comments', { aweme_id: '1', number: input })
    expectOk(out)
    expect(out.value.number).toBe(expected)
  })

  it.each([
    ['0', 0],
    ['负数', -1],
    ['小数', 1.5],
    ['非数字字符串', 'abc'],
    ['空字符串', ''],
    ['null', null],
    ['数组', []]
  ])('number 为 %s 时报错', (_label, input) => {
    expectReject(validateDouyinParams('comments', { aweme_id: '1', number: input }), 'number')
  })

  it('cursor 允许 0 但不允许负数', () => {
    const out = validateDouyinParams('comments', { aweme_id: '1', cursor: 0 })
    expectOk(out)
    expect(out.value.cursor).toBe(0)
    expectReject(validateDouyinParams('comments', { aweme_id: '1', cursor: -1 }), 'cursor')
  })

  it('cursor 接受字符串数字，对应 HTTP query 场景', () => {
    const out = validateDouyinParams('comments', { aweme_id: '1', cursor: '42' })
    expectOk(out)
    expect(out.value.cursor).toBe(42)
  })

  it('极大 number 被接受，v6 无上限', () => {
    const out = validateDouyinParams('comments', { aweme_id: '1', number: 1000000 })
    expectOk(out)
    expect(out.value.number).toBe(1000000)
  })
})

describe('douyin commentReplies', () => {
  it('number 默认 5，与 comments 的 50 不同', () => {
    const out = validateDouyinParams('commentReplies', { aweme_id: '1', comment_id: '2' })
    expectOk(out)
    expect(out.value).toEqual({
      methodType: 'commentReplies',
      aweme_id: '1',
      comment_id: '2',
      number: 5,
      cursor: 0
    })
  })

  it('缺少 comment_id 时报错', () => {
    expectReject(validateDouyinParams('commentReplies', { aweme_id: '1' }), 'comment_id')
  })
})

describe('douyin 用户列表', () => {
  const LIST_TYPES = ['userVideoList', 'userFavoriteList', 'userRecommendList'] as const

  it.each(LIST_TYPES)('%s number 默认 18，max_cursor 无默认', (methodType) => {
    const out = validateDouyinParams(methodType, { sec_uid: 'MS4x' })
    expectOk(out)
    expect(out.value).toEqual({
      methodType,
      sec_uid: 'MS4x',
      number: 18
    })
  })

  it.each(LIST_TYPES)('%s 的 max_cursor 必须是字符串', (methodType) => {
    const out = validateDouyinParams(methodType, { sec_uid: 'MS4x', max_cursor: '100' })
    expectOk(out)
    expect(out.value.max_cursor).toBe('100')
    expectReject(validateDouyinParams(methodType, { sec_uid: 'MS4x', max_cursor: 100 }), 'max_cursor')
  })

  it('userProfile 不接受 number，只保留 sec_uid', () => {
    const out = validateDouyinParams('userProfile', { sec_uid: 'MS4x', number: 5 })
    expectOk(out)
    expect(out.value).toEqual({
      methodType: 'userProfile',
      sec_uid: 'MS4x'
    })
  })
})

describe('douyin search', () => {
  it('type 默认 general，number 默认 10', () => {
    const out = validateDouyinParams('search', { query: 'kw' })
    expectOk(out)
    expect(out.value).toEqual({
      methodType: 'search',
      query: 'kw',
      type: 'general',
      number: 10
    })
  })

  it.each(['general', 'user', 'video'])('type 接受 %s', (type) => {
    const out = validateDouyinParams('search', { query: 'kw', type })
    expectOk(out)
    expect(out.value.type).toBe(type)
  })

  it.each(['General', 'GENERAL', 'live', '', 'music'])('type 为 %s 时报错', (type) => {
    expectReject(validateDouyinParams('search', { query: 'kw', type }), 'type')
  })

  it('query 为空字符串时报错', () => {
    expectReject(validateDouyinParams('search', { query: '' }), 'query', '不能为空')
  })

  it('search_id 可选且必须是字符串', () => {
    const out = validateDouyinParams('search', { query: 'kw', search_id: 'sid' })
    expectOk(out)
    expect(out.value.search_id).toBe('sid')
    expectReject(validateDouyinParams('search', { query: 'kw', search_id: 1 }), 'search_id')
  })
})

describe('douyin danmakuList 的 refine 规则', () => {
  it('duration 必填', () => {
    expectReject(validateDouyinParams('danmakuList', { aweme_id: '1' }), 'duration')
  })

  it('start_time 与 end_time 可省略', () => {
    const out = validateDouyinParams('danmakuList', { aweme_id: '1', duration: 1000 })
    expectOk(out)
    expect(out.value).toEqual({
      methodType: 'danmakuList',
      aweme_id: '1',
      duration: 1000
    })
  })

  it('end_time 超过 duration 时报错', () => {
    expectReject(validateDouyinParams('danmakuList', { aweme_id: '1', duration: 1000, end_time: 1001 }), 'end_time', '不能超过视频总时长')
  })

  it('end_time 等于 duration 时通过', () => {
    const out = validateDouyinParams('danmakuList', { aweme_id: '1', duration: 1000, end_time: 1000 })
    expectOk(out)
    expect(out.value.end_time).toBe(1000)
  })

  it('start_time 等于 end_time 时报错', () => {
    expectReject(
      validateDouyinParams('danmakuList', { aweme_id: '1', duration: 1000, start_time: 500, end_time: 500 }),
      'start_time',
      '必须小于结束时间'
    )
  })

  it('duration 允许 0，v6 下限是 0 而非 1', () => {
    const out = validateDouyinParams('danmakuList', { aweme_id: '1', duration: 0 })
    expectOk(out)
    expect(out.value.duration).toBe(0)
  })

  it('时间参数接受字符串，对应 HTTP query 场景', () => {
    const out = validateDouyinParams('danmakuList', {
      aweme_id: '1',
      duration: '60000',
      start_time: '0',
      end_time: '32000'
    })
    expectOk(out)
    expect(out.value).toMatchObject({ duration: 60000, start_time: 0, end_time: 32000 })
  })
})

describe('douyin 其他接口', () => {
  it.each(['emojiList', 'dynamicEmojiList'] as const)('%s 忽略一切额外入参', (methodType) => {
    const out = validateDouyinParams(methodType, { aweme_id: '1', number: 5 })
    expectOk(out)
    expect(out.value).toEqual({ methodType })
  })

  it('liveRoomInfo 同时要求 room_id 与 web_rid', () => {
    expectReject(validateDouyinParams('liveRoomInfo', { room_id: '1' }), 'web_rid')
    expectReject(validateDouyinParams('liveRoomInfo', { web_rid: '1' }), 'room_id')
    const out = validateDouyinParams('liveRoomInfo', { room_id: '1', web_rid: '2' })
    expectOk(out)
    expect(out.value).toEqual({
      methodType: 'liveRoomInfo',
      room_id: '1',
      web_rid: '2'
    })
  })

  it('musicInfo 要求 music_id', () => {
    expectReject(validateDouyinParams('musicInfo', {}), 'music_id')
  })

  it('loginQrcode 要求 verify_fp', () => {
    expectReject(validateDouyinParams('loginQrcode', {}), 'verify_fp')
  })
})

describe('douyin 校验文案为中文', () => {
  it('aweme_id 缺失时的文案被锁定，v7 若改为英文即属 breaking', () => {
    const out = validateDouyinParams('videoWork', {})
    expectReject(out, 'aweme_id')
    if (!out.ok) {
      expect(out.issues[0].message).toBe('视频ID必须是字符串')
    }
  })
})
