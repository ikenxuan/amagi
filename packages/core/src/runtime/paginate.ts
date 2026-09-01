import type { PaginateDef } from '../contracts/endpoint'
import type { AmagiError } from '../contracts/error'
import type { TraceReason } from '../contracts/meta'

/**
 * 声明式翻页。
 *
 * 算法与 v6 `fetchPaginatedData` 逐步对齐 —— 翻页是**行为**，不是重构对象：
 *
 * 1. 目标条数 `target` 取自 `limitParam`（默认 `'number'`），缺省为 `maxPageSize`。
 * 2. 每次请求的条数是 `min(target - 已取, maxPageSize)`，**写回参数**（含第一页）。
 * 3. 拿到一页 → 累积条目 → `hasMore` 为假就停 → 本页空列表也停。
 * 4. 收尾时把累积条目截断到 `target`；`target === 0` 时**一个请求都不发**。
 *
 * 与 v6 唯一的结构差异：v6 在循环里直接拼 URL 并签名，v7 把「跑一页」抽成
 * `runPage` 回调交给 `execute`，所以每页依然完整走
 * `build → sign → send → decode → judge`（每页重新签名这条性质因此是构造保证的，
 * 而不是靠记得写）。
 */

/** 一页的结局 */
export type PageOutcome = { ok: true; value: unknown } | { ok: false; error: AmagiError }

/** 翻页跑完之后交给 `normalize` 的值 */
export interface PaginatedValue {
  /** 最后一页 decode 之后的值。一个请求都没发时是 `undefined` */
  lastPage: unknown
  /** 每一页 decode 之后的值，按请求顺序 */
  pages: unknown[]
  /** 按目标条数截断后的累积条目 */
  items: unknown[]
}

/** 跑一页：给参数与 trace 来源，回这一页的结局 */
export type RunPage<TParams> = (params: TParams, reason: TraceReason) => Promise<PageOutcome>

/**
 * 解析目标条数。
 *
 * 非有限数视为「没指定」，退回 `maxPageSize`（zod 校验后其实到不了这一支，
 * 留着是为了让这个函数单独拿出去用也不会算出 `NaN`）；负数视为 0。
 * @param raw - `limitParam` 对应的参数值
 * @param maxPageSize - 单页上限
 * @returns 目标条数
 */
export const resolveTarget = (raw: unknown, maxPageSize: number): number => {
  const value = Number(raw ?? maxPageSize)
  if (!Number.isFinite(value)) return maxPageSize
  return Math.max(0, Math.trunc(value))
}

/**
 * 按声明跑完翻页。
 *
 * **不 catch 任何异常** —— `runPage` 抛出的东西直接往外传，由 `execute`
 * 唯一的那处 catch 归因。
 * @param def - 翻页声明
 * @param params - 校验后的参数
 * @param runPage - 跑一页的回调
 * @returns 累积结果，或第一个失败页的错误
 */
export const runPaginated = async <TParams>(
  def: PaginateDef<TParams>,
  params: TParams,
  runPage: RunPage<TParams>
): Promise<{ ok: true; value: PaginatedValue } | { ok: false; error: AmagiError }> => {
  const limitKey = (def.limitParam ?? 'number') as string
  const countKey = (def.countParam ?? limitKey) as string
  const target = resolveTarget((params as Record<string, unknown>)[limitKey], def.maxPageSize)

  const pages: unknown[] = []
  const collected: unknown[] = []
  let current = params
  let lastPage: unknown
  let isFirst = true

  while (collected.length < target) {
    const pageSize = Math.min(target - collected.length, def.maxPageSize)
    const pageParams = { ...(current as Record<string, unknown>), [countKey]: pageSize } as TParams

    const outcome = await runPage(pageParams, isFirst ? 'initial' : 'page')
    if (!outcome.ok) return { ok: false, error: outcome.error }

    const page = outcome.value
    pages.push(page)
    lastPage = page

    const list = def.items(page)
    if (Array.isArray(list) && list.length > 0) collected.push(...list)

    // 顺序与 v6 一致：先看平台说没有更多，再看本页是不是空的
    if (!def.hasMore(page)) break
    if (!Array.isArray(list) || list.length === 0) break

    current = def.nextParams(pageParams, page)
    isFirst = false
  }

  return { ok: true, value: { lastPage, pages, items: target === 0 ? [] : collected.slice(0, target) } }
}
