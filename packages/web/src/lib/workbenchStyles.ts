/** Shared workbench slots; layout stays in Tailwind rather than descendant CSS overrides. */
export const WORKBENCH_TABS = 'min-h-0 min-w-0 flex-1 gap-0 overflow-hidden'
export const WORKBENCH_TAB_BAR = 'wb-tabbar h-[42px] min-h-[42px] min-w-0 shrink-0'
export const WORKBENCH_TAB_PANEL =
  'wb-tabpanel m-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0 data-[inert=true]:hidden [&[hidden]]:hidden'
export const WORKBENCH_PANEL = 'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
export const REVIEW_PANEL =
  'wb-review grid h-full min-h-0 min-w-0 flex-1 grid-rows-[44px_minmax(0,1fr)_auto] overflow-hidden scrollbar max-[959px]:grid-rows-[42px_minmax(0,1fr)_auto]'
export const REVIEW_HEADING = 'wb-review-heading flex min-w-0 items-center justify-between gap-2.5 px-4 [&_h2]:text-xs [&_h2]:font-semibold'
export const EMPTY_STATE =
  'wb-empty-state flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-2.5 overflow-y-auto px-3 py-5 text-center text-muted scrollbar [&_p]:text-[13px] [&_p]:text-foreground [&_small]:max-w-[220px] [&_small]:text-[11px] [&_small]:leading-[1.8]'
export const EMPTY_SYMBOL =
  'wb-empty-symbol grid h-10 w-9 place-items-center rounded-[10px] border border-border bg-surface-secondary text-[17px]'
export const DETAIL_DIALOG = 'wb-detail-dialog max-h-dvh w-[min(92vw,580px)]'
export const DETAIL_BODY =
  'wb-detail-body min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain text-xs leading-[1.8] wrap-anywhere scrollbar [&>section+section]:mt-6 [&_h3]:mb-[9px] [&_h3]:text-[13px] [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-[17px] [&_li]:my-2 [&_pre]:whitespace-pre-wrap [&_pre]:wrap-anywhere [&_code]:whitespace-pre-wrap [&_code]:wrap-anywhere'
