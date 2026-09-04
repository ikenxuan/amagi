// corpus → 生成的响应类型。生成逻辑全在 `src/plan.ts`，这个脚本只负责**读盘、写盘、比对**。
//
//   pnpm gen:types          从 corpus/ 生成类型，写进 packages/response-types/src/generated/
//   pnpm types:check        与已提交产物比对，不一致退出码 1（**只在本地有样本时有意义**）
//
// 契约照 `packages/core/scripts/gen-openapi.mts`：产物提交进 git、`--check` 与已提交内容
// 比对并置 `process.exitCode = 1`、行尾 CRLF→LF 归一（仓库按 CRLF 检出，产物按 LF 比对）。
//
// **与 gen-openapi 的根本不同：输入不在仓库里。** 响应样本是运行时内容，不提交进 git
// （见 `.gitignore` 的 corpus 段）。所以 `--check` 只能在**本地有样本的机器上**验
// 「产物与手上的证据一致」；CI 里没有样本，它验不了任何东西 —— 这时它明说自己没验，
// 不假装通过（早先那句「0 个文件一致」是个假绿灯：产物有 24 个文件时它也会那么说）。
//
// 两处与 gen-openapi 不同，都是因为这里是「一棵目录树」而不是单文件：
//
// 1. `--check` 还要认出**多出来的文件**。端点删掉、判别式取值改名之后，旧文件会留在树里，
//    而只比对「生成的每个文件内容对不对」是发现不了的 —— 那种残留文件会被下游 import，
//    然后描述一个已经不存在的响应。
// 2. 写盘前**先清空输出目录**，理由同上。清的是整棵 generated/ 树，所以那底下不能放手写文件。

import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  type CorpusEndpointInput,
  type CorpusSample,
  detectBreakingChanges,
  type DocSidecar,
  type JsonValue,
  parseDocSidecar,
  planCorpusTypes
} from '../src/index'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..', '..')
const CORPUS_DIR = join(ROOT, 'corpus')
/**
 * 产物根。整棵树由脚本管，别在里面放手写文件 —— 生成时会被清掉。
 *
 * 落在 `packages/response-types` 而不是 core 的 `types/generated/`：那棵树要被整体清空重建，
 * 而 core 的 `src/` 里有 26,535 行手写响应类型；两者住在同一个包里，「清空输出目录」
 * 这个必要行为就永远离手写类型只有一个路径拼接的距离。
 */
const OUT_DIR = join(ROOT, 'packages', 'response-types', 'src', 'generated')

/** 样本文件名就是参数哈希：12 位十六进制。这条也顺手把 `seeds.json` / `<端点>.doc.json` 排除掉 */
const SAMPLE_FILE = /^[0-9a-f]{12}\.json$/

const check = process.argv.includes('--check')
const readJson = (path: string): JsonValue => JSON.parse(readFileSync(path, 'utf8')) as JsonValue
/** 行尾归一：仓库按 CRLF 检出，产物按 LF 比对（同 gen-openapi.mts） */
const normalize = (text: string): string => text.replace(/\r\n/g, '\n')

const listDirs = (path: string): string[] => {
  try {
    return readdirSync(path)
      .filter((name) => statSync(join(path, name)).isDirectory())
      .sort()
  } catch {
    return []
  }
}

/** 递归列出目录下所有文件，返回相对 `root` 的、用 `/` 分隔的路径（跨平台可比对） */
const listFiles = (root: string, current = root): string[] => {
  let entries: string[]
  try {
    entries = readdirSync(current)
  } catch {
    return []
  }
  return entries
    .flatMap((name) => {
      const full = join(current, name)
      return statSync(full).isDirectory() ? listFiles(root, full) : [relative(root, full).split(sep).join('/')]
    })
    .sort()
}

/* ------------------------------------------------------------------ 读 corpus */

const endpoints: CorpusEndpointInput[] = []
const readErrors: string[] = []

for (const platform of listDirs(CORPUS_DIR)) {
  for (const endpoint of listDirs(join(CORPUS_DIR, platform))) {
    const dir = join(CORPUS_DIR, platform, endpoint)
    const files = readdirSync(dir)
      .filter((name) => SAMPLE_FILE.test(name))
      .sort()
    if (files.length === 0) continue
    const samples: CorpusSample[] = []
    for (const file of files) {
      try {
        samples.push(readJson(join(dir, file)) as unknown as CorpusSample)
      } catch (error) {
        readErrors.push(`${platform}/${endpoint}/${file} 读不了：${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // 注释 sidecar 放在端点目录**外面**（`corpus/<platform>/<endpoint>.doc.json`）：
    // 与样本分开，也就不用担心哪天参数哈希撞上某个保留名字
    let sidecar: DocSidecar | undefined
    try {
      const parsed = parseDocSidecar(readJson(join(CORPUS_DIR, platform, `${endpoint}.doc.json`)))
      for (const error of parsed.errors) readErrors.push(`${platform}/${endpoint}.doc.json：${error}`)
      sidecar = parsed.sidecar
    } catch {
      // 没有 sidecar 是正常状态，不是错误
    }
    endpoints.push({ platform, endpoint, samples, sidecar })
  }
}

const plan = planCorpusTypes({ endpoints, now: new Date() })

for (const error of readErrors) console.error(`❌ ${error}`)
for (const warning of plan.warnings) console.warn(`⚠️  ${warning}`)
for (const line of plan.summary) console.log(`   ${line}`)
if (readErrors.length > 0) process.exitCode = 1

/* ------------------------------------------------------------------ 写盘 / 比对 */

const paths = [...plan.files.keys()]

// 破坏性变更：与**已提交的**产物比。两种模式都报 —— 生成时报是为了让人当场看见
// 「这次加的样本把某个字段变没了」，而不是等 CI 或等下游编译红了才回头找。
//
// 它**不改退出码**：平台真删了字段时这些告警全是对的，拦住反而是错的。
// 这道提醒要解决的是「悄无声息」，不是「不许发生」。
const committed = new Map(listFiles(OUT_DIR).map((path) => [path, normalize(readFileSync(join(OUT_DIR, path), 'utf8'))]))
const breaking = detectBreakingChanges(committed, plan.files)
if (breaking.length > 0) {
  const red = breaking.filter((change) => change.breaksReaders)
  console.warn(`\n💥 破坏性变更 ${red.length} 处（另有 ${breaking.length - red.length} 处不影响下游读取）：`)
  for (const change of breaking) console.warn(`   ${change.breaksReaders ? '✗' : '·'} ${change.file}：${change.message}`)
  console.warn('   平台真改了字段的话这些都是对的 —— 但要在提交信息里说清，下游得跟着改\n')
}

/** 这一轮读到的样本总数。零份意味着「没有证据」，而不是「证据说这棵树该是空的」 */
const sampleCount = endpoints.reduce((sum, entry) => sum + entry.samples.length, 0)

if (check && sampleCount === 0) {
  // 没有样本就没有可比的对象。此时**既不报一致也不报失败**：
  // 报一致是假绿灯（产物里有 24 个文件，而这一轮什么都没生成出来）；
  // 报失败会把「这台机器上没录过样本」当成错误，而那是 CI 上的常态。
  console.log('corpus/ 里没有样本，跳过一致性比对 —— 样本是运行时内容、不进 git，这条只在本地有样本时能验')
  console.log(`已提交的产物：${committed.size} 个文件（本次没有可比的证据）`)
} else if (check) {
  const existing = [...committed.keys()]
  const stale = existing.filter((path) => !plan.files.has(path))
  const missing = paths.filter((path) => !existing.includes(path))
  const changed = paths.filter((path) => existing.includes(path) && committed.get(path) !== plan.files.get(path))
  if (stale.length === 0 && missing.length === 0 && changed.length === 0) {
    console.log(`生成的响应类型与 corpus 一致：${paths.length} 个文件`)
  } else {
    // 三类分开报：残留文件是最容易被忽略的一类 —— 它描述的是一个已经不存在的响应，
    // 而只比对「生成的文件内容对不对」永远发现不了它
    for (const path of missing) console.error(`缺文件：${path}`)
    for (const path of changed) console.error(`内容不一致：${path}`)
    for (const path of stale) console.error(`多余的残留文件：${path}（corpus 里已经没有对应样本）`)
    console.error('跑 pnpm gen:types 重新生成并提交（不要手改产物）')
    process.exitCode = 1
  }
} else {
  // 先清空整棵树再写：端点删掉、判别式取值改名之后，旧文件留在树里会被下游 import
  rmSync(OUT_DIR, { recursive: true, force: true })
  for (const path of paths) {
    const full = join(OUT_DIR, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, plan.files.get(path)!, 'utf8')
  }
  const where = relative(ROOT, paths.length === 0 ? CORPUS_DIR : OUT_DIR)
    .split(sep)
    .join('/')
  console.log(paths.length === 0 ? `corpus 里还没有样本（${where}/）—— 没有可生成的类型` : `已写出 ${paths.length} 个文件到 ${where}/`)
}
