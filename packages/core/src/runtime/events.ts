import { EventEmitter } from 'node:events'

import type { AmagiError } from '../contracts/error'
import type { AmagiMeta, RequestTrace } from '../contracts/meta'
import type { TransportEmitter, TransportEvent } from '../transport/client'

/**
 * 事件总线。
 *
 * 与 v6 `model/events.ts` 的两处关键差异：
 *
 * 1. **实例级，不再是全局单例。** v6 只有一个 `amagiEvents`，多个 client 实例
 *    共用它，于是并发调用时监听器分不清事件是哪个实例发出来的。v7 每个 client
 *    自带一条总线，互不串扰；静态 fetcher（不经过 client 实例）用
 *    {@link defaultEventBus}。
 * 2. **所有负载都带 `meta`。** v6 的 `api:success` / `api:error` 负载里没有任何
 *    关联 id（缺陷 10），多实例并发时无法归因。v7 每条负载都带
 *    {@link AmagiMeta}，`requestId` / `clientId` / `endpoint` / `attempts` 齐全。
 */

/** `http:request` 事件负载 */
export interface HttpRequestEvent {
  /** 元信息 */
  meta: AmagiMeta
  /** 这一条请求的明细 */
  trace: RequestTrace
}

/** `http:response` 事件负载 */
export interface HttpResponseEvent {
  /** 元信息 */
  meta: AmagiMeta
  /** 这一条请求的明细 */
  trace: RequestTrace
}

/** `api:success` 事件负载 */
export interface ApiSuccessEvent {
  /** 元信息 */
  meta: AmagiMeta
  /** 成功信封里的 data */
  data: unknown
}

/** `api:error` 事件负载 */
export interface ApiErrorEvent {
  /** 元信息 */
  meta: AmagiMeta
  /** 失败信封里的 error */
  error: AmagiError
}

/** 事件名 → 负载的映射。**每一项都带 `meta`** */
export interface AmagiEventMap {
  /** 一次底层请求即将发出 */
  'http:request': HttpRequestEvent
  /** 一次底层请求已经结束（含非 2xx 与传输失败） */
  'http:response': HttpResponseEvent
  /** 一次逻辑调用成功返回 */
  'api:success': ApiSuccessEvent
  /** 一次逻辑调用失败返回 */
  'api:error': ApiErrorEvent
}

/** 事件名 */
export type AmagiEventName = keyof AmagiEventMap

/** 全部事件名，用于遍历与穷尽性测试 */
export const AMAGI_EVENT_NAMES = ['http:request', 'http:response', 'api:success', 'api:error'] as const satisfies readonly AmagiEventName[]

/**
 * 类型安全的事件总线。
 *
 * 一个 client 实例一条。构造两条就是两条，彼此不共享监听器。
 */
export class EventBus {
  private readonly emitter = new EventEmitter()

  /**
   * @param id - 总线标识，仅用于诊断
   */
  constructor(readonly id: string = 'bus') {
    this.emitter.setMaxListeners(0)
  }

  /**
   * 投递一个事件
   * @param event - 事件名
   * @param payload - 事件负载，必须带 `meta`
   * @returns 是否有监听器处理了该事件
   */
  emit<K extends AmagiEventName>(event: K, payload: AmagiEventMap[K]): boolean {
    return this.emitter.emit(event, payload)
  }

  /**
   * 注册监听器
   * @param event - 事件名
   * @param listener - 处理函数
   * @returns 自身，便于链式调用
   */
  on<K extends AmagiEventName>(event: K, listener: (payload: AmagiEventMap[K]) => void): this {
    this.emitter.on(event, listener as (payload: unknown) => void)
    return this
  }

  /**
   * 注册一次性监听器
   * @param event - 事件名
   * @param listener - 处理函数
   * @returns 自身，便于链式调用
   */
  once<K extends AmagiEventName>(event: K, listener: (payload: AmagiEventMap[K]) => void): this {
    this.emitter.once(event, listener as (payload: unknown) => void)
    return this
  }

  /**
   * 移除监听器
   * @param event - 事件名
   * @param listener - 处理函数
   * @returns 自身，便于链式调用
   */
  off<K extends AmagiEventName>(event: K, listener: (payload: AmagiEventMap[K]) => void): this {
    this.emitter.off(event, listener as (payload: unknown) => void)
    return this
  }

  /**
   * 某个事件当前的监听器数量
   * @param event - 事件名
   * @returns 监听器数量
   */
  listenerCount(event: AmagiEventName): number {
    return this.emitter.listenerCount(event)
  }

  /**
   * 清空监听器
   * @param event - 事件名；省略则清空所有事件
   * @returns 自身，便于链式调用
   */
  removeAllListeners(event?: AmagiEventName): this {
    // Node 的 removeAllListeners 是按 arguments.length 判断的：显式传 undefined
    // 会被当成「清空名为 undefined 的事件」，必须分开调用
    if (event === undefined) this.emitter.removeAllListeners()
    else this.emitter.removeAllListeners(event)
    return this
  }
}

/**
 * 造一条新的事件总线
 * @param id - 总线标识，仅用于诊断
 * @returns 新总线
 */
export const createEventBus = (id?: string): EventBus => new EventBus(id)

/**
 * 全局默认事件总线。
 *
 * 只给**静态 fetcher**（`amagi.douyinFetcher.fetchXxx(...)` 这类不经过 client
 * 实例的调用）使用。client 实例一律自带总线，不碰这一条。
 */
export const defaultEventBus = createEventBus('global')

/**
 * 造一个交给 transport 的事件出口。
 *
 * transport 只知道「这一条请求的 trace」，`meta` 在这里补上 —— 这就是
 * 「所有负载带 meta」的落点，同时保持 `contracts ← transport ← runtime` 单向：
 * transport 不认识 EventBus，runtime 认识两边。
 * @param bus - 目标总线
 * @param meta - 取当前调用 meta 的函数（`attempts` / `durationMs` 会随调用推进而变，所以要惰性取）
 * @returns 可直接传给 `HttpClient` 的 `emit`
 */
export const createTransportEmitter = (bus: EventBus, meta: () => AmagiMeta): TransportEmitter => {
  return (event: TransportEvent, payload: { trace: RequestTrace }) => {
    bus.emit(event, { meta: meta(), trace: payload.trace })
  }
}
