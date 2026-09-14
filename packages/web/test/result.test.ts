/**
 * `Result.tsx` 那几块**能单独摆到任何地方去**的东西，以及**装它们的那一栏**。
 *
 * 这个文件原先叫 `outcomeCard.test.ts`，量的是一张把这些块串在一起的卡片。那张卡片删了 ——
 * 它的四块内容原先分属「响应」栏与「类型」栏（两栏合并成「结果」栏之后都进了那一栏），
 * 而卡片这个形状本身恰恰是「什么都往下堆」的成因。所以**块的判据一个字没动，
 * 「真的接上了」那几条改成对着 `ResultPane.tsx` / `SamplePane.tsx` 问。**
 *
 * **这里真的把组件渲出来**，靠 `react-dom/server` 的 `renderToStaticMarkup` —— 它随 `react-dom`
 * 一起装着，不需要 jsdom 也不需要 testing-library（vitest 跑在 node 环境，见根
 * `vitest.config.ts`）。HeroUI / react-aria-components 本来就支持 SSR，所以这条路上量到的是
 * 真的 DOM 结构，而不是「源码里有没有某个字符串」。
 *
 * 搬进分栏版面之后**渲得到的东西多了一块、少了一块**：
 *
 * - 多的是响应那块面板 —— 它现在是「结果」栏「响应」页的本体（不再藏在一个默认没选中的
 *   tab 里），于是「两个字段真的交给了 `PayloadPanel`」这件事**渲得出来**，不必只比源码字符串。
 * - 少的是 diff 那块 —— 它进了「结果」栏的 `diff` 那一页，而 `Tabs` **只渲选中的那一页**
 *   （默认停在「响应」）。所以那一块的分支仍然由直接渲 `DiffPanel` 覆盖，
 *   而「接上了」那条量的是**不点开也看得见的那部分**：tab 上那枚条数 Chip。
 *
 * 八件要钉住的事：
 *
 * 1. **有高亮时不再自己 stringify**。那条老路（`JSON.stringify(payload).slice(0, 20_000)`）
 *    白跑了 server 上每一发的 tokenizer，而 `payloadHighlight` 在整个 `src/` 里零引用。
 * 2. **截断在两条路上都说得出来**。契约（`shared/contract.ts:119-125`）要求的是「界面必须说」，
 *    而在这之前唯一会说的是 `CodeBlock`，它只被一个从未挂载的组件用着。
 * 3. **回落这条路不许自己拼 HTML**。它是纯文本 `<pre>`，转义交给 React ——
 *    `CodeBlock` 的 `dangerouslySetInnerHTML` 安全的全部理由在 server 侧的 shiki 那里。
 * 4. **diff 超过 400 条时那件事说得出来、也翻得过去**，而没超过时**一句废话都不许有** ——
 *    原先是 `diff.slice(0, 400)` 一句，第 401 条起一个字都不提。上限仍然留着（几千个 `<div>`
 *    会让页面卡住），所以要钉的是「上限内那批一条都没少 + 上限外那批说得出有多少」这一对。
 * 5. **动作区是真的 `Toolbar`**（`role="toolbar"` + 方向），而不是一个裸 div 加手写 `flex` ——
 *    左右箭头在动作之间移动这件事**渲不出来**（要真键盘），能钉的是「语义在不在」。
 *    连带钉住三种状态下各有哪些控件，以及 `busy` 只禁「留下 / 丢掉」、不禁复制。
 * 6. **动作区里只有真能做的动作，一条死控件都没有**。PRD 点名的三条（cURL / JSON path / 另存样本）
 *    一条都没做，判据是 `copyableOf` 的返回值本身 —— 按钮由它 `map` 出来，它不给就不存在；
 *    收纳它们的 `Dropdown` 也没接（两条撑不起一个菜单，而它要 18,201 字节），那条是反向绊线。
 *    而它给出的两条要**真的不受面板上限限制**：那正是这两个按钮唯一的价值。
 * 7. **「保存并共享参数」只带一句说明** —— 英文 `id` 没了（身份是 server 算的 `paramsHash`）。
 *    要钉的是三件事：空说明**在这一侧就被挡住**（全空格也算空，原生 `required` 拦不住它），
 *    表单恰好一个必填框、`<details>` 默认收着但一直在 DOM 里（SSR 量得到），
 *    以及**「生成类型」那条路一个字都没动**（它是常态：生成会自己把样本落盘）。
 *    不可保存那一份的诊断是另一半：常驻只有摘要（计数、首项、一句「下一步」），
 *    全部残留按 kind 分组进 `<details>`，「复制详情」给未截断的全文、永不含原始值。
 * 8. **这一轮新的两块：那排收据与「声明」页的类型声明。** 收据（`200 · 312 ms · 9.7 KB`）
 *    是契约新长出来的 `http`，界面不读它等于 server 白算；而「声明」页要么显示
 *    `typeSource`、要么把 `typeIssue` 说出来 —— **静默空着一页**是这两个字段互斥的那条注释
 *    正在防的事。
 * 9. **「响应」页的原始 / 样本两档（第三处无声截断的披露）。** `payload` 是裁剪 + 脱敏后的
 *    样本，全量响应在 `rawPayload`；默认显示原始、可切样本，裁了哪些数组由「已截断」Chip
 *    说出来，复制按钮跟着当前视图走 —— 这一组钉的就是这五件事的接线。
 */

import { readFileSync } from 'node:fs'

import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { DiffFile, DiffLine, HighlightedCode, JsonValue, RecordOutcome } from '../shared/contract'
import { storeNotice } from '../src/lib/storeNotice'

/**
 * 被测模块。**说明符刻意是变量**，于是 `tsc` 不去解析它们。
 *
 * 理由：`test/` 归 `tsconfig.node.json` 管（`include` 里写着），而那份**没有 `jsx`** ——
 * 它管的是 `server/` 与 `scripts/`，那两处一行 JSX 都没有。静态 import 一个 `.tsx`
 * 会让它报 `TS6142: … but '--jsx' is not set`。往那份 tsconfig 里加一行 `"jsx": "react-jsx"`
 * 就能改回静态 import，那是更好的写法 —— 只是那个文件不在这一轮的改动范围里。
 *
 * 运行时这条路与静态 import 走的是同一份模块（vitest 用 Vite 变换解析），
 * 换回去时只需要删掉这几行、把类型改成从模块本身导入。
 *
 * **三个模块**：块本身在 `Result.tsx`，查看那一栏在 `ResultPane.tsx`，
 * 处理这一份样本的那一栏（判定、保存、共享参数、诊断）在 `SamplePane.tsx`。
 */
const MODULE = '../src/components/Result'
const RESULT_PANE = '../src/components/ResultPane'
const SAMPLE_PANE = '../src/components/SamplePane'

const { copyableOf, DiffPanel, PayloadPanel, requestLabelIssue, statusOf, trimmedChipLabel } = (await import(MODULE)) as {
  /** 动作区里那两条复制。**它就是「不留死控件」这件事的判据** —— 见下面那个 describe。
   * 第二个参数是「响应」页当前那一档（原始 / 样本），省略时按样本算（老行为的默认档） */
  copyableOf: (outcome: RecordOutcome, view?: 'raw' | 'sample') => { id: string; label: string; text: string }[]
  DiffPanel: (props: { diff: DiffLine[]; diffFiles?: DiffFile[]; defaultView?: 'fields' | 'code' }) => ReactNode
  PayloadPanel: (props: { payload?: JsonValue; highlight?: HighlightedCode }) => ReactNode
  /** 「这句说明哪儿不行」。**前端那道闸就是它** —— 空标签比没标签更糟 */
  requestLabelIssue: (label: string) => string | undefined
  /** 「已截断」Chip 上那句话 —— 三种形状（一处带路径 / 根数组 / 多处）单测它本身 */
  trimmedChipLabel: (trimmed: { path: string; from: number; to: number }[]) => string
  statusOf: (outcome: RecordOutcome) => 'success' | 'warning' | 'danger'
}

const { ResultPane } = (await import(RESULT_PANE)) as {
  ResultPane: (props: {
    platform: string
    endpoint: string
    outcome?: RecordOutcome
    stored: number
    generatedRevision: number
    requestsRevision: number
    /** 「响应」页当前那一档（原始 / 样本）。状态已升到 App（「类型产出」栏与它共享这一份） */
    payloadView: 'raw' | 'sample'
    onPayloadViewChange: (view: 'raw' | 'sample') => void
    /** 测试用来选起始页的口子（`ResultPane` 那个同名字段，生产里没人传它） */
    defaultTab?: string
  }) => ReactNode
}

const { SamplePane } = (await import(SAMPLE_PANE)) as {
  SamplePane: (props: {
    outcome?: RecordOutcome
    payloadView: 'raw' | 'sample'
    endpointLabel?: string
    settled?: string
    retryable?: boolean
    busy: boolean
    stored: number
    generateLoading: boolean
    computed: boolean
    consumed: boolean
    onShapeChoiceChange: (choice: 'merge' | 'separate') => void
    onStore: (options: { mode: 'sample-only' } | { mode: 'sample-and-params'; label: string }) => Promise<void>
    onDiscard: () => Promise<void>
    onDirectionChange: (direction: 'success' | 'error') => Promise<void>
    onGenerate: () => void
  }) => ReactNode
}

/** 渲一次面板，回静态 HTML */
const render = (props: { payload?: JsonValue; highlight?: HighlightedCode }): string =>
  renderToStaticMarkup(createElement(PayloadPanel, props))

/** 一份「server 已经渲好」的高亮。`html` 是 shiki 那种形状，内容用标记串好认 */
const highlighted = (chars: number, totalChars: number): HighlightedCode => ({
  html: `<pre class="shiki shiki-themes github-light github-dark"><code><span style="--shiki-light:#005CC5">HIGHLIGHTED-BY-SERVER</span></code></pre>`,
  chars,
  totalChars
})

/** `<p>` 里那句截断提示的正文（`tabular-nums` 是它独有的类） */
const noticeOf = (html: string): string | undefined => /<p class="text-muted text-xs tabular-nums">([\s\S]*?)<\/p>/.exec(html)?.[1]

/** 回落那条路渲出来的 `<pre>` 里的正文（还带着 React 的实体转义） */
const preOf = (html: string): string | undefined => /<pre class="font-mono text-xs leading-5">([\s\S]*?)<\/pre>/.exec(html)?.[1]

/** 渲一次 diff 面板，回静态 HTML */
const renderDiff = (diff: DiffLine[]): string => renderToStaticMarkup(createElement(DiffPanel, { diff }))

/** 渲一次 diff 面板，带上「变了的文件」与起始视图（测试用来选起始档的口子） */
const renderDiffPanel = (diff: DiffLine[], diffFiles?: DiffFile[], defaultView?: 'fields' | 'code'): string =>
  renderToStaticMarkup(createElement(DiffPanel, { diff, diffFiles, defaultView }))

/**
 * 造 `count` 条差异。
 *
 * `text` 里带序号并以 `#` 收尾，于是「第几条渲出来了」可数可查（`L1#` 不会命中 `L10#`）；
 * `tag` 让多文件那条用例分得清哪条属于哪个文件。**正负交替**，于是每组的两个计数都不是 0。
 */
const diffLines = (count: number, file = 'bilibili/VideoInfo/VideoInfo_V0.ts', tag = 'L'): DiffLine[] =>
  Array.from({ length: count }, (_, index): DiffLine => ({
    file,
    sign: index % 2 === 0 ? '+' : '-',
    text: `${tag}${index}#`,
    kind: index % 2 === 0 ? 'added' : 'removed',
    path: `${tag}${index}#`,
    shape: true
  }))

/** 那句截断提示。三个数字一次抓齐 —— 「说出来的」与「渲出来的」对不上时立刻红 */
const TRUNCATED = /显示了前 (\d+) 条差异，共 (\d+) 条 —— 还有 (\d+) 条没展开/

/** 一份「能处理、有响应也有 diff」的结果 —— 四个控件都齐的那种 */
const settleable = (extra: Partial<RecordOutcome> = {}): RecordOutcome => ({
  ok: true,
  verdict: { kind: 'accept', reason: '判定通过' },
  pendingId: 'pending-1',
  payload: { data: { title: '猫与狗' } },
  diff: diffLines(3),
  shapeChanged: true,
  ...extra
})

/**
 * 渲一次「结果」栏。
 *
 * `outcome` 可以是 `undefined`（还没发过那一档），所以它是显式的第一个参数而不是塞进 `extra` ——
 * 那一档要钉的是「显示一行提示，不是一块空面板」。
 *
 * **这一栏只管查看**（四个 tab + 收据 + 生成 + 仓库入口）—— 处理这一份样本的动作全部在
 * `SamplePane`（{@link samplePaneOf}）。「哪个 tab 装哪一样」是版面的事，判据在 `appLayout.test.ts`。
 */
const paneOf = (outcome?: RecordOutcome, props: { stored?: number; payloadView?: 'raw' | 'sample' } = {}): string => {
  const shared = {
    platform: 'bilibili',
    endpoint: 'Comments',
    outcome,
    stored: props.stored ?? 3,
    generatedRevision: 0,
    requestsRevision: 0,
    payloadView: props.payloadView ?? ('sample' as const),
    onPayloadViewChange: () => undefined
  }
  return renderToStaticMarkup(createElement(ResultPane, shared))
}

/**
 * 渲一次「样本处理」栏。
 *
 * 空态（`outcome` 为 `undefined`）是显式第一档：它在首发之前就占着那 30%，
 * 要钉的是「一句空态、没有死按钮」。
 */
const samplePaneOf = (
  outcome?: RecordOutcome,
  props: {
    settled?: string
    busy?: boolean
    retryable?: boolean
    payloadView?: 'raw' | 'sample'
    stored?: number
    generateLoading?: boolean
    computed?: boolean
    consumed?: boolean
  } = {}
): string =>
  renderToStaticMarkup(
    createElement(SamplePane, {
      outcome,
      payloadView: props.payloadView ?? 'sample',
      endpointLabel: 'bilibili/Comments',
      settled: props.settled,
      retryable: props.retryable,
      busy: props.busy ?? false,
      stored: props.stored ?? 3,
      generateLoading: props.generateLoading ?? false,
      computed: props.computed ?? false,
      consumed: props.consumed ?? false,
      onShapeChoiceChange: () => undefined,
      onStore: () => Promise.resolve(),
      onDiscard: () => Promise.resolve(),
      onDirectionChange: () => Promise.resolve(),
      onGenerate: () => undefined
    })
  )

/**
 * 渲一次「结果」栏，选起始页（`defaultTab` 那个口子）。
 *
 * 那两个 revision 给 0：它们转送给仓库抽屉，而抽屉整只在 lazy 边界后面 ——
 * 这条路上渲出来的是那颗 fallback 按钮，里头的面板连挂载都不会发生。
 */
const resultPaneOf = (outcome?: RecordOutcome, defaultTab?: string): string =>
  renderToStaticMarkup(
    createElement(ResultPane, {
      platform: 'bilibili',
      endpoint: 'Comments',
      outcome,
      stored: 3,
      generatedRevision: 0,
      requestsRevision: 0,
      payloadView: 'sample' as const,
      onPayloadViewChange: () => undefined,
      defaultTab
    })
  )

describe('判定状态色', () => {
  it('direction=error 是业务失败但可入库，用 warning 而不是 success', () => {
    expect(statusOf({ ok: true, verdict: { kind: 'store', reason: '内容不重要' }, direction: 'error' })).toBe('warning')
  })

  it('direction=success 压过旧 store-as-error 的兼容推断，仍用 success', () => {
    expect(statusOf({ ok: true, verdict: { kind: 'store-as-error', reason: '旧样本' }, direction: 'success' })).toBe('success')
  })
})

describe('有高亮就用高亮，不再自己 stringify', () => {
  it('渲的是 server 那份 HTML，而 `payload` 一个字都没被 stringify 出来', () => {
    const html = render({ payload: { title: '猫与狗', cid: 12345 }, highlight: highlighted(64, 64) })
    expect(html).toContain('HIGHLIGHTED-BY-SERVER')
    // 老路会把这两个值渲进 `<pre>`。它们不在，说明走的不是老路
    expect(html).not.toContain('猫与狗')
    expect(html).not.toContain('12345')
    // 双主题变量原样进了 DOM —— 配色靠它 + `CodeBlock` 里那两条 CSS 规则
    expect(html).toContain('--shiki-light:')
  })

  it('**`totalChars > chars` 时界面把截掉的量说出来** —— 契约要的就是这一句', () => {
    const notice = noticeOf(render({ payload: { a: 1 }, highlight: highlighted(20_000, 53_000) }))
    expect(notice).toBeDefined()
    expect(notice).toContain('20000')
    expect(notice).toContain('33000')
  })

  it('两个计数相等时没有那句提示 —— 不许对着没截断的响应说「后面还有」', () => {
    expect(noticeOf(render({ payload: { a: 1 }, highlight: highlighted(64, 64) }))).toBeUndefined()
  })
})

describe('没有高亮时回落成纯文本', () => {
  it('渲的是 `JSON.stringify(payload, null, 2)`，缩进与原来那句一致', () => {
    const payload = { data: { title: '猫与狗', list: [1, null, true] } }
    const html = render({ payload })
    // 与老路逐字节相同（React 会把 `"` 转成实体，所以比的是转义后的那份）
    expect(html).toContain(JSON.stringify(payload, null, 2).replaceAll('"', '&quot;'))
    expect(html).toContain('<pre class="font-mono text-xs leading-5">')
  })

  it('**payload 也没有时显示 `null`**，不是白屏也不是抛 —— 判定拒掉的那份走的就是这条', () => {
    const html = render({})
    expect(html).toContain('null')
    expect(noticeOf(html)).toBeUndefined()
  })

  it('**回落这条路上截断照样说得出来**，而且两个数加起来等于原文长度', () => {
    // 一份长到超过回落上限的响应。真实来源是「server 比浏览器包旧」那种情况下的大响应
    const payload = { list: Array.from({ length: 4000 }, (_, index) => `第 ${index} 条`) }
    const text = JSON.stringify(payload, null, 2)
    expect(text.length).toBeGreaterThan(20_000)
    const html = render({ payload })
    const notice = noticeOf(html)
    expect(notice).toBeDefined()
    const shown = Number(/前 (\d+) 个字符/.exec(notice!)![1])
    const rest = Number(/还有 (\d+) 个/.exec(notice!)![1])
    // 说出来的数必须是真的：显示了多少 + 还剩多少 = 原文一共多少
    expect(shown + rest).toBe(text.length)
    // 而且 DOM 里真的只有那么多 —— 提示与实际渲出来的量不许各说各话
    expect(preOf(html)).toBe(text.slice(0, shown).replaceAll('"', '&quot;'))
  })

  it('**回落不拼 HTML**：响应正文里的 `<script>` / `<img onerror>` 出来是实体', () => {
    // 这条是「为什么不把纯文本包成假的 HighlightedCode 喂给 CodeBlock」的判据：
    // 那个组件走 dangerouslySetInnerHTML，转义是 server 侧 shiki 的保证，不是这一侧的
    const html = render({ payload: { evil: '</script><img onerror=alert(1) src=x>' } })
    expect(html).not.toContain('<img')
    expect(html).not.toContain('</script>')
    expect(html).toContain('&lt;img onerror=alert(1) src=x&gt;')
  })
})

describe('这块面板真的接在「结果」栏的「响应」页上', () => {
  /**
   * **这一组不再只能读源码。** 原先响应那块藏在卡片一个默认没选中的 `Tabs.Panel` 里，
   * 「payload 那页用的是谁」在 SSR 产物里看不见，所以只能比源码字符串。
   * 分栏之后它是「结果」栏「响应」页的本体 —— 渲一次这一栏，server 那份 HTML 直接在里面。
   *
   * 而这仍然是这一轮之前那个 bug 的形状：`CodeBlock` 早就会说截断，却只被一个从未挂载的
   * 组件（`GeneratedPanel`）用着，于是那句承诺在可达界面上一处都没兑现。
   * **造好但没接线不报错**，所以这一组存在 —— 只是判据从「源码里有那一行」升级成了「渲得出来」。
   */
  const source = readFileSync(new URL('../src/components/ResultPane.tsx', import.meta.url), 'utf8')

  it('这一栏把两个字段都交给了 `PayloadPanel`，而且渲出来的是 server 那份高亮', () => {
    const html = paneOf(settleable({ payloadHighlight: highlighted(64, 64) }))
    expect(html).toContain('HIGHLIGHTED-BY-SERVER')
    // 老路会把 payload 里那个值渲进 `<pre>`。它不在，说明走的不是老路
    expect(html).not.toContain('猫与狗')
    // `fill` 而不是按视口算的 `maxHeight={PANE_CODE}`：那一栏整屏高，高度由格子决定，
    // 所以代码块填满那一格（`PANE_CODE` 只剩「diff」那一页这一个读者）
    expect(source).toContain('<PayloadPanel payload={outcome.payload} highlight={outcome.payloadHighlight} fill />')
  })

  it('**截断那句话真的到了屏幕上** —— 契约要的是「界面必须说」，而这一栏就是那个界面', () => {
    expect(paneOf(settleable({ payloadHighlight: highlighted(20_000, 53_000) }))).toContain('33000')
  })

  it('老那条「自己 stringify」的路只剩回落，不再是主渲染分支', () => {
    // 主路现在是 Monaco（`JsonViewer`，懒加载），它吃的是 `JSON.stringify(body, null, 2)`
    //（`body` = 当前那一档的值：原始或样本）—— 所以 `stringify` 这个词**必须**在这个文件里
    // 出现，那一条断言反过来了。要钉的是「这一栏不再自己拼 `<pre>`」：高亮与折叠都由别人做
    expect(source).toContain('JSON.stringify(body, null, 2)')
    expect(source).not.toContain('<pre')
    // 而 Monaco 走当前那一档的正文而不是那份被 server 截过的高亮，是这条路的收益之一
    expect(source).toContain('<JsonViewer text={source} />')
  })

  it('**还没发过时是一行提示，不是一块空面板**', () => {
    const html = paneOf(undefined)
    expect(html).toContain('左边填参数')
    // 也没有一个点了没用的动作区
    expect(html).not.toContain('role="toolbar"')
  })
})

/* ------------------------------------------------------------------ 原始 / 样本两档 */

/**
 * 「响应」页的**第三处无声截断披露**（PRD 阶段 3）：`payload` 是 `trimSample` 截过再脱敏的
 * 样本（每个数组只剩前 3 条），全量响应在 `rawPayload` —— 默认显示原始、可切样本。
 *
 * 这里能钉的是**静态可见的那一半**：默认档显示的是哪一份、切换控件在不在、选中态对不对、
 * `rawPayload` 缺失时回落。**「点一下切到样本档」渲不出来** —— `renderToStaticMarkup`
 * 没有事件循环，补它需要 jsdom + 点击（那是单独要拍的事，见文件头）；样本档的**内容**由
 * `copyableOf(…, 'sample')` 的纯函数判据、以及 `SamplePane` 把当前视图传进去那条接线
 * 判据补上。视图状态已升到 `App`（样本处理区与这一栏共享同一份），这一栏只是消费。
 */
describe('「响应」页的原始 / 样本两档', () => {
  /** 原始档有而样本档没有的标记（`RAW-ONLY`），与反过来的那个 —— 「显示的是哪一份」靠它们判 */
  const RAW_BODY: JsonValue = { result: 1, data: { title: 'RAW-ONLY', list: [1, 2, 3, 4, 5, 6, 7] } }
  const SAMPLE_BODY: JsonValue = { data: { title: 'SAMPLE-ONLY', list: [1, 2, 3] } }

  it('**默认显示原始** —— 屏幕上那份是全量响应，不是被截到 3 条的样本', () => {
    // 静态渲的是 lazy Monaco 的 fallback：原始档没有 server 高亮（shiki 只渲了样本那份），
    // 走 `PayloadPanel` 的纯文本回落 —— 同一档的正文，于是「显示的是哪一份」直接可判。
    // 「默认原始」本身是 App 那份被提升的视图状态的初值（换一份结果就重置回 `raw`），
    // 这一栏只消费传下来的那一档 —— 这里给它 `raw` 就是默认那一帧的样子
    const html = paneOf(settleable({ rawPayload: RAW_BODY, payload: SAMPLE_BODY }), { payloadView: 'raw' })
    expect(html).toContain('RAW-ONLY')
    expect(html).not.toContain('SAMPLE-ONLY')
  })

  it('两档切换真的在：一颗 radiogroup 两颗 radio，原始那颗选中', () => {
    const html = paneOf(settleable({ rawPayload: RAW_BODY, payload: SAMPLE_BODY }), { payloadView: 'raw' })
    expect(html).toContain('aria-label="响应显示哪一份"')
    // react-aria 把 ToggleButton 渲成 radio（单选、必须有一颗选中）—— 选中态是这一条
    // 唯一静态可判的「默认原始」，切过去的那个动作本身见这组 describe 头上的注释
    expect(/role="radio"[^>]*aria-checked="true"[^>]*>原始</.test(html)).toBe(true)
    expect(/role="radio"[^>]*aria-checked="false"[^>]*>样本</.test(html)).toBe(true)
  })

  it('**rawPayload 缺失时回落样本视图，切换整个不渲** —— 旧 server / `compute` / 一发都没打出去', () => {
    const html = paneOf(settleable({ payload: SAMPLE_BODY, payloadHighlight: highlighted(64, 64) }))
    // 样本那份照旧：server 高亮还在、内容还是 payload
    expect(html).toContain('HIGHLIGHTED-BY-SERVER')
    expect(html).not.toContain('RAW-ONLY')
    // 而没有第二档可切的那些路上，切换控件整个不存在（不是禁用 —— 禁用是个点了没反应的控件）
    expect(html).not.toContain('role="radio"')
    expect(html).not.toContain('响应显示哪一份')
  })
})

/**
 * 「已截断」Chip：样本比原始少这件事必须有人在版面上说出来。
 * 数据由 server 算好（`payloadTrimmed`，跟着 payload 那一层走 —— `outcome.test.ts` 钉着），
 * 这里钉它到屏幕上的那一步：一处说全（`emoji_list 371→3`）、多处报处数、
 * 一处都没截 / 旧 server 没这个字段时一个字都不占。
 */
describe('「已截断」Chip', () => {
  it('一处裁剪就把 `from→to` 说到 Chip 上 —— 不点开 tooltip 也看得见截到多少', () => {
    expect(samplePaneOf(settleable({ payloadTrimmed: [{ path: 'data.emoji_list', from: 371, to: 3 }] }))).toContain(
      '已截断 data.emoji_list 371→3'
    )
  })

  it('多处时 Chip 只报处数 —— 逐条明细进 tooltip（`Tooltip.Content` 只在打开时进 DOM，静态渲不出来）', () => {
    expect(
      samplePaneOf(
        settleable({
          payloadTrimmed: [
            { path: 'a', from: 10, to: 3 },
            { path: 'b', from: 9, to: 3 }
          ]
        })
      )
    ).toContain('已截断 2 处')
  })

  it('一个数组都没截（空数组）/ 旧 server 没这个字段 —— Chip 都不出现', () => {
    expect(samplePaneOf(settleable({ payloadTrimmed: [] }))).not.toContain('已截断')
    expect(samplePaneOf(settleable())).not.toContain('已截断')
  })

  it('根数组（`path` 为空）只报条数 —— 空路径拼进去会多出一个说不清的空格', () => {
    expect(trimmedChipLabel([{ path: '', from: 371, to: 3 }])).toBe('已截断 371→3')
    expect(trimmedChipLabel([{ path: 'emoji_list', from: 371, to: 3 }])).toBe('已截断 emoji_list 371→3')
    expect(
      trimmedChipLabel([
        { path: 'a', from: 10, to: 3 },
        { path: 'b', from: 9, to: 3 }
      ])
    ).toBe('已截断 2 处')
  })
})

/** 一条结构化的字段差异。四类都能造，默认算形状变化 */
const fieldDiff = (extra: Partial<DiffLine> & Pick<DiffLine, 'kind' | 'path'>): DiffLine => ({
  file: 'bilibili/VideoInfo/VideoInfo_V0.ts',
  sign: extra.kind === 'removed' ? '-' : '+',
  text: `${extra.path} 变了`,
  shape: true,
  ...extra
})

/** 一份「变了的文件」：左右代码对比读的就是这个 */
const diffFile = (extra: Partial<DiffFile> = {}): DiffFile => ({
  file: 'bilibili/VideoInfo/VideoInfo_V0.ts',
  before: ['export type VideoInfo_V0 = {', '  desc: string', '}'].join('\n'),
  after: ['export type VideoInfo_V0 = {', '  desc: string | null', '  fresh: boolean', '}'].join('\n'),
  changes: 2,
  ...extra
})

/** 四类各一条，覆盖筛选与摘要 */
const mixedFieldDiff = (): DiffLine[] => [
  fieldDiff({ kind: 'added', path: 'data.fresh', after: 'boolean' }),
  fieldDiff({ kind: 'removed', path: 'data.gone', before: 'number' }),
  fieldDiff({ kind: 'type', path: 'data.desc', before: 'string', after: 'string | null' }),
  fieldDiff({ kind: 'optionality', path: 'data.title', before: '必需', after: '可选' })
]

/**
 * 字段变更列表 —— **这一页的默认视图**。
 *
 * 原先这块面板是「几百行带 `+/-` 的等宽文本」，人得逐行读完才知道「到底哪个字段怎么变了」。
 * 这一组钉的是那笔阅读成本被换掉的四件事：顶上一行摘要（四类各多少）、按类筛选、
 * 字段路径与「前 → 后」分列显示、以及默认就落在这个视图上。
 */
describe('字段变更列表（默认视图）', () => {
  it('顶部摘要按四类各报一个数 —— 不用数行也知道这一发改了什么', () => {
    const html = renderDiffPanel(mixedFieldDiff())
    expect(html).toContain('新增 1')
    expect(html).toContain('删除 1')
    expect(html).toContain('类型 1')
    expect(html).toContain('可选性 1')
  })

  it('每条差异把**路径**与**前 → 后**分开渲，而不是一句拼好的话', () => {
    const html = renderDiffPanel([fieldDiff({ kind: 'type', path: 'data.desc', before: 'string', after: 'string | null' })])
    expect(html).toContain('data.desc')
    // 两侧各自成一格：`string` 与 `string | null` 都在，而且有一个明确的方向符
    expect(html).toContain('string | null')
    expect(html).toContain('→')
  })

  it('提供按类筛选的控件（全部 / 新增 / 删除 / 类型 / 可选性）', () => {
    const html = renderDiffPanel(mixedFieldDiff())
    expect(html).toContain('aria-label="按变化类型筛选"')
    for (const label of ['全部', '新增', '删除', '类型', '可选性']) expect(html).toContain(label)
  })

  it('非形状变化（溯源注释那类）默认不占版面，但说得出有多少条', () => {
    const noise = [
      fieldDiff({ kind: 'line', path: '', text: '// 证据：2 份样本', shape: false, sign: '+' }),
      fieldDiff({ kind: 'added', path: 'data.fresh', after: 'boolean' })
    ]
    const html = renderDiffPanel(noise)
    expect(html).not.toContain('证据：2 份样本')
    expect(html).toContain('1 条非形状变化')
  })

  it('默认落在字段列表上，而代码对比是另一个可切换的视图', () => {
    const html = renderDiffPanel(mixedFieldDiff(), [diffFile()])
    expect(html).toContain('aria-label="diff 视图"')
    expect(html).toContain('字段变化')
    expect(html).toContain('代码对比')
    // 默认那一档是字段列表：路径在、而完整源码那一侧的行还没渲
    expect(html).toContain('data.desc')
    expect(html).not.toContain('export type VideoInfo_V0 = {')
  })
})

/**
 * 左右代码对比 —— 与字段列表**同源**的第二个视图（`RecordOutcome.diffFiles`）。
 *
 * 判据集中在三件事上：两侧是完整源码而不是摘要、旧 / 新两栏都标明白、变化的行有强调。
 * 「同步滚动」是运行时行为（两个容器的 `scrollTop` 互相跟随），静态渲不出来，
 * 所以那一条读源码断（同这个文件里 tab 切换那一组的做法）。
 */
describe('左右代码对比', () => {
  it('两侧渲完整源码，并标明哪边是旧、哪边是新', () => {
    const html = renderDiffPanel(mixedFieldDiff(), [diffFile()], 'code')
    expect(html).toContain('变化前')
    expect(html).toContain('变化后')
    expect(html).toContain('desc: string | null')
    expect(html).toContain('fresh: boolean')
  })

  it('变化的行有强调，没变的行不上色 —— 否则整块都是颜色等于没有重点', () => {
    const html = renderDiffPanel(mixedFieldDiff(), [diffFile()], 'code')
    expect(html).toContain('bg-success-soft')
    expect(html).toContain('bg-danger-soft')
  })

  it('多个文件时给一个文件切换控件，一次只读一个文件', () => {
    const files = [diffFile(), diffFile({ file: 'bilibili/VideoInfo/index.ts', before: '', after: 'export type X = 1', changes: 1 })]
    const html = renderDiffPanel(mixedFieldDiff(), files, 'code')
    expect(html).toContain('aria-label="选择要对比的产物文件"')
    expect(html).toContain('bilibili/VideoInfo/index.ts')
  })

  it('新文件那一侧说清「这个文件之前不存在」，而不是显示一片空白', () => {
    const html = renderDiffPanel([fieldDiff({ kind: 'added', path: 'x', after: 'number' })], [diffFile({ before: '', changes: 1 })], 'code')
    expect(html).toContain('这个文件之前不存在')
  })

  it('旧 server 没有 `diffFiles` 时，代码对比这一档整个不出现（不留死控件）', () => {
    const html = renderDiffPanel(mixedFieldDiff())
    expect(html).not.toContain('代码对比')
  })

  it('两栏并排是桌面档，窄屏叠成上下 —— 同步滚动是运行时行为，读源码断', () => {
    const source = readFileSync(new URL('../src/components/Result.tsx', import.meta.url), 'utf8')
    expect(source).toMatch(/grid-cols-1[^'"]*lg:grid-cols-2/)
    expect(source).toContain('scrollTop')
  })
})

describe('diff 那处硬截断有了出口', () => {
  it('**超过上限时把截掉的量说出来**，而且显示的 + 剩下的 = 总数', () => {
    const found = TRUNCATED.exec(renderDiff(diffLines(1000)))
    expect(found).not.toBeNull()
    const [shown, total, rest] = found!.slice(1).map(Number)
    expect(shown).toBe(400)
    expect(total).toBe(1000)
    // 三个数字自己对得上 —— 这一条红了说明界面在报一个假的量
    expect(shown! + rest!).toBe(total)
  })

  it('**刚好没超过上限时那句话不出现** —— 不许每张卡片都挂一句「后面还有」', () => {
    const html = renderDiff(diffLines(400))
    expect(TRUNCATED.test(html)).toBe(false)
    expect(html).not.toContain('再看')
    expect(html).not.toContain('没展开')
    // 而且这 400 条一条都没少
    expect(html.match(/L\d+#/g)).toHaveLength(400)
    expect(html).toContain('L399#')
  })

  it('**上限内那 400 条一条都没少**，第 401 条不在 DOM 里', () => {
    const html = renderDiff(diffLines(1000))
    // 别为了做出口把可见的那批也切了：数量、边界、两种上色都在
    expect(html.match(/L\d+#/g)).toHaveLength(400)
    for (const index of [0, 1, 200, 398, 399]) expect(html).toContain(`L${index}#`)
    expect(html).not.toContain('L400#')
    expect(html).toContain('bg-success-soft')
    expect(html).toContain('bg-danger-soft')
  })

  it('出口是真的 `<button>`（键盘能到），数字变了读屏也知道', () => {
    const html = renderDiff(diffLines(1000))
    // 不是挂了 onClick 的 div：react-aria 的 Button 渲出来就是 `<button>`，天生能 Tab 能回车
    expect(/<button[^>]*>[\s\S]*?再看 400 条[\s\S]*?<\/button>/.test(html)).toBe(true)
    // 状态变化要能被念出来（容器在按之前就存在 —— 读屏只念变化，晚挂上去的区域不会念），
    // 数字用等宽数位（一批批展开时那三个数字不会跳着变宽）。两个前瞻是为了不依赖属性顺序
    expect(/<p(?=[^>]*aria-live="polite")(?=[^>]*tabular-nums)[^>]*>/.test(html)).toBe(true)
  })

  it('剩下的不足一批时按钮说的是剩下的**准数**，不是那个上限', () => {
    // 500 条 ⇒ 显示 400、剩 100：这时候写「再看 400 条」是在骗人
    expect(renderDiff(diffLines(500))).toContain('看完剩下的 100 条')
  })

  it('**窗口只切逐条，文件与每个文件的条数全都在** —— 没展开的文件也说得出自己有多少条', () => {
    const html = renderDiff([
      ...diffLines(500, 'bilibili/Comments/Comments_V0.ts', 'A'),
      ...diffLines(3, 'bilibili/Comments/index.ts', 'B'),
      ...diffLines(2, 'bilibili/Comments/guards.ts', 'C')
    ])
    // 三个文件的路径都在「按文件看」那一块（默认折叠，但 SSR 下 <details> 内容仍在 DOM 里）
    expect(html).toContain('bilibili/Comments/Comments_V0.ts')
    expect(html).toContain('bilibili/Comments/index.ts')
    expect(html).toContain('bilibili/Comments/guards.ts')
    // 窗口内那 400 条都来自第一个文件，后两个文件的路径条目本身不该被当成「没展开的行」
    expect(html).not.toContain('B0#')
    expect(html).not.toContain('C0#')
    // **计数数的是全部，不是窗口内的**：500 条里只渲了 400 条，但「这个文件一共变了 500 处」
    // 在「按文件看」里照样说得出来
    expect(html).toContain('新增 250 / 删除 250')
    expect(html).toContain('新增 2 / 删除 1')
  })

  it('一条差异都没有时还是那句「类型没有变化」，出口控件不出现', () => {
    const html = renderDiff([])
    expect(html).toContain('类型没有变化')
    expect(html).not.toContain('<button')
    expect(TRUNCATED.test(html)).toBe(false)
  })
})

/**
 * diff 那块接在「结果」栏的 `diff` 那一页上。
 *
 * **这一组量得到的东西比原先少一半，而少掉的那半是刻意的。** 原先 diff 是卡片默认选中的那一页，
 * 渲一次卡片，截断提示与出口按钮都在产物里；现在它是四个 tab 里的最后一页，而 `Tabs`
 * **只渲选中的那一页** —— 同一条理由也是仓库那两页搬进抽屉后省下 104 KB 的原因
 * （`lazy.test.ts` 那侧钉着）。
 *
 * 于是判据分两路：面板自己的分支由上面那一组直接渲 `DiffPanel` 覆盖（一条没少），
 * 而这里量的是**不点开也看得见的那部分** —— tab 上那枚条数 Chip，加一条读源码的接线判据。
 * 「点开 diff 那页看到的是不是这块面板」渲不出来（要真的点一下 tab），所以那一步只能读源码。
 */
describe('diff 那块面板真的接在「结果」栏的「diff」页上', () => {
  const source = readFileSync(new URL('../src/components/ResultPane.tsx', import.meta.url), 'utf8')

  it('`diff` 那一页装的就是 `DiffPanel`，高度上限吃这一栏那个常量', () => {
    expect(source).toMatch(
      /<Tabs\.Panel id="diff" className=\{PANE_BODY\}>\s*<DiffPanel diff=\{diff\} diffFiles=\{outcome\?\.diffFiles\} maxHeight=\{PANE_CODE\} \/>/
    )
    // 空数组是常态（同形样本），所以它照样要渲 —— 那句「类型没有变化」由面板自己说
    expect(source).toContain('const diff = outcome?.diff ?? []')
  })

  it('**条数挂在 tab 上：不点开也知道这一发有没有改动产物**', () => {
    const html = resultPaneOf(settleable({ diff: diffLines(1000) }))
    // 那枚 Chip 报的是**总数**，与面板里那句提示同一个数 —— 一处报 1000 另一处报 400 是这条要挡的
    expect(html).toMatch(/<span class="chip__label tabular-nums"[^>]*>1000</)
    expect(html).toContain('diff')
  })

  it('**0 条时不渲那枚 Chip**，而 tab 本身还在 —— 「diff 0」是句废话', () => {
    const html = resultPaneOf(settleable({ diff: [] }))
    expect(html).toMatch(/data-key="diff"/)
    expect(html).not.toMatch(/<span class="chip__label tabular-nums"[^>]*>0</)
  })
})

/**
 * 「声明」页：**这一发响应自己的类型声明**，也是新长出来的那一块。
 *
 * 界面原先能回答「录了这份样本，产物文件会变成什么样」（diff），却答不出最直接的那个问题 ——
 * 「刚打回来的这段 JSON，类型是什么」。数据来自 `RecordOutcome.typeSource`（server 侧
 * `declare.ts` 渲好，`declare.test.ts` 钉着那一侧），这里钉的是**三档都说得出话**：
 * 有声明就显示声明，生成失败就把失败说出来，两个字段都没有就说「没有类型声明」。
 *
 * 中间那一档是关键：契约里 `typeIssue` 与 `typeSource` 互斥就是为了那一句，
 * 而**静默空着一页**是它正在防的事 —— 少一块面板必须有人说出来。
 *
 * 这一页只有从 `defaultTab` 那个口子才渲得出来（`Tabs` 只渲选中的那一页，而默认停在
 * 「响应」）—— 生产里没人传它，见 `ResultPane` 那个 prop 上的注释。
 */
describe('「结果」栏的「声明」页', () => {
  const typeSource: HighlightedCode = {
    html: `<pre class="shiki"><code><span style="--shiki-light:#005CC5">export type Comments_V0 = { }</span></code></pre>`,
    chars: 30,
    totalChars: 30
  }

  it('有 `typeSource` 就渲它（`defaultTab` 选到这一页）', () => {
    const html = resultPaneOf(settleable({ typeSource }), 'declaration')
    expect(html).toContain('export type Comments_V0')
    expect(html).toMatch(
      /data-key="declaration"[^>]*data-selected="true"|aria-selected="true"[^>]*aria-controls="[^"]*tabpanel-declaration"/
    )
    // 双主题变量原样进了 DOM —— 与响应那块同一条路（server 渲好，这一侧一行 tokenizer 都不跑）
    expect(html).toContain('--shiki-light:')
  })

  it('**生成失败要说出来**，不是让这一页静默空着', () => {
    const html = resultPaneOf(settleable({ typeIssue: '生成这一份的类型时出错了：炸给你看' }), 'declaration')
    expect(html).toContain('炸给你看')
    // 是个警告色的句子，而不是一块空白 —— 「少了一块面板」本身就是要说的信息
    expect(html).toContain('text-warning-soft-foreground')
  })

  it('两个字段互斥：有声明的那一份不该同时挂一句错误', () => {
    // 契约上那句「非空 ⇒ 另一个不在」由 server 兜（`declare.test.ts`），这一侧的判据是
    // 渲染分支的先后：`typeSource` 在就只渲它
    const html = resultPaneOf(settleable({ typeSource, typeIssue: '不该被看见的那句' }), 'declaration')
    expect(html).toContain('export type Comments_V0')
    expect(html).not.toContain('不该被看见的那句')
  })

  it('两个字段都没有的那一份（旧 server）说「没有类型声明」，不静默空着', () => {
    expect(resultPaneOf(settleable(), 'declaration')).toContain('这一份没有类型声明')
  })

  it('四页的顺序 = 前三页回答「是什么」，diff 回答「要不要留它」', () => {
    const html = resultPaneOf(settleable({ typeSource }))
    const order = [...html.matchAll(/data-key="(response|declaration|structure|diff)"/g)].map((hit) => hit[1])
    expect([...new Set(order)]).toEqual(['response', 'declaration', 'structure', 'diff'])
  })
})

describe('生成类型归「类型产出」栏所有', () => {
  const buttonOf = (html: string): string => {
    const at = html.indexOf('>生成类型<')
    if (at < 0) return ''
    return html.slice(html.lastIndexOf('<button', at), at)
  }
  const requestSource = readFileSync(new URL('../src/components/RequestPane.tsx', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  it('**结果栏与请求栏都不再拥有生成入口** —— 它跟着「留下还是丢掉」那个决定走', () => {
    expect(requestSource).not.toContain('生成类型')
    expect(paneOf(settleable({ http: { status: 200, durationMs: 12, bytes: 300 } }))).not.toContain('>生成类型<')
  })

  it('生成按钮落在「类型产出」栏里', () => {
    expect(samplePaneOf(settleable())).toContain('>生成类型<')
  })

  it('**零样本不再禁用它** —— 生成会先把当前这一发落盘，所以「还没有样本」不是拦它的理由', () => {
    expect(buttonOf(samplePaneOf(settleable(), { stored: 0 }))).not.toContain('disabled=""')
  })

  it('generate 自己 pending；别的 busy 只禁用而不转圈', () => {
    expect(buttonOf(samplePaneOf(settleable(), { busy: true, generateLoading: true }))).toContain('data-pending="true"')
    const otherBusy = buttonOf(samplePaneOf(settleable(), { busy: true }))
    expect(otherBusy).toContain('disabled=""')
    expect(otherBusy).not.toContain('data-pending')
  })

  it('computed 端点不显示生成类型 —— 那种端点没有响应可入库', () => {
    expect(samplePaneOf(settleable(), { computed: true })).not.toContain('>生成类型<')
  })
})

/* ------------------------------------------------------------------ 动作区 */

/**
 * 动作区那一段 HTML（`role="toolbar"` 那个元素，**从它自己的 `<div` 起**）。
 *
 * 从 `<div` 起而不是从 `role="toolbar"` 起：属性顺序不由这一侧决定，`aria-label` 实际排在
 * `role` **前面** —— 按 role 的位置往后切会把它切掉。
 *
 * 切到第一个 `</div>` 为止是安全的：这里面只有 `<button>`，而按钮里不套 div ——
 * 那几个 `Tooltip` 包装**不渲任何元素**（内容只在打开时才进 DOM，见下面那条注释）。
 * 哪天动作区里真的多了一层 div，这个函数会切短，那时该改的是它而不是断言。
 * 整块不存在时回 undefined —— 「一个动作都没有时没有 toolbar」就是靠这一档判的。
 */
const toolbarOf = (html: string): string | undefined => {
  const at = html.indexOf('role="toolbar"')
  return at === -1 ? undefined : html.slice(html.lastIndexOf('<div', at), html.indexOf('</div>', at))
}

/**
 * 组件从 `@heroui/react` 取的那串名字。
 *
 * **两条「没接某个组件」的用例靠它**，而它们刻意不按「源码里没有这个词」判：不接的理由都写在
 * 注释里（`Dropdown` 那 18,201 字节、`TextArea` 那两处退步），那种判据会被自己的注释顶红。
 */
const importedFrom = (source: string): string => /import \{([^}]*)\} from '@heroui\/react'/.exec(source)![1]!

describe('动作区是真的 Toolbar', () => {
  it('**`role="toolbar"` 与方向都在**，四个动作都在这一组里', () => {
    const bar = toolbarOf(samplePaneOf(settleable()))
    expect(bar).toBeDefined()
    // 方向是 react-aria 给的（左右箭头 vs 上下箭头由它决定）—— 手写 div 拿不到这一对属性
    expect(bar).toContain('aria-orientation="horizontal"')
    expect(bar).toContain('aria-label="这份结果的动作"')
    for (const label of ['生成类型', '丢掉']) expect(bar).toContain(label)
    // 两条复制是**写着字的按钮**（不是一个「⋯」图标）。两栏之后按钮上只剩一个短词 ——
    // 「完整多少字符 / 全部多少条」那个量搬进了 tooltip，因为那一排只有一行的宽度。
    // **那个量的判据因此落在 `copyableOf` 的 label 上**（下一个 describe）：
    // `Tooltip.Content` 只在打开时才进 DOM，而这条路上没有 hover 也没有事件循环
    expect(bar).toContain('复制 JSON')
    expect(bar).toContain('复制 diff')
  })

  it('四个动作都是真 `<button>`，一个都不是挂了 onClick 的 div', () => {
    const bar = toolbarOf(samplePaneOf(settleable()))!
    expect(bar.match(/<button/g)).toHaveLength(4)
  })

  it('**`busy` 只禁「生成类型 / 丢掉」，不禁复制** —— 复制一发请求都不打，没理由跟着等', () => {
    const bar = toolbarOf(samplePaneOf(settleable(), { busy: true }))!
    // 四个按钮里恰好两个带 disabled，而那两个是会写盘的动作 ——
    // 判据要按到「哪两个」上，光数个数的话两边换了位置也照样绿
    expect(bar.match(/disabled=""/g)).toHaveLength(2)
    // 从每个复制按钮自己的 `<button` 起切（往前数固定字符会切进上一个按钮的尾巴上）
    for (const label of ['复制 JSON', '复制 diff']) {
      const at = bar.indexOf(label)
      expect(bar.slice(bar.lastIndexOf('<button', at), at)).not.toContain('disabled')
    }
  })

  it('**处理完的那一份仍然能复制**：「生成类型 / 丢掉」走了，两条复制还在', () => {
    const bar = toolbarOf(samplePaneOf(settleable(), { settled: '已入库', consumed: true }))!
    expect(bar).not.toContain('生成类型')
    expect(bar).not.toContain('丢掉')
    expect(bar).toContain('复制 JSON')
    expect(bar.match(/<button/g)).toHaveLength(2)
  })

  it('没东西可复制时那两个按钮不出现，两个入库动作照旧', () => {
    // 判定拒掉又没带回响应的那种：`payload` 没有、diff 空 ⇒ `copyableOf` 一条都不给 ⇒ 一个都不渲
    const bar = toolbarOf(samplePaneOf(settleable({ payload: undefined, diff: [] })))!
    expect(bar).toContain('生成类型')
    expect(bar).not.toContain('复制')
    expect(bar.match(/<button/g)).toHaveLength(2)
  })

  it('**一个动作都没有时没有空 toolbar**，那句「不能保存样本」照旧', () => {
    const html = samplePaneOf(settleable({ payload: undefined, diff: [], pendingId: undefined }))
    expect(toolbarOf(html)).toBeUndefined()
    expect(html).toContain('不能保存样本')
  })
})

/**
 * 标题行那排收据：`200 · 312 ms · 9.7 KB`，加上那枚入库判定。
 *
 * 契约这一轮新长出 `http`，而**界面不读它等于 server 白算**（那是这一轮之前
 * `payloadHighlight` 出过的事：上游做了功、下游扔了，编译期与所有其它测试都绿）。
 * 三个数一排全 `tabular-nums`：连发几次时它们竖直对齐，变化一眼看得出来。
 */
describe('结果栏顶上那排收据', () => {
  it('三个数按「状态码 · 毫秒 · 大小」一排，等宽数位', () => {
    const html = paneOf(settleable({ http: { status: 200, statusText: 'OK', durationMs: 312, bytes: 9932 } }))
    expect(html).toContain('200 · 312 ms · 9.7 KB')
    expect(html).toMatch(/<span class="[^"]*tabular-nums[^"]*">\s*200 ·/)
  })

  it('**1024 以下报字节** —— 那个量级里「小」本身就是信息（空响应、只有一个 `code` 的错误页）', () => {
    // 报成 `0.3 KB` 会把它抹平
    expect(paneOf(settleable({ http: { status: 200, durationMs: 8, bytes: 300 } }))).toContain('300 B')
  })

  it('样本的体积并排报出来 ——「差这么多」就是截断最直观的量', () => {
    // `bytes` 数真实响应、`sampleBytes` 数展示样本（两个口径在 `outcome.test.ts` 的
    // `receiptBytesOf` 上钉着）；这一条只钉「两个都到了屏幕上」
    expect(paneOf(settleable({ http: { status: 200, durationMs: 312, bytes: 9932, sampleBytes: 1200 } }))).toContain(
      '200 · 312 ms · 9.7 KB（样本 1.2 KB）'
    )
  })

  it('没有 `sampleBytes`（被判定拒掉的那发 / 旧 server）时只报真实体积，不挂半个括号', () => {
    const html = paneOf(settleable({ http: { status: 200, durationMs: 8, bytes: 300 } }))
    expect(html).toContain('300 B')
    expect(html).not.toContain('（样本')
  })

  it('**`status` 为 0 时报的是那个 0，不是留白** —— 留白说不清「没打出去」和「还没发过」', () => {
    expect(paneOf(settleable({ http: { status: 0, durationMs: 12, bytes: 0 } }))).toContain('0 · 12 ms · 0 B')
  })

  it('契约里没有 `http` 的那一份不渲这一排（旧 server 回的那种），但别的照旧', () => {
    const html = paneOf(settleable())
    expect(html).not.toContain(' ms · ')
    expect(samplePaneOf(settleable())).toContain('生成类型')
  })

  it('判定那枚 Chip 上只有那一个词，`confident === false` 时多一个问号', () => {
    // 「为什么」是追问才要的（进 tooltip），但「判定器在这份响应上没有依据」必须看得见 ——
    // 那与「判定通过」不是一回事。这枚 Chip 在「样本处理」栏：它与「保存 / 丢掉」说的是同一件事
    expect(samplePaneOf(settleable())).toContain('accept')
    expect(samplePaneOf(settleable({ verdict: { kind: 'accept', reason: '判定通过', confident: false } }))).toMatch(/accept\s*\?/)
  })
})

/**
 * 动作区里放了哪两条复制，以及**没放什么**。
 *
 * 主判据是 `copyableOf` 的返回值而不是 DOM：按钮由它 `map` 出来，它不给就没有那个按钮 ——
 * 「不留死控件」这件事在那个函数的形状里，不在调用点的自觉里。
 *
 * 另一半是**反向绊线**：PRD 5.4 给「⋯」点名的 `Dropdown` 没接（那三条动作逐条都做不了，
 * 而它一个占 18,201 字节），所以这里钉「import 清单里没有它」—— 哪天有人把它接回来，
 * 这条会红，而那时该先回答的是「三条动作里做成了哪几条、值不值这 18 KB」。
 */
describe('复制那两条：只有真能做的，且不靠一个菜单收纳', () => {
  const source = readFileSync(new URL('../src/components/Result.tsx', import.meta.url), 'utf8')

  it('**PRD 点名的三条一条都没做**，给出的就是这两条', () => {
    // 一份什么都不缺的结果上也只有这两条：cURL（没有 URL 也没有签名，更没有 params）、
    // JSON path（没有可点的字段树）、另存样本（要改 `lib/api.ts` 的签名）都不在
    expect(copyableOf(settleable()).map((action) => action.id)).toEqual(['copy-payload', 'copy-diff'])
  })

  it('**`Dropdown` 一处都没接** —— 两条动作撑不起一个菜单，而它要 18,201 字节', () => {
    // 判据挑 import 清单而不是「源码里没有 Dropdown 这个词」：不接它的理由写在注释里，
    // 那种判据会被自己的注释顶红（同下面那条 `TextArea`）
    expect(importedFrom(source)).not.toContain('Dropdown')
  })

  it('**复制出去的响应不受那 20,000 字上限限制** —— 这就是这一条存在的全部理由', () => {
    const payload = { list: Array.from({ length: 4000 }, (_, index) => `第 ${index} 条`) }
    const text = JSON.stringify(payload, null, 2)
    expect(text.length).toBeGreaterThan(20_000)
    const [action] = copyableOf(settleable({ payload }))
    // 逐字节等于整份，而屏幕上（高亮那条路与回落那条路都）只有前 20,000 字
    expect(action!.text).toBe(text)
    // 量也说出来了。**它现在在 tooltip 上而不是按钮上**（标题行只有一行的宽度），
    // 所以这条判据落在 `label` 本身 —— 那个字符串是「屏幕上那份是截过的」这件事的唯一出处
    expect(action!.label).toContain(String(text.length))
  })

  it('**复制出去的 diff 不受那 400 条窗口限制**，而且带着文件与两个计数', () => {
    const diff = [...diffLines(500, 'bilibili/Comments/Comments_V0.ts', 'A'), ...diffLines(3, 'bilibili/Comments/index.ts', 'B')]
    const action = copyableOf(settleable({ diff })).find((candidate) => candidate.id === 'copy-diff')
    expect(action!.text.match(/[AB]\d+#/g)).toHaveLength(503)
    // 面板里 B 那个文件一行都没渲（窗口用光了），复制出来的那份里它是齐的
    expect(action!.text).toContain('B2#')
    expect(action!.text).toContain('A499#')
    // 分组与计数与面板同一套（`groupDiffByFile`），于是屏幕上那句和贴出来那份对得上
    expect(action!.text).toContain('bilibili/Comments/Comments_V0.ts  新增 250 / 删除 250')
    expect(action!.label).toContain('503')
  })

  it('那份数据不在时对应那一条就不存在 —— 死控件在这里被根除', () => {
    expect(copyableOf(settleable({ payload: undefined })).map((action) => action.id)).toEqual(['copy-diff'])
    expect(copyableOf(settleable({ diff: [] })).map((action) => action.id)).toEqual(['copy-payload'])
    expect(copyableOf(settleable({ payload: undefined, diff: [] }))).toEqual([])
    // `diff` 压根没给（不是空数组）也走同一档 —— 契约里它是可选字段
    expect(copyableOf({ ok: false, verdict: { kind: 'reject', reason: '风控页' } })).toEqual([])
  })

  it('**`TextArea` 一处都没接**，响应那块仍然是 `<pre>` / `CodeBlock` 两条路', () => {
    // PRD 5.4 给 `TextArea` 点了两处名（raw 响应、raw JSON body），两处都没接
    expect(importedFrom(source)).not.toContain('TextArea')
    // 顺带钉住这一轮真接上的那一个组件。**它在「样本处理」栏（`SamplePane.tsx`）里而不是
    // 这个文件里** —— 那一排动作跟着处理区走，而 `Result.tsx` 只剩那些
    // 能单独摆到任何地方去的块
    expect(importedFrom(readFileSync(new URL('../src/components/SamplePane.tsx', import.meta.url), 'utf8'))).toContain('Toolbar')
    // 而处理区渲出来一个多行输入控件都没有（响应是数据，不是可编辑的表单字段）
    expect(samplePaneOf(settleable())).not.toContain('<textarea')
  })
})

/**
 * 复制跟着「响应」页当前那一档走：原始档复制全量真实响应（未裁剪未脱敏），样本档复制
 * 裁剪 + 脱敏后那份 —— **两份不再相同，标签就得说清复制的是哪份**。
 *
 * 主判据是 `copyableOf` 本身（纯函数，两档各喂一次）；「当前那一档」从哪来（`App` 持有的
 * 切换状态传进 `SamplePane`）是接线，静态渲不出来，读源码断 —— 与 tab 切换那组同一条做法。
 */
describe('复制跟着当前那一档走', () => {
  const both = settleable({
    rawPayload: { result: 1, data: { title: 'RAW-ONLY', list: [1, 2, 3, 4, 5, 6, 7] } },
    payload: { data: { title: 'SAMPLE-ONLY', list: [1, 2, 3] } },
    payloadTrimmed: [{ path: 'data.list', from: 7, to: 3 }]
  })

  it('原始档复制的是 `rawPayload` —— 全量、未脱敏', () => {
    const [action] = copyableOf(both, 'raw')
    expect(action!.id).toBe('copy-payload')
    expect(action!.text).toBe(JSON.stringify(both.rawPayload, null, 2))
    expect(action!.label).toContain('原始')
  })

  it('样本档复制的是 `payload`，标签把「裁剪 + 脱敏」说出来 —— 贴出去的 3 条不许被当成全部', () => {
    const [action] = copyableOf(both, 'sample')
    expect(action!.text).toBe(JSON.stringify(both.payload, null, 2))
    expect(action!.label).toContain('样本')
    expect(action!.label).toContain('裁剪 + 脱敏')
  })

  it('rawPayload 不在时「原始」那一档也复制样本 —— 与旧 server 回落的是同一条路', () => {
    const [action] = copyableOf(settleable(), 'raw')
    expect(action!.text).toBe(JSON.stringify(settleable().payload, null, 2))
    // 没截过（`payloadTrimmed` 空）的样本不说「裁剪」—— 标签不许对着没发生的事说话
    expect(action!.label).not.toContain('裁剪')
    expect(action!.label).toContain('脱敏')
  })

  it('样本处理区真的把当前视图传进去了 —— 切换是交互，这条只能读源码', () => {
    const actions = readFileSync(new URL('../src/components/SamplePane.tsx', import.meta.url), 'utf8')
    expect(actions).toContain('copyableOf(outcome, payloadView)')
  })
})

/* ------------------------------------------------------------------ 「保存并共享参数」只带一句说明 */

/**
 * 那句说明的闸 —— **前端唯一还挡的东西**。
 *
 * 英文 `id` 没了（集合身份是 server 算的 `paramsHash`，人手上没有也不需要），于是
 * 「不合法 id 在前端挡住」那一整组跟着删掉。剩下的这道闸挡的是**空标签**：
 * 原生 `required` 只看框空不空，一句全是空格的说明它照样放行。
 */
describe('说明空着 / 只有空格都在前端就被挡住', () => {
  it('正常说明放行；空串与全空格都拒，而且说出为什么', () => {
    expect(requestLabelIssue('单页视频')).toBeUndefined()
    expect(requestLabelIssue('')).toBeDefined()
    // 全是空格的那一句：校验器那边的判据是 `label.trim() === ''`（`requests.ts`），
    // 而原生 required 看的只是框空不空 —— 这一条就是为它准备的
    expect(requestLabelIssue('   ')).toBeDefined()
    expect(requestLabelIssue('  ')).toContain('空标签比没标签更糟')
  })
})

/**
 * 入口长什么形状。
 *
 * 三条约束，前两条是这个设计的支点：
 *
 * 1. **「生成类型」那条路一个字都没动。** 那是今天最常用的动作，也是 `storeNotice`
 *    刻意做成非错误的那一档 —— 所以要钉「`Toolbar` 里还是那四颗按钮」。
 * 2. **表单不在 `Toolbar` 里。** 那一排的语义是「一按就发生」（`role="toolbar"`，左右箭头在动作
 *    之间移动），塞输入框进去会让方向键在框里改变含义。那一排与表单都在「样本处理」栏里，
 *    一上一下。
 * 3. **默认收着的 `<details>` 而不是一个 `useState` 开合**：于是它一直在 DOM 里，
 *    `renderToStaticMarkup` 渲得到（这条路上没有点击也没有 effect）—— 上面那张表单能被这几条
 *    量到，靠的就是这个选择。
 */
describe('入口的形状：「生成类型」旁边多一条路', () => {
  const source = readFileSync(new URL('../src/components/Result.tsx', import.meta.url), 'utf8')

  it('一个必填的说明框、一颗提交按钮都在默认收着的 `<details>` 里，而且先说清这条路会做什么', () => {
    const html = samplePaneOf(settleable())
    expect(html).toContain('<details')
    expect(html).toContain('保存并共享参数')
    expect(html).toContain('以后其他贡献者可以直接重放这一发')
    expect(html).toContain('corpus/bilibili/Comments.requests.json')
    expect(html).toContain('name="requestLabel"')
    expect(html).toContain('type="submit"')
    // **恰好一个输入框**：英文 `id` 没了 —— 身份是 server 从真值参数算的哈希，人填的只有说明
    expect(html.match(/<input/g)).toHaveLength(1)
    const at = html.indexOf('name="requestLabel"')
    expect(html.slice(html.lastIndexOf('<input', at), at)).toContain('required')
    // 说明那个框给了例子 —— **placeholder 不是值**，所以它不会在集合里留下一句假说明
    expect(html).toContain('placeholder="单页视频，最常见的那种"')
  })

  it('**英文 id 的东西一处都不剩** —— 框、文案、例子全没了', () => {
    const html = samplePaneOf(settleable())
    expect(html).not.toContain('name="requestId"')
    expect(html).not.toContain('英文名')
    expect(html).not.toContain('目录名和类型名')
    expect(html).not.toContain('BvSinglePage')
    // 校验器与字符集也从源码里走了（`requestIdIssue` / `REQUEST_ID`）。
    // 判据先剥注释 —— 说明这次删除的文字里就有这两个词，不剥会被自己的注释顶红
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(code).not.toContain('requestIdIssue')
    expect(code).not.toContain('REQUEST_ID')
  })

  it('动作条永远可见：四颗按钮在 `<details>` 之外 —— summary 里的点击全会触发开合', () => {
    const html = samplePaneOf(settleable())
    const toolbar = html.indexOf('role="toolbar"')
    expect(toolbar).toBeGreaterThan(-1)
    expect(toolbar).toBeLessThan(html.indexOf('<details'))
  })

  it('**`Toolbar` 里还是原来那四颗按钮，表单没塞进去**', () => {
    const bar = toolbarOf(samplePaneOf(settleable()))!
    expect(bar.match(/<button/g)).toHaveLength(4)
    expect(bar).toContain('生成类型')
    // 提交按钮与输入框都在这一排之外
    expect(bar).not.toContain('保存并共享参数')
    expect(bar).not.toContain('<input')
  })

  it('说明框交代写给谁；凭证警告留在版面上', () => {
    const html = samplePaneOf(settleable())
    expect(html).toContain('一句话说明')
    expect(html).toContain('写给下一个贡献者')
    expect(html).toContain('别放凭证')
  })

  it('**处理完的那一份下面没有这张表单** —— 不留一个点了没用的控件', () => {
    const html = samplePaneOf(settleable(), { settled: '已写入 corpus/…', consumed: true })
    expect(html).not.toContain('name="requestLabel"')
    expect(html).not.toContain('<details')
  })

  it('判定拒掉的那份没有这张表单', () => {
    expect(samplePaneOf(settleable({ pendingId: undefined }))).not.toContain('name="requestLabel"')
  })

  it('**server 留着待定条目的那两档：收据在，表单与两颗按钮也在**', () => {
    // 凭证命中 / 集合文件坏了：`server/index.ts` 刻意不清 `pending`，而那两句话都以
    // 「再入库一次」收尾 —— 收走按钮的话那句话在版面上无路可走
    const html = samplePaneOf(settleable(), { settled: '已写入 …；参数没进请求集合 —— 有像凭证的键', retryable: true })
    expect(html).toContain('有像凭证的键')
    expect(html).toContain('name="requestLabel"')
    expect(toolbarOf(html)).toContain('生成类型')
  })

  it('**`AlertDialog` 没接** —— 判据是 import 清单，同 `Dropdown` 那条', () => {
    // 不接的理由写在源码注释里（填一个框本身就是确认动作；要说的那句话在框旁边与事后的
    // toast 里更准；接它入口 +8,855 字节，而余量本来只有 17,275），所以判据挑 import 清单
    // 而不是「源码里没有 AlertDialog 这个词」—— 那种判据会被自己的注释顶红
    expect(importedFrom(source)).not.toContain('AlertDialog')
    // 而这一栏里也没有弹层的痕迹：这条路上没有对话框
    expect(samplePaneOf(settleable())).not.toContain('role="alertdialog"')
  })

  it('**`requestsReplaced` 那句话在版面上真的渲得出来** —— 判定层与版面之间那一步', () => {
    // 判定层单测在 `appStore.test.ts`，这一条量的是**它说的话能不能到屏幕上**：
    // 那句是 `settled`（toast 会走，这句不会），而它落在「样本处理」栏
    const notice = storeNotice(
      {
        written: 'corpus/bilibili/Comments/57c213a5f38c.json',
        requestsAppended: true,
        requestsPath: 'corpus/bilibili/Comments.requests.json',
        requestsReplaced: true,
        requestsIssues: []
      },
      '单页视频'
    )
    const html = samplePaneOf(settleable(), { settled: notice.settled })
    expect(html).toContain('替换')
    expect(html).toContain('corpus/bilibili/Comments.requests.json')
  })
})

/* ------------------------------------------------------------------ 类型产出栏 */

describe('「类型产出」栏：空态与可保存的两档动作', () => {
  it('**还没发过：一句空态，没有一颗死按钮**（它首发前就占着那 30%，空态即版面）', () => {
    const html = samplePaneOf(undefined)
    expect(html).toContain('发送请求后，在这里生成类型或丢掉这一发。')
    expect(html).not.toContain('<button')
    expect(html).not.toContain('<details')
  })

  it('**共享参数之后生成入口还在** —— 那两件事互不相干', () => {
    // 实测踩到的：`canSettle` 要求 `settled === undefined`，而「保存并共享参数」成功后
    // 会写入 `settled` —— 于是整块动作区（生成 / 丢掉 / 复制 / 那张表单）一起消失，
    // 人想接着生成类型都没有按钮可点。共享参数写的是**请求集合**，与「这一发要不要进类型」
    // 是两件事，它不该收走生成入口。
    const html = samplePaneOf(settleable(), { settled: '已共享参数' })
    expect(html).toContain('>生成类型<')
    expect(html).toContain('丢掉')
  })

  it('已经生成过类型的那一份才收走动作 —— 那时 server 侧的待定条目真的没了', () => {
    const html = samplePaneOf(settleable(), { settled: '已保存样本并生成类型', consumed: true })
    expect(html).not.toContain('>生成类型<')
    expect(html).toContain('已保存样本并生成类型')
  })

  it('**提供「合并进现有类型 / 单独建新形状」两档** —— `_V<n>` 由人选', () => {
    const html = samplePaneOf(settleable())
    expect(html).toContain('aria-label="这一发的类型形状"')
    expect(html).toContain('合并进现有类型')
    expect(html).toContain('单独建新形状')
  })

  it('**「分开」那颗按钮上写着会落到哪个 `_V<n>`** —— 那个数由 server 算', () => {
    // 「分开」是个有后果的选择（产物多一个文件、稳定类型变成联合），而那个后果的名字
    // 就是 `_V<n>`。前端写死 1 的话，已有 `_V1` 的端点上会静默合并进那一份 ——
    // 所以序号跟着 outcome 从 server 来（契约 `nextShapeIndex`）
    expect(samplePaneOf(settleable({ nextShapeIndex: 2 }))).toContain('单独建新形状（_V2）')
  })

  it('旧 server（没有 `nextShapeIndex`）时只写那句话，不编一个数出来', () => {
    const html = samplePaneOf(settleable())
    expect(html).toContain('单独建新形状')
    expect(html).not.toContain('（_V')
  })

  it('**选中态跟着 `outcome.shapeIndex` 走** —— 非 0 的那一份上停在「分开」那一档', () => {
    // 本地 state 那版换一份结果时不重置，于是 `shapeIndex: 0` 的结果上会显示「分开」选中。
    // 判据落在渲出来的选中态上：`aria-selected` / `data-selected` 哪个由 HeroUI 定，
    // 所以这里比的是两份 HTML 真的不同 —— 派生失效时它们会一模一样
    const merged = samplePaneOf(settleable({ shapeIndex: 0, nextShapeIndex: 1 }))
    const separate = samplePaneOf(settleable({ shapeIndex: 1, nextShapeIndex: 2 }))
    expect(merged).not.toBe(separate)
    // 而且「分开」那一档的按钮上，两份写的序号不是同一个
    expect(merged).toContain('单独建新形状（_V1）')
    expect(separate).toContain('单独建新形状（_V2）')
  })

  it('**没有「只保存样本」这颗按钮了** —— 保存由「生成类型」自己做，两颗按钮说的是同一件事', () => {
    expect(samplePaneOf(settleable())).not.toContain('只保存样本')
  })

  it('可保存的那份：生成、共享参数、丢掉与复制都在', () => {
    const html = samplePaneOf(settleable())
    for (const label of ['生成类型', '保存并共享参数', '丢掉', '复制 JSON']) expect(html).toContain(label)
  })

  it('可保存的那份能选响应方向，默认成功', () => {
    const html = samplePaneOf(settleable())
    expect(html).toContain('aria-label="响应方向"')
    expect(html).toContain('成功响应')
    expect(html).toContain('错误响应')
  })

  it('direction=error 那份选中错误档', () => {
    const html = samplePaneOf(settleable({ direction: 'error' }))
    expect(html).toContain('错误响应')
    expect(html).toContain('data-selected="true"')
  })

  it('方向切换真的接到了 App 的重判动作 —— 交互静态渲不出来，读源码断', () => {
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
    const source = readFileSync(new URL('../src/components/SamplePane.tsx', import.meta.url), 'utf8')
    expect(source).toContain('onDirectionChange(direction)')
    expect(app).toContain('setResponseDirection(')
    expect(app).toContain('onDirectionChange=')
  })
})
