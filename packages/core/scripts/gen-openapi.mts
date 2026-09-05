// 把 OpenAPI 规范写成产物 —— 生成逻辑本身在 `src/server/openapi.ts`
// （同一份实现也被 `startServer({ openapi: true })` 用来现算现返，不存在两份）。
//
//   pnpm --filter @ikenxuan/amagi run gen:openapi         写 packages/core/openapi.json
//   pnpm --filter @ikenxuan/amagi run gen:openapi:check   与已提交产物比对，不一致退出码 1
//
// 手改 openapi.json 没有意义：CI 跑 --check，与注册表不一致即红。

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildOpenApiSpec, serializeOpenApiSpec } from '../src/server/openapi'

const here = dirname(fileURLToPath(import.meta.url))
const OUT_FILE = join(here, '..', 'openapi.json')

// 产物里要写真实版本号（运行期由 tsdown 注入 __VERSION__，脚本走 tsx 拿不到）
const { version } = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')) as { version: string }

const text = serializeOpenApiSpec(buildOpenApiSpec({ version }))
const pathCount = Object.keys((JSON.parse(text) as { paths: Record<string, unknown> }).paths).length

if (process.argv.includes('--check')) {
  let current: string | undefined
  try {
    current = readFileSync(OUT_FILE, 'utf8')
  } catch {
    console.error('openapi.json 不存在 —— 跑 pnpm openapi 生成后提交')
    process.exitCode = 1
  }
  if (current !== undefined) {
    // 行尾归一：仓库按 CRLF 检出，产物按 LF 比对
    if (current.replace(/\r\n/g, '\n') === text) {
      console.log(`openapi.json 与注册表一致：${pathCount} 条 path`)
    } else {
      console.error('openapi.json 与注册表不一致 —— 跑 pnpm openapi 重新生成并提交（不要手改产物）')
      process.exitCode = 1
    }
  }
} else {
  writeFileSync(OUT_FILE, text, 'utf8')
  console.log(`已写出 openapi.json：${pathCount} 条 path`)
}
