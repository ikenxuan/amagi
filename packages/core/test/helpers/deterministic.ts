/**
 * 把不确定源（Math.random / Date.now）钉死，让签名算法可快照。
 *
 * 这是 v6 -> v7 最重要的一条防线：签名算法一旦在重构中改变输出，
 * 线上功能立刻损坏，而这种破坏不会被类型检查或 lint 发现。
 */
import { vi } from 'vitest'

/** 固定时间戳：2026-01-02T03:04:05.678Z */
export const FIXED_NOW = 1767322445678

/**
 * 冻结 Date.now 与 Math.random。
 * Math.random 走一个确定性 LCG，保证多次取值互不相同但可复现。
 */
export const freezeEntropy = (now: number = FIXED_NOW, seed = 0x2545f491) => {
  let state = seed
  const random = () => {
    // 32 位 xorshift，纯确定性
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 0x100000000
  }

  vi.spyOn(Date, 'now').mockImplementation(() => now)
  vi.spyOn(Math, 'random').mockImplementation(random)

  return {
    now,
    /** 手动重置随机序列，便于在同一测试内比较两次调用 */
    reset: () => {
      state = seed
    }
  }
}
