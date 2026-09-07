# web 控制台：两栏重排（合并响应与类型）设计

日期：2026-09-07 · 分支：`refactor-v7` · 状态：已与用户逐节确认

## 背景与问题

三栏控制台（`e510540`）落地后暴露四件事：

1. **响应栏与类型栏分立浪费空间** —— 两栏各占 1fr，但「类型」栏四页里只有「本次」
   说的是这一发请求，另外三页（`已提交` / `diff` / `对比`）说的是仓库。
2. **请求栏没地方放参数** —— 22rem 的宽度下，参数多的端点（B 站 `comments`，7 个参数）
   候选值那排按钮必然换行。
3. **新手操作成本高** —— 六个平铺的信息区，主循环（「打一发 → 看响应 → 这份留不留」）
   里的东西和查参考的东西混在同一层级。
4. **提示字过多** —— 版面常驻说明文字 14 处，其中 4 处是几乎同义的空状态引导。

**一条明确收回的事**：`e04787e` 的头条「响应体与它的类型声明同屏」不再成立 ——
两者变成同一栏的两个 tab，一次只见一个。换来的是请求栏 +6rem、结果栏从 ~1/3 屏宽变
~1/2 屏宽（代码块一行多装约 40 字符）。这不是 bug，是这一轮的交换。

## 四个岔口的裁决

| 岔口 | 裁决 | 一句话理由 |
|---|---|---|
| A：合并栏里装什么 | **A3** 四 tab + 仓库抽屉 | 判据是「这一页在不在主循环里」：`diff` 是「留不留」的依据，留栏内；`已提交`/`对比` 是查参考，进抽屉 |
| B：动作区怎么摆 | **B3 修正版** 永远可见的工具条 + 小 `<details>` | 决定永远在视野里；但按钮不能坐 `<summary>`（见下） |
| C：提示字按什么规则砍 | **C1，以 C3 去重为前置** | 判据是「这句话改不改变我下一步做什么」 |
| S：代码以哪个文件为种子 | **S3** `TypePane.tsx` 改名 `ResultPane.tsx` | tab 机制与三处懒加载边界已在那个文件里，一行不用动地平移 |

## 版面骨架

三档宽度（`src/lib/viewport.ts` 是全仓唯一在 JS 里读断点的地方）：

| 档 | 界限 | 摆法 |
|---|---|---|
| `columns` | **≥ 80rem（`xl`，原 96rem）** | 请求栏 28rem + 结果栏 `1fr`，拖宽度 |
| `rows` | 64–80rem | 两行均分，各自滚，拖高度 |
| `stack` | < 64rem | 不锁高度，页面照常滚，无分隔条 |

**断点从 96rem 降到 80rem 是本轮的一部分**：96rem 那道门槛的理由（「凑不够
3 × 22rem 时并排比上下堆更糟」，`viewport.ts` 文件头）随第三栏消失而不成立；
两栏在 1280px（普通笔记本宽度，新手最可能在的地方）就摆得下。改三处：
`viewport.ts` 的 `WIDE` 96rem→80rem、`PaneShell` 的 `2xl:` 前缀换 `xl:`、
`appLayout.test.ts` 两个断言串。`<main>` 的 `lg:h-screen` 不动（64rem 管锁高度，与此无关）。

常量改动（两份必须逐字对齐 —— 「chunk 落地时版面不跳」）：

- `PaneShell.tsx`：`2xl:grid-cols-[22rem_minmax(0,1fr)_minmax(0,1fr)]` →
  `xl:grid-cols-[28rem_minmax(0,1fr)]`；`grid-rows-3` → `grid-rows-2`
- `SplitLayout.tsx`：`defaultSize={orientation === 'horizontal' && index === 0 ? '22rem' : undefined}` →
  同式换 `'28rem'`
- `minSize` 横排仍 18rem、竖排仍 5rem，不动

**28rem 的依据**：22rem 下候选值那排（`换成种子里的：` + N 颗按钮）必然换行，
28rem 让两颗短按钮同排。这是默认值，拖得动。

**footer 机制整个删除**：`SplitPane.footer`、`StaticColumn`/`SplitColumn` 里 footer
那两支、响应栏里那条竖切 `Group`。`SplitPane` 退化为 `{ id, node }`。代价是
「动作格高度可拖」这个能力没了；换回少一份尺寸账、少一条分隔条。
`appLayout.test.ts` 里钉 footer 的断言跟着删。

## 结果栏内部（`ResultPane.tsx`）

一块 `Surface`：`h-14` 标题行（`PANE_HEAD` 不变）+ tab 正文 + 动作条。

**标题行**，从左到右：

```
[响应] [声明] [结构] [diff·N]      200 · 312ms · 9.7KB   [仓库 ▸]
```

- tab 条替掉可见标题；`<h2>` 不删（`aria-labelledby` 指着它），改 `sr-only`。
- 收据（状态码·耗时·体积）留标题行 `ml-auto` —— 它说的是整发请求，不随 tab 动。
- 「仓库」抽屉触发按钮在最右，与「集合」那颗逐字同构（按钮 + 计数 Chip）。
- **判定 / 脱敏 / `新形状` 三枚 Chip 从标题行搬去动作条** —— `h-14` 装不下，
  且它们都是「这份该不该留」的证据，属于动作条。

**四个 tab 与滚动契约**（class 落在**每个 `Tabs.Panel` 上**，不是外面共用的
div —— 这是与今天唯一不同的结构；两种混用是必须的，代码块自带滚动套两层会在
边界卡一下）：

| tab | Panel class | 装什么 |
|---|---|---|
| 响应 | `PANE_BODY_TIGHT` | `JsonViewer`（lazy）/ `PayloadPanel` 回落，`fill` |
| 声明 | `PANE_BODY_TIGHT` | `CodeBlock code={typeSource} fill` —— **行为改动**：从 `maxHeight={PANE_CODE}` 改 `fill`，高度由格子决定 |
| 结构 | `PANE_BODY` | `TypeTree` |
| diff | `PANE_BODY` | `DiffPanel maxHeight={PANE_CODE}` —— `PANE_CODE` 只剩这一个读者 |

「结构」保留平级 tab 而不收回 toggle：它与「声明」是同级的两种看法
（`TypeTree.tsx` 文件头判据成立）。tab 不进 URL：`defaultSelectedKey="response"` +
切端点重挂，与今天 `TypePane` 同款。

**空状态**：`outcome === undefined` 时整个 tab 区渲一句「左边填参数，按『发送』。」
（四个 tab 共用，不进 `Tabs`）。其余三句同义空状态全删；`TypeTree` 内部
`payload` 真为空对象那一档的兜底保留。

**动作条**（`shrink-0`，高度由内容决定，`max-h-64 overflow-y-auto` 封顶）：

```
[ok] [脱敏有残留] [新形状]   留下  丢掉  复制JSON  复制diff   [顺便记下这组参数 ▾]
                                                             ↑ 唯一的 <details> summary
展开后：KeepRequestForm（本就是原生 <details>，只是提一层）
```

**实现要点（B3 修正的原因）**：原生 `<details>` 里 `<summary>` 内任何点击都触发
开合，所以「留下 / 丢掉 / 复制」**不能**坐 `<summary>`。工具条永远可见 =
B3「决定永远在视野里」；只有记参数表单走 `<details>` —— 测试
（`renderToStaticMarkup` 仍能读到表单）一条不破。破坏性变更清单、「这份不能入库」
+ 原因、「建议丢掉」留在收起态就可见（它们改变下一步）。

**文件**：

- `ResultPane.tsx` = `TypePane.tsx` 改名 + 四 tab 结构（两条 lazy 边界
  `ComparePanel`/`GeneratedPanel` 平移去 RepoDrawer）
- `ResultActions.tsx` = 今天 `ResponseActions` 搬出 + 三枚 Chip；`ResponsePane.tsx` 删
- `RepoDrawer.tsx`（新）：`已提交` / `对比` 两页，内部 `Tabs`，`max-w-5xl`
  （与 `CollectionDrawer` 同档 —— `ComparePanel` 也是宽表）；整只 lazy，
  里头两页仍 tab-gated（两层边界：抽屉不常开，开了也只下选中那页的 chunk）

## 提示字处置（C1，判据：这句话改不改变我下一步做什么）

改变 → 留版面；不改变（讲原理、讲来历）→ tooltip / `Description` / 删。

**空状态四句 → 两句**：请求栏无；结果栏共用一句（上节）；动作区无 outcome 时
整块不渲（空面板配「这里以后会有东西」那句话本身就是它不该存在的证据）；
`TypeTree` 兜底保留。

**记参数表单四段 → 三个短句 + 一个 tooltip**：

| 今天 | 之后 |
|---|---|
| summary「…或者留下的同时把这组参数记进 git（要填 id 与一句说明）」 | 「顺便记下这组参数」 |
| id 的 Description（字符集规则 + 同 id 就地替换） | 只留「同 id 会就地替换」；字符集进 placeholder + `FieldError`（已有且更准） |
| label 的 Description（写给下一个人…别写成 id 的翻译） | 只留「别写成 id 的翻译」；前半句由 placeholder 示范 |
| 按钮旁「写进 corpus/…requests.json…值是真值（所以别放凭证）」 | 路径进 tooltip；**「别放凭证」留版面**（唯一不可逆的风险） |

**空状态栏**：端点计数句留（「后端起没起」的证据）；流程预告句改
「选一个端点开始。`⌘K` 也能跳。」；缺 cookie 句一字不动。

**请求栏三处、`GeneratedPanel`/`ComparePanel` 内部**：全部不动（后者在抽屉里，
不占主循环版面，C1 在那儿收益小而改动面翻倍）。

总账：常驻说明文字 14 处 → 8 处，其中 3 处缩短。

**反向约束（写进 `ResultPane.tsx` 文件头，成为规则）**：`ResponsePane.tsx`
文件头那段「每一发都要看 / 偶尔要查」的判据搬过去并明确成文 —— 否则下一轮
又会有人往版面上加解释；今天这 14 处就是这么长出来的（每一处单看都合理）。

## 测试改动

| 文件 | 改什么 |
|---|---|
| `appLayout.test.ts` | 最大头。`PANES` 3 行→2 行（加一列记 sr-only，`<h2>` 判据改写）；`grid-cols`/`grid-rows`/`defaultSize`/断点串换新；`Separator` 3→2、`CLIP` ≥3→≥2、`storage: LAYOUT_STORAGE` 3→2；footer 断言整条删；`PANE_CODE` 从「TypePane 两处」变「ResultPane 恰好一处」，「声明用 `fill`」成正断言（`not.toContain('maxHeight={PANE_CODE}')` 不能再全文件断言，diff 那处合法）；「留下/丢掉不在标题行」重写为对 `ResultPane.tsx` |
| `lazy.test.ts` | 换宿主：`JsonViewer`/`PayloadPanel`/`DiffPanel` → `ResultPane.tsx`；`ComparePanel`/`GeneratedPanel` → `RepoDrawer.tsx`；入口两行合一行 `ResultPane`；**新增** `['RepoDrawer', 'components/ResultPane.tsx', './RepoDrawer']`；「没接 Disclosure」名单换 `RequestPane`/`ResultPane`；`defaultSelectedKey="current"` → `"response"`；两行「正在读…」宿主列换 |
| `result.test.ts` | 模块常量与组件名换（`RESULT_PANE`/`RESULT_ACTIONS`）；读源码断 `fill` 那条改读 `ResultPane.tsx`（JSX 长进 `Tabs.Panel`，断言跟形状） |
| `appStore.test.ts` | 注释跟进；断言预计不动 |
| `compute.test.ts` | **不动**（读的是 server 侧文件；早先把它列进会动的名单是错的） |
| 其余 | 不动 |

**新增断言四条**（本轮新行为的 tripwire）：

1. **两份 28rem 逐字对齐** —— `PaneShell` grid 串与 `SplitLayout` `defaultSize`
   同值断言（对齐从注释升进测试）。
2. **tab 滚动契约** —— 响应/声明 Panel 是 `PANE_BODY_TIGHT`、结构/diff 是
   `PANE_BODY`，逐 Panel 断言。
3. **空状态唯一** —— `src/` 全树「发一发请求」恰好一处。
4. **动作条永远可见** —— `ResultActions` 渲一次，四颗按钮在 `<details>` 之外。

## 文档与门禁

- `packages/web/README.md`：「版面：三栏并排」章节、文件地图（`ResponsePane`/
  `TypePane`/`App.tsx` 行）跟着改。`docs/v7/PRD.md` 是平台迁移的事，不碰。
- 老八条全跑：`pnpm typecheck` / `test` / `test:types` / `lint` / `deps:check` /
  `types:size` / `openapi:check` / `types:check`。本轮只动 `packages/web`，
  后四条预期零变化但照跑。
- 已知基线：`deps:check` 恒定 12 条 warning（新边界 `ResultPane → lazy(RepoDrawer)`
  与今天 `TypePane → lazy(ComparePanel)` 同构，不成环）；体积预期 ±0 —— 一个 lazy
  栏换一个 lazy 栏；`ToggleButtonGroup` 在入口里留着（`ThemeSwitch` 也用它，已核实）。

## 明确不做

- tab 不进 URL（`useUrlParam` 够用但不必 —— 每切一次视图改一次地址栏不值）。
- `GeneratedPanel`/`ComparePanel` 内部的提示字本轮不动。
- 动作格高度可拖（footer）不保留 —— B3 修正版用内容高度 + `max-h` 封顶替代。
- 「响应与声明同屏」（e04787e 的头条）不保留，见背景节。
