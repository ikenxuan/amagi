/**
 * 按形状截断数组。corpus 样本瘦身用，**保证生成出来的类型一字不变**。
 *
 * 为什么需要：一个列表端点一次返回 100 条同形元素，实测快手 `danmakuList` 一份样本
 * 就 204 KB、`emojiList` 280 KB。对类型生成来说，第 4 条到第 100 条的信息增量是**零** ——
 * 它们的键集合与第 1 条一样。
 * （**最初的理由是「corpus 要提交进 git 并被 review」，那条已经不成立** —— 样本改成只留本地。
 * 但这一步照样要留：样本要在 Web 控制台里被人肉眼看、要参与类型 diff 计算，
 * 而 1.3 MB 一份的东西在界面上没法看，diff 也算不出人能读的东西。）
 *
 * 为什么可以这么做，而且能证明：截断保留的是**每一种不同的元素形状**，
 * 而生成的类型只由「出现过哪些形状」决定，不由「每种出现了多少次」决定。
 * 所以「截断前后 `generateTypes` 的产物逐字节相同」是一条能直接断言的性质，
 * `test/trim.test.ts` 就是这么验的 —— 不是「大概不影响」，是钉死。
 *
 * 唯一要小心的是形状签名得**足够细**：只描述结构的签名会漏掉两类「值本身就是类型」的位置。
 *
 * 1. **超出 `MAX_SAFE_INTEGER` 的整数**单独算一种形状，否则那种数只出现在第 50 条时会被截掉，
 *    而 `unsafe-integer` 那条报告项跟着消失 —— 那正是类型要描述的东西之一。
 * 2. **命中 `literalPaths` 的位置**要把取值也算进签名，理由同上：`render.ts` 在这些位置上
 *    把取值收窄成字面量联合，于是 `{"list":[{"type":"T0"},…,{"type":"T4"}]}` 配
 *    `literalPaths: [/list\[\]\.type$/]`，截断前渲染成 `'T0' | 'T1' | 'T2' | 'T3' | 'T4'`、
 *    截断后只剩前三个 —— 上面那条「逐字节相同」当场破。所以 `literalPaths` 要**两边传同一份**：
 *    给了 `generateTypes` / `emitDiscriminatedUnion` 的那份，也要给 `trimSample`。
 *
 * 默认「不收窄」（`literalPaths: []`），所以两个现有调用方（`packages/core/scripts/record-corpus.mts`、
 * `packages/web/server/outcome.ts`）一行不用改。它们今天不传也仍然是对的，但**靠的是别处的一道闸**：
 * `emit.ts` 往 `literalPaths` 里塞的只有判别式路径，而带 `[]` 的判别式在那里被直接拒掉
 * （「元素级判别联合是另一件事，本轮不产」），于是收窄从来没落到数组里面过。哪天那道闸放开、
 * 或者 sidecar 学会自己写 `literalPaths`，录制侧就必须跟着传 —— 样本是**截完才落盘**的，
 * 当时截掉的取值事后一个都补不回来。
 */

import { childPath, elementPath, matchesLiteralPath, type MergeOptions } from './options'
import type { JsonValue } from './types'

/** 每个数组默认留几个元素。3 足够看出「数组里是什么」，也够容下前两条与一条异形 */
export const DEFAULT_MAX_ELEMENTS = 3

export interface TrimOptions {
  /** 见 {@link DEFAULT_MAX_ELEMENTS} */
  maxElements?: number
  /**
   * 字面量收窄白名单，**必须与生成时传的那份一致**（见模块注释第 2 条）。
   * 类型直接借 `MergeOptions` 的，两边不许各写一份定义。
   *
   * 默认空数组 = 不收窄 = 与本选项加进来之前逐字节等价。
   */
  literalPaths?: MergeOptions['literalPaths']
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
 * 形状签名：描述结构，**外加命中 `literalPaths` 的那些位置的取值**，其余一律不含值。
 *
 * 数字分 `n` 与 `n!`（超界）两种，字符串 / 布尔 / null 各一种，对象是「排序后的键 + 各自签名」，
 * 数组是「元素签名的集合」；命中收窄白名单的原始值再多带一个 `=<取值>`。
 *
 * 命中的位置上**有多少种取值就留多少条**，不去照抄 merge 那边「取值超过 `maxLiterals` 就
 * 放弃收窄」的阈值：那等于把截断的正确性绑在生成侧的另一个默认值上，调用方一把 `maxLiterals`
 * 调大，「类型一字不变」就悄悄破了，而且是在录制时破的、事后查不出来。留全部取值与
 * `maxLiterals` 无关 —— 两边看到的取值集合一模一样，那么放宽还是收窄也一模一样。
 *
 * 代价是取值差异会**往上传染**：数组元素的签名含它整棵子树，命中路径上多一种取值，祖先数组
 * 就多留一条。这是必须的 —— 只在第 10 页出现的那个取值，只有把第 10 页整条留下才保得住。
 */
const signatureOf = (value: JsonValue, path: string, literalPaths: readonly (string | RegExp)[]): string => {
  if (value === null) return 'z'
  if (Array.isArray(value)) {
    const inner = [...new Set(value.map((item) => signatureOf(item, elementPath(path), literalPaths)))].sort()
    return `[${inner.join('|')}]`
  }
  if (typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${signatureOf(value[key]!, childPath(path, key), literalPaths)}`)
      .join(',')}}`
  }
  const tag =
    typeof value === 'boolean'
      ? 'b'
      : typeof value === 'string'
        ? 's'
        : Number.isSafeInteger(value) || !Number.isInteger(value)
          ? 'n'
          : 'n!'
  return matchesLiteralPath(path, literalPaths) ? `${tag}=${JSON.stringify(value)}` : tag
}

/**
 * 截断样本里的数组。纯函数，不改输入。
 *
 * @param value 一份样本（通常是原始响应）
 * @param options 见 {@link TrimOptions}
 */
export const trimSample = (value: JsonValue, options: TrimOptions = {}): TrimResult => {
  const maxElements = options.maxElements ?? DEFAULT_MAX_ELEMENTS
  const literalPaths = options.literalPaths ?? []
  const trimmed: TrimRecord[] = []

  const walk = (node: JsonValue, path: string): JsonValue => {
    if (Array.isArray(node)) {
      const kept: JsonValue[] = []
      const seen = new Set<string>()
      for (const item of node) {
        // 签名按**元素自己的路径**算，不是数组的路径：`list` 的元素在 `list[]` 上，
        // 与 merge / render 判收窄用的是同一套路径（`options.ts` 那套约定）
        const signature = signatureOf(item, elementPath(path), literalPaths)
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
