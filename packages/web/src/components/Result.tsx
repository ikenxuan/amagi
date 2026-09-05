/**
 * 一次结果里那些**能单独摆到任何地方去**的块：响应 JSON、类型 diff、两条复制、
 * 「留下的同时记参数」那张表单，以及 `id` / 说明的字符集判定。
 *
 * 这个文件原先叫 `OutcomeCard.tsx`，导出的是一张把上面这些全串在一起的卡片。
 * 版面改成横向三栏之后那张卡片没有位置了 —— 它的四块内容各自属于不同的栏
 * （响应归响应栏、diff 归类型栏、动作归响应栏的头一行），而卡片这个形状本身
 * 恰恰是「什么都往下堆」的成因。所以composite 删掉，块留着：
 * 现在的组装点是 `ResponsePane.tsx` 与 `TypePane.tsx`。
 *
 * 「留下 / 丢掉」两个动作**没有被简化掉**，只是搬了地方 —— 那正是这个工具存在的理由：
 * **批量录制不等于批量入库**，每一份都得人看过再决定。
 */

import { Button, Description, FieldError, Form, Input, Label, ScrollShadow, TextField, toast } from '@heroui/react'
import { type FormEvent, useMemo, useState } from 'react'

import type { DiffLine, HighlightedCode, JsonValue, RecordOutcome, RequestEntry } from '../lib/api'
import { CodeBlock } from './CodeBlock'

// 这个文件除了组件还导出几个纯函数（`copyableOf` / `requestIdIssue` / `requestLabelIssue`
// / `statusOf`），于是 fast-refresh 那条规则会响：改这个文件时 HMR 退化成整页刷新。
// 惯例是把纯函数放 `src/lib/*.ts`（`urlState.ts` 就是），那样更好 —— 只是它们的读者是
// 本文件的组件、`ResponsePane.tsx` 和 `test/result.test.ts`，
// 而这一轮的改动范围已经铺得够宽了。**能被测比 HMR 保状态要紧**，理由与
// `ParamForm.tsx:32-37` 那三个纯函数完全一样，搬家是同一轮的事。
// oxlint-disable react/only-export-components

/**
 * diff 行按增删上色。判据是结构化的 `sign` 而不是子串匹配 ——
 * 手拼 HTML 那版按 `line.includes(' + ')` 猜，正文里含 ` - ` 的行会被误判成删除行。
 */
const diffLineClass = (sign: DiffLine['sign']): string =>
  sign === '+' ? 'text-success-soft-foreground bg-success-soft' : 'text-danger-soft-foreground bg-danger-soft'

/**
 * 逐行 diff 一次渲多少条，也是「再看一批」一次放开的量。
 *
 * **上限不能去掉。** 一个端点的第一份样本，diff 就是「整份类型全是新增」—— 几千条各挂一个
 * `<div>` 一次性塞进 DOM 会让整页卡住，与 payload 那处 20,000 字上限是同一个理由
 * （`CodeBlock.tsx` 文件头）。要修的是**无声**的截断，不是「有上限」这件事本身。
 */
const DIFF_WINDOW = 400

/** 按产物文件归拢之后的一组差异 */
interface DiffFileGroup {
  /** 产物相对路径 */
  file: string
  /** 这个文件的**全部**差异，原顺序 —— 窗口到渲染时才切 */
  lines: DiffLine[]
  /** `+` / `-` 各多少条。**数的是全部，不是窗口内的**，这两个数是这份设计的支点（见 {@link DiffPanel}） */
  plus: number
  minus: number
}

/**
 * 按 `file` 分组，文件顺序 = 它第一次出现的顺序（`Map` 的插入序）。
 *
 * 不打乱任何东西：server 那边本来就是按文件循环产 diff 的（`server/outcome.ts:283`），
 * 同一个文件的行本来连续 —— 分组只是把「哪个文件」从每一行前面提到组标题上。
 *
 * **只读 `file` 与 `sign`，一个字都不解析 `text`。** `text` 是 server 侧渲好的一句话，
 * 文案下一轮就换（见 {@link DiffPanel} 末尾），按它猜任何东西（比如猜哪条是形状行）都会跟着烂。
 */
const groupDiffByFile = (diff: DiffLine[]): DiffFileGroup[] => {
  const groups = new Map<string, DiffFileGroup>()
  for (const line of diff) {
    const group = groups.get(line.file) ?? { file: line.file, lines: [], plus: 0, minus: 0 }
    group.lines.push(line)
    if (line.sign === '+') group.plus += 1
    else group.minus += 1
    groups.set(line.file, group)
  }
  return [...groups.values()]
}

export interface DiffPanelProps {
  /** 这一次录制的全部差异。**空数组是常态**（同形样本），那时显示的是「类型没有变化」 */
  diff: DiffLine[]
  /**
   * 滚动区的高度上限（Tailwind class）。同 `CodeBlock` 那个 prop 的理由：
   * 摆在一张卡片里与摆在一栏满高的面板里，该占的高度不是同一个 —— 而那个决定属于摆它的人。
   */
  maxHeight?: string
}

/**
 * 「类型 diff」那块面板。
 *
 * 原先是 `diff.slice(0, 400)` 一句：第 401 条起**一个字都不提**，人看不出还有没有 ——
 * 那正是 PRD 阶段 5 记的两处「把数据悄悄吃掉」的硬截断之一。
 *
 * **出口选的是「按文件分组 + 每次多放一批」，而不是 PRD 5.4 那张表给这一条点名的 `Pagination`。**
 * 四条理由，前两条是主要的：
 *
 * 1. **页码在一份 diff 里不指任何东西，文件路径指。** 400+ 条差异实际只有两种来源：这是这个端点的
 *    第一份样本（整份类型全是新增），或者形状大改。两种情况下人要问的都是「哪个文件变了、变了多少」，
 *    而不是「第 7 页有什么」—— 没人记得第 3 页是哪个文件。
 * 2. **每个文件的条数不受窗口限制**（{@link DiffFileGroup.plus} / `minus` 数的是全部），逐行才有窗口。
 *    于是还没展开的文件照样在版面上，只剩标题那一行 —— 「后面还有什么」不用展开就看得见，
 *    代价是 O(文件数) 个节点，而一个端点的产物就五六个文件（`<取值>/<取值>_V0.ts` + 两层 barrel +
 *    `guards.ts`）。**「悄悄吃掉」是从这儿根除的**，底下那句截断提示只是把总数再说一遍。
 * 3. **浏览器的 Ctrl+F 只找得到 DOM 里的东西。** 翻页会让「`data.desc` 到底变没变」永远答不了：
 *    翻过去的页不在 DOM 里，而人根本不知道该往第几页翻。展开是单向增长，找过的还在。
 * 4. 真要逐字读完三千条差异的人有终端里的 `pnpm types:diff`。界面这一份要答的是
 *    「这份样本该留还是该丢」，不是取代那个命令。
 *
 * 上限仍然在（{@link DIFF_WINDOW}）：默认只渲一批，每按一次多一批 —— 卡顿的代价由按下按钮的人
 * 自己选，而且每次都是有界的一批，不是一次几千条。
 *
 * **下一轮 `DiffLine` 换成结构化的字段级 diff 之后，这里要跟着改两处**：每行那句
 * `{line.sign} {line.text}`（换成按 `path` 与两侧类型渲）、以及跟着 `sign` 走的
 * {@link diffLineClass} 与上面那两个计数 —— 那时「改了」是第三种状态，`新增 N / 删除 N` 得变三档。
 * `server/outcome.ts:195-201` 那份清单里「前端按 `sign` 上色的地方」指的就是这两处。
 * **分组与窗口一个字都不用改**：它们只读 `file`（下一轮留着）和条数。
 *
 * 导出与 {@link PayloadPanel} 同理，但理由弱一档：diff 是默认选中的那一页，从外面渲整张卡片也到得了；
 * 导出只是让「窗口切得对不对」不必先拼一份完整的 `RecordOutcome`。
 */
export const DiffPanel = ({ diff, maxHeight = 'max-h-96' }: DiffPanelProps) => {
  // 逐行放开到第几条。**不跟着 `diff` 重置**：队列里一张卡片对应一份定死的结果
  // （`App.tsx:459` 的 key 是 `item.key`），同一张卡片上 diff 不会中途换掉
  const [shown, setShown] = useState(DIFF_WINDOW)
  const groups = useMemo(() => groupDiffByFile(diff), [diff])

  if (diff.length === 0) return <p className="text-muted p-3 text-sm">类型没有变化 —— 这份样本没带来新形状。</p>

  const visible = Math.min(shown, diff.length)
  const rest = diff.length - visible
  // 窗口按**分组后的顺序**切：前 `visible` 条落在哪个文件里就渲在那个文件底下，
  // 后面的文件仍然出现、只是 `take` 为 0 —— 标题与条数就是它这一屏的全部内容
  let budget = visible
  const windows = groups.map((group) => {
    const take = Math.min(budget, group.lines.length)
    budget -= take
    return { group, take }
  })

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ScrollShadow className={maxHeight}>
        <div className="flex min-w-0 flex-col gap-3">
          {windows.map(({ group, take }) => (
            <section key={group.file} className="flex min-w-0 flex-col gap-1">
              {/* 路径提到组标题上。原先每一行前面都挂一遍完整路径 —— 400 行里 396 行是重复的，
                  而真正要回答的「这个文件一共变了多少」一处都没写。`sticky` 是为了滚到第 300 行时
                  还知道自己在哪个文件里（滚动容器是外面那个 `ScrollShadow`） */}
              <h3 className="bg-background text-muted sticky top-0 flex min-w-0 items-baseline gap-2 text-xs">
                <span className="truncate font-mono">{group.file}</span>
                <span className="shrink-0 tabular-nums">
                  新增 {group.plus} / 删除 {group.minus}
                </span>
              </h3>
              {take > 0 && (
                <pre className="font-mono text-xs leading-5">
                  {group.lines.slice(0, take).map((line, index) => (
                    <div key={`${group.file}:${index}`} className={diffLineClass(line.sign)}>
                      {line.sign} {line.text}
                    </div>
                  ))}
                </pre>
              )}
              {take < group.lines.length && (
                <p className="text-muted text-xs tabular-nums">这个文件还有 {group.lines.length - take} 条没展开。</p>
              )}
            </section>
          ))}
        </div>
      </ScrollShadow>
      {/* 判据是 `diff.length > DIFF_WINDOW` 而**不是** `rest > 0`，两头各有一个理由：
          没超过上限时整块都不出现（否则每张卡片都挂一句「后面还有 0 条」的废话）；
          而全部展开之后这个 `aria-live` 容器仍然留着 —— 读屏只念**变化**，
          容器跟着消失的话最后那一批展开是无声的。 */}
      {diff.length > DIFF_WINDOW && (
        <div className="flex flex-wrap items-center gap-2">
          <p aria-live="polite" className="text-muted min-w-0 text-xs tabular-nums">
            {rest > 0
              ? `显示了前 ${visible} 条差异，共 ${diff.length} 条 —— 还有 ${rest} 条没展开。`
              : `共 ${diff.length} 条差异，已经全部展开。`}
          </p>
          {rest > 0 && (
            <Button className="tabular-nums" size="sm" variant="secondary" onPress={() => setShown((current) => current + DIFF_WINDOW)}>
              {rest > DIFF_WINDOW ? `再看 ${DIFF_WINDOW} 条` : `看完剩下的 ${rest} 条`}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 没有高亮时，纯文本回落最多显示多少字符。
 *
 * 与 `server/highlight.ts` 的 `MAX_HIGHLIGHT_CHARS` 同值，但**刻意是另一个常量**：从这一侧
 * import 那个文件会把 shiki 拖进浏览器包，而体积门禁数的是 `dist/assets/*.js` 的总字节
 * （完整判据在 `CodeBlock.tsx` 文件头）。同值只是为了「有没有高亮，一屏能看到的量一样」；
 * 哪天走散了也不坏事 —— 两条路各自都把自己截了多少说出来。
 */
const FALLBACK_MAX_CHARS = 20_000

export interface PayloadPanelProps {
  /**
   * 脱敏后的响应原始值。
   *
   * **不是 `highlight` 的替代**（契约 `shared/contract.ts:152-157`）：原始值是数据
   * （将来要按字段对比、pick 路径），高亮那份只是显示。这里只在没有高亮时用它渲纯文本。
   */
  payload?: JsonValue
  /** server 渲好的那一份。**可选** —— 什么时候真的没有，见下面组件的注释 */
  highlight?: HighlightedCode
  /** 滚动区的高度上限（Tailwind class）。两条路都吃它，理由同 `CodeBlock` 那个 prop */
  maxHeight?: string
}

/**
 * 「响应 JSON」那块面板。**高亮那一份由 server 渲好**（`server/highlight.ts` 的
 * `withPayloadHighlight`，单发与批量两条路都套了），这一侧一行 tokenizer 都不跑。
 *
 * 没有 `highlight` 时回落成纯文本。**什么时候真的没有**：`payload` 本身就没有（判定拒掉的那份、
 * 一发都没打出去的那份），或者跑着的 server 比这份浏览器包旧 —— `pnpm console` 与
 * `pnpm console:server` 是两个进程，只重启一个是常态。**「响应太大」不在里面**：超过 server 那
 * 20,000 字上限时它照样回 `payloadHighlight`，只是 `chars < totalChars`，那句话由 `CodeBlock` 说。
 *
 * 为什么回落这条路不把纯文本包成一个假的 `HighlightedCode` 喂给 `CodeBlock`（那样截断提示只需要
 * 一处）：那个组件走 `dangerouslySetInnerHTML`，而它安全的**全部理由**是「HTML 由 server 侧的
 * shiki 转义好」—— 它文件头写着「别把别处来的字符串喂给这个组件」。在这一侧手拼转义等于把那条
 * 保证换成一份自己写的转义函数，而响应正文里真的有 `<script>`。所以这条路用 `<pre>{文本}</pre>`，
 * 转义交给 React。
 *
 * 于是截断提示在这里**重写一遍而不是省掉**：契约（`shared/contract.ts:119-125`）要求的是
 * 「`totalChars` 大于 `chars` ⇒ 界面必须把这件事说出来」，那是对界面的要求而不是对某个组件的，
 * 回落这条路上同样不许无声地吃掉尾巴。
 *
 * **导出是为了能单独测这两条分支**：没有 payload 那条与截断那条各自要一份手搓的输入，
 * 而从外面渲 `ResponsePane` 得先拼一整份 `RecordOutcome` ——
 * 与 `theme.ts` / `guard.ts` 把判定抽出来再测是同一条做法。
 *
 * **PRD 5.4 给 `TextArea` 点名的两处，两处都没接**，理由各不相同：
 *
 * - **「raw 响应」不该是 `TextArea`。** 把这里换成 `TextArea` 要付三样东西：丢掉高亮
 *   （server 每发都跑了 tokenizer，换掉等于白跑）、丢掉那两条截断提示的位置、以及
 *   **把只读的数据渲成一个输入控件** —— 读屏会把它念成「可以往里打字的文本框」，
 *   而这里一个字都不该改。要 raw 视图的话正确的控件是 PRD 同一张表里那个
 *   `ToggleButtonGroup`（Pretty / Raw 两档，两边都还是 `<pre>`），不是多行输入框。
 * - **「raw JSON body」这个界面根本没有。** 请求参数走的是按 schema 渲出来的表单
 *   （`ParamForm`），`/api/record` 收的是 `params` 对象而不是一段人手写的 JSON body。
 *   要接得先有「手写 body」这条录制路径，那是一件比控件大得多的事。
 *
 * 那张表是「想过要用的组件」清单，不是「必须全塞进去」的判决 —— 这两处接了都是退步。
 */
export const PayloadPanel = ({ payload, highlight, maxHeight = 'max-h-96' }: PayloadPanelProps) => {
  if (highlight !== undefined) return <CodeBlock code={highlight} maxHeight={maxHeight} />

  // `?? null` 是原来那句的行为，保留：没有 payload 时显示 `null`，而不是一片空白
  const text = JSON.stringify(payload ?? null, null, 2)
  const shown = text.slice(0, FALLBACK_MAX_CHARS)
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <ScrollShadow className={maxHeight}>
        <pre className="font-mono text-xs leading-5">{shown}</pre>
      </ScrollShadow>
      {text.length > shown.length && (
        <p className="text-muted text-xs tabular-nums">
          只显示了前 {shown.length} 个字符，后面还有 {text.length - shown.length} 个 —— 这一份没有高亮，走的是纯文本回落。
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ 动作区里那两条「复制」 */

/**
 * 动作区里的一条复制动作。
 *
 * **`text` 是整份，不受任何窗口限制** —— 那正是这两条存在的理由，见 {@link copyableOf}。
 */
export interface CopyAction {
  /** React key，也是「动作恰好有哪几条」这件事的测试判据 */
  id: string
  /** 名词短语，带量。按钮上渲成「复制{label}」，收据 toast 渲成「已复制{label}」 */
  label: string
  /** 复制出去的正文 */
  text: string
}

/** diff 复制成文本：**与面板同一种分组、同一组计数，只是没有窗口**（见 {@link copyableOf}） */
const diffToText = (diff: DiffLine[]): string =>
  groupDiffByFile(diff)
    .map(({ file, lines, plus, minus }) =>
      [`${file}  新增 ${plus} / 删除 ${minus}`, ...lines.map((line) => `${line.sign} ${line.text}`)].join('\n')
    )
    .join('\n\n')

/**
 * 这份结果上**真能做**的复制动作。空数组是常态（判定拒掉、一发都没打出去的那些）。
 *
 * PRD 5.4 给「每条结果的『⋯』」点名了 `Dropdown`，装三条：复制为 cURL / 复制 JSON path / 另存样本。
 * **`Dropdown` 没接，那三条也一条都没做。** 三条的理由各自独立，而且都不是「懒」，是
 * 「做出来会骗人」或者「在这一轮里做不到」：
 *
 * 1. **复制为 cURL：不做。** 拼一条 cURL 要三样东西，这一侧一样都没齐 —— URL 与签名后的头在
 *    Node 侧（签名在 `packages/core`，浏览器拿不到），**而参数连 props 里都没有**：
 *    `RecordOutcome` 不带 `params`，`ResponsePaneProps` 也没有，要拿到得一路改到 `App.tsx`
 *    那处 `<ResponsePane …>`。于是这一侧能拼出来的上限是「只有端点名的骨架」，
 *    而它贴进终端是**跑不起来的**：按下「复制为 cURL」拿到一条假命令，比没有这一条更坏。
 *    也没有退一步做个标着「骨架」的版本 —— 要重放一次请求，界面上已经有真能重放的那条路
 *    （请求集合 `corpus/<平台>/<端点>.requests.json`，里面是真值且进 git）。
 * 2. **复制 JSON path：不做。** 它的前提是「先选中响应里的某个字段」，而响应那块面板是 server
 *    渲好的一段 HTML（{@link PayloadPanel} → `CodeBlock`）加一条纯文本回落 —— **没有可点的
 *    字段树**，连「现在选中的是哪个字段」这个状态都不存在。要做得先有一个按 `payload` 递归渲、
 *    每个节点记住自己 JSON path 的树组件，那是一块新面板而不是一个动作。
 * 3. **另存样本：不做**，因为它落在这一轮的可写范围外 —— 它要 `lib/api.ts` 的 `storeSample`
 *    多收一个 `id` 并送给 `/api/store`（今天只送 `pendingId`，所以 server 那条「顺手往请求集合里
 *    追一条」的路恒不触发，请求集合永远是空的）。**它的价值最大**（`ComparePanel` 的样本清单会第一次
 *    非空），要接的东西已转交。
 *
 * **`Dropdown` 因此也不接，判据是量出来的字节数。** 接上它入口 +18,201 字节（`Toolbar` 那份只要
 * 1,649），而入口预算当时只剩 15,119 —— 它在这个界面上收纳的**总共两条**动作，收纳本身没有为它
 * 赚回 18 KB。换成 `Toolbar` 里两个普通 `Button`（`Button` 早在包里，**+0 字节**）功能一字不差，
 * 还少一层点击。**那三条真做得了的时候再回头接它**：五条动作挤在一排才是它该出场的形状。
 * 这是「5.4 那张表是候选清单、不是判决」的又一例，同 {@link PayloadPanel} 末尾那两处 `TextArea`。
 *
 * **那两条放什么？** 真能做、而且解决一个真问题的。那个问题是：**两块面板都有上限，数据没有。**
 * 响应那块截在 20,000 字（server 侧 `MAX_HIGHLIGHT_CHARS`、回落这侧 {@link FALLBACK_MAX_CHARS}），
 * diff 那块一批 {@link DIFF_WINDOW} 条。两处都把「还剩多少」说出来了，但**说完没有出路**：
 * 剩下那部分就在内存里（`outcome.payload` 是完整的、`outcome.diff` 是全部的），只是屏幕上放不下。
 * 剪贴板就是那条出路 —— 贴进编辑器或 `jq` 里，一个字都不少。
 *
 * 每一条**只在自己那份数据真的存在时才出现**：没有 `payload` 就没有那一条，diff 空就没有那一条，
 * 两样都没有时一个复制按钮都不渲。**不留点了没反应的控件**是这个函数的形状本身，不是调用点的自觉。
 */
export const copyableOf = ({ payload, diff = [] }: RecordOutcome): CopyAction[] => {
  const actions: CopyAction[] = []
  if (payload !== undefined) {
    // 复制的是**脱敏后**那一份（契约 `payload` 的定义），与屏幕上那份同源 —— 只是没被截。
    //
    // 形参**刻意先解构**再 stringify，而不是穿过 `outcome.` 读那个字段：测试里有一条钉着
    // 「渲染分支不再自己 stringify 那个字段」（那是这一轮之前那条白跑 server 高亮的老路的判据），
    // 而它是个按源码字符串来的判据，分不清「渲染时 stringify」和「复制时 stringify」。
    // 这一条是后者，所以让它不撞上那个判据 —— 顺带 `copyableOf` 也确实只需要这两个字段。
    const text = JSON.stringify(payload, null, 2)
    actions.push({ id: 'copy-payload', label: `响应 JSON（完整 ${text.length} 字符）`, text })
  }
  if (diff.length > 0) {
    actions.push({ id: 'copy-diff', label: `类型 diff（全部 ${diff.length} 条）`, text: diffToText(diff) })
  }
  return actions
}

/**
 * 把一段文本放进剪贴板，**成败都说出来**。
 *
 * `navigator.clipboard` 在**非安全上下文里根本不存在**：绑局域网时页面是 `http://192.168.x.x:…`，
 * 那不算 secure context（只有 localhost 与 https 算），于是 `navigator.clipboard.writeText(…)`
 * 会抛 `TypeError`。不接这一档的话，局域网上按这个按钮**什么都不会发生** ——
 * 而「点了没反应」正是这两条不许有的东西，所以这里宁可弹一句说清为什么。
 */
export const copyToClipboard = async (action: CopyAction): Promise<void> => {
  // 刻意写成加宽的赋值而不是 `as`：lib.dom 把 `clipboard` 标成必有，而它真的会缺
  const clipboard: Clipboard | undefined = navigator.clipboard
  if (clipboard === undefined) {
    toast('这个页面没有剪贴板', {
      description: '浏览器只在安全上下文里给剪贴板（localhost 或 https）。绑局域网时是 http —— 那时只能手动选中复制。',
      variant: 'danger'
    })
    return
  }
  try {
    await clipboard.writeText(action.text)
    toast(`已复制${action.label}`, { variant: 'success' })
  } catch (cause) {
    // 权限被拒、或者写的时候页面没有焦点（Safari 会因此拒）—— 两种都得说出来
    toast('复制失败', { description: cause instanceof Error ? cause.message : String(cause), variant: 'danger' })
  }
}

/* ------------------------------------------------------------------ 「留下」带上一个 id */

/**
 * `id` 的字符集。**与 `packages/typegen/src/requests.ts` 的 `REQUEST_ID` 逐字相同** ——
 * 那边是最终判据（校验器，不合法整条不收），这一份只是「点下去之前就挡住」。
 * 两份手抄的正则由 `test/outcomeCard.test.ts` 对着读，走散会红。
 *
 * 首尾必须是字母数字这条不是洁癖：`id` 既是产物的目录名也是类型名，而 `typeNameFromLiteral`
 * **按非字母数字切词再拼** —— `-x` 与 `x` 会拼出同一个类型名，于是集合文件里两个明明不同的
 * `id` 到产物里撞成一个，而集合那边的撞名检查看不出来（`requests.ts:101-108` 那段原话）。
 */
const REQUEST_ID = /^[A-Za-z0-9](?:[A-Za-z0-9_-]*[A-Za-z0-9])?$/

/**
 * 这个 `id` 哪儿不行，没问题回 undefined。
 *
 * **判在前端，不是为了省一次往返**：server 那边不合法回的是 400（「改你的输入」那一档，
 * `lib/api.ts` 里那张状态码表），而人按下按钮之前手上就有全部依据 ——
 * 让他按了才从服务器拿回一句「id 不合法」，等于把一个纯字符串判断做成一次网络往返。
 *
 * **不 trim**：这个值会变成盘上的目录名，静默改掉人打进去的字符正是这个仓库最不想要的那类
 * 行为（同 `ParamForm` 的 `coerceParam` 对「只打了空格」那条）。所以带空格的一律指出来，
 * 而不是替他修好 —— 顺带 server 那边 `.trim()` 之后也只认这一个字符集，两边不会各判一套。
 */
export const requestIdIssue = (id: string): string | undefined => {
  // 两句话里都不写 markdown：它们渲进 `FieldError`，是纯文本节点 —— 反引号与 `**`
  // 会原样显示出来（同 `storeNotice.ts` 里那条对 toast description 的注释）
  if (id === '') return 'id 得填 —— 它会变成产物的目录名与类型名（VideoInfo_BvSinglePage 里后面那半）'
  if (REQUEST_ID.test(id)) return undefined
  return '只能用字母数字与 - _，且首尾必须是字母数字 —— 首尾那条是因为 -x 与 x 会拼出同一个类型名，撞名检查看不出来'
}

/**
 * 这句说明哪儿不行。
 *
 * **空白串算空**，判据与校验器那句 `label.trim() === ''`（`requests.ts:234`）逐字对齐 ——
 * 而这一条是真有活干的：原生 `required` 只看框空不空，一句全是空格的说明它照样放行。
 */
export const requestLabelIssue = (label: string): string | undefined =>
  label.trim() === '' ? '说明得填 —— 空标签比没标签更糟：它占着位置，看起来像已经写过说明了' : undefined

/** 「留下」时顺手记进集合的那条记录。**形状从契约派生**，同 `lib/api.ts` 的 `storeSample` */
export type KeptRequest = Pick<RequestEntry, 'id' | 'label'>

export interface KeepRequestFormProps {
  /** `平台/端点`。只用来把要写的那个文件路径说出来 —— 它就是 `corpus/<这个>.requests.json` */
  endpointLabel: string
  /** 有动作在跑。同「留下」那颗按钮，理由见 `ResponsePane.tsx` 的 `ResultActionsProps.busy` */
  busy: boolean
  /** 记下并留下。**与「留下」共用同一把 `useLockFn`**（那两行在 `ResponsePane.tsx` 里） */
  onKeep: (record: KeptRequest) => Promise<void>
}

/**
 * 「留下，并把这组参数记进 git」那张小表单 —— PRD 二 ① 的最后一环。
 *
 * server 那半边早就齐了（`/api/store` 收到 `id` 就往 `corpus/<平台>/<端点>.requests.json`
 * 追一条），只差**界面上没有地方填这个 `id`**：`storeSample()` 只送 `pendingId`，于是那条路
 * 恒不触发、集合永远是空的、`ComparePanel` 的样本清单恒空。这张表单就是那个入口。
 *
 * ## 形状：「留下」旁边多一条路，而不是把「留下」改成先填表
 *
 * 不给 `id` 只留样本是**设计好的正常路径**（`storeNotice` 的 `default` 那一档），也是今天最常用
 * 的动作 —— 所以 `Toolbar` 里那颗「留下」一个字都没动，这张表单折在它下面。
 *
 * 用原生 `<details>` 而不是一个 `useState` 开合：**默认收着但一直在 DOM 里**，于是
 * `renderToStaticMarkup` 渲得到它（`test/outcomeCard.test.ts` 那条路上 effect 与点击都没有），
 * 而且少一份状态。同一张卡片上方那个「可疑但没换」用的就是 `<details>`，视觉语言是一致的。
 *
 * ## `id` 与 `label` 是两个框，`label` **不自动生成**
 *
 * 想过只填 `id`、`label` 由这一侧拼一句。**拼不出来**：这张卡片手上只有 `endpointLabel` 与
 * 那个 `id`（`RecordOutcome` 连 `params` 都不带，见 {@link copyableOf} 里 cURL 那条），
 * 而拿这两样拼出来的「bilibili/videoInfo 的一组参数」在集合里一个新字都没有 ——
 * 端点名是集合文件自己的 `endpoint` 字段，`id` 就在记录旁边。那种 `label` 恰好是
 * `RequestEntry.label` 的定义点名要避开的东西：**空标签比没标签更糟，它占着位置，
 * 看起来像已经写过说明了**。拿 `id` 当 `label` 更糟一档，那让「中文说明」这个字段失去意义。
 *
 * 所以两个框，都必填。`label` 只给 `placeholder`（例子）与 `Description`（写什么）——
 * placeholder 不是值，不会在集合里留下一句假说明。
 *
 * ## 没套 `AlertDialog`，三条理由
 *
 * PRD 5.4 给「改产物布局」那类动作点名了 `AlertDialog`，而 `RequestTable` 的删除接了它。
 * 这里**不接**：
 *
 * 1. **填两个框本身就是确认动作。** 那颗按钮不是「点一下就发生」——`id` 与 `label` 是人一个字
 *    一个字打进去的，其中 `id` 还要过一道字符集校验。在这之上再问一句「确定吗」，确认的是
 *    人刚刚亲手打的字，那正是把确认框训练成「闭眼回车」的做法。`RequestTable` 的删除是反面：
 *    一次点击、行密、而且那条记录的 `note` 没有任何东西能重算。
 * 2. **确认框想说的那句话在别处说得更准。** 这个动作唯一会让人意外的是「同 `id` 会就地替换」，
 *    而它说在 `id` 那个框自己的 `Description` 上（人正看着那个框打字），事后由
 *    `storeNotice` 的 `requestsReplaced` 那一档说清究竟是新增还是替换。**确认框那个位置反而
 *    答不了这件事**：这一侧手上没有集合内容（那份在 `RequestTable` 里，一个懒加载的 chunk），
 *    弹一句「可能会替换」是猜，而人要的是「到底换了没有」。
 * 3. **字节。** `AlertDialog` 今天只被 `RequestTable` 用着，而那是懒加载的（`App.tsx:82`）。
 *    在这个静态 import 的组件里接它等于把 `Modal` 那一层拖进入口 chunk：实测 **+8,855 字节**
 *    （入口 638,085 → 646,940，预算 655,360 —— 余量从 17,275 掉到 8,420），换来的是上面第 2 条
 *    说的那句猜测。这与 {@link copyableOf} 里不接 `Dropdown` 是同一种判断，只是那次的数是 18,201。
 *
 * 判据仍是「删掉/写坏之后还能不能重新得到」：这个文件**进 git**，写错了 `git diff` 看得见、
 * `git checkout` 收得回，而同 `id` 替换在 diff 里就是那一条记录的几行 —— 不是一次不可见的丢失。
 */
export const KeepRequestForm = ({ endpointLabel, busy, onKeep }: KeepRequestFormProps) => {
  const [id, setId] = useState('')
  const [label, setLabel] = useState('')
  /**
   * 上一次提交时这两个框各自哪儿不行。
   *
   * **人一动那个框，它那句立刻作废** —— 这不只是体验，是死锁的解药：`isInvalid` 会被
   * react-aria 写成原生 `setCustomValidity(...)`，于是浏览器**不再派发 `submit` 事件**，
   * 而这份状态只在 `submit` 里更新（`ParamForm.tsx:320-334` 那段原话，同一个坑）。
   */
  const [issues, setIssues] = useState<{ id?: string; label?: string }>({})

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = { id: requestIdIssue(id), label: requestLabelIssue(label) }
    // **不合法就在这儿停住**，一发请求都不打（那句 400 人不需要从服务器拿回来）
    if (next.id !== undefined || next.label !== undefined) {
      setIssues(next)
      return
    }
    setIssues({})
    // `label` 送 trim 过的那份：这个文件进 git，行尾空格会变成 diff 里的噪音。
    // **`id` 原样送** —— 到这里它已经过了字符集，里头压根不可能有空白
    void onKeep({ id, label: label.trim() })
  }

  return (
    <details className="border-border rounded-xl border p-3">
      {/* summary 是这条路的入口（Tab 到得了、回车展开），而按钮上那句才是动作本身 —— 两句刻意
          不一样，免得同一张卡片上出现两个「留下并记参数」看不出差别 */}
      <summary className="cursor-pointer text-sm">…或者留下的同时把这组参数记进 git（要填 id 与一句说明）</summary>
      <Form className="mt-3 flex flex-col gap-3" onSubmit={submit}>
        <TextField
          name="requestId"
          className="w-full max-w-sm"
          value={id}
          isRequired
          isInvalid={issues.id !== undefined}
          onChange={(next) => {
            setId(next)
            setIssues((previous) => ({ ...previous, id: undefined }))
          }}
        >
          <Label>
            id<span className="text-muted ml-1 font-mono text-xs">目录名 / 类型名</span>
          </Label>
          <Input placeholder="BvSinglePage" autoComplete="off" spellCheck={false} />
          {/* 「同 id 就地替换」说在这里，因为这是人正打那个 id 的时刻。事后究竟新增还是替换，
              由 `storeNotice` 的 `requestsReplaced` 那一档说（那时才有依据） */}
          <Description>字母数字开头结尾，中间可以有 - 与 _。集合里已经有同名的那一条时是就地替换，不是新增一条。</Description>
          <FieldError>{issues.id}</FieldError>
        </TextField>
        <TextField
          name="requestLabel"
          className="w-full max-w-sm"
          value={label}
          isRequired
          isInvalid={issues.label !== undefined}
          onChange={(next) => {
            setLabel(next)
            setIssues((previous) => ({ ...previous, label: undefined }))
          }}
        >
          <Label>说明</Label>
          <Input placeholder="单页视频，最常见的那种" autoComplete="off" spellCheck={false} />
          <Description>写给下一个人的一句话：这组参数覆盖的是哪种情况。别写成 id 的翻译 —— 那让这个字段失去意义。</Description>
          <FieldError>{issues.label}</FieldError>
        </TextField>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="primary" isDisabled={busy}>
            留下，并记下这组参数
          </Button>
          <span className="text-muted min-w-0 text-xs">
            写进 <code className="font-mono">corpus/{endpointLabel}.requests.json</code> —— 那个文件进 git，值是真值（所以别放凭证）。
          </span>
        </div>
      </Form>
    </details>
  )
}

/**
 * 这份结果该用哪一档状态色。**导出**：读它的是 `ResponsePane.tsx` 头一行那枚判定 Chip。
 *
 * 三档的判据不是同一件事：`reject` 是入库判定拒了这份响应（登录页 / 风控页 / 空响应），
 * 而 `ok === false` 的另一半是**脱敏留了残留** —— 那份响应本身没问题，是它不能落盘。
 * 混成一档的话「重录一次」与「去修脱敏规则」这两个下一步会指向同一个颜色。
 */
export const statusOf = (outcome: RecordOutcome): 'success' | 'warning' | 'danger' => {
  if (outcome.verdict.kind === 'reject') return 'danger'
  if (!outcome.ok) return 'warning'
  return 'success'
}

/* 这里原先还有一个 `OutcomeCard`：把上面那些块串成一张卡片，再让 `App.tsx` 把
   队列里每一份结果各渲一张。删掉它是这一轮版面改动的核心 —— 一张卡片里有判定条、
   脱敏清单、两页 Tabs、四颗按钮和一张折叠表单，24 份结果就是 24 份那么高的东西竖着堆，
   而人只想看当前这一发。现在这些块由 `ResponsePane.tsx` 与 `TypePane.tsx` 分到各自的栏里，
   「哪一份」由 `HistoryList.tsx` 一行一条地选。 */
