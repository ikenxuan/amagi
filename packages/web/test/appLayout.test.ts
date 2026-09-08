/**
 * 版面本身：**两栏并排（请求 / 结果），结果栏四个 tab + 底部动作条，加左边一条端点导航**，
 * 以及这一轮全部改动都压在上面的那条不变量 —— **每一栏自己滚，页面不滚**。
 *
 * 两路判据，分法与 `endpointJumper.test.ts` 那份相同：
 *
 * 1. **真渲**（`react-dom/server` 的 `renderToStaticMarkup`）—— 顶栏那条面包屑、源文件那条
 *    链接、批量那条进度条、左栏底下那份「最近」都是纯展示件，从各自的模块导出来单独渲，
 *    量的是真 DOM：`nav` 语义、`aria-current`、`href` / `rel`、有没有 `aria-valuenow`，
 *    以及那颗判定色点是不是**只**靠颜色说话。
 * 2. **读源码** —— 「真的排成了两栏」「高度契约的那条链」这类事量不到：`App` 整个渲不了
 *    （`useRequest` 一挂上就发请求）。而**造好但没挂载不报错**是这一轮已经出过三次的
 *    事故，所以照 `comparePanel.test.ts` 最后那组的先例，从源码那一侧钉。
 *
 * 另有两条**反方向**的绊线，钉的是「刻意没接」：`InputGroup`（这个界面没有可编辑的
 * URL 栏）与「假进度条」（`/api/record-batch` 一次性回全部结果）。两条都拴在契约的字段
 * 清单上 —— 契约真长出 `url` / 进度字段的那天它们会红，而那时**才**该考虑接上去。
 *
 * 这份文件原先钉的是「右栏是上下两块 `Card`：请求区 / 结果区」以及那两块里的组件顺序。
 * **那一版的毛病恰恰就在那两张卡片上**（一列往下堆、滚不到底、横向空着），三栏之后
 * 一张 `Card` 都没有、也没有「区」这个层级 —— 那几条连着一起删了。取代它们的是下面
 * 「每一栏自己滚」与「右边真的是两栏」这两组，判据从「有几张卡片」换成了高度契约本身。
 */

import { readdirSync, readFileSync } from 'node:fs'

import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { RecordOutcome } from '../shared/contract'
import { PANE, PANE_BODY, PANE_CODE, PANE_HEAD, PANE_INNER, PANE_TITLE } from '../src/lib/pane'

/**
 * `src/lib/api.ts` 在**模块初始化时**读 `location.search`（口令从页面 URL 取），而 vitest
 * 跑在 node 环境里 —— 静态 import `App.tsx` 会在第一行就炸。所以下面用动态 import，
 * 且**在这一行之后**（同 `endpointJumper.test.ts:38`）。
 */
vi.stubGlobal('location', new URL('http://localhost:5173/'))

/**
 * 说明符刻意都是变量：`test/` 归 `tsconfig.node.json` 管，那份没有 `jsx`，静态 import `.tsx`
 * 会 `TS6142`。**三个模块而不是一个** —— 这一轮把 `SourceLink` 与 `BatchProgress` 搬去了
 * 「请求」栏（它们说的都是这一栏的事），「最近」那份清单是新的一块。
 */
const APP_MODULE = '../src/App'
const REQUEST_MODULE = '../src/components/RequestPane'
const HISTORY_MODULE = '../src/components/HistoryList'

const SPLIT_MODULE = '../src/components/SplitLayout'

const { SplitLayout } = (await import(SPLIT_MODULE)) as {
  SplitLayout: (props: {
    panes: readonly {
      id: string
      node: ReactNode
      defaultSize?: string | number
      minSize?: string | number
      minSizeByOrientation?: { horizontal: string | number; vertical: string | number }
      children?: readonly {
        id: string
        node: ReactNode
        defaultSize?: string | number
        minSize?: string | number
        minSizeByOrientation?: { horizontal: string | number; vertical: string | number }
      }[]
    }[]
  }) => ReactNode
}

const { EndpointCrumbs } = (await import(APP_MODULE)) as {
  EndpointCrumbs: (props: { platform: string; endpoint: string }) => ReactNode
}
const { BatchProgress, RequestPane, SourceLink } = (await import(REQUEST_MODULE)) as {
  BatchProgress: (props: { combinations: number }) => ReactNode
  RequestPane: (props: {
    platform: { platform: string; hasCookie: boolean; endpoints: never[] }
    endpoint: {
      name: string
      summary: string
      schema: { properties: Record<string, { type: string }>; required: string[] }
      seeds: Record<string, readonly string[]>
      stored: number
      combinations: number
      unseeded: string[]
      source: string
      computed: boolean
    }
    busy: boolean
    sending: boolean
    onSend: () => void
    onBatch: () => void
    batchLoading: boolean
    requestsRevision: number
  }) => ReactNode
  SourceLink: (props: { source: string }) => ReactNode
}
const { HistoryList } = (await import(HISTORY_MODULE)) as {
  HistoryList: (props: {
    items: readonly { key: string; platform: string; endpoint: string; outcome: RecordOutcome; settled?: string }[]
    selectedKey?: string
    onSelect: (key: string) => void
  }) => ReactNode
}

/**
 * 那条地址。**这里抄一份而不是从组件那边导出来**：那份文件只导出组件，多导出一个
 * 常量会让 `react(only-export-components)` 亮一条警告。抄的这一份就是判据本身 ——
 * 对不上时红的是「地址变了」，而那正是要有人想一遍的事。
 */
const sourceUrl = (source: string): string => `https://github.com/ikenxuan/amagi/blob/main/${source}`

const render = (node: ReactNode): string => renderToStaticMarkup(node as never)

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

/** 去掉注释再断言 —— 否定断言尤其需要（同 `lazy.test.ts:39`：说明文字里就写着那些名字） */
const codeOf = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const APP = codeOf(read('src/App.tsx'))
const CONTRACT = read('shared/contract.ts')
const SHELL_SOURCE = read('src/components/PaneShell.tsx')
const SPLIT_SOURCE = read('src/components/SplitLayout.tsx')

/** `src/` 底下每一份源码（去注释），键是相对 `src/` 的路径 —— 「一处都没有」那几条要扫全部 */
const SRC: Record<string, string> = Object.fromEntries(
  [
    ...readdirSync(new URL('../src/', import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
      .map((entry) => entry.name),
    ...readdirSync(new URL('../src/components/', import.meta.url)).map((name) => `components/${name}`),
    ...readdirSync(new URL('../src/lib/', import.meta.url)).map((name) => `lib/${name}`)
  ].map((name) => [name, codeOf(read(`src/${name}`))])
)

/** 两栏各自的文件、标题 id、那个标题、以及它是不是 sr-only（结果栏的标题不占宽度） */
const PANES = [
  ['components/RequestPane.tsx', 'pane-request-title', '请求', false],
  ['components/ResultPane.tsx', 'pane-result-title', '结果', true],
  ['components/SamplePane.tsx', 'pane-sample-title', '样本处理', false]
] as const

describe('请求栏顶部动作关联同一张原生表单', () => {
  const endpoint = {
    name: 'videoWork',
    summary: '',
    schema: { properties: { aweme_id: { type: 'string' } }, required: ['aweme_id'] },
    seeds: { aweme_id: ['7300000000000000001'] },
    stored: 2,
    combinations: 3,
    unseeded: [],
    source: 'packages/core/src/videoWork.ts',
    computed: false
  }
  const pane = (state: { busy?: boolean; sending?: boolean; batchLoading?: boolean } = {}): string =>
    render(
      createElement(RequestPane, {
        platform: { platform: 'douyin', hasCookie: true, endpoints: [] },
        endpoint,
        busy: state.busy ?? false,
        sending: state.sending ?? false,
        onSend: () => undefined,
        onBatch: () => undefined,
        batchLoading: state.batchLoading ?? false,
        requestsRevision: 0
      })
    )
  const buttonOf = (html: string, label: string): string => {
    const at = html.indexOf(`>${label}<`)
    if (at < 0) throw new Error(`找不到「${label}」按钮`)
    return html.slice(html.lastIndexOf('<button', at), at)
  }

  it('标题之后先渲发送、重置、连录，再渲 picker / 第一参数字段', () => {
    const html = pane()
    const send = html.indexOf('>发送<')
    const reset = html.indexOf('>重置<')
    const batch = html.indexOf('>连录 3 种组合<')
    const field = html.indexOf('name="aweme_id"')
    expect(send).toBeGreaterThan(html.indexOf('>请求<'))
    expect(send).toBeLessThan(reset)
    expect(reset).toBeLessThan(batch)
    expect(batch).toBeLessThan(field)
  })

  it('发送与重置用 form 属性关联稳定 id；发送只为 record pending，重置在任意 busy 时禁用', () => {
    const recording = pane({ busy: true, sending: true })
    expect(buttonOf(recording, '发送')).toContain('form="request-params"')
    expect(buttonOf(recording, '发送')).toContain('data-pending="true"')
    expect(buttonOf(recording, '重置')).toContain('form="request-params"')
    expect(buttonOf(recording, '重置')).toContain('disabled=""')
    expect(recording).toMatch(/<form[^>]*id="request-params"/)

    const batching = pane({ busy: true, batchLoading: true })
    expect(buttonOf(batching, '发送')).toContain('disabled=""')
    expect(buttonOf(batching, '发送')).not.toContain('data-pending')
    expect(buttonOf(batching, '重置')).toContain('disabled=""')
  })
})

describe('顶栏那条 `平台 / 端点` 是真的面包屑', () => {
  const markup = render(createElement(EndpointCrumbs, { platform: 'bilibili', endpoint: 'videoInfo' }))

  it('**`nav` 里一个 `ol`** —— WAI-ARIA 的面包屑范式，而 RAC 只渲那个 `ol`', () => {
    expect(markup).toMatch(/^<nav aria-label="当前端点">/)
    expect(markup).toContain('<ol')
    // 两级各一个 `li`：层级在结构里，不再是一个字符串里的斜杠
    expect([...markup.matchAll(/<li\b/g)]).toHaveLength(2)
  })

  it('末级带 `aria-current="page"`，前一级不带', () => {
    expect(markup).toContain('aria-current="page"')
    expect([...markup.matchAll(/aria-current="page"/g)]).toHaveLength(1)
    // 末级就是端点名那一格
    expect(markup).toMatch(/aria-current="page"[^>]*>videoInfo|videoInfo[\s\S]{0,80}aria-current="page"/)
  })

  it('**平台那一级不是死链接** —— 没有可聚焦的 `tabindex`', () => {
    // 不给 `href` 的 `Link` 会渲成 `role="link" tabindex="0"`（RAC `Link.mjs:29`），
    // 那就是键盘能聚焦、按下去什么也不发生的东西。`isDisabled` 之后它是纯文本
    expect(markup).not.toContain('tabindex="0"')
    expect(markup).toContain('bilibili')
  })

  it('分隔符是装饰性的图形而不是文本里的斜杠', () => {
    expect(markup).toContain('<svg')
    expect(markup).not.toContain('bilibili/videoInfo')
  })
})

describe('`endpoint.source` 可以点开', () => {
  const source = 'packages/core/src/platforms/bilibili/endpoints/videoInfo.ts'
  const markup = render(createElement(SourceLink, { source }))

  it('地址是仓库那一份的 blob 链接，路径原样接在后面', () => {
    expect(markup).toContain(`href="${sourceUrl(source)}"`)
    // 路径没被切、没被 encode 成别的东西：斜杠仍是斜杠，`.ts` 还在
    expect(markup).toContain(`/blob/main/packages/core/src/platforms/bilibili/endpoints/videoInfo.ts"`)
  })

  it('新标签页打开，且带 `rel="noreferrer"`（连 `window.opener` 一起断）', () => {
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain('rel="noreferrer"')
  })

  it('**看得出来会离开这一页** —— `Link.Icon` 默认渲的那枚外链图标', () => {
    expect(markup).toContain('data-slot="link-icon"')
    expect(markup).toContain('<svg')
  })

  it('路径本身仍是可选中的文本（想在编辑器里打开的人复制它更快）', () => {
    expect(markup).toContain(source)
  })

  it('**「定义在」那三个字进了 `title`** —— 那一行只剩路径，但它是什么仍然拿得到', () => {
    // 这一行在「请求」栏最底下、`truncate` 着，所以那三个字换到了 hover 与读屏能拿到的地方；
    // 一个字都不说的话，一条孤立的仓库路径认不出是「端点定义在哪」
    expect(markup).toContain(`title="定义在 ${source}"`)
  })
})

describe('批量那条进度条：indeterminate，不是编出来的百分比', () => {
  const markup = render(createElement(BatchProgress, { combinations: 24 }))

  it('**没有 `aria-valuenow`** —— 这一条就是「没有假进度」本身', () => {
    expect(markup).toContain('role="progressbar"')
    expect(markup).not.toContain('aria-valuenow')
    // 也没有 `aria-valuetext`：读屏那边听到的是「忙，进度未知」，而不是一个编出来的数
    expect(markup).not.toContain('aria-valuetext')
  })

  it('`Fill` 不写宽度 —— 宽度与动画由 CSS 的 indeterminate 分支给', () => {
    expect(markup).toContain('data-slot="progress-bar-fill"')
    expect(markup).not.toContain('width')
  })

  it('能诚实说出口的那两件事都在：一共几组、还在跑', () => {
    expect(markup).toContain('aria-label="正在批量录制 24 组"')
    expect(markup).toContain('24 组…')
  })

  it('**契约上没有任何进度字段** —— 有了才谈得上换成 determinate', () => {
    const block = /export interface BatchResult \{([\s\S]*?)\n\}/.exec(CONTRACT)
    if (block === null) throw new Error('shared/contract.ts 里找不到 BatchResult —— 这条用例的判据没了')
    const fields = [...block[1].matchAll(/^ {2}(\w+)\??:/gm)].map((match) => match[1])
    // 一次 POST 回全部结果，这三个字段里没有「第几组」可读（`server/index.ts` 的 `/api/record-batch`）。
    // 将来真加了 SSE / 轮询，这条会红 —— 那种红的意思是「现在可以画真进度了」
    expect(fields).toEqual(['unseeded', 'notes', 'outcomes'])
  })
})

/**
 * **这一组是这一轮改动的支点。**
 *
 * 原先的毛病不是「上下排」而是「页面本身无限长」：批量录 24 组之后结果区有几十屏高，
 * 而人一次只看一份。解药是把滚动**从页面挪到每一栏里**，而那件事成立的全部条件是
 * 几个 class 的组合 —— 少任何一处，症状就一模一样地回来，而且编译、lint、渲染全绿。
 *
 * 所以判据分两层：`lib/pane.ts` 那几个常量各自带着该带的东西（**这份文件直接 import 它们，
 * 不读源码字符串**），以及 `App.tsx` 那一半（`<main>` 与两层容器）真的在链上。
 */
describe('每一栏自己滚，页面不滚', () => {
  it('`PANE_BODY` 是自己滚的那一层：`flex-1` + `overflow-y-auto` + `min-h-0`，缺一不可', () => {
    expect(PANE_BODY).toContain('overflow-y-auto')
    expect(PANE_BODY).toContain('flex-1')
    // flex 子项默认 `min-height: auto`，会被内容顶高、把 `overflow` 挤成无效 ——
    // `min-h-0` 不是保险而是必需：少这一处，那一栏就把整页撑长，而那正是刚修掉的 bug
    expect(PANE_BODY).toContain('min-h-0')
  })

  it('`PANE` 自己也带 `min-h-0`，`PANE_HEAD` 带 `shrink-0`（标题行永远在视野里）', () => {
    expect(PANE).toContain('min-h-0')
    expect(PANE).toContain('flex-col')
    // 响应有一万行时「留下 / 丢掉」还在原地 —— 那两颗按钮才是这个工具要人做的决定
    expect(PANE_HEAD).toContain('shrink-0')
    // 滚的只有正文：标题行自己不许滚
    expect(PANE_HEAD).not.toContain('overflow-y-auto')
  })

  it('**另一半在 `<main>` 上**：`lg:h-screen` + `lg:overflow-hidden`，而且两条都带 `lg:`', () => {
    const main = /<main className="([^"]*)"/.exec(APP)?.[1]
    if (main === undefined) throw new Error('App.tsx 里找不到 <main className="…"> —— 这条用例的判据没了')
    expect(main).toContain('lg:h-screen')
    expect(main).toContain('lg:overflow-hidden')
    // **窄屏上两条都不许生效**：那时两栏叠成两行，锁死高度会让每一栏只剩几行可见，
    // 比滚动糟得多。所以无前缀的那两个 class 不能出现，而 `min-h-screen` 要在
    expect(main.split(' ')).not.toContain('h-screen')
    expect(main.split(' ')).not.toContain('overflow-hidden')
    expect(main).toContain('min-h-screen')
  })

  it('**中间那两层容器也要能被压缩** —— 链上少一环，最里面那层的 `overflow` 就滚不起来', () => {
    // `<main>` → 那个横排的 flex 行 → 两栏的 grid。每一层都得 `min-h-0` + `flex-1`。
    // **这两层搬去了 `PaneShell.tsx`**（版面从「写死宽度」换成「可拖 + 纯 CSS 兜底」那一轮），
    // 判据跟着搬，形状一个字没变
    const shell = SRC['components/PaneShell.tsx']!
    expect(shell).toMatch(/<div className="flex[^"]*\bmin-h-0\b[^"]*\bflex-1\b[^"]*lg:flex-row">/)
    expect(shell).toMatch(/<div className="grid[^"]*\bmin-h-0\b[^"]*\bflex-1\b[^"]*">/)
    // 可拖那一层同样在链上：`Group` 自己写死了行内 `height: 100%`，而百分比高度要外面那层
    // 先有确定高度 —— 少了这层 `flex-1`，它会算成整个 `<main>` 的高度并把顶栏顶出视口
    expect(SRC['components/SplitLayout.tsx']).toMatch(/<div className="min-h-0 flex-1 p-2">/)
    // **`Tabs` 根也在链上（真实浏览器里撞出来的那一环）**：HeroUI 的 `.tabs` 基类只有
    // `flex gap-2 flex-col`，没有 `flex-1` / `min-h-0` —— 于是 `flex-grow: 0`、
    // `min-height: auto`，整棵 Tabs 按内容收缩，`.tabs__panel` 上那份 `flex-1` 对内容高的
    // 父级分不到空间，最底下那块（Monaco 宿主，`automaticLayout` 量的就是它）塌成 5px：
    // 实测 PANE 1105px → `.tabs` 根 93px → `.tabs__panel` 29px → 宿主 5px，响应正文整个消失
    // 而控制台零错误。旧响应栏没这病（正文层是 Surface 的直接子节点）；旧类型栏同样断在
    // `.tabs` 根上，只是被 `PANE_CODE` 的自封顶掩盖 —— 「结果」栏换成 `fill` 之后高度链
    // 必须一路通到 Surface，`Tabs` 根就得自己带上 `min-h-0` + `flex-1`
    const tabsRoot = /<Tabs\s[^>]*className="([^"]*)"/.exec(SRC['components/ResultPane.tsx'])
    if (tabsRoot === null) throw new Error('ResultPane.tsx 里 Tabs 根没接 className —— 这条用例的判据没了')
    expect(tabsRoot[1]).toContain('min-h-0')
    expect(tabsRoot[1]).toContain('flex-1')
  })

  it('**五块面板全用同一份常量，没有一处手抄那串 class**', () => {
    // 「长得一样」由构造保证（`lib/pane.ts` 文件头）：原先那份 `PANEL_SHELL` 是刻意的三份
    // 重复、靠测试对着读来保证一致；现在共用一个常量，那条判据就变成「只有一处写着它」。
    // 手抄一份的话，改滚动契约或换肤时必然漏掉它，而漏掉之后没有任何东西会红。
    //
    // `PANE_INNER` 不在这张单子里：它那串（`flex min-w-0 flex-col gap-3`）短到会与普通的
    // 一列布局撞上（`RequestPane` 里那个 `Tabs.Panel` 就是），撞上不代表手抄了外壳 ——
    // 它的判据在下一条，形状换成「那三块面板的根真的用了它」
    const constants = { PANE, PANE_BODY, PANE_HEAD, PANE_TITLE, PANE_CODE }
    for (const [name, value] of Object.entries(constants)) {
      for (const [file, code] of Object.entries(SRC)) {
        if (file === 'lib/pane.ts') continue
        expect(code, `${file} 里手抄了 ${name}`).not.toContain(value)
      }
    }
  })

  it('住在别人正文里的那三块面板，根节点是 `PANE_INNER` —— 不再自己画一圈边框', () => {
    // 它们原先各自带一圈 `rounded-2xl border p-4`（「面板自己就是一张卡片」的时代）。
    // 现在集合在请求栏的抽屉里、对比与已提交在结果栏的仓库抽屉里，再套一圈就是边框套边框 ——
    // 所以这个常量本身只许有纵向布局，边界由外面那块 `PANE` 给
    expect(PANE_INNER).not.toMatch(/\bborder\b|\brounded/)
    for (const name of ['RequestTable', 'ComparePanel', 'GeneratedPanel']) {
      const code = SRC[`components/${name}.tsx`]
      expect(code, name).toContain('<section className={PANE_INNER}>')
      expect(code, name).toContain("import { PANE_INNER } from '../lib/pane'")
      expect(code, name).not.toMatch(/className="[^"]*\brounded-2xl\b/)
    }
  })

  it('面板里那几块代码块的高度**要么填满自己那一格，要么吃 `PANE_CODE`** —— 不许各写一个数', () => {
    // 「响应」「声明」两页里是自带滚动的代码块，用 fill；「diff」那页用按视口算的 PANE_CODE
    //（唯一剩下的读者）。全文件恰好一处 maxHeight={PANE_CODE}
    expect(SRC['components/ResultPane.tsx']).toContain('fill />')
    expect(SRC['components/ResultPane.tsx']!.match(/maxHeight=\{PANE_CODE\}/g)).toHaveLength(1)
    expect(PANE_CODE).toContain('100vh')
  })

  it('结果栏四个 tab 的滚动契约逐 Panel 落：装代码块的两页 TIGHT、自己滚的两页 BODY', () => {
    // 「响应」「声明」里只有一块自带滚动的代码块 —— 外层再滚会在边界卡一下；
    // 「结构」「diff」的内容自己滚。class 必须落在每个 Tabs.Panel 上（四页两种契约）
    const code = SRC['components/ResultPane.tsx']!
    expect(code).toContain('<Tabs.Panel id="response" className={PANE_BODY_TIGHT}>')
    expect(code).toContain('<Tabs.Panel id="declaration" className={PANE_BODY_TIGHT}>')
    expect(code).toContain('<Tabs.Panel id="structure" className={PANE_BODY}>')
    expect(code).toContain('<Tabs.Panel id="diff" className={PANE_BODY}>')
  })
})

describe('右边真的是两栏，一栏一个问题', () => {
  const at = (needle: string): number => {
    const index = APP.indexOf(needle)
    if (index < 0) throw new Error(`App.tsx 里找不到 ${needle} —— 这条用例的判据没了`)
    return index
  }

  it('顺序是「拿什么参数打 → 看响应 → 处理样本」', () => {
    expect(at('<RequestPane')).toBeLessThan(at('<ResultPane'))
    expect(at('<ResultPane')).toBeLessThan(at('<SamplePane'))
    // 那句空态跟着 SamplePane 走了（空态即版面，首发前就占着那 30%）
    expect(SRC['components/SamplePane.tsx']).toContain('发送请求后，在这里决定是否保存样本。')
    // columns 档外层 40:60，右侧内部 70:30；fallback 的两层比例与可拖版默认值完全一致。
    // minmax 同时保住请求 22rem 与右侧 28rem 的横向阅读下限。
    expect(SHELL_SOURCE).toContain('xl:grid-cols-[minmax(22rem,2fr)_minmax(28rem,3fr)]')
    // rows 外层右侧必须容得下 12rem 响应 + 9rem 样本 + gap-2（0.5rem）；
    // 嵌套 Group 的下限不会反向传播给父 Panel，所以这条约束不能只写在子层。
    expect(SHELL_SOURCE).toContain('lg:grid-rows-[minmax(5rem,2fr)_minmax(21.5rem,3fr)]')
    expect(SHELL_SOURCE).toContain('grid-rows-[minmax(12rem,7fr)_minmax(9rem,3fr)] gap-2')
    expect(APP).toContain("defaultSize: '40%'")
    expect(APP).toContain("defaultSize: '60%'")
    expect(APP).toContain("defaultSize: '70%'")
    expect(APP).toContain("defaultSize: '30%'")
    // 断点同样两份：CSS 那份是 `xl:` 前缀，JS 那份在 viewport.ts —— 错开会出现
    // 「并排了但还当竖排拖」这种半截状态
    expect(SRC['lib/viewport.ts']).toContain('(min-width: 80rem)')
  })

  it('App 始终把请求与 result stack 组合在一起，stack 始终是响应在前、样本在后', () => {
    expect(APP).toContain("id: 'amagi-pane-request'")
    expect(APP).toContain("id: 'amagi-pane-result'")
    expect(APP).not.toContain("id: 'amagi-pane-result-stack'")
    expect(APP).toContain("id: 'amagi-pane-response'")
    expect(APP).toContain("id: 'amagi-pane-sample-actions'")
    expect(APP).toContain('children: [')
    expect(at("id: 'amagi-pane-request'")).toBeLessThan(at("id: 'amagi-pane-result'"))
    expect(at("id: 'amagi-pane-response'")).toBeLessThan(at("id: 'amagi-pane-sample-actions'"))
    // 样本处理区**恒在**（空态是它的第一档，首发前也占着那 30%），而它看的是同一份 `shown`
    expect(APP).toContain('<SamplePane')
    expect(APP).toMatch(/<SamplePane[\s\S]{0,400}outcome=\{shown\?\.outcome\}/)
  })

  it('**响应与样本处理共享同一份视图状态** —— 它升到了 App，两块面板各拿各的 props', () => {
    // Task 5 把「原始 / 样本」切换留在 ResultPane 内部，Task 6 把它升到最近的共同属主：
    // 复制按钮在 SamplePane 里，切换控件在 ResultPane 里 —— 状态再不共享，复制的就是另一份
    expect(APP).toContain('payloadView={payloadView}')
    expect(APP).toContain('onPayloadViewChange={')
    expect(APP).toMatch(/<ResultPane[\s\S]{0,1200}payloadView=\{payloadView\}/)
    expect(APP).toMatch(/<SamplePane[\s\S]{0,400}payloadView=\{payloadView\}/)
  })

  it('**两栏看的是同一份结果**，而那份结果是派生的、没有第二份状态', () => {
    // 两栏各读一份状态的话，「请求」栏是端点 A 而「结果」栏是端点 B —— 而队列刻意不随
    // 切端点清空（否则批量录完剩下的待定样本再也碰不到），所以过滤与挑选都只能有一处
    expect(APP).toContain('const shown = mine.find((item) => item.key === picked) ?? mine[0]')
    // 「结果」栏那一份走 JSX prop 传（整栏一个组件，props 全在那一个元素上）
    expect(APP).toContain('outcome={shown?.outcome}')
    expect(APP).toContain('const mine = queue.items.filter((item) => `${item.platform}/${item.endpoint}` === selected)')
  })

  it.each(PANES)('`%s` 是一块 `<Surface className={PANE}>`，标题接进 `aria-labelledby`（sr-only = %s）', (file, id, title, srOnly) => {
    const code = SRC[file]!
    expect(code).toContain(`const TITLE_ID = '${id}'`)
    expect(code).toContain('<Surface className={PANE} aria-labelledby={TITLE_ID} render={(props) => <section {...props} />}>')
    // 结果栏的 <h2> 不占宽度（四个 tab 名合起来就是标题），但读屏照常念「结果，区域」
    const h2 = srOnly ? '<h2 className={`sr-only ${PANE_TITLE}`} id={TITLE_ID}>' : '<h2 className={PANE_TITLE} id={TITLE_ID}>'
    expect(code).toContain(h2)
    expect(code).toMatch(new RegExp(`${h2.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*${title}`))
  })

  it('两栏的标题**全是同一档字号** —— 那两个问题在信息层级上真的同级', () => {
    // 谁比谁大都是假的层级：语义上的层级由 `<h2>` + `aria-labelledby` 给，不由字号给
    expect(PANE_TITLE).toContain('text-sm')
    expect(PANE_TITLE).not.toMatch(/text-(base|lg|xl|2xl)/)
  })
})

/**
 * **边框整个去掉了，分界改由底色梯子说。**
 *
 * 梯子是 HeroUI 现成的那条（这一轮没造新的）：页面 `--background` → 面板 `--surface` →
 * 标题行与内嵌块 `--surface-secondary`。两栏之间那道 8px 的缝里露出来的是页面底色，
 * 而面板比它亮一档 —— 边框只是把同一件事再说一遍。
 *
 * 这一组钉的是**结构**而不是「好不好看」：哪几个 class 不许再出现、面板的底色由谁给。
 * 变量那一侧（尤其是「输入框与承托它的面板同色」那个真 bug）在 `skin.test.ts` 里。
 */
describe('边框去掉了，分界由底色说', () => {
  it('`PANE` / `PANE_HEAD` 里一个 `border` 都没有', () => {
    for (const [name, value] of Object.entries({ PANE, PANE_HEAD })) {
      const classes = value.split(' ')
      expect(classes, name).not.toContain('border')
      expect(classes, name).not.toContain('border-b')
      expect(classes, name).not.toContain('border-border')
    }
  })

  it('面板的底色由 `<Surface>` 给，不由 `bg-surface` 工具类给', () => {
    // 两处都写会在换 variant 时错开；而走组件那条路还多一件事：`Surface` 往下提供
    // `SurfaceContext`（3.2.4 里还没有组件去读它，但上游一旦让控件按「我坐在哪种 surface 上」
    // 自选对比度，写死工具类的那份不会跟上）
    expect(PANE.split(' ')).not.toContain('bg-surface')
    // 标题行反过来**必须**自己带一档更亮的底色：那正是它替掉 `border-b` 的东西
    expect(PANE_HEAD).toContain('bg-surface-secondary')
  })

  it('顶栏那条 `border-b` 也去了 —— 它与页面同色，而面板是 surface，两色相邻本身就是边界', () => {
    const header = /<header className="([^"]*)"/.exec(APP)?.[1]
    if (header === undefined) throw new Error('App.tsx 里找不到 <header className="…"> —— 这条用例的判据没了')
    expect(header.split(' ')).not.toContain('border-b')
    // 窄屏那一档内容会从它底下滚过去，撑住分界的是这两个
    expect(header).toContain('backdrop-blur')
    expect(header).toContain('bg-background/80')
  })

  it('**两栏的标题行是同一个高度**，而那个高度写死在常量里、不由内容决定', () => {
    // 原先高度由内容决定，于是三栏三个高度（实测 56 / 36 / 56，发过一发之后响应那栏
    // 又是第四个值）—— 并排时那 20px 的错位让人以为三栏不是同一层东西。
    // 完整判据与数字写在 `lib/pane.ts` 的 `PANE_HEAD` 上
    expect(PANE_HEAD).toContain('h-14')
    // `flex-wrap` 是同一件事的另一半：东西一多就换行，把标题行顶成两倍高
    expect(PANE_HEAD).toContain('flex-nowrap')
    expect(PANE_HEAD.split(' ')).not.toContain('flex-wrap')
    // 高度只许出现在这一个常量里 —— 谁在自己那栏的标题行上再写一个 `h-*`，
    // 两栏就又不一样高了（而那种改动编译全绿、只有并排看才发现）
    for (const [file, code] of Object.entries(SRC)) {
      if (file === 'lib/pane.ts') continue
      expect(code, file).not.toMatch(/className=\{`?\$?\{?PANE_HEAD\}?`?[^}]*\bh-\d/)
    }
  })

  it('「保存 / 丢掉 / 复制」**不在结果栏的标题行里**，而在「样本处理」栏那一格里', () => {
    const code = SRC['components/ResultPane.tsx']!
    // 标题行：从 Tabs 起到第一个 Tabs.Panel 为止 —— 不从空态分支那个 PANE_HEAD 切，
    // 它在更前面，切它会测不到 tab 分支的标题行。哨兵那条同理：切片空了当场红，
    // 而不是让下面两条否定断言静默恒真
    const head = code.slice(code.indexOf('<Tabs defaultSelectedKey'), code.indexOf('<Tabs.Panel'))
    expect(head.length).toBeGreaterThan(0)
    expect(head).not.toContain('Toolbar')
    expect(head).not.toContain('保存')
    // 结果栏整栏不再拥有动作：它只管查看，处理全在 SamplePane（`ResultActions.tsx` 已删）
    expect(code).not.toContain('ResultActions')
    expect(code).not.toContain('onStore')
    const sample = SRC['components/SamplePane.tsx']!
    expect(sample).toMatch(/<Toolbar aria-label="这份结果的动作"/)
    expect(sample).not.toContain('ACTIONS_TITLE_ID')
  })

  it('`src/` 里再没有任何一处画边框的 class', () => {
    // 这一条是整页去边框的**全局**绊线：上面那几条只管面板与顶栏，而「顺手给某块加一圈边」
    // 是最容易回来的那种改动。`border-*` 里表示**颜色**的（`after:bg-border`）不算 ——
    // 那是分隔条正中那根线，它是可拖拽的把手而不是装饰性的轮廓。
    //
    // **`TypeTree.tsx` 是唯一的例外，而它不是一圈边框**：那里的 `border-l` 是树的缩进导线
    // （一层一条竖线，落在 `<ul>` 的左边）。它是**层级本身的可见证据** ——
    // 去掉之后「这个字段嵌在哪一层」只剩下 padding 能猜，而那正是那棵树存在的理由。
    // 判据因此是「只许单边、且只许这一个文件」：真有人给它加一圈 `border` 时这条照样红
    for (const [file, code] of Object.entries(SRC)) {
      if (file === 'components/TypeTree.tsx') {
        // 判据不是「不含某个正则」而是**把它用到的 border 类全列出来逐字比**：
        // 只许 `border-l`（那条竖线）与 `border-border`（它的颜色）。
        // 真有人给它加一圈 `border` 或者一条 `border-b` 时这条会红，而它现在这两个不红
        const used = [
          ...new Set(
            [...code.matchAll(/className="([^"]*)"/g)].flatMap((match) => match[1]!.split(/\s+/)).filter((c) => /^border(-|$)/.test(c))
          )
        ].sort()
        expect(used, file).toEqual(['border-border', 'border-l'])
        continue
      }
      expect(code, file).not.toMatch(/className="[^"]*\bborder(-[btlrxy]|-border)?\b/)
    }
  })
})

/**
 * 栏宽可拖那一层。判据全在源码那一侧 —— 拖动本身要 pointer 事件与真布局，
 * 而这套测试跑在 node 里（`renderToStaticMarkup`，没有事件循环也没有 `matchMedia`）。
 *
 * 所以这里钉的是**三条它成立的前提**，每一条都是踩过或算过的：懒加载边界（入口预算）、
 * 分隔条的无障碍（键盘能不能拖）、以及 `Panel` 那层行内 `overflow` 必须被盖掉（双滚动条）。
 */
describe('两栏可以拖，而那一层是懒加载的', () => {
  const shell = SRC['components/PaneShell.tsx']!
  const split = SRC['components/SplitLayout.tsx']!

  it('`react-resizable-panels` **只在懒加载的那个文件里** import —— 入口预算只剩不到两万字节', () => {
    for (const [file, code] of Object.entries(SRC)) {
      if (file === 'components/SplitLayout.tsx') continue
      expect(code, file).not.toContain("from 'react-resizable-panels'")
    }
    expect(shell).toContain("lazy(() => import('./SplitLayout')")
    // fallback 必须是**同一份版面**而不是骨架 / 转圈：两份的默认尺寸逐字相同，
    // 于是 chunk 落地时一个像素都不动（判据在上面那条「顺序是…」里）
    expect(shell).toContain('fallback={<StaticPanes {...props} />}')
  })

  it('窄屏那一档连 chunk 都不请求 —— 三块区域按请求、响应、样本自然流动', () => {
    expect(shell).toContain("if (layout === 'stack') return <StaticPanes {...props} />")
    expect(SHELL_SOURCE).toMatch(/layout === 'stack'\s*\? 'flex flex-col gap-2'/)
    expect(SHELL_SOURCE).toContain("'grid h-full min-h-0 grid-rows-[minmax(12rem,7fr)_minmax(9rem,3fr)] gap-2'")
    expect(SHELL_SOURCE).toContain('<div className="grid h-full min-h-0 min-w-0" key={child.id}>')
    expect(SHELL_SOURCE).toContain('<div className="grid h-full min-h-0 min-w-0">{panes[0]!.node}</div>')
  })

  it('三条分隔条都由键盘可操作的 `Separator` 提供，并各有明确名字', () => {
    // 端点导航 / 请求与右侧 / 响应与样本三条边都使用库组件，不手搓 pointer 事件。
    expect(split).toContain("import { Group, type LayoutStorage, Panel, Separator, useDefaultLayout } from 'react-resizable-panels'")
    const markup = render(
      createElement(SplitLayout, {
        panes: [
          {
            id: 'request',
            node: createElement('div'),
            defaultSize: '40%',
            minSizeByOrientation: { horizontal: '22rem', vertical: '5rem' }
          },
          {
            id: 'result',
            node: null,
            defaultSize: '60%',
            minSizeByOrientation: { horizontal: '28rem', vertical: '5rem' },
            children: [
              { id: 'response', node: createElement('div'), defaultSize: '70%', minSize: '12rem' },
              { id: 'sample', node: createElement('div'), defaultSize: '30%', minSize: '9rem' }
            ]
          }
        ]
      })
    )
    expect([...markup.matchAll(/role="separator"/g)]).toHaveLength(2)
    expect(markup).toContain('aria-label="拖动调整请求区与右侧区域的宽高"')
    expect(markup).toContain('aria-label="拖动调整响应区与样本处理区的高度"')
    // 导航存在时第三条有自己独立的名字；源码断言覆盖这个条件分支。
    expect(split).toContain('aria-label="拖动调整端点列表的宽度"')
  })

  it('尺寸记在三个相互独立的 localStorage 账本里', () => {
    expect(split).toContain("typeof localStorage === 'undefined'")
    expect(split.match(/storage: LAYOUT_STORAGE/g)).toHaveLength(3)
    expect(split).toContain('id: `amagi-panes-${orientation}`')
    expect(split).toContain("id: 'amagi-result-stack-vertical'")
    expect(split).not.toContain('useUrlParam')
  })

  it('每个 pane 自己声明默认值和方向下限，布局器不再按数组位置猜语义', () => {
    expect(SPLIT_SOURCE).toMatch(
      /interface SplitPane \{[\s\S]*defaultSize\?: string \| number[\s\S]*minSize\?: string \| number[\s\S]*minSizeByOrientation\?:/
    )
    expect(split).toContain('defaultSize={pane.defaultSize}')
    expect(split).toContain('minSize={pane.minSizeByOrientation?.[orientation] ?? pane.minSize}')
    expect(APP).toContain("minSizeByOrientation: { horizontal: '22rem', vertical: '5rem' }")
    expect(APP).toContain("minSizeByOrientation: { horizontal: '28rem', vertical: '21.5rem' }")
    expect(split).not.toContain("index === 0 ? '28rem'")
  })

  it('`Panel` 那层行内 `overflow: auto` 被盖掉了 —— 不然每一栏会有两个滚动条', () => {
    // 库往 `Panel` 内层那个 div 上写死了行内 `overflow: 'auto'`，而行内样式压得过 `PANE`
    // 上的 `overflow-hidden` 工具类。它把用户的 `style` 拼在自己那份之后，所以覆盖得掉
    expect(split).toContain("const CLIP = { overflow: 'hidden' } as const")
    expect(split.match(/style=\{CLIP\}/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('尺寸记在 localStorage，且**显式传了一份能在 node 里跑的 storage**', () => {
    // `useDefaultLayout` 的 `storage` 默认参数是裸的 `localStorage`，而默认参数是调用时求值 ——
    // node 里（`renderToStaticMarkup`）那是个 `ReferenceError`，一渲染就炸
    expect(split).toContain("typeof localStorage === 'undefined'")
    // 三份账：外壳（导航 vs 主区）、请求 vs 右侧、响应 vs 样本处理
    expect(split.match(/storage: LAYOUT_STORAGE/g)).toHaveLength(3)
    // 栏宽刻意**不进 URL**（其余界面状态都进）：它是「我这块屏幕上顺手的宽度」，
    // 分享给别人只会把对方的版面按我的屏幕比例改一遍
    expect(split).not.toContain('useUrlParam')
  })
})

/**
 * 左栏底下那份「最近」。**它替掉的是原先那个「一份结果一张卡片、竖着堆」的队列** ——
 * 「哪一份」现在是一次选择（这一栏），「那一份长什么样」是两栏的内容。
 *
 * **量不到的那一半说清**：点一行之后两栏跟着换，那要真的点击加一次重渲染（`ListBox` 的
 * `onSelectionChange`），而这条路上没有 jsdom 也没有事件循环 —— 所以下面渲的是「选中态
 * 已经是这一行」的那一帧，而「点下去会连端点一起切」只能从 `App.tsx` 那侧读源码。
 */
describe('「最近」那份清单：一行一条，判定不只靠颜色', () => {
  const outcomeOf = (kind: string, ok = true, extra: Partial<RecordOutcome> = {}): RecordOutcome => ({
    ok,
    verdict: { kind, reason: '手搓的结果' },
    pendingId: 'pending-1',
    ...extra
  })

  const items = [
    { key: 'q0', platform: 'bilibili', endpoint: 'videoInfo', outcome: outcomeOf('store', true, { shapeChanged: true }) },
    { key: 'q1', platform: 'douyin', endpoint: 'videoComments', outcome: outcomeOf('store', false) },
    { key: 'q2', platform: 'kuaishou', endpoint: 'videoInfo', outcome: outcomeOf('reject', false), settled: '已丢弃' }
  ]
  const markup = render(createElement(HistoryList, { items, selectedKey: 'q1', onSelect: () => undefined }))

  it('一条结果一行，不多不少', () => {
    expect([...markup.matchAll(/role="option"/g)]).toHaveLength(items.length)
    for (const item of items) expect(markup).toContain(`data-key="${item.key}"`)
  })

  it('**那颗判定色点不是只靠颜色说话** —— `aria-label` 与 `title` 各带着那个词', () => {
    // 只靠颜色传达状态是 WCAG 1.4.1 明确禁掉的那件事，而这一栏只有 16rem 宽、
    // 放不下 `verdict.kind` 那个词（它在「样本处理」栏的判定 Chip 上）—— 所以色点 + 两条文本通道
    for (const label of ['可入库', '不能入库', '判定拒掉']) {
      expect(markup).toContain(`aria-label="${label}"`)
      expect(markup).toContain(`title="${label}"`)
    }
    // 三档的颜色也确实是三档（与 `statusOf` 一一对应）
    for (const dot of ['bg-success', 'bg-warning', 'bg-danger']) expect(markup).toContain(dot)
  })

  it('**每行都写着 `平台/端点`** —— 这份清单里混着好几个端点的行', () => {
    // 队列刻意不随切端点清空，于是「这一行是哪个端点的」不能省
    expect(markup).toContain('bilibili/videoInfo')
    expect(markup).toContain('douyin/videoComments')
    expect(markup).toContain('kuaishou/videoInfo')
  })

  it('当前显示的那一份是选中态，且**只有一行**是', () => {
    expect([...markup.matchAll(/aria-selected="true"/g)]).toHaveLength(1)
    expect(markup).toMatch(/data-key="q1"[^>]*data-selected="true"|data-selected="true"[^>]*data-key="q1"/)
  })

  it('处理过的那些不消失，只多一个记号 —— 那是「我刚才做了什么」的唯一痕迹', () => {
    expect(markup).toContain('✓')
    // 没处理、但带来了新形状的那一行是另一个记号（带 `title`，同样不只靠颜色）
    expect(markup).toContain('title="带来了新形状"')
  })

  it('**挂进了左栏**，而且点一行会连端点一起切', () => {
    expect(APP).toContain('<HistoryList')
    expect(APP).toContain('items={queue.items}')
    // 选中态跟着「两栏正在显示哪一份」走，不是第二份状态
    expect(APP).toContain('selectedKey={shown?.key}')
    // 只设 `picked` 的话 `shown` 会把它过滤掉（右边两栏只说一个端点的事），点下去什么都不发生
    expect(APP).toMatch(/setSelected\(`\$\{item\.platform\}\/\$\{item\.endpoint\}`\)\s*setPicked\(key\)/)
  })
})

describe('顶栏', () => {
  it('**面包屑真的挂上了** —— 造好但没挂载不报错（同 `comparePanel.test.ts` 最后那组）', () => {
    expect(APP).toContain('<EndpointCrumbs platform={platform!.platform} endpoint={endpoint.name} />')
    // 那枚塞着 `"平台/端点"` 字符串的 Chip 没了
    expect(APP).not.toContain('<Chip.Label className="font-mono">{selected}</Chip.Label>')
  })

  it('右上角三颗的顺序是 主题 → Cookie → `⌘K`', () => {
    const theme = APP.indexOf('<ThemeSwitch />')
    const cookie = APP.indexOf('<CookieTriggerFallback status={cookies.data} />')
    const jumper = APP.indexOf('<EndpointJumper')
    expect(theme).toBeGreaterThan(-1)
    expect(theme).toBeLessThan(cookie)
    expect(cookie).toBeLessThan(jumper)
  })

  it('整页**只有一个 `<h1>`**，而它由 `Typography.Heading level={1}` 渲', () => {
    // `typography--h1` 是 `text-4xl`（文章标题的尺寸），而这里是一条 40 px 高的工具条 ——
    // 所以层级由 `level` 说、字号由工具类说。手写 `<h1>` 就绕过了前者
    expect(APP.match(/<Typography\.Heading level=\{1\}/g)).toHaveLength(1)
    expect(APP).not.toContain('<h1')
  })

  it('`App.tsx` 里那两块面板的标题也是 `<h2>` + `aria-labelledby`，id 两边对得上', () => {
    // 「最近」与「先选一个端点」。三栏那两个在它们自己的文件里（上面那组 PANES 钉着，
    // 「样本处理」栏的标题跟着 SamplePane 走了），所以这份文件里 `<h2` 恰好两个 ——
    // 多一个就是有块面板的标题没接上 `aria-labelledby`
    for (const id of ['HISTORY_TITLE', 'EMPTY_TITLE']) {
      expect(APP).toContain(`aria-labelledby={${id}}`)
      expect(APP).toMatch(new RegExp(`<h2 className=\\{PANE_TITLE\\} id=\\{${id}\\}>`))
    }
    expect(APP.match(/<h2\b/g)).toHaveLength(2)
  })

  it('源文件那一行与批量那条进度条都搬进了「请求」栏', () => {
    // 它们说的都是这一栏的事（这一发打向哪个定义、这一批还在跑），跟着搬家 ——
    // 而「搬了但没挂」正是这一轮出过三次的那类事故，所以两边都钉
    const request = SRC['components/RequestPane.tsx']!
    expect(request).toContain('<SourceLink source={endpoint.source} />')
    expect(request).toContain('{batchLoading && <BatchProgress combinations={endpoint.combinations} />}')
    expect(APP).not.toContain('<SourceLink')
    expect(APP).not.toContain('<BatchProgress')
  })
})

describe('**刻意没接** `InputGroup`', () => {
  it('`src/` 底下一处都没有 —— 这个界面没有可编辑的 URL 栏', () => {
    // 扫全部而不只是 `App.tsx`：两栏之后「请求」那一栏才是它会被塞进来的地方
    for (const [file, code] of Object.entries(SRC)) expect(code, file).not.toContain('InputGroup')
  })

  it('**契约上根本没有 URL 与方法** —— 有了才谈得上拼那条栏', () => {
    const block = /export interface EndpointInfo \{([\s\S]*?)\n\}/.exec(CONTRACT)
    if (block === null) throw new Error('shared/contract.ts 里找不到 EndpointInfo —— 这条用例的判据没了')
    const fields = [...block[1].matchAll(/^ {2}(\w+)\??:/gm)].map((match) => match[1])
    // 「选端点 + 填参数 + 发送」这条路上，method 与 path 从来没有到过浏览器：
    // 端点名到真实 URL 的映射在 `packages/core` 里，契约不带它。
    // 硬拼一条 `GET /bilibili/videoInfo` 是编一个不存在的方法和一个不存在的路径。
    // 这条清单里真出现 `url` / `method` 的那天它会红 —— 那时才该考虑接。
    // `computed` 是这一轮加的（`bilibili/bvToAv` 那个 bug）：它说的是「这个端点没有 HTTP 层」，
    // 与「URL 长什么样」正好相反 —— 那种端点压根没有 URL
    expect(fields).toEqual(['name', 'summary', 'schema', 'seeds', 'stored', 'combinations', 'unseeded', 'source', 'computed'])
  })
})

describe('提示字只留会改变下一步的那句（C1 的绊线）', () => {
  it('空状态全仓只有一句 —— 曾经有四处几乎同义的话', () => {
    // 「左边填参数」是唯一活下来的那句（「结果」栏）。其余三句（动作区、类型声明页、
    // 字段结构页）已删 —— 再冒出来就是有人又往版面上加解释
    const hits = (needle: string): string[] =>
      Object.entries(SRC)
        .filter(([, code]) => code.includes(needle))
        .map(([file]) => file)
    expect(hits('左边填参数')).toEqual(['components/ResultPane.tsx'])
    expect(hits('发一发请求')).toEqual([])
    expect(hits('还没有结果')).toEqual([])
    // 第四根针钉的是 App 空态那句流程预告（「选中之后：填参数 → …」）：它描述一条
    // 马上就会看见的流程，C1 把它缩成「选一个端点开始。」。brief 给的三根针只够钉
    // 任务 1-3 已删的那三句、抓不到这句 —— 而这句恰恰是这轮要改的那个
    expect(hits('选中之后')).toEqual([])
  })
})
