import { Button, Label, ListBox, Select } from '@heroui/react'
import { useRequest } from 'ahooks'
import { useState } from 'react'

import { fetchGenerated } from '../lib/api'
import { EMPTY_STATE } from '../lib/workbenchStyles'
import { CodeBlock } from './CodeBlock'
import { DetailDrawer } from './DetailDrawer'

export interface GeneratedPanelProps {
  platform: string
  endpoint: string
  revision?: number
}

/** 多文件使用可滚动的选择菜单，文件名和诊断都不参与代码区的高度分配。 */
export const GeneratedPanel = ({ platform, endpoint, revision = 0 }: GeneratedPanelProps) => {
  const generated = useRequest(() => fetchGenerated({ platform, endpoint }), { refreshDeps: [platform, endpoint, revision] })
  const [selected, setSelected] = useState<string>()
  const files = generated.data?.files ?? []
  const current = files.find((file) => file.path === selected) ?? files[0]
  const issues = generated.data?.issues ?? []
  return (
    <section
      className="wb-generated-panel flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-hidden px-3 pt-2.5"
      aria-label="已生成的类型文件"
    >
      <header className="wb-file-heading flex h-8 min-w-0 shrink-0 items-center gap-2">
        <h2 className="text-xs font-semibold">已有类型</h2>
        <span className="text-[10px] text-muted">{files.length} 个文件</span>
        <Button
          size="sm"
          variant="tertiary"
          className="ml-auto"
          aria-label="重新读一遍已提交的产物"
          isPending={generated.loading}
          onPress={() => generated.refresh()}
        >
          刷新
        </Button>
      </header>
      {generated.error ? (
        <div className={EMPTY_STATE}>
          <p>无法读取类型文件</p>
          <DetailDrawer label="错误详情" title="读取类型失败" tone="danger-soft">
            <pre>{generated.error.message}</pre>
          </DetailDrawer>
        </div>
      ) : generated.loading && generated.data === undefined ? (
        <p className="text-muted text-sm">正在读 packages/response-types/ 里的产物…</p>
      ) : !current ? (
        <div className={EMPTY_STATE}>
          <p>尚未生成类型</p>
          <small>保存样本后，在「保存与生成」中生成类型。</small>
        </div>
      ) : (
        <>
          <Select
            className="wb-file-select min-w-0 shrink-0"
            selectedKey={current.path}
            onSelectionChange={(key) => setSelected(String(key))}
          >
            <Label className="sr-only">选择类型文件</Label>
            <Select.Trigger>
              <Select.Value className="min-w-0 truncate font-mono text-[11px]" />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover className="max-w-[min(92vw,36rem)]">
              <ListBox aria-label="已有的产物文件">
                {files.map((file) => (
                  <ListBox.Item key={file.path} id={file.path} textValue={file.path}>
                    <span className="truncate font-mono text-xs" title={file.path}>
                      {file.path}
                    </span>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <div className="wb-file-code flex min-h-0 min-w-0 flex-1 overflow-hidden [&>div]:min-h-0 [&>div]:min-w-0 [&>div]:flex-1">
            <CodeBlock code={current.code} fill />
          </div>
          <footer className="wb-file-footer flex h-9 shrink-0 items-center justify-between gap-[5px] border-t border-border text-[10px] text-muted">
            <span className="min-w-0 truncate">由已入库样本合并生成</span>
            {issues.length > 0 && (
              <DetailDrawer label={`${issues.length} 项读取问题`} title="类型文件读取问题" tone="danger-soft">
                <ul>
                  {issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </DetailDrawer>
            )}
          </footer>
        </>
      )}
    </section>
  )
}
