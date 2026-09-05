/**
 * 一次录制结果的四块面板：判定条、脱敏清单、响应 JSON、类型 diff（含破坏性变更）。
 *
 * 「留下 / 丢掉」两个动作在这里 —— 那正是这个工具存在的理由：
 * **批量录制不等于批量入库**，每一份都得人看过再决定。
 */

import { Alert, Button, Chip, ScrollShadow, Tabs } from '@heroui/react'
import { useLockFn } from 'ahooks'
import { useMemo, useState } from 'react'

import type { DiffLine, HighlightedCode, JsonValue, RecordOutcome } from '../lib/api'
import { CodeBlock } from './CodeBlock'

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
export const DiffPanel = ({ diff }: DiffPanelProps) => {
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
      <ScrollShadow className="max-h-96">
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
 * **导出是为了能单独测这两条分支**：`Tabs` 只渲选中的那一页，而整张卡片默认停在 `diff` 那页，
 * 从外面渲 `OutcomeCard` 根本到不了这里 —— 与 `theme.ts` / `guard.ts` 把判定抽出来再测是同一条做法。
 */
export const PayloadPanel = ({ payload, highlight }: PayloadPanelProps) => {
  if (highlight !== undefined) return <CodeBlock code={highlight} />

  // `?? null` 是原来那句的行为，保留：没有 payload 时显示 `null`，而不是一片空白
  const text = JSON.stringify(payload ?? null, null, 2)
  const shown = text.slice(0, FALLBACK_MAX_CHARS)
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <ScrollShadow className="max-h-96">
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

const statusOf = (outcome: RecordOutcome): 'success' | 'warning' | 'danger' => {
  if (outcome.verdict.kind === 'reject') return 'danger'
  if (!outcome.ok) return 'warning'
  return 'success'
}

export interface OutcomeCardProps {
  outcome: RecordOutcome
  /**
   * 这张卡片属于哪个端点（`平台/端点`）。
   *
   * **不是装饰。** 队列刻意不随切端点清空（否则批量录完剩下的待定样本就再也碰不到了），
   * 于是队列里会混着好几个端点的卡片 —— 不标出来，点「留下」时会以为在给当前端点入库。
   */
  endpointLabel: string
  /** 已经处理过（入库或丢弃）时显示的文案；未处理时是 undefined */
  settled?: string
  /** 有动作在跑。两个按钮都要禁掉 —— 双击「留下」会让第二次撞 404 */
  busy: boolean
  /**
   * 入库 / 丢弃。
   *
   * **必须返回 Promise**，否则下面的 `useLockFn` 锁不住 —— 它靠 `await` 这个 promise
   * 才知道动作什么时候结束。调用方那边由 `useRequest` 兜住错误，所以这两个不会 reject。
   */
  onStore: () => Promise<void>
  onDiscard: () => Promise<void>
}

export const OutcomeCard = ({ outcome, endpointLabel, settled, busy, onStore, onDiscard }: OutcomeCardProps) => {
  const scrub = outcome.scrub
  const diff = outcome.diff ?? []
  const breaking = outcome.breaking ?? []

  // 防双击撞 404 的**第二道**闸，而且是真正管用的那道：`isDisabled` 要等一次
  // 渲染才生效，两次点击落在同一帧里时第二次照样发得出去；`useLockFn` 在函数层上锁，
  // 第一次的 promise 没落地之前第二次直接返回。
  // 锁是**每张卡片各自一把** —— 撞 404 的原因是同一个 `pendingId` 被消费两次，
  // 而不同卡片是不同的 pendingId，没理由互相挡。
  const store = useLockFn(onStore)
  const discard = useLockFn(onDiscard)

  return (
    <div className="border-border flex flex-col gap-4 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip size="sm" variant="soft">
          <Chip.Label className="font-mono">{endpointLabel}</Chip.Label>
        </Chip>
        {outcome.shapeChanged === true && (
          <Chip size="sm" variant="soft" color="success">
            <Chip.Label>带来了新形状</Chip.Label>
          </Chip>
        )}
      </div>

      <Alert status={statusOf(outcome)}>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>
            {outcome.verdict.kind}
            {outcome.verdict.confident === false && ' （判定器在这份响应上没有依据）'}
          </Alert.Title>
          <Alert.Description>
            {outcome.verdict.reason}
            {outcome.message !== undefined && ` —— ${outcome.message}`}
          </Alert.Description>
        </Alert.Content>
      </Alert>

      {scrub !== undefined && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Chip color="accent" variant="soft">
              <Chip.Label>脱敏 {scrub.replacements} 处</Chip.Label>
            </Chip>
            {scrub.leaks.length > 0 && (
              <Chip color="danger" variant="primary">
                <Chip.Label>有残留，这份不能入库</Chip.Label>
              </Chip>
            )}
          </div>
          {scrub.leaks.length > 0 && (
            <ul className="text-danger-soft-foreground bg-danger-soft rounded-xl p-3 font-mono text-xs">
              {scrub.leaks.map((leak) => (
                <li key={leak}>{leak}</li>
              ))}
            </ul>
          )}
          {scrub.suspects.length > 0 && (
            <details className="text-warning-soft-foreground bg-warning-soft rounded-xl p-3 text-xs">
              <summary className="cursor-pointer">可疑但没换（{scrub.suspects.length} 处，规则没命中）</summary>
              <ul className="mt-2 font-mono">
                {scrub.suspects.map((suspect) => (
                  <li key={suspect}>{suspect}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <Tabs defaultSelectedKey="diff">
        <Tabs.ListContainer>
          <Tabs.List aria-label="结果面板">
            <Tabs.Tab id="diff">
              类型 diff（{diff.length}）
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="payload">
              响应 JSON
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="diff">
          {breaking.length > 0 && (
            <Alert status="danger" className="mb-2">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>破坏性变更（下游会红）</Alert.Title>
                <Alert.Description>
                  <ul className="font-mono text-xs">
                    {breaking.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}
          {/* 原先这里是 `diff.slice(0, 400)` 一句 —— 上限留着（几千个 `<div>` 会让页面卡住），
              但「截了多少」与「怎么看后面的」都在 `DiffPanel` 里，见它的文件注释 */}
          <DiffPanel diff={diff} />
        </Tabs.Panel>
        <Tabs.Panel id="payload">
          {/* 两个字段都读：`payloadHighlight` 是显示，`payload` 是数据兼回落。
              原先这里自己 `JSON.stringify(...).slice(0, 20_000)` 渲纯文本 ——
              于是 server 每录一发都白高亮一遍，而截断一个字都没说出来 */}
          <PayloadPanel payload={outcome.payload} highlight={outcome.payloadHighlight} />
        </Tabs.Panel>
      </Tabs>

      {/* 没带来新形状 ⇒ 明确建议丢掉。**diff 非空不等于有价值** —— 产物文件头里有溯源块，
          多录一份样本必然多两行注释，所以判据是 server 算好的 `shapeChanged` 而不是 diff 长度。
          那两份 2.57 MB 的重复 B站 comments 样本正是没有这个提示的产物 */}
      {settled === undefined && outcome.shapeChanged === false && outcome.pendingId !== undefined && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>这份没带来新形状，建议丢掉</Alert.Title>
            <Alert.Description>
              类型一行都不会变（diff 里只有溯源注释）。留着它只会让生成变慢、diff 变长 —— 除非你是想换掉某份已有的样本（比如那份是风控页）。
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {settled !== undefined ? (
        <p className="text-muted text-sm">{settled}</p>
      ) : outcome.pendingId !== undefined ? (
        <div className="flex gap-2">
          {/* `isDisabled` 是粗一档的闸（有任何动作在跑就都禁掉），细的那道在上面的
              `useLockFn` 里 —— 单靠 `isDisabled` 挡不住同一帧里的两次点击 */}
          <Button variant={outcome.shapeChanged === false ? 'secondary' : 'primary'} isDisabled={busy} onPress={() => void store()}>
            留下
          </Button>
          <Button variant="danger-soft" isDisabled={busy} onPress={() => void discard()}>
            丢掉
          </Button>
        </div>
      ) : (
        <p className="text-warning-soft-foreground text-sm">这份不能入库（被入库判定拒了，或有脱敏残留）。</p>
      )}
    </div>
  )
}
