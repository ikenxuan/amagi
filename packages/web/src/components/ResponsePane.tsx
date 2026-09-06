/**
 * 「响应」那一栏：**这一发打回来了什么。**
 *
 * 它顶上那一行就是 Apifox 那排收据（`200 · 312ms · 9.7 KB`）加一枚入库判定，正文是脱敏后的
 * 响应 JSON。**要人做决定的那几颗按钮不在这里** —— 它们在这一栏底下那块
 * {@link ResponseActions}，理由见下面第三节。
 *
 * ## 为什么它是一栏而不是一张卡片
 *
 * 原先这些东西住在 `OutcomeCard` 里：一张卡片 = 判定条 + 脱敏清单 + 两页 Tabs + 四颗按钮 +
 * 一张折叠表单，而队列里每一份结果各渲一张、竖着堆。批量录 24 组之后那一列有几十屏高，
 * 「刚录的那一份」与「上一份的 diff」之间隔着两屏 —— 而屏幕的横向空间全空着。
 *
 * 现在一次只看一份（哪一份由 `HistoryList.tsx` 选），响应与它的类型声明并排。
 * **两块并排是这一栏存在的理由**：人要回答的问题是「这段 JSON 对应的类型对不对」，
 * 而那个问题在上下两块之间来回滚是答不了的。
 *
 * ## 判定与脱敏从两块 `Alert` 缩成一枚 Chip 加一行
 *
 * 原先判定是一整块 `Alert`（标题 = `verdict.kind`、正文 = `reason`），脱敏是两枚 Chip 加
 * 一份清单加一个 `<details>`。它们说的话没被删掉，只是**换了密度**：判定的结论进 Chip
 * （颜色由 {@link statusOf} 给，三档的区别在那儿），理由进 tooltip；脱敏只有**真的有残留**时
 * 才占版面 —— 那是唯一会改变下一步动作的一档（这份不能入库），其余两档（换了几处、
 * 可疑但没换）是事后审计用的，进 tooltip。
 *
 * 这不是「隐藏信息」与「显示信息」之间的取舍，是**「每一发都要看」与「偶尔要查」**之间的：
 * 前者留在版面上，后者留在一次 hover 之外。
 *
 * ## 这一轮：正文与动作切成上下两格
 *
 * 原先这一栏是**一整屏高的响应正文**，而动作挤在两个边缘上：三颗按钮塞在标题行里、
 * 「留下并记参数」那张表单折在正文的尾巴上。三个后果：
 *
 * 1. **一份 1 KB 的响应占着一整屏。** 那是这个工具最常见的响应大小（`code` + 几个字段），
 *    而它下面是几百像素的空白。
 * 2. **标题行的高度跟着内容变。** 三栏的标题行于是三个高度（实测 56 / 36 / 56，
 *    发过一发之后响应那栏又是第四个值）—— 判据与数字写在 `lib/pane.ts` 的 `PANE_HEAD` 上。
 * 3. **要人做的决定藏在滚动之外。** 「留下 / 丢掉」是这个工具的主循环里唯一的分叉，
 *    而它们在一份长响应里得先滚到底才看得见（那张表单）或者挤在一堆计数中间（那三颗按钮）。
 *
 * 现在：正文自己一格（默认 60%，只有它滚），动作自己一格（默认 40%，见 {@link ResponseActions}），
 * 中间一条能拖的分隔条。**「一半」是个默认值不是死数** —— 版面判据在
 * `components/SplitLayout.tsx` 的 `SplitPane.footer` 上。
 *
 * 正文那一格因此**不再按视口算高度**（原先是 `PANE_CODE` 的 `calc(100vh-12rem)`，
 * 那是个估值：顶栏变高它就跟着差一点）。它现在是 `fill` —— 填满自己那一格，
 * 高度由人拖出来的那条线决定。
 */

import { Button, Chip, Surface, Toolbar, Tooltip } from '@heroui/react'
import { useLockFn } from 'ahooks'
import { lazy, Suspense, useMemo } from 'react'

import type { RecordOutcome } from '../lib/api'
import { PANE, PANE_BODY, PANE_BODY_TIGHT, PANE_HEAD, PANE_TITLE } from '../lib/pane'
import { copyableOf, copyToClipboard, KeepRequestForm, type KeptRequest, PayloadPanel, statusOf } from './Result'

/**
 * Monaco 那块查看器。**整份懒加载**，而且 fallback 是原先那块 shiki 渲好的 HTML。
 *
 * 这不是「先转个圈再显示」：两份渲的是同一段 JSON、同一套 GitHub 配色
 * （判据在 `JsonViewer.tsx` 文件头最后一段），所以 chunk 落地时换掉的只有**能力** ——
 * 折叠、搜索、括号匹配、跳行。首帧那份是 server 已经渲好的，一毫秒都不用等。
 *
 * `lazy()` 要 default 导出，而它是命名导出（测试直接 import 它），所以 `.then` 转一手。
 */
const JsonViewer = lazy(() => import('./JsonViewer').then((module) => ({ default: module.JsonViewer })))

/**
 * 字节数说成一句人话。
 *
 * 1024 以下报字节：那个量级里「小」本身就是信息（空响应、只有一个 `code` 的错误页），
 * 报成 `0.3 KB` 会把它抹平。以上报一位小数的 KB —— 再往上不换 MB，
 * 因为「9,000 KB」比「8.8 MB」更能让人意识到这份响应有多离谱（真有 1.3 MB 的那种）。
 */
const sizeOf = (bytes: number): string => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`)

export interface ResponsePaneProps {
  /** 这一份结果。`undefined` = 还没发过（那时显示的是一行提示，不是空面板） */
  outcome?: RecordOutcome
  /**
   * 这一份属于哪个端点（`平台/端点`）。
   *
   * **不是装饰。** 结果不随切端点清空（否则批量录完剩下的待定样本再也碰不到），
   * 于是这一栏显示的那份可能不是左栏当前选中的那个 —— 不标出来，点「留下」时会认错端点。
   */
  endpointLabel?: string
  /** 已经处理过（入库或丢弃）时那句收据 */
  settled?: string
  /**
   * 收据在，但这份样本**在 server 那边还留着**，所以「留下 / 丢掉」不许收走。
   *
   * `/api/store` 在**凭证命中**与**集合文件坏了**那两格里刻意不清 `pending`
   * （`server/index.ts:549`），为的是让人改一处再点一次 —— 而 `storeNotice` 那两句都以
   * 「再入库一次」收尾。判据必须与那一行逐字对齐：server 留着条目 ⇒ 这里留着按钮。
   */
  retryable?: boolean
  /** 有动作在跑。两个入库动作都要禁 —— 双击「留下」会让第二次撞 404 */
  busy: boolean
  /**
   * 入库 / 丢弃。**必须返回 Promise**，否则下面的 `useLockFn` 锁不住 ——
   * 它靠 `await` 才知道动作何时结束。调用方由 `useRequest` 兜住错误，所以这两个不会 reject。
   *
   * `onStore` 那个可选参数是**参数进不进 git** 的开关：不给只写样本（最常用的那条），
   * 给了就让 server 顺手往请求集合追一条。
   */
  onStore: (record?: KeptRequest) => Promise<void>
  onDiscard: () => Promise<void>
}

/**
 * 两块面板的标题 id。`aria-labelledby` 指向可见标题本身，不再抄一遍 `aria-label`。
 *
 * **两个而不是一个**：正文与动作是上下两格独立的面板（各有自己的标题行与滚动区），
 * 共用一个 id 会让读屏把两块念成同一个 region。
 */
const TITLE_ID = 'pane-response-title'
const ACTIONS_TITLE_ID = 'pane-response-actions-title'

/**
 * 上面那一格：**收据 + 响应正文。** 一个按钮都没有 —— 它们在 {@link ResponseActions} 里。
 *
 * 收的是与 {@link ResponseActions} **同一份 props**（调用方拿同一个对象喂两处），
 * 而这里只解构自己要的两项。分成两个 interface 试过，代价是调用方要拼两个对象、
 * 而那两个对象里有五个字段逐字相同 —— 那种重复迟早会错开一个。
 */
export const ResponsePane = ({ outcome, endpointLabel }: ResponsePaneProps) => {
  const scrub = outcome?.scrub
  const http = outcome?.http
  /**
   * 喂给 Monaco 的那段正文。**`useMemo` 不是优化而是必需** ——
   * 一份 1.3 MB 的响应每渲染一次 stringify 一遍会让拖分隔条卡住（那时每帧都渲）。
   *
   * **走 `payload` 而不是 `payloadHighlight`**：后者被 server 截过
   * （`chars` / `totalChars`，一份 1.3 MB 渲成 HTML 会让页面卡死），而 Monaco 是按行虚拟化的、
   * 整份给它没问题 —— 于是那句「只显示了前 N 个字符」在这条路上不再出现。
   */
  const source = useMemo(() => (outcome?.payload === undefined ? undefined : JSON.stringify(outcome.payload, null, 2)), [outcome?.payload])

  return (
    <Surface className={PANE} aria-labelledby={TITLE_ID} render={(props) => <section {...props} />}>
      <div className={PANE_HEAD}>
        <h2 className={PANE_TITLE} id={TITLE_ID}>
          响应
        </h2>

        {outcome !== undefined && (
          <>
            {/* 入库判定。**Chip 上只有那一个词**（`ok` / `reject` / …），理由进 tooltip ——
                每一发都要瞥一眼的是「这份能不能用」，而「为什么」是追问才要的。
                `confident === false` 那一档必须看得见：那时判定器**在这份响应上没有依据**，
                与「判定通过」不是一回事，所以它在 Chip 上加一个问号而不是只写在 tooltip 里 */}
            <Tooltip delay={300}>
              <Chip size="sm" variant="soft" color={statusOf(outcome)}>
                <Chip.Label className="font-mono">
                  {outcome.verdict.kind}
                  {outcome.verdict.confident === false && '?'}
                </Chip.Label>
              </Chip>
              <Tooltip.Content>
                <p className="max-w-sm">
                  {outcome.verdict.reason}
                  {outcome.verdict.confident === false && '（判定器在这份响应上没有依据）'}
                  {outcome.message !== undefined && ` —— ${outcome.message}`}
                </p>
              </Tooltip.Content>
            </Tooltip>

            {/* 三个数一排，全 `tabular-nums`：连发几次时它们竖直对齐，变化一眼看得出来。
                **`status` 为 0 表示一发都没打出去**，那时报的是那个 0 而不是留白 ——
                留白说不清「没打出去」和「还没发过」的区别 */}
            {http !== undefined && (
              <span className="text-muted shrink-0 font-mono text-xs tabular-nums">
                {http.status} · {http.durationMs} ms · {sizeOf(http.bytes)}
              </span>
            )}

            {outcome.shapeChanged === true && (
              <Chip size="sm" variant="soft" color="accent">
                <Chip.Label>新形状</Chip.Label>
              </Chip>
            )}

            {/* 脱敏**只有真的有残留时**才占版面 —— 那是唯一一档会改变下一步的（这份不能入库）。
                换了几处、可疑但没换那两档进 tooltip，见文件头 */}
            {scrub !== undefined && scrub.leaks.length > 0 && (
              <Tooltip delay={300}>
                <Chip size="sm" variant="primary" color="danger">
                  <Chip.Label>脱敏有残留</Chip.Label>
                </Chip>
                <Tooltip.Content>
                  <ul className="max-w-sm font-mono text-xs">
                    {scrub.leaks.map((leak) => (
                      <li key={leak}>{leak}</li>
                    ))}
                  </ul>
                </Tooltip.Content>
              </Tooltip>
            )}

            {scrub !== undefined && (scrub.replacements > 0 || scrub.suspects.length > 0) && (
              <Tooltip delay={300}>
                <span className="text-muted cursor-help text-xs tabular-nums underline decoration-dotted">脱敏 {scrub.replacements}</span>
                <Tooltip.Content>
                  <p className="max-w-sm">
                    换掉 {scrub.replacements} 处凭证。
                    {scrub.suspects.length > 0 && `另有 ${scrub.suspects.length} 处可疑但规则没命中：${scrub.suspects.join('、')}`}
                  </p>
                </Tooltip.Content>
              </Tooltip>
            )}

            {endpointLabel !== undefined && <span className="text-muted min-w-0 truncate font-mono text-xs">{endpointLabel}</span>}
          </>
        )}
      </div>

      {/* **`PANE_BODY_TIGHT` 而不是 `PANE_BODY`**：这一格里只有代码块一样东西，而它自己带滚动 ——
          两层都滚的话滚轮在边界上会卡一下（判据写在 `lib/pane.ts` 那个常量上）。
          与它成对的是下面那个 `fill`：代码块填满这一格，高度由人拖出来的那条线决定 */}
      <div className={PANE_BODY_TIGHT}>
        {outcome === undefined ? (
          <p className="text-muted text-sm">左边填参数，按「发送」。</p>
        ) : source === undefined ? (
          /* 没有 `payload` 的那一档（一发都没打出去）：Monaco 没有正文可显示，
             而 `PayloadPanel` 那条回落会把这件事说出来（它渲的是 `null`） */
          <PayloadPanel payload={outcome.payload} highlight={outcome.payloadHighlight} fill />
        ) : (
          /* fallback 是 server 已经渲好的那份高亮 —— 同一段 JSON、同一套配色，
             chunk 落地时换掉的只有能力（折叠 / 搜索 / 跳行），见上面 `JsonViewer` 那段 */
          <Suspense fallback={<PayloadPanel payload={outcome.payload} highlight={outcome.payloadHighlight} fill />}>
            <JsonViewer text={source} />
          </Suspense>
        )}
      </div>
    </Surface>
  )
}

/**
 * 下面那一格：**这一份怎么处理。**
 *
 * 装的是原先散在三处的东西 —— 标题行里那排按钮、正文开头那几句提示（破坏性变更 / 没带来新形状 /
 * 不能入库 / 已处理的收据）、正文尾巴上那张「留下并记参数」表单。它们说的是同一件事的不同部分：
 * **这份样本值不值得留、留的时候要不要连参数一起记进 git。**
 *
 * 摆成独立一格的三条理由：
 *
 * 1. **它们本来就是一组。** 原先「建议丢掉」那句话在正文顶上，而「丢掉」那颗按钮在标题行里 ——
 *    读到建议的时候按钮在视野外的上方，人得往回找。
 * 2. **标题行因此能有固定高度。** 三栏的标题行高度不一致（56 / 36 / 56）就是被这排按钮撑出来的，
 *    判据写在 `lib/pane.ts` 的 `PANE_HEAD` 上。
 * 3. **响应正文不必再占一整屏。** 一份 1 KB 的响应下面原先是几百像素空白，
 *    现在那片空白装的是要人做的决定。
 *
 * 这一格**自己滚**（`PANE_BODY`）：那张表单加上几句提示比 40% 的高度长，
 * 而它不该把整栏顶高。
 */
export const ResponseActions = ({ outcome, endpointLabel, settled, retryable = false, busy, onStore, onDiscard }: ResponsePaneProps) => {
  // 防双击撞 404 的**第二道**闸，也是真正管用的那道：`isDisabled` 要等一次渲染才生效，
  // 同一帧里的两次点击第二次照样发得出去；`useLockFn` 在函数层上锁
  const store = useLockFn(onStore)
  const discard = useLockFn(onDiscard)

  const breaking = outcome?.breaking ?? []
  /** 这份样本还等着人处理。`retryable` 那一支见 {@link ResponsePaneProps.retryable} */
  const canSettle = outcome !== undefined && (settled === undefined || retryable) && outcome.pendingId !== undefined
  // 整份正文在这里面拼好（两条最长的加起来几十万字符，而复制是人点出来的），跟着 `outcome` 记一次
  const copyable = useMemo(() => (outcome === undefined ? [] : copyableOf(outcome)), [outcome])

  return (
    <Surface className={PANE} aria-labelledby={ACTIONS_TITLE_ID} render={(props) => <section {...props} />}>
      <div className={PANE_HEAD}>
        <h2 className={PANE_TITLE} id={ACTIONS_TITLE_ID}>
          这一份怎么处理
        </h2>
        {/* 收据挂在标题行上：它是一个**持续的状态**（这份已经入库了 / 已经丢了），
            而不是一次性的提示 —— 所以它跟着标题走，不进下面那片会滚的正文 */}
        {settled !== undefined && (
          <Chip size="sm" variant="soft" color={retryable ? 'warning' : 'success'}>
            <Chip.Label>{settled}</Chip.Label>
          </Chip>
        )}
      </div>

      <div className={PANE_BODY}>
        {outcome === undefined ? (
          <p className="text-muted text-sm">还没有结果。发一发请求，这里出现「留下 / 丢掉」。</p>
        ) : (
          <>
            {/* 破坏性变更留在版面上（不进 tooltip）：它说的是「下游会编译红」，
                那是这一格上唯一一件比按钮更要紧的事 */}
            {breaking.length > 0 && (
              <ul className="text-danger-soft-foreground bg-danger-soft rounded-lg p-2 font-mono text-xs">
                {breaking.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            )}

            {/* 没带来新形状 ⇒ 一句话建议丢掉。**判据是 server 算好的 `shapeChanged` 而不是
                diff 长不长** —— 产物文件头有溯源块，多录一份必然多两行注释 */}
            {settled === undefined && outcome.shapeChanged === false && outcome.pendingId !== undefined && (
              <p className="text-warning-soft-foreground text-xs">这份没带来新形状，类型一行都不会变 —— 建议丢掉。</p>
            )}

            {/* 不能入库时**把判定的原话说出来**。原先只有这一句笼统的括号（「判定拒了，或脱敏有残留」），
                于是人得自己去标题行那枚 Chip 上 hover 才知道到底是哪一样 ——
                而那两件事的下一步完全不同（重录一发 / 去修脱敏规则）。
                **`compute` 那一档另说一句**：那不是「被拒了」，是「没有东西需要录」——
                说成「不能入库」会让人去重录，而那种端点重录一万次结果都一样
                （判据是 server 给的 `verdict.kind`，来源写在 `server/index.ts` 那一支上） */}
            {settled === undefined && outcome.pendingId === undefined && (
              <div className="text-warning-soft-foreground flex min-w-0 flex-col gap-1 text-xs">
                <p>{outcome.verdict.kind === 'compute' ? '这个端点不用录样本。' : '这份不能入库。'}</p>
                <p className="font-mono break-words">
                  {outcome.verdict.kind}：{outcome.verdict.reason}
                  {outcome.message !== undefined && ` —— ${outcome.message}`}
                </p>
                {outcome.verdict.kind === 'compute' && (
                  <p>上面那段就是算出来的值，「类型」栏里那份声明就是它的形状 —— 两样都不必进 corpus。</p>
                )}
                {outcome.scrub !== undefined && outcome.scrub.leaks.length > 0 && (
                  <p className="font-mono break-words">脱敏有残留：{outcome.scrub.leaks.join('、')}</p>
                )}
              </div>
            )}

            {/* 动作那一排。`Toolbar` 而不是裸 div：左右箭头在动作之间移动（react-aria 的
                `useToolbar`），而这一排最多四个控件，读屏也把它念成一组。
                「留下 / 丢掉」只在这份还能处理时出现；两条复制**与处理状态无关**
                （已入库的、被拒的，照样值得把响应捞出来），所以三种状态下都在 ——
                前提是 `copyableOf` 给出了至少一条。四个都没有时整块不渲，不留空 toolbar */}
            {(canSettle || copyable.length > 0) && (
              <Toolbar aria-label="这份结果的动作" className="flex min-w-0 flex-wrap items-center gap-1.5">
                {canSettle && (
                  <>
                    <Button
                      size="sm"
                      variant={outcome.shapeChanged === false ? 'secondary' : 'primary'}
                      isDisabled={busy}
                      onPress={() => void store()}
                    >
                      留下
                    </Button>
                    <Button size="sm" variant="danger-soft" isDisabled={busy} onPress={() => void discard()}>
                      丢掉
                    </Button>
                  </>
                )}
                {/* **复制不跟着 `busy` 禁**：它一发请求都不打，没理由等入库那次往返。
                    按钮上只有一个图标般短的词，那个「多少字符 / 多少条」的量进 tooltip ——
                    它是「屏幕上那份是截过的」这件事的证据，而不是每次都要读的东西 */}
                {copyable.map((action) => (
                  <Tooltip key={action.id} delay={300}>
                    <Button size="sm" variant="tertiary" onPress={() => void copyToClipboard(action)}>
                      {action.id === 'copy-payload' ? '复制 JSON' : '复制 diff'}
                    </Button>
                    <Tooltip.Content>
                      <p>复制{action.label}，不受屏幕上那两处上限限制</p>
                    </Tooltip.Content>
                  </Tooltip>
                ))}
              </Toolbar>
            )}

            {/* 「留下并记参数」那条路。**挂在按钮下面而不是塞进 `Toolbar`**：那一排的语义是
                「一按就发生」，而这里是两个输入框加一次提交 —— 塞进去会让方向键在输入框里改变含义。
                跟着 `canSettle` 走，于是处理完的那份下面不留一张点了没用的表单 */}
            {canSettle && endpointLabel !== undefined && <KeepRequestForm endpointLabel={endpointLabel} busy={busy} onKeep={store} />}
          </>
        )}
      </div>
    </Surface>
  )
}
