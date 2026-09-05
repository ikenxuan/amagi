/**
 * 结果卡片两块面板的分支：「类型 diff」那处硬截断的出口，「响应 JSON」那两条路
 * （server 给了高亮走 `CodeBlock`，没给就回落成纯文本）。
 *
 * **这里真的把组件渲出来**，靠 `react-dom/server` 的 `renderToStaticMarkup` —— 它随 `react-dom`
 * 一起装着，不需要 jsdom 也不需要 testing-library（vitest 跑在 node 环境，见根
 * `vitest.config.ts`）。HeroUI / react-aria-components 本来就支持 SSR，所以这条路上量到的是
 * 真的 DOM 结构，而不是「源码里有没有某个字符串」。
 *
 * 为什么测 `PayloadPanel` 而不是整张 `OutcomeCard`：`Tabs` 只渲选中的那一页，而卡片默认停在
 * `diff` 那页 —— 从外面渲整张卡片，那两条分支一条都进不去。**diff 那块反过来**：它就是默认那一页，
 * 所以最后一个 describe 直接渲整张卡片，「面板接没接上」不用读源码也答得出。
 *
 * 四件要钉住的事：
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
 */

import { readFileSync } from 'node:fs'

import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { DiffLine, HighlightedCode, JsonValue, RecordOutcome } from '../shared/contract'

/**
 * 被测组件。**说明符刻意是个变量**，于是 `tsc` 不去解析它。
 *
 * 理由：`test/` 归 `tsconfig.node.json` 管（`include` 里写着），而那份**没有 `jsx`** ——
 * 它管的是 `server/` 与 `scripts/`，那两处一行 JSX 都没有。静态 import 一个 `.tsx`
 * 会让它报 `TS6142: … but '--jsx' is not set`。往那份 tsconfig 里加一行 `"jsx": "react-jsx"`
 * 就能改回静态 import，那是更好的写法 —— 只是那个文件不在这一轮的改动范围里。
 *
 * 运行时这条路与静态 import 走的是同一份模块（vitest 用 Vite 变换解析），
 * 换回去时只需要删掉这三行、把类型改成从模块本身导入。
 */
const MODULE = '../src/components/OutcomeCard'
const { DiffPanel, OutcomeCard, PayloadPanel } = (await import(MODULE)) as {
  DiffPanel: (props: { diff: DiffLine[] }) => ReactNode
  OutcomeCard: (props: {
    outcome: RecordOutcome
    endpointLabel: string
    settled?: string
    busy: boolean
    onStore: () => Promise<void>
    onDiscard: () => Promise<void>
  }) => ReactNode
  PayloadPanel: (props: { payload?: JsonValue; highlight?: HighlightedCode }) => ReactNode
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

describe('这块面板真的接在卡片上', () => {
  /**
   * 唯一一条读源码的断言，理由与 `theme.test.ts` 后半份那几条相同：**这件事渲不出来**。
   * `Tabs` 只渲选中的那一页，卡片默认停在 `diff`，所以「payload 那页用的是谁」在 SSR 产物里看不见。
   *
   * 而它正是这一轮修的那个 bug 的形状：`CodeBlock` 早就会说截断，却只被一个从未挂载的组件
   * （`GeneratedPanel`）用着，于是那句承诺在可达界面上一处都没兑现。**造好但没接线不报错**，
   * 所以这条断言存在。
   */
  const source = readFileSync(new URL('../src/components/OutcomeCard.tsx', import.meta.url), 'utf8')

  it('卡片把两个字段都交给了 `PayloadPanel`', () => {
    expect(source).toContain('<PayloadPanel payload={outcome.payload} highlight={outcome.payloadHighlight} />')
  })

  it('老那条「自己 stringify」的路不再是渲染分支', () => {
    // 判据挑的是 `JSON.stringify(outcome.payload` 而不是 `slice(0, 20_000)`：
    // 后者在注释里写着（那句注释解释的正是这条路为什么被换掉），拿它做判据会永远红
    expect(source).not.toMatch(/JSON\.stringify\(outcome\.payload/)
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

describe('diff 那块面板真的接在卡片上', () => {
  /**
   * 这一块**不读源码**：diff 是卡片默认选中的那一页，所以从外面渲整张卡片就到得了 ——
   * 「造好但没接线」在这里是渲得出来的，不用像上面 payload 那块那样退回去比源码字符串。
   */
  const outcome = (diff: DiffLine[]): RecordOutcome => ({
    ok: true,
    verdict: { kind: 'accept', reason: '判定通过' },
    pendingId: 'pending-1',
    diff,
    shapeChanged: true
  })

  const renderCard = (diff: DiffLine[]): string =>
    renderToStaticMarkup(
      createElement(OutcomeCard, {
        outcome: outcome(diff),
        endpointLabel: 'bilibili/Comments',
        busy: false,
        onStore: () => Promise.resolve(),
        onDiscard: () => Promise.resolve()
      })
    )

  it('整张卡片渲出来，截断提示与出口按钮都在 diff 那页上', () => {
    const html = renderCard(diffLines(1000))
    expect(TRUNCATED.test(html)).toBe(true)
    expect(html).toContain('再看 400 条')
    // tab 上那个总数与提示里的总数是同一个 —— 一处报 1000 另一处报 400 是这一条要挡的
    expect(html).toContain('类型 diff（1000）')
  })

  it('没超过上限的那张卡片上一句截断提示都没有', () => {
    const html = renderCard(diffLines(12))
    expect(TRUNCATED.test(html)).toBe(false)
    expect(html).not.toContain('没展开')
    expect(html).toContain('类型 diff（12）')
  })
})
