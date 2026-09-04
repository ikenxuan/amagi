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

/** 读某个端点已入库的样本。类型 diff 的「之前」那一半靠它 */
export const readSamples = (platform: string, endpoint: string): CorpusSample[] => {
  const dir = join(CORPUS_DIR, platform, endpoint)
  try {
    return readdirSync(dir)
      .filter((name) => SAMPLE_FILE.test(name))
      .sort()
      .map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as CorpusSample)
  } catch {
    // 目录不存在就是「这个端点还没录过」，不是错误
    return []
  }
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
