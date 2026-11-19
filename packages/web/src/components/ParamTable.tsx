import {
  Button,
  Checkbox,
  Popover,
  TableRoot as Table,
  TableScrollContainer,
  TableContent,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell
} from '@heroui/react'
import type { ReactNode } from 'react'

import type { FieldSchema } from '../lib/api'
import { POPOVER_BODY } from '../lib/pane'

const CELL = 'h-10 border-b border-border py-[3px] align-middle'
const COLUMN = `${CELL} rounded-none bg-surface text-[11px] font-medium text-muted`

export interface ParamTableRow {
  name: string
  field: FieldSchema
  required: boolean
  sends: boolean
}

/** All schema fields stay visible; selection controls submission without removing their values. */
export function ParamTable({
  rows,
  onToggle,
  onToggleAll,
  renderValue,
  formId
}: {
  rows: readonly ParamTableRow[]
  onToggle: (name: string, sends: boolean) => void
  onToggleAll: (sends: boolean) => void
  renderValue: (name: string) => ReactNode
  formId: string
}) {
  const selected = rows.filter((row) => row.sends).length
  if (rows.length === 0) return <p className="text-muted text-xs">无需填写参数，可以直接获取数据。</p>
  return (
    <Table className="wb-param-table min-w-0 rounded-none bg-transparent shadow-none" variant="secondary">
      <TableScrollContainer className="wb-param-scroll min-w-0 overflow-x-auto overscroll-contain rounded-none">
        <TableContent aria-label="请求参数" className="wb-param-content w-full min-w-[680px] table-fixed text-xs">
          <TableHeader>
            <TableColumn id="column-send" className={`${COLUMN} wb-param-check w-[38px] px-[7px]`}>
              <Checkbox
                slot={null}
                aria-label="选择全部可选参数"
                isSelected={selected === rows.length}
                isIndeterminate={selected > 0 && selected < rows.length}
                isDisabled={rows.every((row) => row.required)}
                onChange={onToggleAll}
              >
                <Checkbox.Content>
                  <Checkbox.Control className="border border-border">
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox.Content>
              </Checkbox>
            </TableColumn>
            <TableColumn id="column-name" isRowHeader className={`${COLUMN} wb-param-name w-[22%] px-2.5`}>
              参数名
            </TableColumn>
            <TableColumn id="column-value" className={`${COLUMN} wb-param-value w-[34%] px-1`}>
              参数值
            </TableColumn>
            <TableColumn id="column-type" className={`${COLUMN} wb-param-type w-[90px] px-2.5 font-mono`}>
              类型
            </TableColumn>
            <TableColumn id="column-description" className={`${COLUMN} px-2.5`}>
              说明
            </TableColumn>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.name} id={`param:${row.name}`} className="group/param" data-omitted={!row.sends || undefined}>
                <TableCell className={`${CELL} wb-param-check w-[38px] px-[7px]`}>
                  <Checkbox
                    slot={null}
                    aria-label={row.required ? `必填参数：${row.name}` : `发送参数：${row.name}`}
                    isSelected={row.sends}
                    isDisabled={row.required}
                    onChange={(sends) => onToggle(row.name, sends)}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control className="border border-border">
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                    </Checkbox.Content>
                  </Checkbox>
                </TableCell>
                <TableCell className={`${CELL} wb-param-name w-[22%] px-2.5 group-data-[omitted]/param:opacity-55`}>
                  <span
                    className="wb-param-name-text inline-block max-w-[calc(100%_-_14px)] truncate align-middle font-mono text-xs"
                    title={row.name}
                    translate="no"
                  >
                    {row.name}
                  </span>
                  {row.required && (
                    <span className="wb-param-required ml-1 text-danger" title="必填" aria-label="必填">
                      *
                    </span>
                  )}
                </TableCell>
                <TableCell className={`${CELL} wb-param-value w-[34%] px-1`}>{renderValue(row.name)}</TableCell>
                <TableCell
                  className={`${CELL} wb-param-type w-[90px] px-2.5 font-mono text-[11px] text-muted group-data-[omitted]/param:opacity-55`}
                >
                  <span
                    className="block truncate data-[type=string]:text-success-soft-foreground data-[type=integer]:text-accent-soft-foreground data-[type=number]:text-accent-soft-foreground data-[type=boolean]:text-warning-soft-foreground"
                    data-type={row.field.type}
                    title={row.field.type ?? 'enum'}
                    translate="no"
                  >
                    {row.field.type ?? 'enum'}
                  </span>
                </TableCell>
                <TableCell className={`${CELL} wb-param-description px-2.5 group-data-[omitted]/param:opacity-55`}>
                  {row.field.description ? (
                    <Popover>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="wb-param-description-button h-[30px] min-h-[30px] w-full min-w-0 justify-start rounded-sm p-0 text-xs font-normal text-inherit"
                        aria-label={`参数说明：${row.name}`}
                      >
                        <span className="min-w-0 truncate" id={`${formId}-description-${row.name}`}>
                          {row.field.description}
                        </span>
                      </Button>
                      <Popover.Content className="w-[min(88vw,28rem)]">
                        <Popover.Dialog className={POPOVER_BODY}>
                          <Popover.Heading>{row.name}</Popover.Heading>
                          <p className="pt-3 text-sm whitespace-pre-wrap break-words">{row.field.description}</p>
                        </Popover.Dialog>
                      </Popover.Content>
                    </Popover>
                  ) : (
                    <span className="text-muted" id={`${formId}-description-${row.name}`}>
                      —
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableContent>
      </TableScrollContainer>
    </Table>
  )
}
