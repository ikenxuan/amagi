import { type ValidateOutcome, validateBilibiliParams, validateDouyinParams, validateKuaishouParams, validateXiaohongshuParams } from 'amagi/validation'
// 6.2 起 schema 表 / 路由表不再从 'amagi/validation' barrel 导出，走平台子路径
import { BilibiliMethodRoutes, BilibiliValidationSchemas } from 'amagi/validation/bilibili'
import { DouyinMethodRoutes, DouyinValidationSchemas } from 'amagi/validation/douyin'
import { KuaishouMethodRoutes, KuaishouValidationSchemas } from 'amagi/validation/kuaishou'
import { XiaohongshuMethodRoutes, XiaohongshuValidationSchemas } from 'amagi/validation/xiaohongshu'
/**
 * 参数契约总表 —— v6 -> v7 迁移的核心防线。
 *
 * 这里不断言「应该怎样」，只把 v6 的实际行为逐条钉死：
 * 每个 methodType 接受哪些键、丢弃哪些键、默认值是什么、是否做字符串强转。
 * v7 重构后此文件的 snapshot 若发生变化，就必须在迁移文档里有对应条目。
 */
import { describe, expect, it } from 'vitest'

// v7 形状：validateXxxParams 不再抛错 —— 成功返回 { ok: true, value }，
// 失败返回 { ok: false, issues }（issue 的 path 是点号字符串）。
// 断言函数写成函数声明 —— 赋给 const 的箭头函数其 asserts 签名不生效（ts2775
// 要求调用目标带显式类型注解），调用处不收窄，后面每个 out.value 都会报类型错误
function expectOk<T>(out: ValidateOutcome<T>): asserts out is { ok: true; value: T } {
  expect(out.ok, 'expected validation to pass, got: ' + JSON.stringify(out)).toBe(true)
}

const expectReject = <T>(out: ValidateOutcome<T>, path: string, messagePart?: string) => {
  expect(out.ok, 'expected a validation failure at ' + path).toBe(false)
  if (out.ok) return
  const hit = out.issues.find((i) => i.path === path)
  expect(hit, 'no issue on "' + path + '", got: ' + JSON.stringify(out.issues)).toBeDefined()
  if (messagePart) expect(hit?.message).toContain(messagePart)
}

/** 一次性喂给所有 schema 的超集入参，用于观察「哪些键活下来了」 */
const KITCHEN_SINK: Record<string, unknown> = {
  // douyin
  aweme_id: '7123456789012345678',
  sec_uid: 'MS4wLjABAAAAx',
  comment_id: '99',
  music_id: '77',
  room_id: '123',
  web_rid: '456',
  verify_fp: 'fp',
  query: 'kw',
  duration: 60000,
  start_time: 0,
  end_time: 1000,
  max_cursor: '9',
  search_id: 'sid',
  unique_id: 'ubb_up',
  // bilibili
  oid: '170001',
  type: 1,
  bvid: 'BV1xx411c7mD',
  avid: 170001,
  root: '1',
  host_mid: '1',
  ep_id: '1',
  season_id: '1',
  cid: '1',
  id: '1',
  ids: ['1'],
  dynamic_id: 'dyn1',
  qrcode_key: 'qk',
  v_voucher: 'vv',
  challenge: 'c',
  validate: 'val',
  seccode: 'sc',
  token: 'tk',
  segment_index: 1,
  mode: 2,
  pagination_str: 'PS',
  plat: 3,
  seek_rpid: 'sr',
  web_location: '999',
  pn: 5,
  // kuaishou
  photoId: 'p1',
  principalId: 'pid',
  pcursor: 'pc',
  count: 10,
  // xiaohongshu
  note_id: 'n1',
  xsec_token: 'tk',
  user_id: 'u1',
  keyword: 'kw',
  page: 2,
  sort: 'general',
  cursor_score: 'cs',
  num: 20,
  refresh_type: 1,
  note_index: 0,
  category: 'cat',
  search_key: 'sk',
  // 通用
  number: 7,
  cursor: '3',
  // 一定要被丢弃的键
  AMAGI_UNEXPECTED_KEY: 'must be stripped',
  __proto__polluted: 'x'
}

const PLATFORMS = [
  ['douyin', DouyinValidationSchemas, DouyinMethodRoutes, validateDouyinParams],
  ['bilibili', BilibiliValidationSchemas, BilibiliMethodRoutes, validateBilibiliParams],
  ['kuaishou', KuaishouValidationSchemas, KuaishouMethodRoutes, validateKuaishouParams],
  ['xiaohongshu', XiaohongshuValidationSchemas, XiaohongshuMethodRoutes, validateXiaohongshuParams]
] as const

describe.each(PLATFORMS)('%s - schema / 路由表结构', (name, schemas, routes) => {
  it('schema 表与路由表的键完全一致（任一侧多出即为接口不可达或路由悬空）', () => {
    expect(Object.keys(schemas).sort()).toEqual(Object.keys(routes).sort())
  })

  it('所有路由路径以 / 开头且不含查询串', () => {
    for (const path of Object.values(routes)) {
      expect(path).toMatch(/^\/[a-z0-9_/-]*$/)
    }
  })

  it(`${name} 的 methodType 列表被锁定`, () => {
    expect(Object.keys(schemas)).toMatchSnapshot()
  })

  it(`${name} 的路由表被锁定`, () => {
    expect(routes).toMatchSnapshot()
  })
})

describe('路由路径唯一性', () => {
  const groupByPath = (routes: Record<string, string>) => {
    const byPath = new Map<string, string[]>()
    for (const [method, path] of Object.entries(routes)) {
      byPath.set(path, [...(byPath.get(path) ?? []), method])
    }
    return [...byPath.entries()].filter(([, methods]) => methods.length > 1)
  }

  it.each([
    ['bilibili', BilibiliMethodRoutes],
    ['kuaishou', KuaishouMethodRoutes],
    ['xiaohongshu', XiaohongshuMethodRoutes]
  ])('%s 无重复路径', (_name, routes) => {
    expect(groupByPath(routes as Record<string, string>)).toEqual([])
  })
})

describe.each(PLATFORMS)('%s - 每个 methodType 的接受键集合与默认值', (_name, schemas, _routes, validate) => {
  const results: Record<string, unknown> = {}

  for (const methodType of Object.keys(schemas)) {
    it(`${methodType}`, () => {
      const out = (validate as (m: string, p: unknown) => ValidateOutcome<Record<string, unknown>>)(methodType, KITCHEN_SINK)
      // v7 不抛错：ok 记 value（与 v6 的 parse 结果同形）；失败把 issues 拼回
      // v6 捕获时 '__threw: <path>: <message>' 的形状 —— 契约快照逐字节不变。
      results[methodType] = out.ok ? out.value : { __threw: out.issues.map((i) => `${i.path}: ${i.message}`) }
      expect(results[methodType]).toMatchSnapshot()
    })
  }
})

describe('未声明的键一律被丢弃（zod strip 语义）', () => {
  it.each([
    ['douyin', 'videoWork', validateDouyinParams],
    ['bilibili', 'videoInfo', validateBilibiliParams],
    ['kuaishou', 'videoWork', validateKuaishouParams],
    ['xiaohongshu', 'userProfile', validateXiaohongshuParams]
  ])('%s / %s', (_p, methodType, validate) => {
    const out = (validate as (m: string, p: unknown) => ValidateOutcome<Record<string, unknown>>)(methodType, KITCHEN_SINK)
    expectOk(out)
    expect(out.value).not.toHaveProperty('AMAGI_UNEXPECTED_KEY')
  })
})

describe('methodType 不可被入参偷换', () => {
  // validate 的实现是 schema.parse({ methodType, ...params }) —— 入参在后，
  // 因此入参里的 methodType 确实会覆盖形参，但随即被 literal / enum 校验挡下。
  // 净效果：无法通过入参偷换 methodType，只会拿到校验失败。
  it.each([
    ['douyin', 'videoWork', validateDouyinParams],
    ['bilibili', 'videoInfo', validateBilibiliParams],
    ['kuaishou', 'videoWork', validateKuaishouParams],
    ['xiaohongshu', 'userProfile', validateXiaohongshuParams]
  ])('%s / %s 入参携带别的 methodType 时报校验错误', (_p, methodType, validate) => {
    const out = (validate as (m: string, p: unknown) => ValidateOutcome<Record<string, unknown>>)(methodType, { ...KITCHEN_SINK, methodType: 'SOMETHING_ELSE' })
    expectReject(out, 'methodType')
  })

  it.each([
    ['douyin', 'videoWork', validateDouyinParams],
    ['bilibili', 'videoInfo', validateBilibiliParams],
    ['kuaishou', 'videoWork', validateKuaishouParams],
    ['xiaohongshu', 'userProfile', validateXiaohongshuParams]
  ])('%s / %s 不带 methodType 时由形参补齐', (_p, methodType, validate) => {
    const out = (validate as (m: string, p: unknown) => ValidateOutcome<Record<string, unknown>>)(methodType, KITCHEN_SINK)
    expectOk(out)
    expect(out.value.methodType).toBe(methodType)
  })
})

describe('非对象入参', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['字符串', 'abc'],
    ['数字', 1],
    ['数组', []]
  ])('%s 传入 douyin videoWork 时报校验错误', (_label, params) => {
    const out = validateDouyinParams('videoWork', params)
    expectReject(out, 'aweme_id')
  })
})
