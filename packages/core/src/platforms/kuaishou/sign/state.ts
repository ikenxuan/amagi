import type { KuaishouSecsState } from './hudr'

/**
 * 快手纯算法签名运行时状态。
 *
 * v7 修 #40/#41/#42：**状态随签名器实例，不再是模块单例** ——
 * 每个 client 持有一个 `KuaishouSignState`，两个 client 的 `count` /
 * `startupRandom` / 匿名 `kww` 互不干扰（v6 是模块级 `let`，同进程内共享）。
 */
export type KuaishouPureRuntimeState = {
  catVersion: string
  count: number
  startupRandom: number
}

const KUAISHOU_DEFAULT_CAT_VERSION = '2'
const KUAISHOU_DEFAULT_COUNT = 100
const KUAISHOU_SECS_STACK_LIMIT = 100

const captureKuaishouEncodeStack = (): string => {
  try {
    throw new Error()
  } catch (error) {
    return error instanceof Error ? (error.stack ?? '') : ''
  }
}

/**
 * 计算快手 `SECS.s` 所需的调用栈尾部。
 *
 * 真实页面会取 `Error().stack` 的最后 100 个字符，
 * 这里保持同样的裁剪规则。
 *
 * @param stack - 可选的完整调用栈；不传时会即时捕获
 * @returns 用于 `SECS.s` 的栈尾字符串
 */
export const deriveKuaishouSecsStackTail = (stack = captureKuaishouEncodeStack()): string => {
  return stack.length > KUAISHOU_SECS_STACK_LIMIT ? stack.slice(-KUAISHOU_SECS_STACK_LIMIT) : stack
}

/**
 * 构造快手 `window.SECS` 的纯算法等价状态。
 *
 * @param count - 当前签名计数器
 * @param stack - 可选的完整调用栈
 * @returns 包含 `s` 与 `c` 的 `SECS` 状态对象
 */
export const deriveKuaishouSecsState = (count: number, stack?: string): Required<KuaishouSecsState> => {
  return {
    s: deriveKuaishouSecsStackTail(stack),
    c: count
  }
}

/**
 * 创建一份独立的快手签名运行时状态。
 *
 * 与 v6 `getKuaishouPureRuntimeState()` 的差异：v6 是模块级单例（首次调用
 * 初始化后复用，`count` 在测试之间共享 —— #41/#42），v7 每次调用创建
 * 独立副本，`count` / `startupRandom` 随签名器实例走。
 *
 * @returns 新的签名运行时状态（`count` 从默认值 100 起步）
 */
export const createKuaishouPureRuntimeState = (): KuaishouPureRuntimeState => ({
  catVersion: KUAISHOU_DEFAULT_CAT_VERSION,
  count: KUAISHOU_DEFAULT_COUNT,
  startupRandom: Date.now()
})

/**
 * 获取一份快照用的运行时状态（兼容 v6 行为，供对照测试使用）。
 *
 * 注意：这是模块级单例，与 v6 一致 —— v7 生产代码用
 * `createKuaishouPureRuntimeState()` 创建随实例的状态，不要用这个。
 * @returns 进程级快手纯算法运行时状态
 */
export const getKuaishouPureRuntimeState = (): KuaishouPureRuntimeState => {
  if (pureRuntimeState) {
    return pureRuntimeState
  }

  pureRuntimeState = createKuaishouPureRuntimeState()
  return pureRuntimeState
}

let pureRuntimeState: KuaishouPureRuntimeState | null = null
