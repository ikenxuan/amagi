/**
 * 「这块屏幕摆得下几栏」——**全仓唯一一处在 JS 里读断点的地方。**
 *
 * ## 为什么这一件事非得进 JS
 *
 * 版面的其余部分一直是纯 CSS 断点（`lg:flex-row`、`xl:grid-cols-…`），那样最好：
 * 不占 JS、不闪、SSR 与首帧一致。但**可拖拽的分栏做不到那样** ——
 * `react-resizable-panels` 的 `Group` 靠 `orientation` 这个 **prop** 决定横排还是竖排
 * （它往子元素上写的是行内 `flexGrow`，不是可以被媒体查询覆盖的类），
 * 而这一页在三档宽度上要的是三种不同的东西：
 *
 * - `columns`（≥ 80rem，Tailwind 的 `xl`）：两栏真的并排，**拖的是宽度** —— 这是主场。
 *   （原先是 96rem：那是「三栏各要 22rem 才装得下一份代码块」的账，第三栏没了就不成立）
 * - `rows`（≥ 64rem 的 `lg`，但不到 `xl`）：两栏叠成两行、各自滚，**拖的是高度**。
 * - `stack`（< 64rem）：**一栏都不锁高度，页面照常滚，也没有分隔条。**
 *   那个宽度上锁高度会让每一栏只剩几行可见；而竖向的 `Group` 在一个高度由内容决定的
 *   容器里会把每一栏压成 0 高（`Panel` 的高度来自 `flexGrow`，父容器得先有确定高度）。
 *   所以这一档**绕开整个 `Group`**，渲的是老那套 flex 版面。
 *
 * ## 实现上两条要紧的
 *
 * 1. **`useSyncExternalStore` 而不是 `useState` + effect。** 后者的第一帧一定是「默认值」，
 *    于是宽屏上会先渲一帧 `rows` 再跳成 `columns` —— 三栏从竖排闪成横排。
 *    `useSyncExternalStore` 的 `getSnapshot` 在**首帧**就读到真值。
 * 2. **每个查询的 store 是模块级缓存的。** `subscribe` 的函数身份必须跨渲染稳定，
 *    否则 React 每渲染一次就退订重订一次（`useSyncExternalStore` 拿它当 effect 的依赖）。
 *
 * node 那边（`react-dom/server` 的 `renderToStaticMarkup`，见 `test/` 里那几份组件测试）
 * 只会调 `getServerSnapshot`，`window.matchMedia` 一次都不碰 —— 所以这个模块在 node 里是安全的，
 * 而那一档刻意回答「最宽」：这是个本机开发工具，日常就跑在一块大屏上。
 */

import { useSyncExternalStore } from 'react'

/**
 * 三档宽度各自的媒体查询。**取值必须与 Tailwind 的 `lg` / `xl` 逐字相同** ——
 * 版面里还有别的东西按那两个断点走（`<main>` 的 `lg:h-screen`），两处错开会出现
 * 「锁了高度但没并排」这种半截状态。Tailwind v4 的默认值是 `64rem` 与 `80rem`。
 */
const ROOMY = '(min-width: 64rem)'
const WIDE = '(min-width: 80rem)'

/** 两栏此刻的摆法。含义与判据见文件头 */
export type PaneLayout = 'columns' | 'rows' | 'stack'

/** 一个媒体查询的 store。`subscribe` 与 `getSnapshot` 的函数身份要稳定，见文件头第 2 条 */
interface MediaStore {
  subscribe: (notify: () => void) => () => void
  getSnapshot: () => boolean
}

/** 查询串 → store。模块级，因为要的正是「跨渲染同一个引用」 */
const stores = new Map<string, MediaStore>()

const storeOf = (query: string): MediaStore => {
  const cached = stores.get(query)
  if (cached !== undefined) return cached
  const store: MediaStore = {
    subscribe: (notify) => {
      const list = window.matchMedia(query)
      // `addEventListener` 而不是 `addListener`：后者在 Safari 14 之前是唯一的口，
      // 但那个版本连 `oklch()` 都不认，整套皮肤在那儿本来就不成立
      list.addEventListener('change', notify)
      return () => list.removeEventListener('change', notify)
    },
    getSnapshot: () => window.matchMedia(query).matches
  }
  stores.set(query, store)
  return store
}

/** 这个查询现在成不成立。`fallback` 只在 node 那侧用到（见文件头） */
const useMedia = (query: string, fallback: boolean): boolean => {
  const store = storeOf(query)
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => fallback)
}

/**
 * 两栏此刻该怎么摆。
 *
 * 两个查询而不是一个「屏幕多宽」的数字：宽度本身没人需要，而按数字算会让每一次
 * 窗口尺寸变化都触发一次重渲染（拖窗口时每帧一次），媒体查询只在**跨过断点**时通知一次。
 */
export const usePaneLayout = (): PaneLayout => {
  const wide = useMedia(WIDE, true)
  const roomy = useMedia(ROOMY, true)
  return wide ? 'columns' : roomy ? 'rows' : 'stack'
}
