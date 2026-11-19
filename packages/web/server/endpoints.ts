/**
 * 端点清单：注册表 → 前端能直接渲染的描述。**一个表单都不手写。**
 *
 * 这一层是纯的（注册表是模块级常量，`zod.toJSONSchema` 不碰 IO），
 * 唯一的外部输入是「已入库样本数」与「根种子」，都从参数进来。
 */

import { expandParamMatrix, type JsonSchemaLike, resolveSeeds, type SeedFile } from '@ikenxuan/amagi-typegen'
import * as zod from 'zod'

import type { AnyEndpointDef, Registry } from '../../core/src/contracts/endpoint'
import { internalParamKeysOf } from '../../core/src/contracts/endpoint'
import type { Platform } from '../../core/src/contracts/platform'
import { bilibiliRegistry } from '../../core/src/platforms/bilibili/endpoints'
import { douyinChannelOf } from '../../core/src/platforms/douyin/channels'
import { douyinRegistry } from '../../core/src/platforms/douyin/registry'
import { kuaishouRegistry } from '../../core/src/platforms/kuaishou/endpoints'
import { xiaohongshuRegistry } from '../../core/src/platforms/xiaohongshu/endpoints'
import type { EndpointInfo, ParamsSchema, PlatformInfo } from '../shared/contract'

export const REGISTRIES: Record<Platform, Registry> = {
  douyin: douyinRegistry,
  bilibili: bilibiliRegistry,
  kuaishou: kuaishouRegistry,
  xiaohongshu: xiaohongshuRegistry
}

export const PLATFORMS = Object.keys(REGISTRIES) as Platform[]

/** 参数表单的描述就是端点 params 的 JSON Schema —— `server/openapi.ts` 已经这么用 */
export const schemaOf = (def: AnyEndpointDef): JsonSchemaLike => {
  const schema = zod.toJSONSchema(def.params, { io: 'input', unrepresentable: 'any' }) as JsonSchemaLike
  if (def.name.startsWith('douyin.app')) {
    const internal = internalParamKeysOf(def.params)
    for (const key of internal) delete schema.properties?.[key]
    if (schema.required) schema.required = schema.required.filter((key) => !internal.has(key))
  }
  return schema
}

/**
 * 端点定义的源文件路径。按注册表的目录约定推出来，不去解析 AST ——
 * 61 个端点全部住在 `platforms/<平台>/endpoints/<端点名>.ts`。
 */
const sourceOf = (platform: Platform, endpoint: string): string => {
  const base = `packages/core/src/platforms/${platform}`
  if (platform !== 'douyin') return `${base}/endpoints/${endpoint}.ts`
  if (douyinChannelOf(endpoint) === 'app') {
    const name =
      endpoint === 'emojiResourceMeta'
        ? 'emojiResourceGuest'
        : endpoint === 'appEmojiResourceMeta'
          ? 'emojiResource'
          : endpoint.slice(3).replace(/^./, (char) => char.toLowerCase())
    return `${base}/app/endpoints/${name}.ts`
  }
  if (endpoint.startsWith('guest')) return `${base}/web/endpoints/guest/${endpoint.slice(5).replace(/^./, (char) => char.toLowerCase())}.ts`
  return `${base}/web/endpoints/${endpoint}.ts`
}

export const buildEndpointList = (input: {
  seeds: SeedFile
  /** 某平台有没有 cookie。由调用方读环境变量后传进来，这一层不碰 `process.env` */
  hasCookie: (platform: Platform) => boolean
  /** 某个端点已入库多少份。由调用方读盘后传进来 */
  storedCount: (platform: Platform, endpoint: string) => number
}): PlatformInfo[] =>
  PLATFORMS.map((platform) => ({
    platform,
    hasCookie: input.hasCookie(platform),
    endpoints: Object.entries(REGISTRIES[platform]).map(([name, def]): EndpointInfo => {
      const schema = schemaOf(def as AnyEndpointDef)
      const seeds = resolveSeeds(input.seeds, platform, name)
      const matrix = expandParamMatrix(schema, { seeds })
      return {
        name,
        summary: (def as AnyEndpointDef).doc?.summary ?? '',
        schema: schema as ParamsSchema,
        seeds,
        stored: input.storedCount(platform, name),
        combinations: matrix.combinations.length,
        unseeded: matrix.unseeded,
        source: sourceOf(platform, name),
        // **判据与 core 里那个短路逐字相同**（`runtime/execute.ts` 的 `if (def.compute)`）。
        // 界面拿它做三件事，理由写在契约的这个字段上
        computed: (def as AnyEndpointDef).compute !== undefined
      }
    })
  }))
