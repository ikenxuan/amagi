/**
 * 左栏：可搜索的端点列表（4 个平台 / 61 个端点）。
 *
 * 搜索是本地过滤 —— 61 条不值得往服务端跑一趟，而且过滤要即时。
 */

import { Header, ListBox, SearchField, Label, Chip } from '@heroui/react'
import { useMemo, useState } from 'react'

import type { PlatformInfo } from '../lib/api'

export interface EndpointListProps {
  platforms: PlatformInfo[]
  /** 当前选中的 `平台/端点` */
  selected: string | undefined
  onSelect: (platform: string, endpoint: string) => void
}

export const EndpointList = ({ platforms, selected, onSelect }: EndpointListProps) => {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle === '') return platforms
    return platforms
      .map((platform) => ({
        ...platform,
        endpoints: platform.endpoints.filter(
          (endpoint) => endpoint.name.toLowerCase().includes(needle) || endpoint.summary.toLowerCase().includes(needle)
        )
      }))
      .filter((platform) => platform.endpoints.length > 0)
  }, [platforms, query])

  return (
    <div className="flex flex-col gap-3">
      <SearchField value={query} onChange={setQuery}>
        <Label className="sr-only">搜索端点</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="搜索端点…" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      <ListBox
        aria-label="端点"
        selectionMode="single"
        selectedKeys={selected === undefined ? [] : [selected]}
        onSelectionChange={(keys) => {
          const key = [...(keys as Set<string>)][0]
          if (key === undefined) return
          const [platform, endpoint] = key.split('/')
          if (platform !== undefined && endpoint !== undefined) onSelect(platform, endpoint)
        }}
      >
        {filtered.map((platform) => (
          <ListBox.Section key={platform.platform}>
            <Header className="flex items-center gap-2">
              {platform.platform}
              <Chip size="sm" color={platform.hasCookie ? 'success' : 'warning'} variant="soft">
                <Chip.Label>{platform.hasCookie ? 'cookie 已提供' : '无 cookie'}</Chip.Label>
              </Chip>
            </Header>
            {platform.endpoints.map((endpoint) => (
              <ListBox.Item
                key={`${platform.platform}/${endpoint.name}`}
                id={`${platform.platform}/${endpoint.name}`}
                textValue={endpoint.name}
              >
                <span className="font-mono text-sm">{endpoint.name}</span>
                <span className="text-muted ml-2 text-xs">
                  {endpoint.stored > 0 ? `${endpoint.stored} 份` : '未录'}
                  {endpoint.unseeded.length > 0 && ' · 缺种子'}
                </span>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox.Section>
        ))}
      </ListBox>
    </div>
  )
}
