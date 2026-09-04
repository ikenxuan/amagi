/**
 * `removeGenerated` 的那几道闸 —— `/api/generate` 敢删东西的全部依据。
 *
 * **拒绝那一侧对着真产物根断言，放过那一侧只在系统临时目录里。** 前者安全是因为闸都在碰文件系统
 * 之前；后者非要有真文件不可（要看的正是「哪一层目录被收走了」），而真删一个产物文件就是真删一个
 * 已提交的产物文件 —— `packages/response-types/src/generated/` 底下那 28 个文件正参与
 * `pnpm types:check` 的逐字节比对。`removeGenerated` 的 `root` 参数就是为这件事存在的。
 *
 * 两条最值得钉住的：
 *
 * - **barrel 在判据上就碰不到**：根 barrel 一段、平台 barrel 两段，而闸要求至少三段。
 * - **判据是解析后的路径**，不是原始字符串。原先按字符串判，`bilibili//index.ts`、`//x.ts`、
 *   `bilibili/Comments/..\..\..\index.ts` 三种写法能整个穿过去（前两条删的是 barrel、
 *   往上收的是平台目录与产物根；第三条在 Windows 上落到手写的 `src/index.ts`）。
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { removeGenerated } from '../server/storage'

const roots: string[] = []

/** 一个假的产物根，测完整棵删掉。里面的目录结构由每条用例自己摆 */
const scratchRoot = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'amagi-generated-'))
  roots.push(dir)
  return dir
}

/** 摆一个文件（父目录一起建）。`relative` 用 `/` 分隔，与产物路径同一条约定 */
const put = (root: string, relative: string): void => {
  const full = join(root, ...relative.split('/'))
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, '// 假产物\n', 'utf8')
}

/** 盘上还在不在。`relative` 同样是 `/` 分隔 */
const there = (root: string, relative: string): boolean => existsSync(join(root, ...relative.split('/')))

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true })
})

describe('产物清理只碰端点自己的目录', () => {
  it('**根 barrel 与平台 barrel 删不掉** —— 少于三段一律拒', () => {
    expect(() => removeGenerated('index.ts')).toThrow('拒绝删除')
    expect(() => removeGenerated('bilibili/index.ts')).toThrow('拒绝删除')
  })

  it('非 `.ts` 一律拒 —— 产物树里只该有 TypeScript', () => {
    expect(() => removeGenerated('bilibili/Comments/notes.md')).toThrow('拒绝删除')
    expect(() => removeGenerated('bilibili/Comments/../../../secrets.json')).toThrow('拒绝删除')
  })

  it('路径里带 `..` 一律拒，哪怕结尾是 `.ts`', () => {
    expect(() => removeGenerated('bilibili/Comments/../../../../evil.ts')).toThrow('拒绝删除')
    expect(() => removeGenerated('../../evil.ts')).toThrow('拒绝删除')
  })

  it('报错文案说清了范围 —— 这条会被人在日志里读到', () => {
    expect(() => removeGenerated('index.ts')).toThrow('<平台>/<Endpoint>/')
  })
})

describe('闸判的是解析后的路径，不是原始字符串', () => {
  // 这几条的叶子名一律是**不存在的**探针（`__probe__.ts`），刻意的：闸放它过去时下一句就是
  // 真的 `rmSync`，拿 `bilibili/index.ts` 当靶子的话，跑一次测试就把平台 barrel 删了 ——
  // 而那 28 个产物文件正参与 `pnpm types:check` 的逐字节比对。
  it('**空段一律拒** —— `bilibili//x.ts` 按 `/` 切也是三段，中间那段是空串，`join` 之后它就没了', () => {
    expect(() => removeGenerated('bilibili//__probe__.ts')).toThrow('拒绝删除')
  })

  it('**产物根自己也拒** —— `//x.ts` 同样切出三段，而它归一化之后只剩一段', () => {
    expect(() => removeGenerated('//__probe__.ts')).toThrow('拒绝删除')
  })

  it('**反斜杠一律拒** —— 按 `/` 切的时候它不算分隔符，于是 `..` 那道检查在 Windows 上形同虚设', () => {
    expect(() => removeGenerated('bilibili/Comments/..\\..\\..\\__probe__.ts')).toThrow('拒绝删除')
  })

  it('**拒之前一个字节都不动** —— 三条穿透用它们真正的靶子名再验一遍（临时根，删得起）', () => {
    const root = scratchRoot()
    put(root, 'bilibili/Comments/Comments_V0.ts')
    put(root, 'bilibili/index.ts')
    put(root, 'index.ts')
    // 这三个字符串在原先的判据下全部放行：前两个删的是平台 barrel 与根下的 `index.ts`，
    // 第三个靠反斜杠把 `..` 藏过检查。现在它们抛，而且抛在碰文件系统之前
    expect(() => removeGenerated('bilibili//index.ts', root)).toThrow('拒绝删除')
    expect(() => removeGenerated('//index.ts', root)).toThrow('拒绝删除')
    expect(() => removeGenerated('bilibili/Comments/..\\..\\index.ts', root)).toThrow('拒绝删除')
    expect(there(root, 'bilibili/index.ts')).toBe(true)
    expect(there(root, 'index.ts')).toBe(true)
    expect(there(root, 'bilibili/Comments/Comments_V0.ts')).toBe(true)
  })
})

describe('放过的那一侧：往上收到哪一层为止（临时目录，不碰真产物）', () => {
  it('**最浅收到 `<平台>/<Endpoint>`** —— 平台 barrel 与根 barrel 一个都不许动', () => {
    const root = scratchRoot()
    put(root, 'bilibili/Comments/Comments_V0.ts')
    put(root, 'bilibili/index.ts')
    put(root, 'index.ts')
    removeGenerated('bilibili/Comments/Comments_V0.ts', root)
    expect(there(root, 'bilibili/Comments')).toBe(false)
    expect(there(root, 'bilibili/index.ts')).toBe(true)
    expect(there(root, 'index.ts')).toBe(true)
    // 平台目录本身也留着 —— 它底下还有别的端点
    expect(there(root, 'bilibili')).toBe(true)
  })

  it('端点目录里还有别的文件时一层都不收 —— `rmdirSync` 对非空目录失败，这正是想要的行为', () => {
    const root = scratchRoot()
    put(root, 'bilibili/Comments/Comments_V0.ts')
    put(root, 'bilibili/Comments/index.ts')
    removeGenerated('bilibili/Comments/Comments_V0.ts', root)
    expect(there(root, 'bilibili/Comments/Comments_V0.ts')).toBe(false)
    expect(there(root, 'bilibili/Comments/index.ts')).toBe(true)
    expect(there(root, 'bilibili/Comments')).toBe(true)
  })

  it('取值那一层空了也收，收到端点目录停 —— 布局翻转（`<取值>/…`）之后的残留走这条', () => {
    const root = scratchRoot()
    put(root, 'bilibili/Comments/note-1/Comments_V0.ts')
    removeGenerated('bilibili/Comments/note-1/Comments_V0.ts', root)
    expect(there(root, 'bilibili/Comments/note-1')).toBe(false)
    expect(there(root, 'bilibili/Comments')).toBe(false)
    expect(there(root, 'bilibili')).toBe(true)
  })

  it('文件本来就不在也不抛 —— `force: true`，清理这个动作是幂等的', () => {
    const root = scratchRoot()
    put(root, 'bilibili/Comments/index.ts')
    expect(() => removeGenerated('bilibili/Comments/gone.ts', root)).not.toThrow()
    expect(there(root, 'bilibili/Comments/index.ts')).toBe(true)
  })
})
