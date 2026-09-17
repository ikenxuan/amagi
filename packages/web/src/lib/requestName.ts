/**
 * 集合里那条记录**给人看的名字**。
 *
 * hash 时代 `label` 可改、可重复（身份是 server 算的 `paramsHash`，`shared/contract.ts`），
 * 于是「界面上叫它什么」有了两条规矩：
 *
 * - **说明唯一就用说明** —— 机器身份一个字符都不多挂；
 * - **撞名才追加哈希消歧**（`说明（abcdef123456）`）—— 一屏两个「单 P 稿件」时，
 *   「删除请求记录 单 P 稿件」那句 aria-label 说出的是哪一条必须可分辨（WCAG 2.5.3，
 *   同 `RequestTable.tsx` 里那颗按钮的既有判据）。
 *
 * 纯函数、单独一层，与 `storeNotice.ts` / `theme.ts` 同一条做法（判定从组件里抽出来才好测）。
 * 读者是 `RequestTable.tsx`（行、同形状清单、删除/载入的 aria-label）与
 * `RequestPane.tsx`（「用哪一组参数」下拉的 textValue）。
 */

import type { RequestEntry } from './api'

/** 这条记录在该集合里的显示名。`all` 里另有同 `label` 的记录时追加 `（paramsHash）` 消歧 */
export const requestName = (
  entry: Pick<RequestEntry, 'paramsHash' | 'label'>,
  all: readonly Pick<RequestEntry, 'paramsHash' | 'label'>[]
): string =>
  all.some((other) => other.paramsHash !== entry.paramsHash && other.label === entry.label)
    ? `${entry.label}（${entry.paramsHash}）`
    : entry.label
