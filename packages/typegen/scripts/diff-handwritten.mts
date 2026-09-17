// 「生成 vs 手写」逐字段差异清单（PRD 阶段 0 的决策依据 / 阶段 4 每个端点迁移前要过的那张表）。
//
//   pnpm types:diff <生成产物路径> <手写类型路径>
//   pnpm types:diff packages/response-types/src/generated/bilibili/Comments/Comments_V0.ts \
//                   packages/core/src/types/ReturnDataType/Bilibili/WorkComments/WorkComments_V0.ts
//
// （生成树 2026-09-04 起独立成包 —— 旧路径 `packages/core/src/types/generated/` 已经不存在，
// 照抄那一行跑不通。）
//
// 比的是**路径**而不是类型名 —— 两边的类型名根本对不上（手写那份顶层叫 WorkComments_V0、
// 子类型叫 Reply / Member / PurpleDesc，生成那份叫 Comments_V0 / Data / Reply），
// 按名字比只会得出「几十个类型只在一边」这种废话。路径是结构性的，名字怎么起都不影响。
//
// 差异分四类，需要人决策的只有一类：
//
//   only-handwritten  手写有、生成没有 —— **这一类要人看**：是这轮样本没覆盖到，还是平台已经删了？
//   only-generated    生成有、手写没有 —— 手写类型漏了字段，正是这套方案要解决的问题
//   type              两边类型不一样 —— 通常是手写把 `string | null` 写成了 `string`
//   optionality       两边可选性不一样 —— 样本量不够时生成的会偏「必需」

import { readFileSync } from 'node:fs'

import { diffFlattened, type FieldDiff, flattenTypeSource } from '../src/index'

const [generatedPath, handwrittenPath] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
if (generatedPath === undefined || handwrittenPath === undefined) {
  console.error('用法：pnpm types:diff <生成产物路径> <手写类型路径>')
  process.exit(1)
}

const read = (path: string): string => {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    console.error(`读不了 ${path}`)
    process.exit(1)
  }
}

const generated = flattenTypeSource(read(generatedPath))
const handwritten = flattenTypeSource(read(handwrittenPath))
const { diffs, same, counts } = diffFlattened(generated, handwritten)

const total = same + diffs.length
console.log(`生成 ${generated.fields.size} 个字段 / 手写 ${handwritten.fields.size} 个字段`)
console.log(`一致 ${same} / ${total}（${total === 0 ? 0 : Math.round((same / total) * 100)}%）`)
console.log(
  `差异 ${diffs.length}：只有生成的有 ${counts['only-generated']}、只有手写的有 ${counts['only-handwritten']}、` +
    `类型不同 ${counts.type}、可选性不同 ${counts.optionality}`
)
for (const paths of [generated.recursive, handwritten.recursive]) {
  for (const path of paths) console.log(`   ↺ ${path}：类型自引用，摊到这里停下（不影响比对，但那底下没比）`)
}

const label: Record<FieldDiff['kind'], string> = {
  'only-handwritten': '手写独有',
  'only-generated': '生成独有',
  type: '类型不同',
  optionality: '可选性'
}

// 「手写独有」排最前：它是唯一需要人决策的一类
const order: FieldDiff['kind'][] = ['only-handwritten', 'type', 'optionality', 'only-generated']
for (const kind of order) {
  const group = diffs.filter((diff) => diff.kind === kind)
  if (group.length === 0) continue
  console.log(`\n── ${label[kind]}（${group.length}）`)
  for (const diff of group) {
    const detail =
      diff.kind === 'only-handwritten'
        ? `手写：${diff.handwritten}`
        : diff.kind === 'only-generated'
          ? `生成：${diff.generated}`
          : `生成 ${diff.generated} ｜ 手写 ${diff.handwritten}`
    console.log(`   ${diff.path}  —  ${detail}`)
  }
}
