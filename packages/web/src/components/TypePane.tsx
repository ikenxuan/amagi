/**
 * 「类型」那一栏：**这段响应对应的类型声明。**
 *
 * 这一栏是这一轮新增的那件东西。界面原先能回答「录了这份样本，产物文件会变成什么样」
 * （类型 diff），却答不出最直接的那个问题 —— **「刚打回来的这段 JSON，类型是什么」**。
 * 那两件事不是一回事：diff 说的是「相对已有产物的增量」，一个已经有类型的端点上它可能只有
 * 两行溯源注释；而人盯着响应看的时候想要的是一整份可以直接读、可以直接抄走的声明。
 *
 * 数据来自 `RecordOutcome.typeSource`（server 侧 `declare.ts`：这一份响应**单独**跑一次
 * 生成器，高亮也在那侧渲好）。「单独」要紧：它比全部样本合并出来的类型更严，
 * 那件事写在「已提交」那块的 tooltip 里（那一页去了仓库抽屉）。
 *
 * ## 两页（本次 / diff），已提交与对比去了仓库抽屉
 *
 * `本次`（这一发的声明）→ `diff`（这一发会让产物怎么变）。前一页回答「是什么」，
 * 后一页回答「要不要动它」。默认停在第一页，因为那是发一次请求之后最想看的东西。
 * `已提交`（仓库里当前那一份）与 `对比`（两组参数各自的形状）说的是**仓库**而不是
 * 这一发 —— 查参考的东西隔几天才动一次，不占主循环的 tab 位，搬去了标题行「仓库」
 * 那颗按钮开的抽屉（`RepoDrawer.tsx`）。
 *
 * ## 仓库抽屉是懒加载的，而它的边界摆在这个文件里
 *
 * 抽屉没打开时连 `Drawer` 的 chunk 都不请求；打开了也只下选中那页的（它里头两块
 * 再各自 lazy 且 tab-gated，两层边界的判据在 `RepoDrawer.tsx` 文件头）。
 * `lazy()` 摆在这里而不是 `App.tsx` 里，是因为「谁在用它」就在这个文件里 ——
 * 边界与用它的地方隔一个文件时，很容易在某次改动里被顺手换成静态 import。
 */

import { Button, Chip, Surface, Tabs, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { lazy, Suspense, useState } from 'react'

import type { RecordOutcome } from '../lib/api'
import { PANE, PANE_BODY, PANE_CODE, PANE_HEAD, PANE_TITLE } from '../lib/pane'
import { CodeBlock } from './CodeBlock'
import { DiffPanel } from './Result'
import { TypeTree } from './TypeTree'

/** `lazy()` 要 default 导出，而它是命名导出，所以 `.then` 转一手 */
const RepoDrawer = lazy(() => import('./RepoDrawer').then((module) => ({ default: module.RepoDrawer })))

export interface TypePaneProps {
  platform: string
  endpoint: string
  /** 当前看的那一份结果。`undefined` = 还没发过 —— 那时「本次」那一页说的就是这件事 */
  outcome?: RecordOutcome
  /** 本地已入库的样本数（「对比」那页要报得出「本地有几份」），转送仓库抽屉 */
  stored: number
  /** 「已提交」那页重拉的计数器（生成过类型之后 +1），转送仓库抽屉 */
  generatedRevision: number
  /** 「对比」那页重读的计数器（入库过之后 +1）—— 它读的是请求集合那个文件，转送仓库抽屉 */
  requestsRevision: number
}

const TITLE_ID = 'pane-type-title'

export const TypePane = ({ platform, endpoint, outcome, stored, generatedRevision, requestsRevision }: TypePaneProps) => {
  const diff = outcome?.diff ?? []
  /**
   * 「本次」那一页看哪一种。**默认是声明** —— 那份是要抄走的东西（它就是会写进
   * `packages/response-types/` 的文本），而树是用来「摸一摸这个响应有哪些字段」的。
   * 判据完整版写在 `TypeTree.tsx` 文件头。
   */
  const [view, setView] = useState<'code' | 'tree'>('code')

  return (
    <Surface className={PANE} aria-labelledby={TITLE_ID} render={(props) => <section {...props} />}>
      {/* `Tabs` 跨过标题行与正文两层：tab 条挂在标题行里（那是它该在的地方 —— 与标题同一行、
          不占正文的高度），两个 panel 在下面自己滚的那一层。两边靠 `Tabs` 的 context 连着 */}
      <Tabs defaultSelectedKey="current">
        <div className={PANE_HEAD}>
          <h2 className={PANE_TITLE} id={TITLE_ID}>
            类型
          </h2>
          <Tabs.ListContainer>
            <Tabs.List aria-label="类型面板">
              <Tabs.Tab id="current" className="whitespace-nowrap">
                本次
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="diff" className="whitespace-nowrap">
                diff
                {/* 条数挂在 tab 上：不点开也知道这一发有没有改动产物。
                 **0 条时不渲那枚 Chip**，「diff 0」是句废话，而 tab 本身还在 */}
                {diff.length > 0 && (
                  <Chip size="sm" variant="soft">
                    <Chip.Label className="tabular-nums">{diff.length}</Chip.Label>
                  </Chip>
                )}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          {/* 仓库视图的入口（已提交 / 对比去了 `RepoDrawer.tsx`）。fallback 与真身同一颗
              按钮的形状 —— `CookieTriggerFallback` 同一条判据：缺一颗按钮标题行会挪 */}
          <Suspense fallback={<Button className="ml-auto shrink-0" size="sm" variant="tertiary" isDisabled>仓库</Button>}>
            <RepoDrawer platform={platform} endpoint={endpoint} stored={stored} generatedRevision={generatedRevision} requestsRevision={requestsRevision} />
          </Suspense>
        </div>

        <div className={PANE_BODY}>
          <Tabs.Panel id="current" className="flex min-w-0 flex-col gap-2">
            {/* 两种看法之间的开关。**只在「本次」这一页出现** —— 另一页（diff）只有一种形态，
                给它一个切不动的开关是死控件。`ToggleButtonGroup` 而不是又一层 `Tabs`：
                这一栏已经有一排 tab 了，第二排 tab 会让人以为是同级的另一页 */}
            <ToggleButtonGroup
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[view]}
              onSelectionChange={(keys) => setView([...keys][0] === 'tree' ? 'tree' : 'code')}
              aria-label="这一发的类型怎么看"
              size="sm"
              className="w-fit"
            >
              <ToggleButton id="code">声明</ToggleButton>
              <ToggleButton id="tree">结构</ToggleButton>
            </ToggleButtonGroup>

            {view === 'tree' ? (
              /* 树读的是 `payload` 而不是那份声明文本（理由在 `TypeTree.tsx` 文件头）。
                 所以它在「生成失败」那一档仍然显示得出来 —— 那时人最需要看的正是
                 「这个响应到底长什么样」 */
              <TypeTree payload={outcome?.payload} />
            ) : outcome?.typeSource !== undefined ? (
              <CodeBlock code={outcome.typeSource} maxHeight={PANE_CODE} />
            ) : outcome?.typeIssue !== undefined ? (
              // **生成失败要说出来**，不是让这一页静默空着：契约里 `typeIssue` 与 `typeSource`
              // 互斥就是为了这一句（`shared/contract.ts` 那两条注释）
              <p className="text-warning-soft-foreground text-sm">{outcome.typeIssue}</p>
            ) : (
              <p className="text-muted text-sm">发一发请求，这里出现它的类型声明。</p>
            )}
          </Tabs.Panel>

          <Tabs.Panel id="diff">
            <DiffPanel diff={diff} maxHeight={PANE_CODE} />
          </Tabs.Panel>
        </div>
      </Tabs>
    </Surface>
  )
}
