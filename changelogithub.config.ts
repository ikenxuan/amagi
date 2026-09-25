// changelogithub 生成 GitHub Release notes 时的分组配置 —— CI 里 `pnpx changelogithub`
// 那步（.github/workflows/release.yml）会从仓库根读它。
//
// 为什么需要这份文件：changelogithub 默认只收录三类提交 —— feat / fix / perf，其余
// chore / docs / refactor / test / style / ci / build / revert 一律被丢弃，压根不进
// release notes。这正是「明明有一堆 chore/docs/refactor 提交，Release 里却只有 feat
// 和 fix」的原因。想让某个前缀出现在 Release 里，就在下面 `types` 里给它一个标题。
//
// 这里的键与 `.husky/husky-tasks.ts` 的 ALLOWED_TYPES 逐一对齐（conventional commits
// 的完整 11 类）—— 提交时钩子放行的类型，发版时这里就全都收得住，两边口径一致。
// 分组顺序就是这里键的书写顺序；chore 垫底，因为每次发版那条 `chore: release vX.Y.Z`
// 也会落进它。

export default {
  types: {
    feat: { title: '🚀 Features' },
    fix: { title: '🐞 Bug Fixes' },
    perf: { title: '🏎 Performance' },
    refactor: { title: '♻️ Refactors' },
    docs: { title: '📝 Documentation' },
    build: { title: '📦 Build' },
    test: { title: '✅ Tests' },
    ci: { title: '🤖 CI' },
    style: { title: '🎨 Styles' },
    revert: { title: '⏪ Reverts' },
    chore: { title: '🧹 Chores' }
  }
}
