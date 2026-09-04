/**
 * PRD 5.1 判别式发现，以及它的两个下游：按取值分组、同一取值下的形状序号（`_V<n>`）。
 *
 * 这一层**架在合并器之上，不改合并器**：`merge.ts` 干的是「N 份样本 → 一棵形状树」，
 * 这里干的是「先决定该合几棵树」。分组一定完，每组照样原样丢给 `mergeSamples`。
 *
 * 判据（PRD 5.1 原话是「取值是有限字面量集合，且不同取值对应的**其余键集合不同**」）
 * 在这里被拆成四条，逐条都有原因，见 `findDiscriminants` 的注释。
 */

import { childPath, elementPath, sortLiterals } from './options'
import type { JsonValue, LiteralValue } from './types'

/**
 * 收集「其余键集合」时往下走多少层。
 *
 * 要往深处走的实测理由：B站动态 6 个取值的 `data.item` **直接**键集合几乎一样
 * （只有 FORWARD 多一个 `orig`），真正的区别在第 4 层 ——
 * `modules.module_dynamic.major.archive` / `.opus` / `.live_rcmd`。
 * 只看直接键会得出「这 5 个取值结构一样」的错结论。
 */
export const DEFAULT_KEY_PATH_DEPTH = 8

/**
 * 一个字段最多几个不同取值还算得上「有限字面量集合」。
 * 超了就不是判别式候选 —— `id` 那种每份样本一个新值的字段必须被挡在外面。
 *
 * 上限 31：分离度分析用 32 位整数当分组位图（见 `analyseGroups`）。
 */
export const DEFAULT_MAX_DISCRIMINANT_VALUES = 24

/** 位图上限，`maxValues` 会被夹到这个数以内 */
const MAX_GROUPS = 31

/**
 * `_V<n>` 加一的门槛：一个形状簇至少要被这么多份样本证明过。
 *
 * 默认 2 不是随手取的，是 PRD 1.3 那条实测结论的直接后果：现存两个 `_V1` 的全部差异
 * （`editable` 有无、`topic` 是对象还是 null、`rid` 换 `jump_url`……）都只出现过**一次**，
 * 是同一个接口两次抓包赶上的数据波动，不是参数决定的分支。只出现一次的形状差异
 * 一律当漂移合并掉；出现 ≥2 次且严格互斥，才承认它是一个独立形状。
 */
export const DEFAULT_MIN_SHAPE_WITNESSES = 2

/** 一个取值的「独占键」最多列几条 —— 报告用，列全了没人看 */
const DISTINCTIVE_KEYS_SHOWN = 6

/** 判别式只能是字面量：`null` 和对象/数组都不算（`null` 没法写进 `Extract<…>` 的判别模式） */
const isLiteral = (value: JsonValue): value is LiteralValue => value !== null && typeof value !== 'object'

/** JSON 对象的最小结构，省掉一堆 as */
type JsonObject = { [key: string]: JsonValue }

const isObject = (value: JsonValue): value is JsonObject => value !== null && typeof value === 'object' && !Array.isArray(value)

/** 深度优先访问每一个**对象实例**，路径写法与 options.ts 一致（数组元素加 `[]`） */
const walkObjects = (value: JsonValue, path: string, visit: (path: string, object: JsonObject) => void): void => {
  if (value === null || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) walkObjects(item, elementPath(path), visit)
    return
  }
  visit(path, value)
  for (const key of Object.keys(value)) walkObjects(value[key]!, childPath(path, key), visit)
}

/**
 * 一个对象实例的「深层键路径集合」（相对它自己）。数组元素的键并成一条 `k[]` 前缀
 * —— 也就是「数组里**某个**元素上有这个键」。这对判别式判据够用：
 * 元素级的形状差异是另一件事（见 `insideArray`）。
 */
const collectKeyPaths = (value: JsonValue, prefix: string, depth: number, out: Set<string>): void => {
  if (depth <= 0 || value === null || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) collectKeyPaths(item, elementPath(prefix), depth - 1, out)
    return
  }
  for (const key of Object.keys(value)) {
    const item = value[key]!
    const path = childPath(prefix, key)
    out.add(path)
    collectKeyPaths(item, path, depth - 1, out)
  }
}

/** 判别式的一个取值 */
export interface DiscriminantValue {
  value: LiteralValue
  /** 有多少个容器实例取这个值（容器就是判别字段所在的那个对象） */
  instances: number
  /**
   * 只在这个取值下**必需**、在其它取值下**从不出现**的键路径（相对容器，最多 6 条）。
   * 这就是「其余键集合不同」的证据本体 —— 报告里直接打给人看。
   */
  distinctiveKeys: string[]
}

/** 一个判别式候选 */
export interface DiscriminantCandidate {
  /** 判别字段的完整路径，如 `data.item.type` */
  path: string
  /** 判别字段所在容器对象的路径（根是空串），如 `data.item` */
  containerPath: string
  /** 字段名，如 `type` */
  key: string
  /** 容器实例总数 —— 各取值 `instances` 之和 */
  instances: number
  /** 按 `sortLiterals` 排好序的取值，顺序固定（确定性） */
  values: DiscriminantValue[]
  /** 被「其余键集合不同」分开的取值**对**数 */
  separatedPairs: number
  /** 取值总对数 `C(n, 2)` —— `separatedPairs / totalPairs` 就是分离度 */
  totalPairs: number
  /**
   * 路径里含 `[]`。这种候选**不能**用来给「样本」分组：一份样本在数组路径上有多个取值，
   * 划不到某一组去。它对应的是「数组元素形状不一致 → 元素类型取判别联合」那条，
   * 是另一件事，本轮不产（见 `report.ts` 的 `NOT_IMPLEMENTED`）。
   */
  insideArray: boolean
  /** 路径深度（`.` 段数 + `[]` 个数）—— 多候选排序用，浅的优先 */
  depth: number
}

export interface FindDiscriminantsOptions {
  /** 见 `DEFAULT_MAX_DISCRIMINANT_VALUES` */
  maxValues?: number
  /** 见 `DEFAULT_KEY_PATH_DEPTH` */
  keyPathDepth?: number
}

/** 判别字段在某个容器上的取值统计（第一遍扫出来的） */
interface FieldStats {
  /** 键存在**且值是字面量**的实例数 */
  literals: number
  /** 取值 → 实例数；`undefined` = 取值太多，已放弃（不是「有限字面量集合」） */
  values: Map<LiteralValue, number> | undefined
}

interface ContainerStats {
  /** 这个位置见过多少个对象实例 —— 判「字段是不是每个实例上都有」的分母 */
  instances: number
  fields: Map<string, FieldStats>
}

/** 第一遍：把每个对象位置上「哪些字段取哪些字面量」数出来。便宜，全量扫 */
const scanContainers = (samples: readonly JsonValue[], maxValues: number): Map<string, ContainerStats> => {
  const containers = new Map<string, ContainerStats>()
  for (const sample of samples) {
    walkObjects(sample, '', (path, object) => {
      let stats = containers.get(path)
      if (!stats) {
        stats = { instances: 0, fields: new Map() }
        containers.set(path, stats)
      }
      stats.instances += 1
      for (const key of Object.keys(object)) {
        const value = object[key]!
        if (!isLiteral(value)) continue
        let field = stats.fields.get(key)
        if (!field) {
          field = { literals: 0, values: new Map() }
          stats.fields.set(key, field)
        }
        field.literals += 1
        if (field.values) {
          field.values.set(value, (field.values.get(value) ?? 0) + 1)
          // 取值太多：这是 id 之类的自由字段，不可能是判别式，别再攒了
          if (field.values.size > maxValues) field.values = undefined
        }
      }
    })
  }
  return containers
}

/** 某个取值下攒的「其余键」证据 */
interface GroupEvidence {
  instances: number
  /** 键路径 → 在这组的多少个实例里出现过 */
  presence: Map<string, number>
}

interface GroupAnalysis {
  separatedPairs: number
  totalPairs: number
  /** 与 `groups` 同序：每个取值的独占键 */
  distinctiveKeys: string[][]
}

/**
 * 「其余键集合不同」的判定本体。
 *
 * 两组算「分开了」的条件：**存在一个键，在一组里必需（每个实例都有），在另一组里从不出现**。
 * 为什么要这么严 —— 而不是简单比「键集合是否相等」：真实 corpus 里几乎每个字段都有
 * 数据波动，键集合相等这个条件太脆，会把一切字面量字段都判成判别式。而「一边必需、
 * 一边从不出现」正好是判别联合有用的那个性质：知道了 tag，就能确定某些键一定在（或一定不在）。
 * 一个在 A 组里可选、在 B 组里也可选的键，合并成 `k?:` 就完全够了，不值得切联合。
 */
const analyseGroups = (groups: readonly GroupEvidence[]): GroupAnalysis => {
  const count = groups.length
  const allMask = count === MAX_GROUPS ? 0x7fffffff : (1 << count) - 1
  const universe = new Set<string>()
  for (const group of groups) for (const key of group.presence.keys()) universe.add(key)
  const separatedWith = new Array<number>(count).fill(0)
  const distinctiveKeys: string[][] = Array.from({ length: count }, () => [])
  for (const key of universe) {
    let required = 0
    let absent = 0
    for (let index = 0; index < count; index += 1) {
      const group = groups[index]!
      const seen = group.presence.get(key) ?? 0
      if (seen === 0) absent |= 1 << index
      else if (seen === group.instances) required |= 1 << index
    }
    // 一边必需一边缺席才是证据；「两边都可选」不算（说明合并成 `k?:` 就够）
    if (required === 0 || absent === 0) continue
    for (let index = 0; index < count; index += 1) {
      const bit = 1 << index
      if ((required & bit) !== 0) {
        separatedWith[index]! |= absent
        // 在自己这组必需、在**其它每一组**都缺席 —— 这条键单独就能认出这个取值
        if ((absent | bit) === allMask) distinctiveKeys[index]!.push(key)
      }
      if ((absent & bit) !== 0) separatedWith[index]! |= required
    }
  }
  let separatedPairs = 0
  for (let left = 0; left < count; left += 1) {
    for (let right = left + 1; right < count; right += 1) {
      if ((separatedWith[left]! & (1 << right)) !== 0) separatedPairs += 1
    }
  }
  return {
    separatedPairs,
    totalPairs: (count * (count - 1)) / 2,
    distinctiveKeys: distinctiveKeys.map((keys) => keys.sort().slice(0, DISTINCTIVE_KEYS_SHOWN))
  }
}

/** 路径深度：`.` 段数加上数组跳数 —— `data.items[].type` 比 `data.item.type` 深 */
const pathDepth = (path: string): number => (path === '' ? 0 : path.split('.').length) + (path.match(/\[\]/g)?.length ?? 0)

/**
 * 多个候选时的排序规则（`findDiscriminants` 返回的顺序，第一个就是首选）：
 *
 * 1. **分离度大的优先**（`separatedPairs / totalPairs`，整数交叉相乘比，避免浮点抖动）。
 *    分离度衡量的就是「这个字段到底有多像判别式」：每个取值都对应一个独立形状的字段
 *    才配切判别联合；只分开一对、其余取值形状相同的，本质是普通字面量联合。
 * 2. **路径浅的优先**。同样像判别式时选外层：外层判别式切的是更大的形状块，守卫也更好写；
 *    深层的那些往往是外层的副产品（`major.type` 是 `item.type` 决定的，反过来不成立）。
 * 3. **取值多的优先**。同样像、同样深时，切得更细的那个信息量更大。
 * 4. **路径字典序**。纯粹兜底，保证同一份 corpus 永远给出同一个答案。
 */
/**
 * 「每个取值都只见过一次」—— id 类自由字段的气味。
 *
 * 这条判据是写测试时撞出来的，值得记住：给 6 个变体各喂 1 份样本时，
 * `id_str`（每份样本一个唯一值）与 `type`（真判别式）在前几条判据上**完全同分** ——
 * 都是 6 个取值、100% 分离度、同一层深度。因为「每份样本自成一组」本身就让分离度满分。
 *
 * 分开它们的是重复：**真类别会重复出现，id 不会**。所以取值全都只出现一次的候选
 * 往后排。它不是硬否决（样本少的时候真判别式也可能碰上），但足够让排序稳定。
 *
 * 这也是 PRD「内容驱动的变体只能靠样本量」那条的一个具体后果：
 * 每个变体至少两份样本，判别式发现才真的可靠。
 * @param candidate - 候选
 * @returns 每个取值都只见过一次时为 true
 */
const looksLikeId = (candidate: DiscriminantCandidate): boolean => candidate.values.every((value) => value.instances === 1)

const compareCandidates = (left: DiscriminantCandidate, right: DiscriminantCandidate): number => {
  // 先把 id 气味的候选往后排 —— 见 `looksLikeId`
  const leftId = looksLikeId(left)
  const rightId = looksLikeId(right)
  if (leftId !== rightId) return leftId ? 1 : -1

  const leftScore = left.separatedPairs * right.totalPairs
  const rightScore = right.separatedPairs * left.totalPairs
  if (leftScore !== rightScore) return rightScore - leftScore
  if (left.depth !== right.depth) return left.depth - right.depth
  if (left.values.length !== right.values.length) return right.values.length - left.values.length
  return left.path < right.path ? -1 : left.path > right.path ? 1 : 0
}

/**
 * PRD 5.1：找出判别式候选。四条判据（缺一条就不是判别式）：
 *
 * 1. **值是字面量**（string / number / boolean）。`null` 与对象不算 —— 写不进 `Extract<…>` 的模式。
 * 2. **取值有限**：2 ≤ 不同取值数 ≤ `maxValues`。只有 1 个取值谈不上判别，
 *    上百个取值那是 id。
 * 3. **在容器的每个实例上都有**（`literals === instances`）。缺键的字段做判别式会让一部分
 *    样本落不进任何分组，那种「剩下的都归 default」的联合下游没法用。
 * 4. **不同取值对应的其余键集合不同**（`analyseGroups`）。这条是核心：光「取值有限」不够 ——
 *    `type: 1 | 2` 但两种取值下键集合一样的字段是普通字面量联合，切成判别联合只是白多一堆文件。
 *
 * 候选**带路径**（硬约束 2：判别式可能在深层嵌套，B站动态那个在 `data.item.type`，第三层），
 * 所以这里扫的是每一个对象位置，不是只看根。
 */
export const findDiscriminants = (samples: readonly JsonValue[], options: FindDiscriminantsOptions = {}): DiscriminantCandidate[] => {
  const maxValues = Math.min(options.maxValues ?? DEFAULT_MAX_DISCRIMINANT_VALUES, MAX_GROUPS)
  const keyPathDepth = options.keyPathDepth ?? DEFAULT_KEY_PATH_DEPTH
  const containers = scanContainers(samples, maxValues)

  // 先按前三条判据筛一遍，只有活下来的容器才值得再走一趟收「其余键集合」
  const wanted = new Map<string, string[]>()
  for (const [path, stats] of containers) {
    const keys = [...stats.fields.keys()].sort().filter((key) => {
      const field = stats.fields.get(key)!
      return field.values !== undefined && field.values.size >= 2 && field.literals === stats.instances
    })
    if (keys.length > 0) wanted.set(path, keys)
  }
  if (wanted.size === 0) return []

  // 第二遍：只在候选容器上算键路径，按判别字段的取值分桶累加
  const evidence = new Map<string, { containerPath: string; key: string; byValue: Map<LiteralValue, GroupEvidence> }>()
  for (const sample of samples) {
    walkObjects(sample, '', (path, object) => {
      const keys = wanted.get(path)
      if (!keys) return
      const keyPaths = new Set<string>()
      collectKeyPaths(object, '', keyPathDepth, keyPaths)
      for (const key of keys) {
        const value = object[key]
        if (value === undefined || !isLiteral(value)) continue
        // 键名里可能有任何字符，所以不拿分隔符拼复合 key，用 JSON 编码这两截
        const candidateKey = JSON.stringify([path, key])
        let entry = evidence.get(candidateKey)
        if (!entry) {
          entry = { containerPath: path, key, byValue: new Map() }
          evidence.set(candidateKey, entry)
        }
        let group = entry.byValue.get(value)
        if (!group) {
          group = { instances: 0, presence: new Map() }
          entry.byValue.set(value, group)
        }
        group.instances += 1
        for (const keyPath of keyPaths) {
          // 判别字段自己不算「其余键」—— 它在每组里都必需，算进去只会给每对都加一条假证据
          if (keyPath === key) continue
          group.presence.set(keyPath, (group.presence.get(keyPath) ?? 0) + 1)
        }
      }
    })
  }

  const candidates: DiscriminantCandidate[] = []
  for (const { containerPath, key, byValue } of evidence.values()) {
    const values = sortLiterals(byValue.keys())
    const groups = values.map((value) => byValue.get(value)!)
    const analysis = analyseGroups(groups)
    // 判据 4：一对都没分开就不是判别式，是普通字面量联合
    if (analysis.separatedPairs === 0) continue
    const path = childPath(containerPath, key)
    candidates.push({
      path,
      containerPath,
      key,
      instances: groups.reduce((total, group) => total + group.instances, 0),
      values: values.map((value, index) => ({
        value,
        instances: groups[index]!.instances,
        distinctiveKeys: analysis.distinctiveKeys[index]!
      })),
      separatedPairs: analysis.separatedPairs,
      totalPairs: analysis.totalPairs,
      insideArray: path.includes('[]'),
      depth: pathDepth(path)
    })
  }
  return candidates.sort(compareCandidates)
}

/**
 * 挑一个能用的判别式：排序第一、且路径里不含 `[]` 的那个。
 * 含 `[]` 的候选划不了「样本」（一份样本在数组路径上有多个取值），见 `insideArray`。
 */
export const pickDiscriminant = (candidates: readonly DiscriminantCandidate[]): DiscriminantCandidate | undefined =>
  candidates.find((candidate) => !candidate.insideArray)

/** 报告用的一句话 */
export const describeDiscriminant = (candidate: DiscriminantCandidate): string =>
  `${candidate.path}：${candidate.values.length} 个取值、${candidate.instances} 个实例，` +
  `分离度 ${candidate.separatedPairs}/${candidate.totalPairs}（其余键集合分开的取值对数）`

/** 顺着路径读一个字面量。读不到（缺键 / 中途不是对象 / 值不是字面量）就是 `undefined` */
export const readLiteralAtPath = (sample: JsonValue, path: string): LiteralValue | undefined => {
  let current: JsonValue = sample
  for (const segment of path.split('.')) {
    if (!isObject(current)) return undefined
    const next = current[segment]
    if (next === undefined) return undefined
    current = next
  }
  return isLiteral(current) ? current : undefined
}

/** 一个判别式取值下的样本 */
export interface SampleGroup {
  value: LiteralValue
  /** 组内样本（引用原数组里的元素，不拷贝） */
  samples: JsonValue[]
  /** 这些样本在入参数组里的下标，升序 —— 报告与确定性都要用 */
  indexes: number[]
}

export interface GroupSamplesResult {
  /** 按 `sortLiterals` 排序，顺序与样本顺序无关（确定性） */
  groups: SampleGroup[]
  /** 判别路径上读不到字面量的样本下标 —— 这些样本进不了任何分组，必须报出来而不是静默丢掉 */
  unmatched: number[]
}

/**
 * 按判别式取值把样本分组。分完每组照样原样丢给 `mergeSamples` —— 合并器一行不改。
 *
 * 含 `[]` 的路径直接抛：一份样本在数组路径上有多个取值，划不到某一组去。
 * 调用方应该先看 `DiscriminantCandidate.insideArray` 决定要不要用这个候选。
 */
export const groupSamplesByDiscriminant = (samples: readonly JsonValue[], path: string): GroupSamplesResult => {
  if (path.includes('[]')) {
    throw new Error(`判别式路径 ${path} 含数组段：一份样本在这条路径上有多个取值，不能用来给样本分组`)
  }
  const byValue = new Map<LiteralValue, SampleGroup>()
  const unmatched: number[] = []
  samples.forEach((sample, index) => {
    const value = readLiteralAtPath(sample, path)
    if (value === undefined) {
      unmatched.push(index)
      return
    }
    let group = byValue.get(value)
    if (!group) {
      group = { value, samples: [], indexes: [] }
      byValue.set(value, group)
    }
    group.samples.push(sample)
    group.indexes.push(index)
  })
  return { groups: sortLiterals(byValue.keys()).map((value) => byValue.get(value)!), unmatched }
}

/** 一个形状簇 —— 一个簇产一个 `_V<n>` 文件 */
export interface ShapeCluster {
  /** 簇内样本（引用，不拷贝） */
  samples: JsonValue[]
  /** 在传进 `splitShapes` 的数组里的下标，升序 */
  indexes: number[]
  /** 让这个簇与其它簇互斥的必需键（相对根的深层键路径，最多 6 条）—— 分裂的证据本体 */
  exclusiveKeys: string[]
}

/** 一处「本来会分裂、但按抓包漂移合并掉了」的记录（PRD 1.3 那两个 `_V1` 就是这种） */
export interface DriftRecord {
  /** 互斥的键：`keys[0]` 只在一侧出现，`keys[1]` 只在另一侧 */
  keys: [string, string]
  /** 两侧各有几份样本（升序）—— 至少一侧 < `minShapeWitnesses` 才会落到这里 */
  sizes: [number, number]
}

export interface ShapeSplit {
  /** 至少一个簇。绝大多数情况就一个 —— 那就是只产 `_V0` */
  clusters: ShapeCluster[]
  /** 被 `minShapeWitnesses` 拦下的分裂，按漂移合并掉了 */
  drift: DriftRecord[]
  /** 有字面量字段能解释这个分裂 —— 那是**次级判别式**，该开子目录而不是 `_V+1` */
  nested: DiscriminantCandidate[]
}

export interface SplitShapesOptions extends FindDiscriminantsOptions {
  /** 见 `DEFAULT_MIN_SHAPE_WITNESSES` */
  minShapeWitnesses?: number
  /** 一个判别式取值下最多切几个形状，兜底防炸。默认 8 */
  maxShapes?: number
}

/** 一个候选二分 */
interface Partition {
  left: number[]
  right: number[]
  /** 只在左侧出现的键（排序） */
  leftKeys: string[]
  /** 只在右侧出现的键（排序） */
  rightKeys: string[]
}

/**
 * 找出「严格互补的必需键对」定义的二分。
 *
 * 严格互补 = 存在键 K 与 K′，每份样本**恰好**有其中一个：K 在左侧每份样本上都有、右侧一份都没有，
 * K′ 反过来。这正是合并器合不掉的那种差异 —— 强行合会得到 `K?:` 加 `K′?:`，
 * 那个类型允许「两个都有」和「两个都没有」，而这两种情况一份样本都没见过，是个会骗人的类型。
 * 单向的（K 在左边必需、右边可选）不算：合成 `K?:` 就够，不值得多开一个文件。
 */
const findPartitions = (samples: readonly JsonValue[], keyPathDepth: number): Partition[] => {
  const count = samples.length
  const present = new Map<string, number[]>()
  samples.forEach((sample, index) => {
    const keys = new Set<string>()
    collectKeyPaths(sample, '', keyPathDepth, keys)
    for (const key of keys) {
      const list = present.get(key)
      if (list) list.push(index)
      else present.set(key, [index])
    }
  })
  /** 出现集合的签名 → 有这个出现集合的键 */
  const bySignature = new Map<string, string[]>()
  for (const [key, indexes] of present) {
    // 每份样本都有的键区分不了任何东西
    if (indexes.length === count) continue
    const signature = indexes.join(',')
    const keys = bySignature.get(signature)
    if (keys) keys.push(key)
    else bySignature.set(signature, [key])
  }
  const partitions = new Map<string, Partition>()
  for (const [signature, keys] of bySignature) {
    const indexes = signature.split(',').map(Number)
    const inLeft = new Set(indexes)
    const complement: number[] = []
    for (let index = 0; index < count; index += 1) if (!inLeft.has(index)) complement.push(index)
    const complementSignature = complement.join(',')
    const others = bySignature.get(complementSignature)
    if (!others) continue
    const id = signature < complementSignature ? `${signature}/${complementSignature}` : `${complementSignature}/${signature}`
    if (partitions.has(id)) continue
    partitions.set(id, {
      left: indexes,
      right: complement,
      leftKeys: [...keys].sort(),
      rightKeys: [...others].sort()
    })
  }
  // 作证键多的优先；一样多就按键名字典序 —— 两条都与样本顺序无关（确定性）
  return [...partitions.values()].sort((left, right) => {
    const leftCount = left.leftKeys.length + left.rightKeys.length
    const rightCount = right.leftKeys.length + right.rightKeys.length
    if (leftCount !== rightCount) return rightCount - leftCount
    const leftKeys = [...left.leftKeys, ...left.rightKeys].sort().join(',')
    const rightKeys = [...right.leftKeys, ...right.rightKeys].sort().join(',')
    return leftKeys < rightKeys ? -1 : leftKeys > rightKeys ? 1 : 0
  })
}

/** 一批下标集合的规范签名 —— 两个分区能不能算「同一个划分」就比这个 */
const partitionSignature = (parts: readonly (readonly number[])[]): string =>
  parts
    .map((part) => [...part].sort((left, right) => left - right).join(','))
    .sort()
    .join('/')

/** 一个判别式候选把这批样本划成什么样（同取值一组）。读不到取值的样本单独成组 */
const inducedPartition = (samples: readonly JsonValue[], indexes: readonly number[], path: string): string => {
  const byValue = new Map<LiteralValue | undefined, number[]>()
  for (const index of indexes) {
    const value = readLiteralAtPath(samples[index]!, path)
    const list = byValue.get(value)
    if (list) list.push(index)
    else byValue.set(value, [index])
  }
  return partitionSignature([...byValue.values()])
}

/**
 * 下标簇 → `ShapeCluster`，顺带算出每个簇的独占键。
 *
 * 排序：样本多的在前（`_V0` 是**主形状**，不是「先撞见的那个」），
 * 再按独占键字典序兜底 —— 两条都与样本顺序无关，产物才能进 git 跑 `--check`。
 */
const buildClusters = (samples: readonly JsonValue[], clusters: readonly number[][]): ShapeCluster[] => {
  const evidence = clusters.map((indexes): GroupEvidence => {
    const presence = new Map<string, number>()
    for (const index of indexes) {
      const keys = new Set<string>()
      collectKeyPaths(samples[index]!, '', DEFAULT_KEY_PATH_DEPTH, keys)
      for (const key of keys) presence.set(key, (presence.get(key) ?? 0) + 1)
    }
    return { instances: indexes.length, presence }
  })
  const { distinctiveKeys } = analyseGroups(evidence)
  return clusters
    .map((indexes, index) => ({
      samples: indexes.map((sampleIndex) => samples[sampleIndex]!),
      indexes: [...indexes],
      exclusiveKeys: distinctiveKeys[index]!
    }))
    .sort((left, right) => {
      if (left.samples.length !== right.samples.length) return right.samples.length - left.samples.length
      const leftKeys = left.exclusiveKeys.join(',')
      const rightKeys = right.exclusiveKeys.join(',')
      return leftKeys < rightKeys ? -1 : leftKeys > rightKeys ? 1 : 0
    })
}

/** 一个判别式取值下最多切几个形状 */
const DEFAULT_MAX_SHAPES = 8

/**
 * PRD 5.1 的 `_V<n>`：**同一判别式取值下的形状序号，不是 API 版本号**。
 *
 * 加一的判据（三条全中才 +1，缺一条就合并成一个 `_V0`）：
 *
 * 1. **严格互补的必需键**：存在键 K 与 K′，一侧每份样本都有 K、一份都没有 K′，另一侧反过来
 *    （见 `findPartitions`）。合并器合不掉这种差异 —— 合出来的 `K?:` + `K′?:` 允许
 *    「都有」和「都没有」，而这两种情况一份样本都没见过。
 * 2. **两侧各被 ≥ `minShapeWitnesses`（默认 2）份样本证明过**。只出现过一次的差异一律当
 *    抓包漂移合并掉：PRD 1.3 实测现存那两个 `_V1` 的每一条差异都只出现过一次，
 *    它们本来就该被合并。这条是「绝大多数取值只产 `_V0`」的执行者。
 * 3. **没有字面量字段能解释这个划分**。能解释就说明那是一个**次级判别式**，按现存目录约定
 *    该开子目录（`<外层取值>/<内层取值>/…`，如 `DYNAMIC_TYPE_FORWARD/Forward/DYNAMIC_TYPE_AV/`），
 *    不是 `_V+1`。这种情况记进 `nested` 报出来，本轮不产子目录。
 *
 * 切完再对每一侧递归（3 个及以上形状就是这么来的），簇数上限 `maxShapes`。
 */
export const splitShapes = (samples: readonly JsonValue[], options: SplitShapesOptions = {}): ShapeSplit => {
  const minWitnesses = options.minShapeWitnesses ?? DEFAULT_MIN_SHAPE_WITNESSES
  const maxShapes = Math.min(options.maxShapes ?? DEFAULT_MAX_SHAPES, MAX_GROUPS)
  const keyPathDepth = options.keyPathDepth ?? DEFAULT_KEY_PATH_DEPTH
  const drift: DriftRecord[] = []
  const nested: DiscriminantCandidate[] = []
  // 判据 3 用的次级判别式：整组算一次，各个分裂候选拿它比对
  const inner = findDiscriminants(samples, options).filter((candidate) => !candidate.insideArray)

  const finished: number[][] = []
  const pending: number[][] = [samples.map((_, index) => index)]
  while (pending.length > 0) {
    const current = pending.shift()!
    // 簇数到顶就不再试着切（兜底防炸）。注意**不能**按「样本太少」提前退出：
    // 2 份样本那种恰恰要走完流程，才能把「本来会分裂、按漂移合并掉了」记进 drift
    if (finished.length + pending.length + 1 >= maxShapes) {
      finished.push(current)
      continue
    }
    let chosen: Partition | undefined
    for (const partition of findPartitions(
      current.map((index) => samples[index]!),
      keyPathDepth
    )) {
      const left = partition.left.map((index) => current[index]!)
      const right = partition.right.map((index) => current[index]!)
      const sizes: [number, number] = left.length <= right.length ? [left.length, right.length] : [right.length, left.length]
      // 判据 2：只出现过一次的差异按漂移合并
      if (sizes[0] < minWitnesses) {
        drift.push({ keys: [partition.leftKeys[0]!, partition.rightKeys[0]!], sizes })
        continue
      }
      // 判据 3：有字面量字段解释得了这个划分 → 次级判别式，该开子目录
      const signature = partitionSignature([left, right])
      const explained = inner.find((candidate) => inducedPartition(samples, current, candidate.path) === signature)
      if (explained) {
        if (!nested.includes(explained)) nested.push(explained)
        continue
      }
      chosen = { left, right, leftKeys: partition.leftKeys, rightKeys: partition.rightKeys }
      break
    }
    if (!chosen) {
      finished.push(current)
      continue
    }
    pending.push(chosen.left, chosen.right)
  }

  return { clusters: buildClusters(samples, finished), drift, nested }
}

/** 覆盖率报告里的一个取值 */
export interface DiscriminantValueCoverage {
  value: LiteralValue
  /** 这个取值下有多少份样本 */
  samples: number
  /**
   * 占比，四位小数。**只进报告不进产物**：产物里写样本数会让「多录一份样本」
   * 这件事把每个文件的文件头都改一遍，`--check` 的 diff 全是噪音。
   */
  share: number
  /** 这个取值下产了几个形状（`_V0` 到 `_V{shapes-1}`） */
  shapes: number
}

export interface DiscriminantCoverage {
  /** 判别式路径 */
  path: string
  /** 喂进来多少份样本 */
  sampleCount: number
  /** 按 `sortLiterals` 排序 */
  values: DiscriminantValueCoverage[]
  /**
   * **声明了却从未出现**的成员。PRD 六那句「MajorType 已声明 17 种、实测出现 9 种」
   * 就是这条 —— 手写枚举与 corpus 的漂移，只有把清单接进来才看得见。
   * 没传 `declaredValues` 时恒为空数组。
   */
  declaredMissing: LiteralValue[]
  /** 样本里出现了、声明里没有的取值。反向漂移，同样要人看一眼 */
  undeclared: LiteralValue[]
  /** 判别路径上读不到字面量的样本下标 —— 这些样本没进任何分组 */
  unmatched: number[]
  /** 可直接打印的中文摘要，一行一条 */
  lines: string[]
}

export interface BuildCoverageInput {
  path: string
  sampleCount: number
  groups: readonly SampleGroup[]
  unmatched?: readonly number[]
  /** 取值 → 形状数。不传就按每个取值 1 个形状算 */
  shapesByValue?: ReadonlyMap<LiteralValue, number>
  /** 已声明的枚举成员清单（可选参数：不传就只报出现过的） */
  declaredValues?: readonly LiteralValue[]
}

/** 覆盖率报告：每个取值的样本数与占比，外加与「已声明清单」的双向比对 */
export const buildCoverage = (input: BuildCoverageInput): DiscriminantCoverage => {
  const { path, sampleCount, groups } = input
  const unmatched = [...(input.unmatched ?? [])]
  const seen = new Set<LiteralValue>(groups.map((group) => group.value))
  const declared = input.declaredValues === undefined ? undefined : sortLiterals(input.declaredValues)
  const values = groups.map(
    (group): DiscriminantValueCoverage => ({
      value: group.value,
      samples: group.samples.length,
      share: sampleCount === 0 ? 0 : Math.round((group.samples.length / sampleCount) * 10000) / 10000,
      shapes: input.shapesByValue?.get(group.value) ?? 1
    })
  )
  const declaredMissing = declared?.filter((value) => !seen.has(value)) ?? []
  const undeclared = declared === undefined ? [] : sortLiterals(seen).filter((value) => !declared.includes(value))
  const lines = [`判别式 ${path}：${groups.length} 个取值 / ${sampleCount} 份样本`]
  for (const value of values) {
    lines.push(`  ${JSON.stringify(value.value)} ${value.samples} 份（${(value.share * 100).toFixed(2)}%），${value.shapes} 个形状`)
  }
  if (declared !== undefined) {
    lines.push(
      declaredMissing.length === 0
        ? `  已声明的 ${declared.length} 个成员全部出现过`
        : `  声明了却从未出现（${declaredMissing.length}/${declared.length}）：${declaredMissing.map((value) => String(value)).join('、')} —— 要么补样本，要么这些成员该删`
    )
    if (undeclared.length > 0) {
      lines.push(`  样本里出现但没声明（${undeclared.length}）：${undeclared.map((value) => String(value)).join('、')}`)
    }
  }
  if (unmatched.length > 0) {
    lines.push(`  ${unmatched.length} 份样本在 ${path} 上读不到字面量（下标 ${unmatched.join(', ')}），没进任何分组`)
  }
  return { path, sampleCount, values, declaredMissing, undeclared, unmatched, lines }
}
