/**
 * Web Interface Guidelines 那一遍里与「焦点 / 运动」有关的两项，落到 `src/index.css` 上的判据。
 *
 * 其中一项的结论是**什么都不做**（焦点环由 HeroUI 上），所以这份用例钉的多半不是行为而是**前提**：
 * `index.css` 那两段注释凭什么说「不用自己写」、又凭什么说「只补这两处就够」。
 * 前提被上游换掉时，「刻意不做」会从对的变成漏的，而那一步不会有任何报错 ——
 * 界面照样渲得出来，只是键盘用户看不见焦点在哪，或者开了「减少动态效果」的人还是被流光晃着。
 *
 * CSS 在 node 环境里渲不了（根 `vitest.config.ts:23` 是 node），所以这里做的是与
 * `theme.test.ts` 后半份同一类的事：读文本，对着 `node_modules` 里真正装到的那份做跨文件断言。
 *
 * **有几条是「上游仍然漏着」的断言**（`skeleton.css`、toast 的 view transition）。
 * 它们红了的意思是上游把那一处补上了、`index.css` 里对应那段可以删掉，不是这里坏了。
 */

import { readdirSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

/** 本包的样式入口 —— 两项的结论都写在它的注释里 */
const appCss = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

/**
 * 去掉注释之后的那份。
 *
 * 那些注释里写满了 `focus-visible`、`animation`、`*{animation:none}` 这些词（它们讲的正是
 * 「为什么不写」），所以「到底写了没有」这个问题只能对着去掉注释的那份问 ——
 * 拿 `appCss` 问的话，每一条否定断言都会被注释自己骗过去。
 */
const appRules = appCss.replace(/\/\*[\s\S]*?\*\//g, '')

/** 走 `packages/web/node_modules` 的软链，量的是这个包真正装到的那份（同 `theme.test.ts:28`） */
const heroui = (path: string): string =>
  readFileSync(new URL(`../node_modules/@heroui/styles/dist/${path}`, import.meta.url), 'utf8')

const componentsDir = new URL('../node_modules/@heroui/styles/dist/components/', import.meta.url)
const componentFiles = readdirSync(componentsDir).filter((name) => name.endsWith('.css'))

describe('焦点环：为什么这里一行都不写', () => {
  it('HeroUI 有一个跟着主题变量走的 `focus-ring`，自己再写一份只会叠成两圈', () => {
    // 硬编码颜色的那份不会跟着 `--focus` / `ring-offset-background` 变 ——
    // 深色主题下对比度不够就是这么来的
    const utilities = heroui('utilities/index.css')
    expect(utilities).toContain('@utility focus-ring {')
    expect(utilities).toContain('ring-2 ring-focus')
    expect(utilities).toContain('ring-offset-background')
  })

  it('组件把 `:focus-visible` 与 react-aria 的 `data-focus-visible` 一起挂', () => {
    // 只认前者会漏掉「react-aria 认为该亮而引擎还不支持 `:focus-visible`」的那些情况；
    // 只认后者则漏掉不经 react-aria 的原生控件。两条一起才是完整的
    const button = heroui('components/button.css')
    expect(button).toContain(':focus-visible')
    expect(button).toContain('[data-focus-visible="true"]')
  })

  it('覆盖面是**所有**能聚焦的组件，不是零星几个', () => {
    // 这条为「不用逐个补」兜底：哪天覆盖面塌下来，得知道
    const withFocus = componentFiles.filter((name) => heroui(`components/${name}`).includes('focus-visible'))
    expect(withFocus.length).toBeGreaterThan(40)
  })

  it('`index.css` 自己确实没写焦点环', () => {
    // 这是那段注释的结论本身。有人「顺手补一下」时这条会红，
    // 红了先去读注释里那三条代价，再决定是不是真要补
    expect(appRules).not.toContain('focus-visible')
    expect(appRules).not.toContain('outline')
  })
})

describe('`prefers-reduced-motion`：为什么只补两处而不是一刀切', () => {
  it('HeroUI 自己就带 `motion-reduce`，一刀切会把它已经处理好的地方再压一遍', () => {
    const variants = heroui('variants/index.css')
    expect(variants).toContain('@custom-variant motion-reduce {')
    // 关键是它**带系统偏好兜底**：只认 `data-reduce-motion` 属性的话，
    // 没人去设那个属性时整套就等于没有
    expect(variants).toContain('@media (prefers-reduced-motion: reduce) {')
  })

  it('这套变体在组件里是真用了，不是摆着的', () => {
    const covered = componentFiles.filter((name) => heroui(`components/${name}`).includes('motion-reduce:'))
    expect(covered.length).toBeGreaterThan(40)
  })

  it('**只有** `skeleton.css` 与 `table.css` 会动而不带 `motion-reduce`', () => {
    // 这条是「只补两处」的全部依据 —— 84 份组件 CSS 逐个过一遍的结果。
    // 多出第三份的话得去看它动的是什么、要不要跟着补，所以这里钉的是**精确集合**而不是数量。
    //
    // `table.css` 那一处不用管：它是排序指示器的 100ms 转向（`table.css:174`），
    // 而本仓库的 `Table.Column` 一个都没开 `allowsSorting`（`RequestTable.tsx:167-171`），
    // 那个元素根本不渲。
    const unguarded = componentFiles.filter((name) => {
      const css = heroui(`components/${name}`)
      return /animate-|transition/.test(css) && !css.includes('motion-reduce:')
    })
    expect(unguarded.sort()).toEqual(['skeleton.css', 'table.css'])
  })

  it('toast 的 view transition 是**文件级扫描看不见**的那处漏', () => {
    // `toast.css` 自己有一处 `motion-reduce:`（关闭按钮的淡入），所以上面那条精确集合
    // 不会把它算进来 —— 而真正会动一整个 toast 高度的是底下这些伪元素，它们没有任何护栏。
    // 这也是为什么那条集合断言不足以覆盖这一项，得单独钉一遍
    const toast = heroui('components/toast.css')
    expect(toast).toContain('::view-transition-new(.toast-bottom):only-child')
    expect(toast).toContain('animation: toast-slide-bottom-in 350ms')
    // 上游哪天在这些伪元素上自己加了护栏，这条会红 —— 意思是 `index.css` 那段可以删了
    const viewTransitionBlock = toast.slice(toast.indexOf('/* View transition animations */'))
    expect(viewTransitionBlock).not.toContain('prefers-reduced-motion')
  })

  it('`motion-reduce:` 补不了那处漏 —— 它要求元素在文档树里', () => {
    // 变体展开成 `&:is([data-reduce-motion="true"], …)`，而 view-transition 伪元素挂在顶层。
    // 这条钉住的是「只能写素的媒体查询」这个判断，不是随便挑的一句话
    expect(heroui('variants/index.css')).toContain('&:is([data-reduce-motion="true"], [data-reduce-motion="true"] *)')
  })
})

describe('补的那两段还对得上上游', () => {
  it('骨架屏的流光仍然是**无限循环**，而且仍然挂在伪元素上', () => {
    // 无限循环是这条媒体查询最该管的一类；挂在哪里决定选择器怎么写 ——
    // 上游把 `animate-skeleton` 从 `::after` 移到元素自身的话，
    // `.skeleton::after { animation: none }` 就变成一条空转的规则（一声不响）
    expect(heroui('themes/shared/theme.css')).toContain('--animate-skeleton: skeleton 2s linear infinite;')
    expect(heroui('components/skeleton.css')).toContain('&::after')
    expect(heroui('components/skeleton.css')).toContain('animate-skeleton')
  })

  it('关掉之后仍然看得见一块占位，而不是一片空白', () => {
    // 骨架屏的意义是把版面占住（`EndpointList.tsx:93` 记的正是这个）。
    // 底色是画在 `.skeleton` 上、与动画无关的，所以关掉流光不会把占位一起关掉
    expect(heroui('components/skeleton.css')).toContain('bg-surface-tertiary/70')
  })

  it('`index.css` 关的是这两处，各自一条规则', () => {
    expect(appRules).toContain('@media (prefers-reduced-motion: reduce)')
    const selectors = ['.skeleton::before', '.skeleton::after', '::view-transition-old(*)', '::view-transition-new(*)']
    for (const selector of selectors) expect(appRules).toContain(selector)
    // 一刀切**刻意没写**：库已经补过的 51 份组件 CSS 不需要再压一遍。
    // 两条 `animation: none` 就是全部 —— 多出第三条时先去读注释里那两处漏各自的判据。
    expect(appRules.match(/animation:/g)).toHaveLength(2)
    // `!important` 也没有：压过 `layer(components)` 靠的是「无层优于任何层」，不是感叹号
    expect(appRules).not.toContain('!important')
  })

  it('toast 的队列等的是 `transition.finished`，不是某个时长', () => {
    // 这是「敢把动画整个关掉」的那半判据：伪元素上一个动画都没有时，
    // `finished` 下一帧就 resolve。要是它改成等固定时长、或者等某个 `animationend`，
    // 关掉动画就会把整条 toast 链卡在半路 —— 而卡住的表现是「后面的 toast 再也不出来」，
    // 不报错、也不必然当场看得出来
    const queue = readFileSync(
      new URL('../node_modules/@heroui/react/dist/components/toast/toast-queue.js', import.meta.url),
      'utf8'
    )
    expect(queue).toContain('document.startViewTransition(')
    expect(queue).toContain('return transition.finished.catch(() => {});')
  })
})
