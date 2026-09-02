#!/usr/bin/env tsx
// v6 → v7 codemod CLI
//
// 本地（仓库内，不发布）运行方式：
//   pnpm exec tsx packages/codemod/src/cli.ts v6-to-v7 <dir|file>
// 或经 bin 链接后：
//   amagi-codemod v6-to-v7 src/
//
// 遍历目录递归找 .ts/.tsx（跳过 node_modules/dist/隐藏目录），逐文件变换后打印报告。
// 被改动文件就地写回 —— 跑之前先备份或先对副本运行。

import { existsSync } from 'node:fs'
import { lstatSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { runCodemod } from './index'
import type { Change } from './index'

const USAGE = `用法:
  amagi-codemod v6-to-v7 <dir|file>

把 @ikenxuan/amagi 消费方的 v6 调用面改写为 v7，
剩余人工项在文件头标注 // TODO(amagi-v7:)。

示例:
  amagi-codemod v6-to-v7 src/
  amagi-codemod v6-to-v7 client/douyin.ts`

function renderChanges(changes: Change[]): string {
  return changes.map((c) => `${c.rule}×${c.count}`).join(' ')
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE)
    return
  }
  const [subcommand, target] = args
  if (subcommand !== 'v6-to-v7' || !target) {
    console.error(USAGE)
    process.exitCode = 1
    return
  }
  if (!existsSync(target) || (!lstatSync(target).isDirectory() && !lstatSync(target).isFile())) {
    console.error(`路径不存在或不可访问: ${target}`)
    process.exitCode = 1
    return
  }

  try {
    const report = runCodemod(target)
    console.log(`\nv6→v7 迁移报告（06-migration「codemod」节）\n`)
    for (const f of report.details) {
      if (!f.changed) continue
      console.log(
        `  ${f.file}\n    替换 ${f.changes.reduce((n, c) => n + c.count, 0)} 处  TODO ${f.todoCount} 条  [${renderChanges(f.changes)}]`
      )
    }
    console.log(
      `\n完成：扫描 ${report.files} 个文件，改写 ${report.changedFiles} 个，` +
        `共 ${report.totalChanges} 处文本变更，注入 ${report.totalTodos} 条 // TODO(amagi-v7:)\n`
    )
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
