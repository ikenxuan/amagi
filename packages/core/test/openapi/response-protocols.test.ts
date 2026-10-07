import { beforeAll, describe, expect, it } from 'vitest'

import { buildResponseSchemas } from '../../scripts/gen-response-schemas.mjs'
import type { ResponseSchema, ResponseSchemas } from '../../src/contracts/response-schema'

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

describe('公开协议扩展进入实际生成的响应 schema', () => {
  it.each([
    'douyin_mixAweme',
    'kuaishou_commentReplies',
    'kuaishou_emotionPackageList',
    'kuaishou_loginUserProfile',
    'kuaishou_searchUser',
    'kuaishou_searchWorkList',
    'kuaishou_slideFeed',
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

  it('快手搜索的地址、码流、认证及声明有具体 schema', () => {
    const item = (schema: ResponseSchema) => resolveNode(schema.items as ResponseSchema)
    const user = item(property(endpoint('kuaishou_searchUser'), 'users'))
    const livingId = property(property(user, 'livingInfo'), 'livingId')
    expect(livingId.type).toEqual(expect.arrayContaining(['string', 'null']))
    expect(property(property(user, 'verifiedDetail'), 'description').type).toBe('string')

    const feed = item(property(endpoint('kuaishou_searchWorkList'), 'feeds'))
    const photo = property(feed, 'photo')
    for (const key of ['riskTagContent', 'riskTagUrl']) {
      expect(property(photo, key).type).toEqual(expect.arrayContaining(['string', 'null']))
    }
    expect(property(item(property(photo, 'photoUrls')), 'url').type).toBe('string')
    expect(property(item(property(photo, 'photoH265Urls')), 'cdn').type).toBe('string')
    for (const key of ['manifest', 'manifestH265']) {
      const manifest = property(photo, key)
      const adaptation = item(property(manifest, 'adaptationSet'))
      const representation = item(property(adaptation, 'representation'))
      expect(item(property(representation, 'backupUrl')).type).toBe('string')
      expect(item(property(representation, 'bitratePattern')).type).toBe('number')
      expect(property(property(representation, 'kvqScore'), 'FR').type).toBe('number')
      expect(property(property(representation, 'volumeInfo'), 'loudness').type).toBe('number')
      expect(property(property(representation, 'colorInfo'), 'saturation').type).toBe('number')
      expect(property(property(manifest, 'audioFeature'), 'audioQuality').type).toBe('number')
    }
    expect(property(item(property(feed, 'tags')), 'name').type).toBe('string')
    expect(property(property(feed, 'authorStatement'), 'riskStyleType').type).toBe('number')
  })

  it('快手当前账号资料保持平铺及标识类型', () => {
    const profile = endpoint('kuaishou_loginUserProfile')
    expect(profile.properties).not.toHaveProperty('data')
    expect(property(profile, 'eid').type).toBe('string')
    expect(property(profile, 'userId').type).toBe('number')
    expect(property(profile, 'userDefineId').type).toBe('string')
    expect(property(profile, 'userTex').type).toBe('string')
  })

  it('userProfile 的协议覆盖优先于旧 HTML 生成类型', () => {
    const data = property(endpoint('xiaohongshu_userProfile'), 'data')
    const properties = data.properties as Record<string, unknown>
    expect(properties).toHaveProperty('basic_info')
    expect(properties).toHaveProperty('interactions')
    expect(properties).toHaveProperty('tab_public')
    expect(properties).not.toHaveProperty('basicInfo')
    expect(properties).not.toHaveProperty('tabPublic')
  })

  it('归一化保证的合集数组和游标在 schema 中仍为必需字段', () => {
    const mix = endpoint('douyin_mixAweme')
    expect(mix.required).toEqual(expect.arrayContaining(['aweme_list', 'cursor']))
    expect(property(mix, 'aweme_list').type).toBe('array')
    expect(property(mix, 'cursor').type).toBe('number')
  })

  it('小红书长房间 ID 为字符串，普通成功码保持 number', () => {
    const room = endpoint('xiaohongshu_liveRoom')
    expect(property(property(property(room, 'data'), 'room_info'), 'room_id').type).toBe('string')
    expect(property(room, 'code').type).toBe('number')
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

describe('已知长整数 ID 的 schema 与公开类型一致', () => {
  it('音乐 ID 允许 number/string，音乐时长仍只允许 number', () => {
    const music = property(endpoint('douyin_musicInfo'), 'music_info')
    const variants = music.anyOf as ResponseSchema[] | undefined
    const detail = variants ? resolveNode(variants.find((part) => part.type !== 'null')!) : music
    expect(property(detail, 'id').type).toEqual(['number', 'string'])
    expect(property(detail, 'duration').type).toBe('number')
  })

  it('作品 ID 字段允许 number/string，时间及普通状态不扩宽', () => {
    const video = endpoint('douyin_videoWork')
    const branches = (video.anyOf as ResponseSchema[] | undefined) ?? [video]
    const work = branches
      .map(resolveNode)
      .filter((part) => (part.properties as Record<string, unknown> | undefined)?.aweme_detail)
      .map((part) => property(part, 'aweme_detail'))
      .find((part) => part.type !== 'null')!
    expect(property(work, 'author_user_id').type).toEqual(['number', 'string'])
    expect(property(work, 'comment_gid').type).toEqual(['number', 'string'])
    expect(property(work, 'create_time').type).toBe('number')
    expect(property(work, 'aweme_type').type).toBe('number')
  })
})
