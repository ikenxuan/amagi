/**
 * 两层 barrel —— 根 `index.ts` 与 `<平台>/index.ts` —— 的**唯一一份渲染规则**。
 *
 * ## 为什么要单独成一层
 *
 * barrel 原先只由全量 `pnpm gen:types` 产，而控制台的单端点「就地生成」按判据
 * （`isEndpointOwnedFile`）不碰它们。那条判据的理由是**对的**：控制台一次只喂一个端点给
 * `planCorpusTypes`，从那一份 plan 渲染出来的平台 barrel 只列它自己，写下去会把别的端点
 * 整个抹掉。但它漏了后半句 —— **barrel 从此没有任何常驻的写入方**。于是 `3173ae8` 把整棵
 * 旧树删空、只提交了零样本的 `export {}` 之后，全量生成再没被跑过，根 barrel 一直停在零样本
 * 状态：这个包对外导出了 **0 个类型**，而四处门禁全绿（`export {}` 是合法 TS、`pnpm build`
 * 也绿、`types:check` 零样本时按设计短路、当时的 `types:size` 只数行数）。
 *
 * 修法是**换数据来源**：barrel 不再从「这一轮喂进来哪些端点」推，而从**产物树里有哪几个
 * 端点目录**推。树里有什么就发布什么 —— 于是两个调用方共用同一条规则：
 *
 * 1. `planCorpusTypes`（全量生成）—— 从 corpus 算出来的端点清单；
 * 2. 控制台的单端点「就地生成」—— 写完端点文件后，扫一遍盘上的目录清单重算两层 barrel
 *    （`packages/web/server/storage.ts` 的 `writeGeneratedBarrels`）。
 *
 * 两边的 `endpointName` 都来自 {@link pascal}，也就是**产物目录名本身**。这条
 * 「目录名 = 类型名前缀」的约定由 `plan.ts` 的 `writeEndpointIndex` 保证：它写的 barrel
 * 恰好是 `export type <目录名>{,Success,Error} = ...`。
 *
 * ## 边界
 *
 * 本包的文件头写着「不读文件、不发请求、不落盘」—— {@link readGeneratedTree} 是那条的
 * **唯一例外**，理由是 barrel 的输入就是产物树自身，而「树里有哪些端点」只能读盘得知。
 * 写盘仍在调用方：这里**只读不写**。
 */

import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** barrel 文件头。与类型文件的 `GENERATED_BANNER` 不同：barrel 不写溯源块（它没有样本） */
export const BARREL_BANNER = [
  '// 自动生成，手改无意义 —— 由 packages/typegen 从录到的样本派生，重新生成会覆盖整棵树。',
  '// 要改类型请改样本或改生成器，然后重新生成。'
].join('\n')

/** 一个端点在平台公共 barrel 中暴露的稳定类型族 */
export interface BarrelEntry {
  /** 端点 Pascal 名，如 `Comments` —— 它同时是目录名与类型名前缀 */
  endpointName: string
  /** 相对平台目录的稳定 barrel，如 `./Comments` */
  module: string
}

/** 「这棵树里有哪些端点」：barrel 的全部输入。{@link readGeneratedTree} 读盘得到它 */
export interface PlatformEndpoints {
  /** 平台目录名，如 `bilibili` */
  platform: string
  /** 端点目录名，如 `Comments`。空数组 = 这个平台一个端点都没有 */
  endpoints: readonly string[]
}

/**
 * 端点名 / 平台名 → Pascal 名。`videoWork` → `VideoWork`，`ArticleCards` → `ArticleCards`。
 *
 * **这是命名规则的唯一一份实现**，两个地方必须一致所以放一起：产物目录名（`plan.ts` 用它
 * 决定文件落在哪个目录）与 barrel 里的类型名前缀。对不上的后果是 barrel 指向不存在的模块 ——
 * 那是整棵树编译不过，比少一个端点严重。
 */
export const pascal = (raw: string): string =>
  raw
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('')

/**
 * `<platform>/index.ts`：把这个平台各端点的根类型收成一处，**并在这里加平台前缀**。
 *
 * 端点名在平台之间会重复（`emojiList` 三个平台都有，于是三份 `EmojiList_V0`），所以跨平台
 * 那一层必须消歧。两种做法里选了加前缀而不是分命名空间，理由是实测出来的：
 * `export * as Bilibili from './bilibili'` 这种命名空间 re-export，**core 的 tsdown
 * 打包声明时解析不开**（报 `"Bilibili" is not exported by ".../src/index.d.ts"`，直接构建
 * 失败）。前缀是扁平的普通 re-export，没有这个问题。
 *
 * 顺带它也与手写树的既有约定一致（`BiliEmojiList` / `KsOneWork` / `DySuggestWords`），
 * 只是这里用**完整平台名 + `Response` 后缀**（`BilibiliCommentsResponse`）—— 与手写树的短
 * 前缀刻意不同名，两棵树并存期间「这个类型是生成的还是手写的」在调用处一眼能看出来。
 *
 * 只 re-export 根类型名，不用 `export *`：形状文件里的嵌套类型本来就不导出，而 `export *`
 * 会把将来任何新增的顶层导出也一起带出来，那不是 barrel 该有的行为。
 */
export const renderPlatformBarrel = (platform: string, entries: readonly BarrelEntry[]): string => {
  const prefix = pascal(platform)
  const lines = [...entries]
    .sort((left, right) => (left.endpointName < right.endpointName ? -1 : 1))
    .flatMap((entry) => {
      // 公共名统一带 `Response` 后缀。**这不是修饰，是消歧**：手写树已经占了
      // `XiaohongshuEmojiList` / `XiaohongshuUserProfile` 这一族「平台名 + 端点名」的短名
      // （`core/src/types/ReturnDataType/Xiaohongshu/index.ts`），而稳定名去掉 `_V0` 之后
      // 正好撞上去 —— 实测 `export * from './types'` 与生成树摊平在 core 的入口上直接报
      // 「has already exported a member named 'XiaohongshuEmojiList'」。
      const exposed = `${prefix}${entry.endpointName}Response`
      return [
        `export type { ${entry.endpointName} as ${exposed} } from '${entry.module}'`,
        `export type { ${entry.endpointName}Success as ${exposed}Success } from '${entry.module}'`,
        `export type { ${entry.endpointName}Error as ${exposed}Error } from '${entry.module}'`
      ]
    })
  return `${BARREL_BANNER}\n\n${lines.join('\n')}\n`
}

/** `index.ts`：把各平台 barrel 收成一处。前缀已经在平台那一层加过，这里不会撞名 */
export const renderRootBarrel = (platforms: readonly string[]): string => {
  if (platforms.length === 0) {
    return `${BARREL_BANNER}\n\n// 产物树里还没有任何端点，所以这里只能是个空壳。\nexport {}\n`
  }
  const lines = platforms.map((platform) => `export type * from './${platform}'`)
  return `${BARREL_BANNER}\n\n${lines.join('\n')}\n`
}

/**
 * 整棵 barrel 树：`index.ts` + 每个平台的 `<平台>/index.ts`。路径一律 `/` 分隔，
 * 与 `planCorpusTypes` 的 `files` 同一口径。
 *
 * 端点清单按名字排序、平台也排序 —— 产物要跑 `--check` 逐字节比对，顺序不能跟着
 * 目录遍历顺序变。**一个端点都没有的平台不产 barrel**：产了就是一条指向不存在模块的
 * `export type * from './<平台>'`，整棵树编译不过。
 */
export const renderBarrels = (tree: readonly PlatformEndpoints[]): Map<string, string> => {
  const platforms = tree
    .filter((entry) => entry.endpoints.length > 0)
    .slice()
    .sort((left, right) => (left.platform < right.platform ? -1 : 1))
  const files = new Map<string, string>()
  for (const { platform, endpoints } of platforms) {
    files.set(
      `${platform}/index.ts`,
      renderPlatformBarrel(
        platform,
        [...endpoints].sort().map((endpointName) => ({ endpointName, module: `./${endpointName}` }))
      )
    )
  }
  files.set('index.ts', renderRootBarrel(platforms.map((entry) => entry.platform)))
  return files
}

/**
 * 读产物树，得到 {@link renderBarrels} 要的那份清单。**本包唯一碰文件系统的地方。**
 *
 * 判据写在这里，两个调用方都不用再实现一遍：
 * - 平台 = 产物根的一级目录；
 * - 端点 = 平台目录下**存在 `index.ts`** 的二级目录。缺 `index.ts` 的目录不算端点 ——
 *   列进 barrel 就是一条指向不存在模块的 export，而不列又会让它悄悄消失，所以
 *   `pnpm types:check` 的树自检会把这种目录单独报出来（见 `scripts/gen-types.mts`）。
 *
 * 目录不存在 = 这棵树还没生成过，返回空清单（不是错误）。
 */
export const readGeneratedTree = (root: string): PlatformEndpoints[] => {
  const subdirs = (path: string): string[] => {
    try {
      return readdirSync(path, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    } catch {
      return []
    }
  }
  return subdirs(root).map((platform) => ({
    platform,
    endpoints: subdirs(join(root, platform)).filter((endpoint) => existsSync(join(root, platform, endpoint, 'index.ts')))
  }))
}

/**
 * 读树 + 渲染，一步到位 —— 控制台写完端点文件后调它，把两层 barrel 拉回与树一致。
 * 返回「路径 → 源码」，写盘由调用方做（本包不落盘）。
 */
export const reconcileBarrels = (root: string): Map<string, string> => renderBarrels(readGeneratedTree(root))
