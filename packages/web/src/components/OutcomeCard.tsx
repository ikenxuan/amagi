/**
 * 一次录制结果的四块面板：判定条、脱敏清单、响应 JSON、类型 diff（含破坏性变更）。
 *
 * 「留下 / 丢掉」两个动作在这里 —— 那正是这个工具存在的理由：
 * **批量录制不等于批量入库**，每一份都得人看过再决定。
 */

import { Alert, Button, Chip, ScrollShadow, Tabs } from '@heroui/react'

import type { DiffLine, RecordOutcome } from '../lib/api'

/**
 * diff 行按增删上色。判据是结构化的 `sign` 而不是子串匹配 ——
 * 手拼 HTML 那版按 `line.includes(' + ')` 猜，正文里含 ` - ` 的行会被误判成删除行。
 */
const diffLineClass = (sign: DiffLine['sign']): string =>
  sign === '+' ? 'text-success-soft-foreground bg-success-soft' : 'text-danger-soft-foreground bg-danger-soft'

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
  onStore: () => void
  onDiscard: () => void
}

export const OutcomeCard = ({ outcome, endpointLabel, settled, busy, onStore, onDiscard }: OutcomeCardProps) => {
  const scrub = outcome.scrub
  const diff = outcome.diff ?? []
  const breaking = outcome.breaking ?? []

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
          <ScrollShadow className="max-h-96">
            <pre className="font-mono text-xs leading-5">{JSON.stringify(outcome.payload ?? null, null, 2).slice(0, 20_000)}</pre>
          </ScrollShadow>
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
          {/* 两个都要 isDisabled：双击「留下」时第二次会撞 `/api/store` 的 404
              （那份待定样本第一次就已经被消费掉了），于是一次成功入库之后弹一条红色报错 */}
          <Button variant={outcome.shapeChanged === false ? 'secondary' : 'primary'} isDisabled={busy} onPress={onStore}>
            留下
          </Button>
          <Button variant="danger-soft" isDisabled={busy} onPress={onDiscard}>
            丢掉
          </Button>
        </div>
      ) : (
        <p className="text-warning-soft-foreground text-sm">这份不能入库（被入库判定拒了，或有脱敏残留）。</p>
      )}
    </div>
  )
}
