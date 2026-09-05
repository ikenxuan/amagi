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
 * 那件事写在下面「已提交」那一页的 tooltip 里 —— 两页并排放着，人自己看得见差别。
 *
 * ## 四页的顺序 = 从「这一发」到「仓库里」
 *
 * `本次`（这一发的声明）→ `已提交`（仓库里当前那一份）→ `diff`（这一发会让产物怎么变）→
 * `对比`（两组参数各自的形状）。前两页回答「是什么」，后两页回答「要不要动它」。
 * 默认停在第一页，因为那是发一次请求之后最想看的东西。
 *
 * ## 后三页是懒加载的，而 `Tabs` 让这件事真的成立
 *
 * `Tabs` **只渲选中的那一页**，所以那三块的 chunk 在被点开之前连请求都不发 ——
 * 这不只是省流量：`ComparePanel` 与 `RequestTable` 共用的 `Table` 一个就 104 KB，
 * 而入口预算只剩四万字节（`.github/workflows/release.yml` 那两个预算）。
 * `lazy()` 摆在这里而不是 `App.tsx` 里，是因为「谁在用它」就在这个文件里 ——
 * 边界与用它的地方隔一个文件时，很容易在某次改动里被顺手换成静态 import。
 */

import { Chip, Tabs } from '@heroui/react'
import { lazy, Suspense } from 'react'

import type { RecordOutcome } from '../lib/api'
import { PANE, PANE_BODY, PANE_CODE, PANE_HEAD, PANE_TITLE } from '../lib/pane'
import { CodeBlock } from './CodeBlock'
import { DiffPanel } from './Result'

/** `lazy()` 要 default 导出，而这两个是命名导出（测试直接 import 它们），所以 `.then` 转一手 */
const ComparePanel = lazy(() => import('./ComparePanel').then((module) => ({ default: module.ComparePanel })))
const GeneratedPanel = lazy(() => import('./GeneratedPanel').then((module) => ({ default: module.GeneratedPanel })))

/**
 * 一块面板还在路上时那一行。
 *
 * **与那几块面板自己的加载态是同一句话**（`ComparePanel.tsx:444`、`GeneratedPanel.tsx:77`
 * 都是一行 `text-muted text-sm` 的「正在读…」），所以 chunk 落地时换掉的是同一个位置上的
 * 同一行字，版面不动。**不用 `Skeleton` 也不用 `Spinner`**：那会在「骨架 → 那句话 → 内容」
 * 之间多跳一次版面。
 */
const TabFallback = ({ note }: { note: string }) => <p className="text-muted text-sm">{note}</p>

export interface TypePaneProps {
  platform: string
  endpoint: string
  /** 当前看的那一份结果。`undefined` = 还没发过 —— 那时「本次」那一页说的就是这件事 */
  outcome?: RecordOutcome
  /** 本地已入库的样本数。只是让「对比」那块说得出「本地有几份 / 这里列得出几份」 */
  stored: number
  /** 「已提交」那页重拉的计数器（生成过类型之后 +1）。理由见 `GeneratedPanelProps.revision` */
  generatedRevision: number
  /** 「对比」那页重读的计数器（入库过之后 +1）—— 它读的是请求集合那个文件 */
  requestsRevision: number
}

const TITLE_ID = 'pane-type-title'

export const TypePane = ({ platform, endpoint, outcome, stored, generatedRevision, requestsRevision }: TypePaneProps) => {
  const diff = outcome?.diff ?? []

  return (
    <section className={PANE} aria-labelledby={TITLE_ID}>
      {/* `Tabs` 跨过标题行与正文两层：tab 条挂在标题行里（那是它该在的地方 —— 与标题同一行、
          不占正文的高度），四个 panel 在下面自己滚的那一层。两边靠 `Tabs` 的 context 连着 */}
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
              <Tabs.Tab id="committed" className="whitespace-nowrap">
                已提交
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
              <Tabs.Tab id="compare" className="whitespace-nowrap">
                对比
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </div>

        <div className={PANE_BODY}>
          <Tabs.Panel id="current">
            {outcome?.typeSource !== undefined ? (
              <CodeBlock code={outcome.typeSource} maxHeight={PANE_CODE} />
            ) : outcome?.typeIssue !== undefined ? (
              // **生成失败要说出来**，不是让这一页静默空着：契约里 `typeIssue` 与 `typeSource`
              // 互斥就是为了这一句（`shared/contract.ts` 那两条注释）
              <p className="text-warning-soft-foreground text-sm">{outcome.typeIssue}</p>
            ) : (
              <p className="text-muted text-sm">发一发请求，这里出现它的类型声明。</p>
            )}
          </Tabs.Panel>

          <Tabs.Panel id="committed">
            <Suspense fallback={<TabFallback note="正在读 packages/response-types/ 里的产物…" />}>
              {/* `key` 带端点名：`refreshDeps` 重拉时 `useRequest` **留着上一份 data**，
                  不换 key 的话切端点后有一小段时间显示的还是上一个端点的产物路径 */}
              <GeneratedPanel
                key={`generated:${platform}/${endpoint}`}
                platform={platform}
                endpoint={endpoint}
                revision={generatedRevision}
              />
            </Suspense>
          </Tabs.Panel>

          <Tabs.Panel id="diff">
            <DiffPanel diff={diff} maxHeight={PANE_CODE} />
          </Tabs.Panel>

          <Tabs.Panel id="compare">
            <Suspense fallback={<TabFallback note="正在读这个端点的请求集合…" />}>
              <ComparePanel
                key={`compare:${platform}/${endpoint}`}
                platform={platform}
                endpoint={endpoint}
                stored={stored}
                revision={requestsRevision}
              />
            </Suspense>
          </Tabs.Panel>
        </div>
      </Tabs>
    </section>
  )
}
