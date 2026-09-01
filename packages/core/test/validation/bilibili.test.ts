import { validateBilibiliParams } from 'amagi/validation'
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

describe('KNOWN-DEFECT: bilibili comments 的 schema 与实现字段不一致', () => {
  // types/BilibiliAPIParams.ts 的 CommentParams 声明了这 5 个字段，
  // platform/bilibili/getdata.ts 的 case 'comments' 也确实解构并使用了它们，
  // 但 BilibiliCommentParamsSchema 完全没有声明 -> zod strip 全部丢弃。
  // 后果：翻页游标恒为 undefined（永远从第一页开始），排序模式恒回落到 3。
  const DECLARED_BUT_STRIPPED = ['mode', 'pagination_str', 'plat', 'seek_rpid', 'web_location'] as const

  it.each(DECLARED_BUT_STRIPPED)('comments 的 %s 被静默丢弃', (field) => {
    const out = validateBilibiliParams('comments', {
      oid: '170001',
      type: 1,
      mode: 2,
      pagination_str: 'CURSOR_TOKEN',
      plat: 3,
      seek_rpid: 'rpid',
      web_location: '999999'
    }) as Record<string, unknown>

    expect(out[field]).toBeUndefined()
  })

  it('comments 实际存活的键只有 methodType / oid / type / number / pn', () => {
    const out = validateBilibiliParams('comments', {
      oid: '170001',
      type: 1,
      mode: 2,
      pagination_str: 'CURSOR_TOKEN'
    })
    expect(Object.keys(out).sort()).toEqual(['methodType', 'number', 'oid', 'pn', 'type'])
  })

  it('schema 里的 pn 默认为 1，而 getdata.ts 从不读取它，属于死参数', () => {
    const out = validateBilibiliParams('comments', { oid: '1', type: 1 }) as Record<string, unknown>
    expect(out.pn).toBe(1)
  })

  it('commentReplies 同样只保留 methodType / oid / type / root / number / pn', () => {
    const out = validateBilibiliParams('commentReplies', {
      oid: '1',
      type: 1,
      root: '2',
      pagination_str: 'X',
      mode: 2
    })
    expect(Object.keys(out).sort()).toEqual(['methodType', 'number', 'oid', 'pn', 'root', 'type'])
  })
})

describe('bilibili comments 的正常校验', () => {
  it('number 默认 20', () => {
    expect(validateBilibiliParams('comments', { oid: '1', type: 1 }).number).toBe(20)
  })

  const VALID_TYPES = [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 33]

  it.each(VALID_TYPES)('type 接受合法评论区代码 %i', (type) => {
    expect(validateBilibiliParams('comments', { oid: '1', type }).type).toBe(type)
  })

  it.each([0, 3, 23, 32, 34, 100, -1])('type 为 %i 时报错', (type) => {
    expectIssue(() => validateBilibiliParams('comments', { oid: '1', type }), 'type')
  })

  it('type 接受字符串数字，对应 HTTP query 场景', () => {
    expect(validateBilibiliParams('comments', { oid: '1', type: '1' }).type).toBe(1)
  })

  it('oid 必须是字符串，数字不做强转', () => {
    expectIssue(() => validateBilibiliParams('comments', { oid: 170001, type: 1 }), 'oid', '必须是字符串')
  })

  it('oid 为空字符串时报错', () => {
    expectIssue(() => validateBilibiliParams('comments', { oid: '', type: 1 }), 'oid', '不能为空')
  })
})

describe('bilibili smartNumber 系列字段', () => {
  it.each([
    ['videoStream', 'avid'],
    ['videoStream', 'cid'],
    ['videoDanmaku', 'cid'],
    ['bangumiStream', 'cid']
  ])('%s 的 %s 强转字符串为数字', (methodType, field) => {
    const base: Record<string, unknown> = { avid: '170001', cid: '100', ep_id: '1' }
    const out = validateBilibiliParams(methodType as 'videoStream', base) as Record<string, unknown>
    expect(typeof out[field]).toBe('number')
  })

  it.each([
    ['0', 0],
    ['负数', -1],
    ['小数', 1.5],
    ['非数字', 'abc']
  ])('videoStream 的 avid 为 %s 时报错', (_label, avid) => {
    expectIssue(() => validateBilibiliParams('videoStream', { avid, cid: 1 }), 'avid')
  })

  it('smartNumber 的最小值为 1，因此 host_mid 不接受 0', () => {
    expectIssue(() => validateBilibiliParams('userCard', { host_mid: 0 }), 'host_mid')
    expect(validateBilibiliParams('userCard', { host_mid: 1 }).host_mid).toBe(1)
  })

  it('5 个共享 UserParams 的 methodType 行为一致', () => {
    for (const methodType of ['userCard', 'userDynamicList', 'userLiveStatus', 'userSpaceInfo', 'uploaderTotalViews'] as const) {
      expect(validateBilibiliParams(methodType, { host_mid: '123' })).toEqual({ methodType, host_mid: 123 })
    }
  })
})

describe('bilibili bangumiInfo 的 refine 规则', () => {
  it('ep_id 与 season_id 都缺失时报错', () => {
    expectIssue(() => validateBilibiliParams('bangumiInfo', {}), 'ep_id', '至少需要提供一个')
  })

  it('只给 ep_id 时通过', () => {
    expect(validateBilibiliParams('bangumiInfo', { ep_id: '123' })).toEqual({ methodType: 'bangumiInfo', ep_id: '123' })
  })

  it('只给 season_id 时通过', () => {
    expect(validateBilibiliParams('bangumiInfo', { season_id: '456' })).toEqual({
      methodType: 'bangumiInfo',
      season_id: '456'
    })
  })

  it('KNOWN-DEFECT: season_id 为空字符串时因 refine 判 falsy 而报错', () => {
    expectIssue(() => validateBilibiliParams('bangumiInfo', { season_id: '' }), 'ep_id')
  })
})

describe('bilibili articleCards 的 ids 联合类型', () => {
  it('接受字符串数组', () => {
    expect(validateBilibiliParams('articleCards', { ids: ['1', '2'] }).ids).toEqual(['1', '2'])
  })

  it('接受单个字符串', () => {
    expect(validateBilibiliParams('articleCards', { ids: '1' }).ids).toBe('1')
  })

  it.each([
    ['空数组', []],
    ['空字符串', ''],
    ['数字数组', [1, 2]],
    ['数字', 1]
  ])('ids 为 %s 时报错', (_label, ids) => {
    expectIssue(() => validateBilibiliParams('articleCards', { ids }), 'ids')
  })
})

describe('bilibili videoDanmaku', () => {
  it('segment_index 默认 1', () => {
    expect(validateBilibiliParams('videoDanmaku', { cid: 100 })).toEqual({
      methodType: 'videoDanmaku',
      cid: 100,
      segment_index: 1
    })
  })

  it('segment_index 不接受 0', () => {
    expectIssue(() => validateBilibiliParams('videoDanmaku', { cid: 100, segment_index: 0 }), 'segment_index')
  })
})

describe('bilibili 无参与共享 schema 的接口', () => {
  it.each(['loginStatus', 'loginQrcode', 'emojiList'] as const)('%s 忽略一切额外入参', (methodType) => {
    expect(validateBilibiliParams(methodType, { oid: '1', type: 1, foo: 'bar' })).toEqual({ methodType })
  })

  it('liveRoomInfo 与 liveRoomInit 共享同一 schema', () => {
    for (const methodType of ['liveRoomInfo', 'liveRoomInit'] as const) {
      expect(validateBilibiliParams(methodType, { room_id: '99' })).toEqual({ methodType, room_id: '99' })
    }
  })

  it('room_id 必须是字符串', () => {
    expectIssue(() => validateBilibiliParams('liveRoomInfo', { room_id: 99 }), 'room_id')
  })
})

describe('bilibili 验证码接口', () => {
  it('validateCaptcha 的 4 个字段全部必填', () => {
    for (const missing of ['challenge', 'token', 'validate', 'seccode']) {
      const params: Record<string, string> = { challenge: 'c', token: 't', validate: 'v', seccode: 's' }
      delete params[missing]
      expectIssue(() => validateBilibiliParams('validateCaptcha', params), missing)
    }
  })

  it('csrf 可选', () => {
    const out = validateBilibiliParams('validateCaptcha', {
      challenge: 'c',
      token: 't',
      validate: 'v',
      seccode: 's',
      csrf: 'x'
    })
    expect(out.csrf).toBe('x')
  })
})

describe('bilibili av / bv 转换参数', () => {
  it('avToBv 的 avid 强转字符串', () => {
    expect(validateBilibiliParams('avToBv', { avid: '170001' }).avid).toBe(170001)
  })

  it.each([0, -1, 1.5])('avToBv 的 avid 为 %s 时报错', (avid) => {
    expectIssue(() => validateBilibiliParams('avToBv', { avid }), 'avid')
  })

  it('bvToAv 的 bvid 必须非空字符串', () => {
    expectIssue(() => validateBilibiliParams('bvToAv', { bvid: '' }), 'bvid')
    expect(validateBilibiliParams('bvToAv', { bvid: 'BV1xx411c7mD' }).bvid).toBe('BV1xx411c7mD')
  })

  it('bvToAv 不校验 BV 号格式，任意非空字符串都通过', () => {
    expect(validateBilibiliParams('bvToAv', { bvid: 'not-a-bvid' }).bvid).toBe('not-a-bvid')
  })
})
