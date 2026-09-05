/**
 * 懒加载边界本身。
 *
 * **为什么要钉住它**：把四块面板改成 `React.lazy` 之后，首屏 JS 从 753,228 掉到 613,776
 * （−139,452 / −18.5%，其中最大一块是 `RequestTable` 与 `ComparePanel` 共用的
 * `table` chunk 104 KB）。而这个收益是**一个静态 import 就能整块抹掉**的 ——
 * 有人「顺手改回来」时 `tsc` 绿、`oxlint` 绿、界面看不出区别，只有产物悄悄涨回去。
 *
 * CI 那边有一条量产物的判据接着（`.github/workflows/release.yml` 的入口预算：
 * 那个 chunk 会进 `index.html` 的 modulepreload 名单，数字当场跳上来）。
 * 这里这条读源码，是**同一件事的另一个方向** —— 它在本地就红、且指得出是哪一行。
 * 两条都要：产物那条说「涨了」，这条说「谁改了什么」。
 *
 * ## 三栏版面之后这份判据读三个文件，而不是一个
 *
 * 边界跟着「谁在用它」搬了家：cookie 抽屉还在 `App.tsx`，集合去了 `RequestPane.tsx`，
 * 已提交与对比去了 `TypePane.tsx`。搬家是有理由的（边界与用它的地方隔着一个文件时，
 * 很容易在某次改动里被顺手换成静态 import），代价就是这份判据要跨文件读。
 *
 * 而搬进 `Tabs` 之后**多了一层收益，也多了一条要钉的事**：`Tabs` 只渲选中的那一页，
 * 于是没点开的 tab 连 chunk 请求都不发 —— 这不是省流量，是那 104 KB 的 `Table`
 * 在默认那一屏上**一个字节都不下载**。换成 `Disclosure` 看着一样，但那个组件的内容
 * **一直在 DOM 里**（只是隐藏），chunk 照样会被拉下来。所以下面既钉「边界在」，
 * 也钉「边界外面那一层是 `Tabs`，且默认停在不懒的那一页」。
 *
 * 「fallback 不造成版面跳动」那一组也跟着缩了：判据仍然是**fallback 与那块面板自己的
 * 加载态逐字相同**，但原先那三份 fallback 抄的是整块面板的外壳（`PANEL_SHELL` +
 * `PanelFallback`：边框、标题、按钮、那句『正在读…』全抄一遍），而现在面板住在别人的
 * 正文里、外壳由 `lib/pane.ts` 给，fallback 只剩那一行『正在读…』——
 * 「外壳长得一样」这件事已经由构造保证，它的判据搬去了 `appLayout.test.ts`。
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

/**
 * 去掉注释再断言。**否定断言尤其需要它** —— 这几个文件顶上的注释里就写着 `import`、
 * `Disclosure` 与几个组件名（它们恰恰在解释「为什么不那么写」），不去注释的话
 * 「没有静态 import」「没接 Disclosure」那几条会被自己的说明文字骗过。
 * 写法与 `endpointJumper.test.ts:110` 那个 `codeOf` 同一个（那边记着同一个坑）。
 */
const codeOf = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const read = (name: string): string => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8')

/** 三个宿主文件，各留一份去注释的。键就是下面几张表里的「住在哪」 */
const HOSTS: Record<string, string> = {
  'App.tsx': codeOf(read('App.tsx')),
  'components/RequestPane.tsx': codeOf(read('components/RequestPane.tsx')),
  'components/TypePane.tsx': codeOf(read('components/TypePane.tsx'))
}

/** 正则里要用的字面量。那几句『正在读…』带着 `/`，逐字比的时候不许被当成元字符 */
const escaped = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 拆出去的那四块：**名字、边界住在哪个文件、以及那个文件里 import 它的说明符**。
 *
 * 说明符两种形状不是笔误：`App.tsx` 在 `src/` 根上（`./components/X`），
 * 而两块面板与它们是邻居（`./X`）。
 */
const LAZY = [
  ['CookieDrawer', 'App.tsx', './components/CookieDrawer'],
  ['RequestTable', 'components/RequestPane.tsx', './RequestTable'],
  ['ComparePanel', 'components/TypePane.tsx', './ComparePanel'],
  ['GeneratedPanel', 'components/TypePane.tsx', './GeneratedPanel']
] as const

/**
 * 刻意留在首屏里的那几块，**连它们静态 import 在哪一份文件里一起钉**。
 *
 * 三栏那三块（`RequestPane` / `ResponsePane` / `TypePane`）与「最近」那条清单是主循环
 * 每一步都要的；`EndpointList` 是左栏（首屏就要显示）；`ThemeSwitch` 在头部；
 * `EndpointJumper` 只 13 KB 而 `⌘K` 随时可能被按 —— 为它多一次往返不值。
 * `ParamForm` 与 `Result.tsx` 那两块（响应 JSON、类型 diff）是**打一发看看**这条主路本身。
 *
 * **这几条是反方向的绊线**：把它们改成懒加载会让首屏多几次往返、`⌘K` 按下去要等，
 * 那不是这次拆 chunk 想要的东西。
 */
const EAGER = [
  ['EndpointJumper', 'App.tsx', './components/EndpointJumper'],
  ['EndpointList', 'App.tsx', './components/EndpointList'],
  ['HistoryList', 'App.tsx', './components/HistoryList'],
  ['RequestPane', 'App.tsx', './components/RequestPane'],
  ['ResponsePane', 'App.tsx', './components/ResponsePane'],
  ['ThemeSwitch', 'App.tsx', './components/ThemeSwitch'],
  ['TypePane', 'App.tsx', './components/TypePane'],
  ['ParamForm', 'components/RequestPane.tsx', './ParamForm'],
  ['PayloadPanel', 'components/ResponsePane.tsx', './Result'],
  ['DiffPanel', 'components/TypePane.tsx', './Result']
] as const

describe('这四块是懒加载的，不是静态 import', () => {
  it.each(LAZY)('`%s` 走 `lazy(() => import(...))`（在 `%s` 里）', (name, host, specifier) => {
    // `.then` 那一手是因为组件是命名导出（测试直接 import 它们），而 `lazy()` 要 default
    expect(HOSTS[host]).toContain(`const ${name} = lazy(() => import('${specifier}').then((module) => ({ default: module.${name} })))`)
  })

  it.each(LAZY)('**`%s` 没有静态 import**（这条是「顺手改回来」的绊线）', (name, host, specifier) => {
    expect(HOSTS[host]).not.toContain(`import { ${name} } from '${specifier}'`)
    // 连带把「两种都写了」也拦住 —— 那样 chunk 照样进首屏，而 lazy 那行看着还在。
    // 三个宿主一起查：边界搬家之后「在另一个文件里静态 import 一手」是新的绕过方式。
    // **`import type` 放过**：它在编译期就被擦掉，一个字节都不会进 chunk
    for (const code of Object.values(HOSTS)) expect(code).not.toMatch(new RegExp(`^import (?!type )[^\\n]*\\b${name}\\b[^\\n]*from '`, 'm'))
  })

  it.each(Object.keys(HOSTS))('`%s` 里 `lazy` 与 `Suspense` 都是从 react 具名 import 的，没有第二套写法', (host) => {
    expect(HOSTS[host]).toMatch(/^import \{[^}]*\blazy\b[^}]*\bSuspense\b[^}]*\} from 'react'$/m)
  })

  it('**没多拆也没少拆**：三个文件加起来恰好这四处 `lazy()`', () => {
    const total = Object.values(HOSTS).reduce((sum, code) => sum + (code.match(/lazy\(\(\) => import\(/g)?.length ?? 0), 0)
    expect(total).toBe(LAZY.length)
  })
})

describe('刻意留在首屏里的那几块还是静态 import', () => {
  it.each(EAGER)('`%s` 是静态 import（在 `%s` 里）—— 把它改懒会让首屏多一次往返', (name, host, specifier) => {
    // 判据是「同一行里静态 import 了这个名字」而**不是**逐字的 `import { X } from …`：
    // 那一行还会带上别的名字（`ResponsePane.tsx` 那行一次 import 了 `Result.tsx` 的五样东西），
    // 而多一个具名 import 与「它是不是懒加载的」无关。
    // 正则形状与上面那条反向绊线刻意相同，两边一起读
    expect(codeOf(read(host))).toMatch(new RegExp(`^import .*\\b${name}\\b.* from '${specifier}'`, 'm'))
    expect(codeOf(read(host))).not.toContain(`const ${name} = lazy(`)
  })
})

describe('每一块都在 Suspense 边界里', () => {
  it.each(LAZY)('`%s` 外面包着 `<Suspense fallback={...}>`', (name, host) => {
    // 边界必须**贴着**那一块 —— 一个大边界罩住三块面板的话，任一 chunk 在路上
    // 都会把另外两块一起换成 fallback（它们是三个独立的 chunk、各自到达）
    // `[\s\S]{0,160}?` 而不是 `[^}]*`：`CookieDrawer` 那个 fallback 自己带一层花括号
    // （`status={cookies.data}`），按「不含 `}`」匹配会在那一层上断掉。
    // `(?:\{\})?` 是给 `codeOf` 留的口子：两处边界里侧写着一句 JSX 注释（那句 `key` 的理由），
    // 去掉注释之后剩下一对空花括号 —— 那不是「边界与面板之间隔了别的东西」
    expect(HOSTS[host]).toMatch(new RegExp(`<Suspense fallback=\\{[\\s\\S]{0,160}?\\}>\\s*(?:\\{\\}\\s*)?<${name}\\b`))
  })

  it('**边界数与懒加载数一致** —— 少一个就是有一块在渲染时直接抛 promise', () => {
    const total = Object.values(HOSTS).reduce((sum, code) => sum + (code.match(/<Suspense fallback=/g)?.length ?? 0), 0)
    expect(total).toBe(LAZY.length)
  })
})

/**
 * 那三块**坐在 `Tabs` 里**，而这是「没点开就不下载」成立的全部条件。
 *
 * `Tabs` 只渲选中的那一页（`test/result.test.ts` 那侧渲一次 `TypePane` 就看得见：
 * 只有 `本次` 那个 panel 在 DOM 里），于是 `Suspense` 连挂载都不发生、`import()` 一次都不跑。
 * 两条会把这个收益悄悄抹掉的改动，各钉一条：
 *
 * 1. **换成 `Disclosure`**（或任何「内容一直在 DOM 里、只是隐藏」的容器）—— 界面看着一样，
 *    chunk 照样在首屏就被拉下来。
 * 2. **把默认那一页改成懒的那一页** —— 那时首屏第一帧就要那个 chunk，拆了等于没拆。
 */
describe('`Tabs` 是「没点开就不下载」的前提', () => {
  const PANELS = [
    ['RequestTable', 'components/RequestPane.tsx', 'requests'],
    ['GeneratedPanel', 'components/TypePane.tsx', 'committed'],
    ['ComparePanel', 'components/TypePane.tsx', 'compare']
  ] as const

  it.each(PANELS)('`%s` 住在 `<Tabs.Panel id="%s">` 里', (name, host, id) => {
    expect(HOSTS[host]).toMatch(new RegExp(`<Tabs\\.Panel id="${id}">[\\s\\S]{0,400}?<${name}\\b`))
  })

  it.each(['components/RequestPane.tsx', 'components/TypePane.tsx'])('`%s` 里没接 `Disclosure`', (host) => {
    // 判据落在去注释的那份上：两个文件的注释里正当地写着「摆成 `Disclosure` 就不成立」
    expect(HOSTS[host]).not.toContain('Disclosure')
  })

  it('**默认那一页都不是懒的那一页** —— 是的话首屏第一帧就要那个 chunk', () => {
    expect(HOSTS['components/RequestPane.tsx']).toContain('<Tabs defaultSelectedKey="params">')
    expect(HOSTS['components/TypePane.tsx']).toContain('<Tabs defaultSelectedKey="current">')
  })
})

/**
 * 三块面板的 fallback 与它们自己的加载态**逐字相同**。
 *
 * 每一项是：组件名、边界住在哪、以及那句『正在读…』。那句话要在**两侧**都找得到 ——
 * 对不上就说明 fallback 与真身说的不是同一句话，而那意味着 chunk 落地的一瞬间字会换。
 */
const NOTES = [
  ['RequestTable', 'components/RequestPane.tsx', '正在读 corpus/ 里的请求集合…'],
  ['GeneratedPanel', 'components/TypePane.tsx', '正在读 packages/response-types/ 里的产物…'],
  ['ComparePanel', 'components/TypePane.tsx', '正在读这个端点的请求集合…']
] as const

describe('fallback 不造成版面跳动', () => {
  it.each(NOTES)('`%s` 的 fallback 就是它自己那一行「正在读…」', (name, host, note) => {
    // 宿主侧：那句话真的在这一块的 `fallback=` 里（`TypePane` 经 `TabFallback` 转一手，
    // `RequestPane` 只有一块所以直接写 `<p>` —— 两种形状都只有一行字，所以判据挑那句话本身）
    expect(HOSTS[host]).toMatch(new RegExp(`fallback=\\{[\\s\\S]{0,80}?${escaped(note)}`))
    // 组件侧：真身的加载态是同一行字、同一套类
    expect(read(`components/${name}.tsx`)).toContain(`<p className="text-muted text-sm">${note}</p>`)
  })

  it('`TabFallback` 只渲那一行，没顺手加骨架或转圈', () => {
    // 「骨架 → 那句话 → 内容」会跳两次版面，而这里要的是「那句话 → 内容」跳零次
    expect(HOSTS['components/TypePane.tsx']).toContain(
      'const TabFallback = ({ note }: { note: string }) => <p className="text-muted text-sm">{note}</p>'
    )
  })

  it.each(Object.keys(HOSTS))('`%s` 的 fallback 里没有 `Skeleton` / `Spinner` / 空 div', (host) => {
    expect(HOSTS[host]).not.toMatch(/fallback=\{<(div|Skeleton|Spinner)/)
  })
})

describe('cookie 抽屉那颗触发按钮：唯一首屏就会被看见的 fallback', () => {
  // 另外三块要么在没选端点时不渲染、要么在没点开的 tab 里，只有这一颗在头部那个 flex 行里 ——
  // 缺一颗按钮，左边的 `⌘K` 与主题开关会横着挪一下再挪回来
  const drawer = read('components/CookieDrawer.tsx')
  const app = HOSTS['App.tsx']!

  it('fallback 渲的是同 variant、同 size 的那颗按钮，连那枚计数 Chip 一起', () => {
    expect(app).toContain('<Suspense fallback={<CookieTriggerFallback status={cookies.data} />}>')
    expect(app).toMatch(/<Button variant="secondary" size="sm" isDisabled>\s*Cookie/)
    expect(drawer).toMatch(/<Button variant="secondary" size="sm">\s*Cookie/)
  })

  it('**那枚 Chip 的颜色判据与真身逐字相同** —— chunk 落地时连颜色都不闪', () => {
    const rule = `color={configured === 0 ? 'warning' : configured === total ? 'success' : 'accent'}`
    expect(app).toContain(rule)
    expect(drawer).toContain(rule)
  })

  it('计数也是算出来的，不是写死的 `0/0`', () => {
    const counted = /const configured = status\?\.platforms\.filter\(\(entry\) => entry\.hasCookie\)\.length \?\? 0/
    expect(app).toMatch(counted)
    expect(drawer).toMatch(counted)
  })
})
