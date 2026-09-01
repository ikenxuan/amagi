import express, { type Request, type Response } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { authMiddleware, hostWarningMessage, startServer } from 'amagi/server/auth'
/**
 * server/auth 的契约。
 *
 * 判据三条：
 * 1. 不传 token 时行为与 v6 一致（不破坏）：无 token 请求也能通过中间件。
 * 2. 传了 token 则无 token 请求返 401，带对 token 放行。
 * 3. `host` 默认仍是 `'::'` 但**启动时打印一次警告**。
 *
 * `startServer` 内部会真正 `app.listen`（占端口），测试用注入式 `listen`
 * 替代它（不占端口、同步触发），并把警告文案抽成纯函数 `hostWarningMessage`
 * 单独断言。vitest 配置 `restoreMocks: true`，每个用例后 mock 会被还原，
 * 所以 spy 必须在 `beforeEach` 里重建。
 */

let warnSpy: ReturnType<typeof vi.spyOn>
/** 注入式 listen 捕获到的 (port, host) */
const captured: Array<[number, string]> = []
const fakeListen = (_app: express.Application, port: number, host: string) => {
  captured.push([port, host])
}

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  captured.length = 0
})

afterEach(() => {
  captured.length = 0
})

describe('server/auth - hostWarningMessage', () => {
  it("host 为 '::'（默认值）时给出警告文案", () => {
    const message = hostWarningMessage('::')
    expect(message).toContain('::')
    expect(message).toContain('v8')
    expect(message).toContain('127.0.0.1')
  })

  it('显式传 host 时不需要警告', () => {
    expect(hostWarningMessage('127.0.0.1')).toBeUndefined()
    expect(hostWarningMessage('localhost')).toBeUndefined()
  })
})

describe('server/auth - authMiddleware', () => {
  it('不传 token 时是直通中间件（行为与 v6 一致，不破坏）', () => {
    const mw = authMiddleware()
    const next = vi.fn()
    mw({ headers: {} } as Request, {} as Response, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('传了 token 时，无 token 请求返回 401', () => {
    const mw = authMiddleware('secret')
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response
    mw({ headers: {} } as Request, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'UNAUTHORIZED', message: 'token 无效或缺失' } })
  })

  it('传了 token 时，token 错误返回 401', () => {
    const mw = authMiddleware('secret')
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response
    mw({ headers: { authorization: 'Bearer wrong' } } as Request, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('传了 token 时，带对 token 放行', () => {
    const mw = authMiddleware('secret')
    const next = vi.fn()
    mw({ headers: { authorization: 'Bearer secret' } } as Request, {} as Response, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('Authorization 头缺失或格式不对（非 Bearer）也返回 401', () => {
    const mw = authMiddleware('secret')
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response
    mw({ headers: { authorization: 'Basic abc' } } as Request, res, vi.fn())
    expect(res.status).toHaveBeenCalledWith(401)
  })
})

describe('server/auth - startServer', () => {
  it('默认 host 为 ::，端口 4567（与 v6 一致）', () => {
    startServer({ listen: fakeListen })
    expect(captured).toEqual([[4567, '::']])
  })

  it("host 默认 '::' 时启动即打印一次警告", () => {
    startServer({ listen: fakeListen })
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0][0]).toContain('::')
  })

  it('显式传 host 时不打印警告', () => {
    startServer({ port: 4567, host: '127.0.0.1', listen: fakeListen })
    expect(captured).toEqual([[4567, '127.0.0.1']])
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('不传 token 时行为与 v6 一致（不破坏）：startServer 仍返回 Express 应用', () => {
    const app = startServer({ listen: fakeListen })
    expect(typeof app).toBe('function')
  })
})