import { readFileSync } from 'node:fs'

import type { Registry } from 'amagi/contracts/endpoint'
import { SUCCESS_MESSAGE } from 'amagi/contracts/result'
import { bilibiliRegistry } from 'amagi/platforms/bilibili/endpoints'
import { douyinRegistry } from 'amagi/platforms/douyin/endpoints'
import { kuaishouRegistry } from 'amagi/platforms/kuaishou/endpoints'
import { xiaohongshuRegistry } from 'amagi/platforms/xiaohongshu/endpoints'
/**
 * OpenAPI 规范的派生性判据（PRD 阶段 8.2）。
 *
 * 两件事：
 * 1. **规范与注册表一致** —— 已提交的 `openapi.json` 必须等于此刻从注册表生成的
 *    内容。忘了重跑生成器、或手改了产物，这里就红（不必等 CI 的 --check）。
 * 2. **参数一个都不许被吃掉** —— 5 个代表端点的 parameter 名集合与 required
 *    逐条对着 `zod.toJSONSchema` 校验。`#52`（B站 comments 的 5 个参数被 zod
 *    悄悄吃掉）再犯的话，规范里会立刻少 5 个 parameter，这条测试即红。
 */
import { describe, expect, it } from 'vitest'
import zod from 'zod'

import { buildSpec, OUT_FILE, serialize } from '../../scripts/gen-openapi.mts'

interface Operation {
  operationId: string
  tags: string[]
  summary: string
  parameters: Array<{ name: string; in: string; required: boolean; schema: Record<string, unknown> }>
  responses: Record<string, { content?: { 'application/json': { schema: Record<string, unknown> } } }>
}

interface JsonSchema {
  required?: string[]
  properties?: Record<string, Record<string, unknown>>
}

interface Spec {
  info: { description: string }
  tags: Array<{ name: string; description: string }>
  paths: Record<string, { get: Operation }>
  components: { schemas: Record<string, JsonSchema>; securitySchemes: Record<string, Record<string, unknown>> }
  security: Array<Record<string, unknown>>
}

const spec = buildSpec() as unknown as Spec

const REGISTRIES: Record<string, Registry> = {
  douyin: douyinRegistry,
  bilibili: bilibiliRegistry,
  kuaishou: kuaishouRegistry,
  xiaohongshu: xiaohongshuRegistry
}

/** 5 个代表端点：无参 / 单参 / 曾被吃掉 5 个参数 / 翻页 / 纯计算 */
const SAMPLES = [
  ['douyin', 'emojiList', '/api/douyin/fetch_emoji_list'],
  ['bilibili', 'videoInfo', '/api/bilibili/fetch_one_video'],
  ['bilibili', 'comments', '/api/bilibili/fetch_work_comments'],
  ['kuaishou', 'userWorkList', '/api/kuaishou/fetch_user_work_list'],
  ['bilibili', 'avToBv', '/api/bilibili/av_to_bv']
] as const

describe('openapi 产物与注册表一致', () => {
  it('已提交的 openapi.json 就是此刻生成的内容（手改或忘跑生成器即红）', () => {
    const committed = readFileSync(OUT_FILE, 'utf8').replace(/\r\n/g, '\n')
    expect(committed).toBe(serialize(buildSpec() as never))
  })

  it('paths 恰好 59 条，逐条等于 /api/<platform><def.route>', () => {
    const expected: string[] = []
    for (const [platform, registry] of Object.entries(REGISTRIES)) {
      for (const def of Object.values(registry)) expected.push(`/api/${platform}${def.route}`)
    }
    expect(expected).toHaveLength(59)
    expect(Object.keys(spec.paths).sort()).toEqual([...expected].sort())
  })

  it('每条 path 只有 get（routes.ts 把所有路由注册为 GET）', () => {
    for (const [path, item] of Object.entries(spec.paths)) {
      expect(Object.keys(item), path).toEqual(['get'])
    }
  })

  it('tag 是平台段，summary 取自 doc.summary', () => {
    for (const [platform, registry] of Object.entries(REGISTRIES)) {
      for (const [short, def] of Object.entries(registry)) {
        const op = spec.paths[`/api/${platform}${def.route}`].get
        expect(op.tags, def.name).toEqual([platform])
        expect(op.summary, def.name).toBe(def.doc?.summary)
        expect(op.operationId, def.name).toBe(`${platform}_${short}`)
      }
    }
  })
})

describe('openapi parameters 与 zod schema 一致', () => {
  it.each(SAMPLES)('%s.%s 的参数名集合与 required 与 zod.toJSONSchema 一致', (platform, short, path) => {
    const def = REGISTRIES[platform][short]
    const json = zod.toJSONSchema(def.params, { io: 'input', unrepresentable: 'any' }) as {
      properties?: Record<string, unknown>
      required?: string[]
    }
    const op = spec.paths[path].get

    expect(op.parameters.map((p) => p.name)).toEqual(Object.keys(json.properties ?? {}))
    expect(op.parameters.every((p) => p.in === 'query')).toBe(true)
    expect(op.parameters.filter((p) => p.required).map((p) => p.name).sort()).toEqual([...(json.required ?? [])].sort())
  })

  it('bilibili.comments 的 8 个参数一个不少（#52 的回归防线）', () => {
    const names = spec.paths['/api/bilibili/fetch_work_comments'].get.parameters.map((p) => p.name)
    expect(names).toEqual(['oid', 'type', 'number', 'mode', 'pagination_str', 'plat', 'seek_rpid', 'web_location'])
    // #52：v6 的 schema 只留下 oid / type / number，下面这 5 个被 zod 悄悄吃掉，
    // 调用方传了也不会进请求。少一个，规范里就少一个 parameter，这条即红
    for (const eaten of ['mode', 'pagination_str', 'plat', 'seek_rpid', 'web_location']) {
      expect(names, `#52 的 ${eaten} 又被吃掉了`).toContain(eaten)
    }
  })

  it('douyin.emojiList 无参数，bilibili.avToBv 只有一个必填参数', () => {
    expect(spec.paths['/api/douyin/fetch_emoji_list'].get.parameters).toEqual([])
    const avToBv = spec.paths['/api/bilibili/av_to_bv'].get.parameters
    expect(avToBv).toHaveLength(1)
    expect(avToBv[0].required).toBe(true)
  })
})

describe('openapi 响应信封与 contracts/result.ts 一致', () => {
  const success = spec.components.schemas.AmagiSuccess
  const failure = spec.components.schemas.AmagiFailure

  it('成功分支不含 error 键，失败分支不含 data 键（result.ts 硬约束 2）', () => {
    expect(Object.keys(success.properties ?? {})).not.toContain('error')
    expect(Object.keys(failure.properties ?? {})).not.toContain('data')
  })

  it('两分支都没有顶层 code（result.ts 硬约束 3 —— v7 顶层不再有 code）', () => {
    expect(Object.keys(success.properties ?? {})).not.toContain('code')
    expect(Object.keys(failure.properties ?? {})).not.toContain('code')
  })

  it('成功时 message 的示例是 SUCCESS_MESSAGE', () => {
    // OpenAPI 3.1 用 JSON Schema 的 examples 数组，不是 3.0 的 example
    expect(success.properties?.message.examples).toEqual([SUCCESS_MESSAGE])
  })

  it('requestPath 在两分支都是必填（routes.ts 的 res.json({ ...result, requestPath })）', () => {
    expect(success.required).toContain('requestPath')
    expect(failure.required).toContain('requestPath')
    expect(success.properties?.requestPath.type).toBe('string')
    expect(failure.properties?.requestPath.type).toBe('string')
  })

  it('success 是判别键：两分支各自 const true / false', () => {
    expect(success.properties?.success.const).toBe(true)
    expect(failure.properties?.success.const).toBe(false)
  })

  it('每个 operation 的 200 都是两个信封的 oneOf', () => {
    for (const [path, item] of Object.entries(spec.paths)) {
      expect(item.get.responses['200'].content?.['application/json'].schema.oneOf, path).toEqual([
        { $ref: '#/components/schemas/AmagiSuccess' },
        { $ref: '#/components/schemas/AmagiFailure' }
      ])
    }
  })
})

describe('openapi 鉴权与 host 警告', () => {
  it('bearerAuth 是 http/bearer', () => {
    expect(spec.components.securitySchemes.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer' })
  })

  it('security 用 [{}, { bearerAuth: [] }] 表达「可选」（不传 token 时无鉴权，v6 行为不变）', () => {
    expect(spec.security).toEqual([{}, { bearerAuth: [] }])
  })

  it('info.description 写明 :: 与默认无鉴权的警告', () => {
    expect(spec.info.description).toContain("'::'")
    expect(spec.info.description).toContain('无鉴权')
    expect(spec.info.description).toContain('127.0.0.1')
  })

  it('401 的体是 auth.ts 的精简形状（没有 meta，code 恒为 UNAUTHORIZED）', () => {
    const schema = spec.paths['/api/douyin/fetch_emoji_list'].get.responses['401'].content?.['application/json']
      .schema as unknown as JsonSchema
    expect(schema.required).toEqual(['success', 'error'])
    expect(Object.keys(schema.properties ?? {})).toEqual(['success', 'error'])
    expect(schema.properties?.error.required).toEqual(['code', 'message'])
  })
})
