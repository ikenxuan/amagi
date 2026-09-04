/**
 * 注释 sidecar（PRD 六）。**这一条不做，整套方案就是一次性的。**
 *
 * 现存那 26,535 行手写类型里真正有价值的部分不是形状（形状能从样本生成），而是**语义**：
 * 「`type` 是判别式，它决定 `modules` 下有哪些键」这种话，样本里没有、生成器也推不出来。
 * 一旦重新生成就把它冲掉，下一次生成之前人又会往生成产物里手写注释 —— 于是产物不再可重新生成。
 *
 * 所以注释与形状分开存：形状来自 corpus，注释来自 `<端点>.doc.json`，生成时合并成 JSDoc。
 *
 * 两条设计取向：
 *
 * 1. **孤立 pointer 必须报出来**（PRD 点名）。一条指向已经不存在的路径的注释，
 *    意味着那个字段被删了或改名了 —— 而那正是注释开始说谎的时刻。
 *    判据是「路径在形状树里存不存在」，**不是**「渲染时有没有走到」：
 *    结构等价复用（5.2）会让 `b.x` 的类型直接引用从 `a.x` 那边生成的类型，
 *    按渲染访问判会把 `b.x` 误报成孤立的。
 * 2. **注释不参与结构等价判定**。两个子树形状一样、只有注释不同时仍然共用一个类型 ——
 *    否则加一条注释就会多出一份重复类型，人就不敢写注释了。代价是共用类型上只能挂一份注释，
 *    冲突的那些进 {@link RenderDocIssue}，让人自己决定是改注释还是把两边拆开。
 */

import { childPath, elementPath } from './options'
import type { JsonValue, Shape } from './types'

/**
 * sidecar 文件的形状。路径约定同 `options.ts`（`data.item.type`、`items[].id`），
 * **空串是根类型**。
 */
export interface DocSidecar {
  paths: Record<string, string>
  /**
   * 显式指定判别式路径，压过自动发现。`false` 表示「这个端点不要判别联合」。
   *
   * 存在的理由是欠采样：每个变体只录到一份样本时，`id_str` 这种每份样本一个唯一值的字段
   * 与真判别式完全同分（见 `discriminant.ts` 的 `looksLikeId`）。补样本是正解，
   * 但在补齐之前得有个地方把结论写死，而不是让生成器每次都猜。
   */
  discriminantPath?: string | false
  /**
   * 判别式**已声明**的全部取值。人写在 sidecar 里，用来跟样本实测到的取值比对。
   *
   * 这条解决 PRD 1.1 记的那个缺口：B站动态的 `MajorType` 声明了 17 个成员、
   * `AdditionalType` 10 个，而只有 6 个 `DYNAMIC_TYPE_*` 真的建了模型 ——
   * **声明的枚举空间远大于已建模的变体，而缺口有多大没人知道**。
   * 把清单写进来，生成时就会报「声明了却从未出现」（要么补样本、要么这些成员该删）
   * 与反向的「样本里出现但没声明」（平台加了新取值，手写枚举漂移了）。
   *
   * 只在有判别式时有意义 —— 单类型端点没有判别式可比。
   */
  declaredValues?: readonly (string | number | boolean)[]
}

/** 解析人手改的 `.doc.json`。不抛异常，问题都进 `errors` */
export const parseDocSidecar = (raw: JsonValue): { sidecar: DocSidecar; errors: string[] } => {
  const errors: string[] = []
  const isRecord = (value: JsonValue | undefined): value is Record<string, JsonValue> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
  if (!isRecord(raw)) return { sidecar: { paths: {} }, errors: ['.doc.json 的根不是对象'] }
  for (const key of Object.keys(raw)) {
    if (key !== 'paths' && key !== '$comment' && key !== 'discriminantPath' && key !== 'declaredValues') {
      errors.push(`${key} 不是认识的键（JSON 没有注释，注释写在 $comment 里）`)
    }
  }
  let discriminantPath: string | false | undefined
  if (raw.discriminantPath !== undefined) {
    if (typeof raw.discriminantPath === 'string' || raw.discriminantPath === false) discriminantPath = raw.discriminantPath
    else errors.push('discriminantPath 只能是字符串或 false')
  }
  let declaredValues: (string | number | boolean)[] | undefined
  if (raw.declaredValues !== undefined) {
    if (!Array.isArray(raw.declaredValues)) errors.push('declaredValues 只能是数组')
    else {
      // 逐个校验而不是整条拒掉：写错一个取值时，其余的仍然该参与比对，
      // 而错的那个要被指名 —— 「整条静默失效」是这里最难查的失败方式
      const values: (string | number | boolean)[] = []
      for (const [index, value] of raw.declaredValues.entries()) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') values.push(value)
        else errors.push(`declaredValues[${index}] 不是字面量（只能是字符串 / 数字 / 布尔）`)
      }
      if (values.length !== new Set(values).size) errors.push('declaredValues 里有重复取值')
      declaredValues = values
    }
  }
  const rawPaths = raw.paths
  if (rawPaths === undefined) {
    return { sidecar: { paths: {}, discriminantPath, declaredValues }, errors: [...errors, '.doc.json 缺 paths 字段'] }
  }
  if (!isRecord(rawPaths)) {
    return { sidecar: { paths: {}, discriminantPath, declaredValues }, errors: [...errors, '.doc.json 的 paths 不是对象'] }
  }
  const paths: Record<string, string> = {}
  for (const [path, text] of Object.entries(rawPaths)) {
    if (typeof text !== 'string') {
      errors.push(`paths[${JSON.stringify(path)}] 不是字符串`)
      continue
    }
    if (text.trim() === '') {
      // 空注释比没注释更糟：它占着位置，看起来这个字段已经写过说明了
      errors.push(`paths[${JSON.stringify(path)}] 是空字符串，等于没写注释`)
      continue
    }
    paths[path] = text
  }
  return { sidecar: { paths, discriminantPath, declaredValues }, errors }
}

/**
 * 形状树里所有存在的路径。
 *
 * 与渲染无关地走一遍，所以不受结构等价复用影响 —— 这是孤立 pointer 判据的正确依据。
 */
export const collectShapePaths = (shape: Shape): Set<string> => {
  const paths = new Set<string>()
  const walk = (node: Shape, path: string): void => {
    paths.add(path)
    if (node.object) for (const [key, child] of node.object.props) walk(child, childPath(path, key))
    if (node.array) walk(node.array.element, elementPath(path))
  }
  walk(shape, '')
  return paths
}

/** 指向不存在路径的注释。空数组表示 sidecar 与样本对得上 */
export const findOrphanDocs = (sidecar: DocSidecar, shape: Shape): string[] => {
  const existing = collectShapePaths(shape)
  return Object.keys(sidecar.paths)
    .filter((path) => !existing.has(path))
    .sort()
}

/** 一条注释没能落到产物上。`kind` 说明是哪种情况 */
export interface RenderDocIssue {
  path: string
  kind:
    | /** 路径在形状树里不存在 —— 字段被删了或改名了，注释开始说谎 */ 'orphan'
    | /** 共用类型上已经挂了另一条注释（结构等价复用的代价，见模块注释） */ 'conflict'
  message: string
}

const JSDOC_END = /\*\//g

/**
 * 一段文字 → JSDoc。`indent` 是这一行的缩进（属性在对象里是两个空格）。
 *
 * 注释结束符（星号加斜杠）会被转义成 `*\/`：注释里出现它会提前闭合注释块，
 * 而 sidecar 里写代码片段是常事 —— 这个函数自己的注释就差点栽在这上面。
 */
export const renderJsDoc = (text: string, indent: string): string => {
  const safe = text.replace(JSDOC_END, '*\\/')
  const lines = safe.split('\n')
  if (lines.length === 1) return `${indent}/** ${lines[0]!.trim()} */`
  return [`${indent}/**`, ...lines.map((line) => `${indent} * ${line.trimEnd()}`.trimEnd()), `${indent} */`].join('\n')
}
