/**
 * 「结果」栏底下那条动作带：**这份样本值不值得留、留的时候要不要连参数一起记进 git。**
 *
 * ## 为什么是一条带而不是一格可拖的面板
 *
 * 原先它是「响应」栏 footer 里的一整格（默认 40% 高、可拖）。两栏之后它缩成 tab 正文
 * 底下一条 `shrink-0` 的带子：高度由内容决定、`max-h-64` 封顶（破坏性变更清单偶尔很长，
 * 它自己滚）。**决定永远在视野里** —— 响应滚到哪儿，「留下 / 丢掉」都在原地。
 *
 * ## 四颗按钮不在 `<summary>` 里 —— 原生 `<details>` 的语义挡着
 *
 * `<summary>` 里任何点击都触发开合（HTML 规定），把「只留样本 / 丢掉」放进去的话点「只留样本」
 * 会先把表单展开。所以按钮坐工具条、只有参数进 git 那张表单是 `<details>` —— 它折着也一直在
 * DOM 里，`renderToStaticMarkup` 渲得到（`test/` 那条路靠的正是这个）。
 *
 * ## 四枚 Chip 搬进来了（原先在「响应」栏的标题行）
 *
 * 判定 / 脱敏有残留 / 新形状 / 已截断 —— `h-14` 的标题行装不下四枚 tab + 收据 + 按钮，而这几枚
 * 恰恰都是「这份该不该留 / 屏幕上这份是不是全的」的证据：它们与「留下 / 丢掉」说的是同一件事，
 * 该住在一起。
 *
 * ## 提示字的规则（与 `ResultPane.tsx` 文件头同一条）
 *
 * 这条带上常驻的说明文字只许留**会改变下一步动作**的：破坏性变更清单（下游会编译红）、
 * 「这份不能入库」+ 原因、「建议丢掉」。讲原理的（字符集规则、写进哪个文件）一律
 * tooltip / `FieldError` —— 判据「每一发都要看 vs 偶尔要查」全仓通用。
 */

import { Button, Chip, Toolbar, Tooltip } from '@heroui/react'
import { useLockFn } from 'ahooks'
import { useMemo } from 'react'

import type { RecordOutcome } from '../lib/api'
import { copyableOf, copyToClipboard, KeepRequestForm, type KeptRequest, type PayloadView, statusOf, trimmedChipLabel } from './Result'

export interface ResultActionsProps {
  /** 这一份结果。调用方（ResultPane）保证只在有结果时渲这一条 */
  outcome: RecordOutcome
  /**
   * 「响应」页当前显示哪一份（原始 / 样本）。复制按钮跟着它走 —— 状态在 `ResultPane`
   * （切换控件在那儿），这一条只消费：两份复制出去的东西不同，标签得说清复制的是哪份
   */
  payloadView: PayloadView
  /**
   * 这一份属于哪个端点（`平台/端点`）。不标出来，点「留下」时会认错端点 ——
   * 结果不随切端点清空，显示的那份可能不是左栏当前选中的那个。
   */
  endpointLabel?: string
  /** 已经处理过（入库或丢弃）时那句收据 */
  settled?: string
  /**
   * 收据在，但这份样本**在 server 那边还留着**，所以「留下 / 丢掉」不许收走。
   * 判据必须与 `server/index.ts:549` 那行逐字对齐：server 留着条目 ⇒ 这里留着按钮。
   */
  retryable?: boolean
  /** 有动作在跑。两个入库动作都要禁 —— 双击「留下」会让第二次撞 404 */
  busy: boolean
  /** 入库 / 丢弃。必须返回 Promise（`useLockFn` 靠 `await`）。`record` 是参数进不进 git 的开关 */
  onStore: (record?: KeptRequest) => Promise<void>
  onDiscard: () => Promise<void>
}

export const ResultActions = ({
  outcome,
  payloadView,
  endpointLabel,
  settled,
  retryable = false,
  busy,
  onStore,
  onDiscard
}: ResultActionsProps) => {
  // 防双击撞 404 的**第二道**闸：`isDisabled` 要等一次渲染才生效，`useLockFn` 在函数层上锁
  const store = useLockFn(onStore)
  const discard = useLockFn(onDiscard)

  const breaking = outcome.breaking ?? []
  const scrub = outcome.scrub
  /** 这份样本还等着人处理。`retryable` 那一支见 {@link ResultActionsProps.retryable} */
  const canSettle = (settled === undefined || retryable) && outcome.pendingId !== undefined
  // 整份正文在这里面拼好（两条最长的加起来几十万字符，而复制是人点出来的），跟着 `outcome` 记一次。
  // `payloadView` 一起进依赖：切换那一档换的是复制出去的**另一份**正文，memo 不跟着变会复制错份
  const copyable = useMemo(() => copyableOf(outcome, payloadView), [outcome, payloadView])
  const trimmed = outcome.payloadTrimmed ?? []

  return (
    // 底色比正文亮一档（与标题行同一条梯子判据，lib/pane.ts）：它是钉在底部的一条，不是会滚的正文
    <div className="bg-surface-secondary flex max-h-64 min-h-0 shrink-0 flex-col gap-2 overflow-y-auto p-3">
      {/* 破坏性变更留在版面上（不进 tooltip）：它说的是「下游会编译红」，
          那是这条带上唯一一件比按钮更要紧的事 */}
      {breaking.length > 0 && (
        <ul className="text-danger-soft-foreground bg-danger-soft rounded-lg p-2 font-mono text-xs">
          {breaking.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
      )}

      {/* 没带来新形状 ⇒ 一句话建议丢掉。**判据是 server 算好的 `shapeChanged` 而不是 diff 长不长** */}
      {settled === undefined && outcome.shapeChanged === false && outcome.pendingId !== undefined && (
        <p className="text-warning-soft-foreground text-xs">这份没带来新形状，类型一行都不会变 —— 建议丢掉。</p>
      )}

      {/* 不能入库时**把判定的原话说出来**（compute 那档另说一句，判据同旧版） */}
      {settled === undefined && outcome.pendingId === undefined && (
        <div className="text-warning-soft-foreground flex min-w-0 flex-col gap-1 text-xs">
          <p>{outcome.verdict.kind === 'compute' ? '这个端点不用录样本。' : '这份不能入库。'}</p>
          <p className="font-mono break-words">
            {outcome.verdict.kind}：{outcome.verdict.reason}
            {outcome.message !== undefined && ` —— ${outcome.message}`}
          </p>
          {outcome.verdict.kind === 'compute' && <p>上面那段就是算出来的值，「声明」那一页就是它的形状 —— 两样都不必进 corpus。</p>}
          {scrub !== undefined && scrub.leaks.length > 0 && <p className="font-mono break-words">脱敏有残留：{scrub.leaks.join('、')}</p>}
        </div>
      )}

      {(canSettle || copyable.length > 0) && (
        // 一行：证据（Chip）→ 决定（Toolbar）→ 这份属于谁。挤不下自然换行
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {/* 收据是**持续的状态**（这份已经入库了 / 已经丢了），跟着这条带走 */}
          {settled !== undefined && (
            <Chip size="sm" variant="soft" color={retryable ? 'warning' : 'success'}>
              <Chip.Label>{settled}</Chip.Label>
            </Chip>
          )}
          {/* 判定。Chip 上只有那一个词，理由进 tooltip；`confident === false` 那档必须看得见 */}
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
          {/* 脱敏**只有真的有残留时**才占版面 —— 唯一会改变下一步的一档（这份不能入库） */}
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
          {outcome.shapeChanged === true && (
            <Chip size="sm" variant="soft" color="accent">
              <Chip.Label>新形状</Chip.Label>
            </Chip>
          )}
          {/* 样本被 trimSample 截过 ——「响应」页的「样本」档比原始的那份少，这件事必须
              有人在版面上说出来（PRD 阶段 3 的第三处）。一句话怎么拼在 `trimmedChipLabel`
              （一处说全 `emoji_list 371→3`、多处报处数），明细全在 tooltip */}
          {trimmed.length > 0 && (
            <Tooltip delay={300}>
              <Chip size="sm" variant="soft" color="warning">
                <Chip.Label className="font-mono">{trimmedChipLabel(outcome.payloadTrimmed!)}</Chip.Label>
              </Chip>
              <Tooltip.Content>
                <p className="max-w-sm">「样本」档里这些数组被截短了（裁剪在入库之前做，类型不受影响）；全量在「响应」页的「原始」档。</p>
                <ul className="max-w-sm font-mono text-xs">
                  {outcome.payloadTrimmed!.map((item) => (
                    <li key={item.path}>{`${item.path === '' ? '（根数组）' : item.path} ${item.from}→${item.to}`}</li>
                  ))}
                </ul>
              </Tooltip.Content>
            </Tooltip>
          )}
          {endpointLabel !== undefined && <span className="text-muted ml-auto min-w-0 truncate font-mono text-xs">{endpointLabel}</span>}
          {/* `Toolbar` 而不是裸 div：左右箭头在动作之间移动，读屏把它念成一组。
              复制不跟着 `busy` 禁：它一发请求都不打（按钮上的量进 tooltip，判据同旧版） */}
          <Toolbar aria-label="这份结果的动作" className="flex min-w-0 flex-wrap items-center gap-1.5">
            {canSettle && (
              <>
                <Button
                  size="sm"
                  variant={outcome.shapeChanged === false ? 'secondary' : 'primary'}
                  isDisabled={busy}
                  onPress={() => void store()}
                >
                  只留样本
                </Button>
                <Button size="sm" variant="danger-soft" isDisabled={busy} onPress={() => void discard()}>
                  丢掉
                </Button>
              </>
            )}
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
        </div>
      )}

      {/* 「留下并把参数记进 git」那条路。表单不在 `Toolbar` 里（方向键的语义），跟着 `canSettle` 走 */}
      {canSettle && endpointLabel !== undefined && <KeepRequestForm endpointLabel={endpointLabel} busy={busy} onKeep={store} />}
    </div>
  )
}
