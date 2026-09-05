/**
 * 一次录制结果的四块面板：判定条、脱敏清单、响应 JSON、类型 diff（含破坏性变更）。
 *
 * 「留下 / 丢掉」两个动作在这里 —— 那正是这个工具存在的理由：
 * **批量录制不等于批量入库**，每一份都得人看过再决定。
 */

import { Alert, Button, Chip, ScrollShadow, Tabs } from '@heroui/react'
import { useLockFn } from 'ahooks'

import type { DiffLine, HighlightedCode, JsonValue, RecordOutcome } from '../lib/api'
import { CodeBlock } from './CodeBlock'

/**
 * diff 行按增删上色。判据是结构化的 `sign` 而不是子串匹配 ——
 * 手拼 HTML 那版按 `line.includes(' + ')` 猜，正文里含 ` - ` 的行会被误判成删除行。
 */
const diffLineClass = (sign: DiffLine['sign']): string =>
  sign === '+' ? 'text-success-soft-foreground bg-success-soft' : 'text-danger-soft-foreground bg-danger-soft'

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
          {diff.length === 0 ? (
            <p className="text-muted p-3 text-sm">类型没有变化 —— 这份样本没带来新形状。</p>
          ) : (
            <ScrollShadow className="max-h-96">
              <pre className="font-mono text-xs leading-5">
                {diff.slice(0, 400).map((line, index) => (
                  <div key={`${line.file}:${index}`} className={diffLineClass(line.sign)}>
                    <span className="text-muted mr-2">{line.file}</span>
                    {line.sign} {line.text}
                  </div>
                ))}
              </pre>
            </ScrollShadow>
          )}
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
