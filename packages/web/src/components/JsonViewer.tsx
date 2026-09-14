/**
 * 响应 JSON 的查看器：**完整的 Monaco（VSCode 的编辑器内核）**。
 *
 * ## 为什么是「完整的」
 *
 * 这个界面上最贵的一件事是**读一份几千行的响应**，而原先那块 shiki 渲出来的 HTML
 * 只能做一件事：从上往下滚。折叠、搜索、括号匹配、跳到第 N 行，一个都没有。
 *
 * 上一轮为了压体积走的是「`editor/editor.api` + 手挑一份 contribution 清单」那条路，
 * **而那条路漏了两样东西，两样都是用户报上来的 bug**：
 *
 * 1. **折叠箭头渲成一个空心矩形**（tofu）。`codicon.css` 里那份 `@font-face`
 *    （`base/browser/ui/codicons/codicon/codicon.css`）是 `editor.main` import 的，
 *    `editor.api` 不带 —— 于是 `.codicon-folding-expanded` 那个字形找不到字体。
 * 2. **粘性滚动那一条与正文重叠。** 它的底色来自
 *    `--vscode-editorStickyScroll-background`（`stickyScroll.css:6`），而手写的主题里
 *    `inherit: false` 加只定义了六个 color key —— 那个键没定义 ⇒ 透明 ⇒ 正文从它底下透上来。
 *
 * 两样的成因是同一个：**手挑清单意味着「我以为需要的」与「它实际需要的」之间有缝**，
 * 而缝在哪里只有用起来才知道。这个包 `private: true`、永不发布、只在本机开发时跑
 * （`pnpm console`），所以那条缝不值得用体积去换 —— 现在整份 `editor.main` 进来，
 * 语言服务、全部 contribution、图标字体、全套主题 color key 一次到位。
 *
 * 体积那侧的判据因此改成「**Monaco 单列一条，其余产物一个字节不放松**」：
 * 总量那条线的作用一直是拦 Node 依赖泄漏（靠「几百 KB 的突然增长藏不住」），
 * 把 Monaco 并进去会让它失灵。数字与理由在 `.github/workflows/release.yml` 那几行旁边。
 *
 * ## 走内置的 JSON 语言服务，于是折叠是**按结构**折的
 *
 * 上一轮自己注册了 20 行 Monarch 规则 + `foldingStrategy: 'indentation'`。那份对
 * `JSON.stringify(x, null, 2)` 出来的文本恰好正确（缩进与结构一一对应），
 * 但它是**恰好**正确 —— 而 `languages/features/json` 那套语言服务提供真正的 folding range，
 * 顺带给了括号配对着色、以及「这份 JSON 有语法错误」的提示（响应被截断时看得见）。
 *
 * 代价是它要一个 worker，而那正是下面 `MonacoEnvironment` 那一段。
 *
 * ## 主题：背景透明，其余全部继承
 *
 * Monaco 的主题只吃**字面色值**，读不了 CSS 变量 —— 而这个仓库整套换肤都在变量上
 * （`src/index.css`）。所以这里只做一件事：`base` 取 `vs` / `vs-dark`、
 * **`inherit: true`**（那是上一轮那个重叠 bug 的解药：几百个 color key 都从基础主题继承），
 * 然后把背景那几个键覆盖成透明 —— 底色由外面那块面板给，于是换肤自动跟上。
 */

import { useTheme } from '@heroui/react'
// **这一个 import 顺带把图标字体带进来了**，而那正是上一轮折叠箭头渲成空心矩形的原因：
// `codicon.css`（里面是 `@font-face { font-family: "codicon" }` 加 `codicon.ttf`）由
// `editor/editor.main.js` import，`editor/editor.api` 不带。
//
// 想显式再写一行 `import 'monaco-editor/base/…/codicon.css'` 是**不行**的：那个包的
// `exports` 只有两条通配，而两条都往结尾补 `.js` —— CSS 走不通，rolldown 直接报解析失败。
// 所以「图标从哪来」这件事只能记在这里。
//
// （那两条通配的原文刻意不抄进注释：它里头有一个 `/` 紧跟 `*` 的序列，而好几份测试用
// 「去掉注释再断言」那个朴素正则读这个文件 —— 那个序列会被当成块注释的开头，
// 把它到下一个块注释结尾之间的**真代码**一起吃掉。判据在 `test/viewers.test.ts` 的 `codeOf` 上。）
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
// 四个 worker。**Vite 的 `?worker` 后缀**：它把这些文件各编成一个独立的 worker chunk，
// 而不是让 Monaco 去猜一个运行时 URL（默认那条路要配 `baseUrl` 并把整个 `vs/` 目录拷进
// public/，在 Vite 里既不 hash 也不 tree-shake）
import CssWorker from 'monaco-editor/languages/features/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/languages/features/html/html.worker?worker'
import JsonWorker from 'monaco-editor/languages/features/json/json.worker?worker'
import TsWorker from 'monaco-editor/languages/features/typescript/ts.worker?worker'
import { useEffect, useRef } from 'react'

/**
 * 告诉 Monaco 每种语言的 worker 从哪来。**必须在第一次 `editor.create` 之前挂上。**
 *
 * 少了这一段的表现不是报错而是**静默降级**：语言服务那一半（真正的 folding range、
 * 语法诊断、括号配对）全部不生效，而编辑器照常渲出来 —— 于是「折叠为什么按缩进走」
 * 这种问题查起来毫无线索。
 *
 * 四个都列上而不是只列 json：这个界面今天只喂 JSON，但 `editor.main` 把四套语言服务
 * 都注册了，而它们**任何一个被触发时都会去问这个函数**（比如有人把类型声明也塞进来）。
 * 那时回一个 `EditorWorker` 会让那套语言服务在一个不认识它协议的 worker 上挂起。
 */
globalThis.MonacoEnvironment = {
  getWorker: (_workerId: string, label: string) => {
    switch (label) {
      case 'json':
        return new JsonWorker()
      case 'css':
      case 'scss':
      case 'less':
        return new CssWorker()
      case 'html':
      case 'handlebars':
      case 'razor':
        return new HtmlWorker()
      case 'typescript':
      case 'javascript':
        return new TsWorker()
      default:
        return new EditorWorker()
    }
  }
}

/**
 * 主题：**只覆盖背景，其余全部继承**。
 *
 * `inherit: true` 是上一轮那个「粘性滚动与正文重叠」bug 的解药 —— 那一版写了
 * `inherit: false` 加六个 color key，于是 `editorStickyScroll.background` 这类没列到的键
 * 全是 undefined、渲出来是透明的。Monaco 的 color key 有几百个，手列一份必然漏。
 *
 * 覆盖的四个都是「背景」：编辑器本体、gutter、以及粘性滚动那一条的两块。
 * 前两个设成全透明（底色由面板给，换肤自动跟上）；**粘性滚动那两块必须是不透明的** ——
 * 它悬在正文上面，透明就等于重叠。取的是 HeroUI `--surface-secondary` 那一档在两个主题下
 * 的实际色值（与面板标题行同色，于是它看起来就是「钉住的那一行」）。
 */
const THEMES = {
  light: { sticky: '#F0F0F2', border: '#E4E4E7' },
  dark: { sticky: '#3A3A40', border: '#2D2D33' }
} as const

/** 注册只做一次。Monaco 是模块级单例，重复注册会叠出两份 */
let registered = false
const registerOnce = (): void => {
  if (registered) return
  registered = true
  for (const [name, palette] of Object.entries(THEMES)) {
    monaco.editor.defineTheme(`amagi-${name}`, {
      base: name === 'dark' ? 'vs-dark' : 'vs',
      // **`true`** —— 见上面那段：几百个 color key 从基础主题继承，手列一份必然漏
      inherit: true,
      rules: [],
      colors: {
        // 全透明：底色由外面那块面板的 `--surface` 给
        'editor.background': '#00000000',
        'editorGutter.background': '#00000000',
        // 粘性滚动那一条**不透明**：它悬在正文上面
        'editorStickyScroll.background': palette.sticky,
        'editorStickyScrollGutter.background': palette.sticky,
        'editorStickyScroll.border': palette.border
      }
    })
  }
}

export interface JsonViewerProps {
  /** 要显示的正文。**已经 pretty-print 过** */
  text: string
}

/**
 * 只读的 JSON 查看器。
 *
 * **不是受控组件**：Monaco 自己管着一份 model，React 这边只在 `text` 变了的时候
 * `setValue` 一次。把它做成受控的（每次渲染都 `setValue`）会把折叠状态、滚动位置、
 * 选区全部清掉 —— 而那三样正是它值得存在的理由。
 */
export const JsonViewer = ({ text }: JsonViewerProps) => {
  const host = useRef<HTMLDivElement>(null)
  const editor = useRef<monaco.editor.IStandaloneCodeEditor>(null)
  const { resolvedTheme } = useTheme('system')

  useEffect(() => {
    if (host.current === null) return
    registerOnce()
    const instance = monaco.editor.create(host.current, {
      value: text,
      // 内置的 JSON 语言服务（`editor.main` 已经注册了它）。折叠因此是**按结构**折的，
      // 而不是上一轮那份「按缩进」的近似
      language: 'json',
      readOnly: true,
      // `domReadOnly` 让底下那个 textarea 也带上 `readonly` —— 少了它读屏会把这块
      // 念成「可以往里打字的编辑框」，而这里一个字都不该改
      domReadOnly: true,
      // 折叠：这一块的全部理由。**不给 `foldingStrategy`** —— 默认是 `auto`，
      // 也就是「有语言服务就用它给的 folding range」，而现在真的有
      folding: true,
      showFoldingControls: 'always',
      minimap: { enabled: false },
      // **`automaticLayout` 必须开**：两栏是能拖的（`SplitLayout.tsx`），
      // 而 Monaco 不会自己发现容器尺寸变了
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderLineHighlight: 'none',
      lineNumbersMinChars: 3,
      // 长行横向滚，不折行：一行 300 字符的 base64 折起来会把结构冲散
      wordWrap: 'off',
      fontSize: 12,
      lineHeight: 20,
      // 与整个界面同一份等宽栈（`src/index.css` 的 `@theme`）
      fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, monospace",
      fontLigatures: false,
      // 滚动条贴 HeroUI 那一档的粗细（`src/index.css` 最后一节）
      scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8, useShadows: false },
      overviewRulerLanes: 0,
      contextmenu: true,
      // 粘性滚动：顶上钉着当前这几行的父键路径（`"data": {` → `"card": {`）。
      // 深度给 4 —— 响应 JSON 常见的嵌套深度就在那一档，再多会把正文挤掉
      stickyScroll: { enabled: true, maxLineCount: 4 },
      // 括号配对着色：嵌套四五层的 JSON 里，靠颜色认对应的 `}` 比数缩进快
      bracketPairColorization: { enabled: true },
      // 响应里的 URL 变成可点的链接（`face` / `image` 那些字段全是图床地址）
      links: true,
      // **不可见字符要标出来。** 平台响应里出现过零宽空格与全角空格，
      // 而那种字符会让「这个字段的值看起来一样却对不上」变成一个查不出来的问题
      unicodeHighlight: { ambiguousCharacters: true, invisibleCharacters: true },
      // 只读查看器不需要这些，关掉一并省掉它们的渲染开销
      occurrencesHighlight: 'off',
      selectionHighlight: false,
      matchBrackets: 'always',
      guides: { indentation: true, highlightActiveIndentation: true, bracketPairs: false }
    })
    editor.current = instance
    return () => {
      instance.getModel()?.dispose()
      instance.dispose()
      editor.current = null
    }
    // 只在挂载时建一次。`text` 与主题各有自己的 effect，理由见组件注释
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 正文变了只 `setValue`，不重建实例
  useEffect(() => {
    const model = editor.current?.getModel()
    if (model !== undefined && model !== null && model.getValue() !== text) model.setValue(text)
  }, [text])

  useEffect(() => {
    monaco.editor.setTheme(resolvedTheme === 'dark' ? 'amagi-dark' : 'amagi-light')
  }, [resolvedTheme])

  // `min-h-0 flex-1` 让它填满所在那一格（与 `CodeBlock` 的 `fill` 同一条），
  // 而 Monaco 自己要一个有确定尺寸的宿主 —— `automaticLayout` 量的就是这个 div
  return <div ref={host} className="min-h-0 min-w-0 flex-1" />
}
