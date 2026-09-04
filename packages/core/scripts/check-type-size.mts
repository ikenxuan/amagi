/**
 * 响应类型体积门禁。**量两棵树**：手写的与生成的。
 *
 * 为什么需要它：`types/ReturnDataType/` 是全仓最大的一块（156 文件 / 约 2.7 万行，
 * 占 `types/` 全目录的 97%），编译产物 `dist/*.d.ts` 已经接近 **790 KB** ——
 * 那是每个下游 `tsc` 都要读一遍的东西。而响应类型自动化（见
 * `RESPONSE-TYPE-AUTOGEN-PRD.md` 的「十、风险」）会让这个数字很容易翻几倍：
 * 全自动 + 多变体 + 判别联合，一次生成就能把 2.7 万行变成十万行，而且没人会察觉。
 *
 * 所以这道门禁是给**将来**准备的：现在的数字就是基线，涨了必须是有意识的决定
 * （改预算 + 在提交信息里说清为什么），不能悄悄涨上去。
 *
 * **两棵树的门禁性质不一样，别把它们的预算当成一回事**：
 * - 手写树（`core/src/types/ReturnDataType`）是**棘轮**：它只该不变或变小
 *   （生成产物逐个替换掉它），所以余量刻意小。
 * - 生成树（`packages/response-types/src/generated`）**正在长**：端点覆盖 12/61，
 *   补样本必然让总行数涨，所以总量那条是「松上限」而不是棘轮。
 *   这棵树上**真正有意义的是单文件上限** —— 它才是能抓住「一次生成炸出十万行」
 *   那类事故的那条线。快手 `emojiList` 的 `iconUrls` 就是活例子：映射形状没收成索引签名时
 *   一个端点产出 665 行、占当批产物的 64%，而收掉之后只剩 21 行。
 *
 * 它刻意**不**检查 `dist/`：那要求先跑 build，而门禁应该能在不构建的情况下跑。
 * 源码行数与产物体积是单调相关的，卡源码就够。
 *
 * 用法：`pnpm --filter @ikenxuan/amagi run types:size`（`--json` 输出机器可读结果）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** 一棵树的预算。**是棘轮还是松上限，看 `ratchet`** —— 报告里会照这个措辞 */
interface TreeBudget {
  /** 报告里的显示名 */
  readonly label: string
  /** 相对 `packages/core` 的路径 */
  readonly root: string
  /** 总行数上限 */
  readonly totalLines: number
  /** 单文件行数上限 */
  readonly fileLines: number
  /** 文件数上限 */
  readonly fileCount: number
  /** true = 只该不变或变小；false = 预期会长，总量是松上限、单文件才是真门 */
  readonly ratchet: boolean
}

/**
 * 预算。**改这里要在提交信息里写清为什么。**
 *
 * 手写树留的余量是刻意小的（总量约 +10%、单文件约 +8%）：余量给得大，门禁就形同虚设。
 */
const BUDGETS: readonly TreeBudget[] = [
  {
    label: '手写',
    root: 'src/types/ReturnDataType',
    // 实测 27,249 行 / 162 文件 / 最大 2,315（`Douyin/UserLiveVideos_V0.ts`），2026-09-04
    totalLines: 29_500,
    fileLines: 2_500,
    fileCount: 200,
    ratchet: true
  },
  {
    label: '生成',
    root: '../response-types/src/generated',
    // 实测 2,437 行 / 28 文件 / 最大 809（`bilibili/Comments/Comments_V0.ts`），2026-09-04。
    // 总量与文件数按「61 个端点全覆盖」预留（当前 12 个）—— 它们是松上限，用来拦
    // 「一次生成炸出十万行」，不是用来拦正常的覆盖增长。
    // 单文件 1,200 是真门：手写的 `WorkComments_V0.ts` 1,928 行是 quicktype 时代的产物，
    // 生成器有结构等价复用与映射收索引签名，同一个端点不该比它更胖。
    totalLines: 40_000,
    fileLines: 1_200,
    fileCount: 400,
    ratchet: false
  }
]

/** 递归收集 `.ts` 文件 */
const collect = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) collect(full, out)
    else if (entry.endsWith('.ts')) out.push(full)
  }
  return out
}

interface TreeResult {
  readonly budget: TreeBudget
  readonly fileCount: number
  readonly totalLines: number
  readonly largest: readonly { path: string; lines: number }[]
  readonly failures: readonly string[]
}

const measure = (budget: TreeBudget): TreeResult => {
  // 树不存在不算失败：`response-types` 的生成树在 corpus 为空时就是空的，
  // 而那是个合法状态（`pnpm gen:types` 会如实说「还没有样本」）
  let paths: string[]
  try {
    paths = collect(budget.root)
  } catch {
    paths = []
  }
  const files = paths.map((path) => ({
    path: relative(budget.root, path).split(sep).join('/'),
    lines: readFileSync(path, 'utf8').split('\n').length
  }))
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0)
  const failures: string[] = []
  if (files.length > budget.fileCount) failures.push(`${budget.label}：文件数 ${files.length} 超过预算 ${budget.fileCount}`)
  if (totalLines > budget.totalLines) failures.push(`${budget.label}：总行数 ${totalLines} 超过预算 ${budget.totalLines}`)
  for (const f of files.filter((file) => file.lines > budget.fileLines)) {
    failures.push(`${budget.label}：${f.path} 有 ${f.lines} 行，超过单文件预算 ${budget.fileLines}`)
  }
  return {
    budget,
    fileCount: files.length,
    totalLines,
    largest: [...files].sort((a, b) => b.lines - a.lines).slice(0, 5),
    failures
  }
}

const results = BUDGETS.map(measure)

if (process.argv.includes('--json')) {
  console.log(
    JSON.stringify(
      results.map((r) => ({
        label: r.budget.label,
        root: r.budget.root,
        fileCount: r.fileCount,
        totalLines: r.totalLines,
        largest: r.largest,
        budget: r.budget
      })),
      null,
      2
    )
  )
} else {
  for (const r of results) {
    const kind = r.budget.ratchet ? '棘轮' : '松上限（这棵树预期会随端点覆盖增长）'
    console.log(`${r.budget.label}响应类型：${r.fileCount} 文件 / ${r.totalLines.toLocaleString('en-US')} 行  —— ${kind}`)
    console.log(
      `  预算：文件 ≤ ${r.budget.fileCount}、总行 ≤ ${r.budget.totalLines.toLocaleString('en-US')}、单文件 ≤ ${r.budget.fileLines}`
    )
    if (r.fileCount === 0) {
      console.log('  （这棵树是空的）')
      continue
    }
    console.log('  最大的 5 个：')
    for (const f of r.largest) console.log(`  ${String(f.lines).padStart(7)}  ${f.path}`)
  }
}

const failures = results.flatMap((r) => r.failures)

if (failures.length > 0) {
  console.error('\n❌ 响应类型体积超预算：')
  for (const f of failures) console.error(`  - ${f}`)
  console.error('\n涨是允许的，但必须是有意识的决定：改 scripts/check-type-size.mts 里的 BUDGETS，')
  console.error('并在提交信息里写清为什么涨。别把余量调大到门禁形同虚设。')
  console.error('生成树的**单文件**超了先别急着调预算 —— 那通常是生成器该收的形状没收')
  console.error('（映射表没收成索引签名、结构等价没复用），调预算会把真问题盖住。')
  process.exitCode = 1
} else {
  console.log('\n✅ 两棵树都在预算内')
}
