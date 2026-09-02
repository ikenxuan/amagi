// 从四个端点注册表生成 OpenAPI 3.1 规范（PRD 阶段 8.2）。
//
//   pnpm --filter @ikenxuan/amagi run gen:openapi         写 packages/core/openapi.json
//   pnpm --filter @ikenxuan/amagi run gen:openapi:check   与已提交产物比对，不一致退出码 1
//
// 规范是**派生物**，不是第二份事实：
//   paths      `/api/<platform>` + def.route（前缀与 server/index.ts 的挂载一致）
//   method     只有 get（server/routes.ts 把所有路由注册为 GET）
//   parameters def.params 经 zod.toJSONSchema({ io: 'input' })，全部 in: 'query'
//   summary    def.doc.summary（EndpointDoc，8.1 落地）
//   tags       name 的平台段 —— 声明里没有 tags 字段，同一事实不写两遍
//   responses  contracts/result.ts 的两个信封 + routes.ts 附加的 requestPath
//
// 手改 openapi.json 没有意义：CI 跑 --check，与注册表不一致即红。

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import zod from 'zod'

import type { AnyEndpointDef, Registry } from '../src/contracts/endpoint'
import { ERROR_KINDS } from '../src/contracts/error'
import { TRACE_REASONS } from '../src/contracts/meta'
import type { Platform } from '../src/contracts/platform'
import { PLATFORMS } from '../src/contracts/platform'
import { SUCCESS_MESSAGE } from '../src/contracts/result'
import { bilibiliRegistry } from '../src/platforms/bilibili/endpoints'
import { douyinRegistry } from '../src/platforms/douyin/endpoints'
import { kuaishouRegistry } from '../src/platforms/kuaishou/endpoints'
import { xiaohongshuRegistry } from '../src/platforms/xiaohongshu/endpoints'

type Json = Record<string, unknown>

const REGISTRIES: Record<Platform, Registry> = {
  douyin: douyinRegistry,
  bilibili: bilibiliRegistry,
  kuaishou: kuaishouRegistry,
  xiaohongshu: xiaohongshuRegistry
}

/** tag 的展示名。平台标识本身来自 `name`，这里只补一个中文标签 */
const PLATFORM_LABELS: Record<Platform, string> = {
  douyin: '抖音',
  bilibili: 'B站',
  kuaishou: '快手',
  xiaohongshu: '小红书'
}

const here = dirname(fileURLToPath(import.meta.url))
/** 唯一产物，提交进仓库；文档站与 CI 的 --check 都读它 */
export const OUT_FILE = join(here, '..', 'openapi.json')
const { version } = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')) as { version: string }

/**
 * 端点参数 → query parameters。
 *
 * 取 `io: 'input'`：query 里传进来的都是字符串，要的是 coerce **之前**的形状。
 * `unrepresentable: 'any'` 让少数无法表达的 schema 退化成 `{}` 而不是抛错。
 * @param def - 端点声明
 * @returns OpenAPI parameter 对象数组
 */
const parametersOf = (def: AnyEndpointDef): Json[] => {
  const json = zod.toJSONSchema(def.params, { io: 'input', unrepresentable: 'any' }) as {
    properties?: Record<string, Json>
    required?: string[]
  }
  const required = new Set(json.required ?? [])
  return Object.entries(json.properties ?? {}).map(([name, schema]) => {
    // description 提到 parameter 层：文档站的参数表读的是这里，不是 schema 内部
    const { description, ...rest } = schema as { description?: string }
    return {
      name,
      in: 'query',
      required: required.has(name),
      ...(description !== undefined ? { description } : {}),
      schema: rest
    }
  })
}

/** 两个信封共有的键。`data` / `error` 各自只出现在自己那一支（result.ts 的硬约束 2） */
const ENVELOPE_COMMON: Json = {
  message: { type: 'string', description: '面向人的简短说明' },
  meta: { $ref: '#/components/schemas/AmagiMeta' },
  // routes.ts 的 `res.json({ ...result, requestPath })` —— HTTP 侧独有，SDK 信封没有
  requestPath: { type: 'string', description: '本次请求的原始路径（含 query），仅 HTTP 侧有', examples: ['/api/bilibili/fetch_one_video?bvid=BV1xx'] }
}
const SCHEMAS: Json = {
  AmagiSuccess: {
    type: 'object',
    description: '成功信封。**没有顶层 `code`**，也没有 `error` 键（contracts/result.ts 的硬约束）',
    required: ['success', 'data', 'message', 'meta', 'requestPath'],
    properties: {
      success: { const: true, description: '判别键' },
      // data 暂为 any：v6 ReturnDataType 是 26,580 行实测快照，转 JSON Schema 会让规范体积失控（留到 8.5）
      data: { description: '端点声明的返回类型。逐端点的具体形状见 SDK 的 TypeScript 类型' },
      ...ENVELOPE_COMMON,
      message: { type: 'string', description: '成功时固定文案', examples: [SUCCESS_MESSAGE] }
    }
  },
  AmagiFailure: {
    type: 'object',
    description: '失败信封。**没有顶层 `code`**，也没有 `data` 键；错误码在 `error` 里',
    required: ['success', 'error', 'message', 'meta', 'requestPath'],
    properties: {
      success: { const: false, description: '判别键' },
      error: { $ref: '#/components/schemas/AmagiError' },
      ...ENVELOPE_COMMON,
      message: { type: 'string', description: '等价于 `error.message`，为兼容 v6 的 `result.message` 读法保留' }
    }
  },
  AmagiError: {
    type: 'object',
    description: '唯一的错误载体（contracts/error.ts）',
    required: ['kind', 'code', 'message', 'retryable'],
    properties: {
      kind: { type: 'string', enum: [...ERROR_KINDS], description: '跨平台统一的错误大类' },
      // code 不在这里枚举：AmagiErrorCode 是纯类型联合，没有运行时清单 ——
      // 抄一份到生成器里就等于又造了一处会漂移的事实源
      code: { type: 'string', description: '稳定的字符串错误码，可用于 switch 与埋点（取值见 contracts/error.ts 的 AmagiErrorCode）' },
      message: { type: 'string', description: '面向人的说明，取平台原文优先' },
      retryable: { type: 'boolean', description: '是否值得重试' },
      platform: {
        type: 'object',
        description: '平台原始错误码与文案，一个字都不丢',
        required: ['code'],
        properties: { code: { type: ['string', 'integer'] }, message: { type: 'string' } }
      },
      http: {
        type: 'object',
        description: '真实发生的 HTTP 状态（有请求才有）',
        required: ['status'],
        properties: { status: { type: 'integer' }, statusText: { type: 'string' } }
      },
      issues: {
        type: 'array',
        description: "`kind === 'validation'` 时的字段级错误",
        items: { $ref: '#/components/schemas/ValidationIssue' }
      }
    }
  },
  ValidationIssue: {
    type: 'object',
    required: ['path', 'message'],
    properties: {
      path: { type: 'string', description: '出错字段的点号路径' },
      message: { type: 'string' },
      received: { description: '实际收到的值' }
    }
  },
  AmagiMeta: {
    type: 'object',
    description: '挂在每个信封上的元信息（contracts/meta.ts）',
    required: ['requestId', 'clientId', 'platform', 'endpoint', 'durationMs', 'attempts'],
    properties: {
      requestId: { type: 'string', description: '每次逻辑调用一个 id' },
      clientId: { type: 'string', description: "client 实例 id；静态 fetcher 为 'static'" },
      platform: { type: 'string', enum: [...PLATFORMS] },
      endpoint: { type: 'string', description: "端点全名，如 'bilibili.videoInfo'" },
      durationMs: { type: 'number' },
      attempts: { type: 'integer', description: '实际发出的 HTTP 请求数，含重试与分页' },
      trace: {
        type: 'array',
        description: '每次底层请求的明细。默认不带，client 开 trace 时才填',
        items: { $ref: '#/components/schemas/RequestTrace' }
      }
    }
  },
  RequestTrace: {
    type: 'object',
    required: ['url', 'method', 'durationMs', 'reason'],
    properties: {
      url: { type: 'string', description: '实际请求的 URL（含签名参数）' },
      method: { type: 'string' },
      status: { type: 'integer', description: '请求未发出（如 DNS 失败）时缺失' },
      durationMs: { type: 'number' },
      reason: { type: 'string', enum: [...TRACE_REASONS] },
      retryOf: { type: 'string', description: "reason === 'retry' 时，被重试的那次失败的错误码" }
    }
  }
}
/** 每个 operation 的响应。成功与失败都是 200 —— routes.ts 不做状态码映射（与 v6 一致） */
const RESPONSES: Json = {
  '200': {
    description: '恒为 200：成功与失败都以 JSON 信封返回，靠 `success` 判别',
    content: {
      'application/json': {
        schema: {
          // 判别键是 success（两支各自 const true / false）。不写 OpenAPI 的
          // discriminator 对象 —— 规范要求判别属性是字符串，success 是布尔
          oneOf: [{ $ref: '#/components/schemas/AmagiSuccess' }, { $ref: '#/components/schemas/AmagiFailure' }]
        }
      }
    }
  },
  '401': {
    description: '仅当 `startServer({ token })` 传了 token 时出现：缺少或错误的 `Authorization: Bearer <token>`。不传 token 时无鉴权（v6 行为不变）',
    content: {
      'application/json': {
        schema: {
          // server/auth.ts 的 401 体是精简形状，不是完整信封（没有 meta / kind / retryable）
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: { const: false },
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: { code: { const: 'UNAUTHORIZED' }, message: { type: 'string' } }
            }
          }
        }
      }
    }
  }
}

/**
 * 生成完整规范。
 *
 * 导出给 `test/openapi/spec.test.ts` 用：测试拿它与已提交的 openapi.json 对比，
 * 于是「忘了重跑生成器」在 `pnpm test` 里就会红，不必等 CI 的 --check。
 * @returns OpenAPI 3.1 文档对象
 */
export const buildSpec = (): Json => {
  const paths: Json = {}
  for (const platform of PLATFORMS) {
    for (const [short, def] of Object.entries(REGISTRIES[platform])) {
      const path = `/api/${platform}${def.route}`
      if (paths[path]) throw new Error(`路径重复：${path}（${def.name} 与已有条目撞车）`)
      if (!def.doc?.summary) throw new Error(`${def.name} 缺 doc.summary —— 见 test/contracts/endpoint-doc.test.ts`)
      paths[path] = {
        get: {
          // 平台段 + 端点短名：全局唯一，且与 SDK 的 fetcher 方法一一对应
          operationId: `${platform}_${short}`,
          tags: [platform],
          summary: def.doc.summary,
          ...(def.doc.description !== undefined ? { description: def.doc.description } : {}),
          ...(def.doc.deprecated === true ? { deprecated: true } : {}),
          ...(def.doc.externalDocs !== undefined ? { externalDocs: def.doc.externalDocs } : {}),
          parameters: parametersOf(def),
          responses: RESPONSES
        }
      }
    }
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'amagi HTTP API',
      version,
      description: [
        '由端点注册表派生的规范 —— 手写的那份已经漂移，这份不会（`gen-openapi --check` 进 CI）。',
        '',
        '- 所有端点都是 `GET`，参数都在 query。',
        '- 成功与失败都返回 **200**，靠信封的 `success` 判别；顶层没有 `code`。',
        `- ⚠️ \`startServer\` 默认监听 \`'::'\`（公网 IPv4/IPv6 双栈），且默认**无鉴权** ——`,
        "  请显式传 `host: '127.0.0.1'` 与 `token`（v8 将改默认值）。",
        '- playground 直连你本地启动的 amagi 服务，没有公共代理（代理会转发 Cookie 与 Authorization）。'
      ].join('\n')
    },
    servers: [{ url: 'http://127.0.0.1:4567', description: '本地 startServer（默认端口 4567）' }],
    tags: PLATFORMS.map((p) => ({ name: p, description: PLATFORM_LABELS[p] })),
    paths,
    components: { schemas: SCHEMAS, securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', description: '仅在 startServer 传了 token 时生效' } } },
    // 「可选鉴权」的规范写法：空对象 = 不带凭证也允许
    security: [{}, { bearerAuth: [] }]
  }
}

/** 产物的唯一序列化形式：2 空格缩进 + 末尾换行。比对与写盘都走这里 */
export const serialize = (spec: Json): string => `${JSON.stringify(spec, null, 2)}\n`

const main = (): void => {
  const text = serialize(buildSpec())
  const pathCount = Object.keys((JSON.parse(text) as { paths: Json }).paths).length

  if (process.argv.includes('--check')) {
    let current: string
    try {
      current = readFileSync(OUT_FILE, 'utf8')
    } catch {
      console.error('openapi.json 不存在 —— 跑 pnpm --filter @ikenxuan/amagi run gen:openapi 生成后提交')
      process.exitCode = 1
      return
    }
    // 行尾归一：仓库是 CRLF 检出，产物按 LF 比对
    if (current.replace(/\r\n/g, '\n') !== text) {
      console.error('openapi.json 与注册表不一致 —— 跑 gen:openapi 重新生成并提交（不要手改产物）')
      process.exitCode = 1
      return
    }
    console.log(`openapi.json 与注册表一致：${pathCount} 条 path`)
    return
  }

  writeFileSync(OUT_FILE, text, 'utf8')
  console.log(`已写出 openapi.json：${pathCount} 条 path`)
}

// 只有直接执行时才写盘 —— 被测试 import 时不能有副作用
if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) main()
