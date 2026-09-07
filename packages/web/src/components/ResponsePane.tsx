/**
 * 「响应」那一栏：**这一发打回来了什么。**
 *
 * 它顶上那一行就是 Apifox 那排收据（`200 · 312ms · 9.7 KB`）加一枚入库判定，正文是脱敏后的
 * 响应 JSON。**要人做决定的那几颗按钮不在这里** —— 它们在这一栏底下那块
 * {@link ResultActions}，理由见下面第三节。
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
 * 现在：正文自己一格（默认 60%，只有它滚），动作自己一格（默认 40%，见 {@link ResultActions}），
 * 中间一条能拖的分隔条。**「一半」是个默认值不是死数** —— 版面判据在
 * `components/SplitLayout.tsx` 的 `SplitPane.footer` 上。
 *
 * 正文那一格因此**不再按视口算高度**（原先是 `PANE_CODE` 的 `calc(100vh-12rem)`，
 * 那是个估值：顶栏变高它就跟着差一点）。它现在是 `fill` —— 填满自己那一格，
 * 高度由人拖出来的那条线决定。
 */

import { Chip, Surface, Tooltip } from '@heroui/react'
import { lazy, Suspense, useMemo } from 'react'

import type { RecordOutcome } from '../lib/api'
import { PANE, PANE_BODY_TIGHT, PANE_HEAD, PANE_TITLE } from '../lib/pane'
import { type KeptRequest, PayloadPanel, statusOf } from './Result'

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
  /** 有动作在跑。两个入库动作都要禁 —— 双击「留下」会让第二次撞 404 */
  busy: boolean
  /**
   * 入库 / 丢弃。**必须返回 Promise**，否则 `ResultActions` 里的 `useLockFn` 锁不住 ——
   * 它靠 `await` 才知道动作何时结束。调用方由 `useRequest` 兜住错误，所以这两个不会 reject。
   *
   * `onStore` 那个可选参数是**参数进不进 git** 的开关：不给只写样本（最常用的那条），
   * 给了就让 server 顺手往请求集合追一条。
   */
  onStore: (record?: KeptRequest) => Promise<void>
  onDiscard: () => Promise<void>
}

/**
 * 这一面板的标题 id。`aria-labelledby` 指向可见标题本身，不再抄一遍 `aria-label`。
 *
 * **与动作那格不是一个**：正文与动作是上下两格独立的面板（各有自己的标题行与滚动区，
 * 那格在 `ResultActions.tsx`），共用一个 id 会让读屏把两块念成同一个 region。
 */
const TITLE_ID = 'pane-response-title'

/**
 * 上面那一格：**收据 + 响应正文。** 一个按钮都没有 —— 它们在 {@link ResultActions} 里。
 *
 * 收的是与 {@link ResultActions} **同一份 props**（调用方拿同一个对象喂两处），
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
