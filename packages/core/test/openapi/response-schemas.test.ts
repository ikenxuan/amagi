import { beforeAll, describe, expect, it } from 'vitest'

import { buildResponseSchemas } from '../../scripts/gen-response-schemas.mjs'
import type { ResponseSchema, ResponseSchemas } from '../../src/contracts/response-schema'

/**
 * 生成类型落到 OpenAPI schema 上的抽样验收。
 *
 * 验的是「端点声明的生成类型确实进了 `response-schemas.generated.ts`」，以及几处容易在
 * 摊平、前缀化、同名隔离里出错的形状。声明 `response: type<any>()` 的端点**不该**出现在
 * `byEndpoint` 里（那条另有断言），openapi 侧保留原来的占位 description。
 */

let schemas: ResponseSchemas
beforeAll(() => {
  schemas = buildResponseSchemas()
}, 30_000)

const resolveNode = (schema: ResponseSchema): ResponseSchema => {
  const ref = schema.$ref
  if (typeof ref !== 'string') return schema
  const prefix = '#/components/schemas/'
  if (!ref.startsWith(prefix)) throw new Error(`Unexpected schema reference: ${ref}`)
  const target = schemas.definitions[ref.slice(prefix.length)]
  if (!target) throw new Error(`Unresolved schema reference: ${ref}`)
  return resolveNode(target)
}

const property = (schema: ResponseSchema, name: string): ResponseSchema => {
  const properties = resolveNode(schema).properties as Record<string, ResponseSchema> | undefined
  const value = properties?.[name]
  if (!value) throw new Error(`Missing schema property: ${name}`)
  return resolveNode(value)
}

const endpoint = (name: string): ResponseSchema => {
  const schema = schemas.byEndpoint[name]
  if (!schema) throw new Error(`Missing response schema: ${name}`)
  return resolveNode(schema)
}

describe('生成类型进入实际生成的响应 schema', () => {
  it.each([
    'douyin_mixAweme',
    'douyin_musicAwemeList',
    'xiaohongshu_liveRoom',
    'xiaohongshu_liveSquare',
    'xiaohongshu_liveStatus',
    'xiaohongshu_searchHotList',
    'xiaohongshu_searchUser',
    'xiaohongshu_subComments',
    'xiaohongshu_userNoteList'
  ])('%s 有可用响应结构', (name) => {
    expect(endpoint(name).properties).toBeDefined()
  })

  it('合集端点的作品数组与游标仍是必需字段', () => {
    const mix = endpoint('douyin_mixAweme')
    expect(mix.required).toEqual(expect.arrayContaining(['aweme_list', 'cursor']))
    expect(property(mix, 'aweme_list').type).toBe('array')
    expect(property(mix, 'cursor').type).toBe('number')
  })

  it('原声作品列表带出作品数组', () => {
    const list = endpoint('douyin_musicAwemeList')
    expect(property(list, 'aweme_list').type).toBe('array')
    const item = resolveNode(property(list, 'aweme_list').items as ResponseSchema)
    expect(property(item, 'aweme_id').type).toBe('string')
  })

  it('小红书长房间 ID 为字符串，普通成功码保持 number', () => {
    const room = endpoint('xiaohongshu_liveRoom')
    expect(property(property(property(room, 'data'), 'room_info'), 'room_id').type).toBe('string')
    expect(property(room, 'code').type).toBe('number')
  })

  it('子评论的 comments 是数组，游标与 has_more 都在', () => {
    const data = property(endpoint('xiaohongshu_subComments'), 'data')
    expect(property(data, 'comments').type).toBe('array')
    expect(property(data, 'cursor').type).toBe('string')
    expect(property(data, 'has_more').type).toBe('boolean')
  })

  it('声明 any 的端点不出现在 byEndpoint 里（openapi 保留占位 description）', () => {
    for (const name of [
      'kuaishou_searchUser',
      'kuaishou_slideFeed',
      'kuaishou_commentReplies',
      'kuaishou_emotionPackageList',
      'kuaishou_loginUserProfile',
      'kuaishou_searchWorkList',
      'xiaohongshu_userProfile',
      'bilibili_validateCaptcha',
      'douyin_loginQrcode'
    ]) {
      expect(schemas.byEndpoint[name]).toBeUndefined()
    }
  })
})

describe('各平台的同名响应保持隔离', () => {
  it('快手 VideoWork_V0 保留 photo/result，不混入抖音 aweme_detail', () => {
    const kuaishou = endpoint('kuaishou_videoWork')
    const branches = ((kuaishou.anyOf as ResponseSchema[] | undefined) ?? [kuaishou]).map(resolveNode)
    expect(branches.some((part) => (part.properties as Record<string, unknown> | undefined)?.photo)).toBe(true)
    for (const branch of branches) {
      expect(branch.properties).not.toHaveProperty('aweme_detail')
    }
  })
})
