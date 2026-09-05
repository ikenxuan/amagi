/**
 * 破坏性变更检测（PRD 阶段 6）。比对**已提交的产物**与**这次生成的产物**，
 * 把会让下游编译红的改动挑出来。
 *
 * 为什么直接比源码文本而不是比形状树：形状树只存在于生成的这一侧 —— 已提交的那一份
 * 只有 `.ts` 源码。想比形状就得再往仓库里塞一份机读的形状快照，那等于多一份要维护、
 * 会与源码脱节的产物。而这个生成器的输出格式是**我们自己完全控制的**（每个属性一行、
 * 缩进两格、类型表达式在冒号后面），按行抽属性是可靠的。
 *
 * **方向很重要，而且容易搞反**。这些是**响应**类型，下游主要是读它们：
 *
 * | 改动 | 对「读」的影响 |
 * |---|---|
 * | 删掉一个属性 | **红**：`data.foo` 直接不编译 |
 * | 必需 → 可选 | **红**：值多了一种 `undefined`，用的地方要改 |
 * | 联合里加一个成员（`string` → `string \| null`） | **红**：多出来的那种情况得处理 |
 * | 联合里少一个成员（`string \| number` → `string`） | 不红：收窄对读的一侧是安全的 |
 * | 类型整个换掉（`number` → `string`） | **红** |
 *
 * 所以「收窄」既不是一律安全也不是一律危险，取决于收的是哪一侧 ——
 * PRD 那句「删字段 / 收窄类型」说的是前三行。第四行照样报出来，但标成不影响读，
 * 因为它通常意味着**采样量不够**（某个取值这一轮没录到），那是要人看的另一件事。
 */

/** 一处改动 */
export interface BreakingChange {
  /** 产物文件的相对路径 */
  file: string
  /** 类型名。整个类型消失时是它自己 */
  typeName: string
  /** 属性名。整个类型消失时为空串 */
  prop: string
  kind: 'type-removed' | 'prop-removed' | 'prop-now-optional' | 'union-member-added' | 'union-member-removed' | 'type-changed'
  /** 会不会让下游读这些类型的代码编译红。见模块注释那张表 */
  breaksReaders: boolean
  /** 人读的一句话 */
  message: string
}

/** 一行属性声明：两格缩进、可选标记、冒号、类型表达式。索引签名不算属性 */
const PROP_LINE = /^ {2}('[^']+'|[A-Za-z_$][\w$]*)(\?)?: (.+)$/
const TYPE_LINE = /^(?:export )?type ([A-Za-z_$][\w$]*) = /

interface Prop {
  optional: boolean
  type: string
}

/**
 * 从生成的源码里抽出「类型名 → 属性名 → 声明」。
 *
 * 只认这个生成器自己的输出格式，不做通用 TS 解析 —— 手改过的产物本来就不该存在
 * （`--check` 会拦），所以不必为它设计。
 */
export const readGeneratedProps = (source: string): Map<string, Map<string, Prop>> => {
  const types = new Map<string, Map<string, Prop>>()
  let current: Map<string, Prop> | undefined
  // 按 `\r?\n` 拆，不是按 `\n`：仓库在 Windows 上按 CRLF 检出，只拆 `\n` 会给每行留一个 `\r`，
  // 而 `PROP_LINE` 结尾的 `$` 匹配不到 `\r` 前面 —— 于是类型全都认得出、属性一个都读不到，
  // 报出来是「204 个类型、每个 0 个属性」。这个坑安静得离谱，实测比对手写类型时才撞上
  for (const line of source.split(/\r?\n/)) {
    const typeMatch = TYPE_LINE.exec(line)
    if (typeMatch !== null) {
      current = new Map<string, Prop>()
      types.set(typeMatch[1]!, current)
      continue
    }
    const propMatch = PROP_LINE.exec(line)
    if (propMatch === null || current === undefined) continue
    current.set(propMatch[1]!.replace(/^'|'$/g, ''), { optional: propMatch[2] === '?', type: propMatch[3]!.trim() })
  }
  return types
}

/** 拆联合成员。只按顶层 `|` 拆 —— 括号里的（`(A | B)[]`）不拆，那是元素类型不是这一层的联合 */
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

/** 比一个属性的两版类型。返回空数组表示没变化 */
const compareProp = (file: string, typeName: string, prop: string, before: Prop, after: Prop): BreakingChange[] => {
  const changes: BreakingChange[] = []
  if (!before.optional && after.optional) {
    changes.push({
      file,
      typeName,
      prop,
      kind: 'prop-now-optional',
      breaksReaders: true,
      message: `${typeName}.${prop} 从必需变成可选：值多了一种 undefined，读它的地方要改`
    })
  }
  if (before.type === after.type) return changes
  const beforeMembers = new Set(unionMembers(before.type))
  const afterMembers = new Set(unionMembers(after.type))
  const added = [...afterMembers].filter((member) => !beforeMembers.has(member))
  const removed = [...beforeMembers].filter((member) => !afterMembers.has(member))
  // 两侧都动了 —— 那不是加成员也不是减成员，是换了个类型
  if (added.length > 0 && removed.length > 0) {
    changes.push({
      file,
      typeName,
      prop,
      kind: 'type-changed',
      breaksReaders: true,
      message: `${typeName}.${prop} 的类型从 \`${before.type}\` 变成 \`${after.type}\``
    })
    return changes
  }
  if (added.length > 0) {
    changes.push({
      file,
      typeName,
      prop,
      kind: 'union-member-added',
      breaksReaders: true,
      message: `${typeName}.${prop} 多了 \`${added.join(' | ')}\`：多出来的这几种情况下游得处理`
    })
  }
  if (removed.length > 0) {
    changes.push({
      file,
      typeName,
      prop,
      kind: 'union-member-removed',
      // 收窄对「读」这一侧是安全的。报出来是因为它通常意味着某个取值这一轮没录到
      breaksReaders: false,
      message: `${typeName}.${prop} 少了 \`${removed.join(' | ')}\`：读的一侧不会红，但很可能是这一轮没录到那种取值`
    })
  }
  return changes
}

/**
 * 比对两版产物。
 *
 * @param before 已提交的产物：相对路径 → 源码
 * @param after 这次生成的产物，形状同上
 * @returns 按 `file`、`typeName`、`prop` 排序（确定性：这份清单会进 CI summary）
 */
export const detectBreakingChanges = (before: ReadonlyMap<string, string>, after: ReadonlyMap<string, string>): BreakingChange[] => {
  const changes: BreakingChange[] = []
  for (const [file, beforeSource] of before) {
    const afterSource = after.get(file)
    if (afterSource === undefined) {
      // 整个文件没了。文件名就是类型名的来源，所以这里报文件级
      changes.push({
        file,
        typeName: '',
        prop: '',
        kind: 'type-removed',
        breaksReaders: true,
        message: `${file} 整个不产了：import 它的地方会直接红（端点删了 / 判别式取值改名了？）`
      })
      continue
    }
    const beforeTypes = readGeneratedProps(beforeSource)
    const afterTypes = readGeneratedProps(afterSource)
    for (const [typeName, beforeProps] of beforeTypes) {
      const afterProps = afterTypes.get(typeName)
      if (afterProps === undefined) {
        changes.push({
          file,
          typeName,
          prop: '',
          kind: 'type-removed',
          breaksReaders: true,
          message: `${file} 里的 ${typeName} 没了：引用它的地方会红`
        })
        continue
      }
      for (const [prop, beforeProp] of beforeProps) {
        const afterProp = afterProps.get(prop)
        if (afterProp === undefined) {
          changes.push({
            file,
            typeName,
            prop,
            kind: 'prop-removed',
            breaksReaders: true,
            message: `${typeName}.${prop} 没了：读它的地方会直接红（平台删字段了，还是这一轮的样本里刚好都没有？）`
          })
          continue
        }
        changes.push(...compareProp(file, typeName, prop, beforeProp, afterProp))
      }
    }
  }
  return changes.sort((left, right) => {
    const leftKey = `${left.file}|${left.typeName}|${left.prop}|${left.kind}`
    const rightKey = `${right.file}|${right.typeName}|${right.prop}|${right.kind}`
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
  })
}
