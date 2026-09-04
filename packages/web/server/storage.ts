/**
 * 样本本地缓存的读写。**唯一碰文件系统的地方。**
 *
 * 样本不进 git（PRD 待决 #1），所以 `corpus/` 是**本地缓存**而不是仓库资产：
 * 跨会话累积、供重新生成与排查，谁的机器上有多少是那台机器自己的事。
 */

import { mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { type CorpusSample, EMPTY_SEED_FILE, type JsonValue, parseSeedFile, type SeedFile } from '@ikenxuan/amagi-typegen'

const here = dirname(fileURLToPath(import.meta.url))
/** 仓库根：`packages/web/server` 往上三层 */
export const ROOT = join(here, '..', '..', '..')
export const CORPUS_DIR = join(ROOT, 'corpus')

/** 样本文件名就是参数哈希，12 位十六进制。与 `gen-types.mts` 同一条约定 */
const SAMPLE_FILE = /^[0-9a-f]{12}\.json$/

/** 某个端点的样本文件名（已排序）。目录不存在就是「还没录过」，不是错误 */
const sampleFiles = (platform: string, endpoint: string): string[] => {
  try {
    return readdirSync(join(CORPUS_DIR, platform, endpoint))
      .filter((name) => SAMPLE_FILE.test(name))
      .sort()
  } catch {
    return []
  }
}

/**
 * 数某个端点有几份样本。**只列目录、不解析** ——
 * `/api/endpoints` 要为 61 个端点各数一次，而 `readSamples` 会把每个文件整份 `JSON.parse`。
 * 现在 corpus 里两份 B站 `comments` 各 1.3 MB，光为了拿一个 `.length` 就解析 3 MB JSON。
 */
export const countSamples = (platform: string, endpoint: string): number => sampleFiles(platform, endpoint).length

/**
 * 读某个端点已入库的样本。类型 diff 的「之前」那一半靠它。
 *
 * **一个文件坏了不会静默变成「0 份」**：原先整段包在一个 try 里，于是一个写坏的样本
 * 会让整个端点看起来没录过 —— `stored` 显示 0、diff 的「之前」那半是空的（**每份新样本
 * 都会看起来带来了新形状**）、「生成类型」按钮还会因为 `stored === 0` 被禁掉。全程无声。
 * 现在逐个文件 try，坏的那个进 `errors` 让调用方报出来。
 */
export const readSamples = (platform: string, endpoint: string): { samples: CorpusSample[]; errors: string[] } => {
  const dir = join(CORPUS_DIR, platform, endpoint)
  const samples: CorpusSample[] = []
  const errors: string[] = []
  for (const name of sampleFiles(platform, endpoint)) {
    try {
      samples.push(JSON.parse(readFileSync(join(dir, name), 'utf8')) as CorpusSample)
    } catch (error) {
      errors.push(`${platform}/${endpoint}/${name} 读不了：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return { samples, errors }
}

/** 写一份样本。`path` 是仓库相对路径（`createCorpusSample` 算出来的） */
export const writeSample = (path: string, json: string): void => {
  const full = join(ROOT, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, json, 'utf8')
}

/** 生成的类型产物根。与 `packages/typegen/scripts/gen-types.mts` 的 `OUT_DIR` 必须一致 */
export const GENERATED_DIR = join(ROOT, 'packages', 'response-types', 'src', 'generated')

/**
 * 写一个生成产物。`path` 是相对产物根的路径，如 `bilibili/Comments/Comments_V0.ts`。
 *
 * **不清空整棵树**（与 `gen:types` 不同）：那条命令要保证「产物与全部证据一致」所以先
 * `rmSync`；而这里只是「我刚录完这个端点，先看到它的类型」。
 * 单个端点目录里的残留由 {@link listGeneratedUnder} + {@link removeGenerated} 收拾。
 */
export const writeGenerated = (path: string, source: string): void => {
  const full = join(GENERATED_DIR, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, source, 'utf8')
}

/**
 * 递归列出某个端点目录（`<平台>/<Endpoint>`）下现有的 `.ts` 产物，相对产物根、`/` 分隔、已排序。
 *
 * 存在的理由是一个真 bug：`/api/generate` 原先只写不删。补一份样本让判别式忽然可发现之后，
 * 布局会从 `Comments/Comments_V0.ts` + `Comments/index.ts` 翻成
 * `Comments/guards.ts` + `Comments/<取值>/…` —— 旧的两个文件没人删，而平台 barrel
 * 按判据被排除、不重写，于是它仍然 `export type { Comments_V0 } from './Comments'`，
 * 指向的旧文件还在。**`tsc` 全绿，下游拿到的还是旧类型，新写出来的联合谁也 import 不到。**
 */
export const listGeneratedUnder = (dir: string): string[] => {
  const walk = (relative: string): string[] => {
    let entries: { name: string; isDirectory: () => boolean }[]
    try {
      entries = readdirSync(join(GENERATED_DIR, relative), { withFileTypes: true })
    } catch {
      // 目录不存在 = 这个端点还没生成过，不是错误
      return []
    }
    return entries.flatMap((entry) => {
      const child = `${relative}/${entry.name}`
      if (entry.isDirectory()) return walk(child)
      return entry.name.endsWith('.ts') ? [child] : []
    })
  }
  return walk(dir).sort()
}

/**
 * 删掉一个产物文件，并把因此空掉的目录一层层收走。
 *
 * **判据是解析后的绝对路径，不是原始字符串。** 原先三道闸全按字符串来（`split('/')` 的段数、
 * `endsWith('.ts')`、`parts.includes('..')`），三种写法整个穿过去，而穿过去就是真的 `rmSync`：
 *
 * - `bilibili//index.ts` —— 按 `/` 切出来也是三段（中间那段是空串）、结尾 `.ts`、没有 `..`，
 *   三道闸全过。而 `join` 会把空段吃掉，于是删的是**平台 barrel**，
 *   紧接着往上收的第一层是**平台目录**。
 * - `//x.ts` —— 同理，往上收的目标是**产物根本身**。
 * - `bilibili/Comments/..\..\..\index.ts` —— `..` 藏在反斜杠后面，按 `/` 根本切不开，
 *   于是那道 `..` 检查形同虚设。Windows 上 `join` 认反斜杠，落点是
 *   `packages/response-types/src/index.ts`（**手写**入口），再多几个 `..\` 能出仓库。
 *
 * 今天喂进来的都是 {@link listGeneratedUnder} 回的真 dirent（文件名里不含分隔符），所以三条都
 * 不可达 —— 但这几道闸声称给出的正是这个保证，而这是这个包里唯一会删文件的地方。
 *
 * 现在是五道闸，顺序也是刻意的（先把字符串里的花样挡掉，再看归一化的结果）：
 *
 * 1. **不许有反斜杠**：产物路径的分隔符只有 `/`。放它进来，判据的含义就随平台变了 ——
 *    同一个字符串在 Windows 上能出根、在 Linux 上是个名字带反斜杠的文件。
 * 2. **每段非空**：空段会被归一化悄悄吃掉，于是判据看到的深度不是真的深度 ——
 *    上面 `bilibili//index.ts` 那条就是这么进来的。
 * 3. **归一化之后仍在产物根之内**：`..` 不再靠找字符串，靠 `relative` 的结果说话。
 *    `isAbsolute` 那一支是 Windows 跨盘 —— `relative('D:\\…', 'C:\\…')` 回的是绝对路径。
 * 4. **至少三段**（`<平台>/<Endpoint>/…`）：根 barrel 一段、平台 barrel 两段，于是它们在
 *    判据上就碰不到。
 * 5. **结尾是 `.ts` 且不只是 `.ts`**。
 *
 * 目录只用 `rmdirSync` 收，它对非空目录会失败 —— 这正是想要的行为，
 * 递归删一棵目录树的力气在这里不该有。
 *
 * @param root 产物根。只为可测 —— 生产路径永远是那个模块级常量。
 *   真删一个产物文件就是真删一个已提交的产物文件（那 28 个文件参与 `pnpm types:check` 的
 *   逐字节比对），所以「放过」那一侧只在系统临时目录里测。
 */
export const removeGenerated = (path: string, root: string = GENERATED_DIR): void => {
  /** 五道闸共用一句话：`拒绝删除` 与范围那半句是给日志读的，前面补上到底哪一道拦的 */
  const reject = (why: string): never => {
    throw new Error(`拒绝删除 ${path}：${why} —— 产物清理只碰 <平台>/<Endpoint>/ 底下的 .ts 文件`)
  }
  if (path.includes('\\')) reject('路径里有反斜杠，而产物路径的分隔符只有 `/`')
  if (path.split('/').some((part) => part === '')) reject('路径里有空段')

  const base = resolve(root)
  const target = resolve(base, path)
  const inside = relative(base, target)
  if (inside === '' || inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) reject('归一化之后落在产物根外面')

  const segments = inside.split(sep)
  if (segments.length < 3) reject(`归一化之后只有 ${segments.length} 段`)
  const name = segments[segments.length - 1]!
  if (name === '.ts' || !name.endsWith('.ts')) reject('不是一个 .ts 文件')

  rmSync(target, { force: true })
  // 从文件所在的那一层往上收，**最浅收到 `<平台>/<Endpoint>`**：段数至少三段，所以下界 2
  // 就是那两段。平台目录（一段）与产物根（零段）一次都不碰 —— 平台目录底下还有别的端点，
  // 产物根底下还有 barrel。
  // 这里数的是**归一化之后**的 `segments`：原先数原始字符串切出来的段，
  // `['bilibili', '', 'index.ts']` 的 depth 2 拼出来的正是平台目录
  for (let depth = segments.length - 1; depth >= 2; depth -= 1) {
    try {
      rmdirSync(join(base, ...segments.slice(0, depth)))
    } catch {
      // 非空就停 —— 剩下的层级都在用
      return
    }
  }
}

export interface SeedRead {
  seeds: SeedFile
  /**
   * 种子文件本身的问题。**空数组 = 文件是好的**，其中包括「文件不存在」——
   * 那是正常状态（还没人填），不是问题。
   */
  issues: string[]
}

/**
 * 读根种子。**每次调用都重新读盘** —— 原先那版在启动时读一次，
 * 于是改了 `seeds.json` 必须重启服务；而「补一个种子再录一次」是这个工具的日常动作。
 *
 * **问题一律回给调用方，不吞。** 原先这里把两件事混成了一件：`parseSeedFile` 的
 * `errors` 被丢掉、JSON 语法错又被 `catch` 当成「没有 seeds.json」。
 * 于是给 `seeds.json` 加一个尾逗号 → 61 个端点全部显示「缺种子，批量录不了 · 0 组」，
 * 而日志、响应、界面三处没有一个字指向种子文件。而 `parseSeedFile` 恰好报得出
 * 「`params` 拼成了 `parms`」这类最难查的手误 —— 报得出却没人听，比不报更糟。
 */
export const readSeeds = (): SeedRead => {
  let raw: string
  try {
    raw = readFileSync(join(CORPUS_DIR, 'seeds.json'), 'utf8')
  } catch {
    // 没有 seeds.json 不影响手动填参，也不算问题
    return { seeds: EMPTY_SEED_FILE, issues: [] }
  }
  let parsedJson: JsonValue
  try {
    parsedJson = JSON.parse(raw) as JsonValue
  } catch (error) {
    return {
      seeds: EMPTY_SEED_FILE,
      issues: [`corpus/seeds.json 不是合法 JSON，整份种子都没读进来：${error instanceof Error ? error.message : String(error)}`]
    }
  }
  // `errors` 刻意不抛：种子文件写错一个键不该让整个服务起不来
  const parsed = parseSeedFile(parsedJson)
  return { seeds: parsed.seeds, issues: parsed.errors.map((message) => `corpus/seeds.json：${message}`) }
}

/** 读 core 的版本号，写进样本 metadata —— 「这份样本是哪个版本录的」 */
export const readAmagiVersion = (): string => {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'packages', 'core', 'package.json'), 'utf8')) as { version: string }
    return pkg.version
  } catch {
    return '0.0.0'
  }
}
