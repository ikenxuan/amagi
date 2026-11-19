import { Button, DropdownRoot as Dropdown, DropdownPopover, DropdownMenu, DropdownItem } from '@heroui/react'
import { ChevronDown } from 'lucide-react'

/** 菜单独立加载，Menu 与子菜单逻辑不进入首屏包。 */
export function RequestOptions({
  formId,
  busy,
  computed,
  combinations,
  unseeded,
  onBatch
}: {
  formId: string
  busy: boolean
  computed: boolean
  combinations: number
  unseeded: readonly string[]
  onBatch: () => void
}) {
  return (
    <Dropdown>
      <Button size="sm" variant="tertiary" aria-label="请求更多操作">
        更多 <ChevronDown size={14} aria-hidden="true" />
      </Button>
      <DropdownPopover>
        <DropdownMenu aria-label="请求更多操作">
          <DropdownItem id="reset" isDisabled={busy} onAction={() => (document.getElementById(formId) as HTMLFormElement | null)?.reset()}>
            重置参数
          </DropdownItem>
          {!computed && combinations > 1 && (
            <DropdownItem id="batch" isDisabled={busy || unseeded.length > 0} onAction={onBatch}>
              连录 {combinations} 种组合
            </DropdownItem>
          )}
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  )
}
