/**
 * 两栏（外加左栏）的**可拖拽**版面。这一轮把「宽度写死在 Tailwind 类里」换成「人自己拖」。
 *
 * **这个文件整份是懒加载的**（边界在 `PaneShell.tsx`，那边也写着为什么）——
 * `react-resizable-panels` 打进浏览器包 38,832 字节，而入口预算只剩 19,749。
 * 首屏渲的是同一份版面的纯 CSS 版，这个 chunk 落地之后才多出那几条分隔条。
 *
 * ## 为什么要一个第三方库，而不是自己监听 `pointermove`
 *
 * 自己写的版本能在十几行里跑起来，但会缺三样东西，而缺哪一样都会让这个控件变成
 * 「只有鼠标能用」的装饰：
 *
 * 1. **键盘。** 分隔条要是 `role="separator"` + `tabIndex=0` + 左右/上下箭头改变尺寸 +
 *    `aria-valuenow/min/max` 报当前比例。`react-resizable-panels` 的 `Separator` 把这一整套
 *    都渲出来了（判据在它的 `dist/*.js`：`role: "separator"`、`aria-orientation`、
 *    `aria-valuemax/min/now`、`aria-controls`、`tabIndex`）。
 * 2. **约束求解。** 两栏各有 `minSize`，拖到边界时余量要往邻居身上推、推不动就停 ——
 *    手写版本在「拖第一条把第二栏挤到负数」这类情形上会算错。
 * 3. **触摸与粗指针。** 它按 `pointer:coarse` 放大命中区（`resizeTargetMinimumSize`），
 *    并且给拖动方向之外的滚动留了 `touch-action`。
 *
 * 选 `react-resizable-panels`（4.12.3）而不是 `allotment` / `re-resizable`：前者是
 * shadcn/ui 的 `Resizable` 用的那一个（社区实测最多），`allotment` 是把 VS Code 的
 * split view 搬出来的一整套、体积是它的几倍，`re-resizable` 解的是「单个元素八个把手」
 * 那个问题，不是「一组面板共享一条约束」。
 *
 * ## 两档宽度、三层 `Group`
 *
 * 哪一档由 `lib/viewport.ts` 说（那边写着为什么这件事非得进 JS）：
 *
 * - `columns`（≥ 80rem，Tailwind 的 `xl`）：两栏真的并排，**拖的是宽度** —— 这是主场。
 * - `rows`（≥ 64rem 的 `lg`，但不到 `xl`）：两栏叠成两行、各自滚，**拖的是高度**。
 *   凑不够 2 × 28rem 时并排比上下堆更糟（一份代码块横向就装不下）。
 *
 * 第三档（`stack`，< 64rem）**到不了这个文件**：`PaneShell` 在那一档直接渲纯 CSS 的版面、
 * 连这个 chunk 都不请求 —— 那一档页面照常滚，而竖向 `Group` 需要父容器先有确定高度。
 *
 * 两档都是**三层嵌套**：外层横排 `[左栏, 主区]`，主区按断点横排或竖排
 * `[请求, 右侧]`，右侧始终竖排 `[响应, 样本处理]`。不摊平成一个多块 `Group` 是刻意的 ——
 * 拖左栏不应改变主区比例，拖请求区也不应改变响应与样本之间的 70:30。
 *
 * ## 尺寸记在 localStorage，不进 URL
 *
 * 这一页其余的界面状态都进 URL（`lib/urlState.ts`：选中的端点、左栏开合、折叠的分组），
 * 判据是「刷新后还在 + 能分享」。栏宽**刻意不进** URL：它是「我这块屏幕上顺手的宽度」，
 * 分享给别人只会把对方的版面按我的屏幕比例改一遍；而且拖动是连续动作，写进 URL 等于
 * 每次拖完都改一次地址栏。`useDefaultLayout` 把它写进 localStorage，一行 prop 的事。
 *
 * 横排与竖排的主区**各记一份**（group id 带 orientation），嵌套的响应/样本组再用独立的
 * `amagi-result-stack-vertical`。同一个比例在横排是宽度、在竖排是高度，不能互相覆盖。
 */

import { Fragment, type ReactNode, useMemo } from 'react'
import { Group, type LayoutStorage, Panel, Separator, useDefaultLayout } from 'react-resizable-panels'

import { usePaneLayout } from '../lib/viewport'

/**
 * 分隔条：**8px 一条缝，正中一根 1px 的线。**
 *
 * 缝里露出来的是页面底色（面板是 `--surface`，页面是 `--background`），所以「这里是两块面板
 * 的边界」这件事由亮度差说 —— 那也正是面板这一轮能把整圈边框去掉的原因（`lib/pane.ts`）。
 * 正中那根线是**留给发现性的**：一条 8px 的透明缝没有任何东西表明它能拖，
 * 而 1px 的 `--border` 既不像边框（它在两块之间，不勾勒任何东西的轮廓）又足以让人试着去按。
 *
 * 三档状态全走库给的 `data-separator`（它的取值就是状态名：`hover` / `active` / `focus` /
 * `disabled`），拖动时那根线变成 accent 并加粗 —— 于是「我正在拖这一条」看得见。
 * 焦点那档另外用 `focus-visible:`：库的 `focus` 状态是 `onFocus` 给的（鼠标点一下也算），
 * 而这个仓库的判据一律是 `:focus-visible`（`src/index.css` 里那段焦点环注释）。
 *
 * `after:` 伪元素而不是塞一个子节点：`Separator` 的 children 会渲进那个 `role="separator"`
 * 的元素里，而 separator 的内容在读屏那边是要被念出来的 —— 一个纯装饰的 span 得再挂
 * `aria-hidden`。伪元素压根不进无障碍树。
 */
const SPLIT =
  'relative shrink-0 rounded-full after:absolute after:inset-0 after:m-auto after:rounded-full after:bg-border after:transition-colors after:duration-150 data-[separator=hover]:after:bg-accent data-[separator=active]:after:bg-accent focus-visible:outline-none focus-visible:after:bg-focus'

/** 横排时那条竖线（宽 8px、线 1px，拖动时加粗到 2px） */
const SPLIT_X = `${SPLIT} w-2 cursor-col-resize after:h-full after:w-px data-[separator=active]:after:w-0.5 focus-visible:after:w-0.5`
/** 竖排时那条横线 */
const SPLIT_Y = `${SPLIT} h-2 cursor-row-resize after:w-full after:h-px data-[separator=active]:after:h-0.5 focus-visible:after:h-0.5`

/**
 * 每个 `Panel` 里那层 div 的行内样式。
 *
 * **`overflow: hidden` 必须显式给。** `Panel` 往它内层那个 div 上写死了
 * `overflow: 'auto'`（行内样式，见它的 `dist/*.js`），而行内样式压得过 `PANE` 上的
 * `overflow-hidden` 工具类 —— 于是每一栏会多出一层自己的滚动条，
 * 与 `PANE_BODY` 那层叠成两个。库把用户的 `style` 拼在它自己那份之后，所以这里覆盖得掉。
 */
const CLIP = { overflow: 'hidden' } as const

/**
 * localStorage 的**可在 node 里跑**的包装。
 *
 * `useDefaultLayout` 的 `storage` 默认参数是**裸的 `localStorage`**（它的
 * `dist/*.js`：`storage: o = localStorage`），而默认参数是调用时求值的 ——
 * 在 node 里（`renderToStaticMarkup`，见 `test/` 那几份组件测试）那是个
 * `ReferenceError`，一渲染就炸。所以这里必须显式传一份。
 *
 * 模块级的**同一个对象**：它进 `useDefaultLayout` 内部的 `useMemo` 依赖，
 * 每次渲染换一个新对象会让那份 memo 每帧都重算。
 */
const memory = new Map<string, string>()
const LAYOUT_STORAGE: LayoutStorage = {
  getItem: (key) => (typeof localStorage === 'undefined' ? (memory.get(key) ?? null) : localStorage.getItem(key)),
  setItem: (key, value) => {
    if (typeof localStorage === 'undefined') memory.set(key, value)
    else localStorage.setItem(key, value)
  }
}

/**
 * 外层那两块面板的 id。**它们同时是 DOM 的 `id` 属性与 localStorage 里的记账键**
 * （库把 `Panel` 的 `id` 两处都用），所以带前缀 —— `id="main"` 这种通名在一页里
 * 与别人撞上时，撞出来的是「拖左栏改错了另一块」这种查不出来的怪事。
 */
const NAV_ID = 'amagi-pane-nav'
const MAIN_ID = 'amagi-pane-main'

/**
 * 一栏。`id` 是尺寸记账的键；`defaultSize` 应带显式单位（本页比例用 `%`）。
 * 外层组会在横排和竖排间切换，所以可分别声明宽度与高度下限；嵌套组固定竖排时只需 `minSize`。
 */
export interface SplitPane {
  id: string
  node: ReactNode
  defaultSize?: string | number
  minSize?: string | number
  minSizeByOrientation?: Partial<Record<'horizontal' | 'vertical', string | number>>
  children?: readonly SplitPane[]
}

export interface SplitLayoutProps {
  /** 左栏（端点树 + 「最近」）。`undefined` = 收起了，那时连它那条分隔条一起不渲 */
  nav?: ReactNode
  /**
   * 主区里的那几栏。
   *
   * 只有一栏时（还没选端点的那一档）**不套 `Group`** —— 一个面板的分栏没有可拖的东西，
   * 而空 `Group` 会在 localStorage 里留一份没有意义的账。
   */
  panes: readonly SplitPane[]
}

interface PanelGroupProps {
  id: string
  panes: readonly SplitPane[]
  orientation: 'horizontal' | 'vertical'
  defaultLayout: ReturnType<typeof useDefaultLayout>['defaultLayout']
  onLayoutChanged: ReturnType<typeof useDefaultLayout>['onLayoutChanged']
  separatorLabel: string
}

/**
 * A single implementation for every resizable group. Keeping panels and separators here ensures
 * explicit pane hints, clipping, keyboard support, and stable semantic ids cannot drift between
 * the outer request/result split and the nested response/sample split.
 */
const PanelGroup = ({ id, panes, orientation, defaultLayout, onLayoutChanged, separatorLabel }: PanelGroupProps) => {
  const split = orientation === 'horizontal' ? SPLIT_X : SPLIT_Y
  return (
    <Group key={`${id}-${orientation}`} id={id} orientation={orientation} defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged}>
      {panes.map((pane, index) => (
        <Fragment key={pane.id}>
          {index > 0 && <Separator className={split} aria-label={separatorLabel} />}
          <Panel
            id={pane.id}
            defaultSize={pane.defaultSize}
            minSize={pane.minSizeByOrientation?.[orientation] ?? pane.minSize}
            className="grid min-h-0 min-w-0"
            style={CLIP}
          >
            {pane.children === undefined ? pane.node : <NestedResultGroup panes={pane.children} />}
          </Panel>
        </Fragment>
      ))}
    </Group>
  )
}

/** The response/sample split has its own vertical persistence key in both outer orientations. */
const NestedResultGroup = ({ panes }: { panes: readonly SplitPane[] }) => {
  const paneKey = panes.map((pane) => pane.id).join(',')
  const paneIds = useMemo(() => paneKey.split(','), [paneKey])
  const result = useDefaultLayout({ id: 'amagi-result-stack-vertical', panelIds: paneIds, storage: LAYOUT_STORAGE })
  return (
    <PanelGroup
      id="amagi-result-stack-vertical"
      panes={panes}
      orientation="vertical"
      defaultLayout={result.defaultLayout}
      onLayoutChanged={result.onLayoutChanged}
      separatorLabel="拖动调整响应区与样本处理区的高度"
    />
  )
}

export const SplitLayout = ({ nav, panes }: SplitLayoutProps) => {
  // **只有 `columns` / `rows` 两档到得了这里** —— 窄屏那一档由 `PaneShell` 挡在外面
  // （连这个 chunk 都不请求），理由写在那边那个 `if` 上
  const orientation = usePaneLayout() === 'columns' ? 'horizontal' : 'vertical'
  const hasNav = nav !== undefined

  /**
   * 两份尺寸账。**`panelIds` 必须是稳定引用** —— 它进 `useDefaultLayout` 内部的
   * `useMemo` 依赖，每次渲染换一个新数组会让 `defaultLayout` 每帧都换身份，
   * 而那个值又是 `Group` 的 prop：等于每一帧都把布局重置一次，拖到一半会被弹回去。
   *
   * 所以依赖挂在**拼起来的那个字符串**上而不是 `panes` 数组上 —— 调用方每次渲染都会
   * 现造一个新数组（`panes={[…]}` 是个字面量），拿它当依赖等于没有 memo。
   */
  const shellIds = useMemo(() => (hasNav ? [NAV_ID, MAIN_ID] : [MAIN_ID]), [hasNav])
  const paneKey = panes.map((pane) => pane.id).join(',')
  const paneIds = useMemo(() => paneKey.split(','), [paneKey])

  const shell = useDefaultLayout({ id: 'amagi-shell', panelIds: shellIds, storage: LAYOUT_STORAGE })
  // group id 带 orientation：横排与竖排各记一份，理由见文件头最后一段
  const inner = useDefaultLayout({ id: `amagi-panes-${orientation}`, panelIds: paneIds, storage: LAYOUT_STORAGE })

  const main =
    panes.length === 1 ? (
      // `grid` 而不是 `flex`：单个子项在 grid 里默认双向 `stretch`，于是那块面板自己就把
      // 这一格填满，不用给它加 `flex-1`（面板组件不收 className，没法从外面塞）
      <div className="grid min-h-0 min-w-0 flex-1">{panes[0]!.node}</div>
    ) : (
      <PanelGroup
        id={`amagi-panes-${orientation}`}
        panes={panes}
        orientation={orientation}
        defaultLayout={inner.defaultLayout}
        onLayoutChanged={inner.onLayoutChanged}
        separatorLabel="拖动调整请求区与右侧区域的宽高"
      />
    )

  /**
   * 外面这层 div 不是多余的。
   *
   * `Group` 往自己身上写死了行内 `height: 100%; width: 100%`，而百分比高度要拿**外面那层**
   * 的确定高度来解 —— 直接把 `flex-1` 挂在 `Group` 上不行：行内的 `height: 100%` 压得过
   * 工具类，于是它会算成整个 `<main>` 的高度（100vh），把顶栏那一截顶到视口外面去
   * （而 `<main>` 有 `lg:overflow-hidden`，被顶出去的那截是直接没了）。
   * 这层 div 拿 `flex-1` 领到「减掉顶栏之后剩下的高度」，`Group` 的 100% 才有正确的参照。
   * 内边距也放这里，于是缝隙宽度（8px）与分隔条一致。
   */
  return (
    <div className="min-h-0 flex-1 p-2">
      <Group id="amagi-shell" orientation="horizontal" defaultLayout={shell.defaultLayout} onLayoutChanged={shell.onLayoutChanged}>
        {hasNav && (
          <>
            <Panel
              id={NAV_ID}
              defaultSize="16rem"
              minSize="12rem"
              maxSize="30rem"
              className="flex min-h-0 min-w-0 flex-col gap-2"
              style={CLIP}
            >
              {nav}
            </Panel>
            <Separator className={SPLIT_X} aria-label="拖动调整端点列表的宽度" />
          </>
        )}
        <Panel id={MAIN_ID} className="grid min-h-0 min-w-0" style={CLIP}>
          {main}
        </Panel>
      </Group>
    </div>
  )
}
