/**
 * Web Interface Guidelines 那一遍里与「焦点 / 运动」有关的两项，落到本仓库上的判据。
 *
 * 这两项的结论**都不是「写一段 CSS」**，而是「凭什么不写」与「唯一要补的那一处补在哪」，
 * 所以这份用例钉的多半不是行为而是**前提**：焦点环凭什么交给 HeroUI、骨架屏那个类凭什么够用。
 * 前提被上游换掉时，「刻意不做」会从对的变成漏的，而那一步不会有任何报错 ——
 * 界面照样渲得出来，只是键盘用户看不见焦点在哪，或者开了「减少动态效果」的人还是被流光晃着。
 *
 * CSS 在 node 环境里渲不了（根 `vitest.config.ts:23` 是 node），所以这里做的是与
 * `theme.test.ts` 后半份同一类的事：读文本，对着 `node_modules` 里真正装到的那份做跨文件断言。
 *
 * **`src/index.css` 现在只有两条 `@import`**（2026-09-12 那套自定义皮肤整个撤了，回 HeroUI 默认）。
 * 所以运动这一项在本仓库里**只剩一处代码**：`EndpointList.tsx` 里那个
 * `motion-reduce:animate-none`。其余全靠 HeroUI 自己的 `motion-reduce:` 变体。
 *
 * **2026-09-12 这份文件改过三轮，都留了痕：**
 * 1. HeroUI 3.2.4 → 3.2.5 把 toast 从 View Transitions 换成元素自身的 CSS transition 并自带
 *    护栏，于是原先钉 toast 那两条按设计红了 —— 换成钉住**新前提**的两条
 *    （`startViewTransition` 一处不剩 / JS 侧自己查偏好）。
 * 2. 骨架屏那条原先是「`motion-reduce:` 补不了伪元素」，**那个判断是错的**（变体自己嵌了
 *    `&::before, &::after`），所以手写的媒体查询换成了调用点一个类。
 * 3. `index.css` 撤到两条 `@import`，原先钉它那段媒体查询的断言跟着删了。
 */

import { readdirSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

/** 本包的样式入口 —— 现在只有两条 `@import`，但仍然要问「它有没有多写东西」 */
const appCss = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

/** 去掉注释之后的那份。眼下这份文件里没有注释，留着是防它以后又长出「为什么不写」那种讲解 */
const appRules = appCss.replace(/\/\*[\s\S]*?\*\//g, '')

/** 走 `packages/web/node_modules` 的软链，量的是这个包真正装到的那份（同 `theme.test.ts:28`） */
const heroui = (path: string): string => readFileSync(new URL(`../node_modules/@heroui/styles/dist/${path}`, import.meta.url), 'utf8')

/**
 * 去掉注释之后的那份上游 CSS —— 与 `appRules` 同一个理由，只是方向相反。
 *
 * 上游的注释里也正当地写着 `animate-*` / `transition` 这些词（它写的是「这里为什么这么排」），
 * 所以拿原文去问「这份文件动不动」会把**讲解**当成动效。2026-09-12 真踩过：
 * `scroll-shadow.css:162` 有一句「`animate-*` utility 会覆盖它」，于是下面那条精确集合
 * 凭一句注释多出一份文件。
 *
 * 只删块注释就够：这 84 份是纯 CSS，没有 `//` 行注释，也没有哪个 `content:` 字符串里带
 * `/*` 序列（逐份验过），所以不会踩 `viewers.test.ts` 那个「注释吞掉真代码」的坑。
 */
const herouiRules = (path: string): string => heroui(path).replace(/\/\*[\s\S]*?\*\//g, '')

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
    // 有人「顺手补一下」时这条会红。补之前先读上面两条：HeroUI 已经覆盖了 44 份组件，
    // 自己再加一份的代价是两圈 ring 叠着、或者在深色下对比度不够（硬编码颜色不跟主题变量走）
    expect(appRules).not.toContain('focus-visible')
    expect(appRules).not.toContain('outline')
  })
})

describe('`prefers-reduced-motion`：为什么只补一处而不是一刀切', () => {
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

  it('会动而不带 `motion-reduce` 的**恰好**这三份，其中只有一份要补', () => {
    // 这条是「只补一处」的全部依据 —— 84 份组件 CSS 逐个过一遍的结果。
    // 多出第四份的话得去看它动的是什么、要不要跟着补，所以这里钉的是**精确集合**而不是数量。
    //
    // 三份里只有第一份要补，处置一句话版本：
    // - `skeleton.css`：无限循环的流光，**要补**，补在调用点（`motion-reduce:animate-none`）。
    // - `table.css`：排序指示器的 100ms 转向（`table.css:174`），而本仓库的 `Table.Column`
    //   一个都没开 `allowsSorting`（`RequestTable.tsx:372-376`），那个元素根本不渲。
    // - `scroll-shadow.css`：滚动驱动，见下面单独那条。
    //
    // 检测式里 `animation:` 是 2026-09-12 补的 —— 原先只认 `animate-` 与 `transition`，
    // 于是 `animation` 简写那一整类在射程外（上游两种都写：`toast.css:213` 就是简写）。
    // 补上之后 `scroll-shadow.css` 才第一次进到这个集合里。
    const unguarded = componentFiles.filter((name) => {
      const css = herouiRules(`components/${name}`)
      return /animate-|animation:|transition/.test(css) && !css.includes('motion-reduce:')
    })
    expect(unguarded.sort()).toEqual(['scroll-shadow.css', 'skeleton.css', 'table.css'])
  })

  it('`scroll-shadow.css` 那两条**不该**补 —— 它是滚动驱动的，压它反而丢东西', () => {
    // 上面那条集合把它算进来了，但它与另外两份不是一类：进度挂在 scroll timeline 上，
    // 不滚就一动不动 —— 动的那一下是滚动本身，不是这个偏好要防的自发运动。
    const ss = herouiRules('components/scroll-shadow.css')
    expect(ss).toContain('animation-timeline: scroll(self block), scroll(self block)')
    expect(ss).toContain('animation-timeline: scroll(self inline), scroll(self inline)')
    // 而且压它有**实际代价**：两个 `@property` 的 `initial-value` 都是 `0px`，
    // `animation: none` 会让渐隐塌成「没有渐隐」，于是「下面还有内容」这个提示直接消失
    // （用在 `CodeBlock.tsx:68` 与 `Result.tsx:344,476`）。
    expect(ss).toContain('--scroll-shadow-start-fade')
    expect(ss).toContain('--scroll-shadow-end-fade')
    expect(ss.match(/initial-value: 0px;/g)).toHaveLength(2)
  })

  it('toast 已经**不再**走 View Transitions —— 3.2.5 把这处漏补上了', () => {
    // 3.2.4 里 toast 走 `document.startViewTransition`，动画写在
    // `::view-transition-old/new(.toast-bottom)` 上，JS / CSS 两侧都不查这个偏好 ——
    // 所以 `index.css` 曾经有一条 `::view-transition-* { animation: none }` 补它。
    // 3.2.5 把这套整个换了：进出改成元素自身的 `transition`（transform / height / opacity），
    // 并自带 `motion-reduce:animate-none motion-reduce:transition-none`。这条红了的意思是
    // 上游把 view transition 接回来了，那时才需要把 `index.css` 那条加回去。
    const toast = herouiRules('components/toast.css')
    expect(toast).not.toContain('view-transition')
    expect(toast).toContain('transform var(--toast-translate-duration)')
    expect(toast).toContain('motion-reduce:animate-none motion-reduce:transition-none')
    const toastDir = new URL('../node_modules/@heroui/react/dist/components/toast/', import.meta.url)
    const withVt = readdirSync(toastDir)
      .filter((name) => name.endsWith('.js'))
      .filter((name) => readFileSync(new URL(name, toastDir), 'utf8').includes('startViewTransition'))
    expect(withVt).toEqual([])
  })

  it('`motion-reduce:` **能**盖到骨架屏的伪元素 —— 变体自己把 `::before/::after` 嵌进去了', () => {
    // 这条曾经写反过（写的是「补不了，因为 `::after:is(…)` 不合法」），于是骨架屏那处
    // 被一条手写的媒体查询补着。真相是变体的规则体里嵌了 `&::before, &::after`，
    // 所以元素上挂一个 `motion-reduce:animate-none` 就同时覆盖元素自身与两个伪元素。
    // 这条钉住的正是「那个类够用」这个前提 —— 上游把这两行拿掉，调用点那个类就不够了。
    const variants = herouiRules('variants/index.css')
    const block = variants.slice(variants.indexOf('@custom-variant motion-reduce'), variants.indexOf('@custom-variant motion-safe'))
    expect(block).toContain('&:is([data-reduce-motion="true"], [data-reduce-motion="true"] *)')
    expect(block).toContain('&::before,')
    expect(block).toContain('&::after {')
    // 两个分支各嵌一次：显式开关那支 + 系统偏好兜底那支
    expect(block.match(/&::after \{/g)).toHaveLength(2)
    expect(block).toContain('@media (prefers-reduced-motion: reduce) {')
  })

  it('骨架屏那处补在**调用点**，而且只有那一个调用点', () => {
    // 走类而不是媒体查询多拿一样东西：`data-reduce-motion="true"` 那条显式开关也生效。
    // 代价是覆盖面只有带类的那些 —— 所以这里同时钉「唯一的 `<Skeleton>` 带了这个类」。
    const list = readFileSync(new URL('../src/components/EndpointList.tsx', import.meta.url), 'utf8')
    const sites = list.match(/<Skeleton[^/]*\/>/g) ?? []
    expect(sites).toHaveLength(1)
    expect(sites[0]).toContain('motion-reduce:animate-none')
    // 全仓也只有这一处渲 `<Skeleton>`：多出第二处而没带类时，这条会红
    const srcDir = new URL('../src/', import.meta.url)
    const withSkeleton = readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
      .filter((name) => name.endsWith('.tsx'))
      .filter((name) => /<Skeleton[\s/]/.test(readFileSync(new URL(name, srcDir), 'utf8')))
      // `readdirSync` 给的是平台分隔符 —— 不归一的话这条只在 Windows 上红
      .map((name) => name.replaceAll('\\', '/'))
    expect(withSkeleton).toEqual(['components/EndpointList.tsx'])
  })
})

describe('补的那一处还对得上上游', () => {
  it('骨架屏的流光仍然是**无限循环**，而且仍然挂在伪元素上', () => {
    // 无限循环是这个偏好最该管的一类。挂在哪里决定「一个类够不够」——
    // 现在够，是因为 `motion-reduce` 变体把 `&::before, &::after` 一起嵌了（上面那条钉的）；
    // 上游把 `animate-skeleton` 挪去别的地方（比如某个子元素）时，那个类就盖不到了
    expect(heroui('themes/shared/theme.css')).toContain('--animate-skeleton: skeleton 2s linear infinite;')
    expect(heroui('components/skeleton.css')).toContain('&::after')
    expect(heroui('components/skeleton.css')).toContain('animate-skeleton')
  })

  it('关掉之后仍然看得见一块占位，而不是一片空白', () => {
    // 骨架屏的意义是把版面占住（`EndpointList.tsx:117` 记的正是这个）。
    // 底色是画在 `.skeleton` 上、与动画无关的，所以关掉流光不会把占位一起关掉
    expect(heroui('components/skeleton.css')).toContain('bg-surface-tertiary/70')
  })

  it('`index.css` 就是两条 `@import`，什么都没多写', () => {
    // 2026-09-12 之前这里挂着整段 `@media (prefers-reduced-motion) { … }`（骨架屏那条
    // `animation: none` 加一条 `*` 上的 `transition: none`）。那套自定义皮肤撤了之后，
    // 骨架屏改用调用点的一个类，而 `*` 那条也一起撤了 —— 这是**有意接受的代价**：
    // 本仓库自己的 `transition-*` 工具类在「减少动态效果」下不再被压（HeroUI 组件内部的
    // 那些仍然由上游自己的 `motion-reduce:` 管着）。要加回来时先读上面那份用例的判据。
    const rules = appRules.split('\n').map((line) => line.trim()).filter((line) => line !== '')
    expect(rules).toEqual(["@import 'tailwindcss';", "@import '@heroui/styles';"])
    expect(appRules).not.toContain('@media')
    expect(appRules).not.toContain('animation')
    expect(appRules).not.toContain('!important')
  })

  it('toast 的队列自己查偏好，不靠固定时长硬等', () => {
    // 3.2.5 起进出不再走 View Transitions，改成 CSS `transition` + 一段 `exitDuration`
    // 的 `setTimeout`。这条钉住的是「关掉动画不会把整条 toast 链卡在半路」那半判据的
    // 新形态：`close()` 先问 `matchMedia('(prefers-reduced-motion: reduce)')`，命中就
    // 直接 `super.close`、跳过那一段等待。要是它改成无条件等固定时长，关掉动画就会
    // 让每条 toast 白拖一段退场 —— 表现是「后面的 toast 悄悄慢半拍」，不报错、也不
    // 必然当场看得出来。
    const queue = readFileSync(new URL('../node_modules/@heroui/react/dist/components/toast/toast-queue.js', import.meta.url), 'utf8')
    expect(queue).toContain('window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches')
    expect(queue).toContain('if (!canAnimate) {')
    expect(queue).toContain('super.close(key)')
  })
})
