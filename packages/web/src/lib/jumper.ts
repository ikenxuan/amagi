/**
 * `⌘K` 端点跳转器的判定逻辑。**这里只有纯函数**，界面那半边在 `components/EndpointJumper.tsx`。
 *
 * 为什么单独一层，两条理由，都与 `lib/theme.ts` 那份逐字相同：
 *
 * 1. **能测。** vitest 跑在 node 环境（根 `vitest.config.ts` 没配 jsdom），而跳转器的候选列表
 *    在 `Popover` 里 —— 关着不在 DOM、开着走 portal，`renderToStaticMarkup` 两种都渲不到
 *    （`comparePanel.test.ts:25` 记的就是这条）。所以「搜一个词该剩哪几条」这个判断
 *    只有抽成纯函数才量得到，与 `server/guard.ts`、`lib/storeNotice.ts` 同一条做法。
 * 2. **Fast Refresh。** 一个文件里既导出组件又导出普通函数会让 vite 的 react 插件
 *    整文件降级成整页刷新（oxlint 的 `react(only-export-components)` 报的就是这个）。
 */

import type { PlatformInfo } from '../../shared/contract'

/** 摊平后的一条候选。`key` 就是 `?endpoint=` 里那个串，也是 `ListBox.Item` 的 id —— 三处同一个值 */
export interface JumperEntry {
  key: string
  platform: string
  name: string
  summary: string
  stored: number
}

/**
 * 把按平台分组的清单摊平成一串候选。
 *
 * **平台名必须留在每一条上**：跳转器是跨平台的扁平列表，而端点名在平台之间会重名
 * （`videoInfo` 在 bilibili / douyin / kuaishou 各有一个），只显示端点名的话
 * 那三条会长得一模一样 —— 人分不出自己要跳去哪一个。
 */
export const flattenEndpoints = (platforms: readonly PlatformInfo[]): JumperEntry[] =>
  platforms.flatMap((platform) =>
    platform.endpoints.map((endpoint) => ({
      key: `${platform.platform}/${endpoint.name}`,
      platform: platform.platform,
      name: endpoint.name,
      summary: endpoint.summary,
      stored: endpoint.stored
    }))
  )

/**
 * 过滤。**按空白切成多个词、每个词都要命中**（`bili video` 能找到 `bilibili/videoInfo`）——
 * 整串子串匹配的话，人凭记忆敲的「平台 + 端点」中间那个空格就把结果清空了，
 * 而那正是跳转器上最自然的打法。词之间没有顺序。
 *
 * 每个词在 `平台/端点` 与那句 `summary` 上找，所以中文说明也能搜 ——
 * 记得住「表情」记不住 `emojiList` 是常态。
 *
 * 空查询回**全部**：刚按下 `⌘K` 时该看到的是完整清单，不是一张空列表。
 * 回的是新数组 —— 上游那份是 `useMemo` 的缓存，交出去被就地排序会脏掉。
 */
export const matchEndpoints = (entries: readonly JumperEntry[], query: string): JumperEntry[] => {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== '')
  if (words.length === 0) return [...entries]
  return entries.filter((entry) => {
    const haystack = `${entry.key} ${entry.summary}`.toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
}

/**
 * 这台机器是不是 Mac 系。
 *
 * **判据是一个字符串参数而不是直接读 `navigator`**：一来这一层要能在 node 里测两条分支，
 * 二来 `navigator.platform` 已废弃、各家给的值不一样，把「拿哪个字段」与「怎么判」分开，
 * 换字段时改的是调用点而不是判据。iPad / iPhone 一起算进来 —— 它们外接键盘上也是 `⌘`。
 */
export const isMacLike = (platform: string | undefined): boolean => /mac|iphone|ipad|ipod/i.test(platform ?? '')

/**
 * 快捷键印在键帽上的那几个字符。
 *
 * **Mac 是 `⌘K`、其它平台是 `Ctrl K`** —— 在 Windows 上印 `⌘` 是指着一个不存在的键说话。
 * 空格是有意的：`Ctrl` 与 `K` 是两个键，`⌘K` 那种紧挨着的写法是 Mac 自己的排版惯例。
 */
export const shortcutHint = (isMac: boolean): string => (isMac ? '⌘K' : 'Ctrl K')

/**
 * 读当下这台机器的平台串，交给 `isMacLike` 判。
 *
 * `navigator` 在 SSR / node 下没有，所以先探一道 `typeof`。优先 `userAgentData.platform`
 * （`navigator.platform` 已废弃，但 Safari / Firefox 至今只有后者），拿不到就回落。
 */
export const currentPlatform = (): string | undefined => {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform
}
