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

const { EndpointCrumbs } = (await import(APP_MODULE)) as {
  EndpointCrumbs: (props: { platform: string; endpoint: string }) => ReactNode
}
const { BatchProgress, SourceLink } = (await import(REQUEST_MODULE)) as {
  BatchProgress: (props: { combinations: number }) => ReactNode
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
  ['components/ResultPane.tsx', 'pane-result-title', '结果', true]
] as const

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

  it('顺序是「拿什么参数打 → 打回来什么、是什么形状、留不留」', () => {
    expect(at('<RequestPane')).toBeLessThan(at('<ResultPane'))
    // 并排只在 `2xl` 以上（两栏各要 22rem 才装得下一份代码块），之间那两档是两行、各自滚 ——
    // 原先的毛病不是「上下排」而是「页面本身无限长」，所以那两档仍然比原先好。
    // **这两个断点在 `PaneShell.tsx` 里**：那是纯 CSS 那一份版面，也是懒加载的可拖那层
    // 还在路上时首屏渲的东西 —— 两份的默认尺寸逐字相同，所以 chunk 落地时版面不跳
    const shell = SRC['components/PaneShell.tsx']!
    expect(shell).toContain('2xl:grid-cols-[22rem_minmax(0,1fr)]')
    expect(shell).toContain('grid-rows-2')
    // 可拖那一份的第一栏也是 22rem，其余不给 `defaultSize`（于是拿到 `flex-grow: 1` 均分）——
    // 这一条就是「两份版面尺寸相同」这句话的判据
    expect(SRC['components/SplitLayout.tsx']).toContain("defaultSize={orientation === 'horizontal' && index === 0 ? '22rem' : undefined}")
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

  it('「留下 / 丢掉 / 复制」**不在标题行里**，而在正文底下那条永远可见的动作条上', () => {
    const code = SRC['components/ResultPane.tsx']!
    // 标题行：从 Tabs 起到第一个 Tabs.Panel 为止 —— 不从空态分支那个 PANE_HEAD 切，
    // 它在更前面，切它会测不到 tab 分支的标题行。哨兵那条同理：切片空了当场红，
    // 而不是让下面两条否定断言静默恒真
    const head = code.slice(code.indexOf('<Tabs defaultSelectedKey'), code.indexOf('<Tabs.Panel'))
    expect(head.length).toBeGreaterThan(0)
    expect(head).not.toContain('Toolbar')
    expect(head).not.toContain('留下')
    // 动作条：shrink-0（决定永远在视野里）、自己封顶、面板级组件没了
    const actions = SRC['components/ResultActions.tsx']!
    expect(actions).toMatch(/<Toolbar aria-label="这份结果的动作"/)
    expect(actions).toMatch(/max-h-64[^"]*shrink-0|shrink-0[^"]*max-h-64/)
    expect(actions).not.toContain('ACTIONS_TITLE_ID')
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
          ...new Set([...code.matchAll(/className="([^"]*)"/g)].flatMap((match) => match[1]!.split(/\s+/)).filter((c) => /^border(-|$)/.test(c)))
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

  it('窄屏那一档连 chunk 都不请求 —— 竖向分栏在一个高度由内容决定的容器里不成立', () => {
    expect(shell).toContain("if (layout === 'stack') return <StaticPanes {...props} />")
  })

  it('分隔条是库的 `Separator`（键盘能拖），而且每一条都有名字', () => {
    // 自己写 `pointermove` 缺的正是这一半：`role="separator"` + `tabIndex` +
    // `aria-valuenow/min/max` + 箭头键。库把这一整套都渲出来了，所以这里钉的是「用的是它」
    expect(split).toContain("import { Group, type LayoutStorage, Panel, Separator, useDefaultLayout } from 'react-resizable-panels'")
    // 两处 `<Separator>` 各有 `aria-label`：左栏那条、栏与栏之间那条 ——
    // 一页里两个一模一样的 separator，读屏得能分开
    expect(split.match(/<Separator[\s\S]{0,220}?aria-label=/g)).toHaveLength(2)
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
    // 两份账：外壳（左栏 vs 主区）、两栏之间
    expect(split.match(/storage: LAYOUT_STORAGE/g)).toHaveLength(2)
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
    // 放不下 `verdict.kind` 那个词（它在「结果」栏底下那条动作带上）—— 所以色点 + 两条文本通道
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
    // 「最近」与「先选一个端点」。两栏那两个在它们自己的文件里（上面那组钉着），
    // 所以这份文件里 `<h2` 恰好两个 —— 多一个就是有块面板的标题没接上 `aria-labelledby`
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
