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
 * `<summary>` 里任何点击都触发开合（HTML 规定），把「留下 / 丢掉」放进去的话点「留下」
 * 会先把表单展开。所以按钮坐工具条、只有记参数那张表单是 `<details>` —— 它折着也一直在
 * DOM 里，`renderToStaticMarkup` 渲得到（`test/` 那条路靠的正是这个）。
 *
 * ## 三枚 Chip 搬进来了（原先在「响应」栏的标题行）
 *
 * 判定 / 脱敏有残留 / 新形状 —— `h-14` 的标题行装不下四枚 tab + 收据 + 按钮，而这三枚
 * 恰恰都是「这份该不该留」的证据：它们与「留下 / 丢掉」说的是同一件事，该住在一起。
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
import { copyableOf, copyToClipboard, KeepRequestForm, type KeptRequest, statusOf } from './Result'

export interface ResultActionsProps {
  /** 这一份结果。调用方（ResultPane）保证只在有结果时渲这一条 */
  outcome: RecordOutcome
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

export const ResultActions = ({ outcome, endpointLabel, settled, retryable = false, busy, onStore, onDiscard }: ResultActionsProps) => {
  // 防双击撞 404 的**第二道**闸：`isDisabled` 要等一次渲染才生效，`useLockFn` 在函数层上锁
  const store = useLockFn(onStore)
  const discard = useLockFn(onDiscard)

  const breaking = outcome.breaking ?? []
  const scrub = outcome.scrub
  /** 这份样本还等着人处理。`retryable` 那一支见 {@link ResultActionsProps.retryable} */
  const canSettle = (settled === undefined || retryable) && outcome.pendingId !== undefined
  // 整份正文在这里面拼好（两条最长的加起来几十万字符，而复制是人点出来的），跟着 `outcome` 记一次
  const copyable = useMemo(() => copyableOf(outcome), [outcome])

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
          {endpointLabel !== undefined && <span className="text-muted ml-auto min-w-0 truncate font-mono text-xs">{endpointLabel}</span>}
          {/* `Toolbar` 而不是裸 div：左右箭头在动作之间移动，读屏把它念成一组。
              复制不跟着 `busy` 禁：它一发请求都不打（按钮上的量进 tooltip，判据同旧版） */}
          <Toolbar aria-label="这份结果的动作" className="flex min-w-0 flex-wrap items-center gap-1.5">
            {canSettle && (
              <>
                <Button size="sm" variant={outcome.shapeChanged === false ? 'secondary' : 'primary'} isDisabled={busy} onPress={() => void store()}>
                  留下
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

      {/* 「留下并记参数」那条路。表单不在 `Toolbar` 里（方向键的语义），跟着 `canSettle` 走 */}
      {canSettle && endpointLabel !== undefined && <KeepRequestForm endpointLabel={endpointLabel} busy={busy} onKeep={store} />}
    </div>
  )
}
