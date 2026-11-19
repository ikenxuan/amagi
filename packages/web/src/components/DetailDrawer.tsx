import { Button } from '@heroui/react'
import { lazy, Suspense, useState, type ReactNode } from 'react'

const OverlayDrawer = lazy(() => import('./OverlayDrawer').then((module) => ({ default: module.OverlayDrawer })))

/** 长说明只在抽屉里展开，正文滚动与关闭按钮分开。 */
export function DetailDrawer({
  label,
  title,
  children,
  tone = 'tertiary'
}: {
  label: string
  title: string
  children: ReactNode
  tone?: 'tertiary' | 'secondary' | 'danger-soft'
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant={tone} className="shrink-0" aria-haspopup="dialog" aria-expanded={open} onPress={() => setOpen(true)}>
        {label}
      </Button>
      {open && (
        <Suspense
          fallback={
            <span className="sr-only" role="status">
              正在打开详情…
            </span>
          }
        >
          <OverlayDrawer title={title} close={() => setOpen(false)}>
            {children}
          </OverlayDrawer>
        </Suspense>
      )}
    </>
  )
}
