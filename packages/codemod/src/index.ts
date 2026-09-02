// @ikenxuan/amagi-codemod 公共入口（仅仓库内使用，不发布）
//
//   transformSource(text)        单份源码文本的 v6→v7 文本变换
//   runCodemod(dirOrFile)        遍历目录/文件执行变换并写回，返回聚合报告
//
// 变换规则见 06-migration「codemod」节，实现细节在 ./transforms。

import { existsSync, lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'

import { transformFile } from './transforms'
import type { Change } from './transforms'

export { transformFile, transformSource } from './transforms'
export { TODO_API_ROUTES, TODO_LOOSE, TODO_R_CODE, TODO_VALIDATION } from './transforms'
export type { Change, RuleName, TransformResult } from './transforms'

export interface FileReport {
  file: string
  changed: boolean
  changes: Change[]
  /** 本文件真正新注入的 TODO 条数（已存在的不重复计入） */
  todoCount: number
}

export interface RunReport {
  root: string
  files: number
  changedFiles: number
  /** 规则命中总数。含「只检测不改码」的规则（r-code-read），故可能 > 0 而 changedFiles === 0 */
  totalChanges: number
  totalTodos: number
  details: FileReport[]
}

const SOURCE_FILE_RE = /\.(ts|tsx)$/
const SKIP_DIRS = new Set(['node_modules', 'dist'])

function collectSources(entry: string, acc: string[]): void {
  if (!existsSync(entry)) {
    throw new Error(`路径不存在: ${entry}`)
  }
  const stat = lstatSync(entry)
  if (stat.isFile()) {
    acc.push(entry)
    return
  }
  if (!stat.isDirectory()) return
  for (const dirent of readdirSync(entry, { withFileTypes: true })) {
    if (dirent.isDirectory()) {
      if (SKIP_DIRS.has(dirent.name) || dirent.name.startsWith('.')) continue
      collectSources(join(entry, dirent.name), acc)
    } else if (dirent.isFile() && SOURCE_FILE_RE.test(dirent.name)) {
      acc.push(join(entry, dirent.name))
    }
  }
}

export function runCodemod(target: string): RunReport {
  const root = resolve(target)
  const sources: string[] = []
  collectSources(root, sources)

  const details: FileReport[] = []
  let changedFiles = 0
  let totalChanges = 0
  let totalTodos = 0

  for (const file of sources) {
    const source = readFileSync(file, 'utf8')
    const r = transformFile(source)
    const todoCount = r.injected.length
    if (r.changed) {
      writeFileSync(file, r.code, 'utf8')
      changedFiles += 1
    }
    totalChanges += r.changes.reduce((n, c) => n + c.count, 0)
    totalTodos += todoCount
    details.push({
      file: relative(root, file) || basename(file),
      changed: r.changed,
      changes: r.changes,
      todoCount
    })
  }

  return { root, files: sources.length, changedFiles, totalChanges, totalTodos, details }
}
