/**
 * 响应类型体积门禁。
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
 * 它刻意**不**检查 `dist/`：那要求先跑 build，而门禁应该能在不构建的情况下跑。
 * 源码行数与产物体积是单调相关的，卡源码就够。
 *
 * 用法：`pnpm --filter @ikenxuan/amagi run types:size`（`--json` 输出机器可读结果）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** 响应类型根目录（相对 packages/core） */
const ROOT = 'src/types/ReturnDataType'

/**
 * 预算。**这是棘轮，不是目标** —— 只在有意识的决定下往上调，
 * 并且要在提交信息里写清为什么。
 *
 * 留的余量是刻意小的（总量约 +10%、单文件约 +8%）：余量给得大，门禁就形同虚设。
 */
const BUDGET = {
  /** 总行数上限。基线 26,974（2026-09-04） */
  totalLines: 29_500,
  /** 单文件行数上限。基线最大 2,314（`Douyin/UserLiveVideos_V0.ts`） */
  fileLines: 2_500,
  /** 文件数上限。基线 156 */
  fileCount: 200
} as const

/** 递归收集 `.ts` 文件 */
const collect = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) collect(full, out)
    else if (entry.endsWith('.ts')) out.push(full)
  }
  return out
}

const files = collect(ROOT).map((path) => ({
  path: relative(ROOT, path).split(sep).join('/'),
  lines: readFileSync(path, 'utf8').split('\n').length
}))

const totalLines = files.reduce((sum, f) => sum + f.lines, 0)
const oversized = files.filter((f) => f.lines > BUDGET.fileLines)
const largest = [...files].sort((a, b) => b.lines - a.lines).slice(0, 5)

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ fileCount: files.length, totalLines, largest, budget: BUDGET }, null, 2))
} else {
  console.log(`响应类型体积：${files.length} 文件 / ${totalLines.toLocaleString('en-US')} 行`)
  console.log(`预算：文件 ≤ ${BUDGET.fileCount}、总行 ≤ ${BUDGET.totalLines.toLocaleString('en-US')}、单文件 ≤ ${BUDGET.fileLines}`)
  console.log('最大的 5 个：')
  for (const f of largest) console.log(`  ${String(f.lines).padStart(5)}  ${f.path}`)
}

const failures: string[] = []
if (files.length > BUDGET.fileCount) failures.push(`文件数 ${files.length} 超过预算 ${BUDGET.fileCount}`)
if (totalLines > BUDGET.totalLines) failures.push(`总行数 ${totalLines} 超过预算 ${BUDGET.totalLines}`)
for (const f of oversized) failures.push(`${f.path} 有 ${f.lines} 行，超过单文件预算 ${BUDGET.fileLines}`)

if (failures.length > 0) {
  console.error('\n❌ 响应类型体积超预算：')
  for (const f of failures) console.error(`  - ${f}`)
  console.error('\n涨是允许的，但必须是有意识的决定：改 scripts/check-type-size.mts 里的 BUDGET，')
  console.error('并在提交信息里写清为什么涨。别把余量调大到门禁形同虚设。')
  process.exitCode = 1
} else {
  console.log('\n✅ 在预算内')
}
