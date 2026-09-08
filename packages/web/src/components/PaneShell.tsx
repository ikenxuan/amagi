/**
 * 版面的外壳：**一份纯 CSS 的两栏，外加一层懒加载的「可以拖」。**
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
 * - {@link StaticPanes}（**在入口里，零新增字节**）：`stack` 按请求 → 响应 → 样本自然流动；
 *   `rows` 外层按 40:60 上下分、右侧再按 70:30 分；`columns` 外层按 40:60 并排。
 *   它同时是首屏渲的东西**和** `Suspense` 的 fallback。
 * - `SplitLayout`（**懒加载**）：同一份版面，但每两栏之间多一条能拖、能用键盘调的分隔条。
 *
 * ## 为什么这个降级是**真的**没有代价
 *
 * 两份版面的默认比例**逐字相同**（外层 40:60、右侧 70:30），横向最小宽度也与
 * 可拖版的显式约束对齐。所以 chunk 落地的那一刻尺寸不跳，只是多出两条分隔条。
 * 这与「先渲一个骨架再换成内容」不同：那种会跳版面，这种不会。
 *
 * 代价只有一处，说清楚：chunk 落地时 React 把这棵子树换掉（组件类型变了），
 * 于是两栏会重挂一次。表单里已经打进去的字会丢 —— 而这件事只发生在**首屏加载后的那几十毫秒**
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
 * 纯 CSS 那一份与可拖版保留同一棵语义树：
 *
 * 1. `stack`：请求、响应、样本处理自然流动，页面照常滚。
 * 2. `rows`：请求与整个右侧按 40:60 上下分；请求至少 5rem，右侧至少 21.5rem，
 *    才能容纳内部 12rem 响应、9rem 样本处理与 0.5rem 分隔缝。
 * 3. `columns`：请求与右侧按 40:60 并排，且保住 22rem / 28rem 的横向下限。
 *
 * 比例包装层都建立 `grid` / `h-full` 高度链；否则子级 `Surface` 只会按内容收缩，
 * `PANE_BODY` 的 `flex-1` 与面板内滚动就拿不到可分配高度。
 */
const StaticResultStack = ({ pane, layout }: { pane: SplitPane; layout: ReturnType<typeof usePaneLayout> }) => {
  if (pane.children === undefined) return pane.node
  return (
    <div
      className={
        layout === 'stack'
          ? 'flex flex-col gap-2'
          : 'grid h-full min-h-0 grid-rows-[minmax(12rem,7fr)_minmax(9rem,3fr)] gap-2'
      }
    >
      {pane.children.map((child) => (
        <div className="grid h-full min-h-0 min-w-0" key={child.id}>
          {child.node}
        </div>
      ))}
    </div>
  )
}

/**
 * Static fallback mirrors the resizable hierarchy: request/result-stack is 40:60 in columns,
 * while response/sample inside the right stack is 70:30. Rows keep request above the same
 * nested stack; stack mode simply flows all three semantic regions in document order.
 */
export const StaticPanes = ({ nav, panes }: PaneShellProps) => {
  const layout = usePaneLayout()
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 lg:flex-row">
      {nav !== undefined && <div className="flex min-h-0 shrink-0 flex-col gap-2 lg:w-64">{nav}</div>}
      {panes.length === 1 ? (
        <div className="grid min-h-0 min-w-0 flex-1">{panes[0]!.node}</div>
      ) : (
        <div className="grid min-h-0 min-w-0 flex-1 gap-2 lg:grid-rows-[minmax(5rem,2fr)_minmax(21.5rem,3fr)] xl:grid-cols-[minmax(22rem,2fr)_minmax(28rem,3fr)] xl:grid-rows-1">
          <div className="grid h-full min-h-0 min-w-0">{panes[0]!.node}</div>
          <StaticResultStack pane={panes[1]!} layout={layout} />
        </div>
      )}
    </div>
  )
}

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
