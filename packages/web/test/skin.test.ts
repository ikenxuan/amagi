/**
 * 皮肤层的判据 —— 这是「重新设计」落在代码上的全部，由 `src/index.css` 那三块承载。
 *
 * CSS 在 node 环境渲不了（根 `vitest.config.ts` 是 node），所以与 `wig.test.ts` / `theme.test.ts`
 * 后半份同一类：读文本、对着 `node_modules` 里真正装到的那份做跨文件断言。**否定断言
 * （「我们确实没覆盖某个变量」「确实绕开了浮层」）对着去掉注释的那份问** ——
 * `index.css` 的注释里写满了它「为什么不这么做」，不去掉会把断言骗过去。
 *
 * 钉的不是「这几个取值好看」（那是审美，没法测），而是**这套换肤赖以成立的前提**：
 * HeroUI 的变量挂在哪些选择器上、accent 与 focus 是不是同一个值、滚动条那套变量还在不在。
 * 上游哪天换了选择器或改了变量的推导关系，这里的某条会红 —— 意思是皮肤那半得跟着看一遍，
 * 不是这里坏了。
 */

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

/** 本包的样式入口 */
const appCss = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

/** 去掉注释之后的那份（同 `wig.test.ts:30`：注释里写满了那些词） */
const appRules = appCss.replace(/\/\*[\s\S]*?\*\//g, '')

/** 走 `packages/web/node_modules` 的软链，量的是这个包真正装到的那份（同 `theme.test.ts:28`） */
const heroui = (path: string): string => readFileSync(new URL(`../node_modules/@heroui/styles/dist/${path}`, import.meta.url), 'utf8')

const variables = heroui('themes/default/variables.css')

describe('皮肤是换主题变量，不是重写组件', () => {
  it('`@heroui/styles` 仍在前、且只导入一次 —— 皮肤盖在它上面而不是替换它', () => {
    expect(appCss).toContain("@import '@heroui/styles';")
    expect(appRules.match(/@import '@heroui\/styles'/g)).toHaveLength(1)
  })

  it('覆盖用 HeroUI 自己的那组选择器 —— 浅色带 `:root`、深色不带（见下一条为什么）', () => {
    // HeroUI 把变量挂在 `:root, .light, [data-theme=light]` 与 `.dark, [data-theme=dark]` 两组上
    // （variables.css:3 / :177），useTheme 两个都写。皮肤必须跟着两组都列
    expect(variables).toContain('[data-theme="light"]')
    expect(variables).toContain('[data-theme="dark"]')
    expect(appRules).toContain("[data-theme='light']")
    expect(appRules).toContain("[data-theme='dark']")
    expect(appRules).toContain('.dark')
  })

  it('**深色块不带 `:root`** —— 这是切主题那个 bug 的绊线，不是风格洁癖', () => {
    // 浅色块把 `:root` 当「默认 = 浅」的兜底（与 HeroUI 一样）。若深色块也带 `:root`，
    // 两条同特异性的 `:root` 规则都命中同一个 `:root`、而深色那条在后面 —— 于是 `.light`
    // 那一档的背景被 `:root` 上的深色值盖掉（界面切成浅色仍是深色）。这个 bug 编译全绿、
    // 深色截图看起来完全正常，只有切到浅色才暴露 —— 所以钉的是结构而不是截图。
    const darkBlock = /\.dark,\s*\[data-theme='dark'\]\s*\{[^}]*\}/.exec(appRules)?.[0]
    if (darkBlock === undefined) throw new Error('index.css 里找不到深色块 —— 这条用例的判据没了')
    expect(darkBlock).toContain('--background:')
    // 同一个块的选择器串里不许有 `:root`（`.dark, [data-theme='dark']` 才是全部）
    expect(darkBlock.split('{')[0]).not.toContain(':root')
  })

  it('深色背景比默认深、浅色背景比默认冷 —— 「贴终端」的全部实质', () => {
    expect(appRules).toContain('--background: oklch(0.155 0.005 264)')
    expect(appRules).toContain('--background: oklch(0.965 0.004 250)')
  })

  it('accent 换成「跑通了」绿，且与 HeroUI 默认的蓝**不同**', () => {
    // 默认是 oklch(0.6204 0.195 253.83)（蓝）；皮肤两个档位都换掉
    expect(variables).toContain('--accent: oklch(0.6204 0.195 253.83)')
    expect(appRules).toContain('--accent: oklch(0.66 0.165 158)')
    expect(appRules).toContain('--accent: oklch(0.78 0.19 158)')
    expect(appRules).not.toContain('--accent: oklch(0.6204 0.195 253.83)')
  })

  it('**没盖** surface / muted / status / soft —— 那些由 HeroUI 从基色推导，动了就失去明暗两套', () => {
    for (const variable of ['--surface:', '--muted:', '--success:', '--warning:', '--danger:', '--accent-soft']) {
      expect(appRules).not.toContain(variable)
    }
  })
})

describe('焦点环仍跟着 accent 走（换 accent 不会丢焦点色）', () => {
  it('HeroUI 的 `--focus` 就是 `var(--accent)`，所以皮肤不用单独设焦点色', () => {
    expect(variables).toContain('--focus: var(--accent)')
  })
  it('皮肤自己没写死焦点色 —— 写了就不会跟着 accent 变', () => {
    expect(appRules).not.toContain('--focus:')
  })
})

describe('字体：贴终端的两款，且是 `@theme` 而非组件级 class', () => {
  it('`@theme` 里声明了 `--font-sans` 与 `--font-mono`（Tailwind v4 唯一该挂字体的地方）', () => {
    expect(appRules).toContain('--font-sans:')
    expect(appRules).toContain('--font-mono:')
  })
  it('JetBrains Mono 管等宽、IBM Plex Sans 管正文，两个都带本地栈兜底', () => {
    expect(appRules).toContain("'JetBrains Mono'")
    expect(appRules).toContain("'IBM Plex Sans'")
    // 兜底栈在：CDN 不可达时不至于塌成衬线 / 系统默认
    expect(appRules).toContain('ui-monospace')
    expect(appRules).toContain('ui-sans-serif')
  })
  it('字体加载是「本地兜底 + CDN 增强」，不是纯 CDN —— 这本机工具经常离线 / 绑局域网', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    // CDN 那份在，且 `display=swap`：连不上时先用本地字体渲，绝不空白（不出 FOIT）
    expect(html).toContain('fonts.googleapis.com')
    expect(html).toContain('display=swap')
    // 本地兜底栈在 `@theme` 里（上面的用例已钉）—— 两边一起才成立
  })
  it('HeroUI 自己没设字体 —— 这正是要在 `@theme` 里补的理由（变了这条会红）', () => {
    expect(heroui('themes/shared/theme.css')).not.toContain('--font-mono:')
    expect(heroui('themes/shared/theme.css')).not.toContain('--font-sans:')
  })
})

describe('滚动条：接管页面与代码区，刻意绕开浮层', () => {
  it('HeroUI 的两个滚动条变量还在 —— 皮肤与浮层都靠它们同源', () => {
    expect(variables).toContain('--scrollbar-thumb:')
    expect(variables).toContain('--scrollbar-track:')
  })
  it('HeroUI **仍然没给页面配全局滚动条**（那条规则还注释着）—— 这就是要补的理由', () => {
    // base.css 里那段被注释的全局规则一旦真的启用，这份文件就要让位
    expect(heroui('base/base.css')).toContain('removing the scrollbar styles')
  })
  it('页面（html）与通用滚动区都接了，用的是同源变量', () => {
    expect(appRules).toContain('--scrollbar-thumb')
    expect(appRules).toContain('scrollbar-width: thin')
  })
  it('显式排除两个 backdrop —— 那条全局规则被删的理由（干扰浮层关闭）仍然成立', () => {
    expect(appRules).toContain('modal__backdrop')
    expect(appRules).toContain('alert-dialog__backdrop')
  })
  it('配了 WebKit/Blink 的私有口 —— 不认 `scrollbar-color` 的引擎也有得渲染', () => {
    expect(appRules).toContain('::-webkit-scrollbar-thumb')
    expect(appRules).toContain('::-webkit-scrollbar-track')
  })
})
