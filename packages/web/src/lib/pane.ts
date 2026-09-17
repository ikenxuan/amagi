/**
 * 两栏版面里每一块面板共用的外壳 class。**这个文件是「面板」这个形状的唯一定义处。**
 *
 * 为什么值得单独一个模块：这一轮把版面从「一列卡片往下堆」换成「请求 / 结果 两栏并排」，
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
 * **同一个外壳**：chunk 落地时换掉的只有壳子里的内容，圆角、标题行那条色带、高度都已经在原位
 * （原先那份 `PANEL_SHELL` 是刻意的三份重复，由测试对着读来保证「长得一样」；
 * 现在四处共用一个常量，「长得一样」由构造保证，那条测试判据也就变成读这个文件）。
 *
 * 3. **这一轮把边框整个去掉了**，分界改由底色梯子说 —— 判据写在 {@link PANE} 与
 *    {@link PANE_HEAD} 上，梯子本身写在 `src/index.css` 文件头第 4 条。
 *    栏与栏之间那道缝由一条可拖拽的分隔条占着（`components/SplitLayout.tsx` 的 `SPLIT`）。
 */

/**
 * 一块面板的根。
 *
 * `overflow-hidden` 是给 `rounded-xl` 收边的：正文那层自己带滚动条，不裁一下的话
 * 滚动条会盖在圆角上。
 *
 * **底色与边框都不在这串里** —— 它们由 `<Surface variant="default">` 给
 * （`@heroui/react` 的 `Surface` 渲的就是一个带 `.surface--default` 的 div，
 * 而那个类只有 `bg-surface text-surface-foreground`）。两件事因此变了：
 *
 * 1. **边框去掉了。** 原先是 `border-border … border` 一圈。三栏之间那道 8px 的缝里
 *    露出来的是页面底色（`--background`，深色 0.155），而面板是 `--surface`（0.2103）——
 *    分界由**亮度差**说，边框只是把同一件事再说一遍。少一圈线之后版面安静得多，
 *    而「哪里是一块面板」一个比特都没少。
 * 2. **底色由组件给而不是 `bg-surface` 工具类给。** 差别不在渲出来的 CSS（两者同一个变量），
 *    在于 `Surface` 同时向下提供 `SurfaceContext`（`components/surface/surface.js`）——
 *    3.2.4 里还没有组件去读它（`use(SurfaceContext)` 全仓 0 处，只有 Card / Select /
 *    Popover 那几个往下**提供**），但上游一旦让控件按「我坐在哪种 surface 上」自选对比度，
 *    走组件这条路的面板会自动跟上，而写死一个工具类的不会。
 *
 * 用法是 `render` 那条口子（HeroUI 的 composition 文档点名的做法），
 * 于是 `<section>` / `<nav>` 这些地标标签一个都不用换成 div：
 *
 * ```tsx
 * <Surface className={PANE} aria-labelledby={TITLE_ID} render={(props) => <section {...props} />}>
 * ```
 */
export const PANE = 'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl'

/**
 * 面板的标题行：标题 + 几枚计数 Chip + 靠右的动作。**不滚**（见文件头第 2 条）。
 *
 * **分界由底色而不是 `border-b` 说**：`bg-surface-secondary` 比面板正文的 `--surface`
 * 亮一档（深色 0.257 vs 0.2103，浅色 0.9524 vs 纯白），于是标题行自己就是一条色带 ——
 * 那比一条 1px 的线更能说明「这一行是钉住的、下面那片才是滚的」，而且少一条线。
 * 梯子是 HeroUI 现成的那条，这一轮只是去用它（`src/index.css` 文件头第 4 条）。
 *
 * ## `h-14` 是写死的，而那是在修一个真的视觉 bug
 *
 * 原先高度**由内容决定**，于是三栏的标题行三个高度 —— 实测（`xiaohongshu/emojiList`）：
 * 请求 **56px**、响应 **36px**、类型 **56px**。差在那一行里最高的那个孩子上：
 * `Tabs.List` 是 `p-1` 包着 `h-8` 的 tab（`@heroui/styles` 的 `tabs.css:105` 与 `:124`）
 * = 40px，而响应那栏只有一个 `<h2>`（20px）。发过一发之后它又变成第三个高度
 * （`Button size="sm"` 是 `h-9 md:h-8`）。三栏并排时这 20px 的错位一眼就看得见，
 * 而它让人以为三栏不是同一层东西。
 *
 * 所以高度不再让内容决定：`h-14` = 56px，正是「tab 那一档」本来的高度 ——
 * 取这个值是为了让本来就对的那两栏一个像素都不动。
 *
 * **`flex-nowrap` 是同一件事的另一半**：原先是 `flex-wrap`，响应那栏东西一多就换行、
 * 把标题行顶成两倍高。现在挤不下的靠 `min-w-0` + `truncate` 收（那几处自己带），
 * 而真正挤不下的东西（保存 / 丢掉 / 复制）搬去了「样本处理」栏那一格 ——
 * 那是标题行能有固定高度的前提，判据在 `SamplePane.tsx` 文件头。
 */
export const PANE_HEAD = 'bg-surface-secondary flex h-14 min-w-0 shrink-0 flex-nowrap items-center gap-2 px-3'

/** 面板正文：**自己滚的那一层**。`min-h-0` 见文件头第 1 条 */
export const PANE_BODY = 'flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3'

/**
 * 面板正文的另一档：**正文自己不滚，让里面那一块去滚。**
 *
 * 读者是「结果」栏里装代码块的那两页（响应 / 声明）：那两页里只有一样东西
 * （一个自带滚动的代码块），而两层都 `overflow-y-auto` 的后果是**两个滚动条套在一起** ——
 * 外层先滚到底、里层才开始动，鼠标滚轮在边界上会卡一下。
 *
 * 所以差别只有 `overflow-hidden` 那一个词，而它必须与「里面那块用 `fill`」成对出现
 * （`CodeBlock` / `PayloadPanel` 的 `fill`）：里面那块不 `flex-1` 的话，
 * 这一层不滚就等于把超出的部分直接裁掉。
 */
export const PANE_BODY_TIGHT = 'flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-3'

/**
 * 面板标题的字号。
 *
 * 两栏的标题**全是同一档**（`text-sm font-semibold`）：它们在信息层级上真的是同级的
 * 两个问题（拿什么参数打、打回来的是什么），谁比谁大都是假的层级。
 * 语义上的层级由 `<h2>` + `aria-labelledby` 给，不由字号给。
 */
export const PANE_TITLE = 'shrink-0 text-sm font-semibold'

/**
 * 懒加载那三块面板（`RequestTable` / `ComparePanel` / `GeneratedPanel`）的根。
 *
 * 它们原先各自带一圈 `rounded-2xl border p-4` —— 那是「面板自己就是一张卡片」的时代。
 * 现在它们住在别的面板的正文里（集合在请求栏的抽屉里、对比与已提交在结果栏的仓库抽屉里），
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
