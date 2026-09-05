/**
 * 控制台主界面。**三栏并排：请求 / 响应 / 类型**，左边一条端点导航。
 *
 * ## 这一轮把版面从「一列往下堆」换成了「一屏横着摆」
 *
 * 原先是左栏 + 右栏，右栏里上下两张 `Card`（请求区、结果区），结果区里每份结果一张
 * `OutcomeCard`。三个后果，同一个成因：
 *
 * 1. **横向空间几乎全空着**，纵向永远不够 —— 一张 `Card` 里最宽的东西是一段说明文字，
 *    剩下的宽度全是留白；同时响应 JSON 与类型 diff 被压在两个 32rem 高的框里上下排。
 * 2. **滚不到底。** 批量录 24 组之后结果区有几十屏高，而人一次只看一份。
 * 3. **要回答的问题跨着屏。** 「这段 JSON 对应的类型对不对」得同时看两块，
 *    而它们上下排、隔着一屏。
 *
 * 现在：**每一栏自己滚、页面不滚**（判据全在 `lib/pane.ts`），响应与它的类型声明并排，
 * 「哪一份结果」由左栏底下那份「最近」一行一条地选。
 *
 * ## 主循环剩三步：选端点 → 填参数发送 → 看响应与类型声明
 *
 * 留下 / 丢掉 / 批量 / 生成 / 对比 / 集合**一个都没删**，但它们退到了各自那一栏的标题行
 * 或 tab 里 —— 那是这个工具的第二层（这份样本要不要进 corpus），而它原先与第一层
 * （打一发看看）混在同一列里，于是最常做的事和偶尔做的事一样显眼。
 *
 * 三条设计约束，前两条是旧的：
 *
 * 1. **切端点不清空结果队列。** 原先那版（手拼 HTML）一切端点就把结果抹掉，于是
 *    「批量录了 24 组、只处理前几条」时剩下的待定样本在服务端还在、而页面上再也碰不到 ——
 *    那既是内存泄漏也是个错觉。队列整份留着，只是**按端点过滤**（见 `shown`）。
 * 2. **界面状态进 URL**（选中的端点、左栏开合、折叠的平台分组）。这个工具的日常动作里
 *    刷新很频繁（改了 seeds、换了 cookie、想看新的样本数），每次刷新都清空等于每次
 *    都要重新点一遍。见 `lib/urlState.ts`。
 * 3. **锁死视口高度只在 `lg` 以上。** 窄屏上三栏叠成三行、页面照常滚 —— 在那个宽度上
 *    锁高度会让每一栏只剩几行可见，比滚动糟得多。
 */

import { Alert, Breadcrumbs, Button, Chip, Kbd, Separator, toast, Toast, Tooltip, Typography, useListData } from '@heroui/react'
import { useKeyPress, useRequest } from 'ahooks'
import { lazy, Suspense, useState } from 'react'

import { EndpointJumper } from './components/EndpointJumper'
import { EndpointList } from './components/EndpointList'
import { HistoryList } from './components/HistoryList'
import { RequestPane } from './components/RequestPane'
import { ResponsePane } from './components/ResponsePane'
import type { KeptRequest } from './components/Result'
import { ThemeSwitch } from './components/ThemeSwitch'
import { TypePane } from './components/TypePane'
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
import { PANE, PANE_BODY, PANE_HEAD, PANE_TITLE } from './lib/pane'
import { storeNotice } from './lib/storeNotice'
import { useUrlFlag, useUrlParam, useUrlSet } from './lib/urlState'

/**
 * cookie 抽屉。**四块懒加载里唯一首屏就渲染的那个**（触发按钮在组件里面），
 * 其余三块（`RequestTable` / `ComparePanel` / `GeneratedPanel`）的边界搬到了
 * `RequestPane.tsx` 与 `TypePane.tsx` —— 那两处让它们坐在 `Tabs` 里，
 * 于是没点开的 tab 连 chunk 请求都不发（`Table` 一个就 104 KB，而入口预算只剩四万字节）。
 *
 * `lazy()` 要 default 导出，而这几个组件都是命名导出（测试直接 import 它们），所以 `.then` 转一手。
 */
const CookieDrawer = lazy(() => import('./components/CookieDrawer').then((module) => ({ default: module.CookieDrawer })))

/**
 * cookie 抽屉那颗触发按钮还在路上时占的位。
 *
 * 它待的地方是顶栏那个靠右的 flex 行 —— 缺一颗按钮，左右两边的主题开关与 `⌘K` 会横着
 * 挪一下再挪回来。所以这里渲的是**同一颗按钮**的 disabled 版本，连那枚计数 Chip 一起：
 * 宽高由构造相同，没有可跳的余地。Chip 的颜色判据与 `CookieDrawer.tsx:53` 那行逐字相同 ——
 * 抄一份是为了让 chunk 落地时连颜色都不闪，抄错了也只是颜色差一档。
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
 * 顶栏那条 `平台 / 端点`。**换掉的是一枚 Chip 里塞的 `"bilibili/videoInfo"` 字符串**：
 * 那个斜杠是文本里的一个字符，读屏念出来是「bilibili 斜线 videoInfo」，
 * 而层级关系一个比特都没进 DOM。
 *
 * 三件事由组件给：`<ol>` / `<li>`（层级真的在结构里）、分隔符是装饰性的 svg 而不是文本、
 * 末级自动带 `aria-current="page"`（`react-aria-components` 的 `Breadcrumbs.mjs`：
 * `isCurrent = node.nextKey == null`）。
 *
 * **`<nav>` 是自己包的。** RAC 把 `useBreadcrumbs` 的 `navProps` 挂在那个 `<ol>` 上、
 * 外面没有 nav，于是这条路径不成地标 —— 而 WAI-ARIA 的面包屑范式要的是 `nav > ol > li`。
 *
 * **平台那一级刻意 `isDisabled`。** 这个工具里没有「平台页」，而不给 `href` 的 `Link`
 * **仍然会渲成** `role="link"` 且 `tabIndex=0`（RAC `Link.mjs:29` 按 `href && !isDisabled`
 * 挑元素类型）—— 那就是一个键盘能聚焦、按下去什么也不发生的死链接。
 */
export const EndpointCrumbs = ({ platform, endpoint }: { platform: string; endpoint: string }) => (
  <nav aria-label="当前端点">
    {/* `min-w-0` 是给后面那句 summary 让路的前提：顶栏是一个 flex 行，
        不给这一项一个可收缩的下限，它会把 summary 挤成零宽 */}
    <Breadcrumbs className="min-w-0 font-mono text-sm">
      <Breadcrumbs.Item isDisabled>{platform}</Breadcrumbs.Item>
      <Breadcrumbs.Item>{endpoint}</Breadcrumbs.Item>
    </Breadcrumbs>
  </nav>
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
  /** 有 `settled` 那句话、但 server 那边条目还在（见 `store` 里那段与 `ResponsePaneProps.retryable`） */
  retryable?: boolean
}

/** 自增的队列 key。**不用时间戳** —— 批量 push 时同一毫秒会撞，撞了 React 会复用错行 */
let queueSeq = 0

/**
 * 把 `runAsync` 的 rejection 咽掉。
 *
 * `useRequest` 的 `run` 本身不抛（错误进它自己的 `error` 状态），但它返回 `void`，
 * 没法被 `ResponsePane` 里的 `useLockFn` 等 —— 而那把锁靠 `await` 才知道动作何时结束。
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
 */
const toastLines = (lines: readonly string[]) => <span className="whitespace-pre-line">{lines.join('\n')}</span>

/**
 * 两块面板标题的 id。**`aria-labelledby` 而不是再抄一遍 `aria-label`**：标签就是那两个
 * 可见标题本身，抄一份的话改了标题、读屏那边还念旧的。
 *
 * 用写死的字符串而不是 `useId()`：这两块在树里各只有一份，而写死的 id 能被源码判据指名
 * （`test/appLayout.test.ts`）。另外三栏各自的 id 在它们自己的组件文件里，同一条理由。
 */
const HISTORY_TITLE = 'pane-history-title'
const EMPTY_TITLE = 'pane-empty-title'

export const App = () => {
  /** 顶部那条红条要说的话。为什么不直接读各个 `useRequest.error`，见 `shell` */
  const [failure, setFailure] = useState<string | undefined>(undefined)

  /**
   * 每个动作共用的错误壳子。
   *
   * **为什么不直接读 `useRequest` 自己的 `error`**：它只在**成功时**清掉
   * （`Fetch.runAsync` 开跑时只设 `loading` / `params`），于是「录制失败 → 换个参数 →
   * 生成类型成功」之后那条红条还挂在上面，说的是一件早就过去的事。
   *
   * 能当成一个对象字面量给所有实例共用，是因为这两个回调都不看参数；而 ahooks 每次渲染
   * 都会重新赋 `fetchInstance.options`，所以这里不会读到旧闭包。
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
   * 每次刷新都会在还在的列表上方插四条骨架，版面白跳一下。
   */
  const firstLoad = endpoints.loading && endpoints.data === undefined

  /**
   * 结果队列。用 HeroUI 自带的 `useListData` 而不是 `useState<QueueItem[]>` ——
   * 它带 `prepend` / `update(key, fn)`，省掉「全量重建数组」那两处手写。
   *
   * **刻意不持久化过刷新**（那会是 `useLocalStorageState`）：`pendingId` 存在 server
   * 进程内存里，重启即失效，持久化只会造出一堆点了就 404 的行。
   */
  const queue = useListData<QueueItem>({ getKey: (item) => item.key })

  /**
   * 「最近」那份清单里人手动点中的那一行。
   *
   * **`undefined` 不表示「没有」，表示「没挑过」** —— 那时右边三栏显示的是当前端点最新的
   * 那一份（见 `shown`）。两者分开是必须的：发一发请求之后人要看的是刚回来的那份，
   * 而不是上一次手动点开的那份；把「挑过的」与「该显示的」合成一个状态的话，
   * 每次 `push` 都得记着去覆盖它，漏一处就会出现「发了请求但屏幕没变」。
   */
  const [picked, setPicked] = useState<string | undefined>(undefined)

  /**
   * 队头 push：新的在上面。
   *
   * `platform` / `endpoint` 从**动作的参数**来而不是从当前选中态读 —— 请求飞在路上时
   * 人可能已经切走了，那时按选中态标注就会给结果贴错标签，而队列刻意不随切端点清空，
   * 于是贴错的标签会一直留在那儿。
   *
   * `setPicked(undefined)` 是「回到最新那一份」：新结果一到，右边三栏就该跟着换。
   */
  const push = (target: Target, outcomes: RecordOutcome[]) => {
    queue.prepend(...outcomes.map((outcome) => ({ key: `q${queueSeq++}`, ...target, outcome })))
    setPicked(undefined)
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
   * 「已提交」那页重拉的计数器。
   *
   * 那一页显示的是 `packages/response-types/` 里当前提交的那一份，而改动它的是下面
   * `generate` —— 面板自己无从知道（理由写在 `GeneratedPanel.tsx:24`）。计数器放在这一层，
   * 是因为按钮在这一层。
   */
  const [generatedRevision, setGeneratedRevision] = useState(0)

  const generate = useRequest(
    async (target: Target) => {
      const result = await generateTypes(target)
      // 盘上的产物刚被改过，让「已提交」那页重拉一次。**不看 `written.length`**：
      // `removed` 那条（清理残留产物）同样改了盘上的东西，而重拉只是一个 GET
      setGeneratedRevision((previous) => previous + 1)
      // `note` **永远显示**：它说的是这个动作做不到的那件事（barrel 完整性）。原先它写在
      // warnings 的 else 分支里，于是「样本超 90 天」这类很常见的告警一出现就把它顶掉了。
      // `summary` 也要显示 —— 「没有产出文件」的真实原因（样本全被判定拒掉）就在它里面
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
   * 「集合」与「对比」两页重读的计数器。
   *
   * 它们读的是**同一个文件**（`corpus/<平台>/<端点>.requests.json`）：一页显示里面那几条记录，
   * 另一页从里面带 `sampleHash` 的条目取出「能比哪两份样本」。所以共用一个计数器不是省事 ——
   * 那个文件变一次，两页同时该重读，这是同一件事。
   *
   * **与 `generatedRevision` 分开则是必须的**：产物由「生成类型」改，集合由入库改，
   * 两件事不同时发生。合成一个的话，生成一次类型会让这两页白拉一趟，
   * 而入库一次又不会让「已提交」跟上。
   */
  const [requestsRevision, setRequestsRevision] = useState(0)

  const store = useRequest(
    async (item: QueueItem, record?: KeptRequest) => {
      // `record` 就是「参数进不进 git」那个开关：响应栏底下那张小表单填了 id 与说明才有它，
      // 没填就还是只写样本 —— 今天最常用的那条路
      const result = await storeSample(item.outcome.pendingId!, record)
      // 集合可能刚被追加了一条（`/api/store` 带 `id` 时那条路），让那两页重读一遍。
      // **不看 `requestsAppended`**：它为 false 的三种理由里有一条是「盘上那份集合读不了」，
      // 而那时集合那页正该重读一遍把 issues 显示出来
      setRequestsRevision((previous) => previous + 1)
      /**
       * 「样本存了，参数进 git 了吗」这句话。**判定在 `lib/storeNotice.ts`**（纯的、可测），
       * 这里只负责把它说出口 —— 那个形参刻意必填，理由在那边：不把「这一次送了什么 id」
       * 传过去，「凭证命中」会被说成「还没起 id」。
       */
      const notice = storeNotice(result, record?.id)
      /*
       * **toast 与版面留存两者都要，因为它们说的是两件事。**
       *
       * toast 说的是「刚才那一次动作的收据」：两个路径能粘进 `git status`，凭证命中 /
       * 集合文件坏掉这两档的原话也在里面 —— 那是一次性的信息。
       *
       * 而「参数没进 git」是一个**持续的状态**（这个端点的集合里就是没有这条记录），
       * toast 一走它还在。所以那半句挂到这一条的 `settled` 上：它跟着这一份样本，
       * 就在人刚点过的那颗按钮的位置上。
       *
       * `retryable` 是「那句话在，但按钮别收」那一档：**凭证命中**与**集合文件坏了**这两格里
       * server 刻意留着待定条目（`server/index.ts:549` 那个 `if`），为的就是让人改一处再点一次。
       * 判据与那一行逐字对齐（`id` 空 = 只写样本那条正常路径，条目照常清掉）。
       */
      const consumed = result.requestsAppended || (record?.id.trim() ?? '') === ''
      queue.update(item.key, (previous) => ({ ...previous, settled: notice.settled, retryable: !consumed }))
      toast(notice.title, { description: toastLines(notice.lines), variant: notice.variant })
      // 端点的样本数变了，重拉端点清单。**只拉这一份** —— cookie 状态与入库无关
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
   * 每个动作有自己的 `loading`，按钮上的 `isPending` 各读各的 —— 但**跨动作的互斥要留着**：
   * 批量录制刻意每组间隔 1.5 秒（那是给平台风控留的余量），这时再手工发一发等于把那个间隔白留了。
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

  /**
   * 右边三栏显示哪一份结果 —— **整条是派生的，没有第二份状态。**
   *
   * 两步：先按当前端点过滤（队列整份留着，但这三栏永远只说一个端点的事 —— 否则「请求」栏
   * 是端点 A、「响应」栏是端点 B，而「类型」栏里「本次」属于 B、「已提交」属于 A），
   * 再在这个端点里挑：人点过就用那一行，没点过就是最新的那一份（`prepend`，所以是第 0 个）。
   *
   * `picked` 指向别的端点那一行时这里会落回最新的一份，那是对的：`HistoryList` 的
   * `onSelect` 会**连端点一起切**，所以那种状态只在切换的那一帧存在。
   */
  const mine = queue.items.filter((item) => `${item.platform}/${item.endpoint}` === selected)
  const shown = mine.find((item) => item.key === picked) ?? mine[0]

  /** 还没处理、且能入库的那些 —— 「最近」那块的标题行上报的就是这个数 */
  const unsettled = queue.items.filter((item) => item.settled === undefined && item.outcome.pendingId !== undefined).length

  return (
    <>
      {/* **必须是自闭合的兄弟节点，不能包住界面。** HeroUI v3 的 `Toast.Provider` 只渲染
          toast 那一小块区域，它的 `children` 类型是 `ReactNode | ((props: { toast }) => ReactNode)`
          —— 那是「一条 toast 长什么样」的插槽，不是提供 context 的包装层。
          把 `<main>` 塞进去的后果是：队列为空时 children 一次都不被调用，整个页面渲染成
          **零字节**，而且控制台一条错误都没有（不是崩溃，是它认为没东西要渲染）。
          `toast(...)` 走的是模块级全局队列，不依赖 React context，所以调用点无需在树内。 */}
      <Toast.Provider placement="bottom end" />
      {/* **`lg:h-screen` + `lg:overflow-hidden` 是「页面不滚」的那一半**，另一半是每块面板
          自己的 `overflow-y-auto`（`lib/pane.ts`）。窄屏上两条都不生效：那时三栏叠成三行，
          锁死高度会让每一栏只剩几行可见 */}
      <main className="bg-background text-foreground flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
        <header className="border-border bg-background/80 sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 backdrop-blur">
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

          {/* `Typography.Heading` 而不是手写 `<h1>`：**层级由 `level` 说**（渲出来的就是 `<h1>`），
              字号仍由工具类说 —— `typography--h1` 是 `text-4xl`，那是文章标题的尺寸，
              而这里是一条 40 px 高的工具条。组件样式在 `layer(components)`、工具类在其后的
              `utilities` 层，同特异性下后者胜，不用 `!important` */}
          <Typography.Heading level={1} className="text-sm">
            amagi 控制台
          </Typography.Heading>

          {endpoint !== undefined && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <EndpointCrumbs platform={platform!.platform} endpoint={endpoint.name} />
              {/* 一句话说明跟在路径后面。`truncate` 由组件给（`typography--truncate` =
                  `block truncate`），`min-w-0` 仍要自己写 —— 那是 flex 子项能被压缩的前提 */}
              <Typography.Paragraph size="xs" color="muted" truncate className="min-w-0">
                {endpoint.summary}
              </Typography.Paragraph>
            </>
          )}

          {/* 右侧三颗：主题 → Cookie → `⌘K`。整组 `ml-auto` 靠右，所以少一颗按钮时其余几颗
              会横着挪 —— 那正是下面那个 fallback 要占位的理由 */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeSwitch />
            <Suspense fallback={<CookieTriggerFallback status={cookies.data} />}>
              <CookieDrawer
                status={cookies.data}
                onSave={(updates) => quiet(saveCookieUpdates.runAsync(updates))}
                busy={saveCookieUpdates.loading}
              />
            </Suspense>
            {/* `⌘K` 跳转器。**摆在头部而不是左栏里**：左栏可以被收起（`?nav=off`），
                而这个快捷键在那个状态下恰恰最有用 —— 它是收着左栏时唯一的换端点入口。
                选中走的是同一个 `setSelected`，与左栏共一条状态线，没有第二份真相 */}
            <EndpointJumper platforms={platforms} selected={selected} onSelect={(p, e) => setSelected(`${p}/${e}`)} />
          </div>
        </header>

        {failure !== undefined && (
          <Alert status="danger" className="mx-2 mt-2 shrink-0">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>出错了</Alert.Title>
              {/* `whitespace-pre-wrap`：错误文案是多行的（`lib/api.ts` 的 readableError
                  会在 HTML 响应那种情况下给出三行诊断），不保留换行就全挤成一行 */}
              <Alert.Description className="font-mono text-xs whitespace-pre-wrap">{failure}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 lg:flex-row">
          {navOpen && (
            <div className="flex min-h-0 shrink-0 flex-col gap-2 lg:w-64">
              {/* 端点树是这一页的第二个 `<nav>`（第一个是顶栏那条面包屑），所以两个都得
                  带自己的 `aria-label` —— 同名的地标在读屏的地标清单里分不开。
                  **`flex-1` + `min-h-0` 是它与下面「最近」分高度的方式**：61 行的树按内容量
                  会把整栏吃光，于是「最近」被压成只剩标题行 —— 那正是这块面板不能出现的样子 */}
              <nav aria-label="端点" className={`${PANE} min-h-0 flex-1`}>
                <div className={PANE_BODY}>
                  <EndpointList
                    platforms={platforms}
                    selected={selected}
                    onSelect={(p, e) => setSelected(`${p}/${e}`)}
                    collapsed={collapsed}
                    onToggleCollapsed={toggleCollapsed}
                    isLoading={endpoints.loading}
                    isFirstLoad={firstLoad}
                  />
                </div>
              </nav>

              {/* 「最近」**只在真发过之后才占位置**：空着的时候它只会从端点树上切走一块高度。
                  `shrink-0` 加 `lg:max-h-72`：它要多少给多少、但最多占到 18rem ——
                  端点树是主角，这份清单是查历史用的 */}
              {queue.items.length > 0 && (
                <section aria-labelledby={HISTORY_TITLE} className={`${PANE} shrink-0 lg:max-h-72`}>
                  <div className={PANE_HEAD}>
                    <h2 className={PANE_TITLE} id={HISTORY_TITLE}>
                      最近
                    </h2>
                    {/* 两个数：**还等着人处理的**与一共几条。前者才是要人动手的那个，
                        所以它带单位、且只在非零时出现 */}
                    {unsettled > 0 && (
                      <Chip size="sm" variant="soft" color="accent">
                        <Chip.Label className="tabular-nums">{unsettled} 待处理</Chip.Label>
                      </Chip>
                    )}
                    <span className="text-muted ml-auto shrink-0 text-xs tabular-nums">{queue.items.length}</span>
                  </div>
                  <div className={PANE_BODY}>
                    <HistoryList
                      items={queue.items}
                      selectedKey={shown?.key}
                      onSelect={(key) => {
                        const item = queue.items.find((entry) => entry.key === key)
                        if (item === undefined) return
                        // **连端点一起切。** 这份清单里混着好几个端点的行（队列不随切端点清空），
                        // 而右边三栏永远只说一个端点的事 —— 只设 `picked` 的话 `shown` 会把它
                        // 过滤掉，点下去什么都不会发生
                        setSelected(`${item.platform}/${item.endpoint}`)
                        setPicked(key)
                      }}
                    />
                  </div>
                </section>
              )}
            </div>
          )}

          {endpoint === undefined ? (
            <section aria-labelledby={EMPTY_TITLE} className={`${PANE} min-h-0 flex-1`}>
              <div className={PANE_HEAD}>
                <h2 className={PANE_TITLE} id={EMPTY_TITLE}>
                  先选一个端点
                </h2>
              </div>
              <div className={PANE_BODY}>
                {/* 原先这里是一段说明加一份三步走的 `<ol>`（带编号徽章）。三步说的都是同一件事
                    「选个端点然后发一发」，而它占着首屏一整块 —— 缩成两行：一行报数
                    （左栏有多少可选），一行说这一屏之后会发生什么。
                    加载中不报数 —— 「一共 0 个端点」和「后端没起」一样是误报；
                    但只有**首屏**才不报数，刷新时上一份计数还在，把它换成「正在读…」
                    只是让这段文案闪一下，而那个数并没有变得不可信 */}
                <p className="text-muted text-sm">
                  {firstLoad
                    ? '正在读端点清单…'
                    : `左栏按平台分组，一共 ${platforms.reduce((sum, entry) => sum + entry.endpoints.length, 0)} 个端点。`}
                </p>
                <p className="text-muted text-sm">
                  选中之后：填参数 → 发送 → 同屏看响应与它的类型声明。
                  <Kbd>
                    <Kbd.Content>⌘</Kbd.Content>
                    <Kbd.Content>K</Kbd.Content>
                  </Kbd>{' '}
                  也能跳端点。
                </p>
                {cookies.data !== undefined && cookies.data.platforms.every((entry) => !entry.hasCookie) && (
                  <p className="text-warning-soft-foreground text-sm">
                    还没配置任何 cookie —— 右上角「Cookie」里填，会写进 <code className="font-mono">.env</code>。
                  </p>
                )}
              </div>
            </section>
          ) : (
            /* 三栏。**`2xl`（1536 px）以上才真的并排** —— 三栏各自要 22rem 以上才装得下
               一份代码块，凑不够宽度时并排比上下堆更糟。之间那两档：
               `grid-rows-3` 让三块各占三分之一高度并各自滚，仍然比原先「一列无限长」好 ——
               原先的毛病不是「上下排」而是「页面本身无限长、滚不到底」。 */
            <div className="grid min-h-0 min-w-0 flex-1 grid-rows-3 gap-2 2xl:grid-cols-[22rem_minmax(0,1fr)_minmax(0,1fr)] 2xl:grid-rows-1">
              <RequestPane
                platform={platform!}
                endpoint={endpoint}
                busy={busy}
                sending={record.loading}
                onSend={(params) => record.run({ platform: platform!.platform, endpoint: endpoint.name }, params)}
                onBatch={() => batch.run({ platform: platform!.platform, endpoint: endpoint.name })}
                batchLoading={batch.loading}
                onGenerate={() => generate.run({ platform: platform!.platform, endpoint: endpoint.name })}
                generateLoading={generate.loading}
                requestsRevision={requestsRevision}
              />

              <ResponsePane
                outcome={shown?.outcome}
                endpointLabel={shown === undefined ? undefined : `${shown.platform}/${shown.endpoint}`}
                settled={shown?.settled}
                retryable={shown?.retryable}
                busy={busy}
                // 那个 `record` 从响应栏底下那张小表单来（填了 id 与说明才有），
                // 一路送到 `POST /api/store` 的 body 上 —— 参数就是这样进 git 的。
                // `shown!` 在这两条路上都是安全的：没有 `shown` 时 `ResponsePane` 连按钮都不渲
                onStore={(record) => quiet(store.runAsync(shown!, record))}
                onDiscard={() => quiet(discard.runAsync(shown!))}
              />

              <TypePane
                platform={platform!.platform}
                endpoint={endpoint.name}
                outcome={shown?.outcome}
                stored={endpoint.stored}
                generatedRevision={generatedRevision}
                requestsRevision={requestsRevision}
              />
            </div>
          )}
        </div>
      </main>
    </>
  )
}
