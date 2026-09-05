/**
 * 阶段 5 第 1 条：版面按 PRD 4.1 排成「请求区 / 结果区」两块，以及这一块自然要接的
 * 那几个 5.4 组件（`Breadcrumbs` / `Typography` / `Card` / `Link` / `ProgressBar`）。
 *
 * 两路判据，分法与 `endpointJumper.test.ts` 那份相同：
 *
 * 1. **真渲**（`react-dom/server` 的 `renderToStaticMarkup`）—— 顶栏那条面包屑、源文件
 *    那条链接、批量那条进度条都是纯展示件，从 `App.tsx` 里导出来单独渲，量的是真 DOM：
 *    `nav` 语义、`aria-current`、`href` / `rel`，以及**有没有 `aria-valuenow`**。
 * 2. **读源码** —— 「真的排成了两块」「右上角三颗的顺序」这类事量不到：`App` 整个渲不了
 *    （`useRequest` 一挂上就发请求）。而**造好但没挂载不报错**是这一轮已经出过三次的
 *    事故，所以照 `comparePanel.test.ts` 最后那组的先例，从源码那一侧钉。
 *
 * 另有两条**反方向**的绊线，钉的是「刻意没接」：`InputGroup`（这个界面没有可编辑的
 * URL 栏）与「假进度条」（`/api/record-batch` 一次性回全部结果）。两条都拴在契约的字段
 * 清单上 —— 契约真长出 `url` / 进度字段的那天它们会红，而那时**才**该考虑接上去。
 */

import { readFileSync } from 'node:fs'

import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

/**
 * `src/lib/api.ts` 在**模块初始化时**读 `location.search`（口令从页面 URL 取），而 vitest
 * 跑在 node 环境里 —— 静态 import `App.tsx` 会在第一行就炸。所以下面用动态 import，
 * 且**在这一行之后**（同 `endpointJumper.test.ts:38`）。
 */
vi.stubGlobal('location', new URL('http://localhost:5173/'))

/** 说明符刻意是个变量：`test/` 归 `tsconfig.node.json` 管，那份没有 `jsx`，静态 import `.tsx` 会 `TS6142` */
const MODULE = '../src/App'
const { BatchProgress, EndpointCrumbs, SourceLink } = (await import(MODULE)) as {
  BatchProgress: (props: { combinations: number }) => ReactNode
  EndpointCrumbs: (props: { platform: string; endpoint: string }) => ReactNode
  SourceLink: (props: { source: string }) => ReactNode
}

/**
 * 那条地址。**这里抄一份而不是从 `App.tsx` 导出来**：那份文件只导出组件，多导出一个
 * 函数会让 `react(only-export-components)` 亮一条警告。抄的这一份就是判据本身 ——
 * 对不上时红的是「地址变了」，而那正是要有人想一遍的事。
 */
const sourceUrl = (source: string): string => `https://github.com/ikenxuan/amagi/blob/main/${source}`

const render = (node: ReactNode): string => renderToStaticMarkup(node as never)

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

/** 去掉注释再断言 —— 否定断言尤其需要（同 `lazy.test.ts:29`：说明文字里就写着那些名字） */
const codeOf = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const APP = codeOf(read('src/App.tsx'))
const CONTRACT = read('shared/contract.ts')

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

describe('右栏真的排成了请求区 / 结果区两块', () => {
  it('两块各是一个带名字的 `role="region"`，名字就是那两个可见标题', () => {
    for (const id of ['REQUEST_REGION_TITLE', 'RESULT_REGION_TITLE']) {
      // Card 渲的是 `div`（`card.js` 的 `dom.div`），所以地标语义走 role
      expect(APP).toContain(`<Card className="min-w-0" role="region" aria-labelledby={${id}}>`)
      // 标签是那个可见标题本身，不是另抄一份 `aria-label`
      expect(APP).toMatch(new RegExp(`<Typography\\.Heading level=\\{2\\} id=\\{${id}\\}`))
    }
    // **恰好两块** —— 多一块说明有东西被挪出了这两个区
    expect(APP.match(/<Card\b(?!\.)/g)).toHaveLength(2)
    expect(APP.match(/<Card\.Content\b/g)).toHaveLength(2)
  })

  it('请求区装表单与集合，结果区装队列、对比、已有类型（PRD 4.1 的上下两格）', () => {
    const at = (needle: string): number => {
      const index = APP.indexOf(needle)
      if (index < 0) throw new Error(`App.tsx 里找不到 ${needle} —— 这条用例的判据没了`)
      return index
    }
    const requestCard = at('aria-labelledby={REQUEST_REGION_TITLE}')
    const resultCard = at('aria-labelledby={RESULT_REGION_TITLE}')
    // 请求区：端点标题（区名）→ 参数表单 → 请求集合
    expect(requestCard).toBeLessThan(at('<ParamForm'))
    expect(at('<ParamForm')).toBeLessThan(at('<RequestTable'))
    expect(at('<RequestTable')).toBeLessThan(resultCard)
    // 结果区：待定队列 → 并排对比 → 已有类型
    expect(resultCard).toBeLessThan(at('<OutcomeCard'))
    expect(at('<OutcomeCard')).toBeLessThan(at('<ComparePanel'))
    expect(at('<ComparePanel')).toBeLessThan(at('<GeneratedPanel'))
  })

  it('原先那根分界 `Separator` 撤了 —— 分界现在是两张 Card 各自的面', () => {
    // 顶栏那个竖的还在（端点名与标题之间），横的那根没了
    expect(APP).toContain('<Separator orientation="vertical" className="h-5" />')
    expect(APP).not.toContain('<Separator />')
  })
})

describe('顶栏按 PRD 4.1', () => {
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

  it('标题层级归 `Typography`，只剩 `PanelFallback` 那个 `<h2>` 是手写的', () => {
    // 那一个动不了：`test/lazy.test.ts` 按「与三块面板的加载态逐字相同」钉着
    expect(APP.match(/<h2\b/g)).toHaveLength(1)
    expect(APP).toContain('<h2 className="text-sm font-semibold">{title}</h2>')
    expect(APP).not.toContain('<h1')
    expect(APP.match(/<Typography\.Heading level=\{1\}/g)).toHaveLength(1)
    // 4 个 Typography h2：请求 / 结果 / 待定队列 / 「先选一个端点」（引导那块的标题）。
    // PanelFallback 那个手写 `<h2>` 由上面 `APP.match(/<h2\b/g)` 单独钉（它动不了，见 lazy.test.ts）
    expect(APP.match(/<Typography\.Heading level=\{2\}/g)).toHaveLength(4)
  })

  it('源文件那一行换成了 `SourceLink`，批量那条进度条挂在 `batch.loading` 上', () => {
    expect(APP).toContain('<SourceLink source={endpoint.source} />')
    expect(APP).not.toContain('定义在 <code')
    expect(APP).toContain('{batch.loading && <BatchProgress combinations={endpoint.combinations} />}')
  })
})

describe('**刻意没接** `InputGroup`', () => {
  it('一处都没有 —— 这个界面没有可编辑的 URL 栏', () => {
    expect(APP).not.toContain('InputGroup')
  })

  it('**契约上根本没有 URL 与方法** —— 有了才谈得上拼那条栏', () => {
    const block = /export interface EndpointInfo \{([\s\S]*?)\n\}/.exec(CONTRACT)
    if (block === null) throw new Error('shared/contract.ts 里找不到 EndpointInfo —— 这条用例的判据没了')
    const fields = [...block[1].matchAll(/^ {2}(\w+)\??:/gm)].map((match) => match[1])
    // 「选端点 + 填参数 + 发送」这条路上，method 与 path 从来没有到过浏览器：
    // 端点名到真实 URL 的映射在 `packages/core` 里，契约不带它。
    // 硬拼一条 `GET /bilibili/videoInfo` 是编一个不存在的方法和一个不存在的路径。
    // 这条清单里真出现 `url` / `method` 的那天它会红 —— 那时才该考虑接
    expect(fields).toEqual(['name', 'summary', 'schema', 'seeds', 'stored', 'combinations', 'unseeded', 'source'])
  })
})
