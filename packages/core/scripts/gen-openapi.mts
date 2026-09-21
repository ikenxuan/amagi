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
  // **只校验 `response-schemas.generated.ts`，不再逐字节校验 `openapi.json`。**
  //
  // 为什么把 openapi.json 移出这道门：它是一份**数据产物**，被文档站与 Apifox 消费——两处
  // 现在都在读之前先 `pnpm openapi` 现生成（见 docs 的 build 脚本与 apifox 同步 workflow），
  // 所以「仓库里那份快照是不是逐字节最新」不再有人依赖。而逐字节警察它带来的净是事故：
  // ① 发版：`info.version` 盖自 package.json，发版脚本只 bump 版本、不重跑生成器
  //   （`pnpm run release` 直接提交推送，pre-commit 不跑），于是每发一版必红——beta.1 / beta.2 两次实测都栽在这；
  // ② 合并 PR：git 对 openapi.json 做的是文本合并，合出来的不等于「重新生成一遍」，照红。
  // openapi 的**结构正确性**由 `test/openapi/spec.test.ts` 一组当场在内存里生成再断言的语义
  // 测试守着（paths / 参数↔zod / 响应信封），那些永远不会因版本、合并、格式误报。
  //
  // `response-schemas.generated.ts` **留在门内**：它不是数据、是**编译进发布包的源码**，没有
  // 版本位（不受发版漂移影响），只在响应类型真变时才变——保它逐字节最新是对的。
  const current = readIfExists(SCHEMAS_FILE)
  if (current === undefined) {
    console.error('response-schemas.generated.ts 不存在 —— 跑 pnpm openapi 生成后提交')
    process.exitCode = 1
  } else if (current !== schemasText) {
    console.error('response-schemas.generated.ts 与端点声明不一致 —— 跑 pnpm openapi 重新生成并提交（不要手改产物）')
    process.exitCode = 1
  } else {
    console.log(`response-schemas.generated.ts 一致：${schemaCount} 个端点带响应类型（${definitionCount} 份具名 schema）`)
  }
} else {
  writeFileSync(SCHEMAS_FILE, schemasText, 'utf8')
  writeFileSync(OUT_FILE, text, 'utf8')
  console.log(`已写出 response-schemas.generated.ts：${schemaCount} 个端点带响应类型，${definitionCount} 份具名 schema`)
  console.log(`已写出 openapi.json：${pathCount} 条 path`)
}
