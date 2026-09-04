/**
 * corpus → 「相对路径 → 源码」的完整计划。**纯函数**，一个字节都不写盘。
 *
 * 这一层存在的理由与 `packages/core/src/server/openapi.ts` 完全一样：那边
 * `buildOpenApiSpec` 是纯函数、`scripts/gen-openapi.mts` 只负责写盘与 `--check`，
 * 于是「生成对不对」能被单测钉住，而「写盘对不对」只剩下几行没有分支的代码。
 * 反过来把生成逻辑写在脚本里，就只能靠跑一遍脚本再读文件来验，慢且测不全。
 */

import { assessCorpusAge, CORPUS_FORMAT, type CorpusSample } from './corpus'
import { findDiscriminants, pickDiscriminant } from './discriminant'
import type { DocSidecar } from './docs'
import { emitDiscriminatedUnion } from './emit'
import { generateTypes } from './generate'
import { GENERATED_BANNER } from './options'
import type { JsonValue } from './types'

export interface CorpusEndpointInput {
  platform: string
  /** 注册表里的端点名，如 `videoWork` */
  endpoint: string
  /** 这个端点已录到的样本（顺序不影响产出） */
  samples: readonly CorpusSample[]
  /** `corpus/<platform>/<endpoint>.doc.json` 解析出来的内容 */
  sidecar?: DocSidecar
}

export interface PlanResult {
  /** 相对产物根的路径 → 源码。路径一律用 `/`，按路径排序（确定性） */
  files: Map<string, string>
  /** 需要人看一眼的东西：样本过期、注释孤立、大整数掉精度…… */
  warnings: string[]
  /** 每个端点一行，告知性质 */
  summary: string[]
}

/**
 * 一个端点要在平台 barrel 里露出的那一条。
 *
 * 只露**根类型**：嵌套类型（`Data` / `Member` / `Config`…）在形状文件里就不带 `export`，
 * 所以同一平台下两个端点各有一个 `Data` 也不会撞。
 */
interface BarrelEntry {
  /** 导出的类型名，如 `Comments_V0` / `UserDynamicListUnion` */
  typeName: string
  /** 相对平台目录的模块路径，如 `./Comments` / `./UserDynamicList/guards` */
  module: string
}

/** 累加器：`files` 之外还要攒平台 barrel 要用的条目 */
interface Accumulator extends PlanResult {
  /** 平台名 → 该平台各端点露出的条目（按端点顺序，而端点已排过序） */
  barrels: Map<string, BarrelEntry[]>
}

/** `videoWork` → `VideoWork` */
const pascal = (raw: string): string =>
  raw
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('')

/**
 * 一份样本里，类型该描述哪一层。
 *
 * 归一化后的值优先 —— 类型描述的是 fetcher 返回的 `data`，而不是线上原始响应
 * （PRD 待决 #2）。端点没有 normalize 步骤时那个键整个不存在，这时才退回 `raw`。
 */
const payloadOf = (sample: CorpusSample): JsonValue => ('normalized' in sample ? (sample.normalized as JsonValue) : sample.raw)

const addBarrelEntry = (out: Accumulator, platform: string, entry: BarrelEntry): void => {
  const list = out.barrels.get(platform)
  if (list === undefined) out.barrels.set(platform, [entry])
  else list.push(entry)
}

const BARREL_BANNER = [
  '// 自动生成，手改无意义 —— 由 packages/typegen 从录到的样本派生，重新生成会覆盖整棵树。',
  '// 要改类型请改样本或改生成器，然后重新生成。'
].join('\n')

/**
 * `<platform>/index.ts`：把这个平台各端点的根类型收成一处，**并在这里加平台前缀**。
 *
 * 端点名在平台之间会重复（`emojiList` 三个平台都有，于是三份 `EmojiList_V0`），所以
 * 跨平台那一层必须消歧。两种做法里选了加前缀而不是分命名空间，理由是实测出来的：
 * `export * as Bilibili from './bilibili'` 这种命名空间 re-export，**core 的 tsdown
 * 打包声明时解析不开**（报 `"Bilibili" is not exported by ".../src/index.d.ts"`，
 * 直接构建失败）。前缀是扁平的普通 re-export，没有这个问题。
 *
 * 顺带它也与手写树的既有约定一致（`BiliEmojiList` / `KsOneWork` / `DySuggestWords`），
 * 只是这里用**完整平台名**（`BilibiliEmojiList_V0`）—— 与手写树的短前缀刻意不同名，
 * 两棵树并存期间「这个类型是生成的还是手写的」在调用处一眼能看出来。
 *
 * 只 re-export 根类型名，不用 `export *`：形状文件里的嵌套类型本来就不导出，
 * 而 `export *` 会把将来任何新增的顶层导出也一起带出来，那不是 barrel 该有的行为。
 */
const renderPlatformBarrel = (platform: string, entries: readonly BarrelEntry[]): string => {
  const prefix = pascal(platform)
  const lines = [...entries]
    .sort((left, right) => (left.typeName < right.typeName ? -1 : 1))
    .map((entry) => `export type { ${entry.typeName} as ${prefix}${entry.typeName} } from '${entry.module}'`)
  return `${BARREL_BANNER}\n\n${lines.join('\n')}\n`
}

/** `index.ts`：把各平台 barrel 收成一处。前缀已经在平台那一层加过，这里不会撞名 */
const renderRootBarrel = (platforms: readonly string[]): string => {
  if (platforms.length === 0) {
    return `${BARREL_BANNER}\n\n// corpus 里还没有任何样本，所以这棵树是空的。\nexport {}\n`
  }
  const lines = platforms.map((platform) => `export type * from './${platform}'`)
  return `${BARREL_BANNER}\n\n${lines.join('\n')}\n`
}

/**
 * 产物文件头里的**溯源块**：这份类型是由哪几份样本、什么时候、什么参数派生的。
 *
 * 为什么必须写进产物：样本不进 git（见 PRD 待决 #1），所以产物是**唯一**进仓库的东西。
 * 不写的话，「这个类型的证据有多旧」只有录样本那台机器知道 —— 而 PRD 一开篇盘点的
 * 「抓包溯源元数据：0」正是这个病：150 个手写文件里没有一条注释说明它是何时、
 * 用什么参数抓的，于是没人能判断该不该信它。
 *
 * **一律只写绝对信息（日期、哈希、参数键），绝不写「距今多少天」这类相对量。**
 * 相对量依赖 `now`，会让同一批样本在不同日子生成出不同的文件、`--check` 隔天就红。
 * 「过期了没有」由 `assessCorpusAge` 在生成时打印告警，那是运行时的事，不进产物。
 *
 * 参数只写**键名**不写值：值虽然脱敏过，但键名才是「这份样本问的是哪个东西」的答案，
 * 而写上值会让产物跟着脱敏实现的每次调整刷 diff。
 */
const renderProvenance = (samples: readonly CorpusSample[]): string[] => {
  if (samples.length === 0) return []
  const rows = samples
    .map((sample) => {
      const meta = sample.metadata
      // `recordedAt` 精确到秒，但这里只取日期：同一天重录不该刷 diff，
      // 而「证据有多旧」这个问题上，秒级精度没有信息量
      const day = meta.recordedAt.slice(0, 10)
      const keys = Object.keys(meta.params).sort()
      const params = keys.length === 0 ? '无参数' : keys.join(' / ')
      return `${meta.paramsHash}  ${day}  ${params}`
    })
    .sort()
  const versions = [...new Set(samples.map((sample) => sample.metadata.amagiVersion))].sort()
  return [
    `证据：${samples.length} 份样本（amagi ${versions.join(' / ')}）。样本不进 git，在本地 corpus/ 里`,
    ...rows.map((row) => `  ${row}`)
  ]
}

/** 一个端点的样本 → 文件。判别式自动发现，sidecar 里可以钉死 */
const planEndpoint = (input: CorpusEndpointInput, now: Date, out: Accumulator): void => {
  const { platform, endpoint } = input
  const payloads: JsonValue[] = []
  /** 真正贡献了形状的样本 —— 溯源块只列这些 */
  const used: CorpusSample[] = []
  for (const sample of input.samples) {
    if (sample.format !== CORPUS_FORMAT) {
      out.warnings.push(`${platform}/${endpoint}：有样本的 format=${sample.format}，本生成器只认 ${CORPUS_FORMAT}，已跳过`)
      continue
    }
    // `store-as-error` 的样本描述的是错误形状（稿件不存在 / 不可见）。
    // 混进成功类型会把业务字段全变成可选 —— 那正是 corpus 那一层特意把它标出来的原因
    if (sample.metadata.verdict.kind !== 'store') {
      out.summary.push(
        `${platform}/${endpoint}：一份 ${sample.metadata.verdict.kind} 样本没进成功类型（${sample.metadata.verdict.reason}）`
      )
      continue
    }
    const age = assessCorpusAge({ recordedAt: sample.metadata.recordedAt, now })
    if (age.warning !== undefined) out.warnings.push(`${platform}/${endpoint}/${sample.metadata.paramsHash}：${age.warning}`)
    payloads.push(payloadOf(sample))
    used.push(sample)
  }
  if (payloads.length === 0) {
    out.summary.push(`${platform}/${endpoint}：没有可用样本，不产类型`)
    return
  }

  const docs = input.sidecar?.paths ?? {}
  const forced = input.sidecar?.discriminantPath
  const auto = forced === undefined ? pickDiscriminant(findDiscriminants(payloads))?.path : undefined
  const discriminantPath = forced === false ? undefined : (forced ?? auto)
  const name = pascal(endpoint)
  // 溯源块接在标准文件头后面。`used` 只收真正进了类型的那些样本 ——
  // 被判定拒掉、format 不认的那些没有贡献形状，列进去会让人以为它们参与了
  const provenance = renderProvenance(used)
  const banner = provenance.length === 0 ? GENERATED_BANNER : [GENERATED_BANNER, '//', ...provenance.map((line) => `// ${line}`)].join('\n')

  if (discriminantPath !== undefined) {
    const declaredValues = input.sidecar?.declaredValues
    const result = emitDiscriminatedUnion(payloads, {
      endpoint: name,
      unionName: `${name}Union`,
      discriminantPath,
      docs,
      banner,
      ...(declaredValues === undefined ? {} : { declaredValues })
    })
    for (const [path, content] of result.files) out.files.set(`${platform}/${path}`, content)
    // 判别联合的联合类型住在 `<Endpoint>/guards.ts` 里（`emitDiscriminatedUnion` 故意不产
    // `<Endpoint>/index.ts`，理由见 emit.ts 文件头），所以 barrel 直接指向 guards
    addBarrelEntry(out, platform, { typeName: result.unionName, module: `./${name}/guards` })
    for (const issue of result.docIssues) out.warnings.push(`${platform}/${endpoint}：注释 ${issue.path} —— ${issue.message}`)
    const { declaredMissing, undeclared } = result.coverage
    out.summary.push(
      `${platform}/${endpoint}：判别联合 ${discriminantPath}${forced === undefined ? '（自动发现）' : '（sidecar 钉死）'}，` +
        `${result.members.length} 个取值 / ${payloads.length} 份样本`
    )
    // 两种漂移都进 **warnings** 而不是 summary：它们要人做决定，而 summary 是告知性的。
    // 「声明了却没出现」是 PRD 1.1 那个缺口（`MajorType` 17 个成员只有 6 个建了模型）；
    // 反向那条更急 —— 平台加了新取值而手写枚举没跟上，下游按枚举分支的代码会漏掉整支
    if (declaredMissing.length > 0) {
      out.warnings.push(
        `${platform}/${endpoint}：sidecar 声明的 ${declaredMissing.length} 个取值从未出现` +
          `（${declaredMissing.join(' / ')}）—— 要么补样本，要么这些成员该删`
      )
    }
    if (undeclared.length > 0) {
      out.warnings.push(
        `${platform}/${endpoint}：样本里出现了 ${undeclared.length} 个 sidecar 没声明的取值` +
          `（${undeclared.join(' / ')}）—— 手写枚举漂移了，补进 declaredValues`
      )
    }
    return
  }

  const rootName = `${name}_V0`
  const result = generateTypes(payloads, { rootName, docs, banner })
  out.files.set(`${platform}/${name}/${rootName}.ts`, result.source)
  out.files.set(`${platform}/${name}/index.ts`, `export type { ${rootName} } from './${rootName}'\n`)
  addBarrelEntry(out, platform, { typeName: rootName, module: `./${name}` })
  for (const issue of result.docIssues) out.warnings.push(`${platform}/${endpoint}：注释 ${issue.path} —— ${issue.message}`)
  for (const finding of result.report.findings) {
    if (finding.needsDecision) out.warnings.push(`${platform}/${endpoint}：${finding.path} —— ${finding.message}`)
  }
  out.summary.push(`${platform}/${endpoint}：单类型，${result.typeNames.length} 个类型 / ${payloads.length} 份样本`)
}

/**
 * 整个 corpus → 完整产物计划。
 *
 * @param input.endpoints 每个端点一条。顺序不影响产出（内部按 平台/端点 排序）
 * @param input.now 判样本年龄用的当前时间，由调用方传（纯函数，测试不用冻时间）
 */
export const planCorpusTypes = (input: { endpoints: readonly CorpusEndpointInput[]; now: Date }): PlanResult => {
  const out: Accumulator = { files: new Map(), warnings: [], summary: [], barrels: new Map() }
  const sorted = [...input.endpoints].sort((left, right) =>
    `${left.platform}/${left.endpoint}` < `${right.platform}/${right.endpoint}` ? -1 : 1
  )
  for (const endpoint of sorted) planEndpoint(endpoint, input.now, out)

  // barrel 也是产物：它得列出「这一轮到底产了哪些端点」，手写必然与树漂移。
  // 根 barrel **零样本时也产**（`export {}`），因为 packages/response-types 的
  // `src/index.ts` 是手写的、常年 re-export 它 —— 空 corpus 下那个 import 也得解析得开。
  const platforms = [...out.barrels.keys()].sort()
  for (const platform of platforms) out.files.set(`${platform}/index.ts`, renderPlatformBarrel(platform, out.barrels.get(platform)!))
  out.files.set('index.ts', renderRootBarrel(platforms))

  // 路径排序：产物要跑 `--check` 逐字节比对，写盘顺序不能跟着目录遍历顺序变
  const files = new Map([...out.files.entries()].sort(([left], [right]) => (left < right ? -1 : 1)))
  return { files, warnings: out.warnings, summary: out.summary }
}
