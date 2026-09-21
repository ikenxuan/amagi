import { versionBump } from 'bumpp'

/**
 * 本地发版入口：`pnpm run release`
 *
 * 交互式选择新版本 → 只改 `packages/core/package.json`（这是单发布包仓库，
 * 不开 `recursive`，不碰其它 `private` 包）→ 以 conventional commit 提交
 * （`chore: release vX.Y.Z`，过 commit-msg 钩子的类型校验）→ 打 `v*` tag
 * → 连同 tag 一起 push。
 *
 * tag 推上去之后由 `.github/workflows/release.yml` 接管：changelogithub 建
 * GitHub Release → build → npm OIDC 发布 → GitHub Packages 镜像。
 * tag 就是发布按钮，所以跑这个脚本之前确认：人在 main、与远端同步、工作区干净。
 *
 * 为什么不是 release-please：见 `.github/workflows/release.yml` 的头部注释。
 */
const { newVersion } = await versionBump({
  files: ['packages/core/package.json'],
  commit: 'chore: release {tag}',
  tag: true,
  push: true,
  confirm: true
})

console.log(`✅ v${newVersion} 已提交并推送，发布进度见 https://github.com/ikenxuan/amagi/actions/workflows/release.yml`)
