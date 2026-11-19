import { Tabs } from '@heroui/react'
import { lazy, Suspense, useState, type ReactNode } from 'react'

import { WORKBENCH_TABS, WORKBENCH_TAB_BAR, WORKBENCH_TAB_PANEL } from '../lib/workbenchStyles'

const GeneratedPanel = lazy(() => import('./GeneratedPanel').then((module) => ({ default: module.GeneratedPanel })))

export function WorkbenchInspector({
  platform,
  endpoint,
  revision,
  generated,
  children
}: {
  platform: string
  endpoint: string
  revision: number
  generated: boolean
  children: ReactNode
}) {
  const [selection, setSelection] = useState({ key: generated ? 'types' : 'review', revision })
  const tab = generated && selection.revision !== revision ? 'types' : selection.key
  return (
    <Tabs
      selectedKey={tab}
      onSelectionChange={(key) => setSelection({ key: String(key), revision })}
      variant="secondary"
      className={`wb-inspector-tabs wb-tabs h-full ${WORKBENCH_TABS}`}
    >
      <Tabs.ListContainer className={WORKBENCH_TAB_BAR}>
        <Tabs.List aria-label="保存与类型结果">
          <Tabs.Tab id="review" className="w-auto shrink-0 whitespace-nowrap">
            保存与生成
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="types" className="w-auto shrink-0 whitespace-nowrap">
            类型结果
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
      <Tabs.Panel id="review" className={WORKBENCH_TAB_PANEL}>
        {children}
      </Tabs.Panel>
      <Tabs.Panel id="types" className={WORKBENCH_TAB_PANEL}>
        <Suspense fallback={<p className="text-muted text-sm">正在读取已生成的类型…</p>}>
          <GeneratedPanel platform={platform} endpoint={endpoint} revision={revision} />
        </Suspense>
      </Tabs.Panel>
    </Tabs>
  )
}
