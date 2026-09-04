/**
 * 样本本地缓存的读写。**唯一碰文件系统的地方。**
 *
 * 样本不进 git（PRD 待决 #1），所以 `corpus/` 是**本地缓存**而不是仓库资产：
 * 跨会话累积、供重新生成与排查，谁的机器上有多少是那台机器自己的事。
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { type CorpusSample, type JsonValue, parseSeedFile, type SeedFile } from '@ikenxuan/amagi-typegen'

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
 * **不清空目录**（与 `gen:types` 不同）：那条命令要保证「产物与全部证据一致」所以先
 * `rmSync` 整棵树；而这里只是「我刚录完这个端点，先看到它的类型」。
 */
export const writeGenerated = (path: string, source: string): void => {
  const full = join(GENERATED_DIR, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, source, 'utf8')
}

/**
 * 读根种子。**每次调用都重新读盘** —— 原先那版在启动时读一次，
 * 于是改了 `seeds.json` 必须重启服务；而「补一个种子再录一次」是这个工具的日常动作。
 */
export const readSeeds = (): SeedFile => {
  try {
    const parsed = parseSeedFile(JSON.parse(readFileSync(join(CORPUS_DIR, 'seeds.json'), 'utf8')) as JsonValue)
    // `errors` 刻意不抛：种子文件写错一个键不该让整个服务起不来，
    // 而是该在页面上说清楚（调用方把它转成告警）
    return parsed.seeds
  } catch {
    // 没有 seeds.json 不影响手动填参
    return { version: 1, platforms: {} }
  }
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
