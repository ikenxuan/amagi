/**
 * 左栏：可搜索、可折叠的端点列表（4 个平台 / 61 个端点）。
 *
 * 两条设计决定：
 *
 * 1. **搜索是本地过滤。** 61 条不值得往服务端跑一趟，而且过滤要即时。
 * 1.5 **下面那个 `SearchField` + `ListBox` 刻意没有被 `Autocomplete` 顶掉。**
 *    PRD 5.4 那张表点着这两段说「一个控件顶掉两段」—— 那句是设想，落到这个界面上不成立：
 *    这一栏是**常驻可浏览的树**（按平台分成可折叠的 `Disclosure`、组头带 `已录/总数`
 *    覆盖率与 cookie 状态、每行带「缺少参数」提示与样本计数），而 `Autocomplete` 的弹层是
 *    **一次性的扁平候选列表** —— 装不下分组，也不该常驻。换过去要丢掉那三样在用的信息，
 *    换回来的只有「少一个组件」。所以 `⌘K` 那个模糊查找**另开了一个控件**
 *    （`EndpointJumper.tsx`，它才是 `Autocomplete` 的正确用法），两边共用
 *    `App.tsx` 里同一个 `useUrlParam('endpoint')`，没有第二份状态。
 * 2. **平台分组可以单独折叠，整栏也能收起。** 61 条铺开比一屏高，
 *    而人一次只关心一个平台 —— 但**折叠状态进 URL**（`?collapsed=douyin,kuaishou`），
 *    不然刷新一次就回到全展开，而这个工具的日常动作里刷新很频繁（改了 seeds、换了 cookie）。
 *    收起整栏也进 URL（`?nav=off`），于是「把左栏收起来专心看 diff」这个状态能被分享与恢复。
 * 3. **这一栏刻意只回答「选哪个端点」。** 原先它还挂着两样东西：一条「端点覆盖率 N/61」的
 *    `Meter`，与每行名字后面一枚印着 `combinations` 的 `Badge`。两样都搬走了 ——
 *    覆盖率是个看一眼就够的全局数字（而这一栏现在还要与「最近」那份清单分高度），
 *    `combinations` 只在批量录制时有用、那个数就印在那颗按钮上。一次铺 61 行的清单里，
 *    每行多一件装饰就是 61 份噪音。留下的是名字、cookie 状态、缺不缺参数、录过几份 ——
 *    四样都会改变「要不要点这一行」。
 */

import { Button, Chip, Disclosure, Label, ListBox, SearchField, Skeleton, Tooltip } from '@heroui/react'
import { useMemo, useState } from 'react'

import type { PlatformInfo } from '../lib/api'

export interface EndpointListProps {
  platforms: PlatformInfo[]
  /** 当前选中的 `平台/端点` */
  selected: string | undefined
  onSelect: (platform: string, endpoint: string) => void
  /**
   * 折叠起来的平台名。由 URL 驱动 —— `lib/urlState.ts` 的 `useUrlSet('collapsed')`
   * （那三个 hook 都是手写的：`useUrlState` 是独立包 `@ahooksjs/use-url-state`，
   * peerDeps 不含 React 19 还要 react-router，PRD 5.5 明确不引）
   */
  collapsed: readonly string[]
  onToggleCollapsed: (platform: string) => void
  /**
   * 端点清单还在路上（首屏与刷新都算）。**只用来压住那句「后端可能没起」。**
   *
   * **必须与「拉不到」分开。** 原先这里只看 `platforms.length === 0`，于是首屏那半秒
   * 一律显示「还没读到端点清单 —— 后端可能没起」——**把正在加载误报成后端挂了**，
   * 而那句话会让人去重启一个好着的进程。
   */
  isLoading: boolean
  /**
   * 首屏：**还没拿到过任何数据**，所以真的没东西可显示。骨架只在这时铺。
   *
   * 与 `isLoading` 分成两个，是因为刷新（入库后、存 cookie 后各一次 `refreshAsync()`）
   * 同样把 `loading` 置 true，而那时 `useRequest` **保留着上一份 `data`** ——
   * 拿 `isLoading` 铺骨架就是在还在的列表上方硬插四行（版面跳一下），
   * 还会把「正在读端点清单…」经 `aria-live` 再念给读屏用户一遍。
   * 判据是「有没有东西可显示」，不是「有没有请求在飞」。
   */
  isFirstLoad: boolean
}

export const EndpointList = ({
  platforms,
  selected,
  onSelect,
  collapsed,
  onToggleCollapsed,
  isLoading,
  isFirstLoad
}: EndpointListProps) => {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (needle === '') return platforms
    return platforms
      .map((platform) => ({
        ...platform,
        endpoints: platform.endpoints.filter(
          (endpoint) => endpoint.name.toLowerCase().includes(needle) || endpoint.summary.toLowerCase().includes(needle)
        )
      }))
      .filter((platform) => platform.endpoints.length > 0)
  }, [platforms, needle])

  const totalShown = filtered.reduce((sum, platform) => sum + platform.endpoints.length, 0)

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <SearchField value={query} onChange={setQuery}>
        <Label className="sr-only">搜索端点</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="搜索端点…" autoComplete="off" spellCheck={false} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      {needle !== '' && (
        <p aria-live="polite" className="text-muted text-xs">
          {totalShown === 0 ? '没有匹配的端点' : `匹配 ${totalShown} 个端点`}
        </p>
      )}

      {/* 骨架而不是 Spinner：这块最终会长成四组分组按钮，骨架先把版面占住，
          数据到了不会整栏跳一下。骨架本身对读屏没有信息，所以 `aria-hidden`，
          那句话交给下面的 `aria-live`。

          **只在首屏铺。** 刷新时列表还在（`useRequest` 不清 `data`），那时插骨架
          只是把版面往下顶四行，而 `aria-live` 会把每次刷新都念一遍。 */}
      {isFirstLoad && (
        <>
          <div aria-hidden className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-9 rounded-xl" />
            ))}
          </div>
          <p aria-live="polite" className="text-muted text-xs">
            正在读端点清单…
          </p>
        </>
      )}

      {/* **不是上面那个分支的 else。** 这句的判据是「确实空 **且** 没有请求在飞」——
          所以看 `isLoading` 而不是 `isFirstLoad`：万一刷新真拉回一个空清单，
          在那趟请求落地之前它仍然要闭嘴，不然又变成「把加载中误报成后端挂了」 */}
      {!isLoading && filtered.length === 0 && needle === '' && <p className="text-muted text-sm">还没读到端点清单 —— 后端可能没起。</p>}

      {filtered.map((platform) => {
        // 搜索时强制展开：人搜的就是想看到结果，这时还让他去点开分组是折磨
        const isOpen = needle !== '' || !collapsed.includes(platform.platform)
        const recorded = platform.endpoints.filter((endpoint) => endpoint.stored > 0).length
        return (
          <Disclosure key={platform.platform} isExpanded={isOpen} onExpandedChange={() => onToggleCollapsed(platform.platform)}>
            <Disclosure.Heading>
              <Button slot="trigger" variant="tertiary" fullWidth className="justify-between">
                <span className="flex min-w-0 items-center gap-2">
                  {/* 平台名用等宽：它是技术标识符，与下面每行的端点名同一类，而不是文章标题 */}
                  <span className="truncate font-mono font-medium">{platform.platform}</span>
                  <Chip size="sm" color={platform.hasCookie ? 'success' : 'warning'} variant="soft">
                    <Chip.Label>{platform.hasCookie ? 'cookie' : '无 cookie'}</Chip.Label>
                  </Chip>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-muted text-xs tabular-nums">
                    {recorded}/{platform.endpoints.length}
                  </span>
                  <Disclosure.Indicator />
                </span>
              </Button>
            </Disclosure.Heading>

            <Disclosure.Content>
              <Disclosure.Body className="pt-1">
                <ListBox
                  aria-label={`${platform.platform} 的端点`}
                  selectionMode="single"
                  selectedKeys={selected === undefined ? [] : [selected]}
                  onSelectionChange={(keys) => {
                    const key = [...(keys as Set<string>)][0]
                    if (key === undefined) return
                    const [name, endpoint] = key.split('/')
                    if (name !== undefined && endpoint !== undefined) onSelect(name, endpoint)
                  }}
                >
                  {platform.endpoints.map((endpoint) => (
                    <ListBox.Item
                      key={`${platform.platform}/${endpoint.name}`}
                      id={`${platform.platform}/${endpoint.name}`}
                      textValue={endpoint.name}
                    >
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        {/* 名字后面原先挂着一枚 `Badge`，印的是 `combinations`（参数矩阵能展开
                            多少组）。**那个数搬到了「批量 N 组」那颗按钮上** —— 它本来就只在
                            批量录制时有用，而这一栏一次铺 61 行，每行多一枚角标就是 61 份噪音。
                            这里只留名字与「这个端点录过几份」，那两件才是选端点时要看的。 */}
                        <span className="min-w-0 truncate font-mono text-sm">{endpoint.name}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {endpoint.unseeded.length > 0 && (
                            <Tooltip delay={200}>
                              {/* **只剩一个记号，那四个字进了 tooltip。** 这一栏宽 16rem，而端点名
                                  （`dynamicEmojiList`）本身就要一大半 —— 原先「缺少参数」加「未录」
                                  两个标签一行吃掉 90 px，于是 61 行里大半的名字被截成 `parseWo…`。
                                  而「哪个端点」是这一栏唯一要回答的问题，名字不能截。
                                  记号带 `aria-label` 与 `title`：**不是只靠颜色和形状说话**，
                                  读屏念得出、鼠标悬得到，那四个字一个都没丢。 */}
                              <span
                                aria-label="缺少参数"
                                title="缺少参数"
                                className="text-warning-soft-foreground shrink-0 text-xs leading-none"
                              >
                                ⚠
                              </span>
                              <Tooltip.Content>
                                <p>
                                  缺少参数：{endpoint.unseeded.join(' / ')} 是必填的不透明 ID，编不出合法值 —— 在 corpus/seeds.json
                                  里给它一个真实取值
                                </p>
                              </Tooltip.Content>
                            </Tooltip>
                          )}
                          {/* 独立的计数标签用 Chip 而不是 Badge —— Badge 是要配 `Badge.Anchor`
                              定位在另一个元素上的，文档明确说独立用途走 Chip。
                              **`stored === 0` 时什么都不渲**（原先那里写着「未录」）：
                              一栏 61 行里有 49 行是「未录」，那个词在这里等于给多数行加一个
                              永远一样的标签 —— 而「有没有 Chip」这件事本身已经把它说了。 */}
                          {endpoint.stored > 0 && (
                            <Chip size="sm" variant="soft">
                              <Chip.Label className="tabular-nums">{endpoint.stored}</Chip.Label>
                            </Chip>
                          )}
                        </span>
                      </span>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Disclosure.Body>
            </Disclosure.Content>
          </Disclosure>
        )
      })}
    </div>
  )
}
