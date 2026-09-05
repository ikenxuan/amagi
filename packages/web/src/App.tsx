/**
 * 控制台主界面。左栏端点列表（可收起），右栏表单 + 结果队列。
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

import { Alert, Button, Chip, Kbd, Separator, toast, Toast, Tooltip, useListData } from '@heroui/react'
import { useKeyPress, useRequest } from 'ahooks'
import { useState } from 'react'

import { ComparePanel } from './components/ComparePanel'
import { CookieDrawer } from './components/CookieDrawer'
import { EndpointList } from './components/EndpointList'
import { GeneratedPanel } from './components/GeneratedPanel'
import { OutcomeCard } from './components/OutcomeCard'
import { ParamForm } from './components/ParamForm'
import { RequestTable } from './components/RequestTable'
import { ThemeSwitch } from './components/ThemeSwitch'
import {
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
    async (item: QueueItem) => {
      const result = await storeSample(item.outcome.pendingId!)
      // 集合可能刚被追加了一条（`/api/store` 带 `id` 时那条路，`server/index.ts:545`），
      // 让那两块面板重读一遍。**不看 `requestsAppended`**：它为 false 的三种理由里有一条是
      // 「盘上那份集合读不了」，而那时集合面板正该重读一遍把 issues 显示出来
      setRequestsRevision((previous) => previous + 1)
      /**
       * 「样本存了，参数进 git 了吗」这句话。**判定在 `lib/storeNotice.ts`**（纯的、可测），
       * 这里只负责把它说出口 —— 而 `undefined` 那个实参是一句声明：这一次我们没送 `id`
       * （`storeSample()` 不送，「另存为…」是阶段 5 的事）。那个形参刻意必填，理由在那边。
       */
      const notice = storeNotice(result, undefined)
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
       */
      queue.update(item.key, (previous) => ({ ...previous, settled: notice.settled }))
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

          <h1 className="text-base font-semibold">amagi 响应类型控制台</h1>

          {endpoint !== undefined && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <Chip color="accent" variant="soft">
                <Chip.Label className="font-mono">{selected}</Chip.Label>
              </Chip>
              <span className="text-muted min-w-0 truncate text-sm">{endpoint.summary}</span>
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitch />
            <CookieDrawer
              status={cookies.data}
              onSave={(updates) => quiet(saveCookieUpdates.runAsync(updates))}
              busy={saveCookieUpdates.loading}
            />
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

          <section className="flex min-w-0 flex-col gap-6">
            {endpoint === undefined ? (
              <div className="border-border flex flex-col items-start gap-3 rounded-2xl border border-dashed p-8">
                <h2 className="text-base font-semibold">先选一个端点</h2>
                <p className="text-muted max-w-prose text-sm leading-relaxed">
                  {/* 加载中不报数 —— 「一共 0 个端点」和「后端没起」一样是误报。
                      但只有**首屏**才不报数：刷新时上一份计数还在，把它换成「正在读…」
                      只是让这段文案闪一下，而那个数并没有变得不可信 */}
                  {firstLoad
                    ? '正在读端点清单…'
                    : `左栏按平台分组，一共 ${platforms.reduce((sum, entry) => sum + entry.endpoints.length, 0)} 个端点。`}{' '}
                  选中之后这里会出现由 zod schema 派生的参数表单 —— 填参数、录一发、看类型 diff、决定留下还是丢掉。
                </p>
                {cookies.data !== undefined && cookies.data.platforms.every((entry) => !entry.hasCookie) && (
                  <p className="text-warning-soft-foreground text-sm">
                    还没有配置任何 cookie。右上角「Cookie」里填，会写进 <code className="font-mono">.env</code>。
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4">
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

                  <p className="text-muted text-xs">
                    定义在 <code className="font-mono">{endpoint.source}</code>
                  </p>

                  {/* 「请求集合」挂在请求块的最后一格 —— PRD 4.1 版面图里「集合里的 3 组」就在
                      请求块内、参数表单下面（第 230-238 行）。它回答的是这块面板正上方那张表单
                      回答不了的问题：**别人拿什么参数才能重放出这份响应**（PRD 二 ①）。
                      `key` 带端点名与下面 `GeneratedPanel`（:528）同一条理由：`refreshDeps` 重拉时
                      `useRequest` **留着上一份 data**，不换 key 的话切端点后有一小段时间显示的
                      还是上一个端点的那几条记录 */}
                  <RequestTable
                    key={`requests:${platform!.platform}/${endpoint.name}`}
                    platform={platform!.platform}
                    endpoint={endpoint.name}
                    revision={requestsRevision}
                  />
                </div>

                <Separator />

                {queue.items.length === 0 ? (
                  <p className="text-muted text-sm">还没有录过。上面填参数，或者点「一键补样本」。</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold">待定队列</h2>
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
                        busy={busy}
                        onStore={() => quiet(store.runAsync(item))}
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
                <ComparePanel
                  key={`compare:${platform!.platform}/${endpoint.name}`}
                  platform={platform!.platform}
                  endpoint={endpoint.name}
                  stored={endpoint.stored}
                  revision={requestsRevision}
                />

                {/* 「已有类型」挂在结果区末尾（PRD 4.2 里它是结果区那五个面板之一）。
                    **刻意不压在队列上面**：录完一发，新卡片是 prepend 到队头的（见 `push`），
                    而这块面板带一个 32rem 高的代码块（`GeneratedPanel.tsx:117`）——
                    放上面等于把「刚录的那一份」推到折叠线以下，而它才是主循环要看的那个东西。
                    队列为空时上面只占一行文案，所以选中端点的第一眼里这块本来就在视野内。
                    阶段 5 按 4.1 重排时它会变成那五个 tab 里的一个 —— 组件与上面 `revision`
                    那条线都不用动，白做的只有这个位置本身。
                    `key` 带端点名与 `ParamForm`（:395）同类，但坏的是另一处：`refreshDeps` 重拉时
                    `useRequest` **留着上一份 data**（与 `firstLoad` 那段同一条），不换 key 的话
                    切端点后有一小段时间显示的还是上一个端点的产物路径。 */}
                <GeneratedPanel
                  key={`generated:${platform!.platform}/${endpoint.name}`}
                  platform={platform!.platform}
                  endpoint={endpoint.name}
                  revision={generatedRevision}
                />
              </>
            )}
          </section>
        </div>
      </main>
    </>
  )
}
