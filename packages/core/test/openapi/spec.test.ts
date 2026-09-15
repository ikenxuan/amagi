import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Registry } from 'amagi/contracts/endpoint'
import { SUCCESS_MESSAGE } from 'amagi/contracts/result'
import { bilibiliRegistry } from 'amagi/platforms/bilibili/endpoints'
import { douyinRegistry } from 'amagi/platforms/douyin/endpoints'
import { kuaishouRegistry } from 'amagi/platforms/kuaishou/endpoints'
import { xiaohongshuRegistry } from 'amagi/platforms/xiaohongshu/endpoints'
import { buildOpenApiSpec, serializeOpenApiSpec } from 'amagi/server/openapi'
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

interface JsonSchema {
  required?: string[]
  properties?: Record<string, Record<string, unknown>>
}

/** 响应体 / 具名 schema 的节点。测试只读它用到的几个键 */
interface SchemaNode extends JsonSchema {
  type?: string
  /** 不该出现在响应根上 —— 见下面那条断言的理由 */
  oneOf?: unknown[]
  allOf?: unknown[]
}

interface Operation {
  operationId: string
  tags: string[]
  summary: string
  parameters: Array<{ name: string; in: string; required: boolean; schema: Record<string, unknown> }>
  responses: Record<string, { content?: { 'application/json': { schema: SchemaNode } } }>
}

interface Spec {
  info: { description: string }
  tags: Array<{ name: string; description: string }>
  paths: Record<string, { get: Operation }>
  components: { schemas: Record<string, SchemaNode>; securitySchemes: Record<string, Record<string, unknown>> }
  security: Array<Record<string, unknown>>
}

const spec = buildOpenApiSpec() as unknown as Spec

/**
 * 取某个 operation 的 200 响应 schema。
 *
 * 不用 `content?.…` 直接取：那条链会把结果变成 `SchemaNode | undefined`，
 * 类型检查会报 `possibly undefined`（vitest 把它算作 Unhandled Source Error，
 * **汇总行仍显示 "Type Errors no errors"**，只看汇总会漏掉）。
 * @param item - path item
 * @returns 该 operation 的 200 响应 schema
 */
const okSchemaOf = (item: { get: Operation }): SchemaNode => {
  const schema = item.get.responses['200']?.content?.['application/json']?.schema
  if (!schema) throw new Error(`${item.get.operationId} 缺 200 响应的 application/json schema`)
  return schema
}

const CORE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
/** 已提交的产物；info.version 取 package.json（运行期由 tsdown 注入，测试里拿不到） */
const OUT_FILE = join(CORE_ROOT, 'openapi.json')
const { version } = JSON.parse(readFileSync(join(CORE_ROOT, 'package.json'), 'utf8')) as { version: string }

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
    expect(committed).toBe(serializeOpenApiSpec(buildOpenApiSpec({ version }) as never))
  })

  it('paths 恰好 65 条，逐条等于 /api/<platform><def.route>', () => {
    const expected: string[] = []
    for (const [platform, registry] of Object.entries(REGISTRIES)) {
      for (const def of Object.values(registry)) expected.push(`/api/${platform}${def.route}`)
    }
    expect(expected).toHaveLength(65)
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

  it('顶层 tags 带 x-displayName（文档站分组标题读它，否则显示裸 tag 名）', () => {
    expect(spec.tags.map((t) => t.name)).toEqual(['douyin', 'bilibili', 'kuaishou', 'xiaohongshu'])
    expect(spec.tags.map((t) => (t as unknown as Record<string, string>)['x-displayName'])).toEqual(['抖音', 'B站', '快手', '小红书'])
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
    expect(
      op.parameters
        .filter((p) => p.required)
        .map((p) => p.name)
        .sort()
    ).toEqual([...(json.required ?? [])].sort())
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

  it('每个 operation 的 200 根都是普通对象，不是 oneOf', () => {
    for (const [path, item] of Object.entries(spec.paths)) {
      const schema = okSchemaOf(item)
      // 根放 `oneOf` 能精确表达「成功与失败互斥」，但 Apifox 的「类型」树与「生成类型」
      // 都要沿 `properties` 走 —— 根是联合时它没有属性可走，生成出来是空的
      // （2026-09-15 实际踩到）。Apifox 自己导出的接口一律是普通对象根，这里跟它对齐，
      // 互斥改由 `success` 判别 + description 说明。
      expect(schema.oneOf, `${path} 的响应根不能是 oneOf（Apifox 生成类型会空）`).toBeUndefined()
      expect(schema.type, path).toBe('object')
      expect(Object.keys(schema.properties ?? {}), path).toEqual(['success', 'data', 'error', 'message', 'meta', 'requestPath'])
      // data / error 互斥，普通对象表达不了，所以两者都可选
      expect(schema.required, path).toEqual(['success', 'message', 'meta', 'requestPath'])
      expect(schema.properties?.success.type, path).toBe('boolean')
      expect(schema.properties?.error, path).toEqual({ $ref: '#/components/schemas/AmagiError' })
    }
  })

  it('有响应类型的端点：data 指向真实存在、且非空的具名 schema', () => {
    const { schemas } = spec.components
    const withType = Object.values(spec.paths).filter((item) => {
      const data = okSchemaOf(item).properties?.data
      return typeof (data as { $ref?: string } | undefined)?.$ref === 'string'
    })
    // 65 个端点里 9 个是 `response: type<any>()`，源码里就没有类型可言 —— 其余都应该有
    expect(withType.length).toBe(56)

    for (const item of withType) {
      const { operationId } = item.get
      const data = okSchemaOf(item).properties?.data
      expect(data, operationId).toEqual({ $ref: `#/components/schemas/${operationId}` })
      const schema = schemas[operationId]
      expect(schema, `${operationId} 的 data schema 不存在（$ref 会断链）`).toBeDefined()
      // 空 schema（`{}`）等于没类型，不能算数
      expect(Object.keys(schema).length, `${operationId} 的 data schema 是空的`).toBeGreaterThan(0)
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
