/**
 * 这一轮新长出来的三块「看东西的」：**Monaco 那块响应查看器**、**类型那棵结构树**、
 * 以及**「用哪一组参数」那个下拉**。
 *
 * 三块各自要钉的事完全不同，所以这份文件分三组：
 *
 * 1. **Monaco 那块**：判据是**它到底 import 了什么**。那是这一块唯一会悄悄失控的地方 ——
 *    `editor/editor.main` 与 `editor/editor.api` 差着 80 多种语言与四套 LSP 语言服务，
 *    而两者渲出来的编辑器**看起来一模一样**。写错一个说明符，产物从 2.9 MB 变成十几 MB，
 *    界面上一个像素都不变。
 * 2. **那棵树**：`typeOf` 是纯的，直接喂值断言；渲染那半用 `renderToStaticMarkup`
 *    （同 `paramForm.test.ts` 那条路，node 里不需要 jsdom）。
 * 3. **那个下拉**：钉的是「`种子默认值` 是一个真的选项」—— 它是这个控件唯一容易做错的地方
 *    （做成「清空选择」的话，「我现在用的是哪一组」在没选中的时候就答不出来）。
 */

import { readFileSync } from 'node:fs'

import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { JsonValue, RequestEntry } from '../shared/contract'

/**
 * `src/lib/api.ts` 在**模块初始化时**读 `location.search`（口令从页面 URL 取），而 vitest
 * 跑在 node 环境里 —— 下面那两个动态 import 会经它一路带进来。同 `appLayout.test.ts:40`。
 */
vi.stubGlobal('location', new URL('http://localhost:5173/'))

const read = (path: string): string => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')

/**
 * 去掉注释再断言 —— 否定断言尤其需要：这几个文件的注释里正当地写着那些说明符。
 *
 * **行注释先删、块注释后删**，而顺序反过来会咬人：一行注释里只要出现 `/` 紧跟 `*`
 * 的序列（写包的 `exports` 通配时很自然就会写出来），块注释那条正则就会把它当成块注释的开头，
 * 一路吃到下一个 `*​/` —— 中间的**真代码**（这个文件里正好是那几行 import）跟着消失，
 * 于是「没有 import 某个东西」那类断言会**假绿**，而「有 import 某个东西」会莫名其妙地红。
 *
 * 踩过一次：`JsonViewer.tsx` 里解释 Monaco 那个 `exports` 的注释就长那样，
 * 于是这里读到的源码从 `import * as monaco` 那行起少了一整段。
 * 那侧的注释已经改写成不含那个序列（并留了一句指回这里），这里的顺序也一起纠正 ——
 * 两处都改是刻意的：任一处单独成立时这个坑就不会再犯。
 */
const codeOf = (source: string): string => source.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

const TREE_MODULE = '../src/components/TypeTree'
const { TypeTree, typeOf } = (await import(TREE_MODULE)) as {
  TypeTree: (props: { payload?: JsonValue }) => ReactNode
  typeOf: (value: JsonValue) => string
}

const REQUEST_MODULE = '../src/components/RequestPane'
const { ExamplePicker } = (await import(REQUEST_MODULE)) as {
  ExamplePicker: (props: {
    examples: readonly RequestEntry[]
    loadedId?: string
    onPick: (next: { id: string; params: Record<string, JsonValue> } | undefined) => void
  }) => ReactNode
}

describe('Monaco：走完整的聚合入口，而那是修两个 bug 的方式', () => {
  const viewer = codeOf(read('components/JsonViewer.tsx'))
  /** 注释要留着的那一条：'codicon' 只出现在注释里（它是 import 的**副作用**，没有一行代码提到它） */
  const viewerRaw = read('components/JsonViewer.tsx')

  it('走聚合入口 `monaco-editor`，**不再**手挑 contribution 清单', () => {
    // 上一轮走的是 `editor/editor.api` + 一份手挑清单，而那条路漏了两样东西，
    // **两样都是用户报上来的 bug**：折叠箭头渲成空心矩形（缺 `codicon.css` 那份 @font-face）、
    // 粘性滚动与正文重叠（手写主题漏了 `editorStickyScroll.background`）。
    // 成因是同一个：手挑意味着「我以为需要的」与「它实际需要的」之间有缝。
    // 这个包 private、永不发布、只在本机跑 —— 那条缝不值得用体积去换
    expect(viewer).toContain("import * as monaco from 'monaco-editor'")
    expect(viewer).not.toContain('editor/editor.api')
    expect(viewer).not.toContain('editor/contrib/')
  })

  it('**图标字体是那个 import 的副作用**，而这件事只能记在注释里', () => {
    // `codicon.css`（`@font-face { font-family: "codicon" }` + `codicon.ttf`）由
    // `editor/editor.main.js` import。想显式再写一行 import 它是**不行**的：
    // 那个包的 exports 只有 `"./*": "./esm/vs/*.js"`（都补 .js），CSS 走不通、rolldown 直接报解析失败。
    // 所以判据落在**注释**上 —— 那是「谁保证了折叠箭头有字形」唯一的记录处
    expect(viewerRaw).toContain('codicon')
  })

  it('四个 worker 都接上了，而漏掉这一段是**静默降级**不是报错', () => {
    // 少了 `MonacoEnvironment` 的表现：语言服务那一半（真正的 folding range、语法诊断、
    // 括号配对）全部不生效，而编辑器照常渲出来 —— 于是「折叠为什么按缩进走」毫无线索
    expect(viewer).toContain('globalThis.MonacoEnvironment')
    for (const label of ['json', 'css', 'html', 'typescript']) expect(viewer, label).toContain(`case '${label}':`)
    // 五个 `?worker` import：Vite 把它们各编成一个独立 chunk，而不是让 Monaco 猜运行时 URL
    expect(viewer.match(/\?worker'/g)).toHaveLength(5)
  })

  it('折叠**按结构**折 —— 用内置 JSON 语言服务，不再自己写 Monarch + 按缩进', () => {
    // `language: json` 加上「不给 foldingStrategy」（默认 auto = 有语言服务就用它给的 range）
    expect(viewer).toContain("language: 'json'")
    expect(viewer).not.toContain('foldingStrategy')
    expect(viewer).not.toContain('setMonarchTokensProvider')
  })

  it('主题 `inherit: true` —— 那是「粘性滚动与正文重叠」那个 bug 的解药', () => {
    // 上一版是 `inherit: false` 加六个 color key，于是 `editorStickyScroll.background`
    // 这类没列到的键全是 undefined、渲出来透明。Monaco 的 color key 有几百个，手列必然漏
    expect(viewer).toContain('inherit: true')
    expect(viewer).not.toContain('inherit: false')
  })

  it('背景那几个键：编辑器透明、**粘性滚动不透明**', () => {
    // 前者让底色由外面那块面板给（换肤自动跟上）；后者必须不透明 —— 它悬在正文上面，
    // 透明就等于重叠。取的是 `--surface-secondary` 在两个主题下的实际色值
    expect(viewer).toContain("'editor.background': '#00000000'")
    expect(viewer).toContain("'editorStickyScroll.background': palette.sticky")
    expect(viewer).toContain("'editorStickyScrollGutter.background': palette.sticky")
    expect(viewer).not.toMatch(/sticky: '#0{6,8}'/)
  })

  it('只读，而且**底下那个 textarea 也是只读的**', () => {
    // 少了 `domReadOnly` 读屏会把这块念成「可以往里打字的编辑框」，而这里一个字都不该改
    expect(viewer).toContain('readOnly: true')
    expect(viewer).toContain('domReadOnly: true')
  })

  it('`automaticLayout` 开着 —— 两栏是能拖的，而 Monaco 不会自己发现容器变了', () => {
    expect(viewer).toContain('automaticLayout: true')
  })
})

/**
 * **Monaco 的体积由 `vite.config.ts` 那两处保证，不由这个组件保证。**
 *
 * 两处都是「删掉之后界面一个像素都不变、而产物判据当场崩」的那种 —— 也就是最需要绊线的那种。
 * 判据读的是配置文件本身：这两件事在浏览器里量不到（要跑一次真构建），
 * 而 CI 那侧的数字判据只会说「超了」，说不出「谁改了什么」。
 */
describe('Monaco 那两条构建约束', () => {
  const config = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')

  it('**收成一个 chunk**：不收会散成 100 多个，而那时 CI 那条判据认不出它们', () => {
    // 散开的话是 `editor.api`（2.6 MB）+ 五个 worker + 80 多个语言定义
    // （`solidity` / `pgsql` / `abap` …）。那些小 chunk 的名字里没有 `monaco` 这三个字、
    // minify 之后内容里也没有 —— 于是「Monaco 单列一条、其余守 840 KB」那条判据
    // 无论按名字还是按内容都会漏一片，`REST` 会被冤枉成 3.9 MB
    expect(config).toContain('codeSplitting')
    expect(config).toMatch(/name: 'monaco'/)
    expect(config).toMatch(/monaco-editor/)
    // `advancedChunks` 在 rolldown 1.2.6 已 deprecated（构建时会 WARN），两个都给的话前者胜。
    // 判据对着**去掉注释**的那份问：注释里正当地写着这个名字（解释为什么不用它）
    expect(codeOf(config)).not.toContain('advancedChunks')
  })

  it('**不进 `modulepreload`**：进了首屏集合会从 644 KB 跳到 4.9 MB', () => {
    // 收成一个 chunk 之后它变成「被多处共享的 chunk」，Vite 于是把它写进 preload 名单 ——
    // 而那份代码在人按下「发送」之前一个字节都用不到（`JsonViewer` 是懒加载的）。
    // `resolveDependencies` 只过滤 preload 名单，**不影响真正的 `import()`**
    expect(config).toContain('modulePreload')
    expect(config).toContain('resolveDependencies')
    expect(config).toMatch(/monaco-/)
  })
})

describe('typeOf：说的是 JSON Schema 那套词，不是 `typeof`', () => {
  it('整数说 `integer`，小数说 `number`', () => {
    // 判据是这个工具的下游（`packages/typegen` 与 `openapi.json` 都区分这两个），
    // 而人盯着 `"fans": 229806` 时想知道的正是「这是个计数还是个比率」
    expect(typeOf(229_806)).toBe('integer')
    expect(typeOf(1.5)).toBe('number')
    expect(typeOf(-3)).toBe('integer')
  })

  it('数组带长度、对象说 `object`、null 说 `null`', () => {
    expect(typeOf([1, 2, 3])).toBe('array (3)')
    expect(typeOf([])).toBe('array (0)')
    expect(typeOf({ a: 1 })).toBe('object')
    // **`null` 不能说成 `object`**（`typeof null === 'object'` 是 JS 的历史事故）
    expect(typeOf(null)).toBe('null')
  })

  it('字符串与布尔照原样', () => {
    expect(typeOf('猫')).toBe('string')
    expect(typeOf(true)).toBe('boolean')
  })
})

describe('那棵结构树', () => {
  const render = (payload?: JsonValue): string => renderToStaticMarkup(createElement(TypeTree, { payload }))

  it('payload 没有那一档是一行提示，不是一棵空树', () => {
    // 「还没发过」那一档整栏已经是一句话（`ResultPane` 的空态），轮不到这棵树 ——
    // 走到这里的只剩「有结果、但没有 payload」那一种（一发都没打出去）
    const html = render(undefined)
    expect(html).toContain('这一份没有响应正文')
    expect(html).not.toContain('<ul')
  })

  it('**默认展开根与根的直接子容器** —— 一屏之内看得见第二层', () => {
    // 这个仓库的响应几乎全是 `{code, message, data}` 那个壳子，第一层没有信息；
    // 而全展开的话一份 2000 行的响应会摊出几千行，那就退回成了没有折叠的原样
    const html = render({ code: 0, data: { card: { mid: '2' }, following: true } })
    // 第二层那两个键渲出来了（`data` 是展开的）
    expect(html).toContain('card')
    expect(html).toContain('following')
    // 而第三层没有（`card` 是收着的）
    expect(html).not.toContain('mid')
  })

  it('层级真的在 `<ul>` / `<li>` 里，不是一堆 div', () => {
    // 读屏会报「列表，N 项」并能按层跳；一堆 div 什么都报不出来
    const html = render({ data: { a: 1 } })
    expect(html).toContain('<ul')
    expect(html).toContain('<li')
  })

  it('可展开的那些有 `aria-expanded`，不可展开的**不渲按钮但占位**', () => {
    const html = render({ data: { a: 1 }, code: 0 })
    expect(html).toContain('aria-expanded="true"')
    // 箭头那一格恒占位（等宽的空 span），于是一列箭头对齐、「哪些还能往下看」扫一眼看得出
    expect(html).toContain('aria-hidden="true"')
  })

  it('空容器**不算可展开** —— 展开之后是一片空白', () => {
    const html = render({ empty: {}, list: [] })
    expect(html).toContain('array (0)')
    // 两个都是空的 ⇒ 除了根那个箭头，一个可展开的都不该有
    expect(html.match(/aria-expanded/g)).toHaveLength(1)
  })

  it('数组按下标摊开', () => {
    const html = render({ list: [{ a: 1 }] })
    expect(html).toContain('[0]')
  })

  it('**自引用形状不会把栈打爆**：12 层之外只说类型不再往下摊', () => {
    // 响应里出现过分页游标里套着上一页的请求那种结构
    const deep: Record<string, unknown> = {}
    let cursor = deep
    for (let level = 0; level < 40; level++) {
      cursor.next = {}
      cursor = cursor.next as Record<string, unknown>
    }
    expect(() => render(deep as JsonValue)).not.toThrow()
  })
})

describe('「用哪一组参数」那个下拉', () => {
  const entry = (id: string, label: string, params: Record<string, JsonValue>): RequestEntry => ({
    id,
    label,
    params,
    recordedAt: '2026-09-05T21:48:37Z',
    verdict: 'ok'
  })

  const render = (loadedId?: string): string =>
    renderToStaticMarkup(
      createElement(ExamplePicker, {
        examples: [entry('1', '默认111', { host_mid: 1 }), entry('2', '222', { host_mid: 114_514 })],
        loadedId,
        onPick: () => undefined
      })
    )

  /**
   * **弹层里那几项渲不出来。**
   *
   * `Select.Popover` 只在打开时挂载（RAC 的 `Popover` 走 overlay 那一套），而
   * `renderToStaticMarkup` 下没有事件也没有 portal —— 所以「每一项长什么样」这一半量不到。
   * 补它需要一个真浏览器（那条路在 `mcp` 那侧手验过：两条记录 `1 — 默认111` / `2 — 222` 都在）。
   *
   * 量得到的是收起来那颗按钮上的东西，而这一组要钉的那件事恰好就在上面：
   * **`种子默认值` 是一个真的选项**（它是 `selectedKey` 的默认值，于是那颗按钮上写着它），
   * 而不是「没选中」。做成后者的话「我现在用的是哪一组」在默认状态下答不出来。
   */
  it('**默认那一档在按钮上说得出名字** —— `种子默认值` 是一个真的选项，不是「没选中」', () => {
    const html = render(undefined)
    expect(html).toContain('种子默认值')
    // 没选中的话 RAC 会渲 placeholder（`Select.Value` 的 `isPlaceholder` 那一支）
    expect(html).not.toContain('data-placeholder')
  })

  it('选中某一条时按钮上是那条的 `id`', () => {
    expect(render('2')).toContain('2')
  })

  it('报得出一共有几组进了 git', () => {
    expect(render(undefined)).toContain('进 git 的那 2 组')
  })
})
