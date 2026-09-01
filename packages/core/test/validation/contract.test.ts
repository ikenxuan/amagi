import {
  BilibiliValidationSchemas,
  DouyinValidationSchemas,
  KuaishouValidationSchemas,
  validateBilibiliParams,
  validateDouyinParams,
  validateKuaishouParams,
  validateXiaohongshuParams,
  XiaohongshuValidationSchemas
} from 'amagi/validation'
import { BilibiliMethodRoutes } from 'amagi/validation/bilibili'
import { DouyinMethodRoutes } from 'amagi/validation/douyin'
import { KuaishouMethodRoutes } from 'amagi/validation/kuaishou'
import { XiaohongshuMethodRoutes } from 'amagi/validation/xiaohongshu'
/**
 * 参数契约总表 —— v6 -> v7 迁移的核心防线。
 *
 * 这里不断言「应该怎样」，只把 v6 的实际行为逐条钉死：
 * 每个 methodType 接受哪些键、丢弃哪些键、默认值是什么、是否做字符串强转。
 * v7 重构后此文件的 snapshot 若发生变化，就必须在迁移文档里有对应条目。
 */
import { describe, expect, it } from 'vitest'

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

  // Express 只会命中第一个注册的同路径 handler，因此后 4 个 methodType 通过 HTTP 不可达。
  it('KNOWN-DEFECT: douyin 有 5 个 methodType 共用 /fetch_one_work', () => {
    expect(groupByPath(DouyinMethodRoutes as unknown as Record<string, string>)).toEqual([
      ['/fetch_one_work', ['parseWork', 'textWork', 'videoWork', 'imageAlbumWork', 'slidesWork']]
    ])
  })
})

describe.each(PLATFORMS)('%s - 每个 methodType 的接受键集合与默认值', (_name, schemas, _routes, validate) => {
  const results: Record<string, unknown> = {}

  for (const methodType of Object.keys(schemas)) {
    it(`${methodType}`, () => {
      let outcome: unknown
      try {
        outcome = (validate as (m: string, p: unknown) => unknown)(methodType, KITCHEN_SINK)
      } catch (error) {
        outcome = {
          __threw:
            (error as { issues?: Array<{ path: unknown[]; message: string }> }).issues?.map((i) => `${i.path.join('.')}: ${i.message}`) ??
            String(error)
        }
      }
      results[methodType] = outcome
      expect(outcome).toMatchSnapshot()
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
    const out = (validate as (m: string, p: unknown) => Record<string, unknown>)(methodType, KITCHEN_SINK)
    expect(out).not.toHaveProperty('AMAGI_UNEXPECTED_KEY')
  })
})

describe('methodType 不可被入参偷换', () => {
  // validate 的实现是 schema.parse({ methodType, ...params }) —— 入参在后，
  // 因此入参里的 methodType 确实会覆盖形参，但随即被 literal / enum 校验挡下。
  // 净效果：无法通过入参偷换 methodType，只会拿到校验错误。
  it.each([
    ['douyin', 'videoWork', validateDouyinParams],
    ['bilibili', 'videoInfo', validateBilibiliParams],
    ['kuaishou', 'videoWork', validateKuaishouParams],
    ['xiaohongshu', 'userProfile', validateXiaohongshuParams]
  ])('%s / %s 入参携带别的 methodType 时抛出校验错误', (_p, methodType, validate) => {
    const run = () => (validate as (m: string, p: unknown) => unknown)(methodType, { ...KITCHEN_SINK, methodType: 'SOMETHING_ELSE' })
    expect(run).toThrow()
  })

  it.each([
    ['douyin', 'videoWork', validateDouyinParams],
    ['bilibili', 'videoInfo', validateBilibiliParams],
    ['kuaishou', 'videoWork', validateKuaishouParams],
    ['xiaohongshu', 'userProfile', validateXiaohongshuParams]
  ])('%s / %s 不带 methodType 时由形参补齐', (_p, methodType, validate) => {
    const out = (validate as (m: string, p: unknown) => Record<string, unknown>)(methodType, KITCHEN_SINK)
    expect(out.methodType).toBe(methodType)
  })
})

describe('非对象入参', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['字符串', 'abc'],
    ['数字', 1],
    ['数组', []]
  ])('%s 传入 douyin videoWork 时抛出校验错误', (_label, params) => {
    expect(() => validateDouyinParams('videoWork', params)).toThrow()
  })
})
