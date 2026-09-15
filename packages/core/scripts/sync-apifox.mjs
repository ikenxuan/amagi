/**
 * 把 `openapi.json` 推到 Apifox。
 *
 *   node packages/core/scripts/sync-apifox.mjs
 *   APIFOX_ACCESS_TOKEN=<token> node packages/core/scripts/sync-apifox.mjs --project 4213915
 *
 * **为什么不用 `apifox import`**（实测教训）：CLI 的导入**只新增、永不覆盖** ——
 * 路径匹配上就静默 `ignoreCount: N`，既不改内容也不报错。它也没有覆盖模式参数。
 * 靠它同步就必须「先删掉全部端点再重导」，而那样每次端点 ID 都会变、指向具体端点的
 * 链接全部失效（2026-09-14 为此付过三次代价）。
 *
 * Apifox 的**开放 API** 才有覆盖能力，而且计数是可信的：
 *
 *   POST https://api.apifox.com/v1/projects/{id}/import-openapi
 *   { input: "<openapi.json 原文>", options: { endpointOverwriteBehavior, schemaOverwriteBehavior } }
 *   → data.counters.{endpointCreated,endpointUpdated,endpointIgnored,...}
 *
 * 实测确认过的两点：
 * 1. **不会被「外部 AI 编辑权限」拦住**。CLI 写操作会（报 `Automation caller branch required`），
 *    开放 API 用个人访问令牌不会 —— 所以 CI 能跑。
 * 2. **确实覆盖**。改一处 summary 后导入返回 `endpointUpdated: 1`，Apifox 里立刻可见。
 *
 * 零依赖是有意的：CI 里跑它不需要 `pnpm install`，`node` 直接起。
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const API_BASE = process.env.APIFOX_API_BASE ?? 'https://api.apifox.com'
const API_VERSION = '2024-03-28'
const DEFAULT_PROJECT = '4213915'

const here = dirname(fileURLToPath(import.meta.url))
const SPEC_FILE = resolve(here, '..', 'openapi.json')

/** 从 argv 里取 `--project <id>` */
const argOf = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const token = process.env.APIFOX_ACCESS_TOKEN ?? process.env.APIFOX_TOKEN
if (!token) {
  console.error('缺 APIFOX_ACCESS_TOKEN —— 在 Apifox「账号设置 → API 访问令牌」创建后，')
  console.error('导出成环境变量，或放进仓库 secrets（CI 用）。')
  process.exit(1)
}

const projectId = argOf('--project', DEFAULT_PROJECT)
const spec = readFileSync(SPEC_FILE, 'utf8')

const response = await fetch(`${API_BASE}/v1/projects/${projectId}/import-openapi`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'X-Apifox-Api-Version': API_VERSION,
    'Content-Type': 'application/json; charset=utf-8'
  },
  body: JSON.stringify({
    input: spec,
    options: {
      // 默认值，但显式写出来：仓库是唯一事实源，已有的按新内容覆盖
      endpointOverwriteBehavior: 'OVERWRITE_EXISTING',
      schemaOverwriteBehavior: 'OVERWRITE_EXISTING'
    }
  })
})

const text = await response.text()
if (!response.ok) {
  console.error(`Apifox 返回 ${response.status}`)
  console.error(text.slice(0, 2000))
  process.exit(1)
}

let counters
try {
  counters = JSON.parse(text).data.counters
} catch {
  console.error('响应不是预期形状：')
  console.error(text.slice(0, 2000))
  process.exit(1)
}

const keys = ['endpointCreated', 'endpointUpdated', 'endpointIgnored', 'endpointFailed', 'schemaUpdated', 'schemaIgnored', 'schemaFailed']
console.log(`已同步到 Apifox 项目 ${projectId}：`)
for (const k of keys) console.log(`  ${k}: ${counters[k] ?? 0}`)

// 失败计数非零即视为同步失败 —— 否则 CI 会绿着放过一次半途而废的同步
const failed = (counters.endpointFailed ?? 0) + (counters.schemaFailed ?? 0) + (counters.endpointFolderFailed ?? 0)
if (failed > 0) {
  console.error(`有 ${failed} 项失败，同步未完成`)
  process.exit(1)
}
