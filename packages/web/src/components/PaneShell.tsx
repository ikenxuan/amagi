/**
 * 版面的外壳：**一份纯 CSS 的三栏，外加一层懒加载的「可以拖」。**
 *
 * ## 为什么要分成两层
 *
 * 可拖拽分栏需要 `react-resizable-panels`，而那个包**打进浏览器包是 38,832 字节** ——
 * 入口预算只剩 19,749（`.github/workflows/release.yml` 那两个数），直接静态 import 会撞线，
 * 而那条预算是棘轮（那份注释的原话：「撞入口预算时先别抬它…抬上限是最后一招」），
 * 它给的顺序也正是这里走的第二步：**先看能不能改成懒加载。**
 *
 * 于是这一层的分工是：
 *
 * - {@link StaticPanes}（**在入口里，零新增字节**）：老那套 Tailwind 断点版面 ——
 *   `lg` 以下三栏叠成三行页面照常滚、`2xl` 以上 `grid-cols-[22rem_1fr_1fr]` 真并排。
 *   它同时是首屏渲的东西**和** `Suspense` 的 fallback。
 * - `SplitLayout`（**懒加载**）：同一份版面，但每两栏之间多一条能拖、能用键盘调的分隔条。
 *
 * ## 为什么这个降级是**真的**没有代价
 *
 * 两份版面的默认尺寸**逐字相同**（第一栏 22rem、其余均分；窄屏三等分）—— 那不是巧合，
 * `SplitLayout` 里 `defaultSize` 的注释就是对着这份 grid 写的。所以 chunk 落地的那一刻
 * 尺寸一个像素都不变，只是多出两条分隔条。这与「先渲一个骨架再换成内容」不同：
 * 那种会跳版面，这种不会。
 *
 * 代价只有一处，说清楚：chunk 落地时 React 把这棵子树换掉（组件类型变了），
 * 于是三栏会重挂一次。表单里已经打进去的字会丢 —— 而这件事只发生在**首屏加载后的那几十毫秒**
 * （本地开发工具，chunk 就在同一台机器上），那时人还没开始打字。
 */

import { lazy, Suspense } from 'react'

import { usePaneLayout } from '../lib/viewport'
import type { SplitPane } from './SplitLayout'

/** `lazy()` 要 default 导出，而它是命名导出（`test/` 直接 import 它），所以 `.then` 转一手 */
const SplitLayout = lazy(() => import('./SplitLayout').then((module) => ({ default: module.SplitLayout })))

export interface PaneShellProps {
  /** 左栏（端点树 + 「最近」）。`undefined` = 收起了 */
  nav?: React.ReactNode
  /** 主区里的那几栏。只有一栏时（还没选端点）不分栏 */
  panes: readonly SplitPane[]
}

/**
 * 一栏在纯 CSS 那份里的样子。
 *
 * 带 `footer` 的那一栏（今天只有「响应」）在**同一格里竖着切成两块** ——
 * `grid-rows-[3fr_2fr]` 与可拖那份的默认 60 / 40 逐字对应，于是 chunk 落地时那条线不跳。
 * 不把 footer 摊成同级的第四块：那会让外面 `grid-rows-3` / 三列的轨道数对不上，
 * 多出来的一块会掉进一条隐式轨道里（宽度 auto、把邻居挤掉）。
 */
const StaticColumn = ({ pane }: { pane: SplitPane }) =>
  pane.footer === undefined ? (
    pane.node
  ) : (
    <div className="grid min-h-0 min-w-0 grid-rows-[3fr_2fr] gap-2">
      {pane.node}
      {pane.footer.node}
    </div>
  )

/**
 * 纯 CSS 那一份。**这就是这一轮之前的版面**，一个类都没改：
 *
 * 1. `lg` 以下：左栏在上、三栏在下，页面照常滚（`<main>` 上那两条 `lg:` 前缀的另一半）。
 * 2. `lg`～`2xl`：左栏 16rem 靠左，三栏叠成三行、各占三分之一高度并各自滚。
 * 3. `2xl` 以上：三栏真并排，第一栏 22rem、其余均分。
 *
 * `minmax(0,1fr)` 而不是 `1fr`：grid 轨道的默认最小值是 `auto`，一份不换行的代码块会把
 * 那一栏顶宽、把邻居挤掉 —— 那是「每一栏自己滚」在横向上的同一个坑。
 */
export const StaticPanes = ({ nav, panes }: PaneShellProps) => (
  <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 lg:flex-row">
    {nav !== undefined && <div className="flex min-h-0 shrink-0 flex-col gap-2 lg:w-64">{nav}</div>}
    {panes.length === 1 ? (
      // 单栏（还没选端点）：`grid` 让它双向填满，与三栏那条一致
      <div className="grid min-h-0 min-w-0 flex-1">{panes[0]!.node}</div>
    ) : (
      <div className="grid min-h-0 min-w-0 flex-1 grid-rows-3 gap-2 2xl:grid-cols-[22rem_minmax(0,1fr)_minmax(0,1fr)] 2xl:grid-rows-1">
        {panes.map((pane) => (
          <StaticColumn key={pane.id} pane={pane} />
        ))}
      </div>
    )}
  </div>
)

export const PaneShell = (props: PaneShellProps) => {
  const layout = usePaneLayout()
  // **窄屏那一档压根不下载那个 chunk。** 不是省流量：竖向分栏需要父容器先有确定高度，
  // 而这一档页面本身是滚的（`<main>` 上那两条锁高度的类带 `lg:` 前缀）—— 每一栏会被压成
  // 0 高。判据与 `lib/viewport.ts` 里 `stack` 那一段是同一条。
  if (layout === 'stack') return <StaticPanes {...props} />
  return (
    <Suspense fallback={<StaticPanes {...props} />}>
      <SplitLayout {...props} />
    </Suspense>
  )
}
