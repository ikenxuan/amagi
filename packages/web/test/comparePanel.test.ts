/**
 * 「并排对比」那块面板：四种差异的可分辨性、两条必须说出来的话（`note` 与 `recursive`）、
 * 以及两块面板到底有没有被挂进界面。
 *
 * **这里真的把组件渲出来**（`react-dom/server` 的 `renderToStaticMarkup`，先例与判据见
 * `outcomeCard.test.ts` 文件头）—— HeroUI / react-aria 的 `Table` 连 `renderEmptyState`
 * 都在 SSR 下渲得出来，所以量到的是真的 DOM 结构，不是「源码里有没有某个字符串」。
 *
 * 被测的是 `CompareView` 与 `ComparePicker`（两层纯渲染）而不是 `ComparePanel`：后者自己拉数据，
 * 而 `useRequest` 的请求在 effect 里发 —— SSR 下 effect 不跑，从外面渲只能渲到
 * 「正在读…」那一帧，四种差异一条都到不了（同 `requestTable.test.ts:8-10`）。
 *
 * 六件要钉住的事：
 *
 * 1. **四种 `kind` 彼此可分辨，而且不靠颜色也分得出。** 四类要人做的事完全不同：
 *    `type` 会让下游编译红，`optionality` 里有一大半是「只录了一份样本」的影子。
 * 2. **`note` 原样渲出来，而且 PRD 4.3 那四处差异一处都没少。** 这句话是这个结果
 *    **做不到**的那件事，也是最容易被误读成「平台改了字段」的那件事 —— 而它只有一份，
 *    在 server（`COMPARE_NOTE`）。这里连着源头一起钉：那四处少一处，这条就红。
 * 3. **`recursive` 非空时那句话真的出现。** 那些路径底下一个字段都没参与比对，
 *    「零差异」在那些子树上说的是「没看」而不是「一样」—— 无声的截断是要修的，不是要抄的。
 * 4. **两边的 `fields` 都显示出来。** 「7 处差异」在 90 个字段上和在 12 个字段上是两个结论。
 * 5. **`left === right` 那条 400 由界面自己挡住。** 两个下拉框摆在一起，选重是最常见的
 *    手误，而那一档是「改你的输入」，不是后端故障。按钮那一道真渲出来量（`disabled` 属性），
 *    「哪一项被禁掉了」只能读源码 —— 选项在 popover 里，关着的时候不在 DOM 里。
 * 6. **两块面板真的挂进了 `App.tsx`。** `RequestTable` 上一轮就做完了却没有任何地方挂它，
 *    而**造好但没挂载不报错** —— 那正是最后那一组用例存在的理由。
 */

import { readFileSync } from 'node:fs'

import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { COMPARE_NOTE } from '../server/compare'
import type { CompareFieldDiff, CompareResult, CompareSide, HighlightedCode } from '../shared/contract'

/**
 * `src/lib/api.ts` 在**模块初始化时**读 `location.search`（口令从页面自己的 URL 取），
 * 而 vitest 跑在 node 环境里 —— 没有 `location`，静态 import 会在第一行就炸。
 * 所以被测模块都用动态 import，**在这一行之后**（同 `requestTable.test.ts:31-38`）。
 */
vi.stubGlobal('location', new URL('http://localhost:5173/'))

/**
 * 被测组件。**说明符刻意是个变量**：`test/` 归 `tsconfig.node.json` 管，
 * 那份没有 `jsx`，静态 import 一个 `.tsx` 会报 `TS6142`。
 */
const MODULE = '../src/components/ComparePanel'
const { ComparePicker, CompareView } = (await import(MODULE)) as {
  ComparePicker: (props: {
    candidates: readonly { sampleHash: string; id: string; label: string }[]
    left?: string
    right?: string
    isPending?: boolean
    onPick: (which: 'left' | 'right', sampleHash?: string) => void
    onCompare: () => void
  }) => ReactNode
  CompareView: (props: { result: CompareResult }) => ReactNode
}

/** api 那个函数。`.ts` 没有 JSX，所以这条可以写字面量 —— 于是类型是真的，不用手抄一份 */
const { fetchCompare } = await import('../src/lib/api')

/** 一段假高亮。这一侧不认识 shiki（`CodeBlock.tsx` 只把 HTML 塞进 DOM），所以够用 */
const code = (source: string): HighlightedCode => ({
  html: `<pre class="shiki"><code>${source}</code></pre>`,
  chars: source.length,
  totalChars: source.length
})

const side = (sampleHash: string, fields: number, recursive: string[] = []): CompareSide => ({
  sampleHash,
  code: code(`export type VideoInfo_V0 = { fields: ${fields} }`),
  fields,
  recursive
})

/** 一份结果。`counts` 从 `diffs` 现数 —— server 就是这么算的（`compare.ts:163-166`） */
const result = (diffs: CompareFieldDiff[], extra: Partial<CompareResult> = {}): CompareResult => {
  const counts: CompareResult['counts'] = { 'only-left': 0, 'only-right': 0, type: 0, optionality: 0 }
  for (const diff of diffs) counts[diff.kind] += 1
  return {
    platform: 'bilibili',
    endpoint: 'videoInfo',
    left: side('57c213a5f38c', 87),
    right: side('8f1e2d3c4b5a', 90),
    diffs,
    same: 85,
    counts,
    note: COMPARE_NOTE,
    ...extra
  }
}

const render = (input: CompareResult): string => renderToStaticMarkup(createElement(CompareView, { result: input }))

/**
 * 某一行的 HTML。RAC 把 `Table.Row` 的 `id` 原样放进 `data-key`，所以按它切 ——
 * 断言必须落在**那一行**里：上面那排计数 chip 用的是同一批词与同一批颜色类。
 */
const rowOf = (html: string, path: string): string => {
  const start = html.indexOf(`data-key="${path}"`)
  expect(start).toBeGreaterThan(-1)
  return html.slice(start, html.indexOf('</tr>', start))
}

/** 四种差异各来一条。取值照 `flatten.ts:161-181` 那几处 push 的真实形状 */
const FOUR: CompareFieldDiff[] = [
  { path: 'data.staff', kind: 'only-left', left: 'Staff[]' },
  { path: 'data.honor_reply', kind: 'only-right', right: 'HonorReply' },
  { path: 'data.desc', kind: 'type', left: 'string', right: 'string | null' },
  { path: 'data.pages[].dimension.rotate', kind: 'optionality', left: '必需', right: '可选' }
]

/** 四种结论各自该出现的 chip 颜色类。**判据是「彼此不同」**，具体是哪个颜色不重要 */
const CHIP_COLOR: Record<CompareFieldDiff['kind'], string> = {
  'only-left': 'chip--warning',
  'only-right': 'chip--success',
  type: 'chip--danger',
  optionality: 'chip--accent'
}

describe('四种 kind 都渲得出来且彼此可分辨', () => {
  const html = render(result(FOUR))

  it('每一行拿到的是自己那个颜色，另外三个都不在这一行里', () => {
    for (const diff of FOUR) {
      const row = rowOf(html, diff.path)
      expect(row).toContain(CHIP_COLOR[diff.kind])
      for (const other of FOUR.filter((item) => item.kind !== diff.kind)) expect(row).not.toContain(CHIP_COLOR[other.kind])
    }
  })

  it('**颜色不是唯一的信息载体**：四句中文各不相同，读屏那句也各不相同', () => {
    const spoken = FOUR.map((diff) => /aria-label="([^"]+)"/.exec(rowOf(html, diff.path))?.[1])
    expect(spoken.filter((text) => text !== undefined)).toHaveLength(4)
    expect(new Set(spoken).size).toBe(4)
    for (const label of ['只有左边有', '只有右边有', '类型不同', '可选性不同']) expect(html).toContain(label)
  })

  it('记号（`+` / `-` / `~` / `?`）四个也各不相同，而且对读屏隐藏 —— 那一串是噪音', () => {
    const marks = FOUR.map((diff) => /aria-hidden="true"[^>]*>([^<]*)</.exec(rowOf(html, diff.path))?.[1])
    expect(new Set(marks)).toEqual(new Set(['-', '+', '~', '?']))
  })

  it('`kind` 的原串也照渲 —— 人要靠它对上契约里那四个取值', () => {
    for (const diff of FOUR) expect(rowOf(html, diff.path)).toContain(`>${diff.kind}<`)
  })

  it('**四行不分主次**：chip 同一个 `variant`、同一个字号', () => {
    for (const diff of FOUR) {
      const row = rowOf(html, diff.path)
      expect(row).toContain('chip--primary')
      expect(row).toContain('chip--sm')
    }
  })

  it('两侧的说法按 `kind` 各就各位：`type` 是类型表达式，`optionality` 是必需/可选', () => {
    expect(rowOf(html, 'data.desc')).toContain('string | null')
    const optional = rowOf(html, 'data.pages[].dimension.rotate')
    expect(optional).toContain('必需')
    expect(optional).toContain('可选')
  })

  it('**缺的那一侧不留白**，它说的是「这一侧没有这个字段」', () => {
    // 契约里 `only-left` 时 `right` 那个键**整个不在**（`contract.ts:367-373`），
    // 空白格会被读成「这个值没取到」
    expect(rowOf(html, 'data.staff')).toContain('这一侧没有这个字段')
    expect(rowOf(html, 'data.honor_reply')).toContain('这一侧没有这个字段')
    expect(rowOf(html, 'data.desc')).not.toContain('这一侧没有这个字段')
  })
})

describe('PRD 4.3 那句提示', () => {
  it('**server 回的那一句原样到了界面上**，前端不另拼一份', () => {
    expect(render(result(FOUR))).toContain(COMPARE_NOTE)
  })

  it('**四处差异一处都没少**：可选性、空数组、`null` 合并、超阈值转索引签名', () => {
    // 这条钉的是源头那句话本身（界面渲的就是它）。审计里 `GeneratedPanel.tsx:91-96`
    // 那份手写提示只讲了三处 —— 缺的正是索引签名（`MAP_MIN_KEYS = 12`）那条，
    // 而这条用例的存在是为了「对比」这块面板不会重复那个缺口
    for (const gist of ['必需', 'unknown[]', 'null', '索引签名', '12']) expect(COMPARE_NOTE).toContain(gist)
  })
})

describe('recursive 非空 = 那底下没有比过', () => {
  it('那句话真的出现，路径也原样列出来', () => {
    const html = render(result([], { left: side('57c213a5f38c', 87, ['data.replies[].replies']) }))
    expect(html).toContain('这几条路径底下没有比过')
    expect(html).toContain('data.replies[].replies')
    expect(html).toContain('一个都没有参与比对')
  })

  it('两边分别标出来 —— 一侧停下不等于另一侧也停下', () => {
    const html = render(
      result([], {
        left: side('57c213a5f38c', 87, ['data.replies[].replies']),
        right: side('8f1e2d3c4b5a', 90, ['data.card.vip'])
      })
    )
    expect(html).toContain('data.replies[].replies')
    expect(html).toContain('data.card.vip')
  })

  it('**两边都空时那块整个不出现** —— 空数组是常态，不是一条要报的告警', () => {
    expect(render(result(FOUR))).not.toContain('底下没有比过')
  })
})

describe('差异规模的分母都显示出来了', () => {
  const html = render(result(FOUR))

  it('两边各摊平出多少个字段', () => {
    expect(html).toContain('87')
    expect(html).toContain('90')
    expect(html).toMatch(/87[^<]*个字段/)
    expect(html).toMatch(/90[^<]*个字段/)
  })

  it('一致多少个、一共几处差异', () => {
    expect(html).toMatch(/4[^<]*处差异/)
    expect(html).toMatch(/85[^<]*个字段一致/)
  })

  it('比的是哪两份样本 —— 两栏抬头与清单列头都说了一遍', () => {
    expect(html.match(/57c213a5f38c/g)!.length).toBeGreaterThan(1)
    expect(html.match(/8f1e2d3c4b5a/g)!.length).toBeGreaterThan(1)
  })

  it('数字用等宽字形（两栏抬头是上下对着看的）', () => {
    expect(html).toContain('tabular-nums')
  })
})

describe('零差异是一条结论，不是一条错误', () => {
  const html = render(result([]))

  it('说的是「两边逐字段一致」，「错误 / 失败」一个都不出现', () => {
    expect(html).toContain('两边逐字段一致')
    // 表格自己的空态真的触发了（RAC 在 `tbody` 上挂 `data-empty`），而不是渲出一张零行的表
    expect(html).toContain('data-empty="true"')
    for (const word of ['错误', '失败', '出错', '读不到', '缺失']) expect(html).not.toContain(word)
  })

  it('**并排的两份源码照样渲** —— 「一样」这个结论要看得见两边才成立', () => {
    expect(html.match(/class="shiki"/g)).toHaveLength(2)
  })
})

describe('fetchCompare 打的是 POST /api/compare', () => {
  /** 换掉 `fetch`，记下每一发。回的正文默认能当 JSON 解析 */
  const capture = (status = 200, body = '{"platform":"bilibili"}'): { path: string; body: unknown }[] => {
    const calls: { path: string; body: unknown }[] = []
    vi.stubGlobal('fetch', (path: string, init?: { body?: string }) => {
      calls.push({ path, body: init?.body === undefined ? undefined : (JSON.parse(init.body) as unknown) })
      return Promise.resolve(new Response(body, { status, headers: { 'content-type': 'application/json' } }))
    })
    return calls
  }

  it('四个字段平铺进 body —— server 那侧就是这么读的（`index.ts:739-748`）', async () => {
    const calls = capture()
    await fetchCompare({ platform: 'bilibili', endpoint: 'videoInfo', left: '57c213a5f38c', right: '8f1e2d3c4b5a' })
    expect(calls).toHaveLength(1)
    expect(calls[0]!.path).toBe('/api/compare')
    expect(calls[0]!.body).toEqual({ platform: 'bilibili', endpoint: 'videoInfo', left: '57c213a5f38c', right: '8f1e2d3c4b5a' })
  })

  it('**404 那档的纯文本原样变成错误消息** —— 那句话里列着现有的哈希，正是人下一步要用的东西', async () => {
    capture(404, 'bilibili/videoInfo 底下没有这些样本：right=deadbeef1234\n现有的是：57c213a5f38c / 8f1e2d3c4b5a')
    await expect(
      fetchCompare({ platform: 'bilibili', endpoint: 'videoInfo', left: '57c213a5f38c', right: 'deadbeef1234' })
    ).rejects.toThrow('现有的是：57c213a5f38c / 8f1e2d3c4b5a')
  })
})

describe('「选哪两份」那一行真渲得出来', () => {
  const CANDIDATES = [
    { sampleHash: '57c213a5f38c', id: 'bv-single-p', label: '单 P 稿件' },
    { sampleHash: '8f1e2d3c4b5a', id: 'bv-multi-p', label: '多 P 稿件' }
  ]
  const picker = (left?: string, right?: string): string =>
    renderToStaticMarkup(
      createElement(ComparePicker, { candidates: CANDIDATES, left, right, onPick: () => undefined, onCompare: () => undefined })
    )

  it('两个框各有自己的 `Label`，加一颗按钮', () => {
    const html = picker('57c213a5f38c', '8f1e2d3c4b5a')
    expect(html).toContain('左边那一组')
    expect(html).toContain('右边那一组')
    expect(html).toContain('并排比一比')
  })

  it('**收起来也看得见比的是谁** —— 两份的 id、说明、样本文件名都在按钮上，不用先展开', () => {
    const html = picker('57c213a5f38c', '8f1e2d3c4b5a')
    expect(html).toMatch(/data-slot="select-value"[^>]*>bv-single-p · 单 P 稿件 · 57c213a5f38c</)
    expect(html).toMatch(/data-slot="select-value"[^>]*>bv-multi-p · 多 P 稿件 · 8f1e2d3c4b5a</)
  })

  it('一边都没选时渲的是占位文案，不是一格空白', () => {
    expect(picker(undefined, undefined)).toContain('选一份样本')
  })
})

describe('`left === right` 那条 400 由界面自己挡住', () => {
  const CANDIDATES = [
    { sampleHash: '57c213a5f38c', id: 'bv-single-p', label: '单 P 稿件' },
    { sampleHash: '8f1e2d3c4b5a', id: 'bv-multi-p', label: '多 P 稿件' }
  ]
  /** 那颗按钮按不下去吗。RAC 的 `Button` 在 `isDisabled` 下渲真 `disabled` 属性 */
  const blocked = (left?: string, right?: string): boolean =>
    /<button[^>]*disabled[^>]*>并排比一比/.test(
      renderToStaticMarkup(
        createElement(ComparePicker, { candidates: CANDIDATES, left, right, onPick: () => undefined, onCompare: () => undefined })
      )
    )

  it('**两边撞上时按不下去** —— 那一档是「改你的输入」，不该以一条红条的样子出现', () => {
    expect(blocked('57c213a5f38c', '57c213a5f38c')).toBe(true)
  })

  it('一边还没选也按不下去；两边齐了又不同才按得下去', () => {
    expect(blocked('57c213a5f38c', undefined)).toBe(true)
    expect(blocked(undefined, '8f1e2d3c4b5a')).toBe(true)
    expect(blocked('57c213a5f38c', '8f1e2d3c4b5a')).toBe(false)
  })

  // 下面两条渲不出来（选项在 popover 里，关着的时候不在 DOM 里），所以读源码 ——
  // 判据同 `requestTable.test.ts:208-215`：**造好但没接线不报错**
  const source = readFileSync(new URL('../src/components/ComparePanel.tsx', import.meta.url), 'utf8')

  it('两个下拉框各把对面选中的那份放进 `disabledKeys`', () => {
    expect(source).toContain('disabledKeys={taken === undefined ? [] : [taken]}')
    expect(source).toContain('taken={right}')
    expect(source).toContain('taken={left}')
  })

  it('**默认值这条路上也不许撞** —— 那条路上没有人点，`disabledKeys` 管不到', () => {
    expect(source).toMatch(/rightPick !== left/)
    expect(source).toMatch(/left !== right/)
    expect(source).toContain('isDisabled={!ready}')
  })
})

describe('两块面板真的挂进了界面', () => {
  // `RequestTable` 上一轮就做完了、却没有任何地方挂它 —— 而**造好但没挂载不报错**，
  // 那正是这几条用例存在的理由。三栏之后它们各自搬进了一栏的 tab 里，所以这几条读的是
  // 那两个文件；`App.tsx` 那侧只剩「把两个计数器递下去」，而那一半仍然在这里钉着
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const requestPane = readFileSync(new URL('../src/components/RequestPane.tsx', import.meta.url), 'utf8')
  const typePane = readFileSync(new URL('../src/components/TypePane.tsx', import.meta.url), 'utf8')

  it('`RequestTable` 与参数表单同在「请求」栏里（PRD 4.1：集合在请求块里）', () => {
    // 那条没变，变的是「块」成了「栏」：摆成两页而不是上下两块，为的是让参数表单
    // **独占这一栏的高度** —— 它是这一栏里唯一每次都要动的东西
    expect(requestPane).toContain('<ParamForm')
    expect(requestPane.indexOf('<ParamForm')).toBeLessThan(requestPane.indexOf('<RequestTable'))
    expect(requestPane).toMatch(/<Tabs\.Panel id="requests">[\s\S]{0,400}?<RequestTable/)
  })

  it('`ComparePanel` 在「类型」栏的 `对比` 那一页上', () => {
    // 原先的判据是版面顺序（结果区里对比排在「已有类型」前面）。三栏之后那四页的顺序换成了
    // **问题的顺序**：本次 → 已提交 → diff → 对比，前两页答「是什么」，后两页答「要不要动它」。
    // 顺序本身由 `result.test.ts` 那侧渲出来对着 tab 读，这里钉的是「真的在这一栏里」
    expect(typePane).toMatch(/<Tabs\.Panel id="compare">[\s\S]{0,400}?<ComparePanel/)
  })

  it('两块都换 `key` —— `useRequest` 重拉时留着上一份 data，不换会显示上一个端点的集合', () => {
    expect(requestPane).toMatch(/key=\{`requests:\$\{/)
    expect(typePane).toMatch(/key=\{`compare:\$\{/)
  })

  it('**集合与产物不共用一个计数器**：两块读同一个文件的接同一个，「已提交」接自己那个', () => {
    // 计数器在 `App.tsx`（改动它们的那两颗按钮在那一层），一路作为 prop 递进两栏
    expect(app).toContain('setRequestsRevision')
    expect(app.match(/requestsRevision=\{requestsRevision\}/g)).toHaveLength(2)
    expect(app.match(/generatedRevision=\{generatedRevision\}/g)).toHaveLength(1)
    // 到了栏里再分给具体那块面板：集合与对比读同一个文件、接同一个计数器
    expect(requestPane).toContain('revision={requestsRevision}')
    expect(typePane).toContain('revision={requestsRevision}')
    expect(typePane).toContain('revision={generatedRevision}')
    // 入库那一路必须推进集合那个计数器：`/api/store` 带 `id` 时会顺手追加一条记录
    expect(app).toMatch(/storeSample[\s\S]{0,600}setRequestsRevision/)
  })
})
