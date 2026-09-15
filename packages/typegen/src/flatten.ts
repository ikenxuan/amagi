/**
 * 把「一份类型源码」摊平成「路径 → 类型」，用来做**生成 vs 手写**的逐字段比对
 * （PRD 阶段 0 的决策依据，也是阶段 4 每个端点迁移前要过的那张清单）。
 *
 * 为什么按路径摊平而不是按类型名比：两边的类型名根本对不上。手写那份是 quicktype 产的，
 * 顶层叫 `WorkComments_V0`、子类型叫 `Reply` / `Member` / `PurpleDesc`；生成那份叫
 * `Comments_V0` / `Data` / `Reply`。按名字比会得出「几十个类型只在一边」这种废话。
 * 而**路径是结构性的** —— `data.replies[].member.uname` 在两边都是同一个位置，
 * 名字怎么起都不影响。
 *
 * 只认这两个生成器的输出格式（每个属性一行、两格缩进、类型表达式在冒号后面），
 * 不做通用 TS 解析。手写那批本来就是 quicktype 产的，格式与我们的产物同源。
 */

import { readGeneratedProps } from './breaking'
import { childPath, elementPath } from './options'

/** 摊平后的一个位置 */
export interface FlatField {
  /** 路径，约定同 `options.ts`（跨数组用 `[]`） */
  path: string
  /** 渲染出来的类型表达式，原样保留 —— 只用来给人看 */
  type: string
  /**
   * 比对用的类型：**指向子类型的引用一律换成 `↦`**。
   *
   * 不这么做的话，「`Data` vs `DataData`」「`Reply[]` vs `DataReply[]`」
   * 「`Member` vs `PurpleMember`」会全部被报成类型不同 —— 而它们只是名字不同，
   * 那些子类型的内容会各自继续摊开、逐字段比。实测这一条把 77 条「类型不同」
   * 里的绝大多数消掉了，剩下的才是真差异。
   */
  shape: string
  optional: boolean
}

export interface FlattenResult {
  /** 路径 → 字段。按路径排序 */
  fields: Map<string, FlatField>
  /** 因为类型自引用而停下的路径（`Reply.replies: Reply[]` 这种），只报不展开 */
  recursive: string[]
}

/** 摊平时最多下钻这么深。防的是互相引用绕出来的长链，不是正常嵌套（实测最深 8 层） */
const MAX_DEPTH = 24

/** 拆顶层联合成员。括号里的（`(A | B)[]`）不拆 */
const unionMembers = (type: string): string[] => {
  const members: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < type.length; index += 1) {
    const char = type[index]!
    if (char === '(' || char === '{' || char === '[') depth += 1
    else if (char === ')' || char === '}' || char === ']') depth -= 1
    else if (char === '|' && depth === 0) {
      members.push(type.slice(start, index).trim())
      start = index + 1
    }
  }
  members.push(type.slice(start).trim())
  return members.filter(Boolean)
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

/** 引用标记。比对时所有指向子类型的引用都变成它 —— 名字不参与比对，内容各自摊开逐字段比 */
const REFERENCE = '↦'

/** 把类型表达式里指向子类型的引用换成 {@link REFERENCE}，并抹掉索引签名的形参名 */
const normalizeType = (type: string, types: ReadonlyMap<string, unknown>): string =>
  type
    // `{ [property: string]: any }` 与 `{ [key: string]: any }` 是同一件事，形参名只是风格差异
    .replace(/\[\s*[A-Za-z_$][\w$]*\s*:\s*string\s*\]/g, '[k: string]')
    .replace(/[A-Za-z_$][\w$]*/g, (word) => (types.has(word) ? REFERENCE : word))

/**
 * 摊平一份类型源码。
 *
 * @param source 类型源码（生成产物或 quicktype 产的手写类型）
 * @param rootName 根类型名。不给就取第一个 `export type`
 */
export const flattenTypeSource = (source: string, rootName?: string): FlattenResult => {
  const types = readGeneratedProps(source)
  const root = rootName ?? [...types.keys()][0]
  const fields = new Map<string, FlatField>()
  const recursive: string[] = []
  if (root === undefined || !types.has(root)) return { fields, recursive }

  /**
   * `visiting` 是**当前这条路径上**的类型名，不是全局访问过的集合 ——
   * 同一个类型在两个不同位置出现时两边都要摊开（那是两个不同的字段），
   * 只有它出现在自己的祖先链上才是自引用。
   */
  const walk = (typeName: string, path: string, depth: number, visiting: readonly string[]): void => {
    if (depth > MAX_DEPTH) return
    const props = types.get(typeName)
    if (props === undefined) return
    for (const [name, prop] of props) {
      const propPath = childPath(path, name)
      // 元素类型：`Reply[]` / `(A | B)[]` 都摊到 `xxx[]` 这一层
      const arrayMatch = /^\(?(.+?)\)?\[\]$/.exec(prop.type)
      const inner = arrayMatch === null ? prop.type : arrayMatch[1]!
      const targetPath = arrayMatch === null ? propPath : elementPath(propPath)
      const referenced = unionMembers(inner).filter((member) => IDENTIFIER.test(member) && types.has(member))
      fields.set(propPath, {
        path: propPath,
        type: prop.type,
        shape: normalizeType(prop.type, types),
        optional: prop.optional
      })
      for (const target of referenced) {
        if (visiting.includes(target)) {
          recursive.push(targetPath)
          continue
        }
        walk(target, targetPath, depth + 1, [...visiting, target])
      }
    }
  }

  walk(root, '', 0, [root])
  return {
    fields: new Map([...fields.entries()].sort(([left], [right]) => (left < right ? -1 : 1))),
    recursive: [...new Set(recursive)].sort()
  }
}

/** 一处差异 */
export interface FieldDiff {
  path: string
  kind:
    | /** 只有生成的有 —— 手写类型漏了这个字段（平台返回了但没人建模） */ 'only-generated'
    | /** 只有手写的有 —— 要么这一轮样本没覆盖到，要么平台已经删了 */ 'only-handwritten'
    | /** 两边都有但类型不一样 */ 'type'
    | /** 两边都有但可选性不一样 */ 'optionality'
  generated?: string
  handwritten?: string
}

export interface FieldDiffResult {
  diffs: FieldDiff[]
  /** 两边一致的字段数 —— 差异清单的分母，不给分母没法判断「差异小到可接受」 */
  same: number
  /** 各类差异的条数，给一眼看的结论 */
  counts: Record<FieldDiff['kind'], number>
}

/**
 * 比两份摊平结果。
 *
 * **方向是有意的**：`generated` 在前，因为这张清单要回答的问题是
 * 「能不能拿生成的替掉手写的」。`only-handwritten` 是需要人决策的那一类
 * （样本没覆盖到？还是平台真删了？），`only-generated` 反而是好事 ——
 * 它说明手写类型漏了字段，而那正是这套方案要解决的问题。
 */
export const diffFlattened = (generated: FlattenResult, handwritten: FlattenResult): FieldDiffResult => {
  const diffs: FieldDiff[] = []
  let same = 0
  const paths = [...new Set([...generated.fields.keys(), ...handwritten.fields.keys()])].sort()
  for (const path of paths) {
    const left = generated.fields.get(path)
    const right = handwritten.fields.get(path)
    if (left === undefined) {
      diffs.push({ path, kind: 'only-handwritten', handwritten: right!.type })
      continue
    }
    if (right === undefined) {
      diffs.push({ path, kind: 'only-generated', generated: left.type })
      continue
    }
    // 比 `shape` 而不是 `type`：只有名字不同不算差异（见 `FlatField.shape`）
    if (left.shape !== right.shape) {
      diffs.push({ path, kind: 'type', generated: left.type, handwritten: right.type })
      continue
    }
    if (left.optional !== right.optional) {
      diffs.push({
        path,
        kind: 'optionality',
        generated: left.optional ? '可选' : '必需',
        handwritten: right.optional ? '可选' : '必需'
      })
      continue
    }
    same += 1
  }
  const counts: Record<FieldDiff['kind'], number> = { 'only-generated': 0, 'only-handwritten': 0, type: 0, optionality: 0 }
  for (const diff of diffs) counts[diff.kind] += 1
  return { diffs, same, counts }
}
