/**
 * 「类型」栏的第二种看法：**把这一发响应的结构摊成一棵可折可展的树。**
 *
 * ## 为什么它不是「另一种高亮」
 *
 * 同一栏里已经有一份 TypeScript 声明（`outcome.typeSource`，server 侧生成 + shiki 高亮）。
 * 那份是**要抄走的东西** —— 它就是产物里会写进 `packages/response-types/` 的文本。
 * 而这棵树回答的是另一个问题：**「这个响应里有哪些字段、各是什么类型、嵌在哪一层」**。
 *
 * 那两个问题在一份 400 行的声明上是分开的：声明把嵌套摊成了并列的 `type X = {…}` 一串
 * （`Data` / `Card` / `LevelInfo` / … 各自一段），于是「`card.level_info.current_level`
 * 在第几层」得靠人在几段之间来回跳。树把层级还给了结构本身，而且**能收起看不懂的那一支**。
 *
 * 所以这一栏是**两种视图切换**，不是两种配色。
 *
 * ## 数据来自 `payload` 而不是那份声明
 *
 * 声明是一段**文本**，要从里面还原树得写一个 TS 解析器。而 `outcome.payload` 就在手上、
 * 已经是解析好的 JSON —— 字段名与类型直接读得出来。代价是这棵树描述的是
 * **这一发响应的实际形状**（可选字段、联合类型这些「多份样本合起来才看得出」的东西它不知道），
 * 而那恰好与它旁边那份「单独生成」的声明同一个口径（`RecordOutcome.typeSource` 的注释原话：
 * 「它比合并全部样本得出的类型更严」）。两边说的是同一份样本，不会互相打脸。
 *
 * ## `integer` 不是 JS 的类型，但它是这里该说的话
 *
 * `typeof 1 === 'number'`，而这棵树对整数说 `integer`。理由是这个工具的下游是 **JSON Schema
 * 与类型生成**：`packages/typegen` 那侧区分整数与浮点（`openapi.json` 里就是
 * `"type": "integer"`），而人盯着 `"fans": 229806` 时想知道的正是「这是个计数还是个比率」。
 * 只说 `number` 会把那个区别抹掉。
 */

import { Button } from '@heroui/react'
import { useState } from 'react'

import type { JsonValue } from '../lib/api'

// 这个文件除了组件还导出一个纯函数（`typeOf`），于是 fast-refresh 那条规则会响。
// 与 `ParamForm.tsx` 同一条取舍：**能被测**比 HMR 保状态要紧（判据在 `test/viewers.test.ts`）。
// oxlint-disable react/only-export-components

/** 一行。`path` 同时是 React key 与「展开了哪些」那份集合的成员 */
interface TreeNode {
  path: string
  /** 显示出来的名字：对象是键名，数组是下标（`[0]`） */
  label: string
  /** 类型那几个词。判据见文件头最后一段 */
  type: string
  /** 能展开的那些（对象 / 数组）。空容器**不算**可展开 —— 展开之后是一片空白 */
  children?: TreeNode[]
}

/** 这个值该叫什么类型 */
export const typeOf = (value: JsonValue): string => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return `array (${value.length})`
  switch (typeof value) {
    case 'object':
      return 'object'
    case 'number':
      return Number.isInteger(value) ? 'integer' : 'number'
    default:
      return typeof value
  }
}

/**
 * 把一个 JSON 值摊成树。
 *
 * **深度上限 12**：响应里出现过自引用形状（分页游标里套着上一页的请求），而这个函数
 * 一旦遇到那种结构会一直递归下去。12 层之外的那一支只说类型不再往下摊 ——
 * 那比栈溢出后整栏白屏好，而真实响应里最深的一支在 8 层左右。
 */
const treeOf = (value: JsonValue, path: string, label: string, depth = 0): TreeNode => {
  const type = typeOf(value)
  if (depth >= 12) return { path, label, type }
  if (Array.isArray(value)) {
    if (value.length === 0) return { path, label, type }
    return { path, label, type, children: value.map((item, index) => treeOf(item!, `${path}.${index}`, `[${index}]`, depth + 1)) }
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
    if (entries.length === 0) return { path, label, type }
    return { path, label, type, children: entries.map(([key, item]) => treeOf(item!, `${path}.${key}`, key, depth + 1)) }
  }
  return { path, label, type }
}

/**
 * 默认展开哪些：**根，以及根的直接子容器**。
 *
 * 判据是「一屏之内看得见第二层」：只展开根的话人一定要再点一次才看到 `data` 里有什么
 * （而这个仓库的响应几乎全是 `{code, message, data}` 那个壳子，第一层没有信息）；
 * 全展开的话一份 2000 行的响应会摊出几千行，那就退回成了没有折叠的原样。
 */
const defaultOpen = (root: TreeNode): Set<string> => {
  const open = new Set<string>([root.path])
  for (const child of root.children ?? []) if (child.children !== undefined) open.add(child.path)
  return open
}

/** 一行。缩进用左边那条竖线（`border-l`）而不是 padding —— 竖线本身就是层级的可见证据 */
const Row = ({ node, open, onToggle }: { node: TreeNode; open: Set<string>; onToggle: (path: string) => void }) => {
  const expandable = node.children !== undefined
  const isOpen = open.has(node.path)
  return (
    <li className="min-w-0">
      <div className="flex min-w-0 items-center gap-1.5 py-0.5">
        {/* 箭头那一格**恒占位**（不可展开时渲一个等宽的空 span）：一列箭头对齐之后，
            「哪些还能往下看」扫一眼就看得出，而不是靠字段名的缩进去猜 */}
        {expandable ? (
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            className="size-4 min-w-4 shrink-0 rounded-sm font-mono text-[0.625rem] leading-none"
            aria-expanded={isOpen}
            aria-label={`${isOpen ? '收起' : '展开'} ${node.label}`}
            onPress={() => onToggle(node.path)}
          >
            {isOpen ? '▾' : '▸'}
          </Button>
        ) : (
          <span aria-hidden="true" className="size-4 shrink-0" />
        )}
        {/* 字段名那枚小牌子。`accent-soft` 那一档是这套皮肤里「可点的蓝」，
            而这里刻意**不可点** —— 它是标识不是动作，所以没有 hover 态也没有 cursor */}
        <code className="bg-accent-soft text-accent-soft-foreground min-w-0 truncate rounded px-1.5 py-0.5 font-mono text-xs">{node.label}</code>
        <span className="text-muted shrink-0 font-mono text-xs">{node.type}</span>
      </div>
      {expandable && isOpen && (
        <ul className="border-border ml-2 border-l pl-3">
          {node.children!.map((child) => (
            <Row key={child.path} node={child} open={open} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </li>
  )
}

export interface TypeTreeProps {
  /** 这一发响应的值。`undefined` = 还没发过 */
  payload?: JsonValue
}

export const TypeTree = ({ payload }: TypeTreeProps) => {
  const root = payload === undefined ? undefined : treeOf(payload, '$', '响应', 0)
  /**
   * 人手动改过的那份展开集合。**`undefined` 表示「还没动过」** —— 那时用的是
   * {@link defaultOpen} 现算的一份。
   *
   * 为什么不是 `useState(() => defaultOpen(root))`：那样只在**挂载那一帧**算一次，
   * 而挂载时通常还没有 `payload`（这一栏在发请求之前就在版面上）——
   * 于是那份集合会永远是空的，第一发响应回来时整棵树是全收起的。
   * 这个形状顺带给了一件对的行为：连发两次之后人展开过的那几支还开着。
   */
  const [touched, setTouched] = useState<Set<string> | undefined>(undefined)

  if (root === undefined) return <p className="text-muted text-sm">这一份没有响应正文。</p>

  const open = touched ?? defaultOpen(root)

  const toggle = (path: string) =>
    setTouched((previous) => {
      const next = new Set(previous ?? open)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  // `<ul>` / `<li>` 而不是一堆 div：层级真的在结构里，读屏会报「列表，N 项」并能按层跳
  return (
    <ul className="min-w-0">
      <Row node={root} open={open} onToggle={toggle} />
    </ul>
  )
}
