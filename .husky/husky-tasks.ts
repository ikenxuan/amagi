import fs from 'node:fs'
import path from 'node:path'

/**
 * 更新核心包的 timestamp 字段
 * @description 用于 pre-commit 钩子
 */
const updateTimestamp = (): void => {
  const corePkgPath = path.join('packages', 'core', 'package.json')
  if (fs.existsSync(corePkgPath)) {
    const content = JSON.parse(fs.readFileSync(corePkgPath, 'utf-8'))
    content.timestamp = new Date().toISOString()
    fs.writeFileSync(corePkgPath, JSON.stringify(content, null, 2))
    console.log('🕒 已更新 timestamp 字段')
  }
}

/**
 * 校验提交信息格式是否符合 release-please 的 changelog 类型
 * @description 用于 commit-msg 钩子
 */
const checkCommitType = (commitMsgFile: string): void => {
  const configPath = path.resolve('.release-please-config.json')
  if (!fs.existsSync(configPath)) {
    console.error('⚠️ 未找到 .release-please-config.json，无法验证提交信息类型')
    process.exit(1)
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  const allowedTypes: string[] = (config['changelog-sections'] ?? []).map((s: any) => s.type)
  if (!allowedTypes.length) {
    console.error('⚠️ .release-please-config.json 中未找到 changelog-sections')
    process.exit(1)
  }

  const commitMsg = fs.readFileSync(commitMsgFile, 'utf-8').trim()
  
  // 允许的特殊提交类型（Git 自动生成的提交）
  const specialCommitPatterns = [
    /^Merge\s+/,                    // Git merge 提交
    /^Revert\s+/,                   // Git revert 提交
    /^Initial\s+commit/,            // 初始提交
    /^Merge\s+pull\s+request\s+/,   // GitHub PR merge 提交
    /^Merge\s+branch\s+/,           // Git branch merge 提交
  ]
  
  // 检查是否为特殊提交类型
  const isSpecialCommit = specialCommitPatterns.some(pattern => pattern.test(commitMsg))
  if (isSpecialCommit) {
    console.log(`✅ 特殊提交类型通过验证：${commitMsg}`)
    return
  }
  
  // 检查常规提交类型格式
  const typePattern = new RegExp(`^(${allowedTypes.join('|')})(\\(.+\\))?:`)
  if (!typePattern.test(commitMsg)) {
    console.error(
      `❌ 提交失败：必须以以下类型之一开头 (${allowedTypes.join(', ')})。示例: feat: 新增功能`
    )
    process.exit(1)
  }

  console.log(`✅ 提交信息合法：${commitMsg}`)
}

/**
 * 根据运行上下文执行对应任务
 */
const main = (): void => {
  const arg = process.argv[2]

  if (!arg) {
    updateTimestamp()
  } else if (arg.endsWith('COMMIT_EDITMSG')) {
    checkCommitType(arg)
  } else {
    console.warn('⚠️ 未识别的运行模式，仅执行默认任务')
    updateTimestamp()
  }
}

main()
