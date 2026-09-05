/**
 * `⌘K` 端点跳转器：过滤判据、平台相关的键帽文案、无障碍连线，以及**那条键位判据本身**。
 *
 * **这里真的把组件渲出来**（`react-dom/server` 的 `renderToStaticMarkup`，先例与判据见
 * `outcomeCard.test.ts` 文件头）—— 但这个组件比前几个多一道坎，值得写清楚：
 *
 * **弹层里那一段渲不出来。** 候选列表在 `Autocomplete.Popover` 里，关着时不在 DOM、
 * 开着时走 portal，而 `renderToStaticMarkup` 不渲 portal（`comparePanel.test.ts:25` 记的
 * 就是这条：那边两个下拉框的选项同样量不到）。所以这个文件分三路量：
 *
 * 1. **纯函数**（`flattenEndpoints` / `matchEndpoints` / `isMacLike` / `shortcutHint`）——
 *    过滤与文案的判据全在这里，直接调。
 * 2. **`JumperOptions` 单独渲** —— 候选列表被刻意拎成了独立一层，正是为了让
 *    「搜一个词，只剩该剩的几行」这件事量得到真 DOM 而不是只量一个数组。
 * 3. **整个跳转器渲一遍** —— 收起来那颗按钮是真的能渲的（`aria-label` / `aria-haspopup` /
 *    键帽 / 占位文案 / 选中值全在），另外 RAC 的 `Select` 会渲一个隐藏的原生 `<select>`，
 *    里面每个 `<option>` 就是 `ListBox` 真的收到的那一条 —— 那是「集合接对了」的证据。
 *
 * **量不到的那部分（照实说）**：真按一下 `⌘K`、真在输入框里打字、真按上下键在候选间移动、
 * 真按 `Escape` 关掉 —— 这四件都要事件循环与真实 DOM，`renderToStaticMarkup` 一件都做不到。
 * 其中风险最高的是**键位判据**（写错了会静默失效，不报错、不红、只是按下去没反应），
 * 所以那一条改成读源码钉住，判据与 `requestTable.test.ts:312-319` 同一条：
 * **造好但没接线不报错**，那种东西只能从源码那一侧钉。
 */

import { readFileSync } from 'node:fs'

import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { PlatformInfo } from '../shared/contract'
import type { JumperEntry } from '../src/lib/jumper'

/**
 * `src/lib/api.ts` 在**模块初始化时**读 `location.search`（口令从页面自己的 URL 取），
 * 而 vitest 跑在 node 环境里 —— 没有 `location`，静态 import 会在第一行就炸。
 * 所以被测模块用动态 import，**在这一行之后**（同 `requestTable.test.ts:31-38`）。
 */
vi.stubGlobal('location', new URL('http://localhost:5173/'))

/**
 * 被测组件。**说明符刻意是个变量**，理由与 `requestTable.test.ts:44-47` 逐字相同：
 * `test/` 归 `tsconfig.node.json` 管，那份没有 `jsx`，静态 import 一个 `.tsx` 会报 `TS6142`。
 */
const MODULE = '../src/components/EndpointJumper'
const { EndpointJumper, JumperOptions } = (await import(MODULE)) as {
  EndpointJumper: (props: { platforms: PlatformInfo[]; selected: string | undefined; onSelect: (p: string, e: string) => void }) => ReactNode
  JumperOptions: (props: { matched: readonly JumperEntry[] }) => ReactNode
}

/**
 * 判定那一半。**这条可以写成真 import** —— `lib/jumper.ts` 是 `.ts` 没有 JSX，
 * 所以类型是真的、不用手抄一份（同 `requestTable.test.ts:57` 对 `lib/api` 那条）。
 * 它也不碰 `location`，动态与静态都行；跟着上面那条一起动态，位置上更一致。
 */
const { flattenEndpoints, isMacLike, matchEndpoints, shortcutHint } = await import('../src/lib/jumper')

/**
 * 一个端点。`stored` 摆出来是因为候选行上真的显示它（「3 份」/「未录」）；
 * `schema` / `seeds` 给的是空壳 —— 跳转器一个字段都不读，它只认名字、说明与样本数。
 */
const endpoint = (name: string, summary: string, stored = 0): PlatformInfo['endpoints'][number] => ({
  name,
  summary,
  stored,
  unseeded: [],
  combinations: 1,
  source: `src/${name}.ts`,
  schema: {},
  seeds: {}
})

/** 三个平台、五个端点。**`videoInfo` 刻意在两个平台里都有** —— 重名是这个界面必须分得清的那件事 */
const PLATFORMS: PlatformInfo[] = [
  {
    platform: 'bilibili',
    hasCookie: true,
    endpoints: [endpoint('videoInfo', '视频基本信息', 3), endpoint('userInfo', '用户资料'), endpoint('emojiList', '表情包列表', 1)]
  },
  { platform: 'douyin', hasCookie: false, endpoints: [endpoint('videoInfo', '抖音视频信息', 2)] },
  { platform: 'kuaishou', hasCookie: true, endpoints: [endpoint('videoInfo', '快手视频信息')] }
]

const ALL = flattenEndpoints(PLATFORMS)

/** 摘出 key，断言里比数组比字符串省事 */
const keysOf = (entries: readonly JumperEntry[]): string[] => entries.map((entry) => entry.key)

/** 渲候选列表，回静态 HTML */
const renderOptions = (matched: readonly JumperEntry[]): string => renderToStaticMarkup(createElement(JumperOptions, { matched }))

/** 渲整个跳转器（收起态 —— 它没有别的可渲的状态，见文件头） */
const renderJumper = (selected?: string): string =>
  renderToStaticMarkup(createElement(EndpointJumper, { platforms: PLATFORMS, selected, onSelect: () => undefined }))

/** 隐藏原生 `<select>` 里那些 option 的 value —— `ListBox` 真的收到了哪几条 */
const collectionOf = (html: string): string[] =>
  [...html.matchAll(/<option value="([^"]+)"/g)].map((hit) => hit[1]!).filter((value) => value !== '')

/**
 * 源码去掉注释之后的那一份。
 *
 * **否定断言只能落在这上面。** 这两个文件的注释里正当地写着 `Autocomplete`、`useUrlParam`、
 * `useKeyPress('k')` 这些词 —— 它们恰恰在解释「为什么不这么写 / 为什么另开一个控件」，
 * 而拿满源码写 `not.toContain('Autocomplete')` 会把那段解释本身当成一条违规。
 * 同一个坑 `requestTable.test.ts:224` 也记过（那边的写法是「只量渲出来的 HTML，不量源码」）。
 */
const codeOf = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** 三个被读源码的文件，各留一份原文与一份去注释的 */
const read = (name: string): { source: string; code: string } => {
  const source = readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8')
  return { source, code: codeOf(source) }
}

const JUMPER = read('components/EndpointJumper.tsx')
const APP = read('App.tsx')
const LIST = read('components/EndpointList.tsx')

describe('摊平：平台名跟着每一条走', () => {
  it('`平台/端点` 就是 key，与 `?endpoint=` 里那个串同一个格式', () => {
    expect(keysOf(ALL)).toEqual([
      'bilibili/videoInfo',
      'bilibili/userInfo',
      'bilibili/emojiList',
      'douyin/videoInfo',
      'kuaishou/videoInfo'
    ])
  })

  it('**重名的端点是三条不同的候选** —— 只留端点名的话这三个会缩成一个，人分不出跳去哪儿', () => {
    const sameName = ALL.filter((entry) => entry.name === 'videoInfo')
    expect(sameName).toHaveLength(3)
    expect(new Set(keysOf(sameName)).size).toBe(3)
    // 每条都带得出自己的平台与说明 —— 那正是分辨它们的那两样信息
    expect(sameName.map((entry) => entry.platform)).toEqual(['bilibili', 'douyin', 'kuaishou'])
    expect(new Set(sameName.map((entry) => entry.summary)).size).toBe(3)
  })

  it('样本数原样带过来 —— 候选行上要显示「几份 / 未录」', () => {
    expect(ALL.find((entry) => entry.key === 'bilibili/videoInfo')?.stored).toBe(3)
    expect(ALL.find((entry) => entry.key === 'bilibili/userInfo')?.stored).toBe(0)
  })
})

describe('过滤：搜一个词，只剩该剩的', () => {
  it('端点名的一段子串就够', () => {
    expect(keysOf(matchEndpoints(ALL, 'emoji'))).toEqual(['bilibili/emojiList'])
  })

  it('大小写不敏感 —— 人不会为了搜一个端点去按 shift', () => {
    expect(keysOf(matchEndpoints(ALL, 'EMOJILIST'))).toEqual(['bilibili/emojiList'])
    expect(keysOf(matchEndpoints(ALL, 'UserInfo'))).toEqual(['bilibili/userInfo'])
  })

  it('平台名也能搜，于是「这个平台有哪些」问得出来', () => {
    expect(keysOf(matchEndpoints(ALL, 'douyin'))).toEqual(['douyin/videoInfo'])
    expect(keysOf(matchEndpoints(ALL, 'bilibili'))).toHaveLength(3)
  })

  it('**空格分词、每个词都要命中** —— 凭记忆敲「平台 端点」是跳转器上最自然的打法', () => {
    expect(keysOf(matchEndpoints(ALL, 'kuaishou video'))).toEqual(['kuaishou/videoInfo'])
    // 反过来敲也一样：词之间没有顺序
    expect(keysOf(matchEndpoints(ALL, 'video kuaishou'))).toEqual(['kuaishou/videoInfo'])
    // 而整串子串匹配会在这里给出空结果 —— 这条用例防的就是有人把它改回 `includes(query)`
    expect(`${'kuaishou/videoInfo'} 快手视频信息`.toLowerCase().includes('video kuaishou')).toBe(false)
  })

  it('中文说明也在搜索范围里 —— 记得住「表情」记不住 `emojiList` 是常态', () => {
    expect(keysOf(matchEndpoints(ALL, '表情'))).toEqual(['bilibili/emojiList'])
    expect(keysOf(matchEndpoints(ALL, '快手'))).toEqual(['kuaishou/videoInfo'])
  })

  it('**空查询回全部** —— 刚按下 `⌘K` 时该看到完整清单，不是一张空列表', () => {
    expect(matchEndpoints(ALL, '')).toHaveLength(ALL.length)
    // 只敲了空格也算空（分词后一个词都不剩）
    expect(matchEndpoints(ALL, '   ')).toHaveLength(ALL.length)
  })

  it('**回的是新数组，不是原数组** —— 上游那份是 `useMemo` 的缓存，被就地排序会脏掉', () => {
    expect(matchEndpoints(ALL, '')).not.toBe(ALL)
  })

  it('搜不到就是空数组，不是兜底成全部（那会把「没有」说成「都行」）', () => {
    expect(matchEndpoints(ALL, '这个端点不存在')).toEqual([])
  })
})

describe('候选列表渲出来的是过滤后那几行', () => {
  it('**搜一个词，DOM 里只剩该剩的那一行** —— 另外四条一个都不在', () => {
    const html = renderOptions(matchEndpoints(ALL, 'emoji'))
    expect(html).toContain('emojiList')
    expect(html).toContain('表情包列表')
    for (const gone of ['userInfo', 'videoInfo', '抖音视频信息', '快手视频信息']) expect(html).not.toContain(gone)
  })

  it('重名的三条同时在时，每一行都带得出自己的平台前缀', () => {
    const html = renderOptions(matchEndpoints(ALL, 'videoinfo'))
    for (const platform of ['bilibili/', 'douyin/', 'kuaishou/']) expect(html).toContain(platform)
    // 三行是三个不同的 key（RAC 把 `ListBox.Item` 的 id 放进 `data-key`）
    expect([...html.matchAll(/data-key="([^"]+)"/g)].map((hit) => hit[1]!)).toEqual([
      'bilibili/videoInfo',
      'douyin/videoInfo',
      'kuaishou/videoInfo'
    ])
  })

  it('样本数那一格：录过的报数、没录过的写「未录」而不是留白或者 0', () => {
    const html = renderOptions(ALL)
    expect(html).toContain('3 份')
    expect(html).toContain('未录')
    expect(html).not.toContain('0 份')
  })

  it('**零命中时那句话真的渲出来**（RAC 的 `renderEmptyState` 触发了），而不是一张空列表', () => {
    const html = renderOptions([])
    expect(html).toContain('没有匹配的端点')
    // 空态是 RAC 自己那条路，`data-empty` 是它的标记
    expect(html).toContain('data-empty="true"')
    // 空态不是错误态：一个「错误 / 失败 / 出错」都不许出现
    for (const word of ['错误', '失败', '出错', 'undefined', 'NaN']) expect(html).not.toContain(word)
  })

  it('无障碍：列表自己有名字，选择模式是单选', () => {
    const html = renderOptions(ALL)
    expect(html).toContain('aria-label="端点候选"')
    expect(html).toContain('role="listbox"')
  })

  it('**对比数字是 `tabular-nums`、截断的 flex 子项有 `min-w-0`、省略号是真的那一个**（Web Interface Guidelines）', () => {
    const html = renderOptions(ALL)
    expect(html).toContain('tabular-nums')
    expect(html).toContain('min-w-0')
    expect(html).toContain('truncate')
    expect(html).not.toContain('...')
  })
})

describe('收起来那颗按钮：⌘K 提示与无障碍连线', () => {
  it('**没选东西时显示占位文案**，而不是一颗空按钮', () => {
    const html = renderJumper(undefined)
    expect(html).toContain('跳转端点…')
    expect(html).toContain('data-placeholder="true"')
    // 占位文案里的省略号是真的那一个
    expect(html).not.toContain('...')
  })

  it('选中之后按钮上显示的是 `平台/端点`，**不带那句说明** —— 按钮只有 14rem 宽', () => {
    const shown = /data-slot="autocomplete-value"[^>]*>([^<]*)</.exec(renderJumper('bilibili/videoInfo'))?.[1]
    expect(shown).toBe('bilibili/videoInfo')
    expect(shown).not.toContain('视频基本信息')
  })

  it('**图标按钮有名字**，而且它说的是这颗按钮干什么（Web Interface Guidelines）', () => {
    expect(renderJumper()).toContain('aria-label="跳转到端点"')
  })

  it('`role` 语义对：它是个开合 listbox 的按钮，收起态 `aria-expanded="false"`', () => {
    const html = renderJumper()
    expect(html).toContain('aria-haspopup="listbox"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('role="group"')
  })

  it('**集合真的接上了**：隐藏原生 `<select>` 里那几个 option 就是全部 5 个端点', () => {
    // RAC 的 Select 会渲一个 `hidden-select-container`（表单集成用），里面每条 option
    // 对应 `ListBox` 真收到的一条 —— 弹层渲不出来时这是「候选接对了」唯一的证据
    expect(collectionOf(renderJumper())).toEqual(keysOf(ALL))
  })
})

describe('键帽文案跟着平台走', () => {
  it('纯函数两条分支：Mac 是 `⌘K`，其它平台是 `Ctrl K`', () => {
    expect(shortcutHint(true)).toBe('⌘K')
    expect(shortcutHint(false)).toBe('Ctrl K')
  })

  it('**Windows 上不许印 `⌘`** —— 那是指着一个不存在的键说话', () => {
    expect(shortcutHint(false)).not.toContain('⌘')
    // 而 `Ctrl` 与 `K` 是两个键，中间那个空格是有意的
    expect(shortcutHint(false)).toBe('Ctrl K')
  })

  it('平台判定：Mac 与三种 iOS 设备算 Mac 系（外接键盘上也是 `⌘`），Windows / Linux 不算', () => {
    for (const mac of ['MacIntel', 'macOS', 'iPhone', 'iPad', 'iPod', 'MACINTEL']) expect(isMacLike(mac)).toBe(true)
    for (const other of ['Win32', 'Windows', 'Linux x86_64', 'Android']) expect(isMacLike(other)).toBe(false)
  })

  it('**拿不到平台串时按非 Mac 算** —— 猜错的话 `Ctrl K` 是那个不会指向不存在的键的方向', () => {
    expect(isMacLike(undefined)).toBe(false)
    expect(isMacLike('')).toBe(false)
  })

  it('渲出来的键帽两条都对：stub 成 Mac 得 `⌘K`，stub 成 Windows 得 `Ctrl K`', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel' })
    const mac = renderJumper()
    expect(/<kbd[\s\S]*?<\/kbd>/.exec(mac)?.[0]).toContain('⌘K')
    expect(mac).not.toContain('Ctrl K')

    vi.stubGlobal('navigator', { platform: 'Win32' })
    const win = renderJumper()
    expect(/<kbd[\s\S]*?<\/kbd>/.exec(win)?.[0]).toContain('Ctrl K')
    expect(win).not.toContain('⌘K')
  })

  it('**优先读 `userAgentData.platform`**（`navigator.platform` 已废弃），回落到旧字段', () => {
    vi.stubGlobal('navigator', { userAgentData: { platform: 'macOS' }, platform: 'Win32' })
    expect(renderJumper()).toContain('⌘K')
    vi.stubGlobal('navigator', { userAgentData: undefined, platform: 'MacIntel' })
    expect(renderJumper()).toContain('⌘K')
  })

  it('键帽对读屏是噪音，所以 `aria-hidden` —— 那颗按钮的名字由 `aria-label` 说', () => {
    const kbd = /<kbd[^>]*>/.exec(renderJumper())?.[0]
    expect(kbd).toContain('aria-hidden="true"')
  })
})

describe('键位判据：`event.key` 谓词，不是 ahooks 的别名表', () => {
  const code = JUMPER.code

  it('**判据是谓词函数、读 `event.key`** —— 这条防的是有人图省事改成 `useKeyPress(\'k\')`', () => {
    // 那张 `aliasKeyCodeMap` 里的键名要经 `keyCode` 查表，写字符串会**静默失效**
    // （不报错、不红，只是按下去没反应），所以判据只能是 `event.key`
    expect(code).toMatch(/useKeyPress\(\s*\(event\)\s*=>/)
    expect(code).toContain("event.key.toLowerCase() === 'k'")
  })

  it('**别名表那两种写法一个都不许出现**（`\'k\'` 静默失效、`\'meta.k\'` 按物理键位匹配）', () => {
    expect(code).not.toMatch(/useKeyPress\(\s*['"]/)
    for (const alias of ['meta.k', 'ctrl.k', 'openbracket']) expect(code).not.toContain(alias)
  })

  it('`⌘K` 与 `Ctrl+K` **两个都收**：Mac 是 `metaKey`，Windows / Linux 的惯例是 `Ctrl`', () => {
    expect(code).toMatch(/event\.metaKey \|\| event\.ctrlKey/)
  })

  it('`altKey` 被排掉 —— Windows 上 AltGr 报成 `ctrlKey + altKey`，某些布局里那是要打字符的', () => {
    expect(code).toContain('!event.altKey')
  })

  it('**`preventDefault()` 必须有** —— `⌘K`/`Ctrl+K` 被浏览器自己占着（跳地址栏搜索）', () => {
    expect(code).toContain('event.preventDefault()')
  })

  it('**刻意没有「焦点在输入框里就不触发」那道守卫** —— 与 `[` 那条的关键差别', () => {
    // `[` 是单键，在输入框里按它必须落进文本（`App.tsx` 里那条有 `tagName` 判断）；
    // `⌘K` 带修饰键，在输入框里按它照样要开 —— 那是所有编辑器的惯例，而且「正在填参数、
    // 想跳去另一个端点」恰恰是这个快捷键最有用的时刻。这条用例防的是有人「照抄上面那条」
    expect(code).not.toContain('tagName')
    expect(code).not.toContain('isContentEditable')
    // 而 `App.tsx` 里那条守卫仍然在（两条判据不同，不是同一段代码复制的）
    expect(APP.code).toContain("target.tagName === 'INPUT'")
  })

  it('打开时把查询清空 —— 下一次 `⌘K` 该是干净的一张纸', () => {
    expect(code).toMatch(/setQuery\(''\)[\s\S]{0,40}setIsOpen\(true\)/)
  })

  it('**`onOpenChange` 接上了** —— 只给受控的 `isOpen` 不给它，`Escape` 与点外面就都关不掉', () => {
    expect(code).toContain('onOpenChange')
    expect(code).toMatch(/isOpen=\{isOpen\}/)
  })
})

describe('选中之后走的是现有那条状态线', () => {
  it('**跳转器真的挂进了 `App.tsx`** —— 造好但没挂载不报错（同 `comparePanel.test.ts` 最后那组）', () => {
    expect(APP.code).toContain('<EndpointJumper')
    expect(APP.code).toContain("import { EndpointJumper } from './components/EndpointJumper'")
  })

  it('**没有新造一套状态**：它与左栏共用 `useUrlParam(\'endpoint\')` 那一个 `setSelected`', () => {
    // 两处 `onSelect` 都落在同一个 setter 上 —— 一个给左栏、一个给跳转器
    expect([...APP.code.matchAll(/onSelect=\{\(p, e\) => setSelected\(`\$\{p\}\/\$\{e\}`\)\}/g)]).toHaveLength(2)
    // 而这个组件自己不碰 URL，也不存第二份选中态（否定断言落在**去注释**那份上 —— 见 `codeOf`）
    expect(JUMPER.code).not.toContain('useUrlParam')
    expect(JUMPER.code).not.toContain('history.')
    expect(JUMPER.code).not.toContain('window.location')
  })

  it('`selected` 是传进来的，跳转器只把它显示出来 —— 它不是真相的来源', () => {
    expect(JUMPER.code).toContain('value={selected ?? null}')
  })

  it('**key 拆回平台与端点两段再交出去**，与左栏那处同一个格式', () => {
    expect(JUMPER.code).toMatch(/String\(key\)\.split\('\/'\)/)
    expect(JUMPER.code).toMatch(/onSelect\(platform, endpoint\)/)
  })
})

describe('左栏刻意没有被顶掉，而理由写在代码里', () => {
  it('左栏那两段还在：`SearchField` 与 `ListBox` 一个都没动', () => {
    expect(LIST.code).toContain('<SearchField')
    expect(LIST.code).toContain('<ListBox')
    // 而它没有变成一个 Autocomplete。**落在去注释那份上** —— 文件头正当地在解释为什么不换，
    // 拿满源码量会把那段解释本身判成违规（见 `codeOf`）
    expect(LIST.code).not.toContain('Autocomplete')
  })

  it('**那个判断的理由留在文件头** —— PRD 5.4 点着这两段说「一个控件顶掉两段」，这里说清为什么不', () => {
    expect(LIST.source).toContain('常驻可浏览的树')
    expect(LIST.source).toContain('EndpointJumper.tsx')
  })

  it('左栏保留的那三样信息确实是 `Autocomplete` 装不下的：分组、覆盖率、缺参数标签', () => {
    expect(LIST.code).toContain('<Disclosure')
    expect(LIST.code).toMatch(/\{recorded\}\/\{platform\.endpoints\.length\}/)
    expect(LIST.code).toContain('缺少参数')
  })
})
