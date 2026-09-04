/**
 * 左栏：可搜索、可折叠的端点列表（4 个平台 / 61 个端点）。
 *
 * 两条设计决定：
 *
 * 1. **搜索是本地过滤。** 61 条不值得往服务端跑一趟，而且过滤要即时。
 * 2. **平台分组可以单独折叠，整栏也能收起。** 61 条铺开比一屏高，
 *    而人一次只关心一个平台 —— 但**折叠状态进 URL**（`?collapsed=douyin,kuaishou`），
 *    不然刷新一次就回到全展开，而这个工具的日常动作里刷新很频繁（改了 seeds、换了 cookie）。
 *    收起整栏也进 URL（`?nav=off`），于是「把左栏收起来专心看 diff」这个状态能被分享与恢复。
 */

import { Button, Chip, Disclosure, Kbd, Label, ListBox, SearchField, Tooltip } from '@heroui/react'
import { useMemo, useState } from 'react'

import type { PlatformInfo } from '../lib/api'

export interface EndpointListProps {
  platforms: PlatformInfo[]
  /** 当前选中的 `平台/端点` */
  selected: string | undefined
  onSelect: (platform: string, endpoint: string) => void
  /** 折叠起来的平台名。由 URL 驱动（见 `App.tsx` 的 `useUrlState`） */
  collapsed: readonly string[]
  onToggleCollapsed: (platform: string) => void
}

export const EndpointList = ({ platforms, selected, onSelect, collapsed, onToggleCollapsed }: EndpointListProps) => {
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

      {filtered.length === 0 && needle === '' && <p className="text-muted text-sm">还没读到端点清单 —— 后端可能没起。</p>}

      {filtered.map((platform) => {
        // 搜索时强制展开：人搜的就是想看到结果，这时还让他去点开分组是折磨
        const isOpen = needle !== '' || !collapsed.includes(platform.platform)
        const recorded = platform.endpoints.filter((endpoint) => endpoint.stored > 0).length
        return (
          <Disclosure key={platform.platform} isExpanded={isOpen} onExpandedChange={() => onToggleCollapsed(platform.platform)}>
            <Disclosure.Heading>
              <Button slot="trigger" variant="tertiary" fullWidth className="justify-between">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{platform.platform}</span>
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
                        <span className="truncate font-mono text-sm">{endpoint.name}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {endpoint.unseeded.length > 0 && (
                            <Tooltip delay={200}>
                              <span className="text-warning-soft-foreground text-xs">缺种子</span>
                              <Tooltip.Content>
                                <p>{endpoint.unseeded.join(' / ')} 是必填的不透明 ID，没有种子就编不出合法值</p>
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
