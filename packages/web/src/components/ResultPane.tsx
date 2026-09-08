/**
 * 「结果」那一栏：**这一发打回来了什么、它是什么形状 —— 只管查看，不管处理。**
 *
 * ## 四个 tab = 这一发的三种看法 + 一份依据
 *
 * `响应`（**默认原始**、可切样本，见下）→ `声明`（这一份单独跑一次生成器的 TypeScript）
 * → `结构`（字段树）→ `diff`（留下它产物会怎么变）。前三页回答「是什么」，diff 回答
 * 「要不要留它」。默认停在「响应」：发一次请求之后最想看的就是它。
 * 「留下 / 丢掉 / 共享参数」**不在这里**：处理这一份样本是「样本处理」栏的事
 * （`SamplePane.tsx`，嵌套 result stack 的下面 30%）—— 这一栏的高度全部用于查看。
 * `已提交` 与 `对比` 也不在这里：它们说的是**仓库**而不是这一发（查参考，不进主循环），
 * 在标题行「仓库」那颗按钮开的抽屉里（`RepoDrawer.tsx`）。
 *
 * ## 「响应」页的原始 / 样本两档（第三处无声截断的披露，PRD 阶段 3）
 *
 * `payload` 是「先裁剪（`trimSample`，每个数组留前 3 条）再脱敏」的**样本** —— 入库的就是它；
 * 而人发完请求最想看的是**真实响应**，它一份都没少地躺在 `rawPayload` 里。两档切换
 * （`ToggleButtonGroup`，PRD 组件表里给 Pretty/Raw 点的正是它），**默认原始**：被无声截断
 * 咬过一次之后，「先看到全量、想看入库形状再切样本」才是对的顺序。`rawPayload` 缺失
 * （旧 server、`compute`、一发都没打出去）时回落样本视图、切换整个不渲 —— 没有第二档
 * 可切。原始档没有 server 高亮（shiki 只渲了样本那份），Monaco 落地前的回落走
 * `PayloadPanel` 自己的纯文本路（20,000 字上限 + 披露，同 `CodeBlock` 那条契约）。
 * **视图状态在 `App`**：`SamplePane` 的复制按钮与这里的切换共享同一份 ——
 * 不共享的话，切到「原始」的人复制出去的却是「样本」。
 *
 * ## 滚动契约逐 tab 落
 *
 * 「响应」「声明」两页里只有一块自带滚动的代码块，Panel 用 `PANE_BODY_TIGHT`（两层都滚
 * 会在边界卡一下）；「结构」「diff」的内容自己滚，Panel 用 `PANE_BODY`。class 落在
 * **每个 `Tabs.Panel`** 上而不是外面共用的 div —— 四页两种契约，这是与旧版唯一不同的结构。
 *
 * ## 懒加载边界
 *
 * `JsonViewer` 懒在「响应」页里；`RepoDrawer` 整只懒（抽屉不常开），它里头的
 * `GeneratedPanel` / `ComparePanel` 再各自 lazy 且 tab-gated —— 两层边界，判据在
 * `lazy.test.ts`。
 */

import { Button, Chip, Surface, Tabs, ToggleButton, ToggleButtonGroup, Tooltip } from '@heroui/react'
import { lazy, Suspense, useMemo } from 'react'

import type { RecordOutcome } from '../lib/api'
import { PANE, PANE_BODY, PANE_BODY_TIGHT, PANE_CODE, PANE_HEAD, PANE_TITLE } from '../lib/pane'
import { CodeBlock } from './CodeBlock'
import { DiffPanel, PayloadPanel, type PayloadView } from './Result'
import type { RepoDrawerProps } from './RepoDrawer'
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
  /** 本地已入库的样本数（「对比」那页要报得出「本地有几份」），转送仓库抽屉 */
  stored: number
  /** 「已提交」那页重拉的计数器（生成过类型之后 +1），转送仓库抽屉 */
  generatedRevision: number
  /** 「对比」那页重读的计数器（入库过之后 +1），转送仓库抽屉 */
  requestsRevision: number
  /** 有动作在跑。生成按钮要跟着禁 */
  busy: boolean
  /** 生成当前端点的类型产物 */
  onGenerate: () => void
  /** 在跑的恰好是生成动作；只有它让生成按钮进入 pending */
  generateLoading: boolean
  /** 本地计算端点没有样本，不显示生成入口 */
  computed: boolean
  /**
   * 「响应」页当前显示哪一份（原始 / 样本）。**状态在 `App`** —— `SamplePane` 的复制按钮
   * 与这里的切换控件共享同一份（Task 6 把它从本组件内部升上去），这一栏只是消费与上报
   */
  payloadView: PayloadView
  onPayloadViewChange: (view: PayloadView) => void
  /**
   * 测试用来选起始页的口子：`Tabs` 只渲选中的那一页（懒加载的前提），而默认停在
   * 「响应」——「声明」那一页的分支只有从这里才渲得出来。生产里没人传它。
   */
  defaultTab?: 'response' | 'declaration' | 'structure' | 'diff'
}

const TITLE_ID = 'pane-result-title'

/**
 * 仓库抽屉那颗触发按钮还在路上时占的位。
 *
 * 与 `App.tsx` 里 `CookieTriggerFallback` 同一条判据：它待的地方是标题行（空态那一行
 * 也是）靠右的位置，缺一颗按钮的话旁边的元素会横着挪一下再挪回来。所以这里渲的是
 * **同一颗按钮**的 disabled 版本，连那枚计数 Chip 一起（`stored > 0` 才渲，与真身
 * 同一条规则）—— 宽高由构造相同，chunk 落地时不闪。真身那份在 `RepoDrawer.tsx`
 * 里抄着，而抄而不是 import 是刻意的：跨过去会让 `ResultPane → lazy(RepoDrawer) →
 * ResultPane` 成环，`pnpm deps:check`（dpdm）会为循环依赖置非零退出码（同
 * `RequestPane.tsx` 里 `CollectionTrigger` 那条理由）。
 */
const RepoTriggerFallback = ({ stored }: { stored: number }) => (
  <Button className="ml-auto shrink-0" size="sm" variant="tertiary" isDisabled>
    仓库
    {stored > 0 && (
      <Chip size="sm" variant="soft">
        <Chip.Label className="tabular-nums">{stored}</Chip.Label>
      </Chip>
    )}
  </Button>
)

/** 仓库抽屉那颗触发按钮（连 Suspense 一起）—— 空态与标题行两处都要它 */
const RepoTrigger = (props: RepoDrawerProps) => (
  <Suspense fallback={<RepoTriggerFallback stored={props.stored} />}>
    <RepoDrawer {...props} />
  </Suspense>
)

export const ResultPane = ({
  platform,
  endpoint,
  outcome,
  stored,
  generatedRevision,
  requestsRevision,
  busy,
  onGenerate,
  generateLoading,
  computed,
  payloadView,
  onPayloadViewChange,
  defaultTab
}: ResultPaneProps) => {
  const diff = outcome?.diff ?? []
  const http = outcome?.http
  /** rawPayload 不在（旧 server / `compute` / 一发都没打出去）就回落样本档，切换整个不渲 */
  const hasRaw = outcome?.rawPayload !== undefined
  /**
   * 当前那一档。**状态在 `App`**（换一份结果它重置回原始 —— 视图是跟着「这一份」走的，
   * 不跟着人上一次的选择）；`rawPayload` 缺失时的回落在这一侧算，两份 props 都不说谎
   */
  const view: PayloadView = hasRaw ? payloadView : 'sample'
  /** 当前那档显示的值：原始（全量、未脱敏）或样本（裁剪 + 脱敏后，`normalized` 优先） */
  const body = view === 'raw' ? outcome?.rawPayload : outcome?.payload
  /**
   * 喂给 Monaco 的那段正文。**`useMemo` 不是优化而是必需** —— 一份 1.3 MB 的响应每渲染一次
   * stringify 一遍会卡住拖分隔条。走 `body` 而不是被 server 截过的 `payloadHighlight`。
   */
  const source = useMemo(() => (body === undefined ? undefined : JSON.stringify(body, null, 2)), [body])
  /**
   * Monaco 落地前的那份回落：**同一档的纯文本版**。原始档没有 server 高亮（shiki 只渲了
   * 样本那份），走 `PayloadPanel` 自己的 20,000 字上限 + 披露 —— chunk 落地时换掉的只有
   * 能力（折叠 / 搜索 / 跳行），显示的仍然是同一份正文。抽成变量而不是内联在那个
   * `fallback={…}` 上：两档各一个 `PayloadPanel`，内联进去是一条两百多字符的三元
   */
  const responseFallback =
    view === 'raw' ? <PayloadPanel payload={body} fill /> : <PayloadPanel payload={outcome?.payload} highlight={outcome?.payloadHighlight} fill />

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
          {/* `Tabs` 跨过标题行与正文两层：tab 条挂在标题行里，四个 panel 在下面各自滚的
              那一层 —— 两层不是同一个 DOM 容器，靠 `Tabs` 的 context 连着 */}
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
                **`status` 为 0 表示一发都没打出去**，那时报的是那个 0 而不是留白。
                样本的体积并排报出来 ——「差这么多」就是截断最直观的量；没有 `sampleBytes`
                （旧 server、被判定拒掉的那发）时只报真实体积 */}
            {http !== undefined && (
              <span className="text-muted shrink-0 font-mono text-xs tabular-nums">
                {http.status} · {http.durationMs} ms · {sizeOf(http.bytes)}
                {http.sampleBytes !== undefined && `（样本 ${sizeOf(http.sampleBytes)}）`}
              </span>
            )}
            {!computed && (
              <Tooltip delay={300}>
                <Button
                  size="sm"
                  variant="tertiary"
                  isDisabled={busy || stored === 0}
                  isPending={generateLoading}
                  onPress={onGenerate}
                >
                  生成类型
                </Button>
                <Tooltip.Content>
                  <p className="max-w-xs">
                    把这个端点已入库的 {stored} 份样本合并写进 packages/response-types/。整棵树的一致性仍然要跑一次 pnpm
                    gen:types。
                  </p>
                </Tooltip.Content>
              </Tooltip>
            )}
            <RepoTrigger {...repo} />
          </div>

          <Tabs.Panel id="response" className={PANE_BODY_TIGHT}>
            {/* 两档切换。**rawPayload 在才渲**：缺它就是没有第二档可切的那几条路。
                选中态与下面的正文、动作条里复制按钮的那份正文，读的是同一个 `view` */}
            {hasRaw && (
              <ToggleButtonGroup
                aria-label="响应显示哪一份"
                size="sm"
                selectionMode="single"
                // 两档互斥且必须有一个选中 —— 「都不选」在「看哪一份」上没有语义（同 ThemeSwitch）
                disallowEmptySelection
                selectedKeys={[view]}
                onSelectionChange={(keys) => {
                  const next = [...keys][0]
                  if (next === 'raw' || next === 'sample') onPayloadViewChange(next)
                }}
                className="shrink-0 self-start"
              >
                <ToggleButton id="raw">原始</ToggleButton>
                <ToggleButton id="sample">样本</ToggleButton>
              </ToggleButtonGroup>
            )}
            {source === undefined ? (
              /* 没有 `payload` 的那一档（一发都没打出去）：Monaco 没有正文可显示，
                 而 `PayloadPanel` 那条回落会把这件事说出来（它渲的是 `null`） */
              <PayloadPanel payload={outcome.payload} highlight={outcome.payloadHighlight} fill />
            ) : (
              /* fallback 是上面那个 `responseFallback` —— 同一档的纯文本版，判据在它那儿 */
              <Suspense fallback={responseFallback}>
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
    </Surface>
  )
}
