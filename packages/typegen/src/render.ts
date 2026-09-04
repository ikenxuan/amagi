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

import { createHash } from 'node:crypto'

import { collectShapePaths, type RenderDocIssue, renderJsDoc } from './docs'
import { childPath, elementPath, PRIMITIVE_ORDER, type RenderOptions, renderLiteral, resolveRenderOptions, sortLiterals } from './options'
import type { LiteralValue, PrimitiveName, Shape } from './types'

/** 定长指纹。见 `keyOf` 的注释 —— 用它而不是拼完整结构串是为了别在宽/深的响应上把内存吃穿 */
const digest = (text: string): string => createHash('sha1').update(text).digest('base64url')

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

/** 键是**数据**而不是字段名的对象（`iconUrls: { "[哦]": "…" }`）—— 收成索引签名，见 `asMapNode` */
interface MapNode {
  kind: 'map'
  /** 所有键共用的值类型 */
  value: TypeNode
  /** 收之前有多少个键。只进注释，不进类型 */
  keyCount: number
}

type TypeNode =
  | { kind: 'unknown' }
  | { kind: 'null' }
  | { kind: 'primitive'; name: PrimitiveName }
  | { kind: 'literal'; value: LiteralValue }
  | { kind: 'array'; element: TypeNode }
  | ObjectNode
  | MapNode
  | { kind: 'union'; members: TypeNode[] }

/** 少于这么多键就不当映射表看 —— 十来个字段的普通对象太常见了 */
export const MAP_MIN_KEYS = 12

/** 至少这么大比例的键不是合法标识符，才认定「键是数据」。见 `asMapNode` */
export const MAP_MIN_DATA_KEY_RATIO = 0.8

/**
 * 这个对象是不是「映射表」——键由数据决定（emoji 名、ID、语言代码、日期），不是字段名。
 *
 * 逐键展开这种对象只产噪音：实测快手 `emojiList` 的 `iconUrls` 有几百个键，
 * 生成器一个键一个属性，一个端点吃掉 665 行，而那些属性名全是数据、
 * 索引签名本来就覆盖了它们。
 *
 * 判据里**最要紧的是「键不像标识符」**，不是「值形状都一样」。只看后者会出大事：
 * 一个有十几个字符串字段的普通响应对象（`{ title, desc, cover, … }`）值形状也全一样，
 * 收掉它等于把真字段名全删了。所以代价不对称 —— 拿不准就保持原样，
 * 漏收一个映射表只是多几行，误收一个普通对象是删掉信息。
 */
const asMapNode = (props: readonly PropNode[]): MapNode | undefined => {
  if (props.length < MAP_MIN_KEYS) return undefined
  const dataKeys = props.filter((prop) => !IDENTIFIER.test(prop.name)).length
  if (dataKeys / props.length < MAP_MIN_DATA_KEY_RATIO) return undefined
  // 值形状必须完全一致，否则收成一个值类型就是在说谎
  const shapes = new Set(props.map((prop) => keyOf(prop.type)))
  if (shapes.size !== 1) return undefined
  return { kind: 'map', value: props[0]!.type, keyCount: props.length }
}

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
    members.push(asMapNode(props) ?? { kind: 'object', props })
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

/**
 * IR 的规范化指纹 —— 5.2 的「结构等价」判据就是这个字符串相等。
 *
 * **取的是哈希而不是拼出来的完整结构串**，这一点是实测逼出来的：拼串的话每个节点的 key
 * 长度是「它整棵子树的规模」，于是全树的 key 总字节数是 O(节点数 × 深度)。
 * B站弹幕端点返回的是 protobuf 二进制，序列化成 JSON 后是一个有 98,357 个数字键的对象，
 * 生成器在这上面直接把 4 GB 堆吃穿（`Ineffective mark-compacts near heap limit`）。
 * 换成「子节点指纹 + 自身信息再哈希一轮」之后，每个节点的 key 是定长的。
 *
 * 用 sha1 截断到 20 字节：结构等价只需要相等判定，128 位以上碰撞概率可以忽略，
 * 而它仍然是确定的（同一棵树永远同一个指纹，`--check` 要的就是这个）。
 */
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
      key = digest(`a[${keyOf(node.element)}]`)
      break
    case 'map':
      key = digest(`m{${keyOf(node.value)}}`)
      break
    case 'union':
      key = digest(`U(${node.members.map(keyOf).join('|')})`)
      break
    case 'object':
      key = digest(`o{${node.props.map((p) => `${JSON.stringify(p.name)}${p.optional ? '?' : ''}:${keyOf(p.type)}`).join(',')}}`)
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
  /** 注释 sidecar 里没能落到产物上的条目（孤立 / 冲突），见 `docs.ts` */
  docIssues: RenderDocIssue[]
}

/** 形状树 → TypeScript 源码。纯函数，同一棵树永远渲染出同一份字节 */
export const renderShape = (shape: Shape, options: RenderOptions = {}): RenderResult => {
  const { rootName, banner, exportSubtypes, docs } = resolveRenderOptions(options)
  const declarations: { name: string; body: string; doc?: string }[] = []
  /** 结构等价 key → 已经用过的类型名。5.2 的复用就靠这张表 */
  const nameByKey = new Map<string, string>()
  const used = new Set<string>()
  /** 已经挂过注释的位置：`父节点结构 key + 属性名` → 注释来源路径。用来认出共用类型上的注释冲突 */
  const docOwner = new Map<string, string>()
  /** 真正落到产物上（或与已落的那条完全相同）的注释路径 */
  const consumed = new Set<string>()
  /** 挂不上去的注释 → 那个位置留下的是谁的注释 */
  const lostTo = new Map<string, string>()
  const docIssues: RenderDocIssue[] = []

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

  /**
   * 这个属性该挂哪条注释。
   *
   * 作用域键用**父节点的结构等价 key**而不是类型名：结构等价的两棵子树共用一个类型，
   * 而它们的 key 天生相同，所以「同一个位置已经挂过注释了」这件事在两边都认得出来，
   * 不受声明名字的影响。
   */
  const docFor = (scope: string, path: string): string | undefined => {
    const text = docs[path]
    if (text === undefined) return undefined
    const owner = `${scope}|${path.slice(path.lastIndexOf('.') + 1)}`
    const previous = docOwner.get(owner)
    if (previous === undefined) {
      docOwner.set(owner, path)
      consumed.add(path)
      return text
    }
    if (previous === path) return text
    if (docs[previous] === text) {
      // 同一句话挂在共用类型上没有歧义，不算丢
      consumed.add(path)
      return undefined
    }
    lostTo.set(path, previous)
    return undefined
  }

  const objectBody = (node: ObjectNode, path: string): string => {
    const scope = keyOf(node)
    const lines = node.props.flatMap((prop) => {
      const propPath = childPath(path, prop.name)
      const doc = docFor(scope, propPath)
      const line = `  ${propKey(prop.name)}${prop.optional ? '?' : ''}: ${typeExpr(prop.type, prop.name, propPath)}`
      return doc === undefined ? [line] : [renderJsDoc(doc, '  '), line]
    })
    lines.push(`  ${INDEX_SIGNATURE}`)
    return `{\n${lines.join('\n')}\n}`
  }

  /**
   * 类型被复用时不再展开，但仍然沿路径走一遍认领注释。
   *
   * 不走这一遍的话，`b.x` 的注释会因为 `b` 的类型是从 `a` 那边复用的而**静默丢掉** ——
   * 而静默丢掉一条注释，下次生成时人会以为它还在。
   */
  const claimDocsOnly = (node: TypeNode, path: string): void => {
    switch (node.kind) {
      case 'object': {
        const scope = keyOf(node)
        for (const prop of node.props) {
          const propPath = childPath(path, prop.name)
          docFor(scope, propPath)
          claimDocsOnly(prop.type, propPath)
        }
        return
      }
      case 'array':
        claimDocsOnly(node.element, elementPath(path))
        return
      case 'map':
        claimDocsOnly(node.value, elementPath(path))
        return
      case 'union':
        for (const member of node.members) claimDocsOnly(member, path)
        return
      default:
        return
    }
  }

  const objectExpr = (node: ObjectNode, hint: string, path: string): string => {
    // 空对象没有可命名的内容，直接内联。索引签名照样在（硬约束 1 是「每一层」）
    if (node.props.length === 0) return `{ ${INDEX_SIGNATURE} }`
    const key = keyOf(node)
    const reused = nameByKey.get(key)
    // 5.2：结构等价的子树复用已生成的类型，不重新展开
    if (reused !== undefined) {
      claimDocsOnly(node, path)
      return reused
    }
    const declaration = { name: uniqueName(hint), body: '' }
    // 先登记名字、先入队，再填 body：所以声明顺序是「父在子前」的深度优先序
    // （和现存手写文件的顺序一致），而且万一真出现自引用也不会无限展开
    nameByKey.set(key, declaration.name)
    declarations.push(declaration)
    declaration.body = objectBody(node, path)
    return declaration.name
  }

  const typeExpr = (node: TypeNode, hint: string, path: string): string => {
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
        const element = typeExpr(node.element, singularize(hint), elementPath(path))
        // 联合当元素必须括起来：`(A | B)[]` 而不是 `A | B[]`
        return node.element.kind === 'union' ? `(${element})[]` : `${element}[]`
      }
      case 'object':
        return objectExpr(node, hint, path)
      case 'map':
        // 键是数据，所以没有「这一层的属性」可命名 —— 直接内联成索引签名。
        // 值类型照常走 typeExpr，所以它仍然会拿到一个类型名（`{ [property: string]: IconUrl }`）
        return `{ [property: string]: ${typeExpr(node.value, singularize(hint), elementPath(path))} }`
      case 'union':
        return node.members.map((member) => typeExpr(member, hint, path)).join(' | ')
    }
  }

  // 根声明先占位，把根类型名占住 —— 否则根是对象时 objectExpr 会再要一次同名，
  // 拿到的是 `Xxx2`，根类型反而没了想要的名字。
  // 根名**原样保留**（只要它已经是合法标识符）：判别联合的成员根类型叫 `DynamicTypeAV_V0`，
  // 那个 `_V0` 不能被 pascalCase 当成分隔符吃掉（会变成 `DynamicTypeAVV0`）
  const rootBase = IDENTIFIER.test(rootName) ? rootName : pascalCase(rootName)
  used.add(rootBase)
  const root: { name: string; body: string; doc?: string } = { name: rootBase, body: '' }
  declarations.push(root)
  const rootNode = lower(shape)
  if (rootNode.kind === 'object' && rootNode.props.length > 0) {
    nameByKey.set(keyOf(rootNode), root.name)
    root.body = objectBody(rootNode, '')
  } else {
    root.body = typeExpr(rootNode, rootName, '')
  }
  // 空路径的注释挂在根类型上
  const rootDoc = docs['']
  if (rootDoc !== undefined) {
    root.doc = renderJsDoc(rootDoc, '')
    consumed.add('')
  }

  // 孤立 pointer：判据是「路径在形状树里存不存在」，不是「渲染时走没走到」（见 docs.ts）
  const existing = collectShapePaths(shape)
  for (const path of Object.keys(docs).sort()) {
    if (!existing.has(path)) {
      docIssues.push({ path, kind: 'orphan', message: `${path} 在样本里不存在：字段被删了或改名了，这条注释已经在说谎` })
      continue
    }
    if (consumed.has(path)) continue
    const owner = lostTo.get(path)
    docIssues.push({
      path,
      kind: 'conflict',
      message: `${path} 所在的子树与别处结构等价、共用同一个类型，这条注释挂不上去${
        owner === undefined ? '' : `（那个位置留的是 ${owner} 的注释）`
      }：要么把两处注释写成同一句，要么让形状真的不一样`
    })
  }

  const blocks = declarations.map((declaration, index) => {
    const keyword = `${index === 0 || exportSubtypes ? 'export ' : ''}type ${declaration.name} = ${declaration.body}`
    return declaration.doc === undefined ? keyword : `${declaration.doc}\n${keyword}`
  })
  if (banner !== false) blocks.unshift(banner)
  return {
    source: `${blocks.join('\n\n')}\n`,
    rootName: root.name,
    typeNames: declarations.map((declaration) => declaration.name),
    docIssues
  }
}
