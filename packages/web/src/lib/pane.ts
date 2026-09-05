/**
 * 三栏版面里每一块面板共用的外壳 class。**这个文件是「面板」这个形状的唯一定义处。**
 *
 * 为什么值得单独一个模块：这一轮把版面从「一列卡片往下堆」换成「参数 / 响应 / 类型 三栏并排」，
 * 而那件事成立的**全部条件**就在这几个字符串里 ——
 *
 * 1. `PANE` 上的 `min-h-0` 与 `PANE_BODY` 上的 `flex-1 overflow-y-auto`：
 *    **每一栏自己滚，页面本身不滚。** 这是原先那个「往下滚很久都滚不到底」的直接解药。
 *    flex 子项的默认 `min-height: auto` 会让它被内容顶高、把 `overflow` 挤成无效，
 *    所以 `min-h-0` 不是保险而是必需 —— 少一处，那一栏就会把整页撑长。
 * 2. `PANE_HEAD` 上的 `shrink-0`：标题与动作那一行**永远在视野里**，滚的只有正文。
 *    响应有一万行时「留下 / 丢掉」还在原地，那两颗按钮才是这个工具要人做的决定。
 *
 * 抽成常量而不是每处手写，是因为 `App.tsx` 里那几个 `Suspense` 的 fallback 必须与真面板
 * **同一个外壳**：chunk 落地时换掉的只有边框里的内容，边框、圆角、高度都已经在原位
 * （原先那份 `PANEL_SHELL` 是刻意的三份重复，由测试对着读来保证「长得一样」；
 * 现在四处共用一个常量，「长得一样」由构造保证，那条测试判据也就变成读这个文件）。
 */

/**
 * 一块面板的根。
 *
 * `overflow-hidden` 是给 `rounded-xl` 收边的：正文那层自己带滚动条，不裁一下的话
 * 滚动条会盖在圆角上。`bg-surface` / `border-border` 全走 HeroUI 的主题变量，
 * 与 `Card` 用的是同一组（`@heroui/styles` 的 `card.css:4-7`）—— 换肤时跟着走。
 */
export const PANE = 'border-border bg-surface flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border'

/** 面板的标题行：标题 + 几枚计数 Chip + 靠右的动作。**不滚**（见文件头第 2 条） */
export const PANE_HEAD = 'border-border flex min-w-0 shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2'

/** 面板正文：**自己滚的那一层**。`min-h-0` 见文件头第 1 条 */
export const PANE_BODY = 'flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3'

/**
 * 面板标题的字号。
 *
 * 三栏的标题**全是同一档**（`text-sm font-semibold`）：它们在信息层级上真的是同级的
 * 三个问题（拿什么参数打、打回来什么、这形状是什么类型），谁比谁大都是假的层级。
 * 语义上的层级由 `<h2>` + `aria-labelledby` 给，不由字号给。
 */
export const PANE_TITLE = 'shrink-0 text-sm font-semibold'

/**
 * 懒加载那三块面板（`RequestTable` / `ComparePanel` / `GeneratedPanel`）的根。
 *
 * 它们原先各自带一圈 `rounded-2xl border p-4` —— 那是「面板自己就是一张卡片」的时代。
 * 现在它们住在别的面板的正文里（集合在请求栏、对比与已有类型在类型栏的 tab 里），
 * 再套一圈边框就是边框套边框。所以根节点只留纵向布局，边界由外面那块 {@link PANE} 给。
 */
export const PANE_INNER = 'flex min-w-0 flex-col gap-3'

/**
 * 面板里那些代码块（响应 JSON、类型声明、diff）的高度上限。
 *
 * **按视口算，不用 `h-full`。** `h-full` 要一路上每一层都有确定高度，而这些代码块外面
 * 隔着 `Tabs.Panel`、`<details>`、`Alert` 这些高度由内容决定的东西 —— 少一层就退化成 0 高。
 * 按视口减掉「顶栏 + 面板标题行 + 内边距」这个常数量，代价是它与那几处的高度**耦合了一个估值**：
 * 顶栏变高时这里会多留一点空白，而不会溢出（差的那点由 {@link PANE_BODY} 自己滚掉）。
 *
 * 上限本身不能去掉：它是「这一栏自己滚」这件事在代码块这一层的落点，
 * 而代码块内容的量级是几万字符（完整判据在 `CodeBlock.tsx` 文件头）。
 */
export const PANE_CODE = 'max-h-[calc(100vh-12rem)]'
