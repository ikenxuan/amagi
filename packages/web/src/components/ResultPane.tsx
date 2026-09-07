/**
 * 「结果」那一栏：**这一发打回来了什么、它是什么形状、这份留不留。**
 *
 * ## 四个 tab = 这一发的三种看法 + 留不留的依据
 *
 * `响应`（脱敏后的 JSON）→ `声明`（这一份单独跑一次生成器的 TypeScript）→ `结构`（字段树）
 * → `diff`（留下它产物会怎么变）。前三页回答「是什么」，diff 回答「要不要留它」——
 * 它正是动作条上那个决定的依据。默认停在「响应」：发一次请求之后最想看的就是它。
 * `已提交` 与 `对比` 不在这里：它们说的是**仓库**而不是这一发（查参考，不进主循环），
 * 在标题行「仓库」那颗按钮开的抽屉里（`RepoDrawer.tsx`）。
 *
 * ## 滚动契约逐 tab 落
 *
 * 「响应」「声明」两页里只有一块自带滚动的代码块，Panel 用 `PANE_BODY_TIGHT`（两层都滚
 * 会在边界卡一下）；「结构」「diff」的内容自己滚，Panel 用 `PANE_BODY`。class 落在
 * **每个 `Tabs.Panel`** 上而不是外面共用的 div —— 四页两种契约，这是与旧版唯一不同的结构。
 *
 * ## 提示字的规则（这一轮分级之后的绊线，别让版面再长回去）
 *
 * 版面上常驻的说明文字只许留**会改变下一步动作**的那句（「这份不能入库」+ 原因、
 * 「建议丢掉」、缺 cookie）；讲原理、讲来历的（字符集规则、写进哪个文件、流程预告）
 * 一律退到 tooltip 或 `FieldError`。判据是「每一发都要看」还是「偶尔要查」——
 * 当年那 14 处提示字就是每处单看都合理地长出来的。
 *
 * ## 懒加载边界
 *
 * `JsonViewer` 懒在「响应」页里；`RepoDrawer` 整只懒（抽屉不常开），它里头的
 * `GeneratedPanel` / `ComparePanel` 再各自 lazy 且 tab-gated —— 两层边界，判据在
 * `lazy.test.ts`。
 */

import { Button, Chip, Surface, Tabs } from '@heroui/react'
import { lazy, Suspense, useMemo } from 'react'

import type { RecordOutcome } from '../lib/api'
import { PANE, PANE_BODY, PANE_BODY_TIGHT, PANE_CODE, PANE_HEAD, PANE_TITLE } from '../lib/pane'
import { CodeBlock } from './CodeBlock'
import { DiffPanel, type KeptRequest, PayloadPanel } from './Result'
import type { RepoDrawerProps } from './RepoDrawer'
import { ResultActions } from './ResultActions'
import { TypeTree } from './TypeTree'

/** `lazy()` 要 default 导出，而这两个是命名导出（测试直接 import 它们），所以 `.then` 转一手 */
const JsonViewer = lazy(() => import('./JsonViewer').then((module) => ({ default: module.JsonViewer })))
const RepoDrawer = lazy(() => import('./RepoDrawer').then((module) => ({ default: module.RepoDrawer })))

/**
 * 字节数说成一句人话。1024 以下报字节：那个量级里「小」本身就是信息；以上报一位小数的
 * KB，再往上不换 MB —— 「9,000 KB」比「8.8 MB」更能让人意识到这份响应有多离谱。
 */
const sizeOf = (bytes: number): string => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`)

export interface ResultPaneProps {
  platform: string
  endpoint: string
  /** 当前看的那一份结果。`undefined` = 还没发过 —— 那时整个 tab 区就一句话 */
  outcome?: RecordOutcome
  /** 这一份属于哪个端点（`平台/端点`）。不标出来，点「留下」时会认错端点 */
  endpointLabel?: string
  /** 已经处理过（入库或丢弃）时那句收据 */
  settled?: string
  /** 收据在但 server 还留着条目 —— 「留下 / 丢掉」不许收走，判据在 `ResultActions` */
  retryable?: boolean
  /** 本地已入库的样本数（「对比」那页要报得出「本地有几份」），转送仓库抽屉 */
  stored: number
  /** 「已提交」那页重拉的计数器（生成过类型之后 +1），转送仓库抽屉 */
  generatedRevision: number
  /** 「对比」那页重读的计数器（入库过之后 +1），转送仓库抽屉 */
  requestsRevision: number
  /** 有动作在跑。两个入库动作都要禁 */
  busy: boolean
  /** 入库 / 丢弃。必须返回 Promise —— `useLockFn` 靠 `await` 才知道动作何时结束 */
  onStore: (record?: KeptRequest) => Promise<void>
  onDiscard: () => Promise<void>
  /**
   * 测试用来选起始页的口子：`Tabs` 只渲选中的那一页（懒加载的前提），而默认停在
   * 「响应」——「声明」那一页的分支只有从这里才渲得出来。生产里没人传它。
   */
  defaultTab?: 'response' | 'declaration' | 'structure' | 'diff'
}

const TITLE_ID = 'pane-result-title'

/** 仓库抽屉那颗触发按钮（连 Suspense 一起）—— 空态与标题行两处都要它 */
const RepoTrigger = (props: RepoDrawerProps) => (
  // fallback 与真身同一颗按钮的形状（`CookieTriggerFallback` 同一条判据：缺一颗按钮标题行会挪）
  <Suspense fallback={<Button className="ml-auto shrink-0" size="sm" variant="tertiary" isDisabled>仓库</Button>}>
    <RepoDrawer {...props} />
  </Suspense>
)

export const ResultPane = ({
  platform,
  endpoint,
  outcome,
  endpointLabel,
  settled,
  retryable = false,
  stored,
  generatedRevision,
  requestsRevision,
  busy,
  onStore,
  onDiscard,
  defaultTab
}: ResultPaneProps) => {
  const diff = outcome?.diff ?? []
  const http = outcome?.http
  /**
   * 喂给 Monaco 的那段正文。**`useMemo` 不是优化而是必需** —— 一份 1.3 MB 的响应每渲染一次
   * stringify 一遍会卡住拖分隔条。走 `payload` 而不是被 server 截过的 `payloadHighlight`。
   */
  const source = useMemo(() => (outcome?.payload === undefined ? undefined : JSON.stringify(outcome.payload, null, 2)), [outcome?.payload])

  const repo = { platform, endpoint, stored, generatedRevision, requestsRevision }

  return (
    <Surface className={PANE} aria-labelledby={TITLE_ID} render={(props) => <section {...props} />}>
      {outcome === undefined ? (
        /* 还没发过：一句话空状态（原先有四句几乎同义的话，去重成这一句），tab 都不渲 ——
           四个空 tab 不如一句「下一步做什么」。不进 Tabs.Panel：Tabs 只渲选中那一页，
           四个 panel 各放一句就是又回到四处 */
        <>
          <div className={PANE_HEAD}>
            <h2 className={`sr-only ${PANE_TITLE}`} id={TITLE_ID}>
              结果
            </h2>
            <RepoTrigger {...repo} />
          </div>
          <div className={PANE_BODY}>
            <p className="text-muted text-sm">左边填参数，按「发送」。</p>
          </div>
        </>
      ) : (
        // 根上那两个类是高度链的一环：HeroUI 的 `.tabs` 基类只有 `flex gap-2 flex-col`，
        // 没有 `flex-1` / `min-h-0` —— 整棵 Tabs 会按内容收缩，把最底下那块（Monaco 宿主）
        // 塌成 5px（实测 1105 → 93 → 29 → 5）。判据在 `appLayout.test.ts`「中间那两层容器」
        <Tabs defaultSelectedKey={defaultTab ?? 'response'} className="min-h-0 flex-1">
          {/* `Tabs` 跨过标题行与正文两层（同旧版 TypePane 的理由）：tab 条挂在标题行里，
              四个 panel 在下面各自滚的那一层，两边靠 `Tabs` 的 context 连着 */}
          <div className={PANE_HEAD}>
            {/* 标题行没有可见标题：四个 tab 名合起来已经说了这一栏是什么。但 `<h2>` 不能删 ——
                `aria-labelledby` 指着它，读屏照常念「结果，区域」；它只是不占宽度 */}
            <h2 className={`sr-only ${PANE_TITLE}`} id={TITLE_ID}>
              结果
            </h2>
            <Tabs.ListContainer>
              <Tabs.List aria-label="结果面板">
                <Tabs.Tab id="response" className="whitespace-nowrap">
                  响应
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="declaration" className="whitespace-nowrap">
                  声明
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="structure" className="whitespace-nowrap">
                  结构
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
            {/* 收据说的是整发请求而不是某个视图，所以挂标题行、不随 tab 动。
                **`status` 为 0 表示一发都没打出去**，那时报的是那个 0 而不是留白 */}
            {http !== undefined && (
              <span className="text-muted shrink-0 font-mono text-xs tabular-nums">
                {http.status} · {http.durationMs} ms · {sizeOf(http.bytes)}
              </span>
            )}
            <RepoTrigger {...repo} />
          </div>

          <Tabs.Panel id="response" className={PANE_BODY_TIGHT}>
            {source === undefined ? (
              /* 没有 `payload` 的那一档（一发都没打出去）：Monaco 没有正文可显示，
                 而 `PayloadPanel` 那条回落会把这件事说出来（它渲的是 `null`） */
              <PayloadPanel payload={outcome.payload} highlight={outcome.payloadHighlight} fill />
            ) : (
              /* fallback 是 server 已经渲好的那份高亮 —— 同一段 JSON、同一套配色，
                 chunk 落地时换掉的只有能力（折叠 / 搜索 / 跳行） */
              <Suspense fallback={<PayloadPanel payload={outcome.payload} highlight={outcome.payloadHighlight} fill />}>
                <JsonViewer text={source} />
              </Suspense>
            )}
          </Tabs.Panel>

          <Tabs.Panel id="declaration" className={PANE_BODY_TIGHT}>
            {/* `fill` 而不是 `maxHeight={PANE_CODE}`：这一栏整屏高，高度由格子决定，不再按视口估。
                **`PANE_CODE` 只剩「diff」那一页这一个读者** */}
            {outcome.typeSource !== undefined ? (
              <CodeBlock code={outcome.typeSource} fill />
            ) : outcome.typeIssue !== undefined ? (
              // **生成失败要说出来**，不是让这一页静默空着（契约里两字段互斥就是为了这一句）
              <p className="text-warning-soft-foreground text-sm">{outcome.typeIssue}</p>
            ) : (
              <p className="text-muted text-sm">这一份没有类型声明。</p>
            )}
          </Tabs.Panel>

          {/* 树读的是 `payload` 而不是那份声明文本 —— 「生成失败」那一档它照样显示得出来 */}
          <Tabs.Panel id="structure" className={PANE_BODY}>
            <TypeTree payload={outcome.payload} />
          </Tabs.Panel>

          <Tabs.Panel id="diff" className={PANE_BODY}>
            <DiffPanel diff={diff} maxHeight={PANE_CODE} />
          </Tabs.Panel>
        </Tabs>
      )}

      {/* 动作条：决定永远在视野里（判据在 `ResultActions.tsx` 文件头）。
          没有 `outcome` 时整条不渲 —— 空面板配「这里以后会有东西」正是要删的那类提示 */}
      {outcome !== undefined && (
        <ResultActions outcome={outcome} endpointLabel={endpointLabel} settled={settled} retryable={retryable} busy={busy} onStore={onStore} onDiscard={onDiscard} />
      )}
    </Surface>
  )
}
