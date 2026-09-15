// 把 OpenAPI 规范写成产物 —— 生成逻辑本身在 `src/server/openapi.ts`
// （同一份实现也被 `startServer({ openapi: true })` 用来现算现返，不存在两份）。
//
//   pnpm --filter @ikenxuan/amagi run gen:openapi         写产物
//   pnpm --filter @ikenxuan/amagi run gen:openapi:check   与已提交产物比对，不一致退出码 1
//
// 一次写两份产物，它们必须同步：
//
//   packages/core/openapi.json                          规范本体（文档站与 Apifox 的输入）
//   packages/core/src/server/response-schemas.generated.ts  端点响应类型 → JSON Schema
//
// 后者是前者的输入之一，所以顺序不能反：`buildOpenApiSpec` 静态 import 那份模块，
// 模块在**加载时**就绑定了 —— 同进程里先把新内容写进文件、再调它，读到的仍是旧的。
// 因此这里把刚算出来的一份**注入**进去，而不是指望它自己去读文件。
//
// 手改产物没有意义：CI 跑 --check，与注册表/端点声明不一致即红。

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildOpenApiSpec, serializeOpenApiSpec } from '../src/server/openapi'
import { buildResponseSchemas, serializeResponseSchemas } from './gen-response-schemas.mts'

const here = dirname(fileURLToPath(import.meta.url))
const OUT_FILE = join(here, '..', 'openapi.json')
const SCHEMAS_FILE = join(here, '..', 'src', 'server', 'response-schemas.generated.ts')

// 产物里要写真实版本号（运行期由 tsdown 注入 __VERSION__，脚本走 tsx 拿不到）
const { version } = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')) as { version: string }

const responseSchemas = buildResponseSchemas()
const schemasText = serializeResponseSchemas(responseSchemas)
const text = serializeOpenApiSpec(buildOpenApiSpec({ version, responseSchemas }))
const pathCount = Object.keys((JSON.parse(text) as { paths: Record<string, unknown> }).paths).length
const schemaCount = Object.keys(responseSchemas.byEndpoint).length
const definitionCount = Object.keys(responseSchemas.definitions).length

/** 读文件并归一化行尾；不存在返回 undefined */
const readIfExists = (path: string): string | undefined => {
  try {
    return readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
  } catch {
    return undefined
  }
}

if (process.argv.includes('--check')) {
  let failed = false
  const checks: Array<[string, string | undefined, string]> = [
    [SCHEMAS_FILE, schemasText, 'response-schemas.generated.ts 与端点声明不一致'],
    [OUT_FILE, text, 'openapi.json 与注册表不一致']
  ]
  for (const [file, expected, message] of checks) {
    const current = readIfExists(file)
    if (current === undefined) {
      console.error(`${file.split(/[\\/]/).pop()} 不存在 —— 跑 pnpm openapi 生成后提交`)
      failed = true
    } else if (current !== expected) {
      console.error(`${message} —— 跑 pnpm openapi 重新生成并提交（不要手改产物）`)
      failed = true
    }
  }
  if (failed) process.exitCode = 1
  else console.log(`产物一致：openapi.json ${pathCount} 条 path，其中 ${schemaCount} 个端点带响应类型（${definitionCount} 份具名 schema）`)
} else {
  writeFileSync(SCHEMAS_FILE, schemasText, 'utf8')
  writeFileSync(OUT_FILE, text, 'utf8')
  console.log(`已写出 response-schemas.generated.ts：${schemaCount} 个端点带响应类型，${definitionCount} 份具名 schema`)
  console.log(`已写出 openapi.json：${pathCount} 条 path`)
}
