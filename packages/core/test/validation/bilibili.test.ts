import { type ValidateOutcome, validateBilibiliParams } from 'amagi/validation'
import { describe, expect, it } from 'vitest'

// v7 形状：validateBilibiliParams 不再抛错 —— 成功返回 { ok: true, value }，
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

describe('bilibili comments 的正常校验', () => {
  it('number 默认 20', () => {
    const out = validateBilibiliParams('comments', { oid: '1', type: 1 })
    expectOk(out)
    expect(out.value.number).toBe(20)
  })

  const VALID_TYPES = [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 33]

  it.each(VALID_TYPES)('type 接受合法评论区代码 %i', (type) => {
    const out = validateBilibiliParams('comments', { oid: '1', type })
    expectOk(out)
    expect(out.value.type).toBe(type)
  })

  it.each([0, 3, 23, 32, 34, 100, -1])('type 为 %i 时报错', (type) => {
    expectReject(validateBilibiliParams('comments', { oid: '1', type }), 'type')
  })

  it('type 接受字符串数字，对应 HTTP query 场景', () => {
    const out = validateBilibiliParams('comments', { oid: '1', type: '1' })
    expectOk(out)
    expect(out.value.type).toBe(1)
  })

  it('oid 必须是字符串，数字不做强转', () => {
    expectReject(validateBilibiliParams('comments', { oid: 170001, type: 1 }), 'oid', '必须是字符串')
  })

  it('oid 为空字符串时报错', () => {
    expectReject(validateBilibiliParams('comments', { oid: '', type: 1 }), 'oid', '不能为空')
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
    const out = validateBilibiliParams(methodType as 'videoStream', base)
    expectOk(out)
    expect(typeof (out.value as Record<string, unknown>)[field]).toBe('number')
  })

  it.each([
    ['0', 0],
    ['负数', -1],
    ['小数', 1.5],
    ['非数字', 'abc']
  ])('videoStream 的 avid 为 %s 时报错', (_label, avid) => {
    expectReject(validateBilibiliParams('videoStream', { avid, cid: 1 }), 'avid')
  })

  it('smartNumber 的最小值为 1，因此 host_mid 不接受 0', () => {
    expectReject(validateBilibiliParams('userCard', { host_mid: 0 }), 'host_mid')
    const out = validateBilibiliParams('userCard', { host_mid: 1 })
    expectOk(out)
    expect(out.value.host_mid).toBe(1)
  })

  it('5 个共享 UserParams 的 methodType 行为一致', () => {
    for (const methodType of ['userCard', 'userDynamicList', 'userLiveStatus', 'userSpaceInfo', 'uploaderTotalViews'] as const) {
      const out = validateBilibiliParams(methodType, { host_mid: '123' })
      expectOk(out)
      expect(out.value).toEqual({ methodType, host_mid: 123 })
    }
  })
})

describe('bilibili bangumiInfo 的 refine 规则', () => {
  it('ep_id 与 season_id 都缺失时报错', () => {
    expectReject(validateBilibiliParams('bangumiInfo', {}), 'ep_id', '至少需要提供一个')
  })

  it('只给 ep_id 时通过', () => {
    const out = validateBilibiliParams('bangumiInfo', { ep_id: '123' })
    expectOk(out)
    expect(out.value).toEqual({ methodType: 'bangumiInfo', ep_id: '123' })
  })

  it('只给 season_id 时通过', () => {
    const out = validateBilibiliParams('bangumiInfo', { season_id: '456' })
    expectOk(out)
    expect(out.value).toEqual({
      methodType: 'bangumiInfo',
      season_id: '456'
    })
  })
})

describe('bilibili articleCards 的 ids 联合类型', () => {
  it('接受字符串数组', () => {
    const out = validateBilibiliParams('articleCards', { ids: ['1', '2'] })
    expectOk(out)
    expect(out.value.ids).toEqual(['1', '2'])
  })

  it('接受单个字符串', () => {
    const out = validateBilibiliParams('articleCards', { ids: '1' })
    expectOk(out)
    expect(out.value.ids).toBe('1')
  })

  it.each([
    ['空数组', []],
    ['空字符串', ''],
    ['数字数组', [1, 2]],
    ['数字', 1]
  ])('ids 为 %s 时报错', (_label, ids) => {
    expectReject(validateBilibiliParams('articleCards', { ids }), 'ids')
  })
})

describe('bilibili videoDanmaku', () => {
  it('segment_index 默认 1', () => {
    const out = validateBilibiliParams('videoDanmaku', { cid: 100 })
    expectOk(out)
    expect(out.value).toEqual({
      methodType: 'videoDanmaku',
      cid: 100,
      segment_index: 1
    })
  })

  it('segment_index 不接受 0', () => {
    expectReject(validateBilibiliParams('videoDanmaku', { cid: 100, segment_index: 0 }), 'segment_index')
  })
})

describe('bilibili 无参与共享 schema 的接口', () => {
  it.each(['loginStatus', 'loginQrcode', 'emojiList'] as const)('%s 忽略一切额外入参', (methodType) => {
    const out = validateBilibiliParams(methodType, { oid: '1', type: 1, foo: 'bar' })
    expectOk(out)
    expect(out.value).toEqual({ methodType })
  })

  it('liveRoomInfo 与 liveRoomInit 共享同一 schema', () => {
    for (const methodType of ['liveRoomInfo', 'liveRoomInit'] as const) {
      const out = validateBilibiliParams(methodType, { room_id: '99' })
      expectOk(out)
      expect(out.value).toEqual({ methodType, room_id: '99' })
    }
  })

  it('room_id 必须是字符串', () => {
    expectReject(validateBilibiliParams('liveRoomInfo', { room_id: 99 }), 'room_id')
  })
})

describe('bilibili 验证码接口', () => {
  it('validateCaptcha 的 4 个字段全部必填', () => {
    for (const missing of ['challenge', 'token', 'validate', 'seccode']) {
      const params: Record<string, string> = { challenge: 'c', token: 't', validate: 'v', seccode: 's' }
      delete params[missing]
      expectReject(validateBilibiliParams('validateCaptcha', params), missing)
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
    expectOk(out)
    expect(out.value.csrf).toBe('x')
  })
})

describe('bilibili av / bv 转换参数', () => {
  it('avToBv 的 avid 强转字符串', () => {
    const out = validateBilibiliParams('avToBv', { avid: '170001' })
    expectOk(out)
    expect(out.value.avid).toBe(170001)
  })

  it.each([0, -1, 1.5])('avToBv 的 avid 为 %s 时报错', (avid) => {
    expectReject(validateBilibiliParams('avToBv', { avid }), 'avid')
  })

  it('bvToAv 的 bvid 必须非空字符串', () => {
    expectReject(validateBilibiliParams('bvToAv', { bvid: '' }), 'bvid')
    const out = validateBilibiliParams('bvToAv', { bvid: 'BV1xx411c7mD' })
    expectOk(out)
    expect(out.value.bvid).toBe('BV1xx411c7mD')
  })

  it('bvToAv 不校验 BV 号格式，任意非空字符串都通过', () => {
    const out = validateBilibiliParams('bvToAv', { bvid: 'not-a-bvid' })
    expectOk(out)
    expect(out.value.bvid).toBe('not-a-bvid')
  })
})
