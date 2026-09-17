/**
 * corpus → 「相对路径 → 源码」的完整计划。**纯函数**，一个字节都不写盘。
 *
 * 这一层存在的理由与 `packages/core/src/server/openapi.ts` 完全一样：那边
 * `buildOpenApiSpec` 是纯函数、`scripts/gen-openapi.mts` 只负责写盘与 `--check`，
 * 于是「生成对不对」能被单测钉住，而「写盘对不对」只剩下几行没有分支的代码。
 * 反过来把生成逻辑写在脚本里，就只能靠跑一遍脚本再读文件来验，慢且测不全。
 */

import { type BarrelEntry, pascal, renderPlatformBarrel, renderRootBarrel } from './barrels'
import { assessCorpusAge, CORPUS_FORMAT, type CorpusSample, responseDirectionOf, shapeIndexOf } from './corpus'
import { findDiscriminants, pickDiscriminant } from './discriminant'
import type { DocSidecar } from './docs'
import { emitDiscriminatedUnion } from './emit'
import { generateTypes } from './generate'
import { GENERATED_BANNER } from './options'
import type { RequestCollection } from './requests'
import type { JsonValue } from './types'

export interface CorpusEndpointInput {
  platform: string
  /** 注册表里的端点名，如 `videoWork` */
  endpoint: string
  /** 这个端点已录到的样本（顺序不影响产出） */
  samples: readonly CorpusSample[]
  /** `corpus/<platform>/<endpoint>.doc.json` 解析出来的内容 */
  sidecar?: DocSidecar
  /**
   * `corpus/<platform>/<endpoint>.requests.json` 里那份请求集合。
   *
   * **溯源块唯一的文字来源。** 它与产物一样进 git，所以引用它是可解析的；而样本
   * （`corpus/<平台>/<端点>/<哈希>.json`）不进 git —— 把样本哈希写进产物等于给下一个人
   * 一个他手上没有、也查不到的引用。见 {@link renderProvenance}。
   */
  requests?: RequestCollection
}

export interface PlanResult {
  /** 相对产物根的路径 → 源码。路径一律用 `/`，按路径排序（确定性） */
  files: Map<string, string>
  /** 需要人看一眼的东西：样本过期、注释孤立、大整数掉精度…… */
  warnings: string[]
  /** 每个端点一行，告知性质 */
  summary: string[]
}

/** 累加器：`files` 之外还要攒平台 barrel 要用的条目 */
interface Accumulator extends PlanResult {
  /** 平台名 → 该平台各端点露出的条目（按端点顺序，而端点已排过序） */
  barrels: Map<string, BarrelEntry[]>
}

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

/**
 * 产物文件头里的**溯源块**：这份类型是由哪些**参数组合**共同得出的。
 *
 * 为什么必须写进产物：产物是这条链上唯一进 git 的类型证据（PRD 一开篇盘点的
 * 「抓包溯源元数据：0」就是这个病 —— 150 个手写文件里没有一条注释说明它是何时、
 * 用什么参数抓的，于是没人能判断该不该信它）。
 *
 * **但它只许引用同样进 git 的东西。** 这条是这个函数的全部纪律，也是它被改写过一次的理由：
 * 原先每行写的是样本的 `paramsHash`（`5a05a10190fe` 这种），而那串东西是
 * `corpus/<平台>/<端点>/<哈希>.json` 的文件名 —— **样本不进 git**（`.gitignore` 的 corpus 段），
 * 于是产物里那个引用对除了录制者以外的任何人都解析不了：拿着哈希无处可查。
 * 现在每行写的是「参数键 + 请求集合里那句人写的说明」，两样都在
 * `corpus/<平台>/<端点>.requests.json` 里，而那个文件进 git（`.gitignore` 的 `!` 例外）。
 *
 * 三条随之而来的判据：
 *
 * 1. **参数只写键名不写值。** 值是真值（PRD 3.3 起 `metadata.params` 不再脱敏），
 *    写进产物就是把真参数复制进 git 的第二处 —— 它该待的地方只有请求集合。
 * 2. **不写录制日期。** 那是样本的属性，而样本不进 git；「证据有多旧」由
 *    `assessCorpusAge` 在生成时打印告警，那是运行时的事。顺带这也让产物少一处会随重录刷的 diff。
 * 3. **一律只写绝对信息**，绝不写「距今多少天」这类相对量 —— 相对量依赖 `now`，
 *    会让同一批样本在不同日子生成出不同的文件、`--check` 隔天就红。
 *
 * 集合里查不到某组参数时那一行只剩参数键（人还没点过「保存并共享参数」，或那条被删了）。
 * **不猜一个说明出来**：一句编出来的话比没有话更糟。
 */
const renderProvenance = (input: {
  platform: string
  endpoint: string
  samples: readonly CorpusSample[]
  requests?: RequestCollection
}): string[] => {
  const { platform, endpoint, samples, requests } = input
  if (samples.length === 0) return []
  // 身份是**参数的规范哈希**（`hashParams`），与请求集合里那个 `paramsHash` 同一个口径 ——
  // 哈希本身不进产物，它只在这里用来把「样本」与「集合里那条说明」对上
  const labels = new Map((requests?.requests ?? []).map((entry) => [entry.paramsHash, entry.label]))
  const rows = [
    ...new Set(
      samples.map((sample) => {
        const meta = sample.metadata
        const keys = Object.keys(meta.params).sort()
        const params = keys.length === 0 ? '无参数' : keys.join(' / ')
        const label = labels.get(meta.paramsHash)
        return label === undefined ? params : `${params}  ${label}`
      })
    )
  ].sort()
  const versions = [...new Set(samples.map((sample) => sample.metadata.amagiVersion))].sort()
  return [
    `证据：${samples.length} 份响应（amagi ${versions.join(' / ')}）。参数与说明在 corpus/${platform}/${endpoint}.requests.json 里`,
    ...rows.map((row) => `  ${row}`)
  ]
}

/** 一个端点的样本 → 文件。判别式自动发现，sidecar 里可以钉死 */
const planEndpoint = (input: CorpusEndpointInput, now: Date, out: Accumulator): void => {
  const { platform, endpoint } = input
  const successPayloads: JsonValue[] = []
  const errorPayloads: JsonValue[] = []
  /** 真正贡献了形状的样本 —— 溯源块只列这些 */
  const used: CorpusSample[] = []
  const errorUsed: CorpusSample[] = []
  /** 形状序号 → 那一档的样本。序号 0 走下面的主路径（判别式发现也只在它上面跑） */
  const successByIndex = new Map<number, CorpusSample[]>()
  const errorByIndex = new Map<number, CorpusSample[]>()
  for (const sample of input.samples) {
    if (sample.format !== CORPUS_FORMAT) {
      out.warnings.push(`${platform}/${endpoint}：有样本的 format=${sample.format}，本生成器只认 ${CORPUS_FORMAT}，已跳过`)
      continue
    }
    const age = assessCorpusAge({ recordedAt: sample.metadata.recordedAt, now })
    if (age.warning !== undefined) out.warnings.push(`${platform}/${endpoint}/${sample.metadata.paramsHash}：${age.warning}`)

    const verdict = sample.metadata.verdict
    if (verdict.kind === 'reject') {
      out.summary.push(`${platform}/${endpoint}：一份 reject 样本没进任何类型（${verdict.reason}）`)
      continue
    }
    // **先按方向、再按形状序号分桶。** 序号是人选的（`metadata.shapeIndex`）：
    // 同序号的样本一起走既有合并逻辑，不同序号各产一个 `_V<n>` —— 那正是选它的意义
    const bucket = responseDirectionOf(sample) === 'error' ? errorByIndex : successByIndex
    const index = shapeIndexOf(sample)
    const group = bucket.get(index) ?? []
    group.push(sample)
    bucket.set(index, group)
  }
  for (const [index, group] of successByIndex) {
    if (index !== 0) continue
    successPayloads.push(...group.map(payloadOf))
    used.push(...group)
  }
  for (const [index, group] of errorByIndex) {
    if (index !== 0) continue
    errorPayloads.push(...group.map(payloadOf))
    errorUsed.push(...group)
  }
  if (successByIndex.size === 0 && errorByIndex.size === 0) {
    out.summary.push(`${platform}/${endpoint}：没有可用样本，不产类型`)
    return
  }

  const docs = input.sidecar?.paths ?? {}
  const name = pascal(endpoint)
  const endpointImports: string[] = []
  /** 成功 / 错误各自的 `_V<n>` 类型名，按序号升序 —— 稳定类型就是它们的联合 */
  const successVariants: string[] = []
  const errorVariants: string[] = []
  const unionOf = (variants: readonly string[]): string => (variants.length === 0 ? 'never' : variants.join(' | '))
  const writeEndpointIndex = (): void => {
    const source = [
      ...endpointImports,
      ...(endpointImports.length === 0 ? [] : ['']),
      `export type ${name}Success = ${unionOf(successVariants)}`,
      `export type ${name}Error = ${unionOf(errorVariants)}`,
      `export type ${name} = ${name}Success | ${name}Error`,
      ''
    ].join('\n')
    out.files.set(`${platform}/${name}/index.ts`, source)
    addBarrelEntry(out, platform, { endpointName: name, module: `./${name}` })
  }
  /**
   * 序号非 0 的那些桶：各自单独渲一个 `_V<n>`，**不与 `_V0` 合并**。
   *
   * 「不合并」就是开发者选这个序号的全部意义 —— 合并器只看得见结构差异，看不见
   * 「这两种响应在业务上是不是同一件事」（见 `CorpusMetadata.shapeIndex`）。
   *
   * 判别式发现**只在序号 0 上跑**：那条路是「同一种响应的内部分支」，而序号说的是
   * 「这是另一种响应」—— 两件事叠在一起会产出一棵谁也读不懂的目录树。
   *
   * 按序号升序产出，于是 `index.ts` 里那个联合是 `_V0 | _V1 | _V2`（依次递增、确定性）。
   */
  const emitExtraShapes = (): void => {
    for (const [index, group] of [...successByIndex].sort(([left], [right]) => left - right)) {
      if (index === 0) continue
      const variant = `${name}_V${index}`
      const result = generateTypes(group.map(payloadOf), { rootName: variant, docs, banner: bannerOf(group) })
      out.files.set(`${platform}/${name}/${variant}.ts`, result.source)
      endpointImports.push(`import type { ${variant} } from './${variant}'`)
      successVariants.push(variant)
      for (const issue of result.docIssues) out.warnings.push(`${platform}/${endpoint}：注释 ${issue.path} —— ${issue.message}`)
      for (const finding of result.report.findings) {
        if (finding.needsDecision) out.warnings.push(`${platform}/${endpoint}：${finding.path} —— ${finding.message}`)
      }
      out.summary.push(`${platform}/${endpoint}：形状 ${index}（人选的），${group.length} 份样本合并成 ${variant}`)
    }
  }

  /** 错误方向的额外序号。与成功那边同一套规则，只是名字里多一个 `_Error` */
  const emitExtraErrorShapes = (): void => {
    for (const [index, group] of [...errorByIndex].sort(([left], [right]) => left - right)) {
      if (index === 0) continue
      const variant = `${name}_Error_V${index}`
      const result = generateTypes(group.map(payloadOf), { rootName: variant, docs, banner: bannerOf(group) })
      out.files.set(`${platform}/${name}/${variant}.ts`, result.source)
      endpointImports.push(`import type { ${variant} } from './${variant}'`)
      errorVariants.push(variant)
      for (const issue of result.docIssues) out.warnings.push(`${platform}/${endpoint}：注释 ${issue.path} —— ${issue.message}`)
      for (const finding of result.report.findings) {
        if (finding.needsDecision) out.warnings.push(`${platform}/${endpoint}：${finding.path} —— ${finding.message}`)
      }
      out.summary.push(`${platform}/${endpoint}：错误形状 ${index}（人选的），${group.length} 份样本合并成 ${variant}`)
    }
  }

  const bannerOf = (samples: readonly CorpusSample[]): string => {
    const provenance = renderProvenance({ platform, endpoint, samples, requests: input.requests })
    return provenance.length === 0 ? GENERATED_BANNER : [GENERATED_BANNER, '//', ...provenance.map((line) => `// ${line}`)].join('\n')
  }

  // 错误形状是**另一份接口响应类型**，不是成功类型的可选字段。
  // 放在成功分支之前：就算成功样本那边判别式失效、这一轮不产成功类型，已知的错误形状也不该跟着消失。
  if (errorPayloads.length > 0) {
    const errorRootName = `${name}_Error_V0`
    const result = generateTypes(errorPayloads, { rootName: errorRootName, docs, banner: bannerOf(errorUsed) })
    out.files.set(`${platform}/${name}/${errorRootName}.ts`, result.source)
    endpointImports.push(`import type { ${errorRootName} } from './${errorRootName}'`)
    errorVariants.push(errorRootName)
    for (const issue of result.docIssues) out.warnings.push(`${platform}/${endpoint}：注释 ${issue.path} —— ${issue.message}`)
    for (const finding of result.report.findings) {
      if (finding.needsDecision) out.warnings.push(`${platform}/${endpoint}：${finding.path} —— ${finding.message}`)
    }
    out.summary.push(`${platform}/${endpoint}：错误类型 ${errorPayloads.length} 份样本，合并成 ${errorRootName}`)
  }
  emitExtraErrorShapes()

  if (successPayloads.length === 0) {
    // 序号 0 没有样本，但人选过的其它序号仍然要产 —— 它们与 `_V0` 无关
    emitExtraShapes()
    writeEndpointIndex()
    if (successVariants.length === 0) out.summary.push(`${platform}/${endpoint}：没有成功样本，不产成功类型`)
    return
  }

  const forced = input.sidecar?.discriminantPath
  const auto = forced === undefined ? pickDiscriminant(findDiscriminants(successPayloads))?.path : undefined
  const discriminantPath = forced === false ? undefined : (forced ?? auto)
  const banner = bannerOf(used)

  if (discriminantPath !== undefined) {
    const declaredValues = input.sidecar?.declaredValues
    const result = emitDiscriminatedUnion(successPayloads, {
      endpoint: name,
      unionName: `${name}Union`,
      discriminantPath,
      docs,
      banner,
      ...(declaredValues === undefined ? {} : { declaredValues })
    })
    const origin = forced === undefined ? '（自动发现）' : '（sidecar 钉死）'
    // 产不出判别联合时成功类型一个文件都不产；错误类型已经在上面落好了，这里只写 endpoint barrel。
    if (result.blocked !== undefined) {
      emitExtraShapes()
      if (errorVariants.length > 0 || successVariants.length > 0) writeEndpointIndex()
      out.warnings.push(
        `${platform}/${endpoint}：判别式 ${discriminantPath}${origin}产不出判别联合 —— ${result.blocked}。` +
          '成功类型这一轮不产任何文件（barrel 里也不留那条 export）：产半个的后果是整棵树编译不过'
      )
      return
    }
    for (const [path, content] of result.files) out.files.set(`${platform}/${path}`, content)
    endpointImports.push(`import type { ${result.unionName} } from './guards'`)
    successVariants.push(result.unionName)
    emitExtraShapes()
    writeEndpointIndex()
    for (const issue of result.docIssues) out.warnings.push(`${platform}/${endpoint}：注释 ${issue.path} —— ${issue.message}`)
    const { declaredMissing, undeclared, unmatched } = result.coverage
    out.summary.push(
      `${platform}/${endpoint}：判别联合 ${discriminantPath}${origin}，${result.members.length} 个取值 / ${successPayloads.length} 份样本`
    )
    for (const note of result.notes) out.summary.push(`${platform}/${endpoint}：${note}`)
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
    if (unmatched.length > 0) {
      const hashes = unmatched.map((index) => used[index]?.metadata.paramsHash ?? `下标 ${index}`)
      out.warnings.push(
        `${platform}/${endpoint}：${unmatched.length} 份样本在 ${discriminantPath} 上读不到取值（${hashes.join(' / ')}），` +
          '没进任何一支 —— 要么判别式选错了，要么它们是个还没建模的变体'
      )
    }
    const decisions = new Map<string, { text: string; values: string[] }>()
    for (const member of result.members) {
      const value = String(member.value)
      for (const shape of member.shapes) {
        for (const finding of shape.report.findings) {
          if (!finding.needsDecision) continue
          const entry = decisions.get(`${finding.path}\u0000${finding.message}`)
          if (entry === undefined) {
            decisions.set(`${finding.path}\u0000${finding.message}`, { text: `${finding.path} —— ${finding.message}`, values: [value] })
          } else if (!entry.values.includes(value)) {
            entry.values.push(value)
          }
        }
      }
    }
    for (const { text, values } of decisions.values()) {
      out.warnings.push(`${platform}/${endpoint}：${text}（出现在 ${values.join(' / ')}）`)
    }
    return
  }

  const rootName = `${name}_V0`
  const result = generateTypes(successPayloads, { rootName, docs, banner })
  out.files.set(`${platform}/${name}/${rootName}.ts`, result.source)
  endpointImports.push(`import type { ${rootName} } from './${rootName}'`)
  successVariants.push(rootName)
  emitExtraShapes()
  writeEndpointIndex()
  for (const issue of result.docIssues) out.warnings.push(`${platform}/${endpoint}：注释 ${issue.path} —— ${issue.message}`)
  for (const finding of result.report.findings) {
    if (finding.needsDecision) out.warnings.push(`${platform}/${endpoint}：${finding.path} —— ${finding.message}`)
  }
  out.summary.push(`${platform}/${endpoint}：单类型，${result.typeNames.length} 个类型 / ${successPayloads.length} 份样本`)
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
