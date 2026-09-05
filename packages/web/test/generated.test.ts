/**
 * 「已有类型」那块面板的数据源：`readGeneratedFor`。
 *
 * 值得单独钉住的是**端点目录名靠「认」不靠「拼」**这条选择。产物目录名是端点名 pascal 化的结果
 * （`videoInfo` → `VideoInfo`，`packages/typegen/src/plan.ts:57,186`），而那个函数没导出 ——
 * 在 `packages/web` 里照抄一份就是多一处会脱节的实现（`generateOne` 为同一件事留过一句注释）。
 * 所以这里的做法是列出盘上真实存在的目录名再做归一化比对，而下面这几条用例正是它的判据：
 * 大小写与分隔符怎么变都还认得出、更深的判别联合布局也收得到、而外部传进来的端点名
 * **一个字符都不参与拼路径**（于是 `../` 那类花样在这条路上无处可去）。
 *
 * 临时目录 + 真产物树各跑一遍：前者摆得出「判别联合那种布局」这类现在还不存在的形状，
 * 后者才证明归一化比对在**真的 pascal 名字**上成立（`videoInfo` ⇄ `VideoInfo`）。
 * 与 `storage.test.ts` 同一条纪律：不往真产物树里写东西 —— 那 28 个文件参与
 * `pnpm types:check` 的逐字节比对。
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { readDocSidecar, readGeneratedFor } from '../server/storage'

const roots: string[] = []

const scratchRoot = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'amagi-generated-read-'))
  roots.push(dir)
  return dir
}

/** 摆一个产物文件（父目录一起建）。`relative` 用 `/` 分隔，与产物路径同一条约定 */
const put = (root: string, relative: string, source = '// 假产物\n'): void => {
  const full = join(root, ...relative.split('/'))
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, source, 'utf8')
}

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true })
})

describe('端点目录名靠认不靠拼', () => {
  it('端点名与目录名差在大小写与分隔符上也认得出（`video_info` ⇄ `VideoInfo`）', () => {
    const root = scratchRoot()
    put(root, 'bilibili/VideoInfo/VideoInfo_V0.ts', 'export type VideoInfo_V0 = { a: string }\n')
    for (const name of ['videoInfo', 'video_info', 'VIDEOINFO', 'video-info']) {
      expect(readGeneratedFor('bilibili', name, root).files.map((file) => file.path)).toEqual(['bilibili/VideoInfo/VideoInfo_V0.ts'])
    }
  })

  it('源码原样读出来 —— 这块面板要显示的就是仓库里那一份', () => {
    const root = scratchRoot()
    put(root, 'bilibili/VideoInfo/VideoInfo_V0.ts', '/** 分P 的 ID */\nexport type X = 1\n')
    expect(readGeneratedFor('bilibili', 'videoInfo', root).files[0]!.source).toBe('/** 分P 的 ID */\nexport type X = 1\n')
  })

  it('**判别联合那种更深的布局也收得到**，且路径已排序', () => {
    const root = scratchRoot()
    put(root, 'bilibili/UserDynamicList/guards.ts')
    put(root, 'bilibili/UserDynamicList/index.ts')
    put(root, 'bilibili/UserDynamicList/DYNAMIC_TYPE_AV/DYNAMIC_TYPE_AV_V0.ts')
    expect(readGeneratedFor('bilibili', 'userDynamicList', root).files.map((file) => file.path)).toEqual([
      'bilibili/UserDynamicList/DYNAMIC_TYPE_AV/DYNAMIC_TYPE_AV_V0.ts',
      'bilibili/UserDynamicList/guards.ts',
      'bilibili/UserDynamicList/index.ts'
    ])
  })

  it('**只收自己那个端点的**，隔壁端点的产物不许混进来', () => {
    const root = scratchRoot()
    put(root, 'bilibili/VideoInfo/VideoInfo_V0.ts')
    put(root, 'bilibili/Comments/Comments_V0.ts')
    expect(readGeneratedFor('bilibili', 'comments', root).files.map((file) => file.path)).toEqual(['bilibili/Comments/Comments_V0.ts'])
  })

  it('**平台 barrel 不归任何端点** —— 它描述的是整个平台，由全量生成负责', () => {
    const root = scratchRoot()
    put(root, 'bilibili/index.ts')
    put(root, 'index.ts')
    expect(readGeneratedFor('bilibili', 'index', root).files).toEqual([])
  })
})

describe('没有产物是正常状态', () => {
  it('这个端点还没生成过 —— 空数组、空 issues，不抛也不是错误', () => {
    const root = scratchRoot()
    put(root, 'bilibili/VideoInfo/VideoInfo_V0.ts')
    expect(readGeneratedFor('bilibili', 'liveRoomInfo', root)).toEqual({ files: [], issues: [] })
  })

  it('整个平台目录都不存在时也一样 —— 61 个端点里 49 个走的就是这条路', () => {
    expect(readGeneratedFor('kuaishou', 'anything', scratchRoot())).toEqual({ files: [], issues: [] })
  })
})

describe('外部输入不参与拼路径', () => {
  it('**端点名带 `..` 也出不去产物根** —— 它只跟 readdir 回来的名字比较，从不被 join', () => {
    const root = scratchRoot()
    put(root, 'bilibili/VideoInfo/VideoInfo_V0.ts')
    for (const evil of ['../../../etc/passwd', '..\\..\\index', '', 'VideoInfo/VideoInfo_V0.ts']) {
      expect(readGeneratedFor('bilibili', evil, root).files).toEqual([])
    }
  })

  it('**就算归一化之后撞上了目录名，读的仍然是 readdir 给的那个路径**', () => {
    const root = scratchRoot()
    put(root, 'bilibili/VideoInfo/VideoInfo_V0.ts')
    // `comparable('../VideoInfo')` 抹掉了 `.` 与 `/`，剩下 `videoinfo` —— 与目录名相同，所以这条**会**命中。
    // 而命中是无害的：那串字符只出现在一次字符串比较里，落盘路径由
    // `join(root, 'bilibili', 'VideoInfo', …)` 拼成，`..` 一段都进不去
    expect(readGeneratedFor('bilibili', '../VideoInfo', root).files.map((file) => file.path)).toEqual([
      'bilibili/VideoInfo/VideoInfo_V0.ts'
    ])
  })
})

describe('真产物树上跑一遍', () => {
  it('**`videoInfo` 认得出 `VideoInfo/`** —— 归一化比对在真的 pascal 名字上成立', () => {
    const read = readGeneratedFor('bilibili', 'videoInfo')
    expect(read.issues).toEqual([])
    expect(read.files.length).toBeGreaterThan(0)
    expect(read.files.every((file) => file.path.startsWith('bilibili/VideoInfo/'))).toBe(true)
    expect(read.files.some((file) => file.source.includes('VideoInfo_V0'))).toBe(true)
  })

  it('没有产物的端点在真树上也是空数组 —— 那是 49 个端点的现状', () => {
    expect(readGeneratedFor('bilibili', 'liveRoomInfo').files).toEqual([])
  })

  /**
   * **产物里带着 sidecar 那条注释** —— PRD 第 433-442 行那个缺陷落地的地方就是这棵树。
   *
   * `generateOne` 原先不传 sidecar，于是界面上点一次「生成这个端点的类型」就把人手写的语义
   * 说明整批冲掉、写回这棵树。修复在 `server/index.ts` 里，但**这里钉不住那个调用点**：
   * `generateOne` 没导出，而它落盘走的 `writeGenerated` / `readSamples` 是两个没有 `root`
   * 参数的函数（对比同文件的 `readGeneratedFor` / `readDocSidecar`），没有注入点 ——
   * 真跑一遍就是往这 28 个参与 `types:check` 逐字节比对的文件里写东西。
   *
   * 所以这条改钉**后果**：sidecar 与产物都进 git，而 CI 上 `types:check` 验不了两者一致
   * （样本不进 git，见 release.yml 那一步的注释）—— 这条是唯一会因此变红的东西。
   * 它红了说明产物与 sidecar 已经脱节：跑 `pnpm gen:types` 重新生成，别手改产物。
   */
  it('**真产物带着 sidecar 里那条 `cid` 注释** —— 形状能重新算出来，这句话不能', () => {
    const { sidecar, issues } = readDocSidecar('bilibili', 'videoInfo')
    expect(issues).toEqual([])
    const doc = sidecar?.paths['data.cid']
    // 先确认拿到的是那一条（路径键改了名的话，下面那句会变成一条不测任何东西的断言）
    expect(doc).toContain('分P 的 ID，不是稿件的')
    const sources = readGeneratedFor('bilibili', 'videoInfo')
      .files.map((file) => file.source)
      .join('\n')
    expect(sources).toContain(`/** ${doc!} */`)
  })
})
