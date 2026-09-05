/**
 * 左栏底下那一条「最近」：**这一轮发过的每一发各占一行。**
 *
 * 它替掉的是原先那个「待定队列」—— 一份结果一张 `OutcomeCard`，竖着堆在右栏里。
 * 批量录 24 组之后那一列有几十屏高，而人一次只看一份。
 * 现在「哪一份」是一次**选择**（这一栏），「那一份长什么样」是**三栏的内容** ——
 * 与左栏选端点是同一种关系，所以它摆在左栏、也用同一个 `ListBox`。
 *
 * 每行只有三件事：判定（一枚色点）、`平台/端点`、以及处理状态。
 * **`平台/端点` 不能省**：结果刻意不随切端点清空（否则批量录完剩下的待定样本再也碰不到），
 * 于是这份清单里会混着好几个端点的行。
 *
 * ## 为什么是色点而不是文字判定
 *
 * 这一栏只有 16rem 宽，而端点名（`videoComments`）本身就要一半。
 * 判定在这里要回答的问题只有一个 —— **「这一发有没有出事」**，那是一个三档的量
 * （成功 / 不能入库 / 被拒），色点够了；`verdict.kind` 那个词在响应栏的标题行上。
 * **色点不是唯一的通道**：`aria-label` 把那个词念出来，而 `title` 让鼠标也拿得到 ——
 * 只靠颜色传达状态是 WCAG 1.4.1 明确禁掉的那件事。
 */

import { ListBox } from '@heroui/react'

import type { RecordOutcome } from '../lib/api'
import { statusOf } from './Result'

/**
 * 清单里的一行。**结构性地由 `App.tsx` 的 `QueueItem` 满足** —— 不从那边 import 类型，
 * 免得这个组件反过来依赖版面那一层。
 */
export interface HistoryEntry {
  /** React key，也是选中态那个键 */
  key: string
  platform: string
  endpoint: string
  outcome: RecordOutcome
  /** 已经处理过（入库 / 丢弃）时那句收据。有它 ⇒ 这一行不再等人做决定 */
  settled?: string
}

/** 三档判定各自那颗点的颜色。取值与 `statusOf` 的三档一一对应 */
const DOT: Record<'success' | 'warning' | 'danger', string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger'
}

/** 那颗点该念成什么。与颜色同一个来源，所以不会走散 */
const DOT_LABEL: Record<'success' | 'warning' | 'danger', string> = {
  success: '可入库',
  warning: '不能入库',
  danger: '判定拒掉'
}

export interface HistoryListProps {
  items: readonly HistoryEntry[]
  /** 当前在右边三栏里显示的那一行 */
  selectedKey?: string
  onSelect: (key: string) => void
}

export const HistoryList = ({ items, selectedKey, onSelect }: HistoryListProps) => (
  <ListBox
    aria-label="这一轮发过的请求"
    selectionMode="single"
    selectedKeys={selectedKey === undefined ? [] : [selectedKey]}
    onSelectionChange={(keys) => {
      const key = [...(keys as Set<string>)][0]
      if (key !== undefined) onSelect(key)
    }}
  >
    {items.map((item) => {
      const status = statusOf(item.outcome)
      return (
        <ListBox.Item key={item.key} id={item.key} textValue={`${item.platform}/${item.endpoint}`}>
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span aria-label={DOT_LABEL[status]} title={DOT_LABEL[status]} className={`size-1.5 shrink-0 rounded-full ${DOT[status]}`} />
            <span className="min-w-0 truncate font-mono text-xs">
              {item.platform}/{item.endpoint}
            </span>
            {/* 处理过的那些淡出去但**不消失**：它们是「我刚才做了什么」的唯一痕迹，
                而收据那句话在响应栏里 —— 这里只标一下「已经处理过了」 */}
            {item.settled !== undefined && <span className="text-muted ml-auto shrink-0 text-xs">✓</span>}
            {item.settled === undefined && item.outcome.shapeChanged === true && (
              <span className="text-accent ml-auto shrink-0 text-xs" title="带来了新形状">
                ＋
              </span>
            )}
          </span>
        </ListBox.Item>
      )
    })}
  </ListBox>
)
