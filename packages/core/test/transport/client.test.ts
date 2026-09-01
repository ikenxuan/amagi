import { AxiosError, type AxiosAdapter, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { HttpClient, TransportError, type TransportEvent } from 'amagi/transport/client'
import { TraceCollector } from 'amagi/transport/trace'
/**
 * transport/client 的契约。
 *
 * 三条判据：
 * ① 不再用 `validateStatus: () => true`，状态码原样带出；
 * ② 请求描述深拷贝，调用方 headers 不被改写（A14）；
 * ③ 真的发 `http:request` / `http:response`（KNOWN-DEFECT #5）。
 */
import { describe, expect, it } from 'vitest'

/** 一次被捕获的请求，含 validateStatus 以便断言判据 ① */
interface Captured {
  url: string
  method?: string
  headers: Record<string, unknown>
  data?: unknown
  responseType?: string
  validateStatus?: AxiosRequestConfig['validateStatus']
}

interface Handle {
  adapter: AxiosAdapter
  requests: Captured[]
  readonly count: number
  last: () => Captured
}

const plain = (headers: unknown): Record<string, unknown> => {
  const h = headers as { toJSON?: () => Record<string, unknown> }
  if (!headers) return {}
  return typeof h.toJSON === 'function' ? h.toJSON() : { ...(headers as Record<string, unknown>) }
}

const capture = (config: AxiosRequestConfig): Captured => ({
  url: config.url ?? '',
  method: config.method,
  headers: plain(config.headers),
  data: config.data,
  responseType: config.responseType,
  validateStatus: config.validateStatus
})

const respond = (config: AxiosRequestConfig, data: unknown, status: number): AxiosResponse => ({
  data,
  status,
  statusText: status === 200 ? 'OK' : String(status),
  headers: { 'Content-Type': 'application/json', 'X-Trace-Id': 'abc' },
  config: config as AxiosResponse['config']
})

/**
 * 按脚本回应的 adapter。
 *
 * 每一项是这次请求的结局：`{ status, body }` 表示返回一个响应，
 * `{ errno }` 表示连响应都没拿到。用尽后重复最后一项。
 *
 * **这个 adapter 自己执行 `config.validateStatus`**，因为 axios 只在内置
 * adapter（http / xhr）里调 `settle`，自定义 adapter 一旦 resolve 就被当成成功。
 * 不复刻这一步的话，测试里的 429 / 500 会绕过 v7 想验证的整条失败分支
 * —— 而这也正是 v6 那些「HTTP 500 被当作成功」的用例能通过的原因之一。
 */
type Step = { status: number; body?: unknown } | { errno: string; message?: string }

const scriptedAdapter = (steps: Step[]): Handle => {
  const requests: Captured[] = []
  return {
    adapter: async (config) => {
      const step = steps[Math.min(requests.length, steps.length - 1)]
      requests.push(capture(config))
      if ('errno' in step) {
        const err = new AxiosError(step.message ?? `mock ${step.errno}`, step.errno, config as never)
        err.code = step.errno
        throw err
      }
      const res = respond(config, step.body ?? { ok: true }, step.status)
      if (config.validateStatus && !config.validateStatus(step.status)) {
        throw new AxiosError(
          `Request failed with status code ${step.status}`,
          step.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST',
          config as never,
          undefined,
          res
        )
      }
      return res
    },
    requests,
    get count() {
      return requests.length
    },
    last: () => requests[requests.length - 1]
  }
}

/** 记录事件投递顺序 */
const recorder = () => {
  const events: Array<{ event: TransportEvent; reason: string; status?: number }> = []
  return {
    events,
    emit: (event: TransportEvent, payload: { trace: { reason: string; status?: number } }) => {
      events.push({ event, reason: payload.trace.reason, status: payload.trace.status })
    }
  }
}

/** 立刻返回的 sleep，并记录被要求等待的毫秒数 */
const fastSleep = () => {
  const waited: number[] = []
  return { waited, sleep: async (ms: number) => void waited.push(ms) }
}

describe('transport/client - 状态码原样带出（判据 ①）', () => {
  it('不再把 validateStatus 设成恒真：500 在 axios 眼里仍是失败', async () => {
    const h = scriptedAdapter([{ status: 200 }])
    const client = new HttpClient({ requestConfig: { adapter: h.adapter } })
    await client.send({ method: 'GET', url: 'https://example.com/a' })

    const check = h.last().validateStatus
    expect(check?.(200)).toBe(true)
    expect(check?.(500)).toBe(false)
    expect(check?.(429)).toBe(false)
    expect(check?.(404)).toBe(false)
  })

  it('2xx 返回 RawResponse，状态码与响应体原样', async () => {
    const h = scriptedAdapter([{ status: 204, body: { hello: 'world' } }])
    const client = new HttpClient({ requestConfig: { adapter: h.adapter } })
    const res = await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(res.status).toBe(204)
    expect(res.statusText).toBe('204')
    expect(res.body).toEqual({ hello: 'world' })
    expect(res.url).toBe('https://example.com/a')
  })

  it.each([400, 401, 403, 404, 412, 418])('非 2xx（%i）不抛错也不重试，状态码原样带出交给 judge', async (status) => {
    const h = scriptedAdapter([{ status, body: { blocked: true } }])
    const client = new HttpClient({ requestConfig: { adapter: h.adapter } })
    const res = await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(res.status).toBe(status)
    expect(res.body).toEqual({ blocked: true })
    expect(h.count).toBe(1)
  })

  it('响应头归一化成大小写不敏感容器', async () => {
    const h = scriptedAdapter([{ status: 200 }])
    const client = new HttpClient({ requestConfig: { adapter: h.adapter } })
    const res = await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(res.headers.get('content-type')).toBe('application/json')
    expect(res.headers.get('Content-Type')).toBe('application/json')
    expect(res.headers.get('x-trace-id')).toBe('abc')
  })
})

describe('transport/client - 请求描述深拷贝（判据 ②，A14）', () => {
  it('调用方传入的 spec.headers 对象不被改写', async () => {
    const h = scriptedAdapter([{ status: 200 }])
    const callerHeaders = { 'User-Agent': 'caller-ua', Cookie: 'a=1' }
    const snapshot = { ...callerHeaders }
    const client = new HttpClient({ requestConfig: { adapter: h.adapter } })

    await client.send({ method: 'GET', url: 'https://example.com/a', headers: callerHeaders })

    expect(callerHeaders).toEqual(snapshot)
  })

  it('调用方传入的 requestConfig.headers 对象不被改写', async () => {
    const h = scriptedAdapter([{ status: 200 }])
    const configHeaders = { 'user-agent': 'config-ua' }
    const snapshot = { ...configHeaders }
    const client = new HttpClient({ requestConfig: { adapter: h.adapter, headers: configHeaders } })

    await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(configHeaders).toEqual(snapshot)
  })

  it('同一个 spec 复用多次也不会被写脏', async () => {
    const h = scriptedAdapter([{ status: 200 }])
    const spec = { method: 'GET', url: 'https://example.com/a', headers: { 'X-Keep': '1' } } as const
    const snapshot = JSON.stringify(spec)
    const client = new HttpClient({ requestConfig: { adapter: h.adapter } })

    await client.send(spec)
    await client.send(spec)

    expect(JSON.stringify(spec)).toBe(snapshot)
  })

  it('重试路径下调用方对象同样不被改写', async () => {
    const h = scriptedAdapter([{ errno: 'ECONNRESET' }, { errno: 'ECONNRESET' }, { status: 200 }])
    const callerHeaders = { 'User-Agent': 'caller-ua' }
    const snapshot = { ...callerHeaders }
    const s = fastSleep()
    const client = new HttpClient({ requestConfig: { adapter: h.adapter }, sleep: s.sleep })

    await client.send({ method: 'GET', url: 'https://example.com/a', headers: callerHeaders })

    expect(h.count).toBe(3)
    expect(callerHeaders).toEqual(snapshot)
  })
})

describe('transport/client - 真的发 http:request / http:response（判据 ③，#5）', () => {
  it('一次成功请求各发一条，顺序是 request → response', async () => {
    const h = scriptedAdapter([{ status: 200 }])
    const rec = recorder()
    const client = new HttpClient({ requestConfig: { adapter: h.adapter }, emit: rec.emit })

    await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(rec.events).toEqual([
      { event: 'http:request', reason: 'initial', status: undefined },
      { event: 'http:response', reason: 'initial', status: 200 }
    ])
  })

  it('每次重试都各发一对，reason 从 initial 转为 retry', async () => {
    const h = scriptedAdapter([{ errno: 'ECONNRESET' }, { status: 200 }])
    const rec = recorder()
    const s = fastSleep()
    const client = new HttpClient({ requestConfig: { adapter: h.adapter }, emit: rec.emit, sleep: s.sleep })

    await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(rec.events.map((e) => `${e.event}:${e.reason}`)).toEqual([
      'http:request:initial',
      'http:response:initial',
      'http:request:retry',
      'http:response:retry'
    ])
  })

  it('非 2xx 也发 response 事件，并带上状态码', async () => {
    const h = scriptedAdapter([{ status: 404 }])
    const rec = recorder()
    const client = new HttpClient({ requestConfig: { adapter: h.adapter }, emit: rec.emit })

    await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(rec.events.at(-1)).toEqual({ event: 'http:response', reason: 'initial', status: 404 })
  })

  it('传输层彻底失败时也发 response 事件（没有状态码）', async () => {
    const h = scriptedAdapter([{ errno: 'ENOTFOUND' }])
    const rec = recorder()
    const client = new HttpClient({ requestConfig: { adapter: h.adapter }, retry: { maxRetries: 0 }, emit: rec.emit })

    await expect(client.send({ method: 'GET', url: 'https://example.com/a' })).rejects.toBeInstanceOf(TransportError)
    expect(rec.events).toEqual([
      { event: 'http:request', reason: 'initial', status: undefined },
      { event: 'http:response', reason: 'initial', status: undefined }
    ])
  })

  it('不注入 emit 时不发事件也不报错', async () => {
    const h = scriptedAdapter([{ status: 200 }])
    const client = new HttpClient({ requestConfig: { adapter: h.adapter } })
    await expect(client.send({ method: 'GET', url: 'https://example.com/a' })).resolves.toBeDefined()
  })
})

describe('transport/client - 退避与 attempts', () => {
  it('429 会退避重试（v6 因 validateStatus 恒真而从不重试）', async () => {
    const h = scriptedAdapter([{ status: 429 }, { status: 429 }, { status: 200, body: { ok: 1 } }])
    const s = fastSleep()
    const client = new HttpClient({ requestConfig: { adapter: h.adapter }, sleep: s.sleep })

    const res = await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(res.status).toBe(200)
    expect(h.count).toBe(3)
    expect(s.waited).toEqual([1000, 2000])
  })

  it('5xx 同样退避重试', async () => {
    const h = scriptedAdapter([{ status: 503 }, { status: 200 }])
    const s = fastSleep()
    const client = new HttpClient({ requestConfig: { adapter: h.adapter }, sleep: s.sleep })

    await expect(client.send({ method: 'GET', url: 'https://example.com/a' })).resolves.toMatchObject({ status: 200 })
    expect(s.waited).toEqual([1000])
  })

  it('重试用尽后把最后那个非 2xx 响应原样返回，不抛错', async () => {
    const h = scriptedAdapter([{ status: 503, body: { down: true } }])
    const s = fastSleep()
    const client = new HttpClient({ requestConfig: { adapter: h.adapter }, sleep: s.sleep })

    const res = await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(res.status).toBe(503)
    expect(res.body).toEqual({ down: true })
    expect(h.count).toBe(4)
    expect(s.waited).toEqual([1000, 2000, 4000])
  })

  it('attempts 与 trace 条数一致，含重试', async () => {
    const h = scriptedAdapter([{ errno: 'ECONNRESET' }, { status: 200 }])
    const tracer = new TraceCollector({ enabled: true })
    const s = fastSleep()
    const client = new HttpClient({ requestConfig: { adapter: h.adapter }, trace: tracer, sleep: s.sleep })

    await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(client.attempts).toBe(2)
    expect(tracer.snapshot()).toHaveLength(2)
    expect(tracer.snapshot()?.map((t) => t.reason)).toEqual(['initial', 'retry'])
    expect(tracer.snapshot()?.[1].retryOf).toBe('NETWORK_ERROR')
  })

  it('多次 send 累加进同一个收集器（分页 / 分段的 attempts 来源）', async () => {
    const h = scriptedAdapter([{ status: 200 }])
    const tracer = new TraceCollector({ enabled: true })
    const client = new HttpClient({ requestConfig: { adapter: h.adapter }, trace: tracer })

    await client.send({ method: 'GET', url: 'https://example.com/p1' })
    await client.send({ method: 'GET', url: 'https://example.com/p2' }, 'page')
    await client.send({ method: 'GET', url: 'https://example.com/nav' }, 'prepare')

    expect(client.attempts).toBe(3)
    expect(tracer.countByReason()).toEqual({ initial: 1, page: 1, prepare: 1 })
  })
})

describe('transport/client - TransportError', () => {
  it('传输层失败且重试用尽时抛 TransportError，带归因与次数', async () => {
    const h = scriptedAdapter([{ errno: 'ECONNRESET', message: 'socket hang up' }])
    const s = fastSleep()
    const client = new HttpClient({ requestConfig: { adapter: h.adapter }, sleep: s.sleep })

    const error = await client.send({ method: 'GET', url: 'https://example.com/a' }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(TransportError)
    const te = error as TransportError
    expect(te.kind).toBe('network')
    expect(te.code).toBe('NETWORK_ERROR')
    expect(te.errno).toBe('ECONNRESET')
    expect(te.attempts).toBe(4)
    expect(te.url).toBe('https://example.com/a')
    expect(te.cause).toBeInstanceOf(AxiosError)
    expect(te.message).toContain('ECONNRESET')
    expect(te.message).toContain('已尝试 4 次')
  })

  it('超时归为 timeout / TIMEOUT', async () => {
    const h = scriptedAdapter([{ errno: 'ETIMEDOUT' }])
    const client = new HttpClient({ requestConfig: { adapter: h.adapter }, retry: { maxRetries: 0 } })

    const te = (await client.send({ method: 'GET', url: 'https://example.com/a' }).catch((e: unknown) => e)) as TransportError
    expect(te.kind).toBe('timeout')
    expect(te.code).toBe('TIMEOUT')
    expect(te.attempts).toBe(1)
  })

  it('不可恢复 errno 一次就放弃', async () => {
    const h = scriptedAdapter([{ errno: 'ERR_BAD_OPTION' }])
    const client = new HttpClient({ requestConfig: { adapter: h.adapter } })

    await expect(client.send({ method: 'GET', url: 'https://example.com/a' })).rejects.toBeInstanceOf(TransportError)
    expect(h.count).toBe(1)
  })

  it('非 AxiosError 原样上抛，不包装', async () => {
    const boom = new RangeError('boom')
    const client = new HttpClient({
      requestConfig: {
        adapter: async () => {
          throw boom
        }
      }
    })

    await expect(client.send({ method: 'GET', url: 'https://example.com/a' })).rejects.toBe(boom)
  })
})

describe('transport/client - 请求编译', () => {
  it('header 合并顺序：平台基线 → requestConfig → spec，且跨大小写覆盖', async () => {
    const h = scriptedAdapter([{ status: 200 }])
    const client = new HttpClient({
      headers: { 'User-Agent': 'baseline', Referer: 'https://baseline' },
      requestConfig: { adapter: h.adapter, headers: { 'user-agent': 'from-config' } }
    })

    await client.send({ method: 'GET', url: 'https://example.com/a', headers: { REFERER: 'https://spec' } })

    const sent = h.last().headers
    expect(sent['user-agent']).toBe('from-config')
    expect(sent['User-Agent']).toBeUndefined()
    expect(sent.REFERER).toBe('https://spec')
    expect(sent.Referer).toBeUndefined()
  })

  it('method / body / responseType 原样透传', async () => {
    const h = scriptedAdapter([{ status: 200 }])
    const client = new HttpClient({ requestConfig: { adapter: h.adapter } })

    await client.send({
      method: 'POST',
      url: 'https://example.com/a',
      body: { q: 'x' },
      responseType: 'arraybuffer'
    })

    expect(h.last().method).toBe('post')
    // 对象体由 axios 默认的 transformRequest 序列化成 JSON 串，与 v6 一致
    expect(h.last().data).toBe('{"q":"x"}')
    expect(h.last().responseType).toBe('arraybuffer')
  })

  it('没有 body 时不带 data 键', async () => {
    const h = scriptedAdapter([{ status: 200 }])
    const client = new HttpClient({ requestConfig: { adapter: h.adapter } })

    await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(h.last().data).toBeUndefined()
  })

  it('requestConfig 的其余字段（timeout / proxy 等）原样透传', async () => {
    const seen: AxiosRequestConfig[] = []
    const client = new HttpClient({
      requestConfig: {
        timeout: 1234,
        maxRedirects: 0,
        adapter: async (config) => {
          seen.push(config)
          return respond(config, { ok: 1 }, 200)
        }
      }
    })

    await client.send({ method: 'GET', url: 'https://example.com/a' })

    expect(seen[0].timeout).toBe(1234)
    expect(seen[0].maxRedirects).toBe(0)
  })
})
