/**
 * `⌘K` 端点跳转器 —— 61 个端点里的临时模糊查找。
 *
 * 四条设计决定：
 *
 * 1. **用 `Autocomplete` 而不是 `ComboBox`。** v3 的 `Autocomplete` 是
 *    **`Select` + 弹层里一个 `SearchField` + 一个 `ListBox`**（源码里根就是
 *    `react-aria-components/Select`，`Autocomplete.Filter` 才是 RAC 的 Autocomplete 原语）——
 *    而 `Select` / `ListBox` / `SearchField` / `Popover` 这四样这个包**已经在用了**
 *    （`ComparePanel`、`ParamForm`、`EndpointList`），所以它的边际体积基本只有一层壳。
 *    `ComboBox` 是「输入框本身就在版面上」那个形态，要另拉一整套 `useComboBox` 状态机进来，
 *    而这里不需要那个形态：跳转器平时是收着的一颗按钮，展开才有输入框。
 *    体积这条在这个仓库是硬约束（`release.yml` 那道棘轮），所以「哪个更省」不是次要理由。
 *
 * 2. **左栏那两段（`SearchField` + `ListBox`）刻意保留，不被这个控件顶掉。**
 *    PRD 5.4 那张表写的是「一个控件顶掉两段」—— 那是设想，而落到这个界面上两件事不同：
 *    左栏是**常驻可浏览的树**（按平台分组、每组一个可折叠 `Disclosure`、组头带
 *    `已录/总数` 覆盖率、每行带「缺少参数」提示与样本计数），而 `Autocomplete` 的弹层是
 *    **一次性的扁平候选列表**，装不下分组与那两个标签，也不该常驻。
 *    真换过去会丢掉三样今天在用的信息，换回来的只有「少一个组件」——
 *    所以这里只**新增**跳转器，`EndpointList.tsx` 一行不动。
 *
 * 3. **`⌘K` 的守卫与 `[` 那条刻意不同。** 判据同样是 `event.key` 谓词而不是 ahooks
 *    的别名表（理由在 `App.tsx:287-297`，那条注释讲的是 `'['` 会静默失效、
 *    `'openbracket'` 又按物理键位匹配），但**「焦点在输入框里就不触发」那半段不能照抄**：
 *    `[` 是单键，在输入框里按它必须让它落进文本；`⌘K` 带修饰键，**在输入框里按它照样要开**
 *    —— 那是所有编辑器的惯例，而且参数表单里正在填 `aweme_id` 时想跳去另一个端点
 *    恰恰是这个快捷键最有用的时刻。所以这里没有 `tagName` 那道判断，只有 `preventDefault()`。
 *
 * 4. **`Escape` 不用自己绑。** `isOpen` 是受控的，RAC 的 `Popover` 收到 `Escape`
 *    会调 `onOpenChange(false)` —— 所以那个回调必须接上（只给 `isOpen` 不给它，
 *    弹层就关不掉了，Escape 与点外面都失效）。
 *
 * **渲不出来的那部分**：弹层内容在 `Popover` 里，关着时不在 DOM 里、开着时走 portal，
 * 而 `renderToStaticMarkup` 不渲 portal（同 `comparePanel.test.ts:25` 记的那条）。
 * 所以「真按一下 `⌘K`、真在输入框里打字、真按上下键选」这些都测不到 ——
 * 过滤与文案的判据因此抽进了 `lib/jumper.ts`（纯函数，node 里直接调），
 * 而候选列表拎成了 `JumperOptions` 单独一层 —— 弹层里那段 JSX 只是把它们摆出来。
 * 缺口写在 `test/endpointJumper.test.ts` 文件头。
 */

import { Autocomplete, EmptyState, Kbd, ListBox, SearchField } from '@heroui/react'
import { useKeyPress } from 'ahooks'
import { useMemo, useState } from 'react'

import type { PlatformInfo } from '../lib/api'
/**
 * 判定那一半在 `lib/jumper.ts`。**分开是必须的，两条理由**：
 * 弹层渲不出来（见文件头最后一段），过滤只有作为纯函数才量得到；
 * 而一个文件里既导出组件又导出普通函数会让 Fast Refresh 整文件降级成整页刷新
 * （oxlint 的 `react(only-export-components)`）。同 `lib/theme.ts` / `ThemeSwitch.tsx` 那一对。
 */
import { currentPlatform, flattenEndpoints, isMacLike, type JumperEntry, matchEndpoints, shortcutHint } from '../lib/jumper'

/**
 * 候选列表本身 —— **单独一层，因为这是唯一渲得出来的那一层**。
 *
 * 弹层在 `Popover` 里（关着不在 DOM、开着走 portal，`renderToStaticMarkup` 都渲不到），
 * 所以「搜一个词，只剩该剩的几行」这件事只有把这一层拎出来才量得到真 DOM。
 * 它是纯的：给它一串候选，它就渲那一串 —— 过滤在 `lib/jumper.ts` 的 `matchEndpoints` 里。
 */
export const JumperOptions = ({ matched }: { matched: readonly JumperEntry[] }) => (
  <ListBox
    aria-label="端点候选"
    selectionMode="single"
    renderEmptyState={() => <EmptyState>没有匹配的端点 —— 换个词，或者清空看全部端点</EmptyState>}
  >
    {matched.map((entry) => (
      /* `textValue` **只放 `平台/端点`**：它同时是收起来那颗按钮上显示的文本
         （RAC 的 `selectedText`）与隐藏原生 `<select>` 里那个 option 的 label，
         把 `summary` 也拼进去的话按钮上会挤成「bilibili/videoInfo 视频信息」再被截断，
         而按钮只有 14rem 宽。说明文字在下面那行里，一个字都没少 */
      <ListBox.Item key={entry.key} id={entry.key} textValue={`${entry.platform}/${entry.name}`}>
        <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <span className="flex min-w-0 flex-col">
            {/* 平台名灰一档、端点名正常：跳转器是跨平台的扁平列表，而端点名会重名
                （`videoInfo` 在 bilibili 与 douyin 各有一个）—— 前缀必须在，但它不是人在找的那个词 */}
            <span className="min-w-0 truncate font-mono text-sm">
              <span className="text-muted">{entry.platform}/</span>
              {entry.name}
            </span>
            <span className="text-muted min-w-0 truncate text-xs">{entry.summary}</span>
          </span>
          {/* 样本数跟着候选一起显示：「跳去哪个端点」这个决定里，有没有录过是最常用的那条线索 */}
          <span className="text-muted shrink-0 text-xs tabular-nums">{entry.stored > 0 ? `${entry.stored} 份` : '未录'}</span>
        </span>
        <ListBox.ItemIndicator />
      </ListBox.Item>
    ))}
  </ListBox>
)

export interface EndpointJumperProps {
  platforms: PlatformInfo[]
  /** 当前选中的 `平台/端点`。与左栏共用同一个值 —— 它由 `App.tsx` 的 `useUrlParam('endpoint')` 管 */
  selected: string | undefined
  onSelect: (platform: string, endpoint: string) => void
}

export const EndpointJumper = ({ platforms, selected, onSelect }: EndpointJumperProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const entries = useMemo(() => flattenEndpoints(platforms), [platforms])
  const matched = useMemo(() => matchEndpoints(entries, query), [entries, query])
  const hint = shortcutHint(isMacLike(currentPlatform()))

  /**
   * `⌘K` / `Ctrl+K` 打开跳转器。
   *
   * 判据是 `event.key` 谓词，理由与 `App.tsx:287-297` 那条逐字相同（ahooks 的别名表要经
   * `aliasKeyCodeMap` 查 `keyCode`，写字符会静默失效、写别名又按物理键位匹配）。
   * 谓词形式下 `exactMatch` 被忽略，所以修饰键自己判。
   *
   * 三处细节：
   * - `toLowerCase()`：按住 Caps Lock 时 `event.key` 是 `'K'`。
   * - `!altKey`：Windows 上 AltGr 报成 `ctrlKey + altKey`，某些布局里 AltGr+K 是要打出字符的。
   * - `preventDefault()` **必须有**：`⌘K`/`Ctrl+K` 被浏览器自己占着（Firefox / Chrome 都是
   *   跳到地址栏搜索），不拦住的话弹层开了而焦点被浏览器抢走。
   *
   * **没有「焦点在输入框里就不触发」那道守卫，那是刻意的** —— 见文件头第 3 条。
   */
  useKeyPress(
    (event) => event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey) && !event.altKey,
    (event) => {
      event.preventDefault()
      setQuery('')
      setIsOpen(true)
    }
  )

  return (
    <Autocomplete
      aria-label="跳转到端点"
      className="w-56"
      isOpen={isOpen}
      selectionMode="single"
      placeholder="跳转端点…"
      /* 零命中时弹层要留着，好把下面那句「没有匹配的端点」说出来。默认 false 会直接关掉它 */
      allowsEmptyCollection
      value={selected ?? null}
      onOpenChange={(open) => {
        setIsOpen(open)
        // 关掉就把查询清空：下一次 `⌘K` 该是干净的一张纸，而不是上一次搜到一半的词
        if (!open) setQuery('')
      }}
      onChange={(key) => {
        if (key === null) return
        const [platform, endpoint] = String(key).split('/')
        if (platform !== undefined && endpoint !== undefined) onSelect(platform, endpoint)
      }}
    >
      <Autocomplete.Trigger>
        {/* **只放文本。** `Autocomplete.Value` 默认渲选中项那份完整 children，会把选项行
            末尾那个勾一起搬进按钮里（它是 `absolute end-2`，正好压在右边箭头上）——
            与 `ComparePanel.tsx` 里那两个 `Select.Value` 同一条理由 */}
        <Autocomplete.Value className="min-w-0 truncate font-mono text-xs">
          {({ isPlaceholder, defaultChildren, selectedText }) => (isPlaceholder ? defaultChildren : selectedText)}
        </Autocomplete.Value>
        {/* 键帽提示直接印在按钮上：这是这个快捷键唯一的发现入口（左栏那句只讲 `[`）。
            `aria-hidden` —— 读屏用户听到的是上面那个 `aria-label`，把「⌘K」念出来没有帮助 */}
        <Kbd aria-hidden className="shrink-0">
          <Kbd.Content>{hint}</Kbd.Content>
        </Kbd>
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>

      <Autocomplete.Popover className="w-(--trigger-width) min-w-80">
        {/* `inputValue` / `onInputChange` 受控而**不给 `filter`**：过滤由 `lib/jumper.ts` 的
            `matchEndpoints` 自己做（那样它是纯的、可测的，也与左栏同一套判据），RAC 的 Autocomplete 原语
            这时只管它真正值钱的那两件事 —— 输入框与列表之间的键盘接力（上下键从输入框
            直接走到候选行）和 `aria-controls` / `aria-activedescendant` 那套连线 */}
        <Autocomplete.Filter inputValue={query} onInputChange={setQuery}>
          <SearchField autoFocus aria-label="按端点名或说明搜索" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="平台或端点名，空格分词…" autoComplete="off" spellCheck={false} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          {/* 找到几个要**说出来**（Web Interface Guidelines）：列表是虚焦点导航的，
              读屏用户不会自动知道候选从 61 条缩到了 2 条 */}
          <p aria-live="polite" className="text-muted px-2 py-1 text-xs tabular-nums">
            {matched.length === 0 ? '没有匹配的端点' : `找到 ${matched.length} 个端点`}
          </p>

          <JumperOptions matched={matched} />
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  )
}
