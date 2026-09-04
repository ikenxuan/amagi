/**
 * 种子与依赖图（PRD 阶段 1、3.1）。回答的是「不透明 ID 从哪来」这一个问题。
 *
 * PRD 3.1 那笔账：61 个端点里绝大多数要一个 `photoId` / `bvid` / `sec_uid`，
 * 而这些值凭 schema 造不出来。两条来路，都在这里：
 *
 * 1. **种子**（`seeds.json`）—— 每平台几个根值（UID、关键词），人手改。它是链条的起点。
 * 2. **依赖图** —— 「录 `videoWork` 用的 `photoId` 从 `userVideoList` 的响应里取」。
 *    有了它，人只要维护几个根 UID，其余 ID 顺着响应自己长出来。
 *
 * 依赖图**手工声明，不自动推断**。自动推断「哪个字段能喂给哪个参数」要靠名字相似度，
 * 而名字撞车在这些平台上是常态（`id` 在一份响应里能出现几十处、指的东西各不相同）。
 * 推错的后果是拿错 ID 去发请求、换回一份错误页，而错误页混进 corpus 是静默的。
 * 手写一张表几十行就写完了，换来的是「这条链为什么这么走」有地方可查。
 */

import type { JsonValue } from './types'

/* ------------------------------------------------------------------ 种子 */

export interface PlatformSeeds {
  /** 参数名 → 取值，同平台通用（`uid` 在同一平台的各端点指的是同一种东西） */
  params?: Record<string, readonly JsonValue[]>
  /** 端点名 → 参数名 → 取值。压过 `params` */
  endpoints?: Record<string, Record<string, readonly JsonValue[]>>
}

export interface SeedFile {
  /** 格式版本，语义同 `CORPUS_FORMAT`：只有键的含义变了才 +1 */
  version: number
  platforms: Record<string, PlatformSeeds>
}

/** 空种子文件。`seeds.json` 还没建时用它，让录制器照样能跑（只是每个端点都会报 unseeded） */
export const EMPTY_SEED_FILE: SeedFile = { version: 1, platforms: {} }

/**
 * 解析人手改的 `seeds.json`。**不抛异常**，把问题都收进 `errors` ——
 * 一个拼错的平台名不该让整轮录制炸掉，但也绝不能静默当成「这个平台没种子」。
 */
export const parseSeedFile = (raw: JsonValue): { seeds: SeedFile; errors: string[] } => {
  const errors: string[] = []
  const isRecord = (value: JsonValue | undefined): value is Record<string, JsonValue> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
  if (!isRecord(raw)) return { seeds: EMPTY_SEED_FILE, errors: ['seeds.json 的根不是对象'] }
  const platforms: Record<string, PlatformSeeds> = {}
  const rawPlatforms = raw.platforms
  if (!isRecord(rawPlatforms)) return { seeds: EMPTY_SEED_FILE, errors: ['seeds.json 缺 platforms 字段，或者它不是对象'] }

  const readValues = (where: string, value: JsonValue | undefined): JsonValue[] | undefined => {
    if (!Array.isArray(value)) {
      errors.push(`${where} 不是数组`)
      return undefined
    }
    if (value.length === 0) errors.push(`${where} 是空数组，等于没给种子`)
    return [...value]
  }
  const readParams = (where: string, value: JsonValue | undefined): Record<string, readonly JsonValue[]> | undefined => {
    if (!isRecord(value)) {
      errors.push(`${where} 不是对象`)
      return undefined
    }
    const out: Record<string, readonly JsonValue[]> = {}
    for (const [param, values] of Object.entries(value)) {
      const parsed = readValues(`${where}.${param}`, values)
      if (parsed !== undefined) out[param] = parsed
    }
    return out
  }

  for (const [platform, config] of Object.entries(rawPlatforms)) {
    if (!isRecord(config)) {
      errors.push(`platforms.${platform} 不是对象`)
      continue
    }
    // JSON 没有注释，所以约定 `$comment` 当注释；除它以外的未知键一律报错 ——
    // 这个文件是人手改的，把 `params` 拼成 `parms` 而静默当成「没给种子」是最难查的那种错
    for (const key of Object.keys(config)) {
      if (key !== 'params' && key !== 'endpoints' && key !== '$comment') errors.push(`platforms.${platform}.${key} 不是认识的键`)
    }
    const entry: PlatformSeeds = {}
    if (config.params !== undefined) entry.params = readParams(`platforms.${platform}.params`, config.params)
    if (config.endpoints !== undefined) {
      if (!isRecord(config.endpoints)) errors.push(`platforms.${platform}.endpoints 不是对象`)
      else {
        const endpoints: Record<string, Record<string, readonly JsonValue[]>> = {}
        for (const [endpoint, params] of Object.entries(config.endpoints)) {
          const parsed = readParams(`platforms.${platform}.endpoints.${endpoint}`, params)
          if (parsed !== undefined) endpoints[endpoint] = parsed
        }
        entry.endpoints = endpoints
      }
    }
    platforms[platform] = entry
  }
  const version = typeof raw.version === 'number' ? raw.version : 1
  if (typeof raw.version !== 'number') errors.push('seeds.json 缺 version 字段，按 1 处理')
  return { seeds: { version, platforms }, errors }
}

/** 某个端点能用的种子：端点级覆盖平台级。直接喂给 `expandParamMatrix` 的 `seeds` */
export const resolveSeeds = (file: SeedFile, platform: string, endpoint: string): Record<string, readonly JsonValue[]> => {
  const config = file.platforms[platform]
  if (config === undefined) return {}
  return { ...config.params, ...config.endpoints?.[endpoint] }
}

/* ------------------------------------------------------------------ 路径取值 */

const isRecordValue = (value: JsonValue): value is Record<string, JsonValue> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * 按 `options.ts` 那套路径约定取值，返回**所有**命中的值（数组会摊开）。
 *
 * `data.feeds[].photo.photoId` 在一份列表响应上能取出十几个 ID，这正是依赖图要的 ——
 * 录一次列表就能喂出十几组详情请求。
 *
 * `null` 与缺键都被丢掉：作为种子它们没用，而留着会让「有几个种子」的计数骗人。
 */
export const readValuesAtPath = (value: JsonValue, path: string): JsonValue[] => {
  let current: JsonValue[] = [value]
  for (const segment of path === '' ? [] : path.split('.')) {
    const key = segment.replace(/(?:\[\])+$/, '')
    const arrayDepth = (segment.length - key.length) / 2
    let next: JsonValue[] = []
    for (const item of current) {
      if (key === '') next.push(item)
      else if (isRecordValue(item) && item[key] !== undefined) next.push(item[key]!)
    }
    for (let level = 0; level < arrayDepth; level += 1) next = next.flatMap((item) => (Array.isArray(item) ? item : []))
    current = next
  }
  return current.filter((item) => item !== null)
}

/* ------------------------------------------------------------------ 依赖图 */

export interface DependencyEdge {
  /** 要录的端点 */
  endpoint: string
  /** 它的哪个参数 */
  param: string
  /** 值从哪个端点的响应里来 */
  from: string
  /** 取哪条路径（路径约定同上，跨过数组用 `[]`） */
  path: string
  /** 最多取几个值。不限的话一份列表能喂出几十个详情请求，一轮录制就跑到天亮 */
  limit?: number
  /** 这条边为什么这么走 —— 手工声明的表，理由必须留下来，否则下一个人不敢改 */
  note?: string
}

/** 一条边最多喂出几个值 */
export const DEFAULT_EDGE_LIMIT = 3

/**
 * 从已录到的样本里抽出下游端点要的参数值。
 *
 * @param edges 依赖图
 * @param recorded 端点名 → 已录到的响应（原始 `raw`，因为依赖图的路径是照真响应写的）
 * @returns 端点名 → 参数名 → 取值，形状与 `expandParamMatrix` 的 `seeds` 一致
 */
export const collectSeedsFromSamples = (
  edges: readonly DependencyEdge[],
  recorded: Readonly<Record<string, readonly JsonValue[]>>
): Record<string, Record<string, JsonValue[]>> => {
  const out: Record<string, Record<string, JsonValue[]>> = {}
  for (const edge of edges) {
    const samples = recorded[edge.from] ?? []
    const values: JsonValue[] = []
    const seen = new Set<string>()
    for (const sample of samples) {
      for (const value of readValuesAtPath(sample, edge.path)) {
        const key = JSON.stringify(value)
        if (seen.has(key)) continue
        seen.add(key)
        values.push(value)
        if (values.length >= (edge.limit ?? DEFAULT_EDGE_LIMIT)) break
      }
      if (values.length >= (edge.limit ?? DEFAULT_EDGE_LIMIT)) break
    }
    if (values.length === 0) continue
    out[edge.endpoint] = { ...out[edge.endpoint], [edge.param]: values }
  }
  return out
}

export interface RecordingPlan {
  /** 录制顺序：被依赖的端点排在前面 */
  order: string[]
  /** 成环的端点分组。**每组至少要有一个端点有种子**，否则这一组永远录不到 */
  cycles: string[][]
  /** 声明了边、但目标端点不在待录清单里 —— 大概是端点改名了，边没跟着改 */
  danglingEdges: DependencyEdge[]
}

/**
 * 排录制顺序。
 *
 * 环是**真的会出现**的，不是理论上的：`videoWork` 要的 `photoId` 来自 `userVideoList`，
 * 而 `userVideoList` 要的 `uid` 又可以来自 `videoWork` 的作者。所以这里不能只做拓扑排序 ——
 * 它必须把环报出来，让人知道「这一组里得有一个端点在 `seeds.json` 里有根值」。
 * 环里的端点仍然进 `order`（排在最后），因为它们通常靠种子就能录。
 */
export const planRecordingOrder = (endpoints: readonly string[], edges: readonly DependencyEdge[]): RecordingPlan => {
  const nodes = [...new Set(endpoints)]
  const known = new Set(nodes)
  const danglingEdges = edges.filter((edge) => !known.has(edge.endpoint) || !known.has(edge.from))
  const live = edges.filter((edge) => known.has(edge.endpoint) && known.has(edge.from) && edge.endpoint !== edge.from)

  // 入度 = 「还有几个没录的端点是我的上游」
  const upstream = new Map<string, Set<string>>(nodes.map((node) => [node, new Set<string>()]))
  for (const edge of live) upstream.get(edge.endpoint)!.add(edge.from)

  const order: string[] = []
  const placed = new Set<string>()
  let progressed = true
  while (progressed) {
    progressed = false
    // 照 nodes 原顺序扫，保证同一批可录端点的相对顺序稳定（确定性）
    for (const node of nodes) {
      if (placed.has(node)) continue
      const blockers = [...upstream.get(node)!].filter((from) => !placed.has(from))
      if (blockers.length > 0) continue
      order.push(node)
      placed.add(node)
      progressed = true
    }
  }

  const remaining = nodes.filter((node) => !placed.has(node))
  const cycles = groupCycles(remaining, live)
  return { order: [...order, ...remaining], cycles, danglingEdges }
}

/** 把剩下的（互相成环的）端点按连通分量分组 —— 一组就是一个需要人给种子的环 */
const groupCycles = (remaining: readonly string[], edges: readonly DependencyEdge[]): string[][] => {
  const inCycle = new Set(remaining)
  const neighbours = new Map<string, Set<string>>(remaining.map((node) => [node, new Set<string>()]))
  for (const edge of edges) {
    if (!inCycle.has(edge.endpoint) || !inCycle.has(edge.from)) continue
    neighbours.get(edge.endpoint)!.add(edge.from)
    neighbours.get(edge.from)!.add(edge.endpoint)
  }
  const seen = new Set<string>()
  const groups: string[][] = []
  for (const node of remaining) {
    if (seen.has(node)) continue
    const group: string[] = []
    const stack = [node]
    while (stack.length > 0) {
      const current = stack.pop()!
      if (seen.has(current)) continue
      seen.add(current)
      group.push(current)
      for (const next of neighbours.get(current) ?? []) if (!seen.has(next)) stack.push(next)
    }
    groups.push(group.sort())
  }
  return groups
}
