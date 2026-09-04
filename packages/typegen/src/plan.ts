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

/** 一个端点的样本 → 文件。判别式自动发现，sidecar 里可以钉死 */
const planEndpoint = (input: CorpusEndpointInput, now: Date, out: PlanResult): void => {
  const { platform, endpoint } = input
  const payloads: JsonValue[] = []
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

  if (discriminantPath !== undefined) {
    const result = emitDiscriminatedUnion(payloads, { endpoint: name, unionName: `${name}Union`, discriminantPath, docs })
    for (const [path, content] of result.files) out.files.set(`${platform}/${path}`, content)
    for (const issue of result.docIssues) out.warnings.push(`${platform}/${endpoint}：注释 ${issue.path} —— ${issue.message}`)
    const missing = result.coverage.declaredMissing
    out.summary.push(
      `${platform}/${endpoint}：判别联合 ${discriminantPath}${forced === undefined ? '（自动发现）' : '（sidecar 钉死）'}，` +
        `${result.members.length} 个取值 / ${payloads.length} 份样本` +
        (missing.length > 0 ? `，声明了却没出现：${missing.join(' / ')}` : '')
    )
    return
  }

  const rootName = `${name}_V0`
  const result = generateTypes(payloads, { rootName, docs })
  out.files.set(`${platform}/${name}/${rootName}.ts`, result.source)
  out.files.set(`${platform}/${name}/index.ts`, `export type { ${rootName} } from './${rootName}'\n`)
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
  const out: PlanResult = { files: new Map(), warnings: [], summary: [] }
  const sorted = [...input.endpoints].sort((left, right) =>
    `${left.platform}/${left.endpoint}` < `${right.platform}/${right.endpoint}` ? -1 : 1
  )
  for (const endpoint of sorted) planEndpoint(endpoint, input.now, out)
  // 路径排序：产物要提交进 git 跑 `--check`，写盘顺序不能跟着目录遍历顺序变
  const files = new Map([...out.files.entries()].sort(([left], [right]) => (left < right ? -1 : 1)))
  return { files, warnings: out.warnings, summary: out.summary }
}
