import { bilibiliPhaseOf, mergeSetCookie, bilibiliQrcodeStrategy } from 'amagi/platforms/bilibili/session/qrcode'
import { createLoginSession } from 'amagi/runtime/session'
import type { SessionCtx } from 'amagi/contracts/session'
import { AmagiHeaders } from 'amagi/contracts/request'
import type { RawResponse } from 'amagi/contracts/request'
/**
 * platforms/bilibili/session/qrcode 的契约。
 *
 * 判据：
 * ① 平台码 → phase：`86101→pending` / `86090→scanned` / `86038→expired` /
 *    `86083→rejected` / `0→success`
 * ② `mergeSetCookie(res.headers)` 收进策略内部 —— 调用方拿到统一的
 *    `Credential`，不再需要自己抠 `Set-Cookie`
 */
import { describe, expect, it } from 'vitest'

describe('① 平台码 → phase 映射', () => {
  it('86101 → pending / 86090 → scanned / 86038 → expired / 86083 → rejected / 0 → success', () => {
    expect(bilibiliPhaseOf(86101)).toBe('pending')
    expect(bilibiliPhaseOf(86090)).toBe('scanned')
    expect(bilibiliPhaseOf(86038)).toBe('expired')
    expect(bilibiliPhaseOf(86083)).toBe('rejected')
    expect(bilibiliPhaseOf(0)).toBe('success')
  })

  it('未知码 → failed', () => {
    expect(bilibiliPhaseOf(-400)).toBe('failed')
    expect(bilibiliPhaseOf(99999)).toBe('failed')
  })
})

describe('② mergeSetCookie 收进策略内部', () => {
  it('把 Set-Cookie 数组合并进现有 cookie', () => {
    const merged = mergeSetCookie(['SESSDATA=abc; Path=/; HttpOnly', 'bili_jct=csrf; Path=/'], 'SESSDATA=old; other=1')
    expect(merged).toContain('SESSDATA=abc') // 新值覆盖旧值
    expect(merged).toContain('other=1')
    expect(merged).toContain('bili_jct=csrf')
  })

  it('没有 Set-Cookie 时原样返回', () => {
    expect(mergeSetCookie(undefined, 'ck=1')).toBe('ck=1')
    expect(mergeSetCookie([], 'ck=1')).toBe('ck=1')
  })
})

describe('策略端到端：watch 拿到统一 Credential（不透出 headers）', () => {
  const makeCtx = (script: Array<{ url: string; body: unknown; setCookie?: string[] }>): SessionCtx => {
    let i = 0
    return {
      platform: 'bilibili',
      cookie: '',
      send: async (spec) => {
        const step = script[Math.min(i, script.length - 1)]
        i += 1
        expect(spec.url).toContain(step.url)
        return {
          status: 200,
          statusText: 'OK',
          headers: new AmagiHeaders(),
          setCookie: step.setCookie,
          body: step.body,
          durationMs: 1,
          url: spec.url
        } satisfies RawResponse
      },
      data: {}
    }
  }

  it('86101 → 86090 → 0：watch 全程，Credential.cookie 来自 Set-Cookie', async () => {
    const ctx = makeCtx([
      { url: '/x/passport-login/web/qrcode/generate', body: { code: 0, data: { url: 'https://qr', qrcode_key: 'k1' } } },
      { url: '/x/passport-login/web/qrcode/poll', body: { code: 0, data: { code: 86101 } } },
      { url: '/x/passport-login/web/qrcode/poll', body: { code: 0, data: { code: 86090 } } },
      {
        url: '/x/passport-login/web/qrcode/poll',
        body: { code: 0, data: { code: 0, url: 'https://login' } },
        setCookie: ['SESSDATA=new_session; Path=/; HttpOnly', 'bili_jct=csrf_token; Path=/']
      }
    ])

    const session = createLoginSession(bilibiliQrcodeStrategy, { initialCtx: ctx, sleep: async () => {} })
    const phases: string[] = []
    const result = await session.watch({ onState: (s) => phases.push(s.phase) })

    expect(phases).toEqual(['pending', 'scanned', 'success'])
    expect(result.ok).toBe(true)
    if (result.ok) {
      // 统一 Credential：cookie 已含 Set-Cookie，没有 headers 字段
      expect(result.credential.cookie).toContain('SESSDATA=new_session')
      expect(result.credential.cookie).toContain('bili_jct=csrf_token')
      expect(result.credential.raw).toBeDefined()
      expect(result.credential).not.toHaveProperty('headers')
    }
  })

  it('86038 → expired 终态', async () => {
    const ctx = makeCtx([
      { url: '/x/passport-login/web/qrcode/generate', body: { code: 0, data: { url: 'https://qr', qrcode_key: 'k1' } } },
      { url: '/x/passport-login/web/qrcode/poll', body: { code: 0, data: { code: 86038 } } }
    ])
    const session = createLoginSession(bilibiliQrcodeStrategy, { initialCtx: ctx, sleep: async () => {} })
    const result = await session.watch({})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain('expired')
  })
})
