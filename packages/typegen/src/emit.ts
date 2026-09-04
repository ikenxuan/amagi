/**
 * 判别联合的产物：`Map<相对路径, 源码>`、`is*` 类型守卫、覆盖率报告。
 *
 * **不碰文件系统**（本包的分界线，见 `index.ts` 文件头）：这一层只把「文件名 → 源码」算出来，
 * 真正写盘留给将来的 `gen:types`（照 `packages/core/scripts/gen-openapi.mts` 的契约：
 * 脚本只负责写、`--check` 与已提交产物比对不一致就退出码 1、行尾归一）。
 *
 * 目录约定沿用现存那套（`packages/core/src/types/ReturnDataType/Bilibili/Dynamic/`）：
 *
 * ```
 * <Endpoint>/<判别式字面量>/<判别式字面量>_V<n>.ts   形状文件，导出 `<Name>_V<n>`
 * <Endpoint>/<判别式字面量>/index.ts                 barrel，导出 `<Name>`（多形状时取联合）
 * <Endpoint>/guards.ts                               判别联合 + `is*` 类型谓词
 * ```
 *
 * **故意不产 `<Endpoint>/index.ts`**：现存那个 barrel 里有手写枚举（`MajorType` 17 个成员，
 * 每个带中文注释），那是人的知识、PRD 六 明确要它活下来 —— 生成器覆盖它就等于删掉它。
 */

import {
  buildCoverage,
  type DiscriminantCandidate,
  type DiscriminantCoverage,
  describeDiscriminant,
  type DriftRecord,
  findDiscriminants,
  groupSamplesByDiscriminant,
  pickDiscriminant,
  splitShapes,
  type SplitShapesOptions
} from './discriminant'
import { mergeSamples } from './merge'
import { GENERATED_BANNER, type MergeOptions, renderLiteral } from './options'
import { renderShape } from './render'
import type { MergeReport } from './report'
import type { JsonValue, LiteralValue } from './types'

/** 合法 TS 标识符 —— 属性访问要不要改成方括号、类型名要不要补前缀，都看它 */
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/** 文件名安全字符。落盘路径必须在 Windows / Linux 上都能用，所以只留这几类 */
const FILE_SAFE = /^[A-Za-z0-9_.-]+$/

/**
 * 判别式字面量 → 类型名。`DYNAMIC_TYPE_AV` → `DynamicTypeAV`，与现存手写类型**逐字一致**。
 *
 * 规则只有两条：全大写的词按缩写处理（≤2 个字符原样留 —— `AV` 不能变成 `Av`），
 * 其余首字母大写、剩下小写（`RCMD` → `Rcmd`，与现存 `DynamicTypeLiveRcmd` 对得上）。
 * 混合大小写的词只动首字母，不敢整词小写（会毁掉 `someValue` 这种取值）。
 */
export const typeNameFromLiteral = (value: LiteralValue): string => {
  const words = String(value)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => {
      if (!/^[A-Z0-9]+$/.test(word)) return word[0]!.toUpperCase() + word.slice(1)
      return word.length <= 2 ? word : word[0]! + word.slice(1).toLowerCase()
    })
  const name = words.join('')
  if (name === '') return 'Value'
  // 数字开头不是合法标识符（`1` → `T1`）
  return IDENTIFIER.test(name) ? name : `T${name}`
}

/** 判别式字面量 → 目录 / 文件名。非法字符换成 `_`，保证跨平台能落盘 */
export const fileNameFromLiteral = (value: LiteralValue): string => {
  const raw = String(value)
  if (FILE_SAFE.test(raw)) return raw
  const safe = raw.replace(/[^A-Za-z0-9_.-]+/g, '_')
  return safe === '' || safe === '.' || safe === '..' ? '_' : safe
}

/** `data.item.type` + `info` → `info.data.item.type`（键名不是标识符就用方括号） */
const accessExpression = (root: string, path: string): string =>
  path
    .split('.')
    .reduce((expression, key) => (IDENTIFIER.test(key) ? `${expression}.${key}` : `${expression}[${renderLiteral(key)}]`), root)

/** `data.item.type` + `'DYNAMIC_TYPE_AV'` → `{ data: { item: { type: 'DYNAMIC_TYPE_AV' } } }` */
const extractPattern = (path: string, literal: string): string =>
  path
    .split('.')
    .reverse()
    .reduce((inner, key) => `{ ${IDENTIFIER.test(key) ? key : renderLiteral(key)}: ${inner} }`, literal)

export interface EmitOptions extends MergeOptions, SplitShapesOptions {
  /** 端点目录名，如 `Dynamic`。只进路径不进类型名；空串表示不要这层前缀 */
  endpoint: string
  /**
   * 判别式路径。不给就用发现器排第一的可用候选（见 `pickDiscriminant`）。
   * 端点想钉死用哪个判别式就显式传 —— 欠采样的 corpus 有可能让深层候选反超。
   */
  discriminantPath?: string
  /** 已声明的枚举成员清单（可选）。传了才能报「声明了却从未出现」 */
  declaredValues?: readonly LiteralValue[]
  /** 联合类型名，默认 `${endpoint}Union` */
  unionName?: string
  /** 判别式字面量联合的类型名，默认 `${endpoint}Discriminant` */
  discriminantName?: string
  /** 守卫文件名（放端点目录下），默认 `guards.ts` */
  guardsFile?: string
  /** 文件头，默认 `GENERATED_BANNER`；`false` 表示不要（写测试时用） */
  banner?: string | false
}

/** 一个判别式取值下的一个形状 —— 一个 `_V<n>` 文件 */
export interface EmittedShape {
  /** 形状序号，就是文件名里的 `<n>` */
  index: number
  /** 相对路径，如 `Dynamic/DYNAMIC_TYPE_AV/DYNAMIC_TYPE_AV_V0.ts` */
  file: string
  /** 同目录下的模块名（不带 `.ts`），barrel 的 import 用 */
  module: string
  /** 根类型名，如 `DynamicTypeAV_V0` */
  typeName: string
  /** 这个形状由几份样本派生 */
  samples: number
  /** 它没被合进 `_V0` 的证据（独占键）。只有一个形状时是空数组 */
  exclusiveKeys: string[]
  /** 这一支的合并期报告（超界整数、全空数组、混合原始类型……） */
  report: MergeReport
}

/** 判别联合的一个成员 */
export interface EmittedMember {
  value: LiteralValue
  /** 目录名 */
  dir: string
  /** barrel 导出的类型名，如 `DynamicTypeAV` */
  typeName: string
  /** 守卫函数名，如 `isDynamicTypeAV` */
  guardName: string
  /** 这个取值下有几份样本 */
  samples: number
  /** 至少一个。多于一个就是 `_V<n>` 加过一（判据见 `splitShapes`） */
  shapes: EmittedShape[]
  /** 被当成抓包漂移合并掉的形状差异 */
  drift: DriftRecord[]
  /** 组内检出的次级判别式 —— 该开子目录，本轮不产 */
  nested: DiscriminantCandidate[]
}

export interface EmitResult {
  /** 相对路径 → 源码。路径一律用 `/`，插入顺序固定（确定性） */
  files: Map<string, string>
  /** 用的判别式路径 */
  discriminantPath: string
  /** 选中的候选。显式传了 `discriminantPath` 而发现器没把它算成候选时是 `undefined` */
  discriminant: DiscriminantCandidate | undefined
  /** 所有候选，已按选择规则排序 —— 落选的也要看得见 */
  candidates: DiscriminantCandidate[]
  members: EmittedMember[]
  coverage: DiscriminantCoverage
  /** 联合类型名 */
  unionName: string
  /** 守卫文件的相对路径 */
  guardsFile: string
  /** 生成器决定不了 / 本轮不产的东西，可直接打给人看 */
  notes: string[]
}

/** 相对路径拼接：一律用 `/`，空段丢掉（`endpoint: ''` 就是不要前缀那层） */
const relative = (...parts: string[]): string => parts.filter(Boolean).join('/')

/** 文件头 + 本文件专属的几句 */
const bannerWith = (banner: string | false, extra: readonly string[]): string | false =>
  banner === false || extra.length === 0 ? banner : [banner, '//', ...extra.map((line) => `// ${line}`)].join('\n')

const withBanner = (banner: string | false, extra: readonly string[], body: string): string => {
  const head = bannerWith(banner, extra)
  return head === false ? body : `${head}\n\n${body}`
}

/** oxfmt 的 printWidth。产物照它的输出形状生成，落盘脚本再跑一遍 `oxfmt --check` 兜底 */
const PRINT_WIDTH = 140

/**
 * 一个类型谓词。
 *
 * 形状照 `packages/core/test/types/discriminant-narrowing.test-d.ts` 里那个 `isDynamicType`：
 * `info is Extract<Union, { data: { item: { type: T } } }>`。那份测试实测出的结论是
 * **`if (info.data.item.type === …)` 不收窄**（TS 的判别式收窄只认联合成员的直接属性，
 * 而这里的判别式在第三层），类型谓词能收窄 —— 所以守卫函数不是可选项，
 * 是这个判别联合能被下游用起来的唯一途径。守卫是纯增量：不动索引签名（硬约束 1）。
 */
const renderGuard = (input: { name: string; unionName: string; path: string; literal: string }): string => {
  const { name, unionName, path, literal } = input
  const predicate = `info is Extract<${unionName}, ${extractPattern(path, literal)}>`
  const body = `${accessExpression('info', path)} === ${literal}`
  const oneLine = `export const ${name} = (info: ${unionName}): ${predicate} =>`
  if (oneLine.length <= PRINT_WIDTH) return `${oneLine}\n  ${body}`
  // 超宽时照 oxfmt 的换行方式拆，省掉产物一提交就被格式化改一遍
  return [
    `export const ${name} = (`,
    `  info: ${unionName}`,
    `): info is Extract<`,
    `  ${unionName},`,
    `  ${extractPattern(path, literal)}`,
    `> => ${body}`
  ].join('\n')
}

/** `<Endpoint>/guards.ts`：判别式字面量联合 + 判别联合 + 参数化守卫 + 每个取值一个守卫 */
const renderGuardsFile = (input: {
  banner: string | false
  path: string
  unionName: string
  discriminantName: string
  factoryName: string
  members: readonly EmittedMember[]
}): string => {
  const { path, unionName, discriminantName, factoryName, members } = input
  const depth = path.split('.').length
  const blocks: string[] = [
    members.map((member) => `import type { ${member.typeName} } from './${member.dir}'`).join('\n'),
    [
      `/** 判别式 \`${path}\` 在样本里见过的取值。声明了却从未出现的成员见覆盖率报告，不在这里 */`,
      `export type ${discriminantName} =`,
      ...members.map((member) => `  | ${renderLiteral(member.value)}`)
    ].join('\n'),
    [
      '/**',
      ` * 判别联合（PRD 5.1）。判别式在 \`${path}\`，成员是按判别式取值分组、各自合并出来的。`,
      ' *',
      ' * 每一层都带 `[property: string]: any`（硬约束 1：`response-types.test-d.ts` 用它承诺',
      ' * 「平台加字段不算 breaking」）。代价是索引签名会削弱收窄 —— 解法是下面的守卫，不是删索引签名。',
      ' */',
      `export type ${unionName} =`,
      ...members.map((member) => `  | ${member.typeName}`)
    ].join('\n'),
    [
      '/**',
      ' * 参数化守卫，形状与 `packages/core/test/types/discriminant-narrowing.test-d.ts` 里的',
      ` * \`isDynamicType\` 一致。**\`if (info.${path} === …)\` 不收窄** —— TS 的判别式收窄只认联合成员的`,
      ` * 直接属性，而这个判别式在第 ${depth} 层。类型谓词能收窄，那份测试把这两条都钉住了。`,
      ' */',
      `export const ${factoryName} =`,
      `  <T extends ${discriminantName}>(value: T) =>`,
      `  (info: ${unionName}): info is Extract<${unionName}, ${extractPattern(path, 'T')}> =>`,
      `    ${accessExpression('info', path)} === value`
    ].join('\n')
  ]
  for (const member of members) {
    const literal = renderLiteral(member.value)
    blocks.push(
      `/** \`${path} === ${literal}\` 时收窄到 \`${member.typeName}\` */\n` +
        renderGuard({ name: member.guardName, unionName, path, literal })
    )
  }
  return `${withBanner(input.banner, [], blocks.join('\n\n'))}\n`
}

/** `<Endpoint>/<取值>/index.ts`：照现存 barrel 的写法，把形状文件收成一个类型名 */
const renderMemberBarrel = (input: { banner: string | false; member: EmittedMember; path: string }): string => {
  const { member, path } = input
  const body = [
    ...member.shapes.map((shape) => `import type { ${shape.typeName} } from './${shape.module}'`),
    '',
    `export type ${member.typeName} = ${member.shapes.map((shape) => shape.typeName).join(' | ')}`
  ].join('\n')
  const extra =
    member.shapes.length > 1
      ? [
          `\`${path} === ${renderLiteral(member.value)}\` 这一支有 ${member.shapes.length} 个**合不掉**的形状，所以有 \`_V1\`。`,
          '判据见 packages/typegen 的 splitShapes：严格互斥的必需键，且每一侧都被 ≥2 份样本证明过。'
        ]
      : []
  return `${withBanner(input.banner, extra, body)}\n`
}

/** 名字撞了就补数字后缀 —— 两个取值有可能映射到同一个标识符（`a-b` 与 `a_b`） */
const unique = (used: Set<string>, base: string): string => {
  if (!used.has(base)) {
    used.add(base)
    return base
  }
  let suffix = 2
  while (used.has(`${base}${suffix}`)) suffix += 1
  used.add(`${base}${suffix}`)
  return `${base}${suffix}`
}

/**
 * 判别联合的全部产物。**纯函数**：不读文件、不写文件，只返回「相对路径 → 源码」。
 *
 * 干的事按顺序就是 PRD 5.1 那一段：发现判别式（可能在深层嵌套）→ 按取值分组 →
 * 每组各自合并（合并器一行不改）→ 同一取值下还合不掉的形状切 `_V<n>` →
 * 渲染形状文件 / barrel / `is*` 守卫 → 出覆盖率报告。
 */
export const emitDiscriminatedUnion = (samples: readonly JsonValue[], options: EmitOptions): EmitResult => {
  const { endpoint } = options
  const banner = options.banner ?? GENERATED_BANNER
  const guardsFile = relative(endpoint, options.guardsFile ?? 'guards.ts')
  const prefix = endpoint === '' ? 'Generated' : endpoint
  const unionName = options.unionName ?? `${prefix}Union`
  const discriminantName = options.discriminantName ?? `${prefix}Discriminant`
  const notes: string[] = []
  const candidates = findDiscriminants(samples, options)
  const discriminantPath = options.discriminantPath ?? pickDiscriminant(candidates)?.path
  const files = new Map<string, string>()
  const members: EmittedMember[] = []

  if (discriminantPath === undefined || discriminantPath.includes('[]')) {
    notes.push(
      discriminantPath === undefined
        ? '没找到判别式：没有字段满足「取值有限 + 不同取值的其余键集合不同」。不产判别联合 —— 用 generateTypes 出单个类型，或者补样本再来'
        : `判别式 ${discriminantPath} 在数组里：一份样本在这条路径上有多个取值，划不了样本。元素级判别联合是另一件事，本轮不产`
    )
    for (const candidate of candidates) notes.push(`候选：${describeDiscriminant(candidate)}`)
    return {
      files,
      discriminantPath: discriminantPath ?? '',
      discriminant: undefined,
      candidates,
      members,
      coverage: buildCoverage({ path: discriminantPath ?? '', sampleCount: samples.length, groups: [] }),
      unionName,
      guardsFile,
      notes
    }
  }

  const { groups, unmatched } = groupSamplesByDiscriminant(samples, discriminantPath)
  // 判别字段必须收窄成字面量，否则渲染出来是 `type: string`，`Extract<…>` 一个成员都筛不掉
  const literalPaths = [...(options.literalPaths ?? []), discriminantPath]
  // 先把联合与判别式的类型名占住：万一某个取值刚好映射到同名，让**取值**去补后缀
  const usedTypeNames = new Set<string>([unionName, discriminantName])
  const usedDirs = new Set<string>()

  for (const group of groups) {
    const dir = unique(usedDirs, fileNameFromLiteral(group.value))
    const base = unique(usedTypeNames, typeNameFromLiteral(group.value))
    const split = splitShapes(group.samples, options)
    const member: EmittedMember = {
      value: group.value,
      dir,
      typeName: base,
      guardName: unique(usedTypeNames, `is${base}`),
      samples: group.samples.length,
      shapes: [],
      drift: split.drift,
      nested: split.nested
    }
    split.clusters.forEach((cluster, index) => {
      const module = `${dir}_V${index}`
      const typeName = `${base}_V${index}`
      const { shape, report } = mergeSamples(cluster.samples, { ...options, literalPaths })
      const extra = [
        `本文件是判别联合的一支：\`${discriminantPath} === ${renderLiteral(group.value)}\`，形状序号 ${index}。`,
        '要收窄请用同端点 `guards.ts` 里的 `' +
          member.guardName +
          '`：判别式不在成员顶层，`if` 判断不收窄（core 的 discriminant-narrowing.test-d.ts 实测过）。'
      ]
      const rendered = renderShape(shape, {
        rootName: typeName,
        banner: bannerWith(banner, extra),
        exportSubtypes: false
      })
      const file = relative(endpoint, dir, `${module}.ts`)
      files.set(file, rendered.source)
      member.shapes.push({
        index,
        file,
        module,
        typeName: rendered.rootName,
        samples: cluster.samples.length,
        exclusiveKeys: cluster.exclusiveKeys,
        report
      })
    })
    files.set(relative(endpoint, dir, 'index.ts'), renderMemberBarrel({ banner, member, path: discriminantPath }))
    members.push(member)
  }

  files.set(
    guardsFile,
    renderGuardsFile({
      banner,
      path: discriminantPath,
      unionName,
      discriminantName,
      factoryName: unique(usedTypeNames, `is${discriminantName}`),
      members
    })
  )

  const discriminant = candidates.find((candidate) => candidate.path === discriminantPath)
  notes.push(
    `未产 ${relative(endpoint, 'index.ts')}：现存那个 barrel 里有手写枚举与中文注释（\`MajorType\` 17 个成员），` +
      '那是人的知识（PRD 六），生成器覆盖它就等于删掉它'
  )
  if (discriminant === undefined) {
    notes.push(`显式指定的判别式 ${discriminantPath} 不在候选里：它没满足「不同取值的其余键集合不同」，产物照指定的做了，但值得核一眼`)
  } else if (discriminant.separatedPairs < discriminant.totalPairs) {
    notes.push(
      `判别式 ${discriminantPath} 的分离度只有 ${discriminant.separatedPairs}/${discriminant.totalPairs}：` +
        '有些取值之间的键集合分不开（很可能是欠采样），那几支的类型会长得几乎一样'
    )
  }
  for (const candidate of candidates) {
    if (candidate.path === discriminantPath) continue
    notes.push(`落选候选：${describeDiscriminant(candidate)}${candidate.insideArray ? '（在数组里，划不了样本）' : ''}`)
  }
  for (const member of members) {
    for (const nested of member.nested) {
      notes.push(
        `${renderLiteral(member.value)} 组内检出次级判别式 ${nested.path}：按现存约定该开子目录` +
          '（`<外层取值>/<内层取值>/…`，如 `DYNAMIC_TYPE_FORWARD/Forward/DYNAMIC_TYPE_AV/`），不是 `_V+1`。本轮不产子目录'
      )
    }
    for (const drift of member.drift) {
      notes.push(
        `${renderLiteral(member.value)} 组内 ${drift.keys[0]} 与 ${drift.keys[1]} 严格互斥，但两侧只有 ${drift.sizes.join(' / ')} 份样本：` +
          '按抓包漂移合并进同一个形状（PRD 1.3）。真是分支就补样本，再跑一次就会切出 `_V1`'
      )
    }
  }

  return {
    files,
    discriminantPath,
    discriminant,
    candidates,
    members,
    coverage: buildCoverage({
      path: discriminantPath,
      sampleCount: samples.length,
      groups,
      unmatched,
      shapesByValue: new Map(members.map((member) => [member.value, member.shapes.length])),
      declaredValues: options.declaredValues
    }),
    unionName,
    guardsFile,
    notes
  }
}
