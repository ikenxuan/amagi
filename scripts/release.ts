import { execFileSync, execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import { versionBump } from 'bumpp'

/**
 * 本地发版入口：`pnpm run release`
 *
 * 流程：bumpp 交互式选版本并改写 `packages/core/package.json`（单发布包仓库，
 * 不开 `recursive`）→ 同步重生成 openapi 产物（`info.version` 跟着版本号走）
 * → 普通全量提交（`chore: release vX.Y.Z`，过 commit-msg 校验；pre-commit 钩子
 * 会改写 timestamp 并跑全量门禁）→ 打 `v*` tag → 推送分支与 tag。
 *
 * tag 推上去之后由 `.github/workflows/release.yml` 接管：changelogithub 建
 * GitHub Release → build → npm OIDC 发布 → GitHub Packages 镜像。
 * tag 就是发布按钮，所以跑这个脚本之前确认：人在 main、与远端同步、工作区干净。
 *
 * 为什么 git 操作不交给 bumpp：bumpp 的 commit 是「带路径提交」
 * （`git commit -- <file>`，见其 dist 的 gitCommit），git 对 partial commit
 * 会把钩子放进临时索引里跑 —— pre-commit 钩子改写的 timestamp 进了提交，
 * 但真实暂存区停留在提交前的快照，worktree / index 就此脱节
 * （2026-09-21 v7.0.0-beta.3 发版后出现的 `MM package.json` 幻影状态）。
 * 所以 bumpp 只用来选版本和改文件，git 步骤在下面手工编排。
 */
// 前置守卫：脚本会直接往 origin 推 tag、触发 npm 发布，PR 审查旁路不掉。
// 所以发版只允许在 main 上进行，且工作区必须干净、与远端同步 ——
// 在特性分支上误跑（比如协作者照着 README 试）会在这里被拦下，而不是把
// tag 推出去之后才在 Actions 里发现。
const gitOut = (args: string[]): string => execFileSync('git', args, { encoding: 'utf-8' }).trim()

const branch = gitOut(['rev-parse', '--abbrev-ref', 'HEAD'])
if (branch !== 'main') {
  console.error(`❌ 发版必须在 main 分支上进行（当前：${branch}）。先切回 main 再跑。`)
  process.exit(1)
}
if (gitOut(['status', '--porcelain']) !== '') {
  console.error('❌ 工作区有未提交改动。先提交或 stash，保持干净再发版。')
  process.exit(1)
}
execFileSync('git', ['fetch', 'origin', 'main'], { stdio: 'inherit' })
if (gitOut(['rev-parse', 'HEAD']) !== gitOut(['rev-parse', 'origin/main'])) {
  console.error('❌ 本地 main 与 origin/main 不同步。先 pull / push 对齐再发版。')
  process.exit(1)
}

await versionBump({
  files: ['packages/core/package.json'],
  commit: false,
  tag: false,
  push: false,
  confirm: true
})

// 从文件读回版本号，和 HEAD 比对：确认环节取消时 bumpp 不写文件，这里直接退出
const { version } = JSON.parse(readFileSync('packages/core/package.json', 'utf-8')) as { version: string }
const headVersion = JSON.parse(execFileSync('git', ['show', 'HEAD:packages/core/package.json'], { encoding: 'utf-8' })) as {
  version: string
}
if (version === headVersion.version) {
  console.log('版本号未变化，已取消发版')
  process.exit(0)
}
const tag = `v${version}`

// openapi 产物的 `info.version` 读 package.json，版本号变了要重生成并收进同一个
// release 提交 —— 否则 tag 里的 openapi.json 会比 package.json 落后一个版本号。
// 生成器走 shell（Windows 上 pnpm 是 .cmd，execFile 直调起不来）。
execSync('pnpm openapi', { stdio: 'inherit' })

execFileSync('git', [
  'add',
  'packages/core/package.json',
  'packages/core/openapi.json',
  'packages/core/src/server/response-schemas.generated.ts'
])
execFileSync('git', ['commit', '-m', `chore: release ${tag}`], { stdio: 'inherit' })
execFileSync('git', ['tag', tag])
execFileSync('git', ['push', 'origin', 'HEAD'], { stdio: 'inherit' })
execFileSync('git', ['push', 'origin', tag], { stdio: 'inherit' })

console.log(`✅ ${tag} 已提交并推送，发布进度见 https://github.com/ikenxuan/amagi/actions/workflows/release.yml`)
