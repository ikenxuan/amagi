# web 控制台两栏重排 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把控制台从「请求 / 响应 / 类型」三栏合并成「请求 / 结果」两栏：结果栏四个 tab（响应 / 声明 / 结构 / diff）+ 底部动作条 + 仓库抽屉，请求栏加宽到 28rem，并排断点降到 80rem，提示字按「改不改变下一步」分级。

**Architecture:** `TypePane.tsx` 改名为 `ResultPane.tsx` 作种子（tab 机制与懒加载边界不动地平移）；`ResponsePane.tsx` 删掉，动作区抽成 `ResultActions.tsx`；`已提交` / `对比` 两页进新文件 `RepoDrawer.tsx`（抽屉，整只 lazy）；`SplitLayout` / `PaneShell` 的 footer 机制整个删除。

**Tech Stack:** React 19 + @heroui/react v3 + Tailwind CSS v4 + react-resizable-panels + vitest（node 环境，`renderToStaticMarkup`，无 jsdom）。

**Spec:** `docs/superpowers/specs/2026-09-07-web-console-two-pane-design.md` —— 判据全在那边，实现者开工前先读。

## Global Constraints

- **八道门禁**（全跑在仓库根 `D:\GitHub\amagi`）：`pnpm typecheck`、`pnpm test`、`pnpm test:types`、`pnpm lint`、`pnpm deps:check`、`pnpm types:size`、`pnpm openapi:check`、`pnpm types:check`。已知基线：`deps:check` 恒定 12 条 warning（只有循环依赖才非零）；`types:check` 稳定报 10 条 ⚠️；`lint` 在 `packages/core/test/client/login.test-d.ts` 恒有 2 条警告。
- **lint 是 oxlint 不是 eslint**：要抑制写 `// oxlint-disable-…`。
- **测试跑在 node 里**：没有 jsdom、没有点击、没有事件循环。组件测试靠 `react-dom/server` 的 `renderToStaticMarkup`；「点开 tab 会怎样」这类事只能读源码断言。`Tooltip.Content` 只在打开时进 DOM，静态渲不出来。
- **test/ 归 `tsconfig.node.json` 管（没有 jsx）**：测试里 import `.tsx` 模块的说明符必须是变量（`const X = '../src/components/X'` + `await import(X)`），静态 import 报 `TS6142`。
- **读源码断言的坑**：断言前先去注释（`codeOf`），否则注释里的说明文字会把否定断言顶红。
- **入口预算是棘轮**：不许新增静态 import 懒加载过的组件；`lazy()` 要 default 导出，命名导出组件用 `.then((module) => ({ default: module.X }))` 转一手。
- **提交信息**：`type(scope): 中文描述`（pre-commit 钩子会校验）。每个任务一次提交。
- **文件头注释是判据的家**：这个仓库把「为什么这么写」写在文件头；搬家/改名时注释跟着走、引用旧文件名的注释要同步改，不许留指向已删文件的引用。
- 目标测试命令（仓库根跑）：单份 `pnpm exec vitest run packages/web/test/<文件名>`；web 全量 `pnpm exec vitest run packages/web`。

---

### Task 1: 抽出 `ResultActions.tsx`（纯搬家）

把 `ResponsePane.tsx` 里的 `ResponseActions` 组件与它的 props 接口原样搬进新文件 `ResultActions.tsx`，改名（`ResponseActions` → `ResultActions`、`ResponsePaneProps` → `ResultActionsProps`）。本任务**不改任何行为、不改版面** —— 它仍是被 App 当 footer 渲的那块面板，只是换了文件。

**Files:**
- Create: `packages/web/src/components/ResultActions.tsx`
- Modify: `packages/web/src/components/ResponsePane.tsx`（删掉 `ResponseActions`，保留 `ResponsePane` 与 `JsonViewer`）
- Modify: `packages/web/src/App.tsx:59`（import 与 footer 的组件名）
- Modify: `packages/web/src/components/Result.tsx`（4 处注释里的文件名）
- Modify: `packages/web/src/lib/storeNotice.ts:68`（注释里的类型名）
- Test: `packages/web/test/result.test.ts`、`packages/web/test/appLayout.test.ts`

**Interfaces:**
- Produces: `export const ResultActions: (props: ResultActionsProps) => ReactNode`，`export interface ResultActionsProps` —— 字段与今天的 `ResponsePaneProps` 完全一致（`outcome?`、`endpointLabel?`、`settled?`、`retryable?`、`busy`、`onStore`、`onDiscard`）。Task 3 会把它改成动作条。

- [ ] **Step 1: 改 `result.test.ts`（红）**

`packages/web/test/result.test.ts`：

```ts
// 74-75 行附近，模块说明符常量加一个
const MODULE = '../src/components/Result'
const RESULT_ACTIONS = '../src/components/ResultActions'
const RESPONSE_PANE = '../src/components/ResponsePane'

// 103-106 行：import ResponseActions 改从新文件拿、改组件名
const { ResultActions } = (await import(RESULT_ACTIONS)) as {
  ResultActions: (props: ResponseColumnProps) => ReactNode
}
```

同文件 186 行（`paneOf` 里）：

```ts
return (
  renderToStaticMarkup(createElement(ResponsePane, shared)) + renderToStaticMarkup(createElement(ResultActions, shared))
)
```

同文件 662 行（`TextArea` 那条里的 Toolbar import 判据）：

```ts
expect(importedFrom(readFileSync(new URL('../src/components/ResultActions.tsx', import.meta.url), 'utf8'))).toContain('Toolbar')
```

注释里出现 `ResponseActions` 的地方顺手改成 `ResultActions`（`result.test.ts` 文件头第 7 行与 169 行那段）。

- [ ] **Step 2: 改 `appLayout.test.ts` 里读 `ResponsePane.tsx` 找动作区的那条（红）**

`packages/web/test/appLayout.test.ts:390-400`，那条「留下 / 丢掉 / 复制不在标题行里」读的是 `ResponsePane.tsx`，而 `ACTIONS_TITLE_ID` / Toolbar 现在搬到新文件了 —— 只改这一条的取材：

```ts
it('「留下 / 丢掉 / 复制」**不在标题行里** —— 那排按钮就是高度不一致的成因', () => {
  const code = SRC['components/ResultActions.tsx']!
  const head = code.slice(code.indexOf('className={PANE_HEAD}'), code.indexOf('PANE_BODY'))
  expect(head).not.toContain('Toolbar')
  expect(head).not.toContain('留下')
  expect(code).toContain("const ACTIONS_TITLE_ID = 'pane-response-actions-title'")
  expect(code).toContain('<Surface className={PANE} aria-labelledby={ACTIONS_TITLE_ID} render={(props) => <section {...props} />}>')
  expect(code).toMatch(/<Toolbar aria-label="这份结果的动作"/)
})
```

（`SRC` 由 `readdirSync` 自动收进新文件，不用改扫描逻辑。）

- [ ] **Step 3: 跑这两份测试确认红**

Run: `pnpm exec vitest run packages/web/test/result.test.ts packages/web/test/appLayout.test.ts`
Expected: FAIL —— 找不到 `../src/components/ResultActions`。

- [ ] **Step 4: 建 `ResultActions.tsx`，瘦身 `ResponsePane.tsx`，改 `App.tsx`**

新建 `packages/web/src/components/ResultActions.tsx`：把 `ResponsePane.tsx` 里 `/** 下面那一格：**这一份怎么处理。** … */` 那段文件注释（240-258 行）、`export const ResponseActions = …`（259-376 行）整段搬过来，做这些替换：

- 组件名 `ResponseActions` → `ResultActions`
- props 类型名 `ResponsePaneProps` → `ResultActionsProps`（接口定义也搬过来；`ResponsePane.tsx` 里那份保留它自己要用的字段：`outcome` / `endpointLabel` / `busy` / `onStore` / `onDiscard` —— 与 `ResultActionsProps` 结构兼容，App 那份 `responseProps` 对象继续喂两处）
- 文件注释里「原先散在三处」等判据原样保留，只把指向 `ResponsePane.tsx` 的自引用改成「同栏的 `ResponsePane`」

`packages/web/src/components/ResponsePane.tsx`：删掉搬走的部分（240 行起到文件尾），import 清掉只剩 `Button` / `Chip` / `Surface` / `Tooltip` / `useLockFn` / `lazy` / `Suspense` / `useMemo` 里真正还用着的（`Toolbar` 不再用）。

`packages/web/src/App.tsx`：

```ts
// 59 行改成两行
import { ResponsePane } from './components/ResponsePane'
import { ResultActions } from './components/ResultActions'
```

682 行：`<ResponseActions {...responseProps} />` → `<ResultActions {...responseProps} />`。

注释同步：`Result.tsx` 432 / 434 / 586 行的「`ResponsePane.tsx`」→「`ResultActions.tsx`」；`storeNotice.ts:68` 的 `ResponsePaneProps.settled` → `ResultActionsProps.settled`。

- [ ] **Step 5: 跑 web 全量确认绿**

Run: `pnpm exec vitest run packages/web`
Expected: PASS（全部）。

- [ ] **Step 6: 提交**

```bash
git add -A packages/web
git commit -m "refactor(web): 动作区抽成 ResultActions.tsx —— 为结果栏合并做准备"
```

---

### Task 2: `RepoDrawer.tsx`——「已提交」与「对比」进抽屉

新建 `RepoDrawer.tsx`（右侧抽屉、`max-w-5xl`、内部两页 `Tabs`、两条 lazy 边界原样平移），`TypePane.tsx` 删掉 `已提交` / `对比` 两页、标题行加「仓库」触发按钮。本任务之后 `TypePane` 还是一栏（只有 `本次` / `diff` 两页），合并发生在 Task 3。

**Files:**
- Create: `packages/web/src/components/RepoDrawer.tsx`
- Modify: `packages/web/src/components/TypePane.tsx`
- Test: `packages/web/test/lazy.test.ts`、`packages/web/test/result.test.ts`

**Interfaces:**
- Consumes: `GeneratedPanelProps`、`ComparePanelProps`（两边组件已有，签名不动）
- Produces: `export const RepoDrawer: (props: RepoDrawerProps) => ReactNode`，`export interface RepoDrawerProps { platform: string; endpoint: string; stored: number; generatedRevision: number; requestsRevision: number }`。Task 3 里 ResultPane 引用这个接口。

- [ ] **Step 1: 改 `lazy.test.ts`（红）**

```ts
// HOSTS 增加一行（48-54 行那张表）
'components/RepoDrawer.tsx': codeOf(read('components/RepoDrawer.tsx')),

// LAZY 表：ComparePanel / GeneratedPanel 两行换宿主（71-78 行）
['ComparePanel', 'components/RepoDrawer.tsx', './ComparePanel'],
['GeneratedPanel', 'components/RepoDrawer.tsx', './GeneratedPanel']

// PANELS 表（167-190 行那个 describe 里）换宿主
['GeneratedPanel', 'components/RepoDrawer.tsx', 'committed'],
['ComparePanel', 'components/RepoDrawer.tsx', 'compare']

// NOTES 表（198-201 行）换宿主
['GeneratedPanel', 'components/RepoDrawer.tsx', '正在读 packages/response-types/ 里的产物…'],
['ComparePanel', 'components/RepoDrawer.tsx', '正在读这个端点的请求集合…']
```

文件头 17 行那句「已提交与对比去了 `TypePane.tsx`」改成「已提交与对比去了 `RepoDrawer.tsx` 的抽屉里（先由 `TypePane` 的标题行挂着，下一轮合并进结果栏）」。`TabFallback` 那条（214 行）的宿主断言同样换成 `RepoDrawer.tsx`。

- [ ] **Step 2: 改 `result.test.ts` 的页序断言（红）**

`typePaneOf` 相关：471-478 行那条「四页的顺序」改成两页：

```ts
it('两页的顺序 = 从「这一发」到「这一发会让产物怎么变」', () => {
  const html = typePaneOf(settleable({ typeSource }))
  const order = [...html.matchAll(/data-key="(current|diff)"/g)].map((hit) => hit[1])
  expect([...new Set(order)]).toEqual(['current', 'diff'])
})
```

- [ ] **Step 3: 跑确认红**

Run: `pnpm exec vitest run packages/web/test/lazy.test.ts packages/web/test/result.test.ts`
Expected: FAIL —— `RepoDrawer.tsx` 不存在。

- [ ] **Step 4: 写 `RepoDrawer.tsx`**

新建 `packages/web/src/components/RepoDrawer.tsx`：

```tsx
/**
 * 「仓库」抽屉：`已提交` / `对比` 两页 —— 它们说的是**仓库**而不是这一发。
 *
 * 为什么要从「类型」栏的 tab 里搬出来：那一栏合并成「结果」栏之后，四个 tab 说的都得是
 * **这一发**（响应 / 声明 / 结构 / diff），而这两页是查参考 ——「我是不是在重复劳动」、
 * 「两组参数差在哪」 —— 隔几天才动一次的东西不该占主循环的 tab 位。抽屉的先例是
 * 「集合」那张五列宽的表（`RequestTable.tsx` 的 `CollectionDrawer`），`ComparePanel`
 * 也是一张宽表，`max-w-5xl` 与它同一档。
 *
 * **两层懒加载边界**：抽屉整只 lazy（宿主是 `ResultPane`），它里头两块再各自 lazy 且
 * tab-gated —— 抽屉没打开时连 `Drawer` 的 chunk 都不请求；打开了也只下选中那页的
 * （`ComparePanel` 与 `RequestTable` 共用的 `Table` 一个就 104 KB）。
 */

import { Button, Drawer, Tabs } from '@heroui/react'
import { lazy, Suspense, useState } from 'react'

/** `lazy()` 要 default 导出，而这两个是命名导出（测试直接 import 它们），所以 `.then` 转一手 */
const GeneratedPanel = lazy(() => import('./GeneratedPanel').then((module) => ({ default: module.GeneratedPanel })))
const ComparePanel = lazy(() => import('./ComparePanel').then((module) => ({ default: module.ComparePanel })))

/** 与面板自己的加载态同一句话 —— chunk 落地时换掉的是同一位置上的同一行字，版面不动 */
const TabFallback = ({ note }: { note: string }) => <p className="text-muted text-sm">{note}</p>

export interface RepoDrawerProps {
  platform: string
  endpoint: string
  /** 本地已入库的样本数。只是让「对比」那块说得出「本地有几份 / 这里列得出几份」 */
  stored: number
  /** 「已提交」那页重拉的计数器（生成过类型之后 +1）。理由见 `GeneratedPanelProps.revision` */
  generatedRevision: number
  /** 「对比」那页重读的计数器（入库过之后 +1）—— 它读的是请求集合那个文件 */
  requestsRevision: number
}

export const RepoDrawer = ({ platform, endpoint, stored, generatedRevision, requestsRevision }: RepoDrawerProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Drawer isOpen={open} onOpenChange={setOpen}>
      {/* **与 `CollectionDrawer` 那颗逐字同构**：第一个孩子就是触发按钮 */}
      <Button className="ml-auto shrink-0" size="sm" variant="tertiary">
        仓库
      </Button>
      <Drawer.Backdrop variant="blur">
        <Drawer.Content placement="right">
          {/* `max-w-5xl` 而不是 `max-w-lg`（cookie 抽屉那一档）：这里装的是
              `ComparePanel` 那张宽表，给它 64rem 才不用横向滚 */}
          <Drawer.Dialog className="w-full max-w-5xl">
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading>
                {platform}/{endpoint} 的仓库视图
              </Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body>
              <Tabs defaultSelectedKey="committed">
                <Tabs.ListContainer>
                  <Tabs.List aria-label="仓库面板">
                    <Tabs.Tab id="committed" className="whitespace-nowrap">
                      已提交
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="compare" className="whitespace-nowrap">
                      对比
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
                <Tabs.Panel id="committed">
                  <Suspense fallback={<TabFallback note="正在读 packages/response-types/ 里的产物…" />}>
                    {/* `key` 带端点名：切端点后不留上一份 data（原先在 TypePane 里的理由原样） */}
                    <GeneratedPanel key={`generated:${platform}/${endpoint}`} platform={platform} endpoint={endpoint} revision={generatedRevision} />
                  </Suspense>
                </Tabs.Panel>
                <Tabs.Panel id="compare">
                  <Suspense fallback={<TabFallback note="正在读这个端点的请求集合…" />}>
                    <ComparePanel key={`compare:${platform}/${endpoint}`} platform={platform} endpoint={endpoint} stored={stored} revision={requestsRevision} />
                  </Suspense>
                </Tabs.Panel>
              </Tabs>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
```

- [ ] **Step 5: 瘦身 `TypePane.tsx`**

- 删 `已提交` / `对比` 两个 `Tabs.Tab`（90-104 行里的 `committed` / `compare`）与两个 `Tabs.Panel`（148-159 / 165-175 行）
- 删两条 `lazy()` import（`ComparePanel` / `GeneratedPanel`，38-39 行）与 `TabFallback`（49 行）
- props 接口里 `stored` / `generatedRevision` / `requestsRevision` 的注释改一句「转送给仓库抽屉」
- 标题行 `<Tabs.ListContainer>` 之后加触发按钮（fallback 与真身同一颗按钮的形状 —— `CookieTriggerFallback` 同一条判据：缺一颗按钮标题行会挪）：

```tsx
<Suspense fallback={<Button className="ml-auto shrink-0" size="sm" variant="tertiary" isDisabled>仓库</Button>}>
  <RepoDrawer platform={platform} endpoint={endpoint} stored={stored} generatedRevision={generatedRevision} requestsRevision={requestsRevision} />
</Suspense>
```

import 相应加上 `Button` 与 `const RepoDrawer = lazy(() => import('./RepoDrawer').then((module) => ({ default: module.RepoDrawer })))`。文件头「四页的顺序」那段注释改成「两页（本次 / diff），已提交与对比去了仓库抽屉」。

- [ ] **Step 6: 跑 web 全量确认绿**

Run: `pnpm exec vitest run packages/web`
Expected: PASS。lazy 数与 Suspense 数对账：宿主 6 个文件、`lazy()` 共 6 处（TypePane 少 2、RepoDrawer 多 2）、`<Suspense` 共 6 处。

- [ ] **Step 7: 提交**

```bash
git add -A packages/web
git commit -m "feat(web): 已提交与对比搬进仓库抽屉 RepoDrawer —— 脱离主循环的 tab 位"
```

---

### Task 3: 合并 —— `ResultPane.tsx`、App 两栏、footer 删除

核心一跳：`git mv TypePane.tsx ResultPane.tsx` 后重写成四 tab + 动作条；`ResponsePane.tsx` 删除；`App.tsx` panes 从 3 个变 2 个；`SplitLayout` / `PaneShell` 的 footer 机制整个删除；四处同义空状态去重成一句。宽度仍是 22rem、断点仍是 96rem（Task 5 才调）。

**Files:**
- Rename+Rewrite: `packages/web/src/components/TypePane.tsx` → `packages/web/src/components/ResultPane.tsx`
- Delete: `packages/web/src/components/ResponsePane.tsx`
- Modify: `packages/web/src/components/ResultActions.tsx`（从独立面板改成动作条）
- Modify: `packages/web/src/App.tsx`
- Modify: `packages/web/src/components/SplitLayout.tsx`、`packages/web/src/components/PaneShell.tsx`
- Modify: `packages/web/src/components/Result.tsx`、`packages/web/src/lib/pane.ts`、`packages/web/src/components/RequestTable.tsx`、`packages/web/src/components/TypeTree.tsx`（注释与一句空状态）
- Test: `packages/web/test/appLayout.test.ts`、`packages/web/test/lazy.test.ts`、`packages/web/test/result.test.ts`、`packages/web/test/appStore.test.ts`、`packages/web/test/viewers.test.ts`、`packages/web/test/paramForm.test.ts`（后两份只改注释）

**Interfaces:**
- Consumes: `ResultActions`（Task 1）、`RepoDrawer` + `RepoDrawerProps`（Task 2）、`Result.tsx` 的 `PayloadPanel` / `DiffPanel` / `KeepRequestForm` / `KeptRequest`、`CodeBlock`、`TypeTree`、`JsonViewer`
- Produces: `export const ResultPane: (props: ResultPaneProps) => ReactNode`（签名见 Step 4 的完整代码）。App 之后只 import 这一个。

- [ ] **Step 1: 改三份测试到目标态（红）**

**`appLayout.test.ts`：**

文件头注释（1-23 行）里「三栏并排（请求 / 响应 / 类型）」改成「两栏并排（请求 / 结果），结果栏四个 tab + 底部动作条」，其余判据段落保留。

PANES 数组（94-99 行）—— 加第四列记 sr-only：

```ts
/** 两栏各自的文件、标题 id、那个标题、以及它是不是 sr-only（结果栏的标题不占宽度） */
const PANES = [
  ['components/RequestPane.tsx', 'pane-request-title', '请求', false],
  ['components/ResultPane.tsx', 'pane-result-title', '结果', true]
] as const
```

it.each（317-327 行）改成按第四列挑断言：

```ts
it.each(PANES)('`%s` 是一块 `<Surface className={PANE}>`，标题接进 `aria-labelledby`（sr-only = %s）', (file, id, title, srOnly) => {
  const code = SRC[file]!
  expect(code).toContain(`const TITLE_ID = '${id}'`)
  expect(code).toContain('<Surface className={PANE} aria-labelledby={TITLE_ID} render={(props) => <section {...props} />}>')
  // 结果栏的 <h2> 不占宽度（四个 tab 名合起来就是标题），但读屏照常念「结果，区域」
  const h2 = srOnly ? '<h2 className={`sr-only ${PANE_TITLE}`} id={TITLE_ID}>' : '<h2 className={PANE_TITLE} id={TITLE_ID}>'
  expect(code).toContain(h2)
  expect(code).toMatch(new RegExp(`${h2.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*${title}`))
})
```

「右边真的是三栏」describe（285 行起）：

```ts
describe('右边真的是两栏，一栏一个问题', () => {
  // …at 帮手不变…

  it('顺序是「拿什么参数打 → 打回来什么、是什么形状、留不留」', () => {
    expect(at('<RequestPane')).toBeLessThan(at('<ResultPane'))
    const shell = SRC['components/PaneShell.tsx']!
    expect(shell).toContain('2xl:grid-cols-[22rem_minmax(0,1fr)]')
    expect(shell).toContain('grid-rows-2')
    expect(SRC['components/SplitLayout.tsx']).toContain("defaultSize={orientation === 'horizontal' && index === 0 ? '22rem' : undefined}")
  })
```

「三栏看的是同一份结果」那条（307-315 行）：标题改「两栏」，312 行 `expect(APP).toContain('outcome: shown?.outcome')` → `expect(APP).toContain('outcome={shown?.outcome}')`（App 现在用 JSX prop 传）。

PANE_CODE 那条（274-282 行）：

```ts
it('面板里那几块代码块的高度**要么填满自己那一格，要么吃 PANE_CODE** —— 不许各写一个数', () => {
  // 「响应」「声明」两页里是自带滚动的代码块，用 fill；「diff」那页用按视口算的 PANE_CODE
  //（唯一剩下的读者）。全文件恰好一处 maxHeight={PANE_CODE}
  expect(SRC['components/ResultPane.tsx']).toContain('fill />')
  expect(SRC['components/ResultPane.tsx']!.match(/maxHeight=\{PANE_CODE\}/g)).toHaveLength(1)
  expect(PANE_CODE).toContain('100vh')
})
```

「留下 / 丢掉 / 复制不在标题行里」（390-400 行，Task 1 改过的那条）重写：

```ts
it('「留下 / 丢掉 / 复制」**不在标题行里**，而在正文底下那条永远可见的动作条上', () => {
  const code = SRC['components/ResultPane.tsx']!
  // 标题行：从 PANE_HEAD 起到第一个 Tabs.Panel 为止
  const head = code.slice(code.indexOf('className={PANE_HEAD}'), code.indexOf('<Tabs.Panel'))
  expect(head).not.toContain('Toolbar')
  expect(head).not.toContain('留下')
  // 动作条：shrink-0（决定永远在视野里）、自己封顶、面板级组件没了
  const actions = SRC['components/ResultActions.tsx']!
  expect(actions).toMatch(/<Toolbar aria-label="这份结果的动作"/)
  expect(actions).toMatch(/max-h-64[^"]*shrink-0|shrink-0[^"]*max-h-64/)
  expect(actions).not.toContain('ACTIONS_TITLE_ID')
})
```

Separator / CLIP / storage 三条（453-478 行）：`toHaveLength(3)` → `toHaveLength(2)`（注释「三处」→「两处：左栏那条、栏与栏之间那条」）；`toBeGreaterThanOrEqual(3)` → `toBeGreaterThanOrEqual(2)`；`toHaveLength(3)`（storage）→ `toHaveLength(2)`（注释「三份账」→「两份账：外壳（左栏 vs 主区）、两栏之间」）。

「响应栏切成上下两格」整条（480-487 行）删除。

**新增** tab 滚动契约那条（放「每一栏自己滚」describe 里）：

```ts
it('结果栏四个 tab 的滚动契约逐 Panel 落：装代码块的两页 TIGHT、自己滚的两页 BODY', () => {
  // 「响应」「声明」里只有一块自带滚动的代码块 —— 外层再滚会在边界卡一下；
  // 「结构」「diff」的内容自己滚。class 必须落在每个 Tabs.Panel 上（四页两种契约）
  const code = SRC['components/ResultPane.tsx']!
  expect(code).toContain('<Tabs.Panel id="response" className={PANE_BODY_TIGHT}>')
  expect(code).toContain('<Tabs.Panel id="declaration" className={PANE_BODY_TIGHT}>')
  expect(code).toContain('<Tabs.Panel id="structure" className={PANE_BODY}>')
  expect(code).toContain('<Tabs.Panel id="diff" className={PANE_BODY}>')
})
```

**`lazy.test.ts`：**

```ts
// HOSTS：删 ResponsePane / TypePane 两行，加 ResultPane（RepoDrawer 在 Task 2 已加）
'components/ResultPane.tsx': codeOf(read('components/ResultPane.tsx')),

// LAZY 表（7 项）：
['CookieDrawer', 'App.tsx', './components/CookieDrawer'],
['SplitLayout', 'components/PaneShell.tsx', './SplitLayout'],
['CollectionDrawer', 'components/RequestPane.tsx', './RequestTable'],
['JsonViewer', 'components/ResultPane.tsx', './JsonViewer'],
['RepoDrawer', 'components/ResultPane.tsx', './RepoDrawer'],
['ComparePanel', 'components/RepoDrawer.tsx', './ComparePanel'],
['GeneratedPanel', 'components/RepoDrawer.tsx', './GeneratedPanel']

// EAGER 表：三行换一行，两行换宿主
['RequestPane', 'App.tsx', './components/RequestPane'],
['ResultPane', 'App.tsx', './components/ResultPane'],
// （EndpointJumper / EndpointList / HistoryList / ThemeSwitch / ParamForm 原样）
['PayloadPanel', 'components/ResultPane.tsx', './Result'],
['DiffPanel', 'components/ResultPane.tsx', './Result']

// 「没接 Disclosure」名单（177 行）：
it.each(['components/RequestPane.tsx', 'components/ResultPane.tsx'])('`%s` 里没接 `Disclosure`', …)

// 默认页断言（182-189 行）：
expect(HOSTS['components/ResultPane.tsx']).toContain("<Tabs defaultSelectedKey={defaultTab ?? 'response'}>")
expect(HOSTS['components/RequestPane.tsx']).not.toContain('<Tabs')
```

文件头 16-18 行「已提交与对比去了 RepoDrawer」那段补一句「宿主从 `TypePane` 换成了 `ResultPane`」。

**`result.test.ts`：**

```ts
// 模块常量（73-75 行）
const MODULE = '../src/components/Result'
const RESULT_ACTIONS = '../src/components/ResultActions'
const RESULT_PANE = '../src/components/ResultPane'

// import（103-117 行）：ResponsePane / TypePane 两个换成
const { ResultActions } = (await import(RESULT_ACTIONS)) as {
  ResultActions: (props: ResponseColumnProps) => ReactNode
}
const { ResultPane } = (await import(RESULT_PANE)) as {
  ResultPane: (props: ResultPaneProps & { defaultTab?: string }) => ReactNode
}
```

`ResponseColumnProps` 保留原字段；`paneOf`（175-188 行）改成整栏一次渲（动作条在栏里）：

```ts
const paneOf = (outcome?: RecordOutcome, props: { settled?: string; busy?: boolean; retryable?: boolean } = {}): string => {
  const shared = {
    platform: 'bilibili',
    endpoint: 'Comments',
    outcome,
    endpointLabel: 'bilibili/Comments',
    busy: props.busy ?? false,
    settled: props.settled,
    retryable: props.retryable,
    stored: 3,
    generatedRevision: 0,
    requestsRevision: 0,
    onStore: () => Promise.resolve(),
    onDiscard: () => Promise.resolve()
  }
  return renderToStaticMarkup(createElement(ResultPane, shared))
}
```

`typePaneOf`（196-206 行）改名 `resultPaneOf`，加第二参选起始页：

```ts
const resultPaneOf = (outcome?: RecordOutcome, defaultTab?: string): string =>
  renderToStaticMarkup(createElement(ResultPane, { platform: 'bilibili', endpoint: 'Comments', outcome, stored: 3, generatedRevision: 0, requestsRevision: 0, busy: false, onStore: () => Promise.resolve(), onDiscard: () => Promise.resolve(), defaultTab }))
```

各 describe 的替换：

- 「这块面板真的接在『响应』栏上」（272-315 行）：`source` 改读 `ResultPane.tsx`；291-292 行那条删掉 `not.toContain('maxHeight={PANE_CODE}')`（diff 那页合法地用它），保留 `toContain('<PayloadPanel payload={outcome.payload} highlight={outcome.payloadHighlight} fill />')`；describe 名改「接在『结果』栏的『响应』页上」。
- 「diff 那块面板真的接在『类型』栏上」（403-424 行）：`source` 改读 `ResultPane.tsx`；407 行正则加 class：`/<Tabs\.Panel id="diff" className=\{PANE_BODY\}>\s*<DiffPanel diff=\{diff\} maxHeight=\{PANE_CODE\} \/>/`；413 / 420 行 `typePaneOf` → `resultPaneOf`。
- 「『类型』栏的『本次』那一页」（437-479 行）改名「『结果』栏的『声明』页」：`typePaneOf(x)` → `resultPaneOf(x, 'declaration')`；447 行 `tabpanel-current` → `tabpanel-declaration`、`data-key="current"` → `data-key="declaration"`；467-469 行「还没发过」那条删掉（空状态归 paneOf(undefined) 那条管），换一条第三分支：

```ts
it('两个字段都没有的那一份（旧 server）说「没有类型声明」，不静默空着', () => {
  expect(resultPaneOf(settleable(), 'declaration')).toContain('这一份没有类型声明')
})
```

- 471-478 行页序断言：`['current', 'committed', 'diff', 'compare']` → `['response', 'declaration', 'structure', 'diff']`（注释同步：前三页回答「是什么」，diff 回答「要不要留它」）。
- 动作区 / 收据 / 入口形状三个 describe：断言全部原样（paneOf 渲的就是整栏），只把注释里「三栏」「响应栏」的字样跟上；745 行 describe 里加一条新的：

```ts
it('动作条永远可见：四颗按钮在 <details> 之外 —— summary 里的点击全会触发开合', () => {
  const html = paneOf(settleable())
  const toolbar = html.indexOf('role="toolbar"')
  expect(toolbar).toBeGreaterThan(-1)
  expect(toolbar).toBeLessThan(html.indexOf('<details'))
})
```

**`appStore.test.ts`**（269-283 行附近）：

- 273 行断言：`onStore: (record?: KeptRequest) => quiet(store.runAsync(shown!, record))` → `onStore={(record?: KeptRequest) => quiet(store.runAsync(shown!, record))}`，注释「两格共用同一份 props」→「整栏一份 props（tab 正文与动作条都在『结果』栏里）」
- 282 行：`retryable: shown?.retryable` → `retryable={shown?.retryable}`，注释里 `ResponsePaneProps.retryable` → `ResultActionsProps.retryable`、「响应栏」→「结果栏」
- 269 行注释「三栏」→「两栏」

**`viewers.test.ts:125`、`paramForm.test.ts:495`**：注释「三栏」→「两栏」。

- [ ] **Step 2: 跑确认红**

Run: `pnpm exec vitest run packages/web`
Expected: FAIL（`ResultPane` 不存在、App 还在渲三栏）。

- [ ] **Step 3: `git mv` 并重写 `ResultPane.tsx`**

```bash
git mv packages/web/src/components/TypePane.tsx packages/web/src/components/ResultPane.tsx
```

`ResultPane.tsx` 整份重写成（文件头注释是这轮判据的家，全文照写）：

```tsx
/**
 * 「结果」那一栏：**这一发打回来了什么、它是什么形状、这份留不留。**
 *
 * ## 四个 tab = 这一发的三种看法 + 留不留的依据
 *
 * `响应`（脱敏后的 JSON）→ `声明`（这一份单独跑一次生成器的 TypeScript）→ `结构`（字段树）
 * → `diff`（留下它产物会怎么变）。前三页回答「是什么」，diff 回答「要不要留它」——
 * 它正是动作条上那个决定的依据。默认停在「响应」：发一次请求之后最想看的就是它。
 * `已提交` 与 `对比` 不在这里：它们说的是**仓库**而不是这一发（查参考，不进主循环），
 * 在标题行「仓库」那颗按钮开的抽屉里（`RepoDrawer.tsx`）。
 *
 * ## 滚动契约逐 tab 落
 *
 * 「响应」「声明」两页里只有一块自带滚动的代码块，Panel 用 `PANE_BODY_TIGHT`（两层都滚
 * 会在边界卡一下）；「结构」「diff」的内容自己滚，Panel 用 `PANE_BODY`。class 落在
 * **每个 `Tabs.Panel`** 上而不是外面共用的 div —— 四页两种契约，这是与旧版唯一不同的结构。
 *
 * ## 提示字的规则（这一轮分级之后的绊线，别让版面再长回去）
 *
 * 版面上常驻的说明文字只许留**会改变下一步动作**的那句（「这份不能入库」+ 原因、
 * 「建议丢掉」、缺 cookie）；讲原理、讲来历的（字符集规则、写进哪个文件、流程预告）
 * 一律退到 tooltip 或 `FieldError`。判据是「每一发都要看」还是「偶尔要查」——
 * 当年那 14 处提示字就是每处单看都合理地长出来的。
 *
 * ## 懒加载边界
 *
 * `JsonViewer` 懒在「响应」页里；`RepoDrawer` 整只懒（抽屉不常开），它里头的
 * `GeneratedPanel` / `ComparePanel` 再各自 lazy 且 tab-gated —— 两层边界，判据在
 * `lazy.test.ts`。
 */

import { Button, Chip, Surface, Tabs } from '@heroui/react'
import { lazy, Suspense, useMemo } from 'react'

import type { RecordOutcome } from '../lib/api'
import { PANE, PANE_BODY, PANE_BODY_TIGHT, PANE_CODE, PANE_HEAD, PANE_TITLE } from '../lib/pane'
import { CodeBlock } from './CodeBlock'
import { DiffPanel, type KeptRequest, PayloadPanel } from './Result'
import type { RepoDrawerProps } from './RepoDrawer'
import { ResultActions } from './ResultActions'
import { TypeTree } from './TypeTree'

/** `lazy()` 要 default 导出，而这两个是命名导出（测试直接 import 它们），所以 `.then` 转一手 */
const JsonViewer = lazy(() => import('./JsonViewer').then((module) => ({ default: module.JsonViewer })))
const RepoDrawer = lazy(() => import('./RepoDrawer').then((module) => ({ default: module.RepoDrawer })))

/**
 * 字节数说成一句人话。1024 以下报字节：那个量级里「小」本身就是信息；以上报一位小数的
 * KB，再往上不换 MB —— 「9,000 KB」比「8.8 MB」更能让人意识到这份响应有多离谱。
 */
const sizeOf = (bytes: number): string => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`)

export interface ResultPaneProps {
  platform: string
  endpoint: string
  /** 当前看的那一份结果。`undefined` = 还没发过 —— 那时整个 tab 区就一句话 */
  outcome?: RecordOutcome
  /** 这一份属于哪个端点（`平台/端点`）。不标出来，点「留下」时会认错端点 */
  endpointLabel?: string
  /** 已经处理过（入库或丢弃）时那句收据 */
  settled?: string
  /** 收据在但 server 还留着条目 —— 「留下 / 丢掉」不许收走，判据在 `ResultActions` */
  retryable?: boolean
  /** 本地已入库的样本数（「对比」那页要报得出「本地有几份」），转送仓库抽屉 */
  stored: number
  /** 「已提交」那页重拉的计数器（生成过类型之后 +1），转送仓库抽屉 */
  generatedRevision: number
  /** 「对比」那页重读的计数器（入库过之后 +1），转送仓库抽屉 */
  requestsRevision: number
  /** 有动作在跑。两个入库动作都要禁 */
  busy: boolean
  /** 入库 / 丢弃。必须返回 Promise —— `useLockFn` 靠 `await` 才知道动作何时结束 */
  onStore: (record?: KeptRequest) => Promise<void>
  onDiscard: () => Promise<void>
  /**
   * 测试用来选起始页的口子：`Tabs` 只渲选中的那一页（懒加载的前提），而默认停在
   * 「响应」——「声明」那一页的分支只有从这里才渲得出来。生产里没人传它。
   */
  defaultTab?: 'response' | 'declaration' | 'structure' | 'diff'
}

const TITLE_ID = 'pane-result-title'

/** 仓库抽屉那颗触发按钮（连 Suspense 一起）—— 空态与标题行两处都要它 */
const RepoTrigger = (props: RepoDrawerProps) => (
  // fallback 与真身同一颗按钮的形状（`CookieTriggerFallback` 同一条判据：缺一颗按钮标题行会挪）
  <Suspense fallback={<Button className="ml-auto shrink-0" size="sm" variant="tertiary" isDisabled>仓库</Button>}>
    <RepoDrawer {...props} />
  </Suspense>
)

export const ResultPane = ({
  platform,
  endpoint,
  outcome,
  endpointLabel,
  settled,
  retryable = false,
  stored,
  generatedRevision,
  requestsRevision,
  busy,
  onStore,
  onDiscard,
  defaultTab
}: ResultPaneProps) => {
  const diff = outcome?.diff ?? []
  const http = outcome?.http
  /**
   * 喂给 Monaco 的那段正文。**`useMemo` 不是优化而是必需** —— 一份 1.3 MB 的响应每渲染一次
   * stringify 一遍会卡住拖分隔条。走 `payload` 而不是被 server 截过的 `payloadHighlight`。
   */
  const source = useMemo(() => (outcome?.payload === undefined ? undefined : JSON.stringify(outcome.payload, null, 2)), [outcome?.payload])

  const repo = { platform, endpoint, stored, generatedRevision, requestsRevision }

  return (
    <Surface className={PANE} aria-labelledby={TITLE_ID} render={(props) => <section {...props} />}>
      {outcome === undefined ? (
        /* 还没发过：一句话空状态（原先有四句几乎同义的话，去重成这一句），tab 都不渲 ——
           四个空 tab 不如一句「下一步做什么」。不进 Tabs.Panel：Tabs 只渲选中那一页，
           四个 panel 各放一句就是又回到四处 */
        <>
          <div className={PANE_HEAD}>
            <h2 className={`sr-only ${PANE_TITLE}`} id={TITLE_ID}>
              结果
            </h2>
            <RepoTrigger {...repo} />
          </div>
          <div className={PANE_BODY}>
            <p className="text-muted text-sm">左边填参数，按「发送」。</p>
          </div>
        </>
      ) : (
        <Tabs defaultSelectedKey={defaultTab ?? 'response'}>
          {/* `Tabs` 跨过标题行与正文两层（同旧版 TypePane 的理由）：tab 条挂在标题行里，
              四个 panel 在下面各自滚的那一层，两边靠 `Tabs` 的 context 连着 */}
          <div className={PANE_HEAD}>
            {/* 标题行没有可见标题：四个 tab 名合起来已经说了这一栏是什么。但 `<h2>` 不能删 ——
                `aria-labelledby` 指着它，读屏照常念「结果，区域」；它只是不占宽度 */}
            <h2 className={`sr-only ${PANE_TITLE}`} id={TITLE_ID}>
              结果
            </h2>
            <Tabs.ListContainer>
              <Tabs.List aria-label="结果面板">
                <Tabs.Tab id="response" className="whitespace-nowrap">
                  响应
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="declaration" className="whitespace-nowrap">
                  声明
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="structure" className="whitespace-nowrap">
                  结构
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="diff" className="whitespace-nowrap">
                  diff
                  {/* 条数挂在 tab 上：不点开也知道这一发有没有改动产物。
                      **0 条时不渲那枚 Chip**，「diff 0」是句废话，而 tab 本身还在 */}
                  {diff.length > 0 && (
                    <Chip size="sm" variant="soft">
                      <Chip.Label className="tabular-nums">{diff.length}</Chip.Label>
                    </Chip>
                  )}
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            {/* 收据说的是整发请求而不是某个视图，所以挂标题行、不随 tab 动。
                **`status` 为 0 表示一发都没打出去**，那时报的是那个 0 而不是留白 */}
            {http !== undefined && (
              <span className="text-muted shrink-0 font-mono text-xs tabular-nums">
                {http.status} · {http.durationMs} ms · {sizeOf(http.bytes)}
              </span>
            )}
            <RepoTrigger {...repo} />
          </div>

          <Tabs.Panel id="response" className={PANE_BODY_TIGHT}>
            {source === undefined ? (
              /* 没有 `payload` 的那一档（一发都没打出去）：Monaco 没有正文可显示，
                 而 `PayloadPanel` 那条回落会把这件事说出来（它渲的是 `null`） */
              <PayloadPanel payload={outcome.payload} highlight={outcome.payloadHighlight} fill />
            ) : (
              /* fallback 是 server 已经渲好的那份高亮 —— 同一段 JSON、同一套配色，
                 chunk 落地时换掉的只有能力（折叠 / 搜索 / 跳行） */
              <Suspense fallback={<PayloadPanel payload={outcome.payload} highlight={outcome.payloadHighlight} fill />}>
                <JsonViewer text={source} />
              </Suspense>
            )}
          </Tabs.Panel>

          <Tabs.Panel id="declaration" className={PANE_BODY_TIGHT}>
            {/* `fill` 而不是 `maxHeight={PANE_CODE}`：这一栏整屏高，高度由格子决定，不再按视口估。
                **`PANE_CODE` 只剩「diff」那一页这一个读者** */}
            {outcome.typeSource !== undefined ? (
              <CodeBlock code={outcome.typeSource} fill />
            ) : outcome.typeIssue !== undefined ? (
              // **生成失败要说出来**，不是让这一页静默空着（契约里两字段互斥就是为了这一句）
              <p className="text-warning-soft-foreground text-sm">{outcome.typeIssue}</p>
            ) : (
              <p className="text-muted text-sm">这一份没有类型声明。</p>
            )}
          </Tabs.Panel>

          {/* 树读的是 `payload` 而不是那份声明文本 —— 「生成失败」那一档它照样显示得出来 */}
          <Tabs.Panel id="structure" className={PANE_BODY}>
            <TypeTree payload={outcome.payload} />
          </Tabs.Panel>

          <Tabs.Panel id="diff" className={PANE_BODY}>
            <DiffPanel diff={diff} maxHeight={PANE_CODE} />
          </Tabs.Panel>
        </Tabs>
      )}

      {/* 动作条：决定永远在视野里（判据在 `ResultActions.tsx` 文件头）。
          没有 `outcome` 时整条不渲 —— 空面板配「这里以后会有东西」正是要删的那类提示 */}
      {outcome !== undefined && (
        <ResultActions outcome={outcome} endpointLabel={endpointLabel} settled={settled} retryable={retryable} busy={busy} onStore={onStore} onDiscard={onDiscard} />
      )}
    </Surface>
  )
}
```

- [ ] **Step 4: 把 `ResultActions.tsx` 改成动作条**

整份重写（判据进文件头；组件内容从旧 `ResponseActions` 平移，去掉它自己的 `Surface` / `PANE_HEAD` / `PANE_BODY` 三层，换成一条 `shrink-0` 的带子；三枚 Chip 从旧响应栏标题行搬进来；`outcome` 收紧为必填）：

```tsx
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
```

- [ ] **Step 5: 改 `App.tsx`**

import 区（59 / 63 行）：

```ts
import { ResultPane } from './components/ResultPane'
// 删掉：import { ResponsePane } from './components/ResponsePane'
//        import { ResultActions } from './components/ResultActions'
//        import { TypePane } from './components/TypePane'
```

`responseProps` 块（442-460 行）整段删除（只剩一个消费者了），`shown!` 的安全性注释挪到 `onStore` 那行边上。panes 数组（654-697 行）：

```tsx
: [
    {
      id: 'amagi-pane-request',
      node: (
        <RequestPane
          key={`${platform!.platform}/${endpoint.name}`}
          platform={platform!}
          endpoint={endpoint}
          busy={busy}
          sending={record.loading}
          onSend={(params) => record.run({ platform: platform!.platform, endpoint: endpoint.name }, params)}
          onBatch={() => batch.run({ platform: platform!.platform, endpoint: endpoint.name })}
          batchLoading={batch.loading}
          onGenerate={() => generate.run({ platform: platform!.platform, endpoint: endpoint.name })}
          generateLoading={generate.loading}
          requestsRevision={requestsRevision}
        />
      )
    },
    {
      id: 'amagi-pane-result',
      node: (
        <ResultPane
          platform={platform!.platform}
          endpoint={endpoint.name}
          outcome={shown?.outcome}
          endpointLabel={shown === undefined ? undefined : `${shown.platform}/${shown.endpoint}`}
          settled={shown?.settled}
          retryable={shown?.retryable}
          stored={endpoint.stored}
          generatedRevision={generatedRevision}
          requestsRevision={requestsRevision}
          busy={busy}
          // 那个 `record` 从动作条那张小表单来（填了 id 与说明才有），一路送到
          // `POST /api/store` 的 body 上 —— 参数就是这样进 git 的。
          // `shown!` 安全：没有 `shown` 时动作条连按钮都不渲
          onStore={(record?: KeptRequest) => quiet(store.runAsync(shown!, record))}
          onDiscard={() => quiet(discard.runAsync(shown!))}
        />
      )
    }
  ]
```

文件头注释（1-49 行）重写 —— 保留三个设计约束与 Surface 判据段落，第一段换成：

```
* 控制台主界面。**两栏并排：请求 / 结果**，左边一条端点导航。
*
* ## 这一轮把「响应」与「类型」合并成了「结果」栏
*
* 三栏时代（e510540）第三栏四页里只有「本次」说的是这一发，其余说的是仓库；而请求栏
* 22rem 装不下参数多的端点。「结果」栏四个 tab（响应 / 声明 / 结构 / diff）都只说这一发，
* 仓库那两页进了「仓库」抽屉。**代价明说：响应与类型声明不再同屏** —— 一次只见一页；
* 换来请求栏加宽、结果栏占半屏。
```

- [ ] **Step 6: 删 footer 机制（`SplitLayout.tsx` + `PaneShell.tsx`）**

`SplitLayout.tsx`：

- 文件头注释：删掉 footer 相关段落；「两档宽度、两层 `Group`」里 `columns` / `rows` 的描述三栏→两栏
- `SplitPane` 接口（122-137 行）删掉 `footer` 字段，注释留一句「`id` 是尺寸记账的键」
- `SplitColumn` 组件（150-221 行）整个删除 —— hook 不能进 `map` 是它存在的理由，footer 没了它没有 hook 了；`main` 里的 `panes.map` 直接展开（`Fragment` 保住 `Separator` 与 `Panel` 是 `Group` 的直接 DOM 子节点）：

```tsx
{panes.map((pane, index) => (
  <Fragment key={pane.id}>
    {index > 0 && <Separator className={split} aria-label={`拖动调整${orientation === 'horizontal' ? '栏宽' : '栏高'}`} />}
    <Panel
      id={pane.id}
      // 横排时第一栏 22rem、其余均分剩下的（给了 defaultSize 的拿到 flex-basis，没给的拿到 flex-grow: 1）；
      // 竖排时都不给，于是均分。与 PaneShell 那份 grid 逐字对应（宽度值 Task 5 会一起调）
      defaultSize={orientation === 'horizontal' && index === 0 ? '22rem' : undefined}
      // 下限：横排 18rem（一份代码块的最窄可读宽度），竖排 5rem（标题行 + 两行正文）
      minSize={orientation === 'horizontal' ? '18rem' : '5rem'}
      className="grid min-h-0 min-w-0"
      style={CLIP}
    >
      {pane.node}
    </Panel>
  </Fragment>
))}
```

（import 加 `Fragment`；`useMemo` 若无其他使用者则从 import 里去掉。）

`PaneShell.tsx`：

- `StaticColumn`（53-61 行）删除，`panes.map` 直接渲 `pane.node`
- grid 那行（80 行）：`grid-rows-3 gap-2 2xl:grid-cols-[22rem_minmax(0,1fr)_minmax(0,1fr)] 2xl:grid-rows-1` → `grid-rows-2 gap-2 2xl:grid-cols-[22rem_minmax(0,1fr)] 2xl:grid-rows-1`
- 文件头注释里 footer / 「带 footer 的那一栏」两段删除

- [ ] **Step 7: 删 `ResponsePane.tsx`，同步各处注释与 TypeTree 空状态**

```bash
git rm packages/web/src/components/ResponsePane.tsx
```

注释同步（引用了已删文件 / 旧布局的）：

- `Result.tsx`：9 / 24 / 242 / 311-312 / 601 行 —— `ResponsePane.tsx` / `TypePane.tsx` → `ResultPane.tsx` / `ResultActions.tsx`，`ResponsePaneProps` → `ResultPaneProps`，`<ResponsePane …>` → `<ResultPane …>`
- `lib/pane.ts`：文件头第 4 行「参数 / 响应 / 类型 三栏并排」→「请求 / 结果 两栏并排」；76 行「搬去了响应栏底下那块『功能』面板」→「搬去了『结果』栏底下那条动作带」；87 行 `PANE_BODY_TIGHT` 注释「唯一的读者是『响应』栏的正文那一格」→「读者是『结果』栏里装代码块的那两页（响应 / 声明）」
- `RequestTable.tsx` 151 / 155 行：`ResponsePane` → `ResultActions`
- `TypeTree.tsx` 159 行：`发一发请求，这里出现它的字段结构。` → `这一份没有响应正文。`（空状态去重的一部分：outcome 为空时整栏已经是那一句，这里只剩「有结果但没有 payload」那一档）

- [ ] **Step 8: 跑 web 全量 + typecheck 确认绿**

Run: `pnpm exec vitest run packages/web && pnpm typecheck`
Expected: PASS。对账：`lazy()` 共 7 处（App 1 + PaneShell 1 + RequestPane 1 + ResultPane 2 + RepoDrawer 2）、`<Suspense` 共 7 处、`storage: LAYOUT_STORAGE` 2 处、`<Separator` 带 aria-label 2 处。

- [ ] **Step 9: 提交**

```bash
git add -A packages/web
git commit -m "feat(web): 响应与类型合并成结果栏 —— 四 tab + 动作条 + footer 机制删除"
```

---

### Task 4: 提示字分级（C1 剩余）+ 空状态唯一绊线

KeepRequestForm 四段话缩成三个短句 + 一个 tooltip；App 空状态栏第二句改短；新增「空状态全仓只有一句」的 tripwire 测试。

**Files:**
- Modify: `packages/web/src/components/Result.tsx`（KeepRequestForm 的 summary / 两条 Description / 按钮旁那句）
- Modify: `packages/web/src/App.tsx`（「先选一个端点」正文第二句）
- Test: `packages/web/test/result.test.ts`（路径那条断言）、`packages/web/test/appLayout.test.ts`（新 tripwire）

**Interfaces:** 无新接口；`KeepRequestFormProps` 不动。

- [ ] **Step 1: 改测试（红）**

`appLayout.test.ts` 末尾加一个 describe（`SRC` 已有，全树扫描的是去注释之后的源码，注释里的示例文字不会误伤）：

```ts
describe('提示字只留会改变下一步的那句（C1 的绊线）', () => {
  it('空状态全仓只有一句 —— 曾经有四处几乎同义的话', () => {
    // 「左边填参数」是唯一活下来的那句（「结果」栏）。其余三句（动作区、类型声明页、
    // 字段结构页）已删 —— 再冒出来就是有人又往版面上加解释
    const hits = (needle: string): string[] =>
      Object.entries(SRC).filter(([, code]) => code.includes(needle)).map(([file]) => file)
    expect(hits('左边填参数')).toEqual(['components/ResultPane.tsx'])
    expect(hits('发一发请求')).toEqual([])
    expect(hits('还没有结果')).toEqual([])
  })
})
```

`result.test.ts` 770-779 行那条「要写的那个文件路径说出来了」改成：

```ts
it('「同 id 会就地替换」与「别放凭证」在版面上，路径进了 tooltip', () => {
  const html = paneOf(settleable())
  // 撞名这件事说在人打字的地方；凭证是这个动作唯一不可逆的风险 —— 两者都改变下一步
  expect(html).toContain('同 id 会就地替换')
  expect(html).toContain('别放凭证')
  // 路径是「来历」不是「下一步」：进 tooltip（`Tooltip.Content` 只在打开时才进 DOM，
  // 静态渲不出来），所以这里读源码
  const source = readFileSync(new URL('../src/components/Result.tsx', import.meta.url), 'utf8')
  expect(source).toContain('corpus/{endpointLabel}.requests.json')
})
```

- [ ] **Step 2: 跑确认红**

Run: `pnpm exec vitest run packages/web/test/appLayout.test.ts packages/web/test/result.test.ts`
Expected: FAIL —— tripwire 抓到 `App.tsx` 里那句流程预告、770 那条抓不到新文案。

- [ ] **Step 3: 改 `Result.tsx` 的 KeepRequestForm 四处文案**

- 534 行 summary：`…或者留下的同时把这组参数记进 git（要填 id 与一句说明）` → `顺便记下这组参数`
- 553 行 id 的 Description：`字母数字开头结尾，中间可以有 - 与 _。集合里已经有同名的那一条时是就地替换，不是新增一条。` → `同 id 会就地替换。`（字符集规则由 placeholder 的例子 + `FieldError` 当场说，比预先讲一遍有效 —— 在 551 行注释里补这一句）
- 569 行 label 的 Description：`写给下一个人的一句话：这组参数覆盖的是哪种情况。别写成 id 的翻译 —— 那让这个字段失去意义。` → `别写成 id 的翻译。`
- 576-578 行那个 span 换成：

```tsx
<Tooltip delay={300}>
  <span className="text-muted min-w-0 text-xs">值是真值，别放凭证。</span>
  <Tooltip.Content>
    <p className="font-mono text-xs">写进 corpus/{endpointLabel}.requests.json —— 那个文件进 git</p>
  </Tooltip.Content>
</Tooltip>
```

（import 加 `Tooltip`。）

- [ ] **Step 4: 改 `App.tsx` 空状态第二句**

637 行那句 `选中之后：填参数 → 发送 → 同屏看响应与它的类型声明。` 换成 `选一个端点开始。`（`⌘K` 那半句与 `Kbd` 结构原样保留，句尾 `也能跳端点。` → `也能跳。`）。原句在描述一条马上就会看见的流程，且「同屏看响应与类型声明」在合并后不再成立。

- [ ] **Step 5: 跑 web 全量确认绿**

Run: `pnpm exec vitest run packages/web`
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add -A packages/web
git commit -m "feat(web): 提示字按「改不改变下一步」分级 —— 四段话缩三句一路径，空状态唯一绊线"
```

---

### Task 5: 常量调参 —— 请求栏 28rem、并排断点 80rem、对齐断言

**Files:**
- Modify: `packages/web/src/lib/viewport.ts`（`WIDE` 96rem → 80rem）
- Modify: `packages/web/src/components/PaneShell.tsx`（`2xl:` → `xl:`、22rem → 28rem）
- Modify: `packages/web/src/components/SplitLayout.tsx`（`'22rem'` → `'28rem'`）
- Test: `packages/web/test/appLayout.test.ts`（两个断言串 + 新增对齐断言）

**Interfaces:** 无 —— 纯常量与注释。

- [ ] **Step 1: 改测试（红）**

`appLayout.test.ts`「顺序是…」那条里的两个断言串换成终值，并加一条对齐断言（可与原 `defaultSize` 断言合并）：

```ts
it('顺序是「拿什么参数打 → 打回来什么、是什么形状、留不留」', () => {
  expect(at('<RequestPane')).toBeLessThan(at('<ResultPane'))
  const shell = SRC['components/PaneShell.tsx']!
  const split = SRC['components/SplitLayout.tsx']!
  // 并排在 `xl`（80rem，普通笔记本宽度）就成立 —— 原先要 96rem 是「三栏各要 22rem」的账，
  // 第三栏没了它就不成立。两份版面的第一栏宽度**逐字对齐**（chunk 落地时版面不跳）——
  // 对齐本身成断言，原先各测各的、对齐靠自觉
  expect(shell).toContain('xl:grid-cols-[28rem_minmax(0,1fr)]')
  expect(shell).toContain('grid-rows-2')
  expect(split).toContain("defaultSize={orientation === 'horizontal' && index === 0 ? '28rem' : undefined}")
  expect(/grid-cols-\[(\d+)rem/.exec(shell)?.[1]).toBe(/index === 0 \? '(\d+)rem'/.exec(split)?.[1])
  // 断点同样两份：CSS 那份是 `xl:` 前缀，JS 那份在 viewport.ts —— 错开会出现
  // 「并排了但还当竖排拖」这种半截状态
  expect(SRC['lib/viewport.ts']).toContain("(min-width: 80rem)")
})
```

- [ ] **Step 2: 跑确认红**

Run: `pnpm exec vitest run packages/web/test/appLayout.test.ts`
Expected: FAIL —— 四个断言都抓旧值。

- [ ] **Step 3: 改三个源文件**

`viewport.ts`：42 行 `const WIDE = '(min-width: 96rem)'` → `'(min-width: 80rem)'`；37-39 行注释「必须与 Tailwind 的 `lg` / `2xl` 逐字相同 … 默认值是 64rem 与 96rem」→「`lg` / `xl` … 默认值是 64rem 与 80rem」；文件头 12-15 行 `columns` / `rows` 两条 bullet 改成：

```
* - `columns`（≥ 80rem，Tailwind 的 `xl`）：两栏真的并排，**拖的是宽度** —— 这是主场。
*   （原先是 96rem：那是「三栏各要 22rem 才装得下一份代码块」的账，第三栏没了就不成立）
* - `rows`（≥ 64rem 的 `lg`，但不到 `xl`）：两栏叠成两行、各自滚，**拖的是高度**。
```

`PaneShell.tsx`：grid 那行 `2xl:grid-cols-[22rem_minmax(0,1fr)] 2xl:grid-rows-1` → `xl:grid-cols-[28rem_minmax(0,1fr)] xl:grid-rows-1`；文件头与行内注释里 22rem / 2xl 的说法跟上（「28rem：22rem 下参数多的端点候选值那排按钮必然换行」）。

`SplitLayout.tsx`：`'22rem'` → `'28rem'`，`defaultSize` 上方注释同步（「与 PaneShell 那份 grid 逐字对应」）。文件头「两档宽度」段的 96rem / 22rem 字样跟上。

- [ ] **Step 4: 跑 web 全量确认绿**

Run: `pnpm exec vitest run packages/web`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A packages/web
git commit -m "feat(web): 请求栏加宽到 28rem，并排断点降到 80rem —— 两栏在笔记本宽度就成立"
```

---

### Task 6: README 与全量门禁

**Files:**
- Modify: `packages/web/README.md`

**Interfaces:** 无。

- [ ] **Step 1: 改 README**

- 第 5 行主循环句：`同屏看响应体与它的类型声明` → `在「结果」栏里看响应、它的类型声明与 diff`
- 「版面」一节（8-29 行）：标题改「版面：两栏并排（外加左栏），每栏自己滚」；示意图换成：

```
┌─────────┬──────────────────┬──────────────────────────────────────┐
│ 端点     │ 请求              │ 结果                                  │
│ （搜索、 │ 参数表单          │ [响应][声明][结构][diff·N] 200·312ms  │
│  分组）  │ [发送]            │ ──────────────────────────────       │
│         │                  │ 脱敏后的 JSON（四个 tab 各自滚）        │
│ 最近     │ [集合 5]          │ [ok][新形状] 留下 丢掉 复制…  [仓库 ▸] │
└─────────┴──────────────────┴──────────────────────────────────────┘
```

第三段「一个都没删」那句改成「它们退到了动作条与「仓库」抽屉里」；「窄屏（`lg` 以下）上三栏叠成三行」→「两栏叠成两行」；「四块各自滚」保留。并补一句两栏的由来（三栏里第三栏四页只有一页说的是这一发；请求栏 22rem 装不下参数）。
- 163-173 行「『类型』那一栏的四页」一节改写成「『结果』栏的四个 tab 与仓库抽屉」：`本次`→`声明` tab（内容不变）、`已提交` / `对比`→仓库抽屉两页、`diff`→tab（判据文字平移）。
- 文件地图（240-259 行）：`App.tsx` 行「三栏 + 左栏导航」→「两栏 + 左栏导航」；`HistoryList` 行「决定右边三栏」→「决定右边两栏」；`RequestPane` 行「参数表单 / 请求集合两页 + 发送」→「参数表单 + 集合抽屉 + 发送」；删 `ResponsePane` / `TypePane` 两行，加：

```
  components/ResultPane       「结果」栏：响应 / 声明 / 结构 / diff 四个 tab + 仓库抽屉入口
  components/ResultActions    结果栏底部动作条：判定/脱敏/新形状 + 留下 / 丢掉 / 复制 / 记参数
  components/RepoDrawer       「仓库」抽屉：已提交 / 对比 两页（说的不是这一发）
```

`Result` 行「上面两栏共用的块」→「『结果』栏共用的块」。

- [ ] **Step 2: 全量门禁（八条全跑）**

Run（仓库根，逐条）:
```bash
pnpm typecheck && pnpm test && pnpm test:types && pnpm lint && pnpm deps:check && pnpm types:size && pnpm openapi:check && pnpm types:check
```
Expected: 全绿。已知基线核对：`deps:check` 恰好 12 条 warning 且无 circular；`types:check` 10 条 ⚠️；`lint` 恒有 2 条 `login.test-d.ts` 警告。任何超出基线的红都是回归，先修再提交。

- [ ] **Step 3: 提交**

```bash
git add packages/web/README.md
git commit -m "docs(web): README 跟上两栏版面 —— 结果栏四 tab、动作条、仓库抽屉"
```

---

## Self-Review 记录

- **Spec 覆盖**：A3（Task 2/3）、B3 修正版（Task 3 Step 4 + 新断言）、C1（Task 3 空状态去重 + Task 4 剩余 + 绊线）、S3（Task 3 `git mv`）、28rem / 80rem（Task 5）、footer 删除（Task 3 Step 6）、sr-only h2（Task 3 Step 1 PANES 四列）、滚动契约（Task 3 新断言）、README（Task 6）。Spec 说「`发一发请求` 恰好一处」—— 落地后该句一处不剩（活下来的是「左边填参数」），断言按 `发一发请求` 0 处 + `左边填参数` 1 处钉。
- **类型一致性**：`ResultPaneProps` / `ResultActionsProps` / `RepoDrawerProps` 三个接口在 Task 1/2/3 间只有一次定义，各自 Produces 列表一致；`defaultTab` 的四值联合与 tab id 逐字相同。
- **对账**（Task 3 Step 8）：`lazy()` 7 = `<Suspense` 7；`storage: LAYOUT_STORAGE` 2；Separator 2；App 的 `<h2` 仍恰好 2 个。
