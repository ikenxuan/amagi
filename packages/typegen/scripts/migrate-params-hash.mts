// `paramsHash` 从「脱敏后的假参数」改成「真参数」之后，本地已有样本怎么收场
// （`WEB-API-CONSOLE-PRD.md` 3.3 与第八节那条风险）。
//
//   pnpm --filter @ikenxuan/amagi-typegen migrate:params-hash            只报告
//   pnpm --filter @ikenxuan/amagi-typegen migrate:params-hash -- --delete  顺手删掉要重录的那几份
//
// **这个脚本迁移不了任何东西，它只能告诉你哪几份要重录**（名字叫 migrate 是名不副实的，
// 见下面那条改名建议）。而且这不是「只能迁移一半」—— 是**该改名的那一半恰好算不出新名字**：
//
// | | 新哈希算得出来吗 | 要改名吗 |
// |---|---|---|
// | 参数没被脱敏过 | 算得出（存的就是真值） | **不用** —— 新旧哈希本来就相同 |
// | 参数被脱敏过 | **算不出** —— 假值由原值的哈希派生（`scrub.ts` 的 `digestOf`），单向 | 要 |
//
// 两个集合不相交，所以「重命名」这个动作永远落不到实处：真参数在本地没有第二份拷贝，
// 既算不出新文件名，也没法把假值换回真值。出路只有一条：拿 `corpus/seeds.json` 加依赖图
// 重录（`pnpm record:corpus`）。`--delete` 不是迁移，是替重录清场。
//
// 好在需要重录的是少数：**脱敏清单里没有 `params.*` 的样本，存的参数就是真参数**
// （规则一条都没命中它，`scrubSample` 原样放过），于是新旧哈希相同、文件名一个字都不用动。
// 2026-09-05 实测本地 14 份：**10 份不用动、3 份要重录、1 份说不清**（原先这里写的 11 份是错的
// —— 它把说不清那份算成了不用动）。
//
// 判据的边界也写在这儿：它信的是 `metadata.scrub.replacements` 这份清单。清单是脱敏器自己
// 逐路径记的、没有条数上限（`MAX_SUSPECTS` 管的是 suspects 不是 replacements），
// 所以「没有 `params.*`」等于「参数上什么都没换过」。脚本额外还验一遍
// `hashParams(metadata.params)` 与文件名对不对得上 —— 对不上的样本在录完之后被人改过，
// 那种脚本不下结论，交给人。2026-09-05 那一份实测就是这么回事：
// `corpus/bilibili/commentReplies/92ce465b3012.json` 的 `metadata.params.oid` 是 `"21"`，
// 而文件名与它自己记的 `paramsHash` 都是 `{oid:"2",…}` 的哈希，`raw` 里也处处是 `oid=2`
// （`oid_str: "2"`）—— 录完之后被人手改了一个字符。不是脱敏、不是嵌套：
// `strippedParams` 是空的、清单里没有 `params.*`，而 `oid` 压根不命中 `scrub.ts` 的任何规则。
//
// 改名建议（要连 `package.json` 的 script 入口一起改，所以没在这一轮动）：
// `check-params-hash.mts` / `check:params-hash` —— 它做的全部事情是核对加报告。

import { readdirSync, readFileSync, rmdirSync, statSync, unlinkSync } from 'node:fs'
import { basename, dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { type CorpusSample, hashParams, type JsonValue } from '../src/index'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..', '..')
const CORPUS_DIR = join(ROOT, 'corpus')

/** 样本文件名就是参数哈希：12 位十六进制。这条顺手把 `seeds.json` / `*.doc.json` 排除掉 */
const SAMPLE_FILE = /^[0-9a-f]{12}\.json$/

const remove = process.argv.includes('--delete')

/** 一份样本的结论。三分而不是「要不要动」，因为第三类是「脚本不敢下结论」而不是「不用动」 */
type Kind =
  /** 参数没被脱敏过 ⇒ 真值 === 存的值 ⇒ 新哈希与文件名相同，什么都不用做 */
  | 'stable'
  /** 参数被脱敏过 ⇒ 真值不可逆 ⇒ 文件名必然变，只能重录 */
  | 'rerecord'
  /** 读不了、形状不对、或者文件名与 `metadata.params` 对不上 —— 交给人 */
  | 'unknown'

interface Row {
  /** 相对仓库根、`/` 分隔（跨平台可读） */
  path: string
  kind: Kind
  detail: string
}

const listDirs = (path: string): string[] => {
  try {
    return readdirSync(path)
      .filter((name) => statSync(join(path, name)).isDirectory())
      .sort()
  } catch {
    return []
  }
}

const rel = (full: string): string => relative(ROOT, full).split(sep).join('/')

const classify = (full: string): Row => {
  const path = rel(full)
  let sample: CorpusSample
  try {
    sample = JSON.parse(readFileSync(full, 'utf8')) as CorpusSample
  } catch (error) {
    return { path, kind: 'unknown', detail: `读不了：${error instanceof Error ? error.message : String(error)}` }
  }
  const params = sample.metadata?.params as Record<string, JsonValue> | undefined
  if (params === null || typeof params !== 'object' || Array.isArray(params)) {
    return { path, kind: 'unknown', detail: 'metadata.params 不是对象，这不是一份认得出的样本' }
  }
  const manifest = sample.metadata.scrub?.replacements ?? []
  const scrubbed = manifest.filter((item) => item.path === 'params' || item.path.startsWith('params.'))
  const expected = basename(full, '.json')
  const recomputed = hashParams(params)
  if (recomputed !== expected) {
    return { path, kind: 'unknown', detail: `文件名与 metadata.params 算出来的哈希（${recomputed}）对不上 —— 录完之后被改过？` }
  }
  if (scrubbed.length === 0) return { path, kind: 'stable', detail: '参数没有一处被脱敏，真值就是存的值' }
  return { path, kind: 'rerecord', detail: `脱敏过的参数：${scrubbed.map((item) => item.path).join(' / ')}` }
}

const rows: Row[] = []
for (const platform of listDirs(CORPUS_DIR)) {
  for (const endpoint of listDirs(join(CORPUS_DIR, platform))) {
    const dir = join(CORPUS_DIR, platform, endpoint)
    const files = readdirSync(dir).filter((name) => SAMPLE_FILE.test(name))
    for (const file of files.sort()) rows.push(classify(join(dir, file)))
  }
}

const of = (kind: Kind): Row[] => rows.filter((row) => row.kind === kind)
const stable = of('stable')
const rerecord = of('rerecord')
const unknown = of('unknown')

if (rows.length === 0) {
  console.log('corpus/ 里没有样本 —— 没有要迁移的东西（这台机器没录过，或者已经删干净了）')
} else {
  console.log(`corpus/ 里 ${rows.length} 份样本：不用动 ${stable.length} 份、要重录 ${rerecord.length} 份、说不清 ${unknown.length} 份\n`)
  // 这句要在报告里、不能只在文件头：读输出的人手上通常没有这个文件。
  // 「该改名的那一份恰好算不出新名字」的账见文件头那张表
  console.log('（这个脚本只核对与报告 —— 它迁移不了任何东西：要改名的那些，新文件名算不出来）\n')
  console.log(`✓ 不用动（${stable.length}）—— 参数一处都没被脱敏，真哈希与现在的文件名相同`)
  for (const row of stable) console.log(`   ${row.path}`)
  if (rerecord.length > 0) {
    console.log(`\n✗ 要重录（${rerecord.length}）—— 参数被脱敏过，真值不可逆，文件名一定会变`)
    for (const row of rerecord) console.log(`   ${row.path}  ${row.detail}`)
  }
  if (unknown.length > 0) {
    console.log(`\n? 说不清（${unknown.length}）—— 脚本不下结论，人看一眼`)
    for (const row of unknown) console.log(`   ${row.path}  ${row.detail}`)
  }
}

if (rerecord.length > 0) {
  if (remove) {
    for (const row of rerecord) {
      const full = join(ROOT, row.path)
      unlinkSync(full)
      // 端点目录空了就一起删：留个空目录只会让人以为「这个端点录过」。
      // `<端点>.doc.json` 在目录**外面**，不受影响
      const dir = dirname(full)
      if (readdirSync(dir).length === 0) rmdirSync(dir)
    }
    console.log(`\n已删掉 ${rerecord.length} 份。重录：pnpm record:corpus（真参数从 corpus/seeds.json 与依赖图来）`)
  } else {
    console.log('\n这些样本的文件名已经与新的哈希算法不一致了。两条出路：')
    console.log('   1. 直接重录覆盖：pnpm record:corpus —— 新样本会落在新文件名上，旧的那份留成孤儿')
    console.log('   2. 先删再录：本脚本加 --delete，然后 pnpm record:corpus')
    console.log('   在此之前 gen:types 仍然能跑（它读的是文件内容，不校验文件名与参数的对应关系）')
    // 退出码 1 = 「还有事没做完」。加了 --delete 并删完之后就是 0，能串在 shell 里用
    process.exitCode = 1
  }
}
// 说不清的那几份任何时候都要人过一眼，所以它单独把退出码顶成 1
if (unknown.length > 0) process.exitCode = 1
