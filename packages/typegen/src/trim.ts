/**
 * 按形状截断数组。corpus 样本瘦身用，**保证生成出来的类型一字不变**。
 *
 * 为什么需要：一个列表端点一次返回 100 条同形元素，实测快手 `danmakuList` 一份样本
 * 就 204 KB、`emojiList` 280 KB。对类型生成来说，第 4 条到第 100 条的信息增量是**零** ——
 * 它们的键集合与第 1 条一样。而 corpus 要提交进 git 并被 review，600 KB 的机器生成 JSON
 * 没人看得动，`contributing.mdx` 那条「只提交精简代表」也就等于没写。
 *
 * 为什么可以这么做，而且能证明：截断保留的是**每一种不同的元素形状**，
 * 而生成的类型只由「出现过哪些形状」决定，不由「每种出现了多少次」决定。
 * 所以「截断前后 `generateTypes` 的产物逐字节相同」是一条能直接断言的性质，
 * `test/trim.test.ts` 就是这么验的 —— 不是「大概不影响」，是钉死。
 *
 * 唯一要小心的是形状签名得**足够细**：把「超出 `MAX_SAFE_INTEGER` 的整数」也算进签名，
 * 否则那种数只出现在第 50 条时会被截掉，而 `unsafe-integer` 那条报告项跟着消失 ——
 * 那正是类型要描述的东西之一。
 */

import { childPath, elementPath } from './options'
import type { JsonValue } from './types'

/** 每个数组默认留几个元素。3 足够看出「数组里是什么」，也够容下前两条与一条异形 */
export const DEFAULT_MAX_ELEMENTS = 3

export interface TrimOptions {
  /** 见 {@link DEFAULT_MAX_ELEMENTS} */
  maxElements?: number
}

/** 截了哪一处、从几条截到几条 */
export interface TrimRecord {
  path: string
  from: number
  to: number
}

export interface TrimResult {
  value: JsonValue
  /** 按路径排序（确定性） */
  trimmed: TrimRecord[]
}

/**
 * 形状签名：只描述结构，不含任何值。
 *
 * 数字分 `n` 与 `n!`（超界）两种，理由见模块注释。字符串 / 布尔 / null 各一种，
 * 对象是「排序后的键 + 各自签名」，数组是「元素签名的集合」。
 */
const signatureOf = (value: JsonValue): string => {
  if (value === null) return 'z'
  if (typeof value === 'boolean') return 'b'
  if (typeof value === 'string') return 's'
  if (typeof value === 'number') return Number.isSafeInteger(value) || !Number.isInteger(value) ? 'n' : 'n!'
  if (Array.isArray(value)) {
    const inner = [...new Set(value.map(signatureOf))].sort()
    return `[${inner.join('|')}]`
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${signatureOf(value[key]!)}`)
    .join(',')}}`
}

/**
 * 截断样本里的数组。纯函数，不改输入。
 *
 * @param value 一份样本（通常是原始响应）
 * @param options 见 {@link TrimOptions}
 */
export const trimSample = (value: JsonValue, options: TrimOptions = {}): TrimResult => {
  const maxElements = options.maxElements ?? DEFAULT_MAX_ELEMENTS
  const trimmed: TrimRecord[] = []

  const walk = (node: JsonValue, path: string): JsonValue => {
    if (Array.isArray(node)) {
      const kept: JsonValue[] = []
      const seen = new Set<string>()
      for (const item of node) {
        const signature = signatureOf(item)
        // 前 maxElements 条无条件留；之后只留「形状还没见过」的那些
        if (kept.length < maxElements || !seen.has(signature)) {
          seen.add(signature)
          kept.push(item)
        }
      }
      if (kept.length < node.length) trimmed.push({ path, from: node.length, to: kept.length })
      return kept.map((item) => walk(item, elementPath(path)))
    }
    if (node === null || typeof node !== 'object') return node
    return Object.fromEntries(Object.entries(node).map(([key, child]) => [key, walk(child, childPath(path, key))]))
  }

  const result = walk(value, '')
  return { value: result, trimmed: trimmed.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0)) }
}
