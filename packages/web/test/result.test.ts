/**
 * `Result.tsx` 那几块**能单独摆到任何地方去**的东西，以及**装它们的那两栏**。
 *
 * 这个文件原先叫 `outcomeCard.test.ts`，量的是一张把这些块串在一起的卡片。那张卡片删了 ——
 * 它的四块内容各自属于不同的栏（响应 JSON 与两颗按钮归「响应」栏、类型 diff 归「类型」栏），
 * 而卡片这个形状本身恰恰是「什么都往下堆」的成因。所以**块的判据一个字没动，
 * 「真的接上了」那几条改成对着 `ResponsePane.tsx` / `TypePane.tsx` 问。**
 *
 * **这里真的把组件渲出来**，靠 `react-dom/server` 的 `renderToStaticMarkup` —— 它随 `react-dom`
 * 一起装着，不需要 jsdom 也不需要 testing-library（vitest 跑在 node 环境，见根
 * `vitest.config.ts`）。HeroUI / react-aria-components 本来就支持 SSR，所以这条路上量到的是
 * 真的 DOM 结构，而不是「源码里有没有某个字符串」。
 *
 * 搬进三栏之后**渲得到的东西多了一块、少了一块**：
 *
 * - 多的是响应那块面板 —— 它现在是「响应」栏的正文本体（不再藏在一个默认没选中的 tab 里），
 *   于是「两个字段真的交给了 `PayloadPanel`」这件事**渲得出来**，不必只比源码字符串。
 * - 少的是 diff 那块 —— 它进了「类型」栏的 `diff` 那一页，而 `Tabs` **只渲选中的那一页**
 *   （默认停在「本次」）。所以那一块的分支仍然由直接渲 `DiffPanel` 覆盖，
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
 * 7. **「留下」能带一个 `id`** —— 那三条动作里的「另存样本」，也是 PRD 二 ① 的最后一环。
 *    要钉的是三件事：不合法的 `id` **在这一侧就被挡住**（人不该点了才从 server 拿回一句 400），
 *    那个字符集与 `packages/typegen/src/requests.ts` 的 `REQUEST_ID` **逐字相同**（走散了会让
 *    界面放行一个校验器要拒的值），以及**不填 id 直接「留下」那条路一个字都没动**（它是常态）。
 * 8. **这一轮新的两块：那排收据与「本次」那一页的类型声明。** 收据（`200 · 312 ms · 9.7 KB`）
 *    是契约新长出来的 `http`，界面不读它等于 server 白算；而「本次」那一页要么显示
 *    `typeSource`、要么把 `typeIssue` 说出来 —— **静默空着一页**是这两个字段互斥的那条注释
 *    正在防的事。
 */

import { readFileSync } from 'node:fs'

import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { DiffLine, HighlightedCode, JsonValue, RecordOutcome } from '../shared/contract'
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
 * **三个模块**：块本身在 `Result.tsx`，装它们的两栏各一个文件。
 */
const MODULE = '../src/components/Result'
const RESPONSE_PANE = '../src/components/ResponsePane'
const TYPE_PANE = '../src/components/TypePane'

const { copyableOf, DiffPanel, PayloadPanel, requestIdIssue, requestLabelIssue } = (await import(MODULE)) as {
  /** 动作区里那两条复制。**它就是「不留死控件」这件事的判据** —— 见下面那个 describe */
  copyableOf: (outcome: RecordOutcome) => { id: string; label: string; text: string }[]
  DiffPanel: (props: { diff: DiffLine[] }) => ReactNode
  PayloadPanel: (props: { payload?: JsonValue; highlight?: HighlightedCode }) => ReactNode
  /** 「这个 `id` 哪儿不行」。**前端那道闸就是它** —— 见倒数第二个 describe */
  requestIdIssue: (id: string) => string | undefined
  requestLabelIssue: (label: string) => string | undefined
}

const { ResponsePane } = (await import(RESPONSE_PANE)) as {
  ResponsePane: (props: {
    outcome?: RecordOutcome
    endpointLabel?: string
    settled?: string
    retryable?: boolean
    busy: boolean
    onStore: (record?: { id: string; label: string }) => Promise<void>
    onDiscard: () => Promise<void>
  }) => ReactNode
}

const { TypePane } = (await import(TYPE_PANE)) as {
  TypePane: (props: {
    platform: string
    endpoint: string
    outcome?: RecordOutcome
    stored: number
    generatedRevision: number
    requestsRevision: number
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

/**
 * 造 `count` 条差异。
 *
 * `text` 里带序号并以 `#` 收尾，于是「第几条渲出来了」可数可查（`L1#` 不会命中 `L10#`）；
 * `tag` 让多文件那条用例分得清哪条属于哪个文件。**正负交替**，于是每组的两个计数都不是 0。
 */
const diffLines = (count: number, file = 'bilibili/VideoInfo/VideoInfo_V0.ts', tag = 'L'): DiffLine[] =>
  Array.from({ length: count }, (_, index): DiffLine => ({ file, sign: index % 2 === 0 ? '+' : '-', text: `${tag}${index}#` }))

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
 * 渲一次「响应」栏。
 *
 * `outcome` 可以是 `undefined`（还没发过那一档），所以它是显式的第一个参数而不是塞进 `extra` ——
 * 那一档要钉的是「显示一行提示，不是一块空面板」。
 */
const paneOf = (outcome?: RecordOutcome, props: { settled?: string; busy?: boolean; retryable?: boolean } = {}): string =>
  renderToStaticMarkup(
    createElement(ResponsePane, {
      outcome,
      endpointLabel: 'bilibili/Comments',
      busy: props.busy ?? false,
      settled: props.settled,
      retryable: props.retryable,
      onStore: () => Promise.resolve(),
      onDiscard: () => Promise.resolve()
    })
  )

/**
 * 渲一次「类型」栏。
 *
 * 那两个 revision 给 0：它们只喂给两块懒加载的面板，而 `Tabs` 只渲选中的那一页
 * （默认是「本次」）—— 这条路上它们连挂载都不会发生。
 */
const typePaneOf = (outcome?: RecordOutcome): string =>
  renderToStaticMarkup(
    createElement(TypePane, {
      platform: 'bilibili',
      endpoint: 'Comments',
      outcome,
      stored: 3,
      generatedRevision: 0,
      requestsRevision: 0
    })
  )

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

describe('这块面板真的接在「响应」栏上', () => {
  /**
   * **这一组不再只能读源码。** 原先响应那块藏在卡片一个默认没选中的 `Tabs.Panel` 里，
   * 「payload 那页用的是谁」在 SSR 产物里看不见，所以只能比源码字符串。
   * 三栏之后它是「响应」栏的正文本体 —— 渲一次这一栏，server 那份 HTML 直接在里面。
   *
   * 而这仍然是这一轮之前那个 bug 的形状：`CodeBlock` 早就会说截断，却只被一个从未挂载的
   * 组件（`GeneratedPanel`）用着，于是那句承诺在可达界面上一处都没兑现。
   * **造好但没接线不报错**，所以这一组存在 —— 只是判据从「源码里有那一行」升级成了「渲得出来」。
   */
  const source = readFileSync(new URL('../src/components/ResponsePane.tsx', import.meta.url), 'utf8')

  it('这一栏把两个字段都交给了 `PayloadPanel`，而且渲出来的是 server 那份高亮', () => {
    const html = paneOf(settleable({ payloadHighlight: highlighted(64, 64) }))
    expect(html).toContain('HIGHLIGHTED-BY-SERVER')
    // 老路会把 payload 里那个值渲进 `<pre>`。它不在，说明走的不是老路
    expect(html).not.toContain('猫与狗')
    expect(source).toContain('<PayloadPanel payload={outcome.payload} highlight={outcome.payloadHighlight} maxHeight={PANE_CODE} />')
  })

  it('**截断那句话真的到了屏幕上** —— 契约要的是「界面必须说」，而这一栏就是那个界面', () => {
    expect(paneOf(settleable({ payloadHighlight: highlighted(20_000, 53_000) }))).toContain('33000')
  })

  it('老那条「自己 stringify」的路不再是渲染分支', () => {
    // 判据挑的是 `JSON.stringify(outcome.payload` 而不是 `slice(0, 20_000)`：
    // 后者在注释里写着（那句注释解释的正是这条路为什么被换掉），拿它做判据会永远红
    expect(source).not.toMatch(/JSON\.stringify\(outcome\.payload/)
  })

  it('**还没发过时是一行提示，不是一块空面板**', () => {
    const html = paneOf(undefined)
    expect(html).toContain('左边填参数')
    // 也没有一个点了没用的动作区
    expect(html).not.toContain('role="toolbar"')
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

  it('**窗口只切逐行，文件与每个文件的条数全都在** —— 没展开的文件也说得出自己有多少条', () => {
    const html = renderDiff([
      ...diffLines(500, 'bilibili/Comments/Comments_V0.ts', 'A'),
      ...diffLines(3, 'bilibili/Comments/index.ts', 'B'),
      ...diffLines(2, 'bilibili/Comments/guards.ts', 'C')
    ])
    // 三个文件的路径都在版面上，尽管后两个一条行都没渲出来
    expect(html).toContain('bilibili/Comments/Comments_V0.ts')
    expect(html).toContain('bilibili/Comments/index.ts')
    expect(html).toContain('bilibili/Comments/guards.ts')
    expect(html).not.toContain('B0#')
    expect(html).not.toContain('C0#')
    // **计数数的是全部，不是窗口内的** —— 这是这份设计的支点：500 条里只渲了 400 条，
    // 但「这个文件一共变了 500 处」照样说得出来
    expect(html).toContain('新增 250 / 删除 250')
    expect(html).toContain('新增 2 / 删除 1')
    expect(html).toContain('这个文件还有 100 条没展开')
    expect(html).toContain('这个文件还有 3 条没展开')
    // 路径只在组标题上出现一次，不再每行挂一遍（400 行里 396 行是重复的）
    expect(html.match(/bilibili\/Comments\/Comments_V0\.ts/g)).toHaveLength(1)
  })

  it('一条差异都没有时还是那句「类型没有变化」，出口控件不出现', () => {
    const html = renderDiff([])
    expect(html).toContain('类型没有变化')
    expect(html).not.toContain('<button')
    expect(TRUNCATED.test(html)).toBe(false)
  })
})

/**
 * diff 那块接在「类型」栏的 `diff` 那一页上。
 *
 * **这一组量得到的东西比原先少一半，而少掉的那半是刻意的。** 原先 diff 是卡片默认选中的那一页，
 * 渲一次卡片，截断提示与出口按钮都在产物里；现在它是四页里的第三页，而 `Tabs` **只渲选中的那一页**
 * —— 那正是这三块懒加载真的省下 104 KB 的原因（`lazy.test.ts` 那侧钉着）。
 *
 * 于是判据分两路：面板自己的分支由上面那一组直接渲 `DiffPanel` 覆盖（一条没少），
 * 而这里量的是**不点开也看得见的那部分** —— tab 上那枚条数 Chip，加一条读源码的接线判据。
 * 「点开 diff 那页看到的是不是这块面板」渲不出来（要真的点一下 tab），所以那一步只能读源码。
 */
describe('diff 那块面板真的接在「类型」栏上', () => {
  const source = readFileSync(new URL('../src/components/TypePane.tsx', import.meta.url), 'utf8')

  it('`diff` 那一页装的就是 `DiffPanel`，高度上限吃这一栏那个常量', () => {
    expect(source).toMatch(/<Tabs\.Panel id="diff">\s*<DiffPanel diff=\{diff\} maxHeight=\{PANE_CODE\} \/>/)
    // 空数组是常态（同形样本），所以它照样要渲 —— 那句「类型没有变化」由面板自己说
    expect(source).toContain('const diff = outcome?.diff ?? []')
  })

  it('**条数挂在 tab 上：不点开也知道这一发有没有改动产物**', () => {
    const html = typePaneOf(settleable({ diff: diffLines(1000) }))
    // 那枚 Chip 报的是**总数**，与面板里那句提示同一个数 —— 一处报 1000 另一处报 400 是这条要挡的
    expect(html).toMatch(/<span class="chip__label tabular-nums"[^>]*>1000</)
    expect(html).toContain('diff')
  })

  it('**0 条时不渲那枚 Chip**，而 tab 本身还在 —— 「diff 0」是句废话', () => {
    const html = typePaneOf(settleable({ diff: [] }))
    expect(html).toMatch(/data-key="diff"/)
    expect(html).not.toMatch(/<span class="chip__label tabular-nums"[^>]*>0</)
  })
})

/**
 * 「本次」那一页：**这一发响应自己的类型声明**，也是这一轮新长出来的那一块。
 *
 * 界面原先能回答「录了这份样本，产物文件会变成什么样」（diff），却答不出最直接的那个问题 ——
 * 「刚打回来的这段 JSON，类型是什么」。数据来自 `RecordOutcome.typeSource`（server 侧
 * `declare.ts` 渲好，`declare.test.ts` 钉着那一侧），这里钉的是**三档都说得出话**：
 * 有声明就显示声明，生成失败就把失败说出来，还没发过就说这一页会出现什么。
 *
 * 中间那一档是关键：契约里 `typeIssue` 与 `typeSource` 互斥就是为了那一句，
 * 而**静默空着一页**是它正在防的事 —— 少一块面板必须有人说出来。
 */
describe('「类型」栏的「本次」那一页', () => {
  const typeSource: HighlightedCode = {
    html: `<pre class="shiki"><code><span style="--shiki-light:#005CC5">export type Comments_V0 = { }</span></code></pre>`,
    chars: 30,
    totalChars: 30
  }

  it('有 `typeSource` 就渲它，且默认停在这一页（发一次请求之后最想看的就是它）', () => {
    const html = typePaneOf(settleable({ typeSource }))
    expect(html).toContain('export type Comments_V0')
    expect(html).toMatch(/data-key="current"[^>]*data-selected="true"|aria-selected="true"[^>]*aria-controls="[^"]*tabpanel-current"/)
    // 双主题变量原样进了 DOM —— 与响应那块同一条路（server 渲好，这一侧一行 tokenizer 都不跑）
    expect(html).toContain('--shiki-light:')
  })

  it('**生成失败要说出来**，不是让这一页静默空着', () => {
    const html = typePaneOf(settleable({ typeIssue: '生成这一份的类型时出错了：炸给你看' }))
    expect(html).toContain('炸给你看')
    // 是个警告色的句子，而不是一块空白 —— 「少了一块面板」本身就是要说的信息
    expect(html).toContain('text-warning-soft-foreground')
  })

  it('两个字段互斥：有声明的那一份不该同时挂一句错误', () => {
    // 契约上那句「非空 ⇒ 另一个不在」由 server 兜（`declare.test.ts`），这一侧的判据是
    // 渲染分支的先后：`typeSource` 在就只渲它
    const html = typePaneOf(settleable({ typeSource, typeIssue: '不该被看见的那句' }))
    expect(html).toContain('export type Comments_V0')
    expect(html).not.toContain('不该被看见的那句')
  })

  it('还没发过时说的是「这一页之后会出现什么」，不是一块空白', () => {
    expect(typePaneOf(undefined)).toContain('发一发请求，这里出现它的类型声明')
  })

  it('四页的顺序 = 从「这一发」到「仓库里」', () => {
    // `本次`（这一发的声明）→ `已提交`（仓库里当前那一份）→ `diff`（这一发会让产物怎么变）→
    // `对比`（两组参数各自的形状）。前两页回答「是什么」，后两页回答「要不要动它」。
    // 原先这四块散在两个区里（对比与已有类型在结果区、diff 在卡片里），顺序是版面顺序而不是问题的顺序
    const html = typePaneOf(settleable({ typeSource }))
    const order = [...html.matchAll(/data-key="(current|committed|diff|compare)"/g)].map((hit) => hit[1])
    expect([...new Set(order)]).toEqual(['current', 'committed', 'diff', 'compare'])
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
    const bar = toolbarOf(paneOf(settleable()))
    expect(bar).toBeDefined()
    // 方向是 react-aria 给的（左右箭头 vs 上下箭头由它决定）—— 手写 div 拿不到这一对属性
    expect(bar).toContain('aria-orientation="horizontal"')
    expect(bar).toContain('aria-label="这份结果的动作"')
    for (const label of ['留下', '丢掉']) expect(bar).toContain(label)
    // 两条复制是**写着字的按钮**（不是一个「⋯」图标）。三栏之后按钮上只剩一个短词 ——
    // 「完整多少字符 / 全部多少条」那个量搬进了 tooltip，因为标题行只有一行的宽度。
    // **那个量的判据因此落在 `copyableOf` 的 label 上**（下一个 describe）：
    // `Tooltip.Content` 只在打开时才进 DOM，而这条路上没有 hover 也没有事件循环
    expect(bar).toContain('复制 JSON')
    expect(bar).toContain('复制 diff')
  })

  it('四个动作都是真 `<button>`，一个都不是挂了 onClick 的 div', () => {
    const bar = toolbarOf(paneOf(settleable()))!
    expect(bar.match(/<button/g)).toHaveLength(4)
  })

  it('**`busy` 只禁「留下 / 丢掉」，不禁复制** —— 复制一发请求都不打，没理由跟着等', () => {
    const bar = toolbarOf(paneOf(settleable(), { busy: true }))!
    // 四个按钮里恰好两个带 disabled，而那两个是入库动作 ——
    // 判据要按到「哪两个」上，光数个数的话两边换了位置也照样绿
    expect(bar.match(/disabled=""/g)).toHaveLength(2)
    // 从每个复制按钮自己的 `<button` 起切（往前数固定字符会切进上一个按钮的尾巴上）
    for (const label of ['复制 JSON', '复制 diff']) {
      const at = bar.indexOf(label)
      expect(bar.slice(bar.lastIndexOf('<button', at), at)).not.toContain('disabled')
    }
  })

  it('**处理完的那一份仍然能复制**：「留下 / 丢掉」走了，两条复制还在', () => {
    const bar = toolbarOf(paneOf(settleable(), { settled: '已入库' }))!
    expect(bar).not.toContain('留下')
    expect(bar).not.toContain('丢掉')
    expect(bar).toContain('复制 JSON')
    expect(bar.match(/<button/g)).toHaveLength(2)
  })

  it('没东西可复制时那两个按钮不出现，两个入库动作照旧', () => {
    // 判定拒掉又没带回响应的那种：`payload` 没有、diff 空 ⇒ `copyableOf` 一条都不给 ⇒ 一个都不渲
    const bar = toolbarOf(paneOf(settleable({ payload: undefined, diff: [] })))!
    expect(bar).toContain('留下')
    expect(bar).not.toContain('复制')
    expect(bar.match(/<button/g)).toHaveLength(2)
  })

  it('**一个动作都没有时没有空 toolbar**，那句「不能入库」照旧', () => {
    const html = paneOf(settleable({ payload: undefined, diff: [], pendingId: undefined }))
    expect(toolbarOf(html)).toBeUndefined()
    expect(html).toContain('这份不能入库')
  })
})

/**
 * 标题行那排收据：`200 · 312 ms · 9.7 KB`，加上那枚入库判定。
 *
 * 契约这一轮新长出 `http`，而**界面不读它等于 server 白算**（那是这一轮之前
 * `payloadHighlight` 出过的事：上游做了功、下游扔了，编译期与所有其它测试都绿）。
 * 三个数一排全 `tabular-nums`：连发几次时它们竖直对齐，变化一眼看得出来。
 */
describe('响应栏顶上那排收据', () => {
  it('三个数按「状态码 · 毫秒 · 大小」一排，等宽数位', () => {
    const html = paneOf(settleable({ http: { status: 200, statusText: 'OK', durationMs: 312, bytes: 9932 } }))
    expect(html).toContain('200 · 312 ms · 9.7 KB')
    expect(html).toMatch(/<span class="[^"]*tabular-nums[^"]*">\s*200 ·/)
  })

  it('**1024 以下报字节** —— 那个量级里「小」本身就是信息（空响应、只有一个 `code` 的错误页）', () => {
    // 报成 `0.3 KB` 会把它抹平
    expect(paneOf(settleable({ http: { status: 200, durationMs: 8, bytes: 300 } }))).toContain('300 B')
  })

  it('**`status` 为 0 时报的是那个 0，不是留白** —— 留白说不清「没打出去」和「还没发过」', () => {
    expect(paneOf(settleable({ http: { status: 0, durationMs: 12, bytes: 0 } }))).toContain('0 · 12 ms · 0 B')
  })

  it('契约里没有 `http` 的那一份不渲这一排（旧 server 回的那种），但别的照旧', () => {
    const html = paneOf(settleable())
    expect(html).not.toContain(' ms · ')
    expect(html).toContain('留下')
  })

  it('判定那枚 Chip 上只有那一个词，`confident === false` 时多一个问号', () => {
    // 「为什么」是追问才要的（进 tooltip），但「判定器在这份响应上没有依据」必须看得见 ——
    // 那与「判定通过」不是一回事
    expect(paneOf(settleable())).toContain('accept')
    expect(paneOf(settleable({ verdict: { kind: 'accept', reason: '判定通过', confident: false } }))).toMatch(/accept\s*\?/)
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
    // 顺带钉住这一轮真接上的那一个组件。**它在「响应」栏里而不是这个文件里** ——
    // 那一排动作跟着标题行走，而 `Result.tsx` 只剩那些能单独摆到任何地方去的块
    expect(importedFrom(readFileSync(new URL('../src/components/ResponsePane.tsx', import.meta.url), 'utf8'))).toContain('Toolbar')
    // 而这一栏渲出来一个多行输入控件都没有（响应是数据，不是可编辑的表单字段）
    expect(paneOf(settleable())).not.toContain('<textarea')
  })
})

/* ------------------------------------------------------------------ 「留下」带一个 id */

/**
 * 那个 `id` 的字符集 —— **前端那道闸**。
 *
 * 为什么闸要在这一侧：`id` 不合法时 server 回的是 400（「改你的输入」那一档），而人按下按钮
 * 之前手上就有全部依据 —— 让他点了才从服务器拿回一句「id 不合法」，等于把一个纯字符串判断
 * 做成一次网络往返。所以这里钉三样：**放行的那些真放行、该拒的一条都不漏、
 * 而这份字符集与校验器那份逐字相同**（走散了就是「界面放行一个校验器要拒的值」）。
 */
describe('不合法的 id 在前端就被挡住', () => {
  /** 校验器那一侧的原文（`packages/typegen/src/requests.ts`）。跨包读源码是为了让两份正则对着看 */
  const typegen = readFileSync(new URL('../../typegen/src/requests.ts', import.meta.url), 'utf8')
  const form = readFileSync(new URL('../src/components/Result.tsx', import.meta.url), 'utf8')

  /** 抽出 `const REQUEST_ID = /…/` 里那个正则字面量（连斜杠一起，于是两边逐字可比） */
  const patternOf = (text: string): string => {
    const found = /const REQUEST_ID = (\S+)/.exec(text)
    if (found === null) throw new Error('找不到 REQUEST_ID —— 这个 describe 的判据没了')
    return found[1]!
  }

  /** 该放行的那几种：驼峰、连字符、下划线、纯数字、单字符 */
  const GOOD = ['BvSinglePage', 'bv-single-p', 'a', '1', 'A_1-b2']

  /** 该挡住的那几种：空串、首尾非字母数字、含空格、非 ASCII、带点或斜杠 */
  const BAD = ['', '-x', 'x-', '_x', 'x_', 'bv single', ' Bv', 'Bv ', '视频', 'a.b', 'a/b']

  it('合法的那几种一条都不误伤（驼峰、连字符、下划线、纯数字、单字符）', () => {
    for (const id of GOOD) expect(requestIdIssue(id)).toBeUndefined()
  })

  it('**空串、首尾非字母数字、含空格、非 ASCII、带点或斜杠 —— 一条都不放行**', () => {
    for (const id of BAD) {
      const issue = requestIdIssue(id)
      expect(issue, `期望挡住 ${JSON.stringify(id)}`).toBeDefined()
      // 每一条都得说出为什么，不是一句「格式错误」
      expect(issue!.length).toBeGreaterThan(10)
    }
    // 空串那一档单独说话：它要答的是「这个框为什么非填不可」，而不是字符集
    expect(requestIdIssue('')).toContain('目录名')
    expect(requestIdIssue('-x')).toContain('首尾')
  })

  it('**字符集与 `packages/typegen/src/requests.ts` 的 `REQUEST_ID` 逐字相同**', () => {
    expect(patternOf(form)).toBe(patternOf(typegen))
    // 再按校验器那份正则**逐个取值**核一遍：光比字符串比不出「前端另加了一条规则」这种走散
    const validator = new RegExp(patternOf(typegen).slice(1, -1))
    for (const id of [...GOOD, ...BAD]) {
      expect(requestIdIssue(id) === undefined, `${JSON.stringify(id)} 两侧判得不一样`).toBe(validator.test(id))
    }
  })

  it('说明空着 / 只有空格都拒 —— **原生 `required` 只挡得住前一种**', () => {
    expect(requestLabelIssue('单页视频')).toBeUndefined()
    expect(requestLabelIssue('')).toBeDefined()
    // 全是空格的那一句：校验器那边的判据是 `label.trim() === ''`（`requests.ts:234`），
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
 * 1. **不填 id 直接「留下」那条路一个字都没动。** 那是今天最常用的动作，也是 `storeNotice`
 *    刻意做成非错误的那一档 —— 所以要钉「`Toolbar` 里还是那四颗按钮」。
 * 2. **表单不在 `Toolbar` 里。** 那一排的语义是「一按就发生」（`role="toolbar"`，左右箭头在动作
 *    之间移动），塞两个输入框进去会让方向键在框里改变含义。三栏之后这一条更硬：那一排在
 *    **标题行**上（不滚），而表单挂在正文末尾（跟着响应一起滚）—— 它们连位置都不在一层了。
 * 3. **默认收着的 `<details>` 而不是一个 `useState` 开合**：于是它一直在 DOM 里，
 *    `renderToStaticMarkup` 渲得到（这条路上没有点击也没有 effect）—— 上面那张表单能被这几条
 *    量到，靠的就是这个选择。
 */
describe('入口的形状：「留下」旁边多一条路', () => {
  const source = readFileSync(new URL('../src/components/Result.tsx', import.meta.url), 'utf8')

  it('两个框、一颗提交按钮都在默认收着的 `<details>` 里', () => {
    const html = paneOf(settleable())
    expect(html).toContain('<details')
    expect(html).toContain('name="requestId"')
    expect(html).toContain('name="requestLabel"')
    expect(html).toContain('type="submit"')
    expect(html).toContain('留下，并记下这组参数')
    // `id` 那个框给了例子，说明那个框也给了 —— **placeholder 不是值**，
    // 所以它不会在集合里留下一句假说明（自动生成 `label` 正是这里不做的那件事）
    expect(html).toContain('placeholder="BvSinglePage"')
    expect(html).toContain('placeholder="单页视频，最常见的那种"')
  })

  it('**`Toolbar` 里还是原来那四颗按钮，表单没塞进去**', () => {
    const bar = toolbarOf(paneOf(settleable()))!
    expect(bar.match(/<button/g)).toHaveLength(4)
    expect(bar).toContain('留下')
    // 提交按钮与两个输入框都在这一排之外
    expect(bar).not.toContain('并记下这组参数')
    expect(bar).not.toContain('<input')
  })

  it('要写的那个文件路径说出来了，「同 id 是就地替换」也在人打字的地方说了', () => {
    const html = paneOf(settleable())
    // 路径由 `endpointLabel` 拼出来，能直接粘进 git status
    expect(html).toContain('corpus/bilibili/Comments.requests.json')
    // 撞名这件事：人以为自己新增了一条，实际覆盖了旧的 —— 所以说在 `id` 那个框自己的说明上
    expect(html).toContain('就地替换')
    expect(html).toContain('不是新增')
    // 而「值是真值、别放凭证」也得说：这个文件进 git，凭证进去就收不回来了
    expect(html).toContain('进 git')
  })

  it('**处理完的那一份下面没有这张表单** —— 不留一个点了没用的控件', () => {
    const html = paneOf(settleable(), { settled: '已写入 corpus/…' })
    expect(html).not.toContain('name="requestId"')
    expect(html).not.toContain('<details')
  })

  it('**不能入库的那份也没有** —— 判定拒了 / 有脱敏残留的那些', () => {
    expect(paneOf(settleable({ pendingId: undefined }))).not.toContain('name="requestId"')
  })

  it('**server 留着待定条目的那两档：收据在，表单与两颗按钮也在**', () => {
    // 凭证命中 / 集合文件坏了：`server/index.ts:549` 刻意不清 `pending`，而那两句话都以
    // 「再入库一次」收尾 —— 收走按钮的话那句话在版面上无路可走
    const html = paneOf(settleable(), { settled: '已写入 …；参数没进请求集合 —— 有像凭证的键', retryable: true })
    expect(html).toContain('有像凭证的键')
    expect(html).toContain('name="requestId"')
    expect(toolbarOf(html)).toContain('留下')
  })

  it('**`AlertDialog` 没接** —— 判据是 import 清单，同 `Dropdown` 那条', () => {
    // 不接的理由写在源码注释里（填两个框本身就是确认动作；要说的那句话在框旁边与事后的
    // toast 里更准；接它入口 +8,855 字节，而余量本来只有 17,275），所以判据挑 import 清单
    // 而不是「源码里没有 AlertDialog 这个词」—— 那种判据会被自己的注释顶红
    expect(importedFrom(source)).not.toContain('AlertDialog')
    // 而这一栏里也没有弹层的痕迹：这条路上没有对话框
    expect(paneOf(settleable())).not.toContain('role="alertdialog"')
  })

  it('**`requestsReplaced` 那句话在版面上真的渲得出来** —— 判定层与版面之间那一步', () => {
    // 判定层单测在 `appStore.test.ts`，这一条量的是**它说的话能不能到屏幕上**：
    // 那句是 `settled`（toast 会走，这句不会），而它落在「响应」栏的正文里
    const notice = storeNotice(
      {
        written: 'corpus/bilibili/Comments/57c213a5f38c.json',
        requestsAppended: true,
        requestsPath: 'corpus/bilibili/Comments.requests.json',
        requestsReplaced: true,
        requestsIssues: []
      },
      'BvSinglePage'
    )
    const html = paneOf(settleable(), { settled: notice.settled })
    expect(html).toContain('替换')
    expect(html).toContain('corpus/bilibili/Comments.requests.json')
  })
})
