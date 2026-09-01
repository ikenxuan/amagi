import { validateDouyinParams } from 'amagi/validation'
import { describe, expect, it } from 'vitest'

/** 断言某个字段上存在校验错误 */
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

const WORK_TYPES = ['videoWork', 'imageAlbumWork', 'slidesWork', 'parseWork', 'textWork'] as const

describe('douyin 作品类', () => {
  it.each(WORK_TYPES)('%s 只保留 aweme_id', (methodType) => {
    const out = validateDouyinParams(methodType, { aweme_id: '7123', number: 99, sec_uid: 'x' })
    expect(out).toEqual({ methodType, aweme_id: '7123' })
  })

  it.each(WORK_TYPES)('%s 缺少 aweme_id 时报错', (methodType) => {
    expectIssue(() => validateDouyinParams(methodType, {}), 'aweme_id')
  })

  it.each(WORK_TYPES)('%s 的 aweme_id 为空字符串时报错', (methodType) => {
    expectIssue(() => validateDouyinParams(methodType, { aweme_id: '' }), 'aweme_id', '不能为空')
  })

  it('aweme_id 为数字时不做强转，直接报错', () => {
    expectIssue(() => validateDouyinParams('videoWork', { aweme_id: 7123 }), 'aweme_id', '必须是字符串')
  })

  it.each([
    ['单个空格', ' '],
    ['超长 ID', '9'.repeat(64)],
    ['含 unicode', 'aweme_中文_id']
  ])('aweme_id 为 %s 时被接受，v6 不做格式校验', (_label, value) => {
    expect(validateDouyinParams('videoWork', { aweme_id: value }).aweme_id).toBe(value)
  })
})

describe('douyin comments', () => {
  it('number 默认 50，cursor 默认 0', () => {
    expect(validateDouyinParams('comments', { aweme_id: '1' })).toEqual({
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
    expect(validateDouyinParams('comments', { aweme_id: '1', number: input }).number).toBe(expected)
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
    expectIssue(() => validateDouyinParams('comments', { aweme_id: '1', number: input }), 'number')
  })

  // zod.coerce.number() 会把 true 强转为 1，落在 min(1) 之内，因此静默通过。
  it.each([
    ['true', true, 1],
    ['字符串 "1"', '1', 1]
  ])('KNOWN-DEFECT: number 为 %s 时被静默强转为 %i', (_label, input, expected) => {
    expect(validateDouyinParams('comments', { aweme_id: '1', number: input }).number).toBe(expected)
  })

  // false 强转为 0，min(1) 拦下 —— 与 true 行为不对称。
  it('KNOWN-DEFECT: number 为 false 时因强转成 0 而报错，与 true 不对称', () => {
    expectIssue(() => validateDouyinParams('comments', { aweme_id: '1', number: false }), 'number')
  })

  it('cursor 允许 0 但不允许负数', () => {
    expect(validateDouyinParams('comments', { aweme_id: '1', cursor: 0 }).cursor).toBe(0)
    expectIssue(() => validateDouyinParams('comments', { aweme_id: '1', cursor: -1 }), 'cursor')
  })

  it('cursor 接受字符串数字，对应 HTTP query 场景', () => {
    expect(validateDouyinParams('comments', { aweme_id: '1', cursor: '42' }).cursor).toBe(42)
  })

  it('极大 number 被接受，v6 无上限', () => {
    expect(validateDouyinParams('comments', { aweme_id: '1', number: 1000000 }).number).toBe(1000000)
  })
})

describe('douyin commentReplies', () => {
  it('number 默认 5，与 comments 的 50 不同', () => {
    expect(validateDouyinParams('commentReplies', { aweme_id: '1', comment_id: '2' })).toEqual({
      methodType: 'commentReplies',
      aweme_id: '1',
      comment_id: '2',
      number: 5,
      cursor: 0
    })
  })

  it('缺少 comment_id 时报错', () => {
    expectIssue(() => validateDouyinParams('commentReplies', { aweme_id: '1' }), 'comment_id')
  })
})

describe('douyin 用户列表', () => {
  const LIST_TYPES = ['userVideoList', 'userFavoriteList', 'userRecommendList'] as const

  it.each(LIST_TYPES)('%s number 默认 18，max_cursor 无默认', (methodType) => {
    expect(validateDouyinParams(methodType, { sec_uid: 'MS4x' })).toEqual({
      methodType,
      sec_uid: 'MS4x',
      number: 18
    })
  })

  it.each(LIST_TYPES)('%s 的 max_cursor 必须是字符串', (methodType) => {
    expect(validateDouyinParams(methodType, { sec_uid: 'MS4x', max_cursor: '100' }).max_cursor).toBe('100')
    expectIssue(() => validateDouyinParams(methodType, { sec_uid: 'MS4x', max_cursor: 100 }), 'max_cursor')
  })

  it('userProfile 不接受 number，只保留 sec_uid', () => {
    expect(validateDouyinParams('userProfile', { sec_uid: 'MS4x', number: 5 })).toEqual({
      methodType: 'userProfile',
      sec_uid: 'MS4x'
    })
  })
})

describe('douyin search', () => {
  it('type 默认 general，number 默认 10', () => {
    expect(validateDouyinParams('search', { query: 'kw' })).toEqual({
      methodType: 'search',
      query: 'kw',
      type: 'general',
      number: 10
    })
  })

  it.each(['general', 'user', 'video'])('type 接受 %s', (type) => {
    expect(validateDouyinParams('search', { query: 'kw', type }).type).toBe(type)
  })

  it.each(['General', 'GENERAL', 'live', '', 'music'])('type 为 %s 时报错', (type) => {
    expectIssue(() => validateDouyinParams('search', { query: 'kw', type }), 'type')
  })

  it('query 为空字符串时报错', () => {
    expectIssue(() => validateDouyinParams('search', { query: '' }), 'query', '不能为空')
  })

  it('search_id 可选且必须是字符串', () => {
    expect(validateDouyinParams('search', { query: 'kw', search_id: 'sid' }).search_id).toBe('sid')
    expectIssue(() => validateDouyinParams('search', { query: 'kw', search_id: 1 }), 'search_id')
  })
})

describe('douyin danmakuList 的 refine 规则', () => {
  it('duration 必填', () => {
    expectIssue(() => validateDouyinParams('danmakuList', { aweme_id: '1' }), 'duration')
  })

  it('start_time 与 end_time 可省略', () => {
    expect(validateDouyinParams('danmakuList', { aweme_id: '1', duration: 1000 })).toEqual({
      methodType: 'danmakuList',
      aweme_id: '1',
      duration: 1000
    })
  })

  it('end_time 超过 duration 时报错', () => {
    expectIssue(
      () => validateDouyinParams('danmakuList', { aweme_id: '1', duration: 1000, end_time: 1001 }),
      'end_time',
      '不能超过视频总时长'
    )
  })

  it('end_time 等于 duration 时通过', () => {
    expect(validateDouyinParams('danmakuList', { aweme_id: '1', duration: 1000, end_time: 1000 }).end_time).toBe(1000)
  })

  it('start_time 等于 end_time 时报错', () => {
    expectIssue(
      () => validateDouyinParams('danmakuList', { aweme_id: '1', duration: 1000, start_time: 500, end_time: 500 }),
      'start_time',
      '必须小于结束时间'
    )
  })

  it('duration 允许 0，v6 下限是 0 而非 1', () => {
    expect(validateDouyinParams('danmakuList', { aweme_id: '1', duration: 0 }).duration).toBe(0)
  })

  it('时间参数接受字符串，对应 HTTP query 场景', () => {
    const out = validateDouyinParams('danmakuList', {
      aweme_id: '1',
      duration: '60000',
      start_time: '0',
      end_time: '32000'
    })
    expect(out).toMatchObject({ duration: 60000, start_time: 0, end_time: 32000 })
  })
})

describe('douyin 其他接口', () => {
  it.each(['emojiList', 'dynamicEmojiList'] as const)('%s 忽略一切额外入参', (methodType) => {
    expect(validateDouyinParams(methodType, { aweme_id: '1', number: 5 })).toEqual({ methodType })
  })

  it('liveRoomInfo 同时要求 room_id 与 web_rid', () => {
    expectIssue(() => validateDouyinParams('liveRoomInfo', { room_id: '1' }), 'web_rid')
    expectIssue(() => validateDouyinParams('liveRoomInfo', { web_rid: '1' }), 'room_id')
    expect(validateDouyinParams('liveRoomInfo', { room_id: '1', web_rid: '2' })).toEqual({
      methodType: 'liveRoomInfo',
      room_id: '1',
      web_rid: '2'
    })
  })

  it('musicInfo 要求 music_id', () => {
    expectIssue(() => validateDouyinParams('musicInfo', {}), 'music_id')
  })

  it('loginQrcode 要求 verify_fp', () => {
    expectIssue(() => validateDouyinParams('loginQrcode', {}), 'verify_fp')
  })
})

describe('douyin 校验文案为中文', () => {
  it('aweme_id 缺失时的文案被锁定，v7 若改为英文即属 breaking', () => {
    let thrown: unknown
    try {
      validateDouyinParams('videoWork', {})
    } catch (error) {
      thrown = error
    }
    const issues = (thrown as { issues: Array<{ message: string }> }).issues
    expect(issues[0].message).toBe('视频ID必须是字符串')
  })
})
