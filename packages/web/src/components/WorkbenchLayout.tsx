import { lazy, Suspense } from 'react'

import { useWorkbenchNarrow } from '../lib/viewport'
import type { PaneShellProps } from './PaneShell'

const OverlayDrawer = lazy(() => import('./OverlayDrawer').then((module) => ({ default: module.OverlayDrawer })))
const ResponseDock = lazy(() => import('./ResponseDock').then((module) => ({ default: module.ResponseDock })))

export function WorkbenchLayout({ nav, panes, history, navigationOpen, onNavigationClose, responseKey, requestKey }: PaneShellProps) {
  const narrow = useWorkbenchNarrow()
  const content = panes[1]?.children
  return (
    <div
      className="wb-shell group/workbench m-3 grid min-h-0 min-w-0 flex-1 grid-cols-[222px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[10px] border border-border bg-surface max-[1100px]:m-2 max-[1100px]:grid-cols-[198px_minmax(0,1fr)] max-[959px]:grid-cols-1 max-[500px]:m-[5px] max-[500px]:rounded-[7px] data-[nav-closed]:grid-cols-1"
      data-nav-closed={narrow || nav === undefined || undefined}
    >
      {narrow
        ? navigationOpen && (
            <Suspense
              fallback={
                <span className="sr-only" role="status">
                  正在打开接口目录…
                </span>
              }
            >
              <OverlayDrawer title="接口目录" placement="left" navigation close={() => onNavigationClose?.()}>
                {nav}
              </OverlayDrawer>
            </Suspense>
          )
        : nav}
      <div
        id="workbench-content"
        className="wb-main col-start-2 row-start-1 grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)] overflow-hidden group-data-[nav-closed]/workbench:col-start-1 max-[959px]:col-start-1"
        tabIndex={-1}
      >
        {panes.length === 1 ? (
          <div className="wb-start flex min-h-0 min-w-0 overflow-hidden [&>section]:flex-1">{panes[0]?.node}</div>
        ) : (
          <Suspense
            fallback={
              <div className="wb-start flex min-h-0 min-w-0 overflow-hidden p-4 text-muted" role="status">
                正在打开请求面板…
              </div>
            }
          >
            <ResponseDock
              request={panes[0]?.node}
              response={content?.[0]?.node}
              inspector={content?.[1]?.node}
              responseKey={responseKey}
              requestKey={requestKey}
              narrow={narrow}
            />
          </Suspense>
        )}
      </div>
      {history}
    </div>
  )
}
