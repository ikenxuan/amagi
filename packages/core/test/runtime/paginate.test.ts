import type { PaginateDef } from 'amagi/contracts/endpoint'
import { type PageOutcome, resolveTarget, runPaginated } from 'amagi/runtime/paginate'
/**
 * runtime/paginate 的契约。
 *
 * 六条判据：单页足够 / 跨页累积 / hasMore 提前停止 / 空列表停止 /
 * 按 number 截断 / 每页重新签名。算法与 v6 fetchPaginatedData 对齐 ——
 * 翻页是行为，不是重构对象，改了就是改了平台请求次数与返回条数。
 */
import { describe, expect, it } from 'vitest'

interface Params {
  id: string
  number: number
  cursor: number
}

/** 一页假响应 */
interface Page {
  list: number[]
  has_more: number
  cursor: number
}

const def: PaginateDef<Params> = {
  maxPageSize: 20,
  items: (page) => (page as Page).list,
  hasMore: (page) => (page as Page).has_more === 1,
  nextParams: (params, page) => ({ ...params, cursor: (page as Page).cursor })
}

/**
 * 造一个按脚本回应的 runPage，并记录每次收到的参数与 reason
 * @param script - 每一页的响应
 */
const scripted = (script: Page[]) => {
  const calls: Array<{ params: Params; reason: string }> = []
  const runPage = async (params: Params, reason: string): Promise<PageOutcome> => {
    const page = script[Math.min(calls.length, script.length - 1)]
    calls.push({ params: { ...params }, reason })
    return { ok: true, value: page }
  }
  return { calls, runPage: runPage as never }
}

/** 生成 n 个条目 */
const listOf = (n: number, from = 0): number[] => Array.from({ length: n }, (_, i) => from + i)

describe('runtime/paginate - 单页足够', () => {
  it('目标条数不超过单页上限时只发一个请求', async () => {
    const h = scripted([{ list: listOf(10), has_more: 1, cursor: 10 }])
    const r = await runPaginated(def, { id: 'u1', number: 10, cursor: 0 }, h.runPage)

    expect(h.calls).toHaveLength(1)
    expect(r.ok && r.value.items).toEqual(listOf(10))
    expect(r.ok && r.value.pages).toHaveLength(1)
  })

  it('首个请求的条数就是目标条数（不是先按上限要一整页）', async () => {
    const h = scripted([{ list: listOf(7), has_more: 1, cursor: 7 }])
    await runPaginated(def, { id: 'u1', number: 7, cursor: 0 }, h.runPage)

    expect(h.calls[0].params.number).toBe(7)
  })

  it('目标条数超过单页上限时，首个请求按上限要', async () => {
    const h = scripted([{ list: listOf(20), has_more: 0, cursor: 20 }])
    await runPaginated(def, { id: 'u1', number: 55, cursor: 0 }, h.runPage)

    expect(h.calls[0].params.number).toBe(20)
  })

  it('第一页的 reason 是 initial', async () => {
    const h = scripted([{ list: listOf(5), has_more: 0, cursor: 5 }])
    await runPaginated(def, { id: 'u1', number: 5, cursor: 0 }, h.runPage)

    expect(h.calls[0].reason).toBe('initial')
  })
})

describe('runtime/paginate - 跨页累积', () => {
  it('目标 55 / 单页 20 → 三次请求，条数依次 20 / 20 / 15', async () => {
    const h = scripted([
      { list: listOf(20, 0), has_more: 1, cursor: 20 },
      { list: listOf(20, 20), has_more: 1, cursor: 40 },
      { list: listOf(15, 40), has_more: 1, cursor: 55 }
    ])
    const r = await runPaginated(def, { id: 'u1', number: 55, cursor: 0 }, h.runPage)

    expect(h.calls.map((c) => c.params.number)).toEqual([20, 20, 15])
    expect(r.ok && r.value.items).toHaveLength(55)
    expect(r.ok && r.value.items[54]).toBe(54)
  })

  it('游标由 nextParams 从上一页的响应里带过去', async () => {
    const h = scripted([
      { list: listOf(20, 0), has_more: 1, cursor: 111 },
      { list: listOf(20, 20), has_more: 1, cursor: 222 },
      { list: listOf(20, 40), has_more: 1, cursor: 333 }
    ])
    await runPaginated(def, { id: 'u1', number: 60, cursor: 0 }, h.runPage)

    expect(h.calls.map((c) => c.params.cursor)).toEqual([0, 111, 222])
  })

  it('第二页起 reason 是 page', async () => {
    const h = scripted([
      { list: listOf(20), has_more: 1, cursor: 1 },
      { list: listOf(20), has_more: 1, cursor: 2 },
      { list: listOf(20), has_more: 1, cursor: 3 }
    ])
    await runPaginated(def, { id: 'u1', number: 60, cursor: 0 }, h.runPage)

    expect(h.calls.map((c) => c.reason)).toEqual(['initial', 'page', 'page'])
  })

  it('pages 保留每一页原始响应，lastPage 是最后一页', async () => {
    const h = scripted([
      { list: listOf(20), has_more: 1, cursor: 1 },
      { list: listOf(20), has_more: 0, cursor: 2 }
    ])
    const r = await runPaginated(def, { id: 'u1', number: 60, cursor: 0 }, h.runPage)

    expect(r.ok && r.value.pages).toHaveLength(2)
    expect(r.ok && (r.value.lastPage as Page).cursor).toBe(2)
  })

  it('其余参数在翻页中保持不变', async () => {
    const h = scripted([
      { list: listOf(20), has_more: 1, cursor: 1 },
      { list: listOf(20), has_more: 0, cursor: 2 }
    ])
    await runPaginated(def, { id: 'u1', number: 40, cursor: 0 }, h.runPage)

    expect(h.calls.every((c) => c.params.id === 'u1')).toBe(true)
  })
})

describe('runtime/paginate - hasMore 提前停止', () => {
  it('平台说没有更多时立刻停，即使还没取够', async () => {
    const h = scripted([
      { list: listOf(20, 0), has_more: 1, cursor: 20 },
      { list: listOf(5, 20), has_more: 0, cursor: 25 }
    ])
    const r = await runPaginated(def, { id: 'u1', number: 100, cursor: 0 }, h.runPage)

    expect(h.calls).toHaveLength(2)
    expect(r.ok && r.value.items).toHaveLength(25)
  })

  it('第一页就说没有更多时只发一个请求', async () => {
    const h = scripted([{ list: listOf(3), has_more: 0, cursor: 3 }])
    const r = await runPaginated(def, { id: 'u1', number: 100, cursor: 0 }, h.runPage)

    expect(h.calls).toHaveLength(1)
    expect(r.ok && r.value.items).toHaveLength(3)
  })

  it('本页有数据但 hasMore 为假时，这页的数据仍然算进结果', async () => {
    const h = scripted([{ list: listOf(9), has_more: 0, cursor: 9 }])
    const r = await runPaginated(def, { id: 'u1', number: 100, cursor: 0 }, h.runPage)

    expect(r.ok && r.value.items).toEqual(listOf(9))
  })
})

describe('runtime/paginate - 空列表停止', () => {
  it('本页空列表时停止，即使平台还说有更多', async () => {
    const h = scripted([
      { list: listOf(20, 0), has_more: 1, cursor: 20 },
      { list: [], has_more: 1, cursor: 20 }
    ])
    const r = await runPaginated(def, { id: 'u1', number: 100, cursor: 0 }, h.runPage)

    expect(h.calls).toHaveLength(2)
    expect(r.ok && r.value.items).toHaveLength(20)
  })

  it('第一页就是空列表时只发一个请求，结果为空', async () => {
    const h = scripted([{ list: [], has_more: 1, cursor: 0 }])
    const r = await runPaginated(def, { id: 'u1', number: 100, cursor: 0 }, h.runPage)

    expect(h.calls).toHaveLength(1)
    expect(r.ok && r.value.items).toEqual([])
  })

  it('items 返回非数组时也按到底处理，不会崩', async () => {
    const weird: PaginateDef<Params> = { ...def, items: () => undefined as unknown as unknown[] }
    const h = scripted([{ list: listOf(5), has_more: 1, cursor: 5 }])
    const r = await runPaginated(weird, { id: 'u1', number: 100, cursor: 0 }, h.runPage)

    expect(h.calls).toHaveLength(1)
    expect(r.ok && r.value.items).toEqual([])
  })
})

describe('runtime/paginate - 按 number 截断', () => {
  it('平台多给了也按目标条数截断', async () => {
    const h = scripted([{ list: listOf(20), has_more: 0, cursor: 20 }])
    const r = await runPaginated(def, { id: 'u1', number: 7, cursor: 0 }, h.runPage)

    expect(r.ok && r.value.items).toEqual(listOf(7))
  })

  it('跨页累积后同样截断到目标条数', async () => {
    const h = scripted([
      { list: listOf(20, 0), has_more: 1, cursor: 20 },
      { list: listOf(20, 20), has_more: 1, cursor: 40 }
    ])
    const r = await runPaginated(def, { id: 'u1', number: 25, cursor: 0 }, h.runPage)

    expect(h.calls.map((c) => c.params.number)).toEqual([20, 5])
    expect(r.ok && r.value.items).toHaveLength(25)
  })

  it('number 为 0 时一个请求都不发（与 v6 一致）', async () => {
    const h = scripted([{ list: listOf(20), has_more: 1, cursor: 20 }])
    const r = await runPaginated(def, { id: 'u1', number: 0, cursor: 0 }, h.runPage)

    expect(h.calls).toHaveLength(0)
    expect(r.ok && r.value.items).toEqual([])
    expect(r.ok && r.value.pages).toEqual([])
    expect(r.ok && r.value.lastPage).toBeUndefined()
  })

  it('limitParam 缺省为 number，可以改指到别的参数', async () => {
    const byCount: PaginateDef<{ count: number; number: number }> = {
      maxPageSize: 20,
      limitParam: 'count',
      items: (page) => (page as Page).list,
      hasMore: (page) => (page as Page).has_more === 1,
      nextParams: (params) => params
    }
    const calls: Array<Record<string, unknown>> = []
    const runPage = async (params: { count: number; number: number }): Promise<PageOutcome> => {
      calls.push({ ...params })
      return { ok: true, value: { list: listOf(20), has_more: 0, cursor: 1 } }
    }

    const r = await runPaginated(byCount, { count: 6, number: 999 }, runPage as never)

    expect(calls[0].count).toBe(6)
    expect(r.ok && r.value.items).toHaveLength(6)
  })

  it('countParam 可以与 limitParam 分开：读一个、写另一个', async () => {
    const split: PaginateDef<{ number: number; page_size: number }> = {
      maxPageSize: 20,
      limitParam: 'number',
      countParam: 'page_size',
      items: (page) => (page as Page).list,
      hasMore: (page) => (page as Page).has_more === 1,
      nextParams: (params) => params
    }
    const calls: Array<Record<string, unknown>> = []
    const runPage = async (params: { number: number; page_size: number }): Promise<PageOutcome> => {
      calls.push({ ...params })
      return { ok: true, value: { list: listOf(20), has_more: 1, cursor: 1 } }
    }

    await runPaginated(split, { number: 30, page_size: 0 }, runPage as never)

    expect(calls.map((c) => c.page_size)).toEqual([20, 10])
    expect(calls.every((c) => c.number === 30)).toBe(true)
  })

  it('resolveTarget：缺省退回单页上限，负数归 0，小数截断', () => {
    expect(resolveTarget(undefined, 20)).toBe(20)
    expect(resolveTarget(null, 20)).toBe(20)
    expect(resolveTarget(7, 20)).toBe(7)
    expect(resolveTarget('9', 20)).toBe(9)
    expect(resolveTarget(-5, 20)).toBe(0)
    expect(resolveTarget(7.9, 20)).toBe(7)
    expect(resolveTarget('abc', 20)).toBe(20)
  })
})

describe('runtime/paginate - 失败页', () => {
  it('任一页失败即整体失败，不再继续翻', async () => {
    let n = 0
    const runPage = async (): Promise<PageOutcome> => {
      n += 1
      if (n === 2) {
        return { ok: false, error: { kind: 'auth', code: 'COOKIE_EXPIRED', message: '失效', retryable: false } }
      }
      return { ok: true, value: { list: listOf(20), has_more: 1, cursor: n } }
    }

    const r = await runPaginated(def, { id: 'u1', number: 100, cursor: 0 }, runPage as never)

    expect(n).toBe(2)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error.code).toBe('COOKIE_EXPIRED')
  })

  it('runPage 抛出的异常原样往外传（由 execute 唯一的 catch 归因）', async () => {
    const boom = new Error('page 炸了')
    await expect(
      runPaginated(def, { id: 'u1', number: 100, cursor: 0 }, (async () => {
        throw boom
      }) as never)
    ).rejects.toBe(boom)
  })
})
