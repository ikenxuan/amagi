import type { AmagiError } from '../contracts/error'
import type { AmagiMeta } from '../contracts/meta'
import type { LoginChallenge, LoginSession, LoginState, QrcodeLoginStrategy, SessionCtx, WatchHandlers, WatchOptions } from '../contracts/session'
import type { EventBus } from './events'

/**
 * 会话引擎。
 *
 * 05-session-and-polling.md 的落地：轮询循环 / `intervalMs` 退避 / `expiresAt`
 * 超时 / `AbortSignal` 取消 / challenge 应答编排全在这里，平台策略只写协议细节。
 *
 * 三条硬约束：
 * 1. **永不 reject**（除调用方回调自己抛出）—— 网络失败、轮询失败都收进
 *    `failed` 终态或失败信封。
 * 2. **challenge 编排在引擎**：遇到 challenge 阶段，没有 `onChallenge` 直接
 *    终止（`error.raw` 带 challenge）；有则等回调 → 调 `strategy.answer` →
 *    继续轮询。
 * 3. **busy 限频退避在引擎**：策略在 poll 结果里给 `intervalMs`（busy 时
 *    自己加倍），引擎统一按它 sleep，下限 `minIntervalMs`。
 */

/** 默认轮询间隔下限（毫秒） */
export const DEFAULT_MIN_INTERVAL_MS = 1000

/** 终止性 phase 集合（watch / 迭代跑到这里就结束） */
const TERMINAL_PHASES = new Set<LoginState['phase']>(['expired', 'rejected', 'risk', 'failed'])

/** 造一个引擎内部错误（取消 / 超时用） */
const sessionError = (kind: AmagiError['kind'], code: AmagiError['code'], message: string, raw?: unknown): AmagiError => ({
  kind,
  code,
  message,
  retryable: false,
  ...(raw === undefined ? {} : { raw })
})

/**
 * 创建会话引擎（一个策略实例一个引擎）。
 * @param strategy - 平台扫码登录策略
 * @param options - 引擎选项
 * @returns 登录会话
 */
export const createLoginSession = (strategy: QrcodeLoginStrategy, options: SessionEngineOptions = {}): LoginSession => {
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const bus = options.bus

  /** 引擎内部的会话状态 */
  let ctx: SessionCtx = options.initialCtx ?? strategy.deserialize('') // 空 blob 得到初始 ctx（策略保证）
  let currentState: LoginState | undefined
  let started = false
  let finished = false
  let pendingChallenge: LoginChallenge | undefined
  /** 最近一次 poll 给出的间隔 */
  let lastIntervalMs = DEFAULT_MIN_INTERVAL_MS

  /** 本会话的 requestId（所有会话事件共用，可归因） */
  const requestId = `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  /** 会话事件用的 meta */
  const metaOf = (): AmagiMeta => ({
    requestId,
    clientId: 'session',
    platform: strategy.platform,
    endpoint: `${strategy.platform}.login`,
    durationMs: 0,
    attempts: 0
  })

  /** 发会话事件（未注入出口时什么都不做） */
  const publish = (event: string, payload: Record<string, unknown>): void => {
    bus?.emit(event as never, { meta: metaOf(), ...payload } as never)
  }

  /** 取二维码（手动单步的第一步） */
  const start = async (): Promise<{ ok: true; state: LoginState; ctx: SessionCtx } | { ok: false; error: AmagiError }> => {
    if (started) return { ok: true, state: currentState!, ctx }
    const result = await strategy.start(ctx)
    if (!result.ok) {
      finished = true
      return { ok: false, error: result.error }
    }

    ctx = result.ctx
    started = true
    currentState = { phase: 'pending', qrcode: result.qrcode }
    publish('session:state', { state: currentState })
    return { ok: true, state: currentState, ctx }
  }

  /** 轮询一次，更新 currentState 与 ctx */
  const pollOnce = async (): Promise<{ ok: true; state: LoginState } | { ok: false; error: AmagiError }> => {
    const result = await strategy.poll(ctx)
    if (!result.ok) {
      const state: LoginState = { phase: 'failed', error: result.error }
      currentState = state
      finished = true
      publish('session:error', { error: result.error })
      return { ok: false, error: result.error }
    }

    ctx = result.ctx
    lastIntervalMs = Math.max(DEFAULT_MIN_INTERVAL_MS, result.intervalMs)
    currentState = result.state
    publish('session:state', { state: result.state })

    if (result.state.phase === 'challenge') {
      pendingChallenge = result.state.challenge
    }
    if (TERMINAL_PHASES.has(result.state.phase)) {
      finished = true
    }
    return { ok: true, state: result.state }
  }

  /** 手动单步：轮询一次 */
  const next = async (): Promise<{ ok: true; state: LoginState } | { ok: false; error: AmagiError }> => {
    if (!started) {
      const startedResult = await start()
      if (!startedResult.ok) return { ok: false, error: startedResult.error }
      return { ok: true, state: startedResult.state }
    }
    if (finished) return { ok: true, state: currentState! }
    return pollOnce()
  }

  /**
   * challenge 阶段应答，推进状态机。
   * @param _answer - 应答（形状由调用方在编译期约束，运行时透传给策略）
   */
  const answer = async <C extends LoginChallenge>(_answer: ChallengeAnswerOf<C>): Promise<void> => {
    if (!pendingChallenge || !strategy.answer) return
    const challenge = pendingChallenge
    pendingChallenge = undefined

    const result = await strategy.answer(ctx, challenge, _answer as unknown)
    if (!result.ok) {
      currentState = { phase: 'failed', error: result.error }
      finished = true
      publish('session:error', { error: result.error })
      return
    }
    ctx = result.ctx
  }

  /**
   * 回调出口：一直跑到终态。
   *
   * 无 `onChallenge` 时遇到 challenge 直接终止（`error.raw` 带 challenge）。
   * 返回终态信封，永不 reject（除调用方回调自己抛出）。
   * @param options - 回调与选项
   * @returns 成功（credential）或失败（error）信封
   */
  const watch = async (options?: WatchOptions): Promise<WatchOutcome> => {
    const handlers: WatchHandlers = options ?? {}
    const signal = options?.signal
    const minIntervalMs = options?.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS

    const startedResult = await start()
    if (!startedResult.ok) {
      await handlers.onError?.(startedResult.error, { phase: 'failed', error: startedResult.error })
      return { ok: false, error: startedResult.error }
    }

    const qrcode = ctx.qrcode!
    const timeoutMs = options?.timeoutMs ?? Math.max(0, qrcode.expiresAt - now())
    const deadline = now() + timeoutMs

    await handlers.onQrcode?.(qrcode)

    for (;;) {
      if (signal?.aborted) {
        const error = sessionError('internal', 'INTERNAL_ERROR', '登录会话已取消')
        currentState = { phase: 'failed', error }
        publish('session:error', { error })
        await handlers.onError?.(error, currentState)
        return { ok: false, error }
      }

      if (now() >= deadline) {
        const error = sessionError('auth', 'COOKIE_EXPIRED', '二维码已过期，请重新开始')
        currentState = { phase: 'expired' }
        publish('session:state', { state: currentState })
        await handlers.onError?.(error, currentState)
        return { ok: false, error }
      }

      const polled = await pollOnce()
      if (!polled.ok) {
        await handlers.onError?.(polled.error, currentState!)
        return { ok: false, error: polled.error }
      }

      const state = polled.state
      await handlers.onState?.(state)

      if (state.phase === 'challenge') {
        if (!handlers.onChallenge) {
          // 没有 onChallenge：终止，error.raw 带 challenge
          const error = sessionError('auth', 'CAPTCHA_REQUIRED', '需要完成二次验证，但未提供 onChallenge 回调', state.challenge)
          currentState = { phase: 'failed', error }
          publish('session:error', { error })
          await handlers.onError?.(error, currentState)
          return { ok: false, error }
        }
        const answerValue = await handlers.onChallenge(state.challenge)
        await answer(answerValue as never)
        continue
      }

      if (state.phase === 'scanned') {
        await handlers.onScanned?.()
      }

      if (state.phase === 'success') {
        await handlers.onSuccess?.(state.credential)
        publish('session:success', { credential: state.credential })
        return { ok: true, credential: state.credential }
      }

      if (TERMINAL_PHASES.has(state.phase)) {
        const error: AmagiError =
          state.phase === 'failed'
            ? state.error
            : state.phase === 'risk'
              ? sessionError('risk', 'RISK_CONTROL', state.reason)
              : sessionError('auth', 'COOKIE_EXPIRED', state.phase)
        publish('session:error', { error })
        await handlers.onError?.(error, state)
        return { ok: false, error }
      }

      // 未到终态：按策略给的间隔退避后继续轮询
      await sleep(Math.max(minIntervalMs, lastIntervalMs))
    }
  }

  /** 序列化为 opaque string */
  const serialize = (): string => strategy.serialize(ctx)

  /** AsyncIterable 出口 */
  const iterator = (): AsyncIterator<LoginState> => {
    let done = false
    return {
      next: async (): Promise<IteratorResult<LoginState>> => {
        if (done) return { done: true, value: undefined as never }
        const result = await next()
        if (!result.ok) {
          done = true
          return { done: true, value: undefined as never }
        }
        const state = result.state
        if (state.phase === 'success' || TERMINAL_PHASES.has(state.phase)) {
          done = true
        }
        return { done: false, value: state }
      }
    }
  }

  return {
    start,
    next,
    answer: answer as LoginSession['answer'],
    watch,
    serialize,
    [Symbol.asyncIterator]: iterator
  }
}

/** watch 的返回信封 */
export type WatchOutcome = { ok: true; credential: import('../contracts/session').Credential } | { ok: false; error: AmagiError }

/** 引擎构造选项 */
export interface SessionEngineOptions {
  /** 事件总线。不传则不发事件 */
  bus?: EventBus
  /** 时钟，测试可注入 */
  now?: () => number
  /** 睡眠函数，测试可注入 */
  sleep?: (ms: number) => Promise<void>
  /** 初始会话上下文（带可用的 send）。缺省用 `strategy.deserialize('')` */
  initialCtx?: SessionCtx
}

/** answer 的形状：按 challenge 的 kind 在编译期约束 */
type ChallengeAnswerOf<C extends LoginChallenge> = C extends { kind: 'sms' }
  ? { code: string }
  : C extends { kind: 'captcha' }
    ? { ticket: string; randstr?: string }
    : never
