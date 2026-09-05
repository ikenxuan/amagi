/**
 * 「响应 JSON」那块面板的两条分支：server 给了高亮走 `CodeBlock`，没给就回落成纯文本。
 *
 * **这里真的把组件渲出来**，靠 `react-dom/server` 的 `renderToStaticMarkup` —— 它随 `react-dom`
 * 一起装着，不需要 jsdom 也不需要 testing-library（vitest 跑在 node 环境，见根
 * `vitest.config.ts`）。HeroUI / react-aria-components 本来就支持 SSR，所以这条路上量到的是
 * 真的 DOM 结构，而不是「源码里有没有某个字符串」。
 *
 * 为什么测 `PayloadPanel` 而不是整张 `OutcomeCard`：`Tabs` 只渲选中的那一页，而卡片默认停在
 * `diff` 那页 —— 从外面渲整张卡片，这两条分支一条都进不去。
 *
 * 三件要钉住的事：
 *
 * 1. **有高亮时不再自己 stringify**。那条老路（`JSON.stringify(payload).slice(0, 20_000)`）
 *    白跑了 server 上每一发的 tokenizer，而 `payloadHighlight` 在整个 `src/` 里零引用。
 * 2. **截断在两条路上都说得出来**。契约（`shared/contract.ts:119-125`）要求的是「界面必须说」，
 *    而在这之前唯一会说的是 `CodeBlock`，它只被一个从未挂载的组件用着。
 * 3. **回落这条路不许自己拼 HTML**。它是纯文本 `<pre>`，转义交给 React ——
 *    `CodeBlock` 的 `dangerouslySetInnerHTML` 安全的全部理由在 server 侧的 shiki 那里。
 */

import { readFileSync } from 'node:fs'

import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { HighlightedCode, JsonValue } from '../shared/contract'

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
const { PayloadPanel } = (await import(MODULE)) as {
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
