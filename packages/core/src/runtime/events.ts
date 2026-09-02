import { EventEmitter } from 'node:events'

import type { AmagiError, AmagiErrorCode } from '../contracts/error'
import type { AmagiMeta, RequestTrace } from '../contracts/meta'
import type { TransportEmitter, TransportEvent, TransportEventPayload } from '../transport/client'

/**
 * 事件总线。
 *
 * 与 v6 `model/events.ts` 的三处关键差异：
 *
 * 1. **实例级，不再是全局单例。** v6 只有一个 `amagiEvents`，多个 client 实例
 *    共用它，于是并发调用时监听器分不清事件是哪个实例发出来的。v7 每个 client
 *    自带一条总线，互不串扰；静态 fetcher（不经过 client 实例）用
 *    {@link defaultEventBus}。
 * 2. **调用相关的负载都带 `meta`。** v6 的 `api:success` / `api:error` 负载里没有
 *    任何关联 id（缺陷 10），多实例并发时无法归因。v7 每条负载都带
 *    {@link AmagiMeta}，`requestId` / `clientId` / `endpoint` / `attempts` 齐全。
 *    唯一的例外是 `log:*`：日志可能不属于任何一次调用（服务启动那条就不属于），
 *    所以它的 `meta` 是可选的。
 * 3. **事件名与 v6 的 12 个逐名对齐（阶段 9.1）。** v6 `AmagiEventType` 的每个
 *    取值在这条总线上都能 `on`，监听写法从全局单例搬到实例总线时不会有事件名
 *    静默消失。**名字对齐、负载是 v7 形状**：带 `meta` / `trace`，不带
 *    `timestamp`（形状差异逐条记在 docs/v7/06-migration.md）。
 *
 * 12 个名字里 `log:info` / `log:debug` 在 v7 核心链路**没有 emit 点**，
 * 见 {@link UNEMITTED_BUS_EVENT_NAMES}。
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

/**
 * `http:error` 事件负载：请求拿到了响应，但状态码不是 2xx。
 *
 * 与 `network:error` 的分工：这条是「回来了但不对」（有状态码），
 * `network:error` 是「根本没回来」（没有状态码）。同一条请求会先有
 * `http:response`，再有 `http:error`。
 */
export interface HttpErrorEvent {
  /** 元信息 */
  meta: AmagiMeta
  /** 这一条请求的明细 */
  trace: RequestTrace
  /** 平台返回的状态码（恒非 2xx） */
  status: number
}

/** `network:retry` 事件负载：一次失败即将退避重试 */
export interface NetworkRetryEvent {
  /** 元信息 */
  meta: AmagiMeta
  /** 刚刚失败的那条请求的明细 */
  trace: RequestTrace
  /** 归因错误码（`NETWORK_ERROR` / `TIMEOUT` / `RATE_LIMITED` / `PLATFORM_UNAVAILABLE`） */
  code: AmagiErrorCode
  /** 传输层 errno（`ECONNRESET` 这类）；拿到了响应就没有 */
  errno?: string
  /** 平台返回的状态码；请求根本没发出就没有 */
  status?: number
  /** 这是第几次重试（`1` = 第一次重试），与 v6 `NetworkRetryEventData.attempt` 同义 */
  attempt: number
  /** 允许的最大重试次数 */
  maxRetries: number
  /** 这次退避要等的毫秒数 */
  delayMs: number
}

/** `network:error` 事件负载：请求始终没拿到响应，退避已用尽 */
export interface NetworkErrorEvent {
  /** 元信息 */
  meta: AmagiMeta
  /** 最后一条请求的明细 */
  trace: RequestTrace
  /** 归因错误码 */
  code: 'NETWORK_ERROR' | 'TIMEOUT'
  /** 传输层 errno */
  errno?: string
  /** 失败文案 */
  message: string
  /** 这次调用一共发了几次请求 */
  attempts: number
}

/**
 * `log:*` 事件负载（5 个级别共用）。
 *
 * 与 v6 `LogEventData` 的差别：`timestamp: Date` 换成可选的 `meta`
 * —— 日志属于哪一次调用比它发生在哪一毫秒更有用，而不属于任何调用的日志
 * （如服务启动）本来就没有 `meta`。
 */
export interface LogEvent {
  /** 日志级别，与事件名的后半段一致 */
  level: 'info' | 'warn' | 'error' | 'debug' | 'mark'
  /** 日志消息 */
  message: string
  /** 附加参数 */
  args?: unknown[]
  /** 元信息；不属于任何一次调用的日志没有这一项 */
  meta?: AmagiMeta
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

/**
 * 事件名 → 负载的映射（**实例级总线**用；v6 `model/events.ts` 的
 * `AmagiEventMap` 描述的是全局单例 `amagiEvents`，是另一张表）。
 *
 * 名字刻意不叫 `AmagiEventMap`：v6 那个仍是顶层导出的公开类型（形状不变，
 * 见 06-migration「保留且形状不变」），两个同名 interface 一起进 dts 会被
 * 打包器给其中一个加上 `$1` 后缀，公开面上就出现一个谁都不认识的名字
 * （实测过：两边都叫 `AmagiEventMap` 时 `dist/index-*.d.ts` 里确实多出
 * 一个带 `$1` 后缀的 interface）。v8 删掉 model/events.ts 时再把
 * `AmagiEventMap` 这个名字收回来。
 *
 * 谁在发（阶段 9.1 之后）：
 *
 * | 事件名 | emit 点 |
 * | --- | --- |
 * | `http:request` / `http:response` | `transport/client.ts` 每发一次请求 |
 * | `http:error` | `transport/client.ts`，响应回来了但状态码非 2xx |
 * | `network:retry` | `transport/client.ts`，一次失败即将退避重试 |
 * | `network:error` | `transport/client.ts`，请求始终没拿到响应且退避用尽 |
 * | `log:warn` / `log:error` | {@link createTransportEmitter}，上面两条的 v6 同款日志行 |
 * | `log:mark` | `client/createClient.ts` 的 `startServer` 开始监听时 |
 * | `api:success` / `api:error` | `runtime/execute.ts` 收尾信封时 |
 * | `log:info` / `log:debug` | **无 emit 点**，见 {@link UNEMITTED_BUS_EVENT_NAMES} |
 */
export interface AmagiBusEventMap {
  /** 一条日志（info 级） */
  'log:info': LogEvent
  /** 一条日志（warn 级） */
  'log:warn': LogEvent
  /** 一条日志（error 级） */
  'log:error': LogEvent
  /** 一条日志（debug 级） */
  'log:debug': LogEvent
  /** 一条日志（mark 级，重要标记） */
  'log:mark': LogEvent
  /** 一次底层请求即将发出 */
  'http:request': HttpRequestEvent
  /** 一次底层请求已经结束（含非 2xx 与传输失败） */
  'http:response': HttpResponseEvent
  /** 一次底层请求拿到了非 2xx 响应 */
  'http:error': HttpErrorEvent
  /** 一次失败即将退避重试 */
  'network:retry': NetworkRetryEvent
  /** 请求始终没拿到响应，退避已用尽 */
  'network:error': NetworkErrorEvent
  /** 一次逻辑调用成功返回 */
  'api:success': ApiSuccessEvent
  /** 一次逻辑调用失败返回 */
  'api:error': ApiErrorEvent
}

/** 事件名 */
export type AmagiBusEventName = keyof AmagiBusEventMap

/**
 * 全部事件名，用于遍历与穷尽性测试。
 *
 * 顺序与 v6 `AmagiEventType` 的声明顺序一致 —— 这 12 个名字就是 v6 的 12 个。
 */
export const AMAGI_BUS_EVENT_NAMES = [
  'log:info',
  'log:warn',
  'log:error',
  'log:debug',
  'log:mark',
  'http:request',
  'http:response',
  'http:error',
  'network:retry',
  'network:error',
  'api:success',
  'api:error'
] as const satisfies readonly AmagiBusEventName[]

/**
 * 声明了、但 v7 核心链路**不发**的事件名。
 *
 * - `log:info`：本分支上 v6 侧也是 0 个 emit 点（`emitLogInfo` 零调用点
 *   —— 唯一那处在 `platform/bilibili/getdata.ts`，阶段 6 随 getdata 删掉了；
 *   `v6.6.0` 标签上还在）。留着名字是因为文档里有 `on('log:info', ...)`
 *   的示例，且它是 `log:*` 五个级别里的一员，缺一个反而更奇怪。
 * - `log:debug`：v6 有 emit 点（抖音弹幕分段、passport），但 v7 里前者由
 *   `partial: 'tolerate'` + `meta.trace` 表达，后者是已 `@deprecated` 的
 *   v6 路径、写的是全局单例 `amagiEvents` 而不是实例总线。所以实例总线上
 *   这个名字目前收不到东西 —— 这是**已知的不对齐**，逐条记在
 *   docs/v7/06-migration.md 的事件小节里。
 *
 * 谁要给这两个名字接线，改这里的清单会让 `test/runtime/events.test.ts`
 * 的对齐用例跟着变红，逼着一起更新文档。
 */
export const UNEMITTED_BUS_EVENT_NAMES = ['log:info', 'log:debug'] as const satisfies readonly AmagiBusEventName[]

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
  emit<K extends AmagiBusEventName>(event: K, payload: AmagiBusEventMap[K]): boolean {
    return this.emitter.emit(event, payload)
  }

  /**
   * 注册监听器
   * @param event - 事件名
   * @param listener - 处理函数
   * @returns 自身，便于链式调用
   */
  on<K extends AmagiBusEventName>(event: K, listener: (payload: AmagiBusEventMap[K]) => void): this {
    this.emitter.on(event, listener as (payload: unknown) => void)
    return this
  }

  /**
   * 注册一次性监听器
   * @param event - 事件名
   * @param listener - 处理函数
   * @returns 自身，便于链式调用
   */
  once<K extends AmagiBusEventName>(event: K, listener: (payload: AmagiBusEventMap[K]) => void): this {
    this.emitter.once(event, listener as (payload: unknown) => void)
    return this
  }

  /**
   * 移除监听器
   * @param event - 事件名
   * @param listener - 处理函数
   * @returns 自身，便于链式调用
   */
  off<K extends AmagiBusEventName>(event: K, listener: (payload: AmagiBusEventMap[K]) => void): this {
    this.emitter.off(event, listener as (payload: unknown) => void)
    return this
  }

  /**
   * 某个事件当前的监听器数量
   * @param event - 事件名
   * @returns 监听器数量
   */
  listenerCount(event: AmagiBusEventName): number {
    return this.emitter.listenerCount(event)
  }

  /**
   * 清空监听器
   * @param event - 事件名；省略则清空所有事件
   * @returns 自身，便于链式调用
   */
  removeAllListeners(event?: AmagiBusEventName): this {
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
 * transport 只报「这一条请求的事实」（哪条 trace、第几次重试、退避多久），
 * `meta` 在这里补上 —— 这就是「负载带 meta」的落点，同时保持
 * `contracts ← transport ← runtime` 单向：transport 不认识 EventBus，
 * runtime 认识两边。
 *
 * 另外它把两条 transport 事实**顺带翻成 v6 同款日志行**：
 * `network:retry` → `log:warn`、`network:error` → `log:error`，文案与
 * `transport/legacy.ts:127` / `:138` 逐字一致。这样 v6 里靠 `log:warn`
 * 看重试的监听器搬到实例总线上行为不变，而 transport 层不必知道「日志」
 * 这个概念。
 * @param bus - 目标总线
 * @param meta - 取当前调用 meta 的函数（`attempts` / `durationMs` 会随调用推进而变，所以要惰性取）
 * @returns 可直接传给 `HttpClient` 的 `emit`
 */
export const createTransportEmitter = (bus: EventBus, meta: () => AmagiMeta): TransportEmitter => {
  return (event: TransportEvent, payload: TransportEventPayload): void => {
    const current = meta()
    const trace = payload.trace

    switch (event) {
      case 'http:request':
      case 'http:response':
        bus.emit(event, { meta: current, trace })
        return

      case 'http:error':
        if (payload.status !== undefined) bus.emit('http:error', { meta: current, trace, status: payload.status })
        return

      case 'network:retry': {
        const retry = payload.retry
        if (retry === undefined) return
        bus.emit('network:retry', { meta: current, trace, ...retry })
        bus.emit('log:warn', {
          level: 'warn',
          message: `网络请求失败 [${retry.errno ?? `HTTP ${retry.status}`}]，${retry.delayMs}ms 后进行第 ${retry.attempt} 次重试...`,
          meta: current
        })
        return
      }

      case 'network:error': {
        const failure = payload.failure
        if (failure === undefined) return
        bus.emit('network:error', { meta: current, trace, ...failure })
        bus.emit('log:error', { level: 'error', message: '网络请求失败:', args: [failure.message], meta: current })
        return
      }
    }
  }
}
