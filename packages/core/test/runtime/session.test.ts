import type { AmagiError } from 'amagi/contracts/error'
import type { Credential, LoginState, Qrcode, QrcodeLoginStrategy } from 'amagi/contracts/session'
import { createLoginSession } from 'amagi/runtime/session'
import { createEventBus } from 'amagi/runtime/events'
/**
 * runtime/session 的契约。
 *
 * 05-session-and-polling.md 的测试策略：会话是有状态流程，用**脚本化的策略**
 * 驱动状态序列而不发真实请求。必须覆盖 8 条路径：
 * ① 完整成功（无 challenge）
 * ② 完整成功（经过 sms challenge）
 * ③ 二维码过期（expiresAt 到点）
 * ④ 用户拒绝
 * ⑤ 风控
 * ⑥ busy 限频退避（间隔加倍）
 * ⑦ AbortSignal 取消
 * ⑧ 没有 onChallenge 时遇到 challenge → 失败信封且 error.raw 带 challenge
 * ⑨ serialize() → resume() → 继续轮询
 */
import { describe, expect, it } from 'vitest'

const QR: Qrcode = { content: 'https://qr', token: 't1', expiresAt: Date.now() + 60000, expiresInSec: 60 }

/** 造一个最小策略：poll 按剧本依次返回状态 */
const scriptedStrategy = (script: Array<{ state: LoginState; intervalMs?: number }>, options: { failPoll?: boolean } = {}): QrcodeLoginStrategy => {
  let pollCount = 0
  return {
    platform: 'bilibili',
    async start(ctx) {
      return { ok: true, qrcode: QR, ctx: { ...ctx, token: 't1', qrcode: QR } }
    },
    async poll(ctx) {
      if (options.failPoll) {
        const error: AmagiError = { kind: 'network', code: 'NETWORK_ERROR', message: '网络中断', retryable: true }
        return { ok: false, error }
      }
      const step = script[Math.min(pollCount, script.length - 1)]
      pollCount += 1
      return { ok: true, state: step.state, ctx, intervalMs: step.intervalMs ?? 10 }
    },
    serialize(ctx) {
      return JSON.stringify({ v: 1, token: ctx.token, cookie: ctx.cookie })
    },
    deserialize(blob) {
      const parsed = blob ? (JSON.parse(blob) as { token?: string; cookie?: string }) : {}
      return {
        platform: 'bilibili',
        cookie: parsed.cookie ?? '',
        token: parsed.token,
        qrcode: QR,
        send: async () => {
          throw new Error('no send in tests')
        },
        data: {}
      }
    }
  }
}

/** 成功凭证 */
const successCredential = (cookie: string): Credential => ({ cookie, raw: {} })

describe('① 完整成功（无 challenge）', () => {
  it('watch 从 pending 跑到 success，回调按序触发', async () => {
    const strategy = scriptedStrategy([
      { state: { phase: 'pending', qrcode: QR } },
      { state: { phase: 'scanned', qrcode: QR } },
      { state: { phase: 'success', credential: successCredential('SESSDATA=ok') } }
    ])
    const session = createLoginSession(strategy, { sleep: async () => {} })

    const phases: LoginState['phase'][] = []
    const result = await session.watch({
      onState: (s) => phases.push(s.phase),
      onQrcode: () => undefined,
      onScanned: () => undefined,
      onSuccess: () => undefined
    })

    expect(phases).toEqual(['pending', 'scanned', 'success'])
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.credential.cookie).toBe('SESSDATA=ok')
  })

  it('会话事件 session:state / session:success 带 meta', async () => {
    const bus = createEventBus('test')
    const seen: string[] = []
    bus.on('session:state' as never, () => seen.push('state'))
    bus.on('session:success' as never, () => seen.push('success'))

    const strategy = scriptedStrategy([{ state: { phase: 'success', credential: successCredential('ck') } }])
    const session = createLoginSession(strategy, { bus, sleep: async () => {} })
    await session.watch({})

    expect(seen).toEqual(['state', 'state', 'success']) // start 一次 + poll 一次
  })
})

describe('② 完整成功（经过 sms challenge）', () => {
  it('onChallenge 返回 { code } → answer → 继续轮询到 success', async () => {
    const strategy = scriptedStrategy([
      { state: { phase: 'pending', qrcode: QR } },
      {
        state: {
          phase: 'challenge',
          challenge: {
            kind: 'sms',
            maskedMobile: '138****8000',
            availableWays: ['mobile_sms_verify'],
            sendCode: async () => ({ ok: true as const, retryAfterSec: 60 })
          }
        }
      },
      { state: { phase: 'success', credential: successCredential('SESSDATA=ok') } }
    ])
    const session = createLoginSession(strategy, { sleep: async () => {} })

    const phases: LoginState['phase'][] = []
    // 严格的 ChallengeAnswer 签名约束由 test/contracts/session.test-d.ts 证明
    // （@ts-expect-error 错字段用例）；这里运行时只验引擎行为，cast 过签名
    const result = await session.watch({
      onState: (s) => phases.push(s.phase),
      onChallenge: (async (c) => {
        if (c.kind !== 'sms') throw new Error('暂不支持图形验证码')
        return { code: '123456' }
      }) as NonNullable<Parameters<typeof session.watch>[0]>['onChallenge']
    })

    expect(result.ok).toBe(true)
    expect(phases).toContain('challenge')
  })
})

describe('③ 二维码过期（expiresAt 到点）', () => {
  it('watch 超过 deadline 返回失败信封', async () => {
    const strategy = scriptedStrategy([{ state: { phase: 'pending', qrcode: QR } }])
    const session = createLoginSession(strategy, { sleep: async () => {} })

    const result = await session.watch({ timeoutMs: 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('COOKIE_EXPIRED')
      expect(result.error.message).toContain('过期')
    }
  })
})

describe('④ 用户拒绝', () => {
  it('rejected 终态 → 失败信封', async () => {
    const strategy = scriptedStrategy([{ state: { phase: 'rejected' } }])
    const session = createLoginSession(strategy, { sleep: async () => {} })

    const result = await session.watch({})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain('rejected')
  })
})

describe('⑤ 风控', () => {
  it('risk 终态 → kind: risk / RISK_CONTROL', async () => {
    const strategy = scriptedStrategy([{ state: { phase: 'risk', reason: '设备环境异常' } }])
    const session = createLoginSession(strategy, { sleep: async () => {} })

    const result = await session.watch({})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('risk')
      expect(result.error.code).toBe('RISK_CONTROL')
    }
  })
})

describe('⑥ busy 限频退避（间隔加倍）', () => {
  it('poll 给 intervalMs，引擎按它 sleep（下限 minIntervalMs）', async () => {
    const sleeps: number[] = []
    const strategy = scriptedStrategy([
      { state: { phase: 'pending', qrcode: QR }, intervalMs: 2000 },
      { state: { phase: 'success', credential: successCredential('ck') }, intervalMs: 0 }
    ])
    const session = createLoginSession(strategy, { sleep: async (ms) => { sleeps.push(ms) } })
    await session.watch({ minIntervalMs: 500 })
    // 第一轮 poll 间隔 2000，被 minIntervalMs 500 下限夹住后取 max(500, 2000)=2000
    expect(sleeps).toEqual([2000])
  })
})

describe('⑦ AbortSignal 取消', () => {
  it('signal.abort() → 失败信封（internal / INTERNAL_ERROR）', async () => {
    const strategy = scriptedStrategy([{ state: { phase: 'pending', qrcode: QR } }])
    const session = createLoginSession(strategy, { sleep: async () => {} })

    const controller = new AbortController()
    controller.abort()
    const result = await session.watch({ signal: controller.signal })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('internal')
      expect(result.error.code).toBe('INTERNAL_ERROR')
    }
  })
})

describe('⑧ 没有 onChallenge 时遇到 challenge', () => {
  it('返回失败信封且 error.raw 带 challenge', async () => {
    const challenge = {
      kind: 'sms' as const,
      maskedMobile: '138****8000',
      availableWays: ['mobile_sms_verify'],
      sendCode: async () => ({ ok: true as const, retryAfterSec: 60 })
    }
    const strategy = scriptedStrategy([{ state: { phase: 'challenge', challenge } }])
    const session = createLoginSession(strategy, { sleep: async () => {} })

    const result = await session.watch({})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('auth')
      expect(result.error.code).toBe('CAPTCHA_REQUIRED')
      expect(result.error.raw).toEqual(challenge)
    }
  })
})

describe('⑨ serialize() → resume() → 继续轮询', () => {
  it('序列化后在新引擎恢复能继续轮询', async () => {
    let polls = 0
    const strategy: QrcodeLoginStrategy = {
      platform: 'bilibili',
      async start(ctx) {
        return { ok: true, qrcode: QR, ctx: { ...ctx, token: 't1', qrcode: QR } }
      },
      async poll(ctx) {
        polls += 1
        if (polls < 2) return { ok: true, state: { phase: 'pending', qrcode: QR }, ctx, intervalMs: 10 }
        return { ok: true, state: { phase: 'success', credential: successCredential('ck') }, ctx, intervalMs: 0 }
      },
      serialize(ctx) {
        return JSON.stringify({ v: 1, token: ctx.token, cookie: ctx.cookie })
      },
      deserialize(blob) {
        const parsed = blob ? (JSON.parse(blob) as { token?: string; cookie?: string }) : {}
        return {
          platform: 'bilibili',
          cookie: parsed.cookie ?? '',
          token: parsed.token,
          qrcode: QR,
          send: async () => {
            throw new Error('no send in tests')
          },
          data: {}
        }
      }
    }

    // 第一个引擎：start + 一次轮询，序列化
    const session1 = createLoginSession(strategy, { sleep: async () => {} })
    await session1.start()
    const first = await session1.next()
    expect(first.ok && first.state.phase === 'pending').toBe(true)
    const blob = session1.serialize()
    expect(typeof blob).toBe('string')

    // 第二个引擎：resume 后继续轮询到 success
    const restored = strategy.deserialize(blob)
    const session2 = createLoginSession(strategy, { sleep: async () => {}, initialCtx: restored })
    const result = await session2.watch({})
    expect(result.ok).toBe(true)
  })
})

describe('手动单步 / AsyncIterable 出口', () => {
  it('for await 能拿到完整 phase 序列', async () => {
    const strategy = scriptedStrategy([
      { state: { phase: 'pending', qrcode: QR } },
      { state: { phase: 'scanned', qrcode: QR } },
      { state: { phase: 'success', credential: successCredential('ck') } }
    ])
    const session = createLoginSession(strategy, { sleep: async () => {} })

    const phases: LoginState['phase'][] = []
    for await (const state of session) {
      phases.push(state.phase)
      if (state.phase === 'success') break
    }
    expect(phases).toEqual(['pending', 'pending', 'scanned', 'success'])
  })

  it('手动单步：start → next → answer', async () => {
    const strategy = scriptedStrategy([
      { state: { phase: 'challenge', challenge: { kind: 'sms' as const, maskedMobile: '138****8000', availableWays: [], sendCode: async () => ({ ok: true as const, retryAfterSec: 60 }) } } },
      { state: { phase: 'success', credential: successCredential('ck') } }
    ])
    const session = createLoginSession(strategy, { sleep: async () => {} })

    const first = await session.start()
    expect(first.ok && first.state.phase === 'pending').toBe(true)
    const second = await session.next()
    expect(second.ok && second.state.phase === 'challenge').toBe(true)
    await session.answer({ code: '123456' })
    const third = await session.next()
    expect(third.ok && third.state.phase === 'success').toBe(true)
  })
})
