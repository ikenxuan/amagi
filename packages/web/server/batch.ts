/**
 * 批量录制那个循环。**抽出来只为了能测。**
 *
 * 它本身不发请求、不落盘、不看时钟 —— 发请求那一下、样本从哪来、睡多久全从参数进来。
 * 于是这四件被文档承诺过、却一条测试都没有的事可以钉住：
 *
 * 1. **同一批里后面几组能看见前面几组**（`alsoStored`）。批量录制不等于批量入库，
 *    前面几组只在内存里、一份都没落盘 —— 不传的话每组都只跟磁盘比，
 *    6 组同形样本会得到 6 份「带来了新形状」，人照着提示把 6 份全留下。
 *    那正是这个工具要消灭的那件事（两份 2.57 MB 的重复 B站 `comments`）。
 * 2. **只有 `ok` 的那些进基线**：被判定拒掉的（风控页、错误页）本来就不该参与类型。
 * 3. **每组各自 `try`，且每组恰好留下一条结果**。不包的话某一组抛异常会把整批带崩，而前面几组的
 *    待定样本已经进了内存队列 —— 它们此后既不能入库也不能丢弃，直到进程重启。
 *    「恰好一条」是同一件事的另一半：`outcomes` 与 `combinations` 一旦错开一条，
 *    界面按序号显示，从那组起后面全体错位。
 * 4. **最后一组之后不睡**。原先那版睡了，白等 1.5 秒。
 *
 * 泛型是刻意的：`P`（一组参数）与 `O`（一组结果）在这一层没有任何约束，
 * 所以测试拿两个字符串就能跑，不用造 `CorpusSample`、不用起服务。
 */

import type { CorpusSample } from '@ikenxuan/amagi-typegen'

export interface RunBatchInput<P, O> {
  /** 参数矩阵展开出来的各组 */
  combinations: readonly P[]
  /** 录一组。`alsoStored` 是这一批里前面几组已经录到、但还没落盘的样本 */
  record: (params: P, alsoStored: readonly CorpusSample[]) => Promise<O>
  /**
   * 从一组的结果里取出那份样本；这一组没留下样本（被拒、有脱敏残留）就回 `undefined`。
   *
   * **它抛出时那一组照样只有一条结果**（就是 `record` 回的那条），只是不进后面几组的基线 ——
   * 类型上没法要求一个回调不抛，所以那件事在实现里保证，见 {@link runBatch}。
   */
  sampleOf: (outcome: O) => CorpusSample | undefined
  /** 组间隔。固定间隔、不并发、不重试 —— 并发是最快触发风控的方式 */
  sleep: () => Promise<void>
  /** 某一组抛异常时用它造一个「这组被拒」的结果，免得整批少一条对不上号 */
  rejected: (reason: string) => O
}

export interface RunBatchResult<O> {
  /** 与 `combinations` 一一对应、顺序一致 —— 界面按序号显示，缺一条就对不上 */
  outcomes: O[]
  /** 抛过异常的那些组，人读的 */
  failures: string[]
}

/** 抛出来的东西不一定是 `Error`（第三方库里的 `throw '…'`），所以有这句兜底 */
const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : String(error))

export const runBatch = async <P, O>(input: RunBatchInput<P, O>): Promise<RunBatchResult<O>> => {
  const outcomes: O[] = []
  const failures: string[] = []
  const stored: CorpusSample[] = []
  for (const [index, params] of input.combinations.entries()) {
    // **`outcomes.push` 在这个循环里只出现一次。** 「一条参数组一条结果」是这个模块唯一的硬约束，
    // 而原先它靠「两条路各 push 一次、且不会都走到」维持 —— 那个前提是错的：
    // `record` 成功后先 push，再在**同一个 try 里**调 `sampleOf`，于是 `sampleOf` 一抛，
    // catch 就给同一组补上第二条 `rejected`，`outcomes` 比 `combinations` 多一条。
    let outcome: O
    try {
      outcome = await input.record(params, stored)
    } catch (error) {
      const reason = reasonOf(error)
      failures.push(`第 ${index + 1} 组：${reason}`)
      // `rejected` 自己抛的话没有第二条路可走 —— `O` 在这一层是不透明的泛型，造不出替代品。
      // 那就让它把整批带崩（响亮），而不是这一组悄悄少一条往下走（静默错位）
      outcome = input.rejected(`这一组处理时抛了异常：${reason}`)
    }
    outcomes.push(outcome)
    // **取样本单独一个 try。** 它也是调用方传进来的回调（真实那份走 `pending.get(...)`，
    // 今天抛不出来纯属运气），而它抛的时候这一组的结果**已经在 `outcomes` 里了**。
    // 不把那条结果换成 `rejected`：`record` 真的成功了，而 `pendingId` 是那份待定样本唯一的把手 ——
    // 换掉就等于把样本锁在内存里（既不能入库也不能丢弃）。代价只是这一组不进后面几组的基线，
    // 于是后面可能多报一次「带来了新形状」：吵，但不丢东西。
    try {
      const sample = input.sampleOf(outcome)
      if (sample !== undefined) stored.push(sample)
    } catch (error) {
      failures.push(`第 ${index + 1} 组：录到了，但取样本时抛了异常，这一组不进后面几组的基线：${reasonOf(error)}`)
    }
    if (index < input.combinations.length - 1) await input.sleep()
  }
  return { outcomes, failures }
}
