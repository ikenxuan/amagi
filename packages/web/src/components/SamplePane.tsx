/**
 * 「样本处理」那一栏：**这份响应能不能保存？能的话，样本与可重放参数分别怎么处理。**
 *
 * ## 为什么是一块独立面板而不是结果栏底下的一条带
 *
 * 原先它是「结果」栏 footer 里的一条动作带（`ResultActions.tsx`，已删）。两栏重排之后
 * 它有了自己 30% 的一格（响应 70% / 样本处理 30%，`App.tsx` 的嵌套 result stack）：
 * 长诊断不再挤占响应的阅读空间，这一格自己滚、自己能被拉高。**空态也是版面** ——
 * 首发之前它就占着那 30%（一句提示、零颗死按钮），响应回来时整块不跳。
 *
 * ## 三档内容
 *
 * 1. **空态**（还没有结果）：一句「发送请求后，在这里决定是否保存样本。」
 * 2. **可保存**：证据 Chip（判定 / 脱敏 / 新形状 / 已截断）+ 两条互斥路径
 *    （`只保存样本` 一键；`保存并共享参数` 折着的 label-only 表单）+ `丢掉` + 两条复制。
 *    共享参数只填一句中文说明 —— 身份是 server 从真值参数算的 `paramsHash`，人手上没有。
 * 3. **不可保存**：常驻**摘要**（结论、平台状态、计数、首项、一句「下一步」），
 *    全部脱敏残留按 `kind` 分组收进 `<details>`，「复制详情」给未截断的全文。
 *
 * ## 业务判定与落盘安全检查分开表达
 *
 * `status_code=0` 的平台正常响应也会被脱敏残留拦下 —— 那时 `verdict.kind` 是内部词
 * `store`，直接端上来会被读成「平台判定失败」。所以摘要里**永不显示 `verdict.kind` 原词**：
 * `store` 说成「平台响应正常 · {reason}」，`reject` 说成「平台判定拒绝 · {reason}」。
 *
 * ## 提示字的规则（与 `ResultPane.tsx` 文件头同一条）
 *
 * 常驻的说明文字只许留**会改变下一步动作**的：破坏性变更清单、「不能保存样本」+ 原因、
 * 「建议丢掉」。讲原理的一律 tooltip / `FieldError`。
 */

import { Button, Chip, Surface, Toolbar, Tooltip } from '@heroui/react'
import { useLockFn } from 'ahooks'
import { useMemo } from 'react'

import type { RecordOutcome, StoreOptions } from '../lib/api'
import type { ScrubFinding } from '../../shared/contract'
import { PANE, PANE_BODY, PANE_HEAD, PANE_TITLE } from '../lib/pane'
import { copyableOf, copyToClipboard, type PayloadView, ShareParamsForm, statusOf, trimmedChipLabel } from './Result'

// 这个文件除了组件还导出两个纯函数（`groupFindings` / `diagnosticCopyText`）——
// 与 `Result.tsx` 文件头那条 oxlint-disable 同一个理由：**能被测比 HMR 保状态要紧**。
// oxlint-disable react/only-export-components

const TITLE_ID = 'pane-sample-title'

/** `kind` 的展示顺序。契约那个联合的顺序（`shared/contract.ts` 的 `ScrubFinding.kind`） */
const FINDING_KINDS = ['id', 'name', 'url', 'token', 'phone', 'timestamp', 'redact'] as const

/** 按 `kind` 归拢之后的一组残留 —— 顺序固定在 {@link FINDING_KINDS}，空组不出 */
export interface FindingGroup {
  kind: ScrubFinding['kind']
  items: ScrubFinding[]
}

/**
 * 把结构化残留按 `kind` 分组。**只读 `kind` 与 `path`，一个字都不解析 `reason`** ——
 * 与 `groupDiffByFile` 对 `text` 的那条纪律同一条：文案是 server 的事，按它猜就会跟着烂。
 */
export const groupFindings = (items: ScrubFinding[]): FindingGroup[] =>
  FINDING_KINDS.map((kind) => ({ kind, items: items.filter((item) => item.kind === kind) })).filter((group) => group.items.length > 0)

/**
 * 「复制详情」复制出去的正文：**全部**路径与原因，不受任何窗口限制，永不含原始敏感值
 * （scrub 数据里本来就只有路径与规则描述 —— 含值的那一侧是响应正文，不在这份输入里）。
 *
 * 结构化（`leakItems`）按 {@link groupFindings} 分组给全；旧 server 只有字符串时**原样逐行**，
 * 不机器解析旧文案去猜 kind（猜出来的分组是假的，比没有更糟）。
 */
export const diagnosticCopyText = (scrub: NonNullable<RecordOutcome['scrub']>): string => {
  const items = scrub.leakItems
  if (items !== undefined && items.length > 0) {
    return groupFindings(items)
      .map((group) => [`${group.kind} · ${group.items.length} 处`, ...group.items.map((item) => `${item.path} —— ${item.reason}`)].join('\n'))
      .join('\n\n')
  }
  return scrub.leaks.join('\n')
}

export interface SamplePaneProps {
  /** 当前看的那一份结果。`undefined` = 还没发过 —— 空态是这一栏的第一档 */
  outcome?: RecordOutcome
  /**
   * 「响应」页当前显示哪一份（原始 / 样本）。复制按钮跟着它走 —— 状态在 `App`
   * （`ResultPane` 的切换控件与这里的复制共享同一份），这一栏只消费
   */
  payloadView: PayloadView
  /**
   * 这一份属于哪个端点（`平台/端点`）。不标出来，点「保存」时会认错端点 ——
   * 结果不随切端点清空，显示的那份可能不是左栏当前选中的那个。
   */
  endpointLabel?: string
  /** 已经处理过（入库或丢弃）时那句收据 */
  settled?: string
  /**
   * 收据在，但这份样本**在 server 那边还留着**，所以「保存 / 丢掉」不许收走。
   * 判据必须与 `server/index.ts` 那个 `if` 逐字对齐：server 留着条目 ⇒ 这里留着按钮。
   */
  retryable?: boolean
  /** 有动作在跑。两个入库动作都要禁 —— 双击「保存」会让第二次撞 404 */
  busy: boolean
  /**
   * 入库。**显式 mode**：`{ mode: 'sample-only' }` 或 `{ mode: 'sample-and-params', label }` ——
   * 不再靠「有没有 id」猜动作（`shared/contract.ts` 的 `StoreOptions`）。
   * 必须返回 Promise（`useLockFn` 靠 `await` 才知道动作何时结束）
   */
  onStore: (options: StoreOptions) => Promise<void>
  onDiscard: () => Promise<void>
}

export const SamplePane = ({ outcome, payloadView, endpointLabel, settled, retryable = false, busy, onStore, onDiscard }: SamplePaneProps) => {
  // 防双击撞 404 的**第二道**闸：`isDisabled` 要等一次渲染才生效，`useLockFn` 在函数层上锁
  const store = useLockFn(onStore)
  const discard = useLockFn(onDiscard)

  const breaking = outcome?.breaking ?? []
  const scrub = outcome?.scrub
  /** 这份样本还等着人处理。`retryable` 那一支见 {@link SamplePaneProps.retryable} */
  const canSettle = outcome !== undefined && (settled === undefined || retryable) && outcome.pendingId !== undefined
  // 整份正文在这里面拼好（两条最长的加起来几十万字符，而复制是人点出来的），跟着 `outcome` 记一次。
  // `payloadView` 一起进依赖：切换那一档换的是复制出去的**另一份**正文，memo 不跟着变会复制错份
  const copyable = useMemo(() => (outcome === undefined ? [] : copyableOf(outcome, payloadView)), [outcome, payloadView])
  const trimmed = outcome?.payloadTrimmed ?? []
  /** 不可保存那一份的脱敏残留：结构化优先，旧 server 的字符串照样逐行可读（不解析文案） */
  const leakItems = scrub?.leakItems
  const leaks = scrub?.leaks ?? []
  const structured = leakItems !== undefined && leakItems.length > 0
  const leakCount = structured ? leakItems.length : leaks.length

  return (
    <Surface className={PANE} aria-labelledby={TITLE_ID} render={(props) => <section {...props} />}>
      <div className={PANE_HEAD}>
        <h2 className={PANE_TITLE} id={TITLE_ID}>
          样本处理
        </h2>
      </div>

      {outcome === undefined ? (
        /* 空态即版面：首发之前这一格就占着 30%，一句提示、零颗死按钮 */
        <div className={PANE_BODY}>
          <p className="text-muted text-sm">发送请求后，在这里决定是否保存样本。</p>
        </div>
      ) : (
        <div className={PANE_BODY}>
          {/* 破坏性变更留在版面上（不进 tooltip）：它说的是「下游会编译红」，
              那是这一栏里唯一一件比按钮更要紧的事 */}
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

          {settled === undefined && outcome.pendingId === undefined && (
            <div className="flex min-w-0 flex-col gap-2 text-xs">
              {outcome.verdict.kind === 'compute' ? (
                <>
                  <p className="text-warning-soft-foreground">这个端点不用录样本。</p>
                  <p className="text-muted">
                    上面那段就是算出来的值，「声明」那一页就是它的形状 —— 两样都不必进 corpus。
                  </p>
                </>
              ) : (
                <>
                  {/* 常驻摘要：结论 + 平台状态 + 计数 + 首项 + 一句「下一步」。
                      **内部判定词永不端上来**（`store` 会被读成平台判定失败），见文件头 */}
                  <p className="text-warning-soft-foreground">不能保存样本</p>
                  <p className="font-mono break-words">
                    {outcome.verdict.kind === 'store' ? '平台响应正常' : outcome.verdict.kind === 'reject' ? '平台判定拒绝' : '平台判定'} ·{' '}
                    {outcome.verdict.reason}
                    {outcome.message !== undefined && ` —— ${outcome.message}`}
                  </p>
                  {leakCount > 0 && (
                    <>
                      <p>脱敏检查发现 {leakCount} 处残留；修复规则后重新发送。</p>
                      {structured && <p className="font-mono break-words">首项：{leakItems[0]!.path}</p>}
                      <div className="flex flex-wrap items-center gap-2">
                        <details className="min-w-0">
                          <summary className="cursor-pointer">查看全部 {leakCount} 处</summary>
                          {structured ? (
                            <div className="mt-2 flex min-w-0 flex-col gap-2">
                              {groupFindings(leakItems).map((group) => (
                                <section key={group.kind}>
                                  <h3 className="text-muted tabular-nums">
                                    {group.kind} · {group.items.length}
                                  </h3>
                                  <ul className="font-mono break-words">
                                    {group.items.map((item) => (
                                      <li key={`${item.kind}:${item.path}`}>
                                        {item.path} —— {item.reason}
                                      </li>
                                    ))}
                                  </ul>
                                </section>
                              ))}
                            </div>
                          ) : (
                            /* 旧 server 的字符串**原样逐行**，不机器解析旧文案去猜 kind */
                            <ul className="mt-2 font-mono break-words">
                              {leaks.map((leak) => (
                                <li key={leak}>{leak}</li>
                              ))}
                            </ul>
                          )}
                        </details>
                        <Button
                          size="sm"
                          variant="tertiary"
                          onPress={() =>
                            void copyToClipboard({
                              id: 'copy-diagnostics',
                              label: `脱敏诊断（全部 ${leakCount} 处）`,
                              text: diagnosticCopyText(scrub!)
                            })
                          }
                        >
                          复制详情
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {(canSettle || copyable.length > 0) && (
            // 一行：证据（Chip）→ 决定（Toolbar）→ 这份属于谁。挤不下自然换行
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {/* 收据是**持续的状态**（这份已经入库了 / 已经丢了），跟着这一栏走 */}
              {settled !== undefined && (
                <Chip size="sm" variant="soft" color={retryable ? 'warning' : 'success'}>
                  <Chip.Label>{settled}</Chip.Label>
                </Chip>
              )}
              {/* 判定。Chip 上只有那一个词，理由进 tooltip；`confident === false` 那档必须看得见。
                  **只在可保存时出现**：不可保存那一份的判定由上面的摘要分开说（内部词不上版面） */}
              {outcome.pendingId !== undefined && (
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
                  有人在版面上说出来。一句话怎么拼在 `trimmedChipLabel`，明细全在 tooltip */}
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
                  复制不跟着 `busy` 禁：它一发请求都不打（按钮上的量进 tooltip） */}
              <Toolbar aria-label="这份结果的动作" className="flex min-w-0 flex-wrap items-center gap-1.5">
                {canSettle && (
                  <>
                    <Button
                      size="sm"
                      variant={outcome.shapeChanged === false ? 'secondary' : 'primary'}
                      isDisabled={busy}
                      onPress={() => void store({ mode: 'sample-only' })}
                    >
                      只保存样本
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

          {/* 「保存并共享参数」那条路。表单不在 `Toolbar` 里（方向键的语义），跟着 `canSettle` 走。
              只填一句说明 —— 身份是 server 从真值参数算的哈希，人手上没有也不需要 */}
          {canSettle && endpointLabel !== undefined && (
            <ShareParamsForm endpointLabel={endpointLabel} busy={busy} onKeep={(label) => store({ mode: 'sample-and-params', label })} />
          )}
        </div>
      )}
    </Surface>
  )
}
