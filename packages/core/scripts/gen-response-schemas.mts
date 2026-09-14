/**
 * 端点响应类型 → JSON Schema。
 *
 * **要解决的问题**：端点声明里写的是 `response: type<DouyinVideoWorkResponse>()`，而
 * `type<T>()` 是纯编译期令牌（`contracts/endpoint.ts` 写明「运行时永远是 undefined」）。
 * 生成 OpenAPI 时读的是运行时注册表，拿到的是空对象 —— 所以 `AmagiSuccess.data`
 * 一直是个只有 description 的空壳，Apifox 里只能渲染成 `null`。
 *
 * 这里把响应类型当**源码**读：用 ts-json-schema-generator 走 TypeScript AST，
 * 把它转成 JSON Schema，产出一份 `src/server/response-schemas.generated.ts` 供
 * `server/openapi.ts` 静态引用。
 *
 * **为什么不逐文件跑 CLI**：实测逐文件 195 秒（每个类型建一遍 program），
 * 共享一个 program 后 1.9 秒。`openapi:check` 每次 CI 推送都跑，这个差别是决定性的。
 *
 * **为什么要递归展开到叶子**：生成的类型里，同名辅助类型（`Data` / `Extra` /
 * `AwemeDetail`）会在**同一端点的多个文件里各声明一份**。把联合整体交给生成器，
 * 它会试图把这些同名类型摊平到一个 definitions 命名空间里，直接报
 * `Type "X" has multiple definitions`。所以联合要拆到叶子文件、逐个生成、
 * 再用 `anyOf` 合回去 —— 每个叶子各自闭包，不共享命名空间。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createFormatter, createParser, createProgram, DEFAULT_CONFIG, SchemaGenerator } from 'ts-json-schema-generator'

import type { Registry } from '../src/contracts/endpoint'
import { PLATFORMS } from '../src/contracts/platform'
import type { Platform } from '../src/contracts/platform'
import type { ResponseSchema, ResponseSchemaMap, ResponseSchemas } from '../src/contracts/response-schema'
import { bilibiliRegistry } from '../src/platforms/bilibili/endpoints'
import { douyinRegistry } from '../src/platforms/douyin/endpoints'
import { kuaishouRegistry } from '../src/platforms/kuaishou/endpoints'
import { xiaohongshuRegistry } from '../src/platforms/xiaohongshu/endpoints'

/** 与 `server/openapi.ts` 的同名常量一致；这里自己拼是为了不去扩大那个模块的导出面 */
const REGISTRIES: Record<Platform, Registry> = {
  douyin: douyinRegistry,
  bilibili: bilibiliRegistry,
  kuaishou: kuaishouRegistry,
  xiaohongshu: xiaohongshuRegistry
}

const here = dirname(fileURLToPath(import.meta.url))
const CORE = resolve(here, '..')
const REPO = resolve(CORE, '..', '..')
const GENERATED = join(REPO, 'packages/response-types/src/generated')
const RESPONSE_TSCONFIG = join(REPO, 'packages/response-types/tsconfig.json')

/** 一份 JSON Schema（宽松类型：这里的形状由生成器决定，不是我们的契约） */

/** 递归收集目录下所有 .ts */
const walkTs = (dir: string): string[] => {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walkTs(p))
    else if (name.endsWith('.ts')) out.push(p)
  }
  return out
}

/**
 * 「类型名 → 声明它的文件」索引。
 *
 * 走的是通用查找而不是跟着 barrel 追正则：联合的成员可能来自同级子目录
 * （`Search/guards.ts` 里的 `SearchUnion = General | User | Video | SearchUnknown`，
 * 四个成员分散在 `general/` `user/` `video/` `Unknown.ts` 四处），
 * 正则追不出这种跳转。
 */
const buildDeclIndex = (): Map<string, string> => {
  const index = new Map<string, string>()
  for (const file of walkTs(GENERATED)) {
    const src = readFileSync(file, 'utf8')
    for (const m of src.matchAll(/^export (?:type|interface) (\w+)\b/gm)) {
      // 同名重复时保留先遇到的：barrel 的别名不参与，真正的声明才是叶子
      if (!index.has(m[1])) index.set(m[1], file)
    }
  }
  return index
}

/**
 * 读一个文件里 `export type Name = ...` 的右侧，返回可以继续往下追的名字。
 *
 * 两类都算：
 * - **联合**（`= A | B`、`= A | never`）—— 拆成成员
 * - **单名别名**（`= SearchUnion`、`= VideoWork_V0`）—— 只有追下去才能落到真正的
 *   声明文件上。停在 barrel 的别名上生成会得到空 schema（实测：`VideoWorkSuccess`
 *   这类别名产出 `{ not: {} }`）
 *
 * 不是这两种形态（对象类型 `= {`、基元 `= string`）返回 null，交给调用方当叶子处理 ——
 * 基元名不在声明索引里，递归会自然回落到原名。
 * @param file - 声明所在文件
 * @param name - 类型名
 * @returns 要继续追的名字；不是别名/联合返回 null
 */
const unionMembersOf = (file: string, name: string): string[] | null => {
  let src: string
  try {
    src = readFileSync(file, 'utf8')
  } catch {
    return null
  }
  const m = src.match(new RegExp(`^export type ${name} = ([^\\n]+)$`, 'm'))
  if (!m) return null
  const parts = m[1].split('|').map((s) => s.trim())
  const names = parts.filter((s) => /^\w+$/.test(s) && s !== 'never')
  // 有一项不是简单标识符（例如 `= {` 的开头），说明这是对象类型而不是别名/联合
  if (!names.length || names.length !== parts.length) return null
  return names
}

/**
 * 把类型名递归拆到叶子。
 *
 * 终止条件：名字不在索引里（外部类型）、或者它本身不是联合。
 * @param name - 类型名
 * @param index - 声明索引
 * @param seen - 防环
 * @returns 叶子列表（名字 + 声明文件）
 */
const expandToLeaves = (name: string, index: Map<string, string>, path = new Set<string>()): Array<{ name: string; file: string }> => {
  // 防环用**路径**而不是全局集合：兄弟分支里出现同一个类型是正常的，全局去重会漏掉一条分支
  if (path.has(name)) return []
  const seen = new Set(path).add(name)
  const file = index.get(name)
  if (!file) return []
  // `export type XxxError = never` 到处都是（该端点没有失败形态样本）。`never` 不是
  // 一种形状，生成了会变成 `{ not: {} }` 这种噪音，直接丢掉。
  if (new RegExp(`^export type ${name} = never$`, 'm').test(readFileSync(file, 'utf8'))) return []
  const members = unionMembersOf(file, name)
  if (!members) return [{ name, file }]
  const out: Array<{ name: string; file: string }> = []
  for (const m of members) out.push(...expandToLeaves(m, index, seen))
  return out.length ? out : [{ name, file }]
}

/** 别名 → { 原名, 声明文件 }：平台 barrel 里 `export type { Orig as Alias } from './Mod'` */
const buildAliasIndex = (): Map<string, { orig: string; file: string }> => {
  const map = new Map<string, { orig: string; file: string }>()
  for (const platform of PLATFORMS) {
    const barrel = join(GENERATED, platform, 'index.ts')
    let src: string
    try {
      src = readFileSync(barrel, 'utf8')
    } catch {
      continue
    }
    for (const m of src.matchAll(/export type \{ (\w+) as (\w+) \} from '\.\/([^']+)'/g)) {
      map.set(m[2], { orig: m[1], file: join(GENERATED, platform, m[3], 'index.ts') })
    }
  }
  return map
}

/**
 * 扫描端点文件里的 `response: type<X>()`。
 * @param endpointFile - 端点声明文件
 * @returns 类型名；`any` 或没写返回 null
 */
const responseTypeOf = (endpointFile: string): string | null => {
  const src = readFileSync(endpointFile, 'utf8')
  const m = src.match(/response:\s*type<([A-Za-z0-9_]+)>\(\)/)
  if (!m || m[1] === 'any') return null
  return m[1]
}

/**
 * 把一份生成器输出摊平进共享的 definitions。
 *
 * `expose: 'all'` 的输出形如 `{ $schema, $ref: '#/definitions/X', definitions: {...} }`，
 * 而 OpenAPI 要求具名 schema 平铺在 `components.schemas`、用 `#/components/schemas/` 引用。
 * 同时不同端点的定义会**撞名**（`EmojiList_V0`、`Data`、`Extra` 这类每个端点各有一份），
 * 所以统一加 `<operationId>.` 前缀 —— 点号在 JSON Pointer 里不需要转义，只 `/` 和 `~` 需要。
 * @param raw - 生成器对单个叶子类型的输出
 * @param prefix - 该端点的 operationId
 * @param into - 共享的 definitions 容器（就地写入）
 * @returns 只剩 `$ref` 的根节点，可直接放进端点的 `data`
 */
const flattenInto = (raw: ResponseSchema, prefix: string, into: ResponseSchemaMap): ResponseSchema => {
  const {
    definitions = {},
    $schema: _schema,
    ...root
  } = raw as {
    definitions?: ResponseSchemaMap
    $schema?: string
  }
  const rewrite = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(rewrite)
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        out[k] =
          k === '$ref' && typeof v === 'string' && v.startsWith('#/definitions/')
            ? `#/components/schemas/${prefix}.${v.slice('#/definitions/'.length)}`
            : rewrite(v)
      }
      return out
    }
    return node
  }
  for (const [name, def] of Object.entries(definitions)) into[`${prefix}.${name}`] = rewrite(def) as ResponseSchema
  return rewrite(root) as ResponseSchema
}

/**
 * 生成全部端点的响应 schema。
 *
 * 没有可用类型的端点（`response: type<any>()`，或类型不在生成树里）**不出现在
 * `byEndpoint` 中** —— 调用方据此保留原来的占位 description。
 * @returns 端点级 schema + 摊平后的具名定义
 */
export const buildResponseSchemas = (): ResponseSchemas => {
  const index = buildDeclIndex()
  const aliases = buildAliasIndex()

  const cfg = {
    ...DEFAULT_CONFIG,
    tsconfig: RESPONSE_TSCONFIG,
    expose: 'all' as const,
    topRef: false,
    skipTypeCheck: true,
    // 生成的样本类型带 `[property: string]: any` 索引签名，那类会被表达成
    // `additionalProperties: true`（平台加字段不算 breaking）—— 这里不要额外关掉它
    additionalProperties: true,
    sortProps: true
  }
  const program = createProgram({ ...cfg, path: join(GENERATED, 'index.ts') })
  const generator = new SchemaGenerator(program, createParser(program, cfg), createFormatter(cfg), cfg)

  // 生成树里的类型走上面那个共享 program。**手写类型够不到它** —— program 的根是
  // `generated/index.ts`，而 `AvToBvData` / `BvToAvData` 是端点文件里手写的 interface。
  // 给它们按文件单建一个（只有这两个端点走这条路，各约 1 秒）。
  const fileGenerators = new Map<string, SchemaGenerator>()
  const generatorFor = (file: string): SchemaGenerator => {
    if (file.startsWith(GENERATED)) return generator
    let g = fileGenerators.get(file)
    if (!g) {
      const p = createProgram({ ...cfg, path: file })
      g = new SchemaGenerator(p, createParser(p, cfg), createFormatter(cfg), cfg)
      fileGenerators.set(file, g)
    }
    return g
  }

  const byEndpoint: ResponseSchemaMap = {}
  const definitions: ResponseSchemaMap = {}

  for (const platform of PLATFORMS) {
    for (const short of Object.keys(REGISTRIES[platform])) {
      const endpointFile = join(CORE, 'src/platforms', platform, 'endpoints', `${short}.ts`)
      let typeName: string | null
      try {
        typeName = responseTypeOf(endpointFile)
      } catch {
        continue // 端点文件名与注册表键对不上（理论上不会），跳过而不是炸掉整个生成
      }
      if (!typeName) continue

      // 优先在生成树的索引里找；找不到就退回端点文件自身（`AvToBvData` 那类是
      // 端点文件里手写的 interface，不在 response-types 里）
      const alias = aliases.get(typeName)
      const fromIndex = expandToLeaves(alias ? alias.orig : typeName, index)
      const leaves = fromIndex.length
        ? fromIndex
        : alias
          ? expandToLeaves(alias.orig, new Map([[alias.orig, alias.file]]))
          : [{ name: typeName, file: endpointFile }]

      const operationId = `${platform}_${short}`
      const parts: ResponseSchema[] = []
      for (const leaf of leaves) {
        try {
          parts.push(flattenInto(generatorFor(leaf.file).createSchema(leaf.name) as ResponseSchema, operationId, definitions))
        } catch {
          // 单个叶子失败不该让整个端点没有类型；下面按 parts 是否为空决定要不要出结果
        }
      }
      if (!parts.length) continue
      byEndpoint[operationId] = parts.length === 1 ? parts[0] : { anyOf: parts }
    }
  }

  // 键排序，保证产物对同一份输入逐字节可复现（`openapi:check` 依赖这一点）
  const sortKeys = (m: ResponseSchemaMap): ResponseSchemaMap =>
    Object.fromEntries(Object.entries(m).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))

  return { byEndpoint: sortKeys(byEndpoint), definitions: sortKeys(definitions) }
}

/** 生成 `src/server/response-schemas.generated.ts` 的内容 */
export const serializeResponseSchemas = (schemas: ResponseSchemas): string => {
  const body = JSON.stringify(schemas, null, 2)
  return [
    '// 自动生成，手改无意义 —— 由 packages/core/scripts/gen-response-schemas.mts 从端点的',
    '// `response: type<X>()` 声明派生，重新生成会覆盖。',
    '//',
    '// 存在的理由：`type<T>()` 是编译期令牌，运行时是空对象，`buildOpenApiSpec` 读不到它。',
    '// 这份产物把响应类型变成运行时可读的 JSON Schema，`server/openapi.ts` 引用它，',
    '// 把每个端点的成功信封 `data` 指向对应的类型（之前那里只有一句 description，',
    '// Apifox 之类的工具只能渲染成 null）。',
    '',
    "import type { ResponseSchemas } from '../contracts/response-schema'",
    '',
    `export const RESPONSE_SCHEMAS: ResponseSchemas = ${body}`,
    ''
  ].join('\n')
}

// CLI：`tsx scripts/gen-response-schemas.mts [--check]`
if (process.argv[1] && import.meta.url.endsWith(relative(process.cwd(), process.argv[1]).replace(/\\/g, '/'))) {
  const { writeFileSync } = await import('node:fs')
  const OUT = join(CORE, 'src/server/response-schemas.generated.ts')
  const schemas = buildResponseSchemas()
  const next = serializeResponseSchemas(schemas)
  const count = Object.keys(schemas.byEndpoint).length
  if (process.argv.includes('--check')) {
    const current = (() => {
      try {
        return readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n')
      } catch {
        return ''
      }
    })()
    if (current !== next) {
      console.error('response-schemas.generated.ts 与端点声明不一致 —— 跑 `pnpm openapi` 重新生成')
      process.exitCode = 1
    } else {
      console.log(`response-schemas.generated.ts 与端点声明一致：${count} 个端点有响应类型`)
    }
  } else {
    writeFileSync(OUT, next)
    console.log(`已写出 response-schemas.generated.ts：${count} 个端点有响应类型`)
  }
}
