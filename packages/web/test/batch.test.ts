/**
 * `runBatch` —— 批量录制那个循环。
 *
 * 这些用例不发请求、不落盘、不真的睡：`record` / `sleep` / `sampleOf` 全是参数，
 * 所以「同一批里后面几组能不能看见前面几组」这件事可以直接断言，而不用起服务录 24 组。
 * 它原先长在 `handle` 里、一条测试都没有，而那正是「6 组同形样本全被报成有新形状」
 * 这个 bug 能活下来的原因。
 */

import type { CorpusSample } from '@ikenxuan/amagi-typegen'
import { describe, expect, it } from 'vitest'

import { runBatch } from '../server/batch'

/** 只当身份用，不看内容 —— `runBatch` 对样本本体没有任何要求 */
const fakeSample = (id: string): CorpusSample => ({ id }) as unknown as CorpusSample

interface Recorded {
  params: string
  /** 录这一组时它看到的基线，摊平成 id 好断言 */
  sawStored: string[]
}

/** 每组都「录成功」并留下一份样本，样本 id 就是参数 */
const alwaysOk = () => {
  const seen: Recorded[] = []
  const run = (combinations: readonly string[]) =>
    runBatch<string, { params: string; ok: boolean }>({
      combinations,
      record: async (params, alsoStored) => {
        seen.push({ params, sawStored: alsoStored.map((sample) => (sample as unknown as { id: string }).id) })
        return { params, ok: true }
      },
      sampleOf: (outcome) => (outcome.ok ? fakeSample(outcome.params) : undefined),
      sleep: async () => {
        slept += 1
      },
      rejected: (reason) => ({ params: reason, ok: false })
    })
  let slept = 0
  return { run, seen, sleptCount: () => slept }
}

describe('同一批里后面几组能看见前面几组', () => {
  it('**第 N 组的基线是前 N−1 组** —— 不这样的话 6 组同形样本会得到 6 份「有新形状」', async () => {
    const harness = alwaysOk()
    await harness.run(['a', 'b', 'c'])
    expect(harness.seen.map((entry) => entry.sawStored)).toEqual([[], ['a'], ['a', 'b']])
  })

  it('第一组的基线是空的 —— 它只跟磁盘上那些比（磁盘那半由调用方拼进去）', async () => {
    const harness = alwaysOk()
    await harness.run(['only'])
    expect(harness.seen[0]!.sawStored).toEqual([])
  })

  it('被拒的那组不进基线 —— 风控页 / 错误页本来就不该参与类型', async () => {
    const seen: string[][] = []
    await runBatch<string, { params: string; ok: boolean }>({
      combinations: ['a', 'bad', 'c'],
      record: async (params, alsoStored) => {
        seen.push(alsoStored.map((sample) => (sample as unknown as { id: string }).id))
        return { params, ok: params !== 'bad' }
      },
      sampleOf: (outcome) => (outcome.ok ? fakeSample(outcome.params) : undefined),
      sleep: async () => {},
      rejected: (reason) => ({ params: reason, ok: false })
    })
    // 第三组看到的只有 `a`，`bad` 那一组没进去
    expect(seen).toEqual([[], ['a'], ['a']])
  })
})

describe('一组炸了不带崩整批', () => {
  it('抛异常的那组换成一条「被拒」，结果条数仍与参数组数一一对应', async () => {
    const { outcomes, failures } = await runBatch<string, { params: string; ok: boolean }>({
      combinations: ['a', 'boom', 'c'],
      record: async (params) => {
        if (params === 'boom') throw new Error('typegen 那边抛了')
        return { params, ok: true }
      },
      sampleOf: (outcome) => (outcome.ok ? fakeSample(outcome.params) : undefined),
      sleep: async () => {},
      rejected: (reason) => ({ params: reason, ok: false })
    })
    // 条数对得上是硬要求：界面按序号显示，少一条就全体错位
    expect(outcomes).toHaveLength(3)
    expect(outcomes.map((outcome) => outcome.ok)).toEqual([true, false, true])
    expect(failures).toEqual(['第 2 组：typegen 那边抛了'])
    expect(outcomes[1]!.params).toContain('typegen 那边抛了')
  })

  it('非 Error 抛出物也说得清（`String()` 兜底）', async () => {
    const { failures } = await runBatch<string, { ok: boolean }>({
      combinations: ['x'],
      record: async () => {
        // 故意抛一个非 Error：真实来源是第三方库里的 `throw '…'`，而兜底那行就是为它写的
        throw 'a string'
      },
      sampleOf: () => undefined,
      sleep: async () => {},
      rejected: () => ({ ok: false })
    })
    expect(failures).toEqual(['第 1 组：a string'])
  })
})

describe('取样本那一下抛异常，也不能让结果多出一条', () => {
  it('**`sampleOf` 抛出时 `outcomes` 仍与 `combinations` 一一对应** —— 多一条的话界面从这组起全体错位', async () => {
    const { outcomes } = await runBatch<string, { params: string; ok: boolean }>({
      combinations: ['a', 'b'],
      record: async (params) => ({ params, ok: true }),
      // `sampleOf` 是调用方传进来的回调，类型上没有「不许抛」这条约束 ——
      // 真实那份走 `pending.get(...)`，今天抛不出来纯属运气。它抛的时候这一组**已经**
      // push 过一条结果了，外层 catch 再补一条 `rejected` 就多出一条
      sampleOf: (outcome) => {
        if (outcome.params === 'a') throw new Error('取样本时抛了')
        return fakeSample(outcome.params)
      },
      sleep: async () => {},
      rejected: (reason) => ({ params: reason, ok: false })
    })
    expect(outcomes).toHaveLength(2)
    expect(outcomes.map((outcome) => outcome.params)).toEqual(['a', 'b'])
  })

  it('抛出那一组只是不进基线，结果本体留着 —— `pendingId` 是那份待定样本唯一的把手', async () => {
    const seen: string[][] = []
    const { outcomes, failures } = await runBatch<string, { params: string; ok: boolean }>({
      combinations: ['a', 'b', 'c'],
      record: async (params, alsoStored) => {
        seen.push(alsoStored.map((sample) => (sample as unknown as { id: string }).id))
        return { params, ok: true }
      },
      sampleOf: (outcome) => {
        if (outcome.params === 'a') throw new Error('pending 里没有这份样本')
        return fakeSample(outcome.params)
      },
      sleep: async () => {},
      rejected: (reason) => ({ params: reason, ok: false })
    })
    // 第一组没进基线（第二组看到的还是空的），但它自己那条结果不变成「被拒」
    expect(seen).toEqual([[], [], ['b']])
    expect(outcomes.map((outcome) => outcome.ok)).toEqual([true, true, true])
    expect(failures).toEqual(['第 1 组：录到了，但取样本时抛了异常，这一组不进后面几组的基线：pending 里没有这份样本'])
  })
})

describe('组间隔', () => {
  it('**最后一组之后不睡** —— 原先那版睡了，白等 1.5 秒', async () => {
    const harness = alwaysOk()
    await harness.run(['a', 'b', 'c'])
    expect(harness.sleptCount()).toBe(2)
  })

  it('只有一组时一次都不睡', async () => {
    const harness = alwaysOk()
    await harness.run(['a'])
    expect(harness.sleptCount()).toBe(0)
  })

  it('零组时什么都不做，也不炸', async () => {
    const harness = alwaysOk()
    const { outcomes, failures } = await harness.run([])
    expect(outcomes).toEqual([])
    expect(failures).toEqual([])
    expect(harness.sleptCount()).toBe(0)
  })

  it('炸掉的那一组之后照样睡 —— 间隔是给风控的，不是给成功率的', async () => {
    let slept = 0
    await runBatch<string, { ok: boolean }>({
      combinations: ['boom', 'next'],
      record: async (params) => {
        if (params === 'boom') throw new Error('炸')
        return { ok: true }
      },
      sampleOf: () => undefined,
      sleep: async () => {
        slept += 1
      },
      rejected: () => ({ ok: false })
    })
    expect(slept).toBe(1)
  })
})
