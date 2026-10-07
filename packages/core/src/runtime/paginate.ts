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
 * 4. 收尾时把累积条目截断到 `target`；`target === 0` 时**一个请求都不发**。
 * 5. 声明了 `pageIntervalMs` 的，第 2 页起每页发出前先等这么久。
 * 6. 某页失败：首页失败或端点没声明 `partial: 'tolerate'` → 整体失败；
 *    否则停在这里，带着已取条目返回，失败页的错误进 `interrupted`。
 *
 * 默认只把**最后一页**交给 `merge`（页体比条目大得多，全留着是实打实的内存峰值）；
 * 声明 `keepPages: true` 的端点才额外拿到 `pages`，用于合并条目之外的跨页旁路数据。
 *
 * 「跑一页」由 `runPage` 回调交回 `execute`，所以每页依然完整走
 * `build → sign → send → decode → judge` —— 每页重新签名是构造保证的，
 * 而不是靠端点作者记得写。
 */

/** 一页的结局 */
export type PageOutcome = { ok: true; value: unknown } | { ok: false; error: AmagiError }

/** 跑一页：给参数与 trace 来源，回这一页的结局 */
export type RunPage<TParams> = (params: TParams, reason: TraceReason) => Promise<PageOutcome>

/** 翻页循环向外借的东西：等待怎么做、部分失败怎么处置 */
export interface PaginateRunOptions {
  /** 翻页间隔用的等待；`execute` 传它的可注入 sleep，测试里就不用真等 */
  sleep?: (ms: number) => Promise<void>
  /**
   * 第 1 页之后某页失败时，是否保留已取数据（端点 `partial: 'tolerate'`）。
   * 第 1 页就失败没有可保留的东西，一律整体失败。
   */
  tolerate?: boolean
}

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
 * @param options - 翻页间隔的等待与部分失败策略
 * @returns 累积结果，或第一个失败页的错误
 */
export const runPaginated = async <TParams>(
  // 运行时不关心页 / 条目类型，用最宽实例吃任意具体 PaginateDef；类型收窄只服务端点声明侧
  // oxlint-disable-next-line typescript/no-explicit-any
  def: PaginateDef<TParams, unknown, any, unknown>,
  params: TParams,
  runPage: RunPage<TParams>,
  options: PaginateRunOptions = {}
): Promise<{ ok: true; value: PaginateOutcome } | { ok: false; error: AmagiError }> => {
  const limitKey = (def.limitParam ?? 'number') as string
  const countKey = (def.countParam ?? limitKey) as string
  const target = resolveTarget((params as Record<string, unknown>)[limitKey], def.maxPageSize)

  // 空跑：一个请求都不发。单独一支，好让有页分支的 `lastPage` 恒有值
  if (target === 0) return { ok: true, value: { empty: true } }

  const collected: unknown[] = []
  // `keepPages` 关着时恒为 undefined —— 不建数组，别让默认路径为一个没人读的键付内存
  const pages: unknown[] | undefined = def.keepPages ? [] : undefined
  let current = params
  let lastPage: unknown
  let isFirst = true
  let interrupted: AmagiError | undefined
  const interval = def.pageIntervalMs ?? 0

  while (collected.length < target) {
    const pageSize = Math.min(target - collected.length, def.maxPageSize)
    const pageParams = { ...(current as Record<string, unknown>), [countKey]: pageSize } as TParams

    // 间隔只加在页与页之间：首页不等，最后一页之后也不等
    if (!isFirst && interval > 0 && options.sleep) await options.sleep(interval)

    const outcome = await runPage(pageParams, isFirst ? 'initial' : 'page')
    if (!outcome.ok) {
      // 首页失败没有可保留的；非 tolerate 端点保持「任一页失败即整体失败」
      if (isFirst || !options.tolerate) return { ok: false, error: outcome.error }
      interrupted = outcome.error
      break
    }

    const page = outcome.value
    lastPage = page
    pages?.push(page)

    const list = def.items(page)
    if (Array.isArray(list) && list.length > 0) collected.push(...list)

    // 顺序：先看平台说没有更多，再看本页是不是空的
    if (!def.hasMore(page)) break
    if (!Array.isArray(list) || list.length === 0) break

    current = def.nextParams(pageParams, page)
    isFirst = false
  }

  // target > 0 时循环至少进一次（collected 从 0 起 < target），首页失败已在循环里 return，
  // 所以走到这里 lastPage 恒有值
  return {
    ok: true,
    value: {
      empty: false,
      lastPage,
      items: collected.slice(0, target),
      ...(pages ? { pages } : {}),
      ...(interrupted ? { interrupted } : {})
    }
  }
}
