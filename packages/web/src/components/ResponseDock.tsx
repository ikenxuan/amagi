import { Button, Tabs } from '@heroui/react'
import { ChevronDown, GripHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMove } from 'react-aria/useMove'

import { createDockMotion, DOCK_COLLAPSED_HEIGHT } from '../lib/dockMotion'
import { WORKBENCH_PANEL, WORKBENCH_TABS, WORKBENCH_TAB_PANEL } from '../lib/workbenchStyles'

/** The request form stays mounted while the bottom dock resizes, closes, or changes views. */
export function ResponseDock({
  request,
  response,
  inspector,
  responseKey,
  requestKey,
  narrow
}: {
  request: ReactNode
  response: ReactNode
  inspector: ReactNode
  responseKey?: string
  requestKey?: string
  narrow: boolean
}) {
  const host = useRef<HTMLDivElement>(null)
  const separator = useRef<HTMLDivElement>(null)
  const motion = useRef<ReturnType<typeof createDockMotion> | null>(null)
  const pendingOpen = useRef<number | undefined>(undefined)
  const seenResponse = useRef(responseKey)
  const [collapsed, setCollapsed] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [selection, setSelection] = useState({ key: 'response', requestKey })
  const view = selection.requestKey === requestKey ? selection.key : 'response'
  useEffect(() => {
    const element = host.current!
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const short = window.matchMedia('(max-height: 360px)')
    const controller = createDockMotion({
      measure: () => ({ available: element.clientHeight - 8, minimum: short.matches ? 140 : 200 }),
      reducedMotion: () => reduce.matches,
      render: (height, open) => {
        element.style.setProperty('--response-dock-height', `${height}px`)
        separator.current?.setAttribute('aria-valuenow', String(Math.round(height)))
        separator.current?.setAttribute(
          'aria-valuetext',
          height <= DOCK_COLLAPSED_HEIGHT ? '已收起' : `响应高度 ${Math.round(height)} 像素`
        )
        setCollapsed(height <= DOCK_COLLAPSED_HEIGHT + 0.5 && !open)
        setExpanded(open)
      }
    })
    motion.current = controller
    const resize = () => {
      separator.current?.setAttribute('aria-valuemax', String(Math.max(DOCK_COLLAPSED_HEIGHT, element.clientHeight - 60)))
      controller.resize()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    const reduceMotion = () => {
      if (reduce.matches) controller.finish()
    }
    reduce.addEventListener('change', reduceMotion)
    short.addEventListener('change', resize)
    return () => {
      observer.disconnect()
      reduce.removeEventListener('change', reduceMotion)
      short.removeEventListener('change', resize)
      controller.dispose()
      motion.current = null
    }
  }, [])
  useEffect(() => {
    if (responseKey === undefined || responseKey === seenResponse.current) return
    seenResponse.current = responseKey
    setSelection({ key: 'response', requestKey })
    // Let the new response/editor mount before starting the visible transition.
    pendingOpen.current = requestAnimationFrame(() => {
      pendingOpen.current = requestAnimationFrame(() => {
        pendingOpen.current = undefined
        motion.current?.open()
      })
    })
    return () => {
      if (pendingOpen.current !== undefined) cancelAnimationFrame(pendingOpen.current)
    }
  }, [responseKey, requestKey])
  const cancelPendingOpen = () => {
    if (pendingOpen.current !== undefined) cancelAnimationFrame(pendingOpen.current)
    pendingOpen.current = undefined
  }
  const { moveProps } = useMove({
    onMoveStart: () => {
      cancelPendingOpen()
      motion.current?.begin()
      setDragging(true)
    },
    onMove: (event) => motion.current?.move(event.deltaY, event.pointerType === 'keyboard'),
    onMoveEnd: () => {
      setDragging(false)
      motion.current?.end()
    }
  })
  const toggle = () => {
    cancelPendingOpen()
    motion.current?.toggle()
  }
  const controls = (
    <>
      <span className="wb-dock-status min-w-0 truncate text-[11px] text-muted max-[959px]:ml-auto" role="status">
        {responseKey ? '响应已就绪' : '等待请求'}
      </span>
      <span className="wb-dock-hint ml-auto min-w-0 truncate text-[11px] text-muted max-[959px]:hidden" aria-hidden="true">
        {collapsed ? '向上拖动展开' : '拖动调整高度'}
      </span>
      <Button
        size="sm"
        variant="tertiary"
        className="wb-dock-toggle shrink-0 max-[959px]:ml-auto"
        aria-label={expanded ? '收起响应面板' : '展开响应面板'}
        aria-expanded={expanded}
        aria-controls="response-dock-content"
        onPress={toggle}
      >
        <ChevronDown size={14} className={expanded ? undefined : 'rotate-180'} aria-hidden="true" />
        {expanded ? '收起' : '展开'}
      </Button>
    </>
  )

  return (
    <div
      ref={host}
      id="request-response-layout"
      className="wb-dock-layout group/dock grid h-full min-h-0 min-w-0 grid-rows-[minmax(52px,1fr)_8px_clamp(40px,var(--response-dock-height,40px),calc(100%_-_60px))] data-[dragging]:cursor-row-resize data-[dragging]:select-none data-[dragging]:[&_*]:cursor-row-resize data-[dragging]:[&_*]:select-none"
      data-dragging={dragging || undefined}
    >
      <div id="amagi-pane-request" className="wb-composer h-full min-h-0 min-w-0 overflow-hidden">
        {request}
      </div>
      <div
        {...moveProps}
        ref={separator}
        id="response-dock-resizer"
        className="wb-dock-resizer relative z-1 flex h-2 touch-none items-center justify-center border-y border-border bg-surface-secondary select-none cursor-row-resize before:absolute before:inset-x-0 before:-inset-y-[3px] before:content-[''] pointer-coarse:before:-inset-y-2 hover:bg-accent-soft group-data-[dragging]/dock:bg-accent-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        aria-label="调整响应面板高度"
        role="separator"
        tabIndex={0}
        aria-orientation="horizontal"
        aria-controls="response-dock-content"
        aria-valuemin={DOCK_COLLAPSED_HEIGHT}
        aria-valuemax={DOCK_COLLAPSED_HEIGHT}
        aria-valuenow={DOCK_COLLAPSED_HEIGHT}
        title="拖动调整高度，方向键微调，Enter 收放"
        onKeyDownCapture={(event) => {
          if (event.key === 'Enter' || event.key === 'Home' || event.key === 'End') {
            event.preventDefault()
            event.stopPropagation()
            if (event.key === 'Home') motion.current?.maximize()
            else if (event.key === 'End') motion.current?.close()
            else toggle()
          }
        }}
      >
        <GripHorizontal size={14} className="pointer-events-none text-muted" aria-hidden="true" />
      </div>
      <div id="amagi-response-dock" className={`wb-dock ${WORKBENCH_PANEL} [container-name:response-dock] [container-type:size]`}>
        {narrow ? (
          <Tabs
            variant="secondary"
            className={`wb-dock-tabs wb-tabs ${WORKBENCH_TABS} grid h-full grid-cols-[auto_minmax(0,1fr)] grid-rows-[40px_minmax(0,1fr)]`}
            selectedKey={view}
            onSelectionChange={(key) => {
              setSelection({ key: String(key), requestKey })
              motion.current?.open()
            }}
          >
            <Tabs.ListContainer className="wb-dock-tabbar h-10 min-w-0 shrink-0">
              <Tabs.List aria-label="响应与样本">
                <Tabs.Tab id="response" className="w-auto shrink-0 whitespace-nowrap">
                  响应
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="review" className="w-auto shrink-0 whitespace-nowrap">
                  样本与类型
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <div className="wb-dock-actions flex min-w-0 items-center justify-end gap-2 border-b border-border pr-3">{controls}</div>
            <div
              id="response-dock-content"
              className="wb-dock-content col-span-full row-start-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden [&[hidden]]:hidden"
              hidden={collapsed}
              inert={collapsed}
            >
              <Tabs.Panel id="response" className={WORKBENCH_TAB_PANEL} shouldForceMount>
                <div className={`wb-response ${WORKBENCH_PANEL}`}>{response}</div>
              </Tabs.Panel>
              <Tabs.Panel id="review" className={WORKBENCH_TAB_PANEL} shouldForceMount>
                <div className={`wb-inspector ${WORKBENCH_PANEL}`}>{inspector}</div>
              </Tabs.Panel>
            </div>
          </Tabs>
        ) : (
          <>
            <div className="wb-dock-header flex h-10 min-h-10 items-center gap-3 border-b border-border bg-surface px-3">
              <h2 className="shrink-0 text-xs font-semibold">响应</h2>
              {controls}
            </div>
            <div
              id="response-dock-content"
              className="wb-dock-content wb-results grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_clamp(300px,28vw,390px)] overflow-hidden max-[1100px]:grid-cols-[minmax(0,1fr)_300px] [&[hidden]]:hidden"
              hidden={collapsed}
              inert={collapsed}
            >
              <div className={`wb-response ${WORKBENCH_PANEL}`}>{response}</div>
              <div className={`wb-inspector ${WORKBENCH_PANEL} border-l border-border`}>{inspector}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
