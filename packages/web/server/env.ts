/**
 * `.env` 的读写。**控制台唯一会把凭证写到盘上的地方。**
 *
 * 为什么要有这一层：cookie 原先只能从环境变量读，于是「换一个账号」意味着关掉服务、
 * 改 shell 的 export、重开。而换账号是这个工具的日常动作（不同平台、过期重登）。
 *
 * 三条安全约定，都不是可选项：
 *
 * 1. **写之前先确认 `.env` 真的被 git 忽略。** 不确认就写等于可能把 cookie 提交上去 ——
 *    而那是不可撤销的。判据是读 `.gitignore` 找 `.env` 那条规则，找不到就拒绝写并说清原因。
 * 2. **读出来的值一个字都不回给前端。** `describeCookies` 只回「有没有、多长、什么时候写的」。
 *    长度也有用（`sessionid=…` 少一截时看得出来），而值本身在页面上没有任何用途。
 * 3. **重写时保留文件里其它的行**（包括注释与空行）。`.env` 是人手改的文件，
 *    整体覆盖会把别人写的东西吃掉。
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { ROOT } from './storage'

/** `.env` 与它的模板。都在仓库根 —— `record-corpus.mts` 那套脚本也读同一份 */
export const ENV_FILE = join(ROOT, '.env')
export const ENV_EXAMPLE_FILE = join(ROOT, '.env.example')

/** cookie 的环境变量名。`AMAGI_COOKIE_<平台大写>`，与 `record-corpus.mts` 同一条惯例 */
export const cookieEnvName = (platform: string): string => `AMAGI_COOKIE_${platform.toUpperCase()}`

/**
 * `.env` 到底被 git 忽略了吗。
 *
 * **写凭证之前必须问这一句。** 判据是 `.gitignore` 里有一条**光秃秃的 `.env`**
 * （不带路径、不带通配）—— 那是唯一能保证「任何层级的 .env 都不进 git」的写法。
 * `.env.local` 这类更具体的规则**不算**：它们保不住 `.env` 本身。
 *
 * 故意不去 `git check-ignore` 跑子进程：那要求装了 git 且在仓库里，
 * 而读一个文本文件在任何环境下都成立。代价是读不出 `.gitignore` 里的花式写法，
 * 但那一侧是安全的（读不出就当没忽略、拒绝写）。
 */
export const envIsGitIgnored = (gitignore: string = join(ROOT, '.gitignore')): boolean => {
  try {
    const lines = readFileSync(gitignore, 'utf8').split('\n')
    return lines.some((line) => line.trim() === '.env' || line.trim() === '/.env')
  } catch {
    return false
  }
}

/** 一行 `.env`：`KEY=value`。`#` 开头与空行不算 */
const parseLine = (line: string): { key: string; value: string } | undefined => {
  const trimmed = line.trim()
  if (trimmed === '' || trimmed.startsWith('#')) return undefined
  const eq = trimmed.indexOf('=')
  if (eq <= 0) return undefined
  const key = trimmed.slice(0, eq).trim()
  let value = trimmed.slice(eq + 1).trim()
  // 去掉包裹的引号（人手写时常加，而 cookie 里有分号所以确实该加）。
  //
  // **双引号那一支要反转义**，这是写与读必须对称的地方：`patchEnvFile` 写的时候把
  // `\` 换成 `\\`、`"` 换成 `\"`，只剥引号不反转义就会让往返对不上 ——
  // 原先就是这样，一个带引号的值写进去再读出来会多出反斜杠。
  // 单引号那一支照 dotenv 的惯例**不做**转义处理（单引号里是字面量）。
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1).replace(/\\(["\\])/g, '$1')
  } else if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    value = value.slice(1, -1)
  }
  return { key, value }
}

/** 读 `.env`，返回键值表。文件不存在就是空表（不是错误） */
export const readEnvFile = (file: string = ENV_FILE): Record<string, string> => {
  if (!existsSync(file)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const parsed = parseLine(line)
    if (parsed !== undefined) out[parsed.key] = parsed.value
  }
  return out
}

/**
 * 把 `.env` 里的一批键改掉，**其余行原样保留**。
 *
 * 值一律用双引号包起来：cookie 里有 `;` 与空格，不包的话很多 `.env` 解析器会截断。
 * 值里的 `"` 与 `\` 转义掉。
 *
 * @param updates 键 → 值。值是空串表示**删掉这一项**（前端「清空 cookie」走这条）
 * @returns 写了几项、删了几项
 */
export const patchEnvFile = (
  updates: Record<string, string>,
  /** 目标文件。只为可测 —— 生产路径永远是那个模块级常量 */
  file: string = ENV_FILE
): { written: number; removed: number } => {
  const existing = existsSync(file) ? readFileSync(file, 'utf8').split('\n') : []
  const quote = (value: string): string => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

  const seen = new Set<string>()
  let written = 0
  let removed = 0

  const kept: string[] = []
  for (const line of existing) {
    const parsed = parseLine(line)
    if (parsed === undefined || !(parsed.key in updates)) {
      kept.push(line)
      continue
    }
    seen.add(parsed.key)
    const next = updates[parsed.key]!
    if (next === '') {
      removed++
      continue
    }
    kept.push(`${parsed.key}=${quote(next)}`)
    written++
  }

  // 文件里还没有的键追加到末尾
  const appended = Object.entries(updates).filter(([key, value]) => !seen.has(key) && value !== '')
  if (appended.length > 0) {
    if (kept.length > 0 && kept[kept.length - 1]!.trim() !== '') kept.push('')
    for (const [key, value] of appended) {
      kept.push(`${key}=${quote(value)}`)
      written++
    }
  }

  // 末尾留一个换行（POSIX 文本文件惯例，也让下次追加不粘在一起）
  const text = kept.join('\n').replace(/\n*$/, '\n')
  // mode 0o600：只有当前用户能读。Windows 上 mode 基本无效，但在 Linux/mac 上是真的
  writeFileSync(file, text, { encoding: 'utf8', mode: 0o600 })
  return { written, removed }
}

/**
 * 把 `.env` 里的值并进 `process.env`。
 *
 * **不覆盖已有的环境变量**：真环境变量（shell 里 export 的、CI 注入的）优先级更高，
 * 那是所有 dotenv 实现的一致行为，反过来会让「临时换一个账号跑一次」这个动作失效。
 *
 * @returns 实际注入了哪些键（已存在的那些不算）
 */
export const loadEnvFile = (): string[] => {
  const injected: string[] = []
  for (const [key, value] of Object.entries(readEnvFile())) {
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value
      injected.push(key)
    }
  }
  return injected
}
