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
 * 另外还钉「fallback 不造成版面跳动」：判据不是「有 fallback」，而是**fallback 与那块
 * 面板自己的加载态逐字相同**（同一个外壳 class、同一个标题、同一句『正在读…』）。
 * 只要这条成立，chunk 落地时换掉的就只有边框里那一行字 —— 而这正是 `1e261cd`
 * 那一轮修过的毛病（骨架乱插，版面白跳一下）。
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

/**
 * 去掉注释再断言。**否定断言尤其需要它** —— `App.tsx` 顶上那段注释里就写着
 * `import` 与几个组件名，不去注释的话「没有静态 import」那几条会被自己的说明文字骗过。
 * 写法与 `endpointJumper.test.ts:110` 那个 `codeOf` 同一个（那边记着同一个坑）。
 */
const codeOf = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const read = (name: string): string => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8')

const APP = read('App.tsx')
const APP_CODE = codeOf(APP)

/** 拆出去的那四块。名字就是 `App.tsx` 里那个常量名，也是 `./components/<名字>` */
const LAZY = ['ComparePanel', 'CookieDrawer', 'GeneratedPanel', 'RequestTable'] as const

/**
 * 刻意留在首屏里的那几块。
 *
 * `EndpointList` 是左栏（首屏就要显示）；`ParamForm` / `OutcomeCard` 是主循环里
 * 每一步都要的；`ThemeSwitch` 在头部；`EndpointJumper` 只 13 KB 而 `⌘K` 随时可能被按 ——
 * 为它多一次往返不值。**这几条是反方向的绊线**：把它们改成懒加载会让首屏多几次
 * 往返、`⌘K` 按下去要等，那不是这次拆 chunk 想要的东西。
 */
const EAGER = ['EndpointJumper', 'EndpointList', 'OutcomeCard', 'ParamForm', 'ThemeSwitch'] as const

describe('这四块是懒加载的，不是静态 import', () => {
  it.each(LAZY)('`%s` 走 `lazy(() => import(...))`', (name) => {
    // `.then` 那一手是因为组件是命名导出（测试直接 import 它们），而 `lazy()` 要 default
    expect(APP_CODE).toContain(
      `const ${name} = lazy(() => import('./components/${name}').then((module) => ({ default: module.${name} })))`
    )
  })

  it.each(LAZY)('**`%s` 没有静态 import**（这条是「顺手改回来」的绊线）', (name) => {
    expect(APP_CODE).not.toContain(`import { ${name} } from './components/${name}'`)
    // 连带把「两种都写了」也拦住 —— 那样 chunk 照样进首屏，而 lazy 那行看着还在
    expect(APP_CODE).not.toMatch(new RegExp(`^import .*\\b${name}\\b.* from '\\./components/${name}'`, 'm'))
  })

  it('`lazy` 与 `Suspense` 都是从 react 具名 import 进来的，没有第二套写法', () => {
    expect(APP_CODE).toContain("import { lazy, Suspense, useState } from 'react'")
  })

  it('**没多拆也没少拆**：`lazy()` 恰好这四处', () => {
    expect(APP_CODE.match(/lazy\(\(\) => import\(/g)).toHaveLength(LAZY.length)
  })
})

describe('刻意留在首屏里的那几块还是静态 import', () => {
  it.each(EAGER)('`%s` 是静态 import —— 把它改懒会让首屏多一次往返', (name) => {
    // 判据是「同一行里静态 import 了这个名字」而**不是**逐字的 `import { X } from …`：
    // 那一行还会带上组件自己导出的类型（`OutcomeCard` 那行现在带着 `type KeptRequest` ——
    // 「留下」要送的那条记录），而多一个具名 import 与「它是不是懒加载的」无关。
    // 正则形状与上面那条反向绊线（:60）刻意相同，两边一起读
    expect(APP_CODE).toMatch(new RegExp(`^import .*\\b${name}\\b.* from '\\./components/${name}'`, 'm'))
    expect(APP_CODE).not.toContain(`const ${name} = lazy(`)
  })
})

describe('每一块都在 Suspense 边界里', () => {
  it.each(LAZY)('`%s` 外面包着 `<Suspense fallback={...}>`', (name) => {
    // 边界必须**贴着**那一块 —— 一个大边界罩住三块面板的话，任一 chunk 在路上
    // 都会把另外两块一起换成 fallback（它们是三个独立的 chunk、各自到达）
    // `[\s\S]{0,160}?` 而不是 `[^}]*`：`CookieDrawer` 那个 fallback 自己带一层花括号
    // （`status={cookies.data}`），按「不含 `}`」匹配会在那一层上断掉
    expect(APP_CODE).toMatch(new RegExp(`<Suspense fallback=\\{[\\s\\S]{0,160}?\\}>\\s*<${name}\\b`))
  })

  it('**边界数与懒加载数一致** —— 少一个就是有一块在渲染时直接抛 promise', () => {
    expect(APP_CODE.match(/<Suspense fallback=/g)).toHaveLength(LAZY.length)
  })
})

/**
 * 三块面板的 fallback 与它们自己的加载态**逐字相同**。
 *
 * 每一项是：组件文件、`PanelFallback` 收到的三个字（标题、按钮文案、那句『正在读…』）。
 * 三个字都要在组件源码里也找得到 —— 找不到就说明 fallback 与真身长得不一样了，
 * 而那意味着 chunk 落地的一瞬间版面会跳。
 */
const PANELS = [
  ['RequestTable', '请求集合', '重新读', '正在读 corpus/ 里的请求集合…'],
  ['ComparePanel', '并排对比', '重新读清单', '正在读这个端点的请求集合…'],
  ['GeneratedPanel', '已有类型', '重新读', '正在读 packages/response-types/ 里的产物…']
] as const

describe('fallback 不造成版面跳动', () => {
  /** `App.tsx` 里那个外壳 class。判据是它与三个面板根节点上那一串逐字相同 */
  const shell = /const PANEL_SHELL = '([^']+)'/.exec(APP_CODE)?.[1]

  it('`App.tsx` 里有 `PANEL_SHELL`，而它就是三块面板根节点上的那一串', () => {
    if (shell === undefined) throw new Error('App.tsx 里找不到 PANEL_SHELL —— 这一组用例的判据没了')
    expect(shell).not.toBe('')
    for (const [name] of PANELS) {
      // 三块面板的根 `<section>` 都用这一串 —— 边框、圆角、内边距、间距全在原位，
      // chunk 到达时换掉的只有边框里那一行字
      expect(read(`components/${name}.tsx`)).toContain(`className="${shell}"`)
    }
  })

  it('`PanelFallback` 用的就是这个常量，没有另抄一串', () => {
    expect(APP_CODE).toContain('<section className={PANEL_SHELL}>')
  })

  it.each(PANELS)('`%s` 的 fallback 抄的是它自己的加载态：标题、按钮、那句「正在读…」', (name, title, action, note) => {
    const panel = read(`components/${name}.tsx`)
    // App 侧：这三个字确实传给了那一块的 fallback
    expect(APP_CODE).toContain(`<PanelFallback title="${title}" action="${action}" note="${note}" />`)
    // 组件侧：同样的三个字在真身里也在（对不上就会跳版面）
    expect(panel).toContain(`>${title}</h2>`)
    expect(panel).toContain(action)
    expect(panel).toContain(`<p className="text-muted text-sm">${note}</p>`)
  })

  it('**占位那颗按钮是真的 `Button`**，不是一个手抄高度的方块 —— 一样高由构造保证', () => {
    // `sm` 按钮在 md 以下 h-9、以上 h-8（`@heroui/styles` 的 `button.css:68`），
    // 标题行的高度由它决定。手写 `h-8` 会在窄屏上差一档，而那一档就是一次跳动
    expect(APP_CODE).toMatch(/<Button className="ml-auto" size="sm" variant="tertiary" isDisabled>/)
    expect(APP_CODE).not.toMatch(/fallback=\{<(div|Skeleton|Spinner)/)
  })
})

describe('cookie 抽屉那颗触发按钮：唯一首屏就会被看见的 fallback', () => {
  // 另外三块在 `endpoint === undefined` 分支下根本不渲染，只有这一颗在头部那个 flex 行里 ——
  // 缺一颗按钮，左边的 `⌘K` 与主题开关会横着挪一下再挪回来
  const drawer = read('components/CookieDrawer.tsx')

  it('fallback 渲的是同 variant、同 size 的那颗按钮，连那枚计数 Chip 一起', () => {
    expect(APP_CODE).toContain('<Suspense fallback={<CookieTriggerFallback status={cookies.data} />}>')
    expect(APP_CODE).toMatch(/<Button variant="secondary" size="sm" isDisabled>\s*Cookie/)
    expect(drawer).toMatch(/<Button variant="secondary" size="sm">\s*Cookie/)
  })

  it('**那枚 Chip 的颜色判据与真身逐字相同** —— chunk 落地时连颜色都不闪', () => {
    const rule = `color={configured === 0 ? 'warning' : configured === total ? 'success' : 'accent'}`
    expect(APP_CODE).toContain(rule)
    expect(drawer).toContain(rule)
  })

  it('计数也是算出来的，不是写死的 `0/0`', () => {
    const counted = /const configured = status\?\.platforms\.filter\(\(entry\) => entry\.hasCookie\)\.length \?\? 0/
    expect(APP_CODE).toMatch(counted)
    expect(drawer).toMatch(counted)
  })
})
