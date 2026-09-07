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

import { Button, Chip, Surface, Toolbar, Tooltip } from '@heroui/react'
import { useLockFn } from 'ahooks'
import { useMemo } from 'react'

import type { RecordOutcome } from '../lib/api'
import { PANE, PANE_BODY, PANE_HEAD, PANE_TITLE } from '../lib/pane'
import { copyableOf, copyToClipboard, KeepRequestForm, type KeptRequest } from './Result'

export interface ResultActionsProps {
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
 * 这一面板的标题 id。`aria-labelledby` 指向可见标题本身，不再抄一遍 `aria-label`。
 *
 * **与正文那格不是一个**：正文与动作是上下两格独立的面板（各有自己的标题行与滚动区），
 * 共用一个 id 会让读屏把两块念成同一个 region。
 */
const ACTIONS_TITLE_ID = 'pane-response-actions-title'

export const ResultActions = ({ outcome, endpointLabel, settled, retryable = false, busy, onStore, onDiscard }: ResultActionsProps) => {
  // 防双击撞 404 的**第二道**闸，也是真正管用的那道：`isDisabled` 要等一次渲染才生效，
  // 同一帧里的两次点击第二次照样发得出去；`useLockFn` 在函数层上锁
  const store = useLockFn(onStore)
  const discard = useLockFn(onDiscard)

  const breaking = outcome?.breaking ?? []
  /** 这份样本还等着人处理。`retryable` 那一支见 {@link ResultActionsProps.retryable} */
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
