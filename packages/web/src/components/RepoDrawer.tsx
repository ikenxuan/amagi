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

import { Button, Chip, Drawer, Tabs } from '@heroui/react'
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
      {/* **与 `CollectionDrawer` 那颗逐字同构**：第一个孩子就是触发按钮，连那枚计数
          Chip 一起（`stored > 0` 才渲，同它那条 `count > 0` 的规则） */}
      <Button className="ml-auto shrink-0" size="sm" variant="tertiary">
        仓库
        {stored > 0 && (
          <Chip size="sm" variant="soft">
            <Chip.Label className="tabular-nums">{stored}</Chip.Label>
          </Chip>
        )}
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
            <Drawer.Body>
              <Tabs defaultSelectedKey="committed">
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
                <Tabs.Panel id="committed">
                  <Suspense fallback={<TabFallback note="正在读 packages/response-types/ 里的产物…" />}>
                    {/* `key` 带端点名：`useRequest` 重拉时留着上一份 data，不换 key 会让切换的
                        那几帧显示上一个端点的产物 */}
                    <GeneratedPanel key={`generated:${platform}/${endpoint}`} platform={platform} endpoint={endpoint} revision={generatedRevision} />
                  </Suspense>
                </Tabs.Panel>
                <Tabs.Panel id="compare">
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
