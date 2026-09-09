/**
 * 「仓库」抽屉：`已提交` / `对比` 两页 —— 它们说的是**仓库**而不是这一发。
 *
 * 为什么要从「类型」栏的 tab 里搬出来：那一栏合并成「结果」栏之后，四个 tab 说的都得是
 * **这一发**（响应 / 声明 / 结构 / diff），而这两页是查参考 ——「我是不是在重复劳动」、
 * 「两组参数差在哪」 —— 隔几天才动一次的东西不该占主循环的 tab 位。抽屉的先例是
 * 「集合」那张五列宽的表（`RequestTable.tsx` 的 `CollectionDrawer`），`ComparePanel`
 * 也是一张宽表，`max-w-5xl` 与它同一档。
 *
 * **两层懒加载边界**：抽屉整只 lazy（宿主是 `ResultPane`），它里头两块再各自 lazy 且
 * tab-gated。抽屉整只 lazy 的收益是**它不进入口包** —— 触发按钮（下面那颗）住在 lazy
 * 组件里、无条件渲染，chunk 随「结果」栏首帧就拉，并不省「点开才下载」；真有那笔收益的
 * 是里头那两块：开抽屉 + 选中那一页才拉，而 `Tabs` 只渲选中的那一页才让这件事成立
 * （`ComparePanel` 与 `RequestTable` 共用的 `Table` 一个就 104 KB）。
 */

import { Button, Drawer, Tabs } from '@heroui/react'
import { lazy, Suspense, useState } from 'react'

/** `lazy()` 要 default 导出，而这两个是命名导出（测试直接 import 它们），所以 `.then` 转一手 */
const GeneratedPanel = lazy(() => import('./GeneratedPanel').then((module) => ({ default: module.GeneratedPanel })))
const ComparePanel = lazy(() => import('./ComparePanel').then((module) => ({ default: module.ComparePanel })))

/** 与面板自己的加载态同一句话 —— chunk 落地时换掉的是同一位置上的同一行字，版面不动 */
const TabFallback = ({ note }: { note: string }) => <p className="text-muted text-sm">{note}</p>

export interface RepoDrawerProps {
  platform: string
  endpoint: string
  /** 本地已入库的样本数。只是让「对比」那块说得出「本地有几份 / 这里列得出几份」 */
  stored: number
  /** 「已提交」那页重拉的计数器（生成过类型之后 +1）。理由见 `GeneratedPanelProps.revision` */
  generatedRevision: number
  /** 「对比」那页重读的计数器（入库过之后 +1）—— 它读的是请求集合那个文件 */
  requestsRevision: number
}

export const RepoDrawer = ({ platform, endpoint, stored, generatedRevision, requestsRevision }: RepoDrawerProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Drawer isOpen={open} onOpenChange={setOpen}>
      {/* 第一个孩子就是触发按钮（同 `CollectionDrawer` 那颗的构造）。
          **那枚样本数 Chip 去掉了**：它挂在「仓库」这个词旁边，而这颗按钮开的是
          「已提交的产物 / 两组参数对比」两页 —— 一个与那两页都无关的数贴在上面，
          读起来像「仓库里有 3 样东西」。那个数真正的读者是「对比」那一页自己
          （`stored` 仍然一路递下去，它要说得出「本地有几份」） */}
      <Button className="ml-auto shrink-0" size="sm" variant="tertiary">
        仓库
      </Button>
      <Drawer.Backdrop variant="blur">
        <Drawer.Content placement="right">
          {/* `max-w-5xl` 而不是 `max-w-lg`（cookie 抽屉那一档）：这里装的是
              `ComparePanel` 那张宽表，给它 64rem 才不用横向滚 */}
          <Drawer.Dialog className="w-full max-w-5xl">
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading>
                {platform}/{endpoint} 的仓库视图
              </Drawer.Heading>
            </Drawer.Header>
            {/* **这一行是高度链的第一环。** `.drawer__body` 的基类是
                `min-h-0 flex-1 overflow-y-auto` —— 有高度，但它是**块级**的，
                于是里面那棵 `Tabs` 上的 `flex-1` 一点作用都没有（没有 flex 容器可分空间），
                整棵树按内容收缩：「已提交」那页于是长着一个 32rem 的代码块坐在一屏高的
                抽屉里，下面一大片死白。改成 flex 列 + 自己不滚，滚动交给两页各自
                （见下面那两个 Panel 的 class）。覆盖得动是因为工具类在 `utilities` 层、
                而 `.drawer__body` 在 `layer(components)`，同特异性下后者输 ——
                同 `PANE_HEAD` 那条。`overflow-y-hidden` 而不是 `overflow-hidden`：
                前者与基类那个 `overflow-y-auto` 是同一个属性，覆盖才确定 */}
            <Drawer.Body className="flex min-h-0 flex-col overflow-y-hidden">
              {/* 与 `ResultPane` 里那棵一样要自己带 `min-h-0 flex-1`：HeroUI 的 `.tabs`
                  基类只有 `flex gap-2 flex-col`，没有这两个（判据在 `appLayout.test.ts`） */}
              <Tabs defaultSelectedKey="committed" className="min-h-0 flex-1">
                <Tabs.ListContainer>
                  <Tabs.List aria-label="仓库面板">
                    <Tabs.Tab id="committed" className="whitespace-nowrap">
                      已提交
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="compare" className="whitespace-nowrap">
                      对比
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
                {/* **两页的滚动契约不同，所以 class 落在每个 Panel 上**（同「结果」栏那四页）。
                    这一页装的是一块自带滚动的代码块 ⇒ 自己不滚（两层都滚会在边界卡一下），
                    高度交给它填满（`GeneratedPanel` 里那个 `fill`）—— 那是 `PANE_BODY_TIGHT`
                    与 `CodeBlock` 的 `fill` 那条成对约定，这里落在 tab 上 */}
                <Tabs.Panel id="committed" className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <Suspense fallback={<TabFallback note="正在读 packages/response-types/ 里的产物…" />}>
                    {/* `key` 带端点名：`useRequest` 重拉时留着上一份 data，不换 key 会让切换的
                        那几帧显示上一个端点的产物 */}
                    <GeneratedPanel key={`generated:${platform}/${endpoint}`} platform={platform} endpoint={endpoint} revision={generatedRevision} />
                  </Suspense>
                </Tabs.Panel>
                {/* 这一页是「两块代码 + 一张 44rem 宽的表」竖着堆，加起来必然超过一屏 ⇒
                    **它自己就是那个滚动层**。抽屉本体不滚了（上面那行），少了这一句这一页会被裁掉 */}
                <Tabs.Panel id="compare" className="min-h-0 flex-1 overflow-y-auto">
                  <Suspense fallback={<TabFallback note="正在读这个端点的请求集合…" />}>
                    <ComparePanel key={`compare:${platform}/${endpoint}`} platform={platform} endpoint={endpoint} stored={stored} revision={requestsRevision} />
                  </Suspense>
                </Tabs.Panel>
              </Tabs>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
