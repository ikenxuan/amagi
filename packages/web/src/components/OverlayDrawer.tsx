import { Button, Drawer } from '@heroui/react'
import type { ReactNode } from 'react'

import { DETAIL_DIALOG, DETAIL_BODY } from '../lib/workbenchStyles'

export function OverlayDrawer({
  title,
  children,
  close,
  placement = 'right',
  navigation = false
}: {
  title: string
  children: ReactNode
  close: () => void
  placement?: 'left' | 'right'
  navigation?: boolean
}) {
  return (
    <Drawer.Backdrop
      isOpen
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <Drawer.Content placement={placement}>
        <Drawer.Dialog className={navigation ? 'wb-nav-dialog max-h-dvh w-[min(90vw,320px)]' : DETAIL_DIALOG}>
          <Drawer.CloseTrigger aria-label={navigation ? '关闭接口目录' : '关闭详情'} />
          <Drawer.Header>
            <Drawer.Heading className="min-w-0 truncate pr-8">{title}</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body
            className={
              navigation
                ? 'wb-nav-body flex min-h-0 overflow-hidden p-0 [&_nav]:h-full [&_nav]:flex-1 [&_nav]:border-0 [&_.wb-rail-heading]:hidden'
                : DETAIL_BODY
            }
          >
            {children}
          </Drawer.Body>
          {!navigation && (
            <Drawer.Footer>
              <Button variant="secondary" onPress={close}>
                关闭
              </Button>
            </Drawer.Footer>
          )}
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}
