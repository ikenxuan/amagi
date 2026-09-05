/**
 * 控制台主界面。左栏端点列表（可收起），右栏**上下两块**：请求区与结果区（PRD 4.1 那张版面图）。
 *
 * 两块的分界是「这一步在问什么」：请求区问「拿什么参数打这一发」（参数表单 + 一键补样本 +
 * 请求集合），结果区问「打回来的东西要不要留」（待定队列 + 并排对比 + 已有类型）。
 * 各自是一张 `Card`，于是那条分界在视觉上也是一条边 —— 原先两块串在同一列里、
 * 只用一条 `Separator` 隔开，滚起来分不清脚下是哪一块。
 *
 * 两条设计约束：
 *
 * 1. **切端点不清空结果队列**。原先那版（手拼 HTML）一切端点就把结果抹掉，
 *    于是「批量录了 24 组、只处理前几条」时剩下的待定样本在服务端还在、
 *    而页面上再也碰不到它们 —— 那是个内存泄漏也是个错觉。
 *    队列里每张卡片都标着自己属于哪个端点，所以混着看不会认错。
 * 2. **界面状态进 URL**（选中的端点、左栏开合、折叠的平台分组）。
 *    这个工具的日常动作里刷新很频繁（改了 seeds、换了 cookie、想看新的样本数），
 *    而每次刷新都清空等于每次都要重新点一遍。见 `lib/urlState.ts`。
 */

import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  Chip,
  Kbd,
  Link,
  ProgressBar,
  Separator,
  toast,
  Toast,
  Tooltip,
  Typography,
  useListData
} from '@heroui/react'
import { useKeyPress, useRequest } from 'ahooks'
import { lazy, Suspense, useState } from 'react'

import { EndpointJumper } from './components/EndpointJumper'
import { EndpointList } from './components/EndpointList'
import { type KeptRequest, OutcomeCard } from './components/OutcomeCard'
import { ParamForm } from './components/ParamForm'
import { ThemeSwitch } from './components/ThemeSwitch'
import {
  type CookiesResult,
  discardSample,
  fetchCookies,
  fetchEndpoints,
  generateTypes,
  type JsonValue,
  recordBatch,
  recordOne,
  type RecordOutcome,
  saveCookies,
  storeSample
} from './lib/api'
import { storeNotice } from './lib/storeNotice'
import { useUrlFlag, useUrlParam, useUrlSet } from './lib/urlState'

/**
 * 懒加载的那四块。**判据是「选中端点之前用不到 / 要点开才看」**，不是「哪个文件大」。
 *
 * 拆出去的收益全在**入口 chunk**上：这四块拖着 HeroUI 里最重的两个东西 ——
 * `Table`（`RequestTable` 与 `ComparePanel` 共用，边际约 108 KB）与 `Drawer`。
 * 而首屏那一眼里能看见的只有头部与左栏，`endpoint === undefined` 那个分支下面
 * 这三块面板一个都不渲染，于是它们的 chunk 连请求都不会发出去。
 *
 * **`lazy()` 要 default 导出**，而这几个组件都是命名导出（测试直接 import 它们，
 * 见 `test/comparePanel.test.ts:51`），所以在这里 `.then` 转一手 ——
 * 组件文件本身不动，那些直接渲染组件的用例照旧。
 *
 * **刻意留在静态 import 里的**：`EndpointList`（左栏，首屏就要）、`ParamForm`、
 * `OutcomeCard`、`ThemeSwitch`，以及 `EndpointJumper` —— `⌘K` 随时可能被按下，
 * 而它只 13 KB，为它多一次往返不值。
 *
 * 想改回静态 import 的人会被 `test/lazy.test.ts` 绊一下：那条钉的就是这个边界本身
 * （首屏体积是个棘轮，见 `.github/workflows/release.yml` 里那两个预算）。
 */
const ComparePanel = lazy(() => import('./components/ComparePanel').then((module) => ({ default: module.ComparePanel })))
const CookieDrawer = lazy(() => import('./components/CookieDrawer').then((module) => ({ default: module.CookieDrawer })))
const GeneratedPanel = lazy(() => import('./components/GeneratedPanel').then((module) => ({ default: module.GeneratedPanel })))
const RequestTable = lazy(() => import('./components/RequestTable').then((module) => ({ default: module.RequestTable })))

/**
 * 三块面板的外壳 class。**与那三个组件根节点上的那一串逐字相同** ——
 * 这就是「fallback 不造成版面跳动」的判据：chunk 到达时换掉的只有边框里那一行字，
 * 边框、圆角、内边距、间距全都已经在原位了。
 *
 * 逐字相同这件事由 `test/lazy.test.ts` 钉住（它把这个常量与三个组件的源码对着读），
 * 所以这里是一份刻意的重复而不是漏抽的常量：抽成共享模块就等于把三个面板的根节点
 * 绑在一起，而 fallback 要的只是「长得一样」。
 */
const PANEL_SHELL = 'border-border flex min-w-0 flex-col gap-3 rounded-2xl border p-4'

/**
 * 一块面板还在路上时占的位。
 *
 * **不用 `Skeleton` 也不用 `Spinner`**：这三块面板自己的加载态就是「标题行 + 一句
 * 『正在读…』」（`RequestTable.tsx:502`、`ComparePanel.tsx:444`、`GeneratedPanel.tsx:77`），
 * 所以 fallback 照抄那个形状，chunk 落地后接的是**同一个高度的同一句话** ——
 * 骨架反而会在「骨架 → 那句话 → 内容」之间多跳一次版面，而那正是 `1e261cd`
 * 那一轮修过的问题（骨架乱插）。
 *
 * 右上角那颗按钮也占上位：它在 `md` 以下是 `h-9`、以上 `h-8`（`@heroui/styles`
 * 的 `button.css:68`），标题行的高度由它决定。用真的 `Button` 而不是一个手抄
 * 高度的方块，是为了让「一样高」这件事由构造保证，而不是由一个会过期的数字保证。
 */
const PanelFallback = ({ title, action, note }: { title: string; action: string; note: string }) => (
  <section className={PANEL_SHELL}>
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      <Button className="ml-auto" size="sm" variant="tertiary" isDisabled>
        {action}
      </Button>
    </div>
    <p className="text-muted text-sm">{note}</p>
  </section>
)

/**
 * cookie 抽屉那颗触发按钮还在路上时占的位。
 *
 * 这是四个 fallback 里**唯一首屏就会被看见的那个**（另外三块在 `endpoint === undefined`
 * 分支下根本不渲染），而它待的地方是头部那个 flex 行 —— 缺一颗按钮，左边的
 * `⌘K` 与主题开关会横着挪一下再挪回来。所以这里渲的是同一颗按钮的 disabled 版本，
 * 连那枚计数 Chip 一起：宽高由构造相同。
 */
const CookieTriggerFallback = ({ status }: { status: CookiesResult | undefined }) => {
  const configured = status?.platforms.filter((entry) => entry.hasCookie).length ?? 0
  const total = status?.platforms.length ?? 0
  return (
    <Button variant="secondary" size="sm" isDisabled>
      Cookie
      <Chip size="sm" color={configured === 0 ? 'warning' : configured === total ? 'success' : 'accent'} variant="soft">
        <Chip.Label>
          {configured}/{total}
        </Chip.Label>
      </Chip>
    </Button>
  )
}

/**
 * 两块区域标题的 id。**`aria-labelledby` 而不是再抄一遍 `aria-label`**：标签就是那两个
 * 可见标题本身，抄一份的话改了标题、读屏那边还念旧的。
 *
 * 用写死的字符串而不是 `useId()`：这两块在树里各只有一份（`endpoint === undefined` 时
 * 两块都不渲染），而写死的 id 能被源码判据指名（`test/appLayout.test.ts`）。
 */
const REQUEST_REGION_TITLE = 'request-region-title'
const RESULT_REGION_TITLE = 'result-region-title'

/**
 * 顶栏那条 `平台 / 端点`。**换掉的是一枚 Chip 里塞的 `"bilibili/videoInfo"` 字符串**
 * （PRD 5.4 那张表里 `Breadcrumbs` 那一行指的就是它）：那个斜杠是文本里的一个字符，
 * 读屏念出来是「bilibili 斜线 videoInfo」，而层级关系一个比特都没进 DOM。
 *
 * 三件事由组件给：`<ol>` / `<li>`（层级真的在结构里）、分隔符是装饰性的 svg 而不是文本、
 * 末级自动带 `aria-current="page"`（`react-aria-components` 的 `Breadcrumbs.mjs`：
 * `isCurrent = node.nextKey == null`）。
 *
 * **`<nav>` 是自己包的。** RAC 把 `useBreadcrumbs` 的 `navProps` 挂在那个 `<ol>` 上、
 * 外面没有 nav（同一份文件），于是这条路径不成地标 —— 而 WAI-ARIA 的面包屑范式要的是
 * `nav > ol > li`。`<ol>` 上那个 `aria-label` 是 RAC 按浏览器语言自己给的
 * （zh-CN 是「导航栏」，`react-aria/dist/private/intl/breadcrumbs/zh-CN.mjs`），
 * 所以这里只补地标那一层的名字，不去覆盖它。
 *
 * **平台那一级刻意 `isDisabled`。** 这个工具里没有「平台页」——「这个平台有哪些端点」
 * 只有左栏那棵树一个入口，而它不由 URL 表达。而不给 `href` 的 `Link` **仍然会渲成**
 * `role="link"` 且 `tabIndex=0`（RAC `Link.mjs:29` 按 `href && !isDisabled` 挑元素类型），
 * 那就是一个键盘能聚焦、按下去什么也不发生的死链接。`isDisabled` 之后它是纯文本，
 * 且不会变灰 —— `.breadcrumbs__link` 自己写着 `opacity-100`（`@heroui/styles` 的
 * `breadcrumbs.css:8`），因为末级本来就恒被 RAC 判成 disabled。
 */
export const EndpointCrumbs = ({ platform, endpoint }: { platform: string; endpoint: string }) => (
  <nav aria-label="当前端点">
    {/* `min-w-0` 是给下面那句 summary 让路的前提：顶栏是一个 flex 行，
        不给这一项一个可收缩的下限，它会把 summary 挤成零宽 */}
    <Breadcrumbs className="min-w-0 font-mono">
      <Breadcrumbs.Item isDisabled>{platform}</Breadcrumbs.Item>
      <Breadcrumbs.Item>{endpoint}</Breadcrumbs.Item>
    </Breadcrumbs>
  </nav>
)

/**
 * 端点定义的源文件在 GitHub 上的地址。
 *
 * **为什么是 GitHub 而不是编辑器**：`vscode://file/…` 那种 scheme 要**绝对**路径，
 * 而 `endpoint.source` 是仓库相对路径（`server/endpoints.ts:36` 拼的），浏览器这一侧
 * 拿不到仓库根在哪 —— 补上它要改契约，而阶段 5 不动 server。
 *
 * **`main` 而不是当前分支**：页面同样不知道本地 checkout 在哪个 ref 上。代价说清：
 * 点开看到的是 `main` 上那一份，不是工作区里那一份；换来的是一个真能点开的地址，
 * 而路径本身仍然是可选中的文本（想在编辑器里打开的人复制它更快）。
 */
const REPO_BLOB = 'https://github.com/ikenxuan/amagi/blob/main'

/**
 * 拼一条。**刻意不导出** —— `App.tsx` 只导出组件，多导出一个函数会让
 * `react(only-export-components)` 亮一条警告（Vite 的 fast refresh 要求一个文件只导出组件）。
 * 判据由 `SourceLink` 渲出来的那个 `href` 钉住，同样量得到（`test/appLayout.test.ts`）。
 */
const sourceUrl = (source: string): string => `${REPO_BLOB}/${source}`

/**
 * 「定义在 …」那一行。原先是纯文本路径（PRD 5.4 `Link` 那一行说的就是它）。
 *
 * `Link.Icon` 不给 children 时渲的是 `ExternalLinkIcon`（`@heroui/react` 的
 * `link.js:56`）—— 那正是「这一下会离开这一页」该有的提示（WIG 要求新开标签页要看得出来），
 * 而 `rel="noreferrer"` 顺带把 referrer 与 `window.opener` 一起断掉（前者含新式浏览器的
 * `noopener` 语义）。
 */
export const SourceLink = ({ source }: { source: string }) => (
  <Typography.Paragraph size="xs" color="muted">
    定义在{' '}
    <Link className="font-mono text-xs" href={sourceUrl(source)} target="_blank" rel="noreferrer">
      {source}
      <Link.Icon />
    </Link>
  </Typography.Paragraph>
)

/**
 * 批量录制那条进度条。**它是 indeterminate 的，而那不是偷懒。**
 *
 * `/api/record-batch` 是**一次 POST 回全部结果**（`server/index.ts:686-716`：循环连同每组
 * 之间那 1.5 秒的等待全在 server 一侧跑完，最后 `json({ outcomes })` 一次性回来），
 * 浏览器这一侧在那整段时间里收不到任何「第几组」——`lib/api.ts:121` 就是一个 `await`。
 * 所以 PRD 5.4 想要的「第几组 / 共几组」在这里**没有数据来源**，而画一条按时间自己爬的
 * 条子等于把「我不知道」渲成「我知道」：它会在真的卡住时继续爬，也会在还剩 20 组时抵达头。
 *
 * 能诚实说出口的是两件事，都在这上面：**一共几组**（`endpoint.combinations`，与按钮上
 * 那个数同一个来源）与**这事还在跑**（那正是 indeterminate 的语义 —— 「进行中，时长未知」）。
 *
 * HeroUI 这一档也真的是 indeterminate、不是一条 100% 的死条：不给 `value` 时 RAC 不渲
 * `aria-valuenow`，CSS 那条 `&:not([aria-valuenow])` 才把动画挂上（`@heroui/styles` 的
 * `progress-bar.css:52-61`），`Fill` 的 `width` 也就不写（`progress-bar.js:96` 看
 * `state.isIndeterminate`）。读屏那边听到的是「忙，进度未知」而不是一个编出来的百分比。
 * `prefers-reduced-motion` 不用在这儿补 —— 那条动画自带 `motion-reduce:animate-none`
 * （同文件），与 `src/index.css` 那段「库自己带了就别再压一遍」同一条判据。
 */
export const BatchProgress = ({ combinations }: { combinations: number }) => (
  <ProgressBar isIndeterminate size="sm" aria-label={`正在批量录制 ${combinations} 组`}>
    <ProgressBar.Output>{combinations} 组…</ProgressBar.Output>
    <ProgressBar.Track>
      <ProgressBar.Fill />
    </ProgressBar.Track>
  </ProgressBar>
)

/** 一次动作打向哪个端点。**跟着动作的参数走，不从当前选中态读** —— 见 `push` 的注释 */
interface Target {
  platform: string
  endpoint: string
}

/** 队列里的一条。`settled` 记「已入库到哪 / 已丢弃」，让人看得见自己刚做了什么 */
interface QueueItem extends Target {
  key: string
  outcome: RecordOutcome
  settled?: string
  /** 有 `settled` 那句话、但 server 那边条目还在（见 `store` 里那段与 `OutcomeCardProps.retryable`） */
  retryable?: boolean
}

/** 自增的队列 key。**不用时间戳** —— 批量 push 时同一毫秒会撞，撞了 React 会复用错卡片 */
let queueSeq = 0

/**
 * 把 `runAsync` 的 rejection 咽掉。
 *
 * `useRequest` 的 `run` 本身不抛（错误进它自己的 `error` 状态），但它返回 `void`，
 * 没法被 `OutcomeCard` 里的 `useLockFn` 等 —— 而那把锁靠 `await` 才知道动作何时结束。
 * `runAsync` 能等但会抛。错误已经由下面 `shell.onError` 记进 `failure` 并显示在顶部那条红条上，
 * 再抛一遍只会变成一条没人接的 unhandled rejection。
 */
const quiet = async (pending: Promise<unknown>): Promise<void> => {
  try {
    await pending
  } catch {
    // 已经记在 `failure` 里了
  }
}

/**
 * 一条 toast 的 description 里那几句话，**真的分行**。
 *
 * `.toast__description` 只有 `text-sm text-muted`（`@heroui/styles` 的 `components/toast.css:126-128`）
 * —— 没有 `whitespace-pre-line`，于是光把几句话用 `\n` 接起来会被 HTML 折成一段挤成一坨，
 * 而这里每一句都是一条独立的信息（路径、server 的原话、下一步做什么）。
 * 包一层比给每句套一个 `<p>` 省事，也不动 HeroUI 那个插槽的结构。
 */
const toastLines = (lines: readonly string[]) => <span className="whitespace-pre-line">{lines.join('\n')}</span>

export const App = () => {
  /** 顶部那条红条要说的话。为什么不直接读各个 `useRequest.error`，见 `shell` */
  const [failure, setFailure] = useState<string | undefined>(undefined)

  /**
   * 每个动作共用的错误壳子 —— 原先手写的 `run()` 外壳剩下的那半行。
   *
   * **为什么不直接读 `useRequest` 自己的 `error`**：它只在**成功时**清掉
   * （`Fetch.runAsync` 开跑时只设 `loading` / `params`），于是
   * 「录制失败 → 换个参数 → 生成类型成功」之后那条红条还挂在上面，说的是一件早就过去的事。
   *
   * 能当成一个对象字面量给所有实例共用，是因为这两个回调都不看参数 ——
   * `useRequest` 的 `onBefore` / `onError` 带泛型形参，少写形参对每种实例化都成立。
   * 而 ahooks 每次渲染都会重新赋 `fetchInstance.options`，所以这里不会读到旧闭包。
   */
  const shell = {
    onBefore: () => setFailure(undefined),
    onError: (cause: Error) => setFailure(cause.message)
  }

  // 界面状态存 URL：刷新后还在、能分享、前进后退能用
  const [selected, setSelected] = useUrlParam('endpoint')
  const [navOpen, toggleNav] = useUrlFlag('nav')
  const [collapsed, toggleCollapsed] = useUrlSet('collapsed')

  /**
   * 首屏两拨数据。
   *
   * `useRequest` 默认自动跑一次，且 `loading` 从**第一帧**就是 `true` ——
   * 那正是「加载中被误报成后端没起」的解药（见 `EndpointList` 的 `isLoading`）。
   * 拆成两个而不是一个 `Promise.all`：两件事失败的理由不同，也不该互相拖着。
   */
  const endpoints = useRequest(fetchEndpoints, shell)
  const cookies = useRequest(fetchCookies, shell)
  const platforms = endpoints.data ?? []

  /**
   * **首屏**：还没拿到过任何数据，所以真的没东西可显示。
   *
   * 与 `endpoints.loading` 分开是必须的 —— `refreshAsync()`（入库后、存 cookie 后各一次）
   * 只把 `loading` 置 true，**`data` 仍是上一份**。拿 `loading` 当「没东西可显示」用的话，
   * 每次刷新都会在还在的列表上方插四条骨架、把已有的端点计数换成「正在读端点清单…」，
   * 版面白跳一下，读屏那边还被 `aria-live` 多打扰一次。
   *
   * 「后端可能没起」那句仍然看 `loading`（见 `EndpointList` 的两个 prop）：
   * 那句的判据是「确实空且不在加载」，与这里不是同一条。
   */
  const firstLoad = endpoints.loading && endpoints.data === undefined

  /**
   * 结果队列。用 HeroUI 自带的 `useListData` 而不是 `useState<QueueItem[]>` ——
   * 它带 `prepend` / `update(key, fn)`，省掉「全量重建数组」那两处手写。
   *
   * **刻意不持久化过刷新**（那会是 `useLocalStorageState`）：`pendingId` 存在 server
   * 进程内存里，重启即失效，持久化只会造出一堆点了就 404 的卡片。
   */
  const queue = useListData<QueueItem>({ getKey: (item) => item.key })

  /**
   * 队头 push：新的在上面。
   *
   * `platform` / `endpoint` 从**动作的参数**来而不是从当前选中态读 ——
   * 请求飞在路上时人可能已经切走了，那时按选中态标注就会给卡片贴错标签，
   * 而队列刻意不随切端点清空（否则批量录完剩下的待定样本就再也碰不到了），
   * 于是贴错的标签会一直留在那儿。
   */
  const push = (target: Target, outcomes: RecordOutcome[]) => {
    queue.prepend(...outcomes.map((outcome) => ({ key: `q${queueSeq++}`, ...target, outcome })))
  }

  const record = useRequest(
    async (target: Target, params: Record<string, JsonValue>) => push(target, [await recordOne({ ...target, params })]),
    { manual: true, ...shell }
  )

  const batch = useRequest(
    async (target: Target) => {
      const result = await recordBatch(target)
      push(target, result.outcomes)
      if (result.notes.length > 0) {
        toast('参数矩阵有话说', { description: result.notes.join('；'), variant: 'warning' })
      }
    },
    { manual: true, ...shell }
  )

  /**
   * 「已有类型」面板重拉的计数器。
   *
   * 那块面板显示的是 `packages/response-types/` 里当前提交的那一份，而改动它的是下面
   * `generate` —— 面板自己无从知道（理由写在 `GeneratedPanel.tsx:24`）。计数器放在这一层，
   * 是因为按钮在这一层。
   */
  const [generatedRevision, setGeneratedRevision] = useState(0)

  const generate = useRequest(
    async (target: Target) => {
      const result = await generateTypes(target)
      // 盘上的产物刚被改过，让「已有类型」面板重拉一次。**不看 `written.length`**：
      // `removed` 那条（清理残留产物）同样改了盘上的东西，而重拉只是一个 GET
      setGeneratedRevision((previous) => previous + 1)
      // `note` **永远显示**：它说的是这个动作做不到的那件事（barrel 完整性）。
      // 原先它写在 warnings 的 else 分支里，于是「样本超 90 天」这类很常见的
      // 告警一出现就把它顶掉了。
      // `summary` 也要显示 —— 「没有产出文件」的真实原因（样本全被判定拒掉）
      // 就在它里面，而它原先根本没人读，界面上只剩一句自相矛盾的
      // 「这个端点还没有可用样本」配着旁边「本地已有 3 份样本」
      const lines = [
        ...(result.removed.length > 0 ? [`清理了 ${result.removed.length} 个残留产物：${result.removed.join('、')}`] : []),
        ...result.summary,
        ...(result.warnings.length > 0 ? [`需要你看一眼：${result.warnings.join('；')}`] : []),
        result.note
      ]
      toast(result.written.length === 0 ? '没有产出文件' : `已写出 ${result.written.length} 个文件`, {
        description: toastLines(lines),
        variant: result.warnings.length > 0 ? 'warning' : 'success'
      })
    },
    { manual: true, ...shell }
  )

  /**
   * 「请求集合」与「并排对比」两块面板重读的计数器。
   *
   * 它们读的是**同一个文件**（`corpus/<平台>/<端点>.requests.json`）：一块显示里面那几条记录，
   * 另一块从里面带 `sampleHash` 的条目取出「能比哪两份样本」。所以共用一个计数器不是省事 ——
   * 那个文件变一次，两块面板同时该重读，这是同一件事。
   *
   * **与 `generatedRevision` 分开则是必须的**：产物由「生成这个端点的类型」改，集合由入库改，
   * 两件事不同时发生。合成一个的话，生成一次类型会让这两块面板白拉一趟，
   * 而入库一次又不会让「已有类型」跟上。
   */
  const [requestsRevision, setRequestsRevision] = useState(0)

  const store = useRequest(
    async (item: QueueItem, record?: KeptRequest) => {
      // `record` 就是「参数进不进 git」那个开关：卡片上那张小表单填了 id 与说明才有它
      // （`OutcomeCard` 的 `KeepRequestForm`），没填就还是只写样本 —— 今天最常用的那条路
      const result = await storeSample(item.outcome.pendingId!, record)
      // 集合可能刚被追加了一条（`/api/store` 带 `id` 时那条路，`server/index.ts:545`），
      // 让那两块面板重读一遍。**不看 `requestsAppended`**：它为 false 的三种理由里有一条是
      // 「盘上那份集合读不了」，而那时集合面板正该重读一遍把 issues 显示出来
      setRequestsRevision((previous) => previous + 1)
      /**
       * 「样本存了，参数进 git 了吗」这句话。**判定在 `lib/storeNotice.ts`**（纯的、可测），
       * 这里只负责把它说出口 —— 那个形参刻意必填，理由在那边：不把「这一次送了什么 id」
       * 传过去，「凭证命中」会被说成「还没起 id」，而那正是那个文件在修的那类无声降级。
       */
      const notice = storeNotice(result, record?.id)
      /*
       * **toast 与版面留存两者都要，因为它们说的是两件事。**
       *
       * toast 说的是「刚才那一次动作的收据」：两个路径能粘进 `git status`，凭证命中 / 集合文件
       * 坏掉这两档的原话也在里面 —— 那是一次性的信息，看完就没用了。
       *
       * 而「参数没进 git」是一个**持续的状态**（这个端点的集合里就是没有这条记录），
       * toast 一走它还在。所以那半句挂到卡片的 `settled` 上：它跟着这一份样本，
       * 刷新之前一直在，而且就在人刚点过的那颗按钮的位置上。
       *
       * 版面上刻意**不再加一块 Alert**：「集合里现在有什么」那个问题下面那张 `RequestTable`
       * （:494）已经在回答了，它自己会随 `requestsRevision` 重读。再加一块只会让同一件事
       * 有两个说法，而其中一个不会更新。
       *
       * `retryable` 是「那句话在，但按钮别收」那一档：**凭证命中**与**集合文件坏了**这两格里
       * server 刻意留着待定条目（`server/index.ts:549` 那个 `if`），为的就是让人改一处再点一次，
       * 而 `storeNotice` 那两句都以「再入库一次」收尾 —— 收走按钮的话那句话在版面上无路可走。
       * 判据与那一行逐字对齐（`id` 空 = 只写样本那条正常路径，条目照常清掉）。
       */
      const consumed = result.requestsAppended || (record?.id.trim() ?? '') === ''
      queue.update(item.key, (previous) => ({ ...previous, settled: notice.settled, retryable: !consumed }))
      toast(notice.title, { description: toastLines(notice.lines), variant: notice.variant })
      // 端点的样本数变了，重拉端点清单。**只拉这一份** —— cookie 状态与入库无关，
      // 原先那个 `reload()` 顺带把它也拉了一遍
      await endpoints.refreshAsync()
    },
    { manual: true, ...shell }
  )

  const discard = useRequest(
    async (item: QueueItem) => {
      await discardSample(item.outcome.pendingId!)
      queue.update(item.key, (previous) => ({ ...previous, settled: '已丢弃' }))
    },
    { manual: true, ...shell }
  )

  const saveCookieUpdates = useRequest(
    async (updates: Record<string, string>) => {
      const result = await saveCookies(updates)
      // server 把新的状态一并回来了，`mutate` 直接写进去，不用再拉一趟
      cookies.mutate(result.status)
      // 但端点清单里的 `hasCookie` 也变了，那份得重拉
      await endpoints.refreshAsync()
      toast(`已写进 .env：${result.written} 项${result.removed > 0 ? `，清空 ${result.removed} 项` : ''}`, {
        description: '当前进程已生效，不用重启',
        variant: 'success'
      })
    },
    { manual: true, ...shell }
  )

  /**
   * 有动作在跑。
   *
   * 原先是一个 `useState<string>` 的互斥锁（到处 `busy === 'batch'` 这样比字符串），
   * 现在每个动作有自己的 `loading`，按钮上的 `isPending` 各读各的 ——
   * 但**跨动作的互斥要留着**：批量录制刻意每组间隔 1.5 秒（那是给平台风控留的余量），
   * 这时再手工「录一发」等于把那个间隔白留了。
   */
  const busy = record.loading || batch.loading || generate.loading || store.loading || discard.loading || saveCookieUpdates.loading

  // `[` 收起 / 展开左栏。不用 Cmd/Ctrl 组合键 —— 这是本机工具，单键更快。
  //
  // 键位判据**必须是谓词而不是 `useKeyPress('[', …, { exactMatch: true })`**：
  // ahooks 的字符串键名要经 `aliasKeyCodeMap` 查 `keyCode`，而那张表里没有 `'['`
  // （它在表里的名字是 `openbracket` / 219），写 `'['` 的话 `genFilterKey` 永远返回 false，
  // 这个快捷键会**静默失效**。改写成 `'openbracket'` 又会按 keyCode 匹配**物理键位** ——
  // 德语 / AZERTY 布局上 219 不是 `[`，而 Kbd 上印的是 `[`。所以判据仍然用 `event.key`。
  // 谓词形式下 `exactMatch` 被忽略（`genKeyFormatter` 直接返回函数），修饰键也就要自己判。
  //
  // 「焦点在输入框里不触发」那段本来就得手写 —— ahooks 没有这个选项，而输入框里
  // 按 `[` 不该把左栏收起来。
  useKeyPress(
    (event) => event.key === '[' && !event.metaKey && !event.ctrlKey && !event.altKey,
    (event) => {
      const target = event.target as HTMLElement | null
      if (target !== null && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      event.preventDefault()
      toggleNav()
    }
  )

  const [platformName, endpointName] = selected?.split('/') ?? []
  const platform = platforms.find((entry) => entry.platform === platformName)
  const endpoint = platform?.endpoints.find((entry) => entry.name === endpointName)

  /** 还没处理、且能入库的那些 */
  const pending = queue.items.filter((item) => item.settled === undefined && item.outcome.pendingId !== undefined)
  /** 其中没带来新形状的 —— 队头直接告诉人「有几份可以直接丢」，不用一张张卡片翻 */
  const noShapeChange = pending.filter((item) => item.outcome.shapeChanged === false).length

  return (
    <>
      {/* **必须是自闭合的兄弟节点，不能包住界面。** HeroUI v3 的 `Toast.Provider` 只渲染
          toast 那一小块区域，它的 `children` 类型是 `ReactNode | ((props: { toast }) => ReactNode)`
          —— 那是「一条 toast 长什么样」的插槽，不是提供 context 的包装层。
          把 `<main>` 塞进去的后果是：队列为空时 children 一次都不被调用，整个页面渲染成
          **零字节**，而且控制台一条错误都没有（不是崩溃，是它认为没东西要渲染）。
          `toast(...)` 走的是模块级全局队列，不依赖 React context，所以调用点无需在树内。 */}
      <Toast.Provider placement="bottom end" />
      <main className="bg-background text-foreground min-h-screen">
        <header className="border-border bg-background/80 sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b px-4 py-3 backdrop-blur">
          <Tooltip delay={400}>
            <Button isIconOnly variant="tertiary" size="sm" aria-label={navOpen ? '收起端点列表' : '展开端点列表'} onPress={toggleNav}>
              {navOpen ? '⟨' : '⟩'}
            </Button>
            <Tooltip.Content>
              <p>
                {navOpen ? '收起' : '展开'}端点列表（
                <Kbd>
                  <Kbd.Content>[</Kbd.Content>
                </Kbd>
                ）
              </p>
            </Tooltip.Content>
          </Tooltip>

          {/* 手写的 `<h1 className="text-base font-semibold">` 换成 `Typography.Heading`：
              **层级由 `level` 说**（渲出来的就是 `<h1>`），字号仍由工具类说 ——
              `typography--h1` 是 `text-4xl`（`@heroui/styles` 的 `typography.css:82`），
              那是文章标题的尺寸，而这里是一条 40 px 高的工具条。`text-base` 压得住它：
              组件样式在 `layer(components)`（`@heroui/styles/dist/index.css:14`），
              工具类在其后的 `utilities` 层，同特异性下后者胜 —— 不用 `!important`。 */}
          <Typography.Heading level={1} className="text-base">
            amagi 响应类型控制台
          </Typography.Heading>

          {endpoint !== undefined && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <EndpointCrumbs platform={platform!.platform} endpoint={endpoint.name} />
              {/* 一句话说明跟在路径后面（PRD 4.1 顶栏第三格）。`truncate` 由组件给
                  （`typography--truncate` = `block truncate`），`min-w-0` 仍要自己写 ——
                  那是 flex 子项能被压缩的前提，不写的话它会把整条顶栏顶宽 */}
              <Typography.Paragraph size="sm" color="muted" truncate className="min-w-0">
                {endpoint.summary}
              </Typography.Paragraph>
            </>
          )}

          {/* 右侧三颗按 PRD 4.1 的顺序：主题 → Cookie → `⌘K`。整组 `ml-auto` 靠右，
              所以少一颗按钮时其余几颗会横着挪 —— 那正是下面那个 fallback 要占位的理由 */}
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitch />
            {/* 抽屉是这四块里唯一**首屏就渲染**的一块（触发按钮在组件里面），所以它的 fallback
                是唯一真的会被看见一瞬间的那个 —— 而这一组是靠右的 flex 行，这里少一颗按钮
                会让左右两边的主题开关与 `⌘K` 一起横着挪一下。所以占位用的是**同一颗按钮**
                （同 variant、同 size、同文案、同那枚计数 Chip），只是 disabled：
                宽高由构造相同，没有可跳的余地。Chip 的颜色判据与 `CookieDrawer.tsx:53` 那行
                逐字相同 —— 抄一份是为了让 chunk 落地时连颜色都不闪，抄错了也只是颜色差一档。 */}
            <Suspense fallback={<CookieTriggerFallback status={cookies.data} />}>
              <CookieDrawer
                status={cookies.data}
                onSave={(updates) => quiet(saveCookieUpdates.runAsync(updates))}
                busy={saveCookieUpdates.loading}
              />
            </Suspense>
            {/* `⌘K` 跳转器。**摆在头部而不是左栏里**：左栏可以被收起（`?nav=off`），
                而这个快捷键在那个状态下恰恰最有用 —— 它是收着左栏时唯一的换端点入口。
                选中走的是同一个 `setSelected`（`useUrlParam('endpoint')`），
                与左栏共一条状态线，没有第二份真相 */}
            <EndpointJumper platforms={platforms} selected={selected} onSelect={(p, e) => setSelected(`${p}/${e}`)} />
          </div>
        </header>

        {failure !== undefined && (
          <Alert status="danger" className="mx-4 mt-4">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>出错了</Alert.Title>
              {/* `whitespace-pre-wrap`：错误文案是多行的（`lib/api.ts` 的 readableError
                  会在 HTML 响应那种情况下给出三行诊断），不保留换行就全挤成一行 */}
              <Alert.Description className="font-mono text-xs whitespace-pre-wrap">{failure}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <div className={`grid gap-6 p-4 ${navOpen ? 'lg:grid-cols-[300px_minmax(0,1fr)]' : 'lg:grid-cols-1'}`}>
          {navOpen && (
            <aside className="lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <EndpointList
                platforms={platforms}
                selected={selected}
                onSelect={(p, e) => setSelected(`${p}/${e}`)}
                collapsed={collapsed}
                onToggleCollapsed={toggleCollapsed}
                isLoading={endpoints.loading}
                isFirstLoad={firstLoad}
              />
            </aside>
          )}

          {/* 右栏。**它自己不再是 `<section>`** —— 下面那两块各是一个带名字的
              `role="region"`，外层再套一个无名 section 只会在读屏的地标清单里多一条空条目 */}
          <div className="flex min-w-0 flex-col gap-6">
            {endpoint === undefined ? (
              <div className="border-border flex flex-col items-start gap-3 rounded-2xl border border-dashed p-8">
                {/* 虚线框刻意**不换成 `Card`**：Card 是「这里有东西」的实心面，
                    而这一块要说的正相反 —— 右栏现在是空的，选一个端点它才有内容 */}
                <Typography.Heading level={2} className="text-base">
                  先选一个端点
                </Typography.Heading>
                <Typography.Paragraph size="sm" color="muted" className="max-w-prose">
                  {/* 加载中不报数 —— 「一共 0 个端点」和「后端没起」一样是误报。
                      但只有**首屏**才不报数：刷新时上一份计数还在，把它换成「正在读…」
                      只是让这段文案闪一下，而那个数并没有变得不可信 */}
                  {firstLoad
                    ? '正在读端点清单…'
                    : `左栏按平台分组，一共 ${platforms.reduce((sum, entry) => sum + entry.endpoints.length, 0)} 个端点。`}{' '}
                  选中之后这里会出现由 zod schema 派生的参数表单 —— 填参数、录一发、看类型 diff、决定留下还是丢掉。
                </Typography.Paragraph>
                {cookies.data !== undefined && cookies.data.platforms.every((entry) => !entry.hasCookie) && (
                  <p className="text-warning-soft-foreground text-sm">
                    还没有配置任何 cookie。右上角「Cookie」里填，会写进 <code className="font-mono">.env</code>。
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* **请求区**（PRD 4.1 那张图上半格）：这一块回答「拿什么参数打这一发」。
                    `Card` 换掉的是原先那个 `flex flex-col gap-4` 的裸 div —— 换来的是一层
                    `bg-surface` 与 `shadow-surface`（`@heroui/styles` 的 `card.css:4-7`），
                    于是它与下面的结果区之间有一条真的边，而不是靠一根 `Separator` 暗示。
                    `role="region"` + `aria-labelledby`：Card 渲的是 `div`（`card.js:24` 的
                    `dom.div`，`render` 换元素会被它自己警告），所以地标语义走 role 而不是 `<section>`。 */}
                <Card className="min-w-0" role="region" aria-labelledby={REQUEST_REGION_TITLE}>
                  <Card.Header className="flex-row flex-wrap items-center gap-2">
                    {/* `level={2}` 而不是 3：h1 是顶栏那条。字号仍压到 `text-sm` ——
                        与下面那三块面板自己的标题（`PanelFallback` 的 `<h2>`）同一档，
                        它们在这一层里是同级的东西。**那三块的 `<h2>` 动不了**
                        （`test/lazy.test.ts` 按逐字相同钉着），所以这里跟着它们走，
                        而不是造一个 h3 层让同一眼里出现两种大小的同类标题 */}
                    <Typography.Heading level={2} id={REQUEST_REGION_TITLE} className="text-sm">
                      请求
                    </Typography.Heading>
                  </Card.Header>

                  {/* `gap-4` 盖掉 `card__content` 自带的 `gap-1`（`card.css:26`）：
                      这一格里是表单、按钮行、告警、集合表四种东西，1 单位挤在一起 */}
                  <Card.Content className="gap-4">
                    {platform?.hasCookie === false && (
                      <Alert status="warning">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>这个平台没有 cookie</Alert.Title>
                          <Alert.Description>
                            右上角「Cookie」里填一条，会写进 <code className="font-mono">.env</code> 并立刻生效。 没 cookie
                            的端点大多会拿回登录页或风控页，那些会被入库判定拒掉。
                          </Alert.Description>
                        </Alert.Content>
                      </Alert>
                    )}

                    <ParamForm
                      // **`key` 必须带上端点名。** 表单里的控件是非受控的（用 FormData 取值），
                      // 不换 key 时 React 会复用同一批 input —— 于是切到另一个共享同名参数的端点
                      // （`aweme_id` 在 6 个抖音端点里都有）时，上一个端点的值留在框里，
                      // 而新端点的 `defaultValue` / 种子被忽略
                      key={`${platform!.platform}/${endpoint.name}`}
                      endpoint={endpoint}
                      disabled={busy}
                      onSubmit={(params: Record<string, JsonValue>) =>
                        record.run({ platform: platform!.platform, endpoint: endpoint.name }, params)
                      }
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <Tooltip delay={400} isDisabled={endpoint.unseeded.length === 0}>
                        <Button
                          variant="secondary"
                          isDisabled={busy || endpoint.unseeded.length > 0}
                          isPending={batch.loading}
                          onPress={() => batch.run({ platform: platform!.platform, endpoint: endpoint.name })}
                        >
                          一键补样本（{endpoint.combinations} 组 · 每组间隔 1.5&nbsp;秒）
                        </Button>
                        <Tooltip.Content>
                          {/* 「缺少参数」而不是「缺种子」—— 理由见 `EndpointList.tsx` 里同一处改名的注释：
                              人要知道的是「必填参数没有可用取值」，而「种子」是那个取值今天存在哪儿。
                              解法里仍然可以提 `corpus/seeds.json`，那是**去哪儿补**而不是**缺了什么** */}
                          <p>缺少参数：{endpoint.unseeded.join(' / ')} 还没有可用取值 —— 在 corpus/seeds.json 里各给它一个真实值</p>
                        </Tooltip.Content>
                      </Tooltip>

                      <Button
                        variant="secondary"
                        isDisabled={busy || endpoint.stored === 0}
                        isPending={generate.loading}
                        onPress={() => generate.run({ platform: platform!.platform, endpoint: endpoint.name })}
                      >
                        生成这个端点的类型
                      </Button>

                      <span className="text-muted text-sm tabular-nums">本地已有 {endpoint.stored} 份样本</span>
                    </div>

                    {/* 批量录制在跑时才有这一条。按钮上那个 `isPending` 说的是「这颗按钮忙着」，
                        而这条说的是「这一整批还在跑」——「一整批」是 24 组 × 1.5 秒那个量级的事，
                        一颗按钮里的小转圈撑不住它。**为什么是 indeterminate**：见 `BatchProgress` */}
                    {batch.loading && <BatchProgress combinations={endpoint.combinations} />}

                    {endpoint.unseeded.length > 0 && (
                      <Alert status="warning">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>缺少参数，批量录不了</Alert.Title>
                          <Alert.Description>
                            <code className="font-mono">{endpoint.unseeded.join(' / ')}</code> 是必填的不透明 ID， 而它们还没有可用取值 ——
                            编一个只会换回错误页。去 <code className="font-mono">corpus/seeds.json</code>{' '}
                            里各给一个真实值，或者在上面手工填一次。
                          </Alert.Description>
                        </Alert.Content>
                      </Alert>
                    )}

                    <SourceLink source={endpoint.source} />

                    {/* 「请求集合」挂在请求区的最后一格 —— PRD 4.1 版面图里「集合里的 3 组」就在
                        请求块内、参数表单下面（第 230-238 行）。它回答的是这块面板正上方那张表单
                        回答不了的问题：**别人拿什么参数才能重放出这份响应**（PRD 二 ①）。
                        `key` 带端点名与下面 `GeneratedPanel` 同一条理由：`refreshDeps` 重拉时
                        `useRequest` **留着上一份 data**，不换 key 的话切端点后有一小段时间显示的
                        还是上一个端点的那几条记录 */}
                    {/* fallback 的三句话与这块面板自己的加载态逐字相同（`RequestTable.tsx:469`
                        的标题、`:486` 的按钮、`:502` 的那句）—— 于是 chunk 落地时换掉的是
                        同一个位置上的同一行字，版面不动。理由见 `PanelFallback`。
                        **边界贴着这一块**，不与下面结果区那两块合并成一个大的：三个 chunk
                        各自到达，合一个的话任一在路上都会把另外两块一起换成 fallback */}
                    <Suspense fallback={<PanelFallback title="请求集合" action="重新读" note="正在读 corpus/ 里的请求集合…" />}>
                      <RequestTable
                        key={`requests:${platform!.platform}/${endpoint.name}`}
                        platform={platform!.platform}
                        endpoint={endpoint.name}
                        revision={requestsRevision}
                      />
                    </Suspense>
                  </Card.Content>
                </Card>

                {/* **结果区**（PRD 4.1 那张图下半格）：这一块回答「打回来的东西要不要留」。
                    三格里的顺序就是 4.2 那张表的顺序 —— 待定队列（刚录的那几份）、并排对比
                    （这两组参数的形状一样吗）、已有类型（仓库里现在是什么）。 */}
                <Card className="min-w-0" role="region" aria-labelledby={RESULT_REGION_TITLE}>
                  <Card.Header className="flex-row flex-wrap items-center gap-2">
                    <Typography.Heading level={2} id={RESULT_REGION_TITLE} className="text-sm">
                      结果
                    </Typography.Heading>
                  </Card.Header>

                  <Card.Content className="gap-4">
                    {queue.items.length === 0 ? (
                      <p className="text-muted text-sm">还没有录过。上面填参数，或者点「一键补样本」。</p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* 队列这一格的标题**留在 h2**、不降成 h3：它与下面那两块面板
                              （`并排对比` / `已有类型`，各自的 `<h2>` 在组件里且动不了）是同级的，
                              为了跟「结果」这个区名分层而单独降它一档，只会让同一眼里出现
                              两种大小的同类标题 */}
                          <Typography.Heading level={2} className="text-sm">
                            待定队列
                          </Typography.Heading>
                          <Chip size="sm" variant="soft" color={pending.length > 0 ? 'accent' : 'default'}>
                            <Chip.Label className="tabular-nums">{pending.length} 份可入库</Chip.Label>
                          </Chip>
                          {noShapeChange > 0 && (
                            <Chip size="sm" variant="soft" color="warning">
                              <Chip.Label className="tabular-nums">{noShapeChange} 份没带来新形状</Chip.Label>
                            </Chip>
                          )}
                          <span className="text-muted text-xs tabular-nums">共 {queue.items.length} 条</span>
                        </div>

                        {queue.items.map((item) => (
                          <OutcomeCard
                            key={item.key}
                            outcome={item.outcome}
                            // 队列不随切端点清空，所以每张卡片必须说清自己是哪个端点的
                            endpointLabel={`${item.platform}/${item.endpoint}`}
                            settled={item.settled}
                            retryable={item.retryable}
                            busy={busy}
                            // 那个 `record` 从卡片里那张小表单来（填了 id 与说明才有），
                            // 一路送到 `POST /api/store` 的 body 上 —— 参数就是这样进 git 的
                            onStore={(record) => quiet(store.runAsync(item, record))}
                            onDiscard={() => quiet(discard.runAsync(item))}
                          />
                        ))}
                      </div>
                    )}

                    {/* 「并排对比」是 PRD 4.2 那五个面板里的第三个，挂在队列**下面**、「已有类型」上面 ——
                        与下面那条同一个判据（它自己带两个 32rem 的代码块，压在队头上会把刚录的那一份
                        推出视野），而排在「已有类型」前面是因为 4.2 那张表里对比就在它前面：
                        「这两组参数产出的形状一样吗」是决定要不要生成的那一步，「仓库里已经有什么」是之后的事。
                        `stored` 只是为了让它说得出「本地有几份 / 这里列得出几份」那句话，
                        `key` 与 `revision` 两条同下面 `GeneratedPanel`。 */}
                    <Suspense fallback={<PanelFallback title="并排对比" action="重新读清单" note="正在读这个端点的请求集合…" />}>
                      <ComparePanel
                        key={`compare:${platform!.platform}/${endpoint.name}`}
                        platform={platform!.platform}
                        endpoint={endpoint.name}
                        stored={endpoint.stored}
                        revision={requestsRevision}
                      />
                    </Suspense>

                    {/* 「已有类型」挂在结果区末尾（PRD 4.2 里它是结果区那五个面板之一）。
                        **刻意不压在队列上面**：录完一发，新卡片是 prepend 到队头的（见 `push`），
                        而这块面板带一个 32rem 高的代码块（`GeneratedPanel.tsx:117`）——
                        放上面等于把「刚录的那一份」推到折叠线以下，而它才是主循环要看的那个东西。
                        队列为空时上面只占一行文案，所以选中端点的第一眼里这块本来就在视野内。
                        PRD 4.2 最终要把这三格变成同一排 tab 里的三个 —— 那时组件与 `revision`
                        那条线都不用动，白做的只有这个位置本身。
                        `key` 带端点名与 `ParamForm` 同类，但坏的是另一处：`refreshDeps` 重拉时
                        `useRequest` **留着上一份 data**（与 `firstLoad` 那段同一条），不换 key 的话
                        切端点后有一小段时间显示的还是上一个端点的产物路径。 */}
                    <Suspense fallback={<PanelFallback title="已有类型" action="重新读" note="正在读 packages/response-types/ 里的产物…" />}>
                      <GeneratedPanel
                        key={`generated:${platform!.platform}/${endpoint.name}`}
                        platform={platform!.platform}
                        endpoint={endpoint.name}
                        revision={generatedRevision}
                      />
                    </Suspense>
                  </Card.Content>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
