import {
  amagiEvents,
  emitApiError,
  emitApiSuccess,
  emitLog,
  emitLogDebug,
  emitLogError,
  emitLogInfo,
  emitLogMark,
  emitLogWarn,
  emitNetworkError,
  emitNetworkRetry
} from 'amagi/model/events'
import { afterEach, describe, expect, it, vi } from 'vitest'

const LOG_EVENTS = ['log:info', 'log:warn', 'log:error', 'log:debug', 'log:mark'] as const
const ALL_EVENTS = [
  ...LOG_EVENTS,
  'http:request',
  'http:response',
  'http:error',
  'network:retry',
  'network:error',
  'api:success',
  'api:error'
] as const

afterEach(() => {
  amagiEvents.removeAllListeners()
})

describe('事件类型清单', () => {
  it('12 个事件类型被锁定', () => {
    expect([...ALL_EVENTS]).toMatchSnapshot()
  })
})

describe('日志事件', () => {
  it.each([
    ['info', emitLogInfo, 'log:info'],
    ['warn', emitLogWarn, 'log:warn'],
    ['error', emitLogError, 'log:error'],
    ['debug', emitLogDebug, 'log:debug'],
    ['mark', emitLogMark, 'log:mark']
  ] as const)('emitLog%s 触发 %s', (level, emit, event) => {
    const listener = vi.fn()
    amagiEvents.on(event, listener)
    emit('hello')

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0]).toMatchObject({ level, message: 'hello' })
  })

  it('负载带 timestamp（Date 实例）', () => {
    const listener = vi.fn()
    amagiEvents.on('log:info', listener)
    emitLogInfo('x')

    expect(listener.mock.calls[0][0].timestamp).toBeInstanceOf(Date)
  })

  it('附加参数进入 args', () => {
    const listener = vi.fn()
    amagiEvents.on('log:warn', listener)
    emitLogWarn('msg', 1, { a: 2 })

    expect(listener.mock.calls[0][0].args).toEqual([1, { a: 2 }])
  })

  it('无附加参数时 args 为空数组或 undefined', () => {
    const listener = vi.fn()
    amagiEvents.on('log:error', listener)
    emitLogError('msg')

    const args = listener.mock.calls[0][0].args
    expect(args === undefined || args.length === 0).toBe(true)
  })

  it('emitLog 可直接指定级别', () => {
    const listener = vi.fn()
    amagiEvents.on('log:debug', listener)
    emitLog('debug', 'direct')

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('没有监听者时不抛错', () => {
    expect(() => emitLogInfo('nobody listening')).not.toThrow()
  })
})

describe('once 语义', () => {
  it('只触发一次', () => {
    const listener = vi.fn()
    amagiEvents.once('log:info', listener)
    emitLogInfo('a')
    emitLogInfo('b')

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].message).toBe('a')
  })
})

describe('多个监听者', () => {
  it('按注册顺序全部触发', () => {
    const order: number[] = []
    amagiEvents.on('log:info', () => order.push(1))
    amagiEvents.on('log:info', () => order.push(2))
    emitLogInfo('x')

    expect(order).toEqual([1, 2])
  })

  it('off 后不再触发', () => {
    const listener = vi.fn()
    amagiEvents.on('log:info', listener)
    amagiEvents.off('log:info', listener)
    emitLogInfo('x')

    expect(listener).not.toHaveBeenCalled()
  })
})

describe('api 事件', () => {
  it('emitApiSuccess 负载结构被锁定', () => {
    const listener = vi.fn()
    amagiEvents.on('api:success', listener)
    emitApiSuccess({ platform: 'douyin', methodType: 'videoWork', response: { ok: 1 }, statusCode: 200, duration: 12 })

    const payload = listener.mock.calls[0][0]
    expect(Object.keys(payload).sort()).toMatchSnapshot()
    expect(payload.platform).toBe('douyin')
  })

  it('emitApiError 负载结构被锁定', () => {
    const listener = vi.fn()
    amagiEvents.on('api:error', listener)
    emitApiError({ platform: 'bilibili', methodType: 'videoInfo', errorMessage: 'boom', duration: 3 })

    expect(Object.keys(listener.mock.calls[0][0]).sort()).toMatchSnapshot()
  })

  // 事件负载里没有任何 requestId / clientId，多实例或并发场景无法归因。
  it('KNOWN-DEFECT: 事件负载没有 requestId / clientId', () => {
    const listener = vi.fn()
    amagiEvents.on('api:success', listener)
    emitApiSuccess({ platform: 'douyin', methodType: 'videoWork', response: {}, statusCode: 200, duration: 1 })

    const payload = listener.mock.calls[0][0]
    expect(payload).not.toHaveProperty('requestId')
    expect(payload).not.toHaveProperty('clientId')
  })
})

describe('network 事件', () => {
  it('emitNetworkRetry 负载结构被锁定', () => {
    const listener = vi.fn()
    amagiEvents.on('network:retry', listener)
    emitNetworkRetry({ errorCode: 'ECONNRESET', attempt: 1, maxRetries: 3, delayMs: 1000, url: 'https://x/' })

    expect(Object.keys(listener.mock.calls[0][0]).sort()).toMatchSnapshot()
  })

  it('emitNetworkError 负载结构被锁定', () => {
    const listener = vi.fn()
    amagiEvents.on('network:error', listener)
    emitNetworkError({ errorCode: 'ETIMEDOUT', message: 'timeout', retries: 3, url: 'https://x/' })

    expect(Object.keys(listener.mock.calls[0][0]).sort()).toMatchSnapshot()
  })
})

describe('KNOWN-DEFECT: 声明但从未发射的事件', () => {
  // http:request / http:response / http:error 在类型里存在、
  // emitHttpRequest / emitHttpResponse 也存在，但全仓无任何调用点。
  it.each(['http:request', 'http:response', 'http:error'] as const)('%s 不会被核心链路触发', async (event) => {
    const listener = vi.fn()
    amagiEvents.on(event, listener)

    const { fetchData } = await import('amagi/model/networks')
    await fetchData({
      url: 'https://example.com/x',
      adapter: (async (config: unknown) => ({ data: { ok: 1 }, status: 200, statusText: 'OK', headers: {}, config })) as never
    })

    expect(listener).not.toHaveBeenCalled()
  })
})

describe('KNOWN-DEFECT: 全局单例事件总线', () => {
  it('两个 client 共享同一 bus，无法区分事件来源', async () => {
    const amagi = (await import('amagi/index')).default
    const first = amagi({})
    const second = amagi({})

    expect(first.events).toBe(second.events)
    expect(first.events).toBe(amagiEvents)
  })

  it('emitLog* 是自由函数，直接写入全局单例', () => {
    const listener = vi.fn()
    amagiEvents.on('log:info', listener)
    emitLogInfo('from free function')

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
