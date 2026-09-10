/**
 * `scripts/gen-types.mts --check` 的**零样本那条路**。
 *
 * 这条路上有两条各自独立的判据，别把它们混起来：
 *
 * 1. **破坏性变更不报** —— 要钉的不是 `detectBreakingChanges` 算得对不对（那在
 *    `breaking.test.ts`），而是脚本在手上没有证据时到底调不调它：零样本时 `plan.files`
 *    里只剩一个空壳 barrel，拿整棵已提交产物跟它比会得出「每个文件都不再产出了」——
 *    那是假象，不是发现。而「产物在 git 里、样本不在」正是 CI / 新克隆的常态，这段假告警
 *    会每跑一次喷一次，把真告警淹掉。
 * 2. **barrel 与树一致**（2026-09-10 补的）—— 这条**恰恰要零样本才最有用**：树自己就是
 *    barrel 的全部输入，所以「barrel 忘了重算」不需要任何样本就能发现。它补的是一个真实的
 *    洞：`3173ae8` 把整棵旧树删空、只提交了零样本的 `export {}` 之后全量生成再没被跑过，
 *    根 barrel 停在零样本状态 —— 这个包对外导出 **0 个类型**，而当时的四处门禁全绿。
 *
 * 第 1 条的退出码恒为 0，回归了不会有任何红灯；第 2 条会置 1。两条都只能靠这个文件发现。
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
 * barrel 的文件头与两层文本。**手抄，故意不复用 `src/barrels.ts`** ——
 * 用被测实现造夹具，那条自检就永远绿，等于没验。
 */
const BANNER = [
  '// 自动生成，手改无意义 —— 由 packages/typegen 从录到的样本派生，重新生成会覆盖整棵树。',
  '// 要改类型请改样本或改生成器，然后重新生成。'
].join('\n')

/** 自洽的两层 barrel：根 `index.ts` + `<平台>/index.ts` */
const barrelsFor = (platform: string, prefix: string, endpoint: string): Record<string, string> => ({
  'index.ts': `${BANNER}\n\nexport type * from './${platform}'\n`,
  [`${platform}/index.ts`]: [
    BANNER,
    '',
    `export type { ${endpoint} as ${prefix}${endpoint}Response } from './${endpoint}'`,
    `export type { ${endpoint}Success as ${prefix}${endpoint}ResponseSuccess } from './${endpoint}'`,
    `export type { ${endpoint}Error as ${prefix}${endpoint}ResponseError } from './${endpoint}'`,
    ''
  ].join('\n')
})

/** 零样本时该产的那份根 barrel（`renderRootBarrel` 的空树分支） */
const EMPTY_ROOT_BARREL = `${BANNER}\n\n// 产物树里还没有任何端点，所以这里只能是个空壳。\nexport {}\n`

/**
 * 造一棵临时树：脚本 + 生成器源码 + 「已提交的产物」。**不建 `corpus/` 就是零样本。**
 *
 * 复制 `src/` 而不是软链 —— 软链在 Windows 上要权限。能直接复制是因为 typegen 的 `src/`
 * 只 import **Node 内置模块**（`node:crypto` / `node:fs` / `node:path`），临时树里没有
 * node_modules 也跑得起来。
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

/** 一棵自洽的树：barrel 两层 + 端点文件。零样本测试的基准 */
const consistentTree = (): Record<string, string> => ({
  ...barrelsFor('kuaishou', 'Kuaishou', 'Foo'),
  'kuaishou/Foo/index.ts': generated('Foo'),
  'kuaishou/Foo/Foo_V0.ts': generated('Foo')
})

describe('gen-types.mts --check', () => {
  it('零样本时不报破坏性变更，并说清为什么没报', () => {
    const { status, stdout, stderr } = check(tree(consistentTree()))
    // 先钉住「脚本真读到了这棵假产物树」：不然下面那条 `not.toContain` 会因为什么都没读到而空转，
    // 而第 1 条判据的退出码恒为 0，空转的用例自己是发现不了的
    expect(stdout).toContain('已提交的产物：4 个文件')
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

  it('零样本：树自洽时 barrel 自检通过', () => {
    const { status, stdout } = check(tree(consistentTree()))
    expect(stdout).toContain('barrel 自检：2 个 barrel 与产物树一致')
    expect(status).toBe(0)
  }, 30_000)

  it('零样本也抓得住「根 barrel 还是零样本的 export {}」—— 那次事故的原样', () => {
    // 端点目录在、平台 barrel 也在，只有根 barral 停在零样本状态：
    // 这正是 3173ae8 之后的实际形状，包对外导出 0 个类型而所有门禁全绿
    const committed = { ...consistentTree(), 'index.ts': EMPTY_ROOT_BARREL }
    const { status, stderr } = check(tree(committed))
    expect(stderr).toContain('❌ 内容不一致：index.ts')
    expect(status).toBe(1)
  }, 30_000)

  it('零样本也抓得住「平台 barrel 整个缺了」', () => {
    const committed = consistentTree()
    delete committed['kuaishou/index.ts']
    const { status, stderr } = check(tree(committed))
    expect(stderr).toContain('❌ 缺文件：kuaishou/index.ts')
    expect(status).toBe(1)
  }, 30_000)

  it('零样本也抓得住「端点目录里没有 index.ts」—— 它会从 barrel 里悄悄消失', () => {
    // 缺 index.ts 的目录不算端点（列进 barrel 就是指向不存在的模块），所以它既进不了
    // barrel、又不会报错 —— 是这一类里唯一还需要人看一眼的
    const committed = { 'index.ts': EMPTY_ROOT_BARREL, 'kuaishou/Foo/Foo_V0.ts': generated('Foo') }
    const { status, stderr } = check(tree(committed))
    expect(stderr).toContain('❌ 端点目录里没有 index.ts：kuaishou/Foo')
    expect(status).toBe(1)
  }, 30_000)
})