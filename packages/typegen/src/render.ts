/**
 * 形状树 → TypeScript 源码字符串。
 *
 * 中间多了一层 IR（下面的 `TypeNode`）而不是直接从 `Shape` 拼字符串，理由是 5.2 的
 * 「结构等价复用」：判等必须按**渲染后的形状**判，不能按证据计数判 —— 两个位置一个见了
 * 3 次、一个见了 17 次，只要渲染出来的类型一样就该共用一个类型名。`Shape` 里带着计数，
 * 天生判不了这个等；把它先降成「已经拍板的类型形状」再判，等价关系才是对的。
 *
 * `TypeNode` 是实现细节，不对外导出：对外的形状树就是 `Shape`。
 */

import { PRIMITIVE_ORDER, type RenderOptions, renderLiteral, resolveRenderOptions, sortLiterals } from './options'
import type { LiteralValue, PrimitiveName, Shape } from './types'

/**
 * 硬约束 1（PRD 5.3）：**每一层都带索引签名**。
 * `packages/core/test/types/response-types.test-d.ts` 用它承诺「平台加字段不算 breaking、
 * 读未声明字段不报错」。生成器输出「干净」的封闭类型的那一刻，这条承诺就破了。
 * 代价是它会削弱判别式收窄 —— 这个矛盾的解法是另外产 `is*` 守卫，不是删索引签名。
 */
export const INDEX_SIGNATURE = '[property: string]: any'

interface PropNode {
  name: string
  optional: boolean
  type: TypeNode
}

interface ObjectNode {
  kind: 'object'
  props: PropNode[]
}

type TypeNode =
  | { kind: 'unknown' }
  | { kind: 'null' }
  | { kind: 'primitive'; name: PrimitiveName }
  | { kind: 'literal'; value: LiteralValue }
  | { kind: 'array'; element: TypeNode }
  | ObjectNode
  | { kind: 'union'; members: TypeNode[] }

/** 形状树 → IR。所有类型决策（可选性、联合、放宽/收窄、unknown）都在这个函数里 */
const lower = (shape: Shape): TypeNode => {
  // 一次都没见过值 —— 只可能是「所有样本里这个数组都是空的」，元素类型给不出来
  if (shape.seen === 0) return { kind: 'unknown' }

  const members: TypeNode[] = []
  if (shape.object) {
    const object = shape.object
    // 键按字典序：产物要提交进 git 跑 --check，顺序不能跟着样本顺序变
    const props = [...object.props.keys()].sort().map((name): PropNode => {
      const child = object.props.get(name)!
      // 「部分样本才有」= 可选。注意这跟 `| null` 是两个独立维度：
      // 一个键可以既可选又可为 null（`a?: number | null`），也可以必需但恒为 null
      return { name, optional: child.seen < object.seen, type: lower(child) }
    })
    members.push({ kind: 'object', props })
  }
  if (shape.array) members.push({ kind: 'array', element: lower(shape.array.element) })
  for (const name of PRIMITIVE_ORDER) {
    const primitive = shape.primitives.get(name)
    if (!primitive) continue
    // 默认放宽成基础类型，只有白名单命中的位置才收窄成字面量联合
    if (shape.narrowLiterals && primitive.literals && primitive.literals.size > 0) {
      for (const value of sortLiterals(primitive.literals)) members.push({ kind: 'literal', value })
    } else {
      members.push({ kind: 'primitive', name })
    }
  }
  // null 排在最后，跟仓库现存手写类型的写法一致（`topic: Topic | null`）
  if (shape.nulls > 0) members.push({ kind: 'null' })

  if (members.length === 0) return { kind: 'unknown' }
  return members.length === 1 ? members[0]! : { kind: 'union', members }
}

const keyCache = new WeakMap<object, string>()

/** IR 的规范化序列化 —— 5.2 的「结构等价」判据就是这个字符串相等 */
const keyOf = (node: TypeNode): string => {
  const cached = keyCache.get(node)
  if (cached !== undefined) return cached
  let key: string
  switch (node.kind) {
    case 'unknown':
      key = 'u'
      break
    case 'null':
      key = 'n'
      break
    case 'primitive':
      key = `p:${node.name}`
      break
    case 'literal':
      key = `l:${typeof node.value}:${JSON.stringify(node.value)}`
      break
    case 'array':
      key = `a[${keyOf(node.element)}]`
      break
    case 'union':
      key = `U(${node.members.map(keyOf).join('|')})`
      break
    case 'object':
      key = `o{${node.props.map((p) => `${JSON.stringify(p.name)}${p.optional ? '?' : ''}:${keyOf(p.type)}`).join(',')}}`
      break
  }
  keyCache.set(node, key)
  return key
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/** 键名不是合法标识符就加引号 —— B站真有 `background-color` 这种键 */
const propKey = (name: string): string => (IDENTIFIER.test(name) ? name : `'${name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`)

/** `module_author` → `ModuleAuthor`。非法字符当分隔符，数字开头补前缀保证是合法标识符 */
const pascalCase = (raw: string): string => {
  const name = raw
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('')
  if (name === '') return 'Anonymous'
  return /^[A-Za-z_$]/.test(name) ? name : `T${name}`
}

/**
 * 数组元素的类型名取单数：`layers` → `Layer`、`rich_text_nodes` → `RichTextNode`
 * （跟现存手写类型的命名对得上，阶段 0 逐字段比对时好 diff）。
 * 规则故意做得很浅：它只影响类型名好不好看，猜错了不影响类型正确性。
 */
const singularize = (raw: string): string => {
  if (/ies$/i.test(raw)) return raw.replace(/ies$/i, 'y')
  if (/(?:s|x|z|ch|sh)es$/i.test(raw)) return raw.replace(/es$/i, '')
  if (/[^s]s$/i.test(raw)) return raw.slice(0, -1)
  return raw
}

export interface RenderResult {
  /** 完整的 TypeScript 源码：文件头 + 类型声明，末尾带换行 */
  source: string
  /** 根类型名 */
  rootName: string
  /** 产出的所有类型名，`[0]` 是根 */
  typeNames: string[]
}

/** 形状树 → TypeScript 源码。纯函数，同一棵树永远渲染出同一份字节 */
export const renderShape = (shape: Shape, options: RenderOptions = {}): RenderResult => {
  const { rootName, banner, exportSubtypes } = resolveRenderOptions(options)
  const declarations: { name: string; body: string }[] = []
  /** 结构等价 key → 已经用过的类型名。5.2 的复用就靠这张表 */
  const nameByKey = new Map<string, string>()
  const used = new Set<string>()

  const uniqueName = (hint: string): string => {
    const base = pascalCase(hint)
    if (!used.has(base)) {
      used.add(base)
      return base
    }
    // 撞名只补数字后缀：遍历顺序是固定的，所以谁拿到 2 号也是固定的
    let suffix = 2
    while (used.has(`${base}${suffix}`)) suffix += 1
    used.add(`${base}${suffix}`)
    return `${base}${suffix}`
  }

  const objectBody = (node: ObjectNode): string => {
    const lines = node.props.map((prop) => `  ${propKey(prop.name)}${prop.optional ? '?' : ''}: ${typeExpr(prop.type, prop.name)}`)
    lines.push(`  ${INDEX_SIGNATURE}`)
    return `{\n${lines.join('\n')}\n}`
  }

  const objectExpr = (node: ObjectNode, hint: string): string => {
    // 空对象没有可命名的内容，直接内联。索引签名照样在（硬约束 1 是「每一层」）
    if (node.props.length === 0) return `{ ${INDEX_SIGNATURE} }`
    const key = keyOf(node)
    const reused = nameByKey.get(key)
    // 5.2：结构等价的子树复用已生成的类型，不重新展开
    if (reused !== undefined) return reused
    const declaration = { name: uniqueName(hint), body: '' }
    // 先登记名字、先入队，再填 body：所以声明顺序是「父在子前」的深度优先序
    // （和现存手写文件的顺序一致），而且万一真出现自引用也不会无限展开
    nameByKey.set(key, declaration.name)
    declarations.push(declaration)
    declaration.body = objectBody(node)
    return declaration.name
  }

  const typeExpr = (node: TypeNode, hint: string): string => {
    switch (node.kind) {
      case 'unknown':
        return 'unknown'
      case 'null':
        return 'null'
      case 'primitive':
        return node.name
      case 'literal':
        return renderLiteral(node.value)
      case 'array': {
        const element = typeExpr(node.element, singularize(hint))
        // 联合当元素必须括起来：`(A | B)[]` 而不是 `A | B[]`
        return node.element.kind === 'union' ? `(${element})[]` : `${element}[]`
      }
      case 'object':
        return objectExpr(node, hint)
      case 'union':
        return node.members.map((member) => typeExpr(member, hint)).join(' | ')
    }
  }

  // 根声明先占位，把根类型名占住 —— 否则根是对象时 objectExpr 会再要一次同名，
  // 拿到的是 `Xxx2`，根类型反而没了想要的名字。
  // 根名**原样保留**（只要它已经是合法标识符）：判别联合的成员根类型叫 `DynamicTypeAV_V0`，
  // 那个 `_V0` 不能被 pascalCase 当成分隔符吃掉（会变成 `DynamicTypeAVV0`）
  const rootBase = IDENTIFIER.test(rootName) ? rootName : pascalCase(rootName)
  used.add(rootBase)
  const root = { name: rootBase, body: '' }
  declarations.push(root)
  const rootNode = lower(shape)
  if (rootNode.kind === 'object' && rootNode.props.length > 0) {
    nameByKey.set(keyOf(rootNode), root.name)
    root.body = objectBody(rootNode)
  } else {
    root.body = typeExpr(rootNode, rootName)
  }

  const blocks = declarations.map(
    (declaration, index) => `${index === 0 || exportSubtypes ? 'export ' : ''}type ${declaration.name} = ${declaration.body}`
  )
  if (banner !== false) blocks.unshift(banner)
  return {
    source: `${blocks.join('\n\n')}\n`,
    rootName: root.name,
    typeNames: declarations.map((declaration) => declaration.name)
  }
}
