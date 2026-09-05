/**
 * 「响应」那一栏：**这一发打回来了什么。**
 *
 * 它顶上那一行就是 Apifox 那排收据（`200 · 312ms · 9.7 KB`）加一枚入库判定，正文是脱敏后的
 * 响应 JSON，靠右是「留下 / 丢掉」与两条复制。
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
 */

import { Button, Chip, Toolbar, Tooltip } from '@heroui/react'
import { useLockFn } from 'ahooks'
import { useMemo } from 'react'

import type { RecordOutcome } from '../lib/api'
import { PANE, PANE_BODY, PANE_CODE, PANE_HEAD, PANE_TITLE } from '../lib/pane'
import { copyableOf, copyToClipboard, KeepRequestForm, type KeptRequest, PayloadPanel, statusOf } from './Result'

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

/** 标题的 id。`aria-labelledby` 指向可见标题本身，不再抄一遍 `aria-label` */
const TITLE_ID = 'pane-response-title'

export const ResponsePane = ({ outcome, endpointLabel, settled, retryable = false, busy, onStore, onDiscard }: ResponsePaneProps) => {
  // 防双击撞 404 的**第二道**闸，也是真正管用的那道：`isDisabled` 要等一次渲染才生效，
  // 同一帧里的两次点击第二次照样发得出去；`useLockFn` 在函数层上锁
  const store = useLockFn(onStore)
  const discard = useLockFn(onDiscard)

  const scrub = outcome?.scrub
  const http = outcome?.http
  const breaking = outcome?.breaking ?? []
  /** 这份样本还等着人处理。`retryable` 那一支见 {@link ResponsePaneProps.retryable} */
  const canSettle = outcome !== undefined && (settled === undefined || retryable) && outcome.pendingId !== undefined
  // 整份正文在这里面拼好（两条最长的加起来几十万字符，而复制是人点出来的），跟着 `outcome` 记一次
  const copyable = useMemo(() => (outcome === undefined ? [] : copyableOf(outcome)), [outcome])

  return (
    <section className={PANE} aria-labelledby={TITLE_ID}>
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

        {/* 动作区靠右。`Toolbar` 而不是裸 div：左右箭头在动作之间移动（react-aria 的
            `useToolbar`），而这一排最多四个控件，读屏也把它念成一组。
            「留下 / 丢掉」只在这份还能处理时出现；两条复制**与处理状态无关**
            （已入库的、被拒的，照样值得把响应捞出来），所以三种状态下都在 ——
            前提是 `copyableOf` 给出了至少一条。四个都没有时整块不渲，不留空 toolbar */}
        {(canSettle || copyable.length > 0) && (
          <Toolbar aria-label="这份结果的动作" className="ml-auto flex shrink-0 items-center gap-1.5">
            {canSettle && (
              <>
                <Button
                  size="sm"
                  variant={outcome?.shapeChanged === false ? 'secondary' : 'primary'}
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
      </div>

      <div className={PANE_BODY}>
        {outcome === undefined ? (
          <p className="text-muted text-sm">左边填参数，按「发送」。</p>
        ) : (
          <>
            {/* 破坏性变更留在版面上（不进 tooltip）：它说的是「下游会编译红」，
                那是这一栏上唯一一件比响应正文更要紧的事 */}
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

            {settled === undefined && outcome.pendingId === undefined && (
              <p className="text-warning-soft-foreground text-xs">这份不能入库（判定拒了，或脱敏有残留）。</p>
            )}
            {settled !== undefined && <p className="text-muted text-xs">{settled}</p>}

            {/* 两个字段都读：`payloadHighlight` 是显示，`payload` 是数据兼回落 */}
            <PayloadPanel payload={outcome.payload} highlight={outcome.payloadHighlight} maxHeight={PANE_CODE} />

            {/* 「留下并记参数」那条路。**挂在正文末尾而不是塞进 `Toolbar`**：那一排的语义是
                「一按就发生」，而这里是两个输入框加一次提交 —— 塞进去会让方向键在输入框里改变含义。
                跟着 `canSettle` 走，于是处理完的那份下面不留一张点了没用的表单 */}
            {canSettle && endpointLabel !== undefined && <KeepRequestForm endpointLabel={endpointLabel} busy={busy} onKeep={store} />}
          </>
        )}
      </div>
    </section>
  )
}
