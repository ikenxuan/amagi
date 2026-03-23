import type { KuaishouSecsState } from './hudr'

/**
 * 快手纯算法签名运行时状态。
 *
 * 这些值在进程启动后的生命周期内会持续复用，
 * 用于模拟页面侧 `$encode` 所依赖的全局状态。
 */
export type KuaishouPureRuntimeState = {
  catVersion: string
  count: number
  startupRandom: number
}

const KUAISHOU_DEFAULT_CAT_VERSION = '2'
const KUAISHOU_DEFAULT_COUNT = 100
const KUAISHOU_SECS_STACK_LIMIT = 100

let pureRuntimeState: KuaishouPureRuntimeState | null = null

const captureKuaishouEncodeStack = (): string => {
  try {
    throw new Error()
  } catch (error) {
    return error instanceof Error
      ? (error.stack ?? '')
      : ''
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
  return stack.length > KUAISHOU_SECS_STACK_LIMIT
    ? stack.slice(-KUAISHOU_SECS_STACK_LIMIT)
    : stack
}

/**
 * 构造快手 `window.SECS` 的纯算法等价状态。
 *
 * @param count - 当前签名计数器
 * @param stack - 可选的完整调用栈
 * @returns 包含 `s` 与 `c` 的 `SECS` 状态对象
 */
export const deriveKuaishouSecsState = (
  count: number,
  stack?: string
): Required<KuaishouSecsState> => {
  return {
    s: deriveKuaishouSecsStackTail(stack),
    c: count
  }
}

/**
 * 获取快手纯算法运行时状态。
 *
 * 首次调用时会初始化默认 `caver`、`count` 和 `startupRandom`，
 * 后续调用复用同一份状态。
 *
 * @returns 当前进程级的快手纯算法运行时状态
 */
export const getKuaishouPureRuntimeState = (): KuaishouPureRuntimeState => {
  if (pureRuntimeState) {
    return pureRuntimeState
  }

  const startupRandom = Date.now()

  pureRuntimeState = {
    catVersion: KUAISHOU_DEFAULT_CAT_VERSION,
    count: KUAISHOU_DEFAULT_COUNT,
    startupRandom
  }

  return pureRuntimeState
}
