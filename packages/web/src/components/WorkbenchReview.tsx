import {
  AlertDialog,
  Button,
  Chip,
  Drawer,
  DropdownRoot as Dropdown,
  DropdownPopover,
  DropdownMenu,
  DropdownItem,
  Label,
  ListBox,
  Select,
  ToggleButton,
  ToggleButtonGroup
} from '@heroui/react'
import { useLockFn } from 'ahooks'
import { ChevronDown, Inbox } from 'lucide-react'
import { useState } from 'react'

import { REVIEW_PANEL, REVIEW_HEADING, EMPTY_STATE, EMPTY_SYMBOL, DETAIL_DIALOG, DETAIL_BODY } from '../lib/workbenchStyles'
import { DetailDrawer } from './DetailDrawer'
import { copyableOf, copyToClipboard, ShareParamsForm } from './Result'
import type { SamplePaneProps } from './SamplePane'

export function WorkbenchReview({
  outcome,
  payloadView,
  saved = false,
  consumed,
  retryable = false,
  settled,
  endpointLabel,
  busy,
  stored,
  computed,
  generateLoading,
  generateLabel = '生成类型',
  onGenerate,
  onSaveOnly,
  onDiscard,
  onStore,
  onDirectionChange,
  onShapeChoiceChange
}: SamplePaneProps) {
  const [shareOpen, setShareOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const generate = useLockFn(async () => {
    await onGenerate()
  })
  const save = useLockFn(async () => {
    await onSaveOnly?.()
  })
  const discard = useLockFn(async () => {
    await onDiscard()
    setDiscardOpen(false)
  })
  const share = useLockFn(async (label: string) => {
    await onStore({ mode: 'sample-and-params', label })
  })
  const canReview = outcome?.pendingId !== undefined && !saved && (!consumed || retryable)
  const canGenerate = !computed && (canReview || saved)
  const copies = outcome === undefined ? [] : copyableOf(outcome, payloadView)
  const changes = outcome?.breaking ?? []
  const shape = (outcome?.shapeIndex ?? 0) === 0 ? 'merge' : 'separate'
  const state = saved ? (consumed ? '已生成' : '已入库') : consumed ? '已丢弃' : canReview ? '待审核' : computed ? '本地计算' : '不可入库'
  return (
    <section className={REVIEW_PANEL} aria-label="样本审核">
      <header className={REVIEW_HEADING}>
        <h2>当前样本</h2>
        {outcome && (
          <Chip size="sm" variant="soft" color={saved ? 'success' : canReview ? 'accent' : 'default'}>
            <Chip.Label>{state}</Chip.Label>
          </Chip>
        )}
      </header>
      <div className="wb-review-scroll flex min-h-0 min-w-0 flex-col gap-[18px] overflow-x-hidden overflow-y-auto overscroll-contain px-4 pt-2 pb-[18px] scrollbar max-[959px]:gap-3.5 [&>*]:shrink-0">
        {outcome === undefined ? (
          <div className={EMPTY_STATE}>
            <span className={EMPTY_SYMBOL} aria-hidden="true">
              <Inbox size={20} aria-hidden="true" />
            </span>
            <p>等待一份响应</p>
            <small>获取数据后，在这里审核、保存和生成类型。</small>
          </div>
        ) : (
          <>
            <p className="wb-sample-identity truncate font-mono text-[11px] text-muted" title={endpointLabel} translate="no">
              {endpointLabel}
            </p>
            {canReview && (
              <>
                <div className="wb-review-field flex flex-col gap-2 text-xs">
                  <span id="wb-direction-label">响应方向</span>
                  <ToggleButtonGroup
                    className="w-full"
                    aria-labelledby="wb-direction-label"
                    selectionMode="single"
                    disallowEmptySelection
                    size="sm"
                    isDisabled={busy}
                    selectedKeys={[outcome.direction ?? 'success']}
                    onSelectionChange={(keys) => {
                      const key = [...keys][0]
                      if (key === 'success' || key === 'error') void onDirectionChange(key)
                    }}
                  >
                    <ToggleButton id="success" className="flex-1">
                      成功响应
                    </ToggleButton>
                    <ToggleButton id="error" className="flex-1">
                      错误响应
                    </ToggleButton>
                  </ToggleButtonGroup>
                </div>
                {!computed && (
                  <Select
                    aria-label="样本保存形状"
                    selectedKey={shape}
                    isDisabled={busy}
                    onSelectionChange={(key) => {
                      if ((key === 'merge' || key === 'separate') && key !== shape) onShapeChoiceChange(key)
                    }}
                  >
                    <Label>保存到</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id="merge" textValue="现有形状 · V0">
                          现有形状 · V0
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item
                          id="separate"
                          textValue={`独立形状${outcome.nextShapeIndex === undefined ? '' : ` · V${outcome.nextShapeIndex}`}`}
                        >
                          独立形状{outcome.nextShapeIndex === undefined ? '' : ` · V${outcome.nextShapeIndex}`}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}
              </>
            )}
            <div className="wb-sample-facts flex items-center justify-between pt-1 text-[11px] text-muted">
              <span>已入库样本</span>
              <strong className="font-medium text-foreground tabular-nums">{stored} 份</strong>
            </div>
            {outcome.shapeChanged === false && canReview && (
              <p className="text-[11px] leading-[1.7] text-muted wrap-anywhere">与已有样本结构一致，可选择丢弃。</p>
            )}
            {!canReview && !saved && (
              <p className="text-[11px] leading-[1.7] text-muted wrap-anywhere">
                {computed ? '本地计算结果无需录制样本。' : consumed ? '这份样本已丢弃，可重新采集。' : '这份响应无法保存，请查看诊断详情。'}
              </p>
            )}
            <div className="wb-diagnostic-row flex items-center justify-between gap-1.5 border-t border-border pt-2.5 text-[11px]">
              <span className={`min-w-0 truncate ${changes.length > 0 ? 'text-danger-soft-foreground' : 'text-muted'}`}>
                {changes.length > 0 ? `${changes.length} 项类型变更需注意` : '响应与样本诊断'}
              </span>
              <DetailDrawer label="诊断详情" title="本次响应诊断" tone={changes.length > 0 ? 'danger-soft' : 'tertiary'}>
                <section>
                  <h3>入库判定</h3>
                  <p>{outcome.verdict.reason}</p>
                  {outcome.message && <p>{outcome.message}</p>}
                </section>
                {changes.length > 0 && (
                  <section>
                    <h3>类型变更（{changes.length}）</h3>
                    <ul>
                      {changes.map((change, index) => (
                        <li key={index}>{change}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {settled && (
                  <section>
                    <h3>操作回执</h3>
                    <p>{settled}</p>
                  </section>
                )}
                {outcome.scrub && (
                  <section>
                    <h3>脱敏处理</h3>
                    <p>已替换 {outcome.scrub.replacements} 处敏感内容。</p>
                    <ul>
                      {outcome.scrub.suspects.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {!!outcome.payloadTrimmed?.length && (
                  <section>
                    <h3>样本裁剪</h3>
                    <ul>
                      {outcome.payloadTrimmed.map((item) => (
                        <li key={item.path}>
                          {item.path || '根数组'}：{item.from} → {item.to}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </DetailDrawer>
            </div>
            {retryable && (
              <p className="text-[11px] leading-[1.7] text-warning wrap-anywhere">样本已保存，但参数共享未完成。打开更多操作重试。</p>
            )}
          </>
        )}
      </div>
      {outcome && (
        <footer className="wb-review-footer flex min-w-0 flex-col gap-2 border-t border-border bg-surface px-4 py-3 max-[959px]:py-2.5">
          {canGenerate && (
            <Button fullWidth size="sm" isPending={generateLoading} isDisabled={busy} onPress={() => void generate()}>
              {generateLabel}
            </Button>
          )}
          <div className="wb-review-secondary flex items-center justify-between gap-2">
            {canReview && onSaveOnly && (
              <Button size="sm" variant="secondary" isDisabled={busy} onPress={() => void save()}>
                仅保存样本
              </Button>
            )}
            {(copies.length > 0 || canReview) && (
              <Dropdown>
                <Button size="sm" variant="tertiary" aria-label="样本更多操作">
                  更多操作 <ChevronDown size={14} aria-hidden="true" />
                </Button>
                <DropdownPopover>
                  <DropdownMenu aria-label="样本更多操作">
                    {copies.map((action) => (
                      <DropdownItem
                        key={action.id}
                        id={action.id}
                        textValue={action.id === 'copy-payload' ? '复制 JSON' : '复制 diff'}
                        onAction={() => void copyToClipboard(action)}
                      >
                        {action.id === 'copy-payload' ? '复制 JSON' : '复制 diff'}
                      </DropdownItem>
                    ))}
                    {canReview && endpointLabel && (
                      <DropdownItem id="share" isDisabled={busy} onAction={() => setShareOpen(true)}>
                        保存并共享参数
                      </DropdownItem>
                    )}
                    {canReview && (
                      <DropdownItem id="discard" isDisabled={busy} variant="danger" onAction={() => setDiscardOpen(true)}>
                        丢弃这份样本
                      </DropdownItem>
                    )}
                  </DropdownMenu>
                </DropdownPopover>
              </Dropdown>
            )}
          </div>
        </footer>
      )}
      <Drawer.Backdrop isOpen={shareOpen} onOpenChange={setShareOpen}>
        <Drawer.Content placement="right">
          <Drawer.Dialog className={DETAIL_DIALOG}>
            <Drawer.CloseTrigger aria-label="关闭参数共享" />
            <Drawer.Header>
              <Drawer.Heading>保存并共享参数</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className={DETAIL_BODY}>
              {endpointLabel && (
                <ShareParamsForm expanded endpointLabel={endpointLabel} busy={busy || !canReview} onKeep={(label) => share(label)} />
              )}
              {saved && <p role="status">参数与样本已保存。</p>}
            </Drawer.Body>
            <Drawer.Footer>
              <Button variant="secondary" onPress={() => setShareOpen(false)}>
                关闭
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
      <AlertDialog.Backdrop isOpen={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Heading>丢弃这份样本？</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>这份待定样本会被移除，已入库的样本和类型文件不受影响。</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="secondary" onPress={() => setDiscardOpen(false)}>
                保留样本
              </Button>
              <Button variant="danger" isDisabled={busy} onPress={() => void discard()}>
                确认丢弃
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </section>
  )
}
