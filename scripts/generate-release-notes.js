#!/usr/bin/env node

import { execSync } from 'child_process'

// 获取命令行参数
const args = process.argv.slice(2)
const newVersion = args[0]

if (!newVersion) {
  console.error('❌ 请提供版本号')
  console.error('用法: node scripts/generate-release-notes.js <version>')
  process.exit(1)
}

// 获取上一个 tag
let previousTag
try {
  previousTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim()
  console.log(`📌 上一个版本: ${previousTag}`)
} catch {
  console.log('⚠️  没有找到之前的 tag')
  previousTag = null
}

console.log(`📌 新版本: v${newVersion}`)

// 获取 commits
const range = previousTag ? `${previousTag}..HEAD` : 'HEAD'
const commitsRaw = execSync(`git log ${range} --pretty=format:"%H|||%s|||%an" --no-merges`, {
  encoding: 'utf-8'
}).trim()

if (!commitsRaw) {
  console.log('⚠️  没有找到新的提交')
  process.exit(0)
}

const commits = commitsRaw.split('\n').filter(Boolean)

console.log(`📝 找到 ${commits.length} 个提交\n`)

// 分类 commits
const categories = {
  '✨ 新功能': [],
  '🐛 错误修复': [],
  '⚡️ 性能优化': [],
  '♻️ 代码重构': [],
  '📝 文档更新': [],
  '🎨 代码样式': [],
  '✅ 测试': [],
  '📦️ 构建系统': [],
  '🎡 持续集成': [],
  '🧰 其他更新': [],
  '⏪️ 回退': []
}

const typeMap = {
  feat: '✨ 新功能',
  fix: '🐛 错误修复',
  perf: '⚡️ 性能优化',
  refactor: '♻️ 代码重构',
  docs: '📝 文档更新',
  style: '🎨 代码样式',
  test: '✅ 测试',
  build: '📦️ 构建系统',
  ci: '🎡 持续集成',
  chore: '🧰 其他更新',
  revert: '⏪️ 回退'
}

const breakingChanges = []

commits.forEach(commit => {
  const [hash, subject] = commit.split('|||')

  // 跳过 release commits
  if (subject.startsWith('chore(release):')) {
    return
  }

  // 解析 conventional commit
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/)

  if (!match) {
    return // 跳过不符合规范的 commit
  }

  const [, type, scope, breaking, description] = match
  const category = typeMap[type]

  if (!category) {
    return // 跳过未知类型
  }

  const shortHash = hash.substring(0, 7)
  const scopeText = scope ? `**${scope}**: ` : ''
  const commitUrl = `https://github.com/ikenxuan/amagi/commit/${hash}`

  const line = `* ${scopeText}${description} ([${shortHash}](${commitUrl}))`

  categories[category].push(line)

  // 检查 breaking changes
  if (breaking) {
    breakingChanges.push({
      description: `${scopeText}${description}`,
      hash: shortHash
    })
  }
})

// 生成 markdown
let markdown = ''

// 添加比较链接
if (previousTag) {
  markdown += `## [${newVersion}](https://github.com/ikenxuan/amagi/compare/${previousTag}...v${newVersion}) (${new Date().toISOString().split('T')[0]})\n\n`
} else {
  markdown += `## ${newVersion} (${new Date().toISOString().split('T')[0]})\n\n`
}

// Breaking Changes
if (breakingChanges.length > 0) {
  markdown += '### ⚠ BREAKING CHANGES\n\n'
  breakingChanges.forEach(change => {
    markdown += `* ${change.description} ([${change.hash}](https://github.com/ikenxuan/amagi/commit/${change.hash}))\n`
  })
  markdown += '\n'
}

// 其他分类
Object.entries(categories).forEach(([category, items]) => {
  if (items.length > 0) {
    markdown += `### ${category}\n\n`
    items.forEach(item => {
      markdown += `${item}\n`
    })
    markdown += '\n'
  }
})

// 输出
console.log('─'.repeat(80))
console.log(markdown)
console.log('─'.repeat(80))

// 写入标准输出供 GitHub Actions 使用
process.stdout.write(markdown)
