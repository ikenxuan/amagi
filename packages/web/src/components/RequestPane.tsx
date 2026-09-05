/**
 * 「请求」那一栏：**拿什么参数打这一发。**
 *
 * 两页：`参数`（由端点 JSON Schema 派生的表单 + 「发送」）与 `集合`（这个端点进 git 的那份
 * 请求集合）。摆成两页而不是上下两块，为的是让参数表单**独占这一栏的高度** ——
 * 它是这一栏里唯一每次都要动的东西。
 *
 * ## 原先那一块里被删掉的是**重复**，不是信息
 *
 * 这一栏的前身是一张 `Card`，里面竖着堆：cookie 缺失的整块 `Alert`、参数表单、两颗按钮加
 * 一行计数、批量进度条、缺少参数的整块 `Alert`、「定义在 …」、以及请求集合那张表。
 * 六段文字里有三段说的是同一件事的不同长度版本（「缺少参数」在按钮的 tooltip、
 * 一整块 `Alert`、和左栏那行标签上各写了一遍）。
 *
 * 现在的判据是：**会改变下一步动作的话留在版面上，解释性的进 tooltip。**
 * 缺 cookie 与缺参数各剩一行（它们直接决定「这一发能不能打」），
 * 而「为什么」「去哪儿补」在那一行的 tooltip 里 —— 一次 hover 之外。
 *
 * ## `集合` 是一页 tab 而不是一块常驻面板
 *
 * `Tabs` 只渲选中的那一页，于是 `RequestTable` 的 chunk 在被点开之前连请求都不发。
 * 那不只是省流量：它与 `ComparePanel` 共用的 `Table` 一个就 104 KB，
 * 而入口预算只剩四万字节（`.github/workflows/release.yml` 那两个预算）。
 * 摆成 `Disclosure` 就不成立 —— 那个组件的内容**一直在 DOM 里**（只是隐藏），chunk 照样会加载。
 */

import { Button, Chip, Link, ProgressBar, Tabs, Tooltip, Typography } from '@heroui/react'
import { lazy, Suspense } from 'react'

import type { EndpointInfo, JsonValue, PlatformInfo } from '../lib/api'
import { PANE, PANE_BODY, PANE_HEAD, PANE_TITLE } from '../lib/pane'
import { ParamForm } from './ParamForm'

/** `lazy()` 要 default 导出，而它是命名导出（`test/requestTable.test.ts` 直接 import 它） */
const RequestTable = lazy(() => import('./RequestTable').then((module) => ({ default: module.RequestTable })))

/**
 * 端点定义的源文件在 GitHub 上的地址。
 *
 * **为什么是 GitHub 而不是编辑器**：`vscode://file/…` 那种 scheme 要**绝对**路径，
 * 而 `endpoint.source` 是仓库相对路径（`server/endpoints.ts:36` 拼的），浏览器这一侧
 * 拿不到仓库根在哪。**`main` 而不是当前分支**：页面同样不知道本地 checkout 在哪个 ref 上 ——
 * 代价是点开看到的是 `main` 上那一份，换来的是一个真能点开的地址。
 */
const REPO_BLOB = 'https://github.com/ikenxuan/amagi/blob/main'

/**
 * 「定义在 …」那一行。
 *
 * `Link.Icon` 不给 children 时渲的是 `ExternalLinkIcon`（`@heroui/react` 的 `link.js:56`）——
 * 那正是「这一下会离开这一页」该有的提示；`rel="noreferrer"` 顺带把 referrer 与
 * `window.opener` 一起断掉。**只剩路径本身，「定义在」那三个字去了 `title`** ——
 * 这一行在版面最底下，人认得出那是一条源码路径。
 *
 * **`title` 挂在外面那个 `<p>` 上而不是 `Link` 上**：RAC 的 `Link` 过一道 `filterDOMProps`，
 * 而 `title` 不在那份白名单里 —— 写在它上面会被**静默丢掉**（渲出来的 `<a>` 上一个字都没有）。
 * `Typography.Paragraph` 是普通的 `dom.p`，属性原样透下去。
 */
export const SourceLink = ({ source }: { source: string }) => (
  <Typography.Paragraph size="xs" color="muted" truncate className="min-w-0" title={`定义在 ${source}`}>
    <Link className="font-mono text-xs" href={`${REPO_BLOB}/${source}`} target="_blank" rel="noreferrer">
      {source}
      <Link.Icon />
    </Link>
  </Typography.Paragraph>
)

/**
 * 批量录制那条进度条。**它是 indeterminate 的，而那不是偷懒。**
 *
 * `/api/record-batch` 是**一次 POST 回全部结果**（`server/index.ts` 那个循环连同每组之间
 * 1.5 秒的等待全在 server 一侧跑完），浏览器这一侧在那整段时间里收不到任何「第几组」——
 * `lib/api.ts` 那里就是一个 `await`。画一条按时间自己爬的条子等于把「我不知道」渲成
 * 「我知道」：它会在真的卡住时继续爬，也会在还剩 20 组时抵达头。
 *
 * 能诚实说出口的是两件事，都在这上面：**一共几组**与**这事还在跑**（那正是 indeterminate
 * 的语义）。HeroUI 这一档也真的是 indeterminate：不给 `value` 时 RAC 不渲 `aria-valuenow`，
 * CSS 那条 `&:not([aria-valuenow])` 才把动画挂上（`@heroui/styles` 的 `progress-bar.css:52-61`）。
 * 读屏听到的是「忙，进度未知」而不是一个编出来的百分比。`prefers-reduced-motion` 不用在这儿补 ——
 * 那条动画自带 `motion-reduce:animate-none`。
 */
export const BatchProgress = ({ combinations }: { combinations: number }) => (
  <ProgressBar isIndeterminate size="sm" aria-label={`正在批量录制 ${combinations} 组`}>
    <ProgressBar.Output>{combinations} 组…</ProgressBar.Output>
    <ProgressBar.Track>
      <ProgressBar.Fill />
    </ProgressBar.Track>
  </ProgressBar>
)

export interface RequestPaneProps {
  platform: PlatformInfo
  endpoint: EndpointInfo
  /** 有**任何**动作在跑。跨动作的互斥要留着，理由见 `ParamFormProps.disabled` */
  busy: boolean
  /** 在跑的恰好是「发送」那一发 */
  sending: boolean
  onSend: (params: Record<string, JsonValue>) => void
  onBatch: () => void
  batchLoading: boolean
  onGenerate: () => void
  generateLoading: boolean
  /** 「集合」那页重读的计数器（入库过之后 +1） */
  requestsRevision: number
}

const TITLE_ID = 'pane-request-title'

export const RequestPane = ({
  platform,
  endpoint,
  busy,
  sending,
  onSend,
  onBatch,
  batchLoading,
  onGenerate,
  generateLoading,
  requestsRevision
}: RequestPaneProps) => {
  const paramCount = Object.keys(endpoint.schema.properties ?? {}).length

  return (
    <section className={PANE} aria-labelledby={TITLE_ID}>
      <Tabs defaultSelectedKey="params">
        <div className={PANE_HEAD}>
          <h2 className={PANE_TITLE} id={TITLE_ID}>
            请求
          </h2>
          <Tabs.ListContainer>
            <Tabs.List aria-label="请求面板">
              <Tabs.Tab id="params" className="whitespace-nowrap">
                参数
                {/* **0 个参数时不渲那枚 Chip。** 61 个端点里有 7 个一个参数都没有
                    （`packages/core/openapi.json` 数得出来），而「参数 0」是句废话 */}
                {paramCount > 0 && (
                  <Chip size="sm" variant="soft">
                    <Chip.Label className="tabular-nums">{paramCount}</Chip.Label>
                  </Chip>
                )}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="requests" className="whitespace-nowrap">
                集合
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </div>

        <div className={PANE_BODY}>
          <Tabs.Panel id="params" className="flex min-w-0 flex-col gap-3">
            {/* 缺 cookie 剩一行。**它直接决定「这一发能不能打」**，所以留在版面上；
                「去哪儿填、为什么那些端点会失败」进 tooltip */}
            {!platform.hasCookie && (
              <Tooltip delay={300}>
                <p className="text-warning-soft-foreground w-fit cursor-help text-xs underline decoration-dotted">
                  没有 {platform.platform} 的 cookie
                </p>
                <Tooltip.Content>
                  <p className="max-w-xs">
                    右上角「Cookie」里填一条，写进 .env 并立刻生效。没 cookie 的端点大多会拿回登录页或风控页，那些会被入库判定拒掉。
                  </p>
                </Tooltip.Content>
              </Tooltip>
            )}

            <ParamForm
              // **`key` 必须带上端点名。** 控件是非受控的（用 FormData 取值），不换 key 时
              // React 会复用同一批 input —— 于是切到另一个共享同名参数的端点（`aweme_id`
              // 在 6 个抖音端点里都有）时，上一个端点的值留在框里，新端点的种子被忽略
              key={`${platform.platform}/${endpoint.name}`}
              endpoint={endpoint}
              disabled={busy}
              sending={sending}
              onSubmit={onSend}
            />

            {/* 次要动作那一行。**`tertiary` 是刻意的**：这一栏要人做的决定只有「发送」，
                批量与生成是隔一阵子才用一次的东西，视觉上得让位 */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Tooltip delay={300}>
                <Button
                  size="sm"
                  variant="tertiary"
                  isDisabled={busy || endpoint.unseeded.length > 0}
                  isPending={batchLoading}
                  onPress={onBatch}
                >
                  批量 {endpoint.combinations} 组
                </Button>
                <Tooltip.Content>
                  <p className="max-w-xs">
                    {endpoint.unseeded.length > 0
                      ? `缺少参数：${endpoint.unseeded.join(' / ')} 还没有可用取值 —— 在 corpus/seeds.json 里各给它一个真实值`
                      : '按参数矩阵连录，每组之间隔 1.5 秒（给平台风控留的余量）'}
                  </p>
                </Tooltip.Content>
              </Tooltip>

              <Tooltip delay={300}>
                <Button
                  size="sm"
                  variant="tertiary"
                  isDisabled={busy || endpoint.stored === 0}
                  isPending={generateLoading}
                  onPress={onGenerate}
                >
                  生成类型
                </Button>
                <Tooltip.Content>
                  <p className="max-w-xs">
                    把这个端点已入库的 {endpoint.stored} 份样本合并写进 packages/response-types/。整棵树的一致性仍然要跑一次 pnpm
                    gen:types。
                  </p>
                </Tooltip.Content>
              </Tooltip>

              <span className="text-muted tabular-nums">本地 {endpoint.stored} 份</span>
            </div>

            {/* 批量在跑时才有这一条。按钮上那个 `isPending` 说的是「这颗按钮忙着」，
                而这条说的是「这一整批还在跑」—— 24 组 × 1.5 秒那个量级的事，小转圈撑不住 */}
            {batchLoading && <BatchProgress combinations={endpoint.combinations} />}

            <SourceLink source={endpoint.source} />
          </Tabs.Panel>

          <Tabs.Panel id="requests">
            <Suspense fallback={<p className="text-muted text-sm">正在读 corpus/ 里的请求集合…</p>}>
              {/* `key` 带端点名：`refreshDeps` 重拉时 `useRequest` **留着上一份 data**，
                  不换 key 的话切端点后有一小段时间显示的还是上一个端点的那几条记录 */}
              <RequestTable
                key={`requests:${platform.platform}/${endpoint.name}`}
                platform={platform.platform}
                endpoint={endpoint.name}
                revision={requestsRevision}
              />
            </Suspense>
          </Tabs.Panel>
        </div>
      </Tabs>
    </section>
  )
}
