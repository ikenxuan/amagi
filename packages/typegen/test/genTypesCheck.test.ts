/**
 * `scripts/gen-types.mts --check` 的**零样本那条路**。
 *
 * 要钉的不是 `detectBreakingChanges` 算得对不对（那在 `breaking.test.ts`），而是
 * **脚本在手上没有证据时到底调不调它**：零样本时 `plan.files` 里只剩一个空壳 barrel，
 * 拿整棵已提交产物跟它比会得出「每个文件都不再产出了」—— 那是假象，不是发现。
 * 而「产物在 git 里、样本不在」正是 CI / 新克隆的常态，这段假告警会每跑一次喷一次，
 * 把真告警淹掉。
 *
 * **这条路的退出码恒为 0**，所以回归了不会有任何红灯 —— 除了这个文件，没有别的信号。
 *
 * 跑真脚本而不是 import 它：脚本就是脚本（顶层 await、直接读盘写盘）。而它从
 * `import.meta.url` 推 ROOT —— 复制进一棵临时树就换掉了 `corpus/` 和产物目录，
 * 不用为了可测性去改脚本。
 */

import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it, onTestFinished } from 'vitest'

import { createCorpusSample } from '../src/index'

const ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const SCRIPT = 'packages/typegen/scripts/gen-types.mts'
const OUT = 'packages/response-types/src/generated'

/** 长得像产物的文件：`readGeneratedProps` 只认这个生成器自己的输出格式（每属性一行、缩进两格） */
const generated = (name: string): string => `export type ${name} = {\n  id: number\n}\n`

/**
 * 造一棵临时树：脚本 + 生成器源码 + 「已提交的产物」。**不建 `corpus/` 就是零样本。**
 *
 * 复制 `src/` 而不是软链 —— 软链在 Windows 上要权限。能直接复制是因为 typegen 的 `src/`
 * 只 import `node:crypto`，临时树里没有 node_modules 也跑得起来。
 */
const tree = (committed: Record<string, string>): string => {
  const root = mkdtempSync(join(tmpdir(), 'amagi-gen-types-'))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, dirname(SCRIPT)), { recursive: true })
  cpSync(join(ROOT, SCRIPT), join(root, SCRIPT))
  cpSync(join(ROOT, 'packages/typegen/src'), join(root, 'packages/typegen/src'), { recursive: true })
  for (const [path, source] of Object.entries(committed)) {
    const full = join(root, OUT, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, source, 'utf8')
  }
  return root
}

/** 往临时树里塞一份真样本：路径与序列化都走录制器自己那套，不手搓文件名 */
const record = (root: string, platform: string, endpoint: string): void => {
  const result = createCorpusSample({
    platform,
    endpoint,
    params: { photoId: '3xabc' },
    raw: { result: 1, photo: { photoId: '3xabc', caption: '标题' } },
    http: { status: 200 },
    amagiVersion: '7.0.0',
    recordedAt: new Date('2026-09-01T00:00:00Z')
  })
  if (!('sample' in result)) throw new Error(`预期入库，实际被拒：${result.verdict.reason}`)
  const full = join(root, result.path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, result.json, 'utf8')
}

/** 跑临时树里那份脚本。`--import tsx` 从仓库根解析 —— tsx 是根的 devDependency，临时树里没有 */
const check = (root: string): { status: number | null; stdout: string; stderr: string } => {
  const run = spawnSync(process.execPath, ['--import', 'tsx', join(root, SCRIPT), '--check'], { cwd: ROOT, encoding: 'utf8' })
  if (run.error !== undefined) throw run.error
  return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}

describe('gen-types.mts --check', () => {
  it('零样本时不报破坏性变更，并说清为什么没报', () => {
    const { status, stdout, stderr } = check(tree({ 'index.ts': generated('Bar'), 'kuaishou/Foo/Foo_V0.ts': generated('Foo') }))
    // 先钉住「脚本真读到了这棵假产物树」：不然下面那条 `not.toContain` 会因为什么都没读到而空转，
    // 而这条路的退出码恒为 0，空转的用例自己是发现不了的
    expect(stdout).toContain('已提交的产物：2 个文件')
    expect(`${stdout}\n${stderr}`).not.toContain('💥')
    // 缺席这件事本身要说出来，不能静默跳过
    expect(stdout).toContain('破坏性变更也一并没查')
    // 「这台机器上没录过样本」不是错误，那是 CI 上的常态
    expect(status).toBe(0)
  }, 30_000)

  it('有样本时照旧报 —— 这道判据没把门禁关掉', () => {
    const root = tree({ 'kuaishou/Foo/Foo_V0.ts': generated('Foo') })
    record(root, 'kuaishou', 'videoWork')
    const { stderr } = check(root)
    expect(stderr).toContain('💥 破坏性变更')
    expect(stderr).toContain('kuaishou/Foo/Foo_V0.ts 整个不产了')
  }, 30_000)
})
