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
 * 3. **覆盖率是一条真的 `Meter`，而它刻意在分组头之外。** PRD 5.4 指着分组头上那个
 *    `已录/总数` 说「该换成 `Meter`」—— 换不了，理由是那个数字住在 `Disclosure` 的 trigger
 *    `<Button>` 里：`Meter` 的根是个 `div`（`@heroui/react` 的 `MeterRoot` → RAC `Meter`），
 *    而 `<button>` 的内容模型只收 phrasing content；更要紧的是 `role="button"` 在 ARIA 里是
 *    **Children Presentational: True**，塞进去的 `role="meter progressbar"` 会连着
 *    `aria-valuenow` 一起从无障碍树上被抹掉 —— 换过去只剩一根装饰条。
 *    所以分组头那个数字**原样保留**（信息一点没少），而 PRD 真正要的那个
 *    「端点覆盖率 N/61」在搜索框下面用一条真的 `Meter` 说，它不在任何按钮里。
 */

import { Badge, Button, Chip, Disclosure, Kbd, Label, ListBox, Meter, SearchField, Skeleton, Tooltip } from '@heroui/react'
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

  /**
   * 整栏的端点覆盖率 —— PRD 5.4 那条 `Meter` 的「N/61」。
   *
   * **两个数都从 `platforms` 数，不从 `filtered` 数。** 「61 个端点里录了几个」这个问题
   * 与搜索框无关，跟着过滤一起走的话，边打字边看着分母从 61 掉到 1，这个数就什么都不说明了
   * （而覆盖率恰恰是那种「搜着某个端点时顺眼一瞥」的信息）。
   *
   * `stored > 0` 与分组头那个 `recorded` 是同一个判据 —— 「录过至少一份样本」。
   */
  const coverage = useMemo(() => {
    const endpoints = platforms.flatMap((platform) => platform.endpoints)
    return { recorded: endpoints.filter((endpoint) => endpoint.stored > 0).length, total: endpoints.length }
  }, [platforms])

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

      {/* 端点覆盖率。**`total === 0` 时整条不渲** —— 首屏还没拿到清单时它会是「0/61」里
          连分母都没有的「0/0」，而一条空着的进度条加一个 0/0 是在说「一个端点都没有」，
          那是假话（清单还在路上，下面那句 `aria-live` 才是当时该说的话）。

          `aria-label` 把两个数都念出来，不是只念百分比：读屏默认给 `role="meter"` 念的是
          `aria-valuetext`，而 react-aria 那个默认值是 `formatOptions: {style:'percent'}` 格出来的
          「20%」（`react-aria/dist/private/progress/useProgressBar.mjs`）—— 「20%」对着一个
          要去补样本的人没有可操作性，「已录 12 个端点，共 61 个」才有。所以两处都写：
          `valueLabel` 把 `aria-valuetext` 换成「12/61」，`aria-label` 说清这 12 和 61 是什么。

          `data-slot="label"` 是有意写在一个素 `<span>` 上而不是用 `<Label>`：`.meter` 的栅格
          按这个属性给「label / output」两格排版（`@heroui/styles/dist/components/meter.css`），
          而 RAC 的 `Meter` 在拿到 `aria-label` 之后走的是 `useSlot(false)` 那条路
          —— 再挂一个真的 `<Label>` 只会多一份没人指向的 id。 */}
      {coverage.total > 0 && (
        <Meter
          size="sm"
          value={coverage.recorded}
          maxValue={coverage.total}
          valueLabel={`${coverage.recorded}/${coverage.total}`}
          aria-label={`端点覆盖率：已录 ${coverage.recorded} 个端点，共 ${coverage.total} 个`}
        >
          <span data-slot="label" className="text-muted text-xs font-normal">
            端点覆盖率
          </span>
          <Meter.Output className="text-muted text-xs font-normal tabular-nums" />
          <Meter.Track>
            <Meter.Fill />
          </Meter.Track>
        </Meter>
      )}

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
                        {/* 名字上那个角标 = **`combinations`，参数矩阵能展开出多少组**，
                            也就是「一键补样本」会连发几次（`App.tsx` 那颗按钮上印的是同一个数）。
                            **它不是请求集合里的条数。** 集合那个数住在 `RequestsResult`
                            （`GET /api/requests?platform=&endpoint=`，一个端点一趟），而
                            `GET /api/endpoints` 至今**不回** `requests` 计数（`EndpointInfo` 只有
                            `stored` / `combinations` / `unseeded`）—— 左栏一次铺 61 行，
                            为了一个角标发 61 个请求换不来这点信息。也不是右边那个 Chip 里的
                            `stored`（本地已入库几份），两个数意思不同，所以角标带了单位。

                            **`combinations === 0` 时不渲。** 那与 `unseeded.length > 0` 是同一件事
                            （`typegen/src/matrix.ts` 里必填参数没取值就直接回空清单，
                            没有轴时回的是 `[{}]` 也就是 1），而那一行左边已经挂着「缺少参数」
                            把原因说清了 —— 再挂一个「0」只是把同一句话用更弱的方式说第二遍。 */}
                        {endpoint.combinations > 0 ? (
                          <Badge.Anchor className="min-w-0 shrink">
                            {/* `pe-5` 是给角标腾的位子：`badge--sm` 是 `min-w-4` 再加标签的 `px-0.5`，
                                `top-right` 又往外挪 25%，不留这点内边距它会压在名字最后两个字符上。
                                `badge-anchor` 自己是 `shrink-0`，所以上面要把 `shrink` / `min-w-0`
                                补回来，否则名字不再截断、整行被撑开（工具类层压得过组件层） */}
                            <span className="min-w-0 truncate pe-5 font-mono text-sm">{endpoint.name}</span>
                            <Badge size="sm" variant="soft" color="accent" aria-label={`参数矩阵能展开 ${endpoint.combinations} 组`}>
                              <Badge.Label className="tabular-nums">
                                {endpoint.combinations}
                                {/* 孤零零一个数字读屏念出来没有意义。`aria-label` 在 `role=option`
                                    里靠的是「名字取自内容」那条路（选项的子孙是 presentational，
                                    但算名字时仍会读到子孙自己的 `aria-label`），而 `aria-label`
                                    挂在一个无 role 的 `<span>` 上并不是所有实现都认 ——
                                    所以再垫一层真的文本兜底：认 `aria-label` 就念前者，
                                    不认就念「4 组参数」，两条路都不会只念出一个「4」 */}
                                <span className="sr-only"> 组参数</span>
                              </Badge.Label>
                            </Badge>
                          </Badge.Anchor>
                        ) : (
                          <span className="truncate font-mono text-sm">{endpoint.name}</span>
                        )}
                        <span className="flex shrink-0 items-center gap-1.5">
                          {endpoint.unseeded.length > 0 && (
                            <Tooltip delay={200}>
                              {/* 「缺少参数」而不是「缺种子」：这个标签说的是「必填参数没有可用取值」，
                                  而「种子」是那个取值今天存在哪里（`corpus/seeds.json`）—— 实现细节。
                                  契约里的字段名仍叫 `unseeded`，那是实现层的名字，改它会波及
                                  `shared/contract.ts`、`server/endpoints.ts` 与 `packages/typegen` */}
                              <span className="text-warning-soft-foreground text-xs">缺少参数</span>
                              <Tooltip.Content>
                                <p>
                                  {endpoint.unseeded.join(' / ')} 是必填的不透明 ID，编不出合法值 —— 在 corpus/seeds.json 里给它一个真实取值
                                </p>
                              </Tooltip.Content>
                            </Tooltip>
                          )}
                          {/* 独立的计数标签用 Chip 而不是 Badge —— Badge 是要配
                              `Badge.Anchor` 定位在另一个元素上的，文档明确说独立用途走 Chip */}
                          {endpoint.stored > 0 ? (
                            <Chip size="sm" variant="soft">
                              <Chip.Label className="tabular-nums">{endpoint.stored}</Chip.Label>
                            </Chip>
                          ) : (
                            <span className="text-muted text-xs">未录</span>
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

      <p className="text-muted mt-2 text-xs">
        收起左栏：
        <Kbd>
          <Kbd.Content>[</Kbd.Content>
        </Kbd>
      </p>
    </div>
  )
}
