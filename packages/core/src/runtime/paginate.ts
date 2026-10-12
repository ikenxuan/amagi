import type { PaginateDef, PaginateOutcome } from '../contracts/endpoint'
import type { AmagiError } from '../contracts/error'
import type { TraceReason } from '../contracts/meta'

/**
 * 声明式翻页。
 *
 * 翻页算法：
 *
 * 1. 目标条数 `target` 取自 `limitParam`（默认 `'number'`），缺省为 `maxPageSize`。
 * 2. 每次请求的条数是 `min(target - 已取, maxPageSize)`，**写回参数**（含第一页）。
 * 3. 拿到一页 → 累积条目 → `hasMore` 为假就停 → 本页空列表也停。
 * 4. **某一页失败时**：首屏已取到过页就返回**部分结果**（不丢已有条目、不额外标注，
 *    看起来就是一次正常成功）；**第一页就失败**才是整体失败 —— 那时没有任何部分可言。
 * 5. 收尾时把累积条目截断到 `target`；`target === 0` 时**一个请求都不发**。
 *
 * 「跑一页」由 `runPage` 回调交回 `execute`，所以每页依然完整走
 * `build → sign → send → decode → judge` —— 每页重新签名是构造保证的，
 * 而不是靠端点作者记得写。
 */

/** 一页的结局 */
export type PageOutcome = { ok: true; value: unknown } | { ok: false; error: AmagiError }

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
 *
 * **中途失败不丢已有页**：只要已经取到过至少一页，后续某页失败就返回**部分结果**，
 * 而不是整体失败 —— 丢掉已取到的条目毫无道理，「比目标少」与 `hasMore: false`
 * 提前收尾本是同一种结局。**第一页就失败仍是整体失败**（没有任何部分可言）。
 * @param def - 翻页声明
 * @param params - 校验后的参数
 * @param runPage - 跑一页的回调
 * @returns 累积结果（页数可能少于目标），或第一页的错误
 */
export const runPaginated = async <TParams>(
  // 运行时不关心页 / 条目类型，用最宽实例吃任意具体 PaginateDef；类型收窄只服务端点声明侧
  // oxlint-disable-next-line typescript/no-explicit-any
  def: PaginateDef<TParams, unknown, any, unknown>,
  params: TParams,
  runPage: RunPage<TParams>
): Promise<{ ok: true; value: PaginateOutcome } | { ok: false; error: AmagiError }> => {
  const limitKey = (def.limitParam ?? 'number') as string
  const countKey = (def.countParam ?? limitKey) as string
  const target = resolveTarget((params as Record<string, unknown>)[limitKey], def.maxPageSize)

  // 空跑：一个请求都不发。单独一支，好让有页分支的 `lastPage` 恒有值
  if (target === 0) return { ok: true, value: { empty: true } }

  const collected: unknown[] = []
  let current = params
  let lastPage: unknown
  let isFirst = true
  /** 已经跑完的页数：中断现场据此标页码，也用来区分「第一页就失败」 */
  let donePages = 0

  while (collected.length < target) {
    const pageSize = Math.min(target - collected.length, def.maxPageSize)
    const pageParams = { ...(current as Record<string, unknown>), [countKey]: pageSize } as TParams

    const outcome = await runPage(pageParams, isFirst ? 'initial' : 'page')
    if (!outcome.ok) {
      // 第一页就失败：没有部分可言，整体失败
      if (donePages === 0) return { ok: false, error: outcome.error }
      // 已取到过页：返回部分结果，已拿到的条目一条不丢 —— 调用方看到的就是一次正常成功，
      // 不额外标注（平台在自己那一页软拒是它的行为，不该让整个调用变成异常）。
      // lastPage 取最后一个**成功**页：merge 拿它当形状模板，失败页没有形状可用。
      return { ok: true, value: { empty: false, lastPage, items: collected.slice(0, target) } }
    }
    donePages += 1

    const page = outcome.value
    lastPage = page

    const list = def.items(page)
    if (Array.isArray(list) && list.length > 0) collected.push(...list)

    // 顺序：先看平台说没有更多，再看本页是不是空的
    if (!def.hasMore(page)) break
    if (!Array.isArray(list) || list.length === 0) break

    current = def.nextParams(pageParams, page)
    isFirst = false
  }

  // target > 0 时循环至少进一次（collected 从 0 起 < target），所以 lastPage 恒有值
  return { ok: true, value: { empty: false, lastPage, items: collected.slice(0, target) } }
}
