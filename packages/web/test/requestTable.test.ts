/**
 * 「请求集合」那张表：四种 `verdict` 的可分辨性、被拒记录的正常空位、空集合那句文案，
 * 以及 PRD 3.2 那句 **「同指纹 ⇒ 建议合并」**在界面上落成了什么措辞。
 *
 * **这里真的把组件渲出来**（`react-dom/server` 的 `renderToStaticMarkup`，先例与判据见
 * `outcomeCard.test.ts` 文件头）—— HeroUI / react-aria 的 `Table` 连 `renderEmptyState`
 * 都在 SSR 下渲得出来，所以量到的是真的 DOM 结构，不是「源码里有没有某个字符串」。
 *
 * 被测的是 `RequestCollectionTable`（纯渲染那一层）而不是 `RequestTable`：后者自己拉数据，
 * 而 `useRequest` 的请求在 effect 里发 —— SSR 下 effect 不跑，从外面渲只能渲到
 * 「正在读…」那一帧，四种 verdict 一条都到不了。
 *
 * 五件要钉住的事，前四件全是「空着 / 灰着会说谎」的那一类：
 *
 * 1. **四种 verdict 彼此可分辨。** 三条里两条是被拒，而「风控」与「空数据」对下一个人的
 *    意义完全不同（换 cookie vs 这东西真的不在了）。四个一样的灰 chip 等于没显示。
 * 2. **被拒的记录没有 `sampleHash` 是正常状态**（样本压根没生成），不许渲成错误或缺失。
 * 3. **`note` 真的显示。** 被拒的那几条全靠它传递信息（PRD 二 ②）。
 * 4. **空集合与 `shapeKey` 空位各说清自己是什么。** 前者是 61 个端点的现状，
 *    后者是「这条记录手上没有指纹」—— 留白会被读成「这一格丢了东西」。
 * 5. **同指纹那句话的措辞。** 它必须落在「这组参数没带来新形状」这一档，
 *    不能落在「重复 / 可以删」那一档；缺指纹的记录不算同形状；不靠颜色也分得清。
 */

import { readFileSync } from 'node:fs'

import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { RequestEntry, RequestVerdict } from '../shared/contract'

/**
 * `src/lib/api.ts` 在**模块初始化时**读 `location.search`（口令从页面自己的 URL 取，`:45`），
 * 而 vitest 跑在 node 环境里 —— 没有 `location`，静态 import 会在第一行就炸。
 *
 * 所以两个被测模块都用动态 import，**在这一行之后**。一个 `URL` 就够充当 `location`：
 * 那一句要的只是 `.search`，而空 query 正是回环下的常态（没绑局域网就没有口令）。
 */
vi.stubGlobal('location', new URL('http://localhost:5173/'))

/**
 * 被测组件。**说明符刻意是个变量**，理由与 `outcomeCard.test.ts:31-41` 逐字相同：
 * `test/` 归 `tsconfig.node.json` 管，那份没有 `jsx`，静态 import 一个 `.tsx` 会报 `TS6142`。
 */
const MODULE = '../src/components/RequestTable'
const { RequestCollectionTable } = (await import(MODULE)) as {
  RequestCollectionTable: (props: {
    requests: readonly RequestEntry[]
    endpointLabel?: string
    onRemove: (id: string) => void
    isRemoving?: boolean
  }) => ReactNode
}

/** api 那三个函数。`.ts` 没有 JSX，所以这条可以写字面量 —— 于是类型是真的，不用手抄一份 */
const { fetchRequests, removeRequest, upsertRequest } = await import('../src/lib/api')

/** 渲一遍表格，回静态 HTML */
const render = (requests: readonly RequestEntry[]): string =>
  renderToStaticMarkup(createElement(RequestCollectionTable, { requests, onRemove: () => undefined }))

/** 一条记录。`extra` 摆的是这个文件真正在意的那几个可选字段 */
const entry = (id: string, verdict: RequestVerdict, extra: Partial<RequestEntry> = {}): RequestEntry => ({
  id,
  label: `${id} 那一组`,
  params: { bvid: 'BV1xx411c7mD' },
  recordedAt: '2026-09-05T06:11:00Z',
  verdict,
  ...extra
})

/**
 * 某一行的 HTML。RAC 把 `Table.Row` 的 `id` 原样放进 `data-key`，所以按它切 ——
 * 断言必须落在**那一行**里：说明性文案（比如表格上方那句解释「还没算」的话）也含同样的词。
 */
const rowOf = (html: string, id: string): string => {
  const start = html.indexOf(`data-key="${id}"`)
  expect(start).toBeGreaterThan(-1)
  return html.slice(start, html.indexOf('</tr>', start))
}

/**
 * 表格自己那一段。**否定断言要落在这里**：表格上面那几段说明性文案会正当地提到同样的词 ——
 * 「空着不代表形状不同」那句里就有「同形状」三个字，而它说的恰恰是「这条判断做不出来」。
 * 满 HTML 上写 `not.toContain('同形状')` 会把那句解释当成一条同形状的断言。
 */
const tableOf = (html: string): string => html.slice(html.indexOf('<table'))

/** 四种结论各自该出现的 chip 颜色类。**判据是「彼此不同」**，具体是哪个颜色不重要 */
const CHIP_COLOR: Record<RequestVerdict, string> = {
  ok: 'chip--success',
  'reject:risk-control': 'chip--danger',
  'reject:login': 'chip--warning',
  'reject:empty': 'chip--accent'
}

describe('四种 verdict 彼此可分辨', () => {
  const all = Object.keys(CHIP_COLOR) as RequestVerdict[]
  const html = render(all.map((verdict) => entry(verdict.replace(':', '-'), verdict)))

  it('每一行拿到的是自己那个颜色，而另外三个都不在这一行里', () => {
    for (const verdict of all) {
      const row = rowOf(html, verdict.replace(':', '-'))
      expect(row).toContain(CHIP_COLOR[verdict])
      for (const other of all.filter((item) => item !== verdict)) expect(row).not.toContain(CHIP_COLOR[other])
    }
  })

  it('**颜色不是唯一的信息载体**：chip 上那四句中文各不相同，读屏那句也各不相同', () => {
    // 只数 chip 自己那个 label 槽 —— 中文说法在 `aria-label` 里也出现一次（它由说法 + 提示拼成），
    // 满 HTML 数字符串会把同一件事数两遍
    const shown = [...html.matchAll(/class="chip__label"[^>]*>([^<]*)</g)].map((hit) => hit[1]!)
    expect(shown).toEqual(expect.arrayContaining(['通过', '风控', '要登录', '空数据']))
    expect(new Set(shown).size).toBe(4)
    const spoken = [...html.matchAll(/aria-label="判定 ([^"]+)"/g)].map((hit) => hit[1]!)
    expect(spoken).toHaveLength(4)
    expect(new Set(spoken).size).toBe(4)
  })

  it('`verdict` 的原串也照渲 —— 人要照着它改 JSON', () => {
    for (const verdict of all) expect(rowOf(html, verdict.replace(':', '-'))).toContain(verdict)
  })

  it('**被拒的三行不是次要行**：chip 与 `ok` 那行同一个 `variant`、同一个字号', () => {
    for (const verdict of all) {
      const row = rowOf(html, verdict.replace(':', '-'))
      expect(row).toContain('chip--primary')
      expect(row).toContain('chip--sm')
    }
  })
})

describe('被拒的记录没有样本是正常状态', () => {
  it('那一格说的是「被拒的请求没有样本」，一个「缺失 / 错误 / 失败」都不出现', () => {
    const row = rowOf(render([entry('deleted', 'reject:empty')]), 'deleted')
    expect(row).toContain('被拒的请求没有样本')
    for (const word of ['缺失', '缺少', '错误', '失败', 'undefined', 'NaN']) expect(row).not.toContain(word)
  })

  it('`ok` 却没记样本文件名是另一件事，说法也不一样 —— 那几条是人手写进文件的', () => {
    expect(rowOf(render([entry('hand-written', 'ok')]), 'hand-written')).toContain('没记样本文件名')
  })

  it('有 `sampleHash` 时渲的是那 12 位十六进制本身（它是指向本地样本的指针）', () => {
    const row = rowOf(render([entry('bv-single-p', 'ok', { sampleHash: '57c213a5f38c' })]), 'bv-single-p')
    expect(row).toContain('57c213a5f38c')
    expect(row).not.toContain('被拒的请求没有样本')
  })
})

describe('note 与参数真的显示出来了', () => {
  it('**`note` 原样渲出来** —— 被拒的那几条全靠它传递信息（PRD 3.2 那条 `deleted` 就是这个形状）', () => {
    const note = '拿回 code: -404，data 是 null。留这条是为了别人不用再试一次'
    expect(rowOf(render([entry('deleted', 'reject:empty', { note })]), 'deleted')).toContain(note)
  })

  it('参数是真值、按 `键=值` 渲，字符串不加引号 —— 照着它就能把这个请求重放一遍', () => {
    expect(rowOf(render([entry('bv-single-p', 'ok')]), 'bv-single-p')).toContain('bvid=BV1xx411c7mD')
  })

  it('长值截在真省略号上，不是三个点', () => {
    const row = rowOf(render([entry('long', 'ok', { params: { keyword: '猫'.repeat(80) } })]), 'long')
    expect(row).toContain('…')
    expect(row).not.toContain('...')
  })

  it('没有参数的端点说「这个端点没有参数」而不是留一格空白', () => {
    expect(rowOf(render([entry('no-params', 'ok', { params: {} })]), 'no-params')).toContain('这个端点没有参数')
  })

  it('**时间不摆 ISO 原串给人看，但原串一个字符都没丢** —— 它在 `dateTime` 与 `title` 上', () => {
    const html = render([entry('bv-single-p', 'ok')])
    // 大小写不敏感地匹配：React 19 的 `renderToStaticMarkup` 把属性名原样输出成 `dateTime=`
    // （HTML 属性名本来就不区分大小写，浏览器读到的是同一个 `<time datetime>`）
    expect(html).toMatch(/dateTime="2026-09-05T06:11:00Z"/i)
    expect(html).toContain('title="2026-09-05T06:11:00Z"')
    const shown = /<time[^>]*>([^<]*)<\/time>/.exec(html)?.[1]
    expect(shown).toBeDefined()
    expect(shown).not.toBe('2026-09-05T06:11:00Z')
    // `Intl.DateTimeFormat('zh-CN')` 的 medium 写法。时区跟着看的人走，所以只钉年份
    expect(shown).toContain('2026')
  })
})

describe('两处空位各说清自己是什么', () => {
  it('**`shapeKey` 缺失时那一列写着「还没算」**，不是留白（留白会被读成「形状没有指纹」）', () => {
    expect(rowOf(render([entry('bv-single-p', 'ok', { sampleHash: '57c213a5f38c' })]), 'bv-single-p')).toContain('还没算')
  })

  it('有 `shapeKey` 时渲的是那个值，那一行不再说「还没算」', () => {
    const row = rowOf(render([entry('bv-single-p', 'ok', { shapeKey: 'a1b2c3d4' })]), 'bv-single-p')
    expect(row).toContain('a1b2c3d4')
    expect(row).not.toContain('还没算')
  })

  it('**空集合是正常态**：说「还没有请求记录」，而「错误 / 失败」一个都不出现', () => {
    const html = render([])
    expect(html).toContain('还没有请求记录')
    // 表格自己的空态真的触发了（RAC 在 `tbody` 上挂 `data-empty`），而不是渲出一张零行的表
    expect(html).toContain('data-empty="true"')
    for (const word of ['错误', '失败', '出错', '读不到', '缺失']) expect(html).not.toContain(word)
  })
})

describe('同指纹 ⇒ 界面上说得出「这组参数没带来新形状」', () => {
  /** 两个真格式的指纹（`sk1-` + 16 位十六进制）。这块面板按整串比，所以格式本身不影响判断 */
  const KEY_A = 'sk1-5b775da75b8d79ff'
  const KEY_B = 'sk1-0123456789abcdef'

  /** 一条带指纹的 `ok` 记录 */
  const shaped = (id: string, shapeKey: string): RequestEntry => entry(id, 'ok', { sampleHash: '57c213a5f38c', shapeKey })

  /**
   * **不许出现在界面上的那一档措辞。**
   *
   * 这条防的是「顺手把文案改简洁」：同指纹 ≠ 其中一条可以不要 —— 默认不收窄字面量，所以
   * 判别式取值不同的两组样本（`type: 1` 与 `type: 8`）渲出来的类型可能逐字节相同，
   * 那时两条记录在判别联合里是不同成员（判据在 `packages/typegen/src/shape.ts` 文件头最后一条）。
   * 而 PRD 阶段 6 的「另存 + 联合导出」正是靠不同参数组各留一份来产那个联合，
   * 界面把它们说成「重复」会让人手动毁掉那个前提。
   *
   * 只量**渲出来的 HTML**，不量源码：源码里的注释要说清「不能落在哪一档」，非引用这些词不可。
   */
  const BANNED = ['重复', '多余', '冗余', '可以删', '可以去掉', '删掉一条', '白录', '没必要']

  it('两条同指纹 ⇒ 那句话出现，两行互相点名', () => {
    const html = render([shaped('bv-single-p', KEY_A), shaped('bv-multi-p', KEY_A)])
    expect(rowOf(html, 'bv-single-p')).toContain('与 bv-multi-p 同形状')
    expect(rowOf(html, 'bv-single-p')).toContain('这组参数没带来新形状')
    expect(rowOf(html, 'bv-multi-p')).toContain('与 bv-single-p 同形状')
    // 指纹原串照渲：它是「为什么这两条是一组」的证据，人要拿它去 `.requests.json` 里对
    expect(html).toContain(KEY_A)
  })

  it('**措辞落在「没带来新形状 / 可以考虑合并」这一档**，一个「重复 / 可以删 / 多余」都不出现', () => {
    const html = render([shaped('bv-single-p', KEY_A), shaped('bv-multi-p', KEY_A)])
    expect(html).toContain('可以考虑合并成一份')
    expect(html).toContain('没带来新形状')
    for (const word of BANNED) expect(html).not.toContain(word)
  })

  it('**不给一颗点了没反应的「合并」按钮** —— 那个动作要到阶段 6（`mode: merge | separate`）才存在', () => {
    const html = render([shaped('bv-single-p', KEY_A), shaped('bv-multi-p', KEY_A)])
    expect(html).not.toMatch(/<button[^>]*>[^<]*合并/)
    // 全表的按钮只有每行那颗「删除」
    expect([...html.matchAll(/<button/g)]).toHaveLength(2)
  })

  it('三条同指纹 ⇒ 关系仍然说得清：行内互相点名，完整清单在表格上面', () => {
    const html = render([shaped('bv-single-p', KEY_A), shaped('bv-multi-p', KEY_A), shaped('bv-third', KEY_A)])
    expect(rowOf(html, 'bv-single-p')).toContain('与 bv-multi-p、bv-third 同形状')
    expect(rowOf(html, 'bv-multi-p')).toContain('与 bv-single-p、bv-third 同形状')
    expect(rowOf(html, 'bv-third')).toContain('与 bv-single-p、bv-multi-p 同形状')
    // 同一个组名把三行接在一起（指纹是 16 位十六进制，肉眼对不齐 —— 那才是短名存在的理由）
    for (const id of ['bv-single-p', 'bv-multi-p', 'bv-third']) expect(rowOf(html, id)).toContain('同形状 A')
    // 三条全列出来的那份清单在**表格外面**：行内 3 条以上会截，清单不截
    const full = html.indexOf('bv-single-p、bv-multi-p、bv-third')
    expect(full).toBeGreaterThan(-1)
    expect(full).toBeLessThan(html.indexOf('data-key='))
  })

  it('指纹不同 ⇒ 那句话不出现，而且界面上没有任何一句反向断言（不同指纹不保证类型真的不同）', () => {
    const html = render([shaped('bv-single-p', KEY_A), shaped('bv-multi-p', KEY_B)])
    expect(tableOf(html)).not.toContain('同形状')
    expect(html).not.toContain('没带来新形状')
    // 表格上面那份清单整个不渲染，而两个指纹照样各自渲出来
    expect(html).not.toContain('可以考虑合并成一份')
    expect(html).toContain(KEY_A)
    expect(html).toContain(KEY_B)
  })

  it('**两条都缺 `shapeKey` ⇒ 不该被说成同形状** —— 那是拿「都不知道」当「都一样」', () => {
    const html = render([entry('deleted', 'reject:empty'), entry('risky', 'reject:risk-control')])
    expect(tableOf(html)).not.toContain('同形状')
    expect(html).not.toContain('可以考虑合并成一份')
    expect(rowOf(html, 'deleted')).toContain('还没算')
    // 表格上面那句解释必须把这件事说出来：空着是「没有指纹」，不是「形状不同」
    expect(html).toContain('空着不代表形状不同')
  })

  it('一条有指纹一条没有也不成组', () => {
    const html = render([shaped('bv-single-p', KEY_A), entry('deleted', 'reject:empty')])
    expect(tableOf(html)).not.toContain('同形状')
    expect(html).not.toContain('可以考虑合并成一份')
  })

  it('**不靠颜色也分得清**：把每一个 class 都摘掉，「哪两行是一组」照样读得出来', () => {
    const html = render([shaped('bv-single-p', KEY_A), shaped('bv-multi-p', KEY_A), shaped('other', KEY_B)])
    const plain = html.replace(/ class="[^"]*"/g, '')
    expect(rowOf(plain, 'bv-single-p')).toContain('与 bv-multi-p 同形状')
    expect(rowOf(plain, 'bv-single-p')).toContain('同形状 A')
    expect(rowOf(plain, 'other')).not.toContain('同形状')
    // 记号只是锦上添花（`aria-hidden`），读屏那句由 chip 的 `aria-label` 说 —— 它说的是结论而不是代号
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('aria-label="同形状 A：这一条与另外 1 条渲出来的类型逐字节相同，这组参数没带来新形状"')
  })
})

describe('删除走一道确认，不是按下就删', () => {
  const source = readFileSync(new URL('../src/components/RequestTable.tsx', import.meta.url), 'utf8')

  it('行里那颗按钮说得出删的是哪一条 —— 一屏几行按钮长得一模一样', () => {
    expect(render([entry('bv-single-p', 'ok')])).toContain('aria-label="删除请求记录 bv-single-p"')
  })

  it('**确认框的正文不在关着的 DOM 里** —— 那正是「按下不会直接删」的证据', () => {
    expect(render([entry('bv-single-p', 'ok')])).not.toContain('删掉这条')
  })

  it('`onRemove` 只从确认框里那颗红按钮出发（`close()` 之后紧跟着的那一句）', () => {
    // 这件事渲不出来（关着的对话框不在 DOM 里），所以这条读源码 ——
    // 判据与 `outcomeCard.test.ts:128-136` 同一条：**造好但没接线不报错**
    expect(source).toContain('<AlertDialog>')
    expect(source).toMatch(/close\(\)[\s\S]{0,40}onRemove\(entry\.id\)/)
    // 全文只有那一处调用它：行里那颗按钮身上没有 `onPress`
    expect(source.match(/onRemove\(/g)).toHaveLength(1)
  })

  it('取数那一层真的把表格接上了，删除也是这块面板自己的动作', () => {
    expect(source).toContain('<RequestCollectionTable')
    expect(source).toContain('fetchRequests')
    expect(source).toContain('removeRequest')
  })

  it('**确认框里也说了同形状那句** —— 这颗按钮是「同形状」唯一能造成破坏的地方', () => {
    // 同上一条：关着的对话框不在 DOM 里，所以这条读源码。防的是「表格里读到同形状、
    // 顺手留一条」—— 那会毁掉阶段 6「另存 + 联合导出」的前提（不同参数组各留一份才产得出判别联合）
    expect(source).toMatch(/sameShape !== undefined/)
    expect(source).toContain('少一条就少一个成员的证据')
  })
})

describe('三个 api 函数打同一条 `POST /api/requests`，靠 `op` 分', () => {
  /** 换掉 `fetch`，记下每一发。回的正文默认能当 JSON 解析 */
  const capture = (status = 200, body = '{"path":"corpus/bilibili/videoInfo.requests.json"}'): { path: string; body: unknown }[] => {
    const calls: { path: string; body: unknown }[] = []
    vi.stubGlobal('fetch', (path: string, init?: { body?: string }) => {
      calls.push({ path, body: init?.body === undefined ? undefined : (JSON.parse(init.body) as unknown) })
      return Promise.resolve(new Response(body, { status, headers: { 'content-type': 'application/json' } }))
    })
    return calls
  }

  it('`list` / `upsert` / `remove` 三个 op 各自送对了，路径是同一条', async () => {
    const calls = capture()
    await fetchRequests({ platform: 'bilibili', endpoint: 'videoInfo' })
    await upsertRequest({
      platform: 'bilibili',
      endpoint: 'videoInfo',
      id: 'bv-single-p',
      label: '单 P 稿件',
      params: { bvid: 'BV1xx411c7mD' },
      verdict: 'ok'
    })
    await removeRequest({ platform: 'bilibili', endpoint: 'videoInfo', id: 'bv-single-p' })
    expect(calls.map((call) => call.path)).toEqual(['/api/requests', '/api/requests', '/api/requests'])
    expect(calls.map((call) => (call.body as { op: string }).op)).toEqual(['list', 'upsert', 'remove'])
    // upsert 把条目字段**平铺**进 body —— server 那侧就是这么读的（`server/index.ts:596-606`）
    expect(calls[1]!.body).toMatchObject({ id: 'bv-single-p', label: '单 P 稿件', params: { bvid: 'BV1xx411c7mD' }, verdict: 'ok' })
    // `recordedAt` 不给就不送：由 server 按现在这一刻填（`index.ts:601`）
    expect(calls[1]!.body).not.toHaveProperty('recordedAt')
  })

  it('**409 那档的纯文本原样变成错误消息** —— 那句话说的是「先去修盘上那个文件」，不能被吃掉', async () => {
    capture(409, '盘上那份集合有问题，拒绝覆盖它 —— 先把这些修好：\nrequests[3].id 撞名')
    await expect(removeRequest({ platform: 'bilibili', endpoint: 'videoInfo', id: 'x' })).rejects.toThrow('拒绝覆盖它')
  })
})
