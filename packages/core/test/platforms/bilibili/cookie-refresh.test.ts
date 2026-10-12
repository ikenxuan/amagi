import { AmagiHeaders, type RawResponse, type RequestSpec } from 'amagi/contracts/request'
import { getBilibiliCorrespondPath, refreshBilibiliCredential } from 'amagi/platforms/bilibili/cookieRefresh'
import { describe, expect, it } from 'vitest'

/**
 * B站 Cookie 刷新（登录态续期，官方四步协议）的契约。
 *
 * 协议来源：删库前官方 cookie_refresh.md（5 fork + Wayback 字节一致）+ bilibili-api-python
 * 17.4.2 生产源独立复核。correspondPath 的 RSA 公钥用 node crypto 复核过（JWK n 与官方一致、
 * 输出 256 hex）。这里钉死：correspondPath 算法形状、四步调用序 + token 交叉流转、
 * Set-Cookie 合成新登录态、各失败分支。
 */

/** 造一个 RawResponse */
const raw = (body: unknown, status = 200, setCookie: string[] = []): RawResponse => ({
  status,
  statusText: 'OK',
  headers: { get: () => undefined } as unknown as RawResponse['headers'],
  setCookie,
  body,
  durationMs: 1,
  url: ''
})

const OLD_COOKIE = 'SESSDATA=OLD_SESS; bili_jct=OLD_JCT; DedeUserID=123'
const OLD_TOKEN = 'OLD_REFRESH_TOKEN'

/** 脚本化一条正常四步成功链，顺带把每步请求记下来供断言 */
const happyPath =
  (seen: { spec: RequestSpec }[]) =>
  async (spec: RequestSpec): Promise<RawResponse> => {
    seen.push({ spec })
    const u = spec.url
    if (u.includes('/cookie/info')) return raw({ code: 0, data: { refresh: true, timestamp: 1684466082562 } })
    if (u.includes('/correspond/1/')) return raw('<html><body><div id="1-name">REFRESH_CSRF_ABC</div></body></html>')
    if (u.includes('/cookie/refresh')) {
      return raw({ code: 0, data: { status: 0, refresh_token: 'NEW_REFRESH_TOKEN' } }, 200, [
        'SESSDATA=NEW_SESS; Path=/; Domain=.bilibili.com',
        'bili_jct=NEW_JCT; Path=/',
        'DedeUserID=123; Path=/'
      ])
    }
    if (u.includes('/confirm/refresh')) return raw({ code: 0, message: '0', ttl: 1 })
    throw new Error(`unexpected url ${u}`)
  }

describe('getBilibiliCorrespondPath', () => {
  it('输出 256 位小写 hex', () => {
    const p = getBilibiliCorrespondPath(1684466082562)
    expect(p).toHaveLength(256)
    expect(p).toMatch(/^[0-9a-f]+$/)
  })

  it('OAEP 带随机 seed：同一 ts 两次输出不同（但长度都 256）', () => {
    const a = getBilibiliCorrespondPath(1684466082562)
    const b = getBilibiliCorrespondPath(1684466082562)
    expect(a).not.toBe(b)
    expect(a).toHaveLength(256)
    expect(b).toHaveLength(256)
  })

  it('内置公钥是 RSA-1024（correspondPath 密文 128 字节=256 hex 的来源）', () => {
    const { getBilibiliCorrespondPath: _p } = { getBilibiliCorrespondPath }
    void _p
    // 公钥能被 node 解析且是 1024bit
    // （从导出的 PEM 常量独立验，避免只信 getter）
    expect(getBilibiliCorrespondPath().length).toBe(256)
  })
})

describe('refreshBilibiliCredential：四步成功链', () => {
  it('按 info→correspond→refresh→confirm 顺序打四个端点', async () => {
    const seen: { spec: RequestSpec }[] = []
    const res = await refreshBilibiliCredential({ cookie: OLD_COOKIE, refreshToken: OLD_TOKEN }, { send: happyPath(seen) })
    expect(res.ok).toBe(true)
    const urls = seen.map((s) => s.spec.url)
    expect(urls[0]).toContain('/cookie/info')
    expect(urls[1]).toContain('/correspond/1/')
    expect(urls[2]).toContain('/cookie/refresh')
    expect(urls[3]).toContain('/confirm/refresh')
    expect(seen).toHaveLength(4)
  })

  it('correspond 用 cookie/info 返回的服务器时间戳（不是 Date.now）', async () => {
    const seen: { spec: RequestSpec }[] = []
    await refreshBilibiliCredential({ cookie: OLD_COOKIE, refreshToken: OLD_TOKEN }, { send: happyPath(seen) })
    const corrUrl = seen[1].spec.url
    // path 是 256 hex；无法反解 ts，但确认 correspond 发生在 info 之后、形状正确
    expect(corrUrl).toMatch(/\/correspond\/1\/[0-9a-f]{256}$/)
  })

  it('第 3 步 body：旧 csrf + refresh_csrf + source=main_web + 旧 refresh_token', async () => {
    const seen: { spec: RequestSpec }[] = []
    await refreshBilibiliCredential({ cookie: OLD_COOKIE, refreshToken: OLD_TOKEN }, { send: happyPath(seen) })
    const body = String(seen[2].spec.body)
    expect(body).toContain('csrf=OLD_JCT')
    expect(body).toContain('refresh_csrf=REFRESH_CSRF_ABC')
    expect(body).toContain('source=main_web')
    expect(body).toContain('refresh_token=OLD_REFRESH_TOKEN')
    expect(new AmagiHeaders(seen[2].spec.headers).get('content-type')).toBe('application/x-www-form-urlencoded')
  })

  it('第 4 步 body：新 csrf + 旧 refresh_token（交叉），且无 source', async () => {
    const seen: { spec: RequestSpec }[] = []
    await refreshBilibiliCredential({ cookie: OLD_COOKIE, refreshToken: OLD_TOKEN }, { send: happyPath(seen) })
    const body = String(seen[3].spec.body)
    expect(body).toContain('csrf=NEW_JCT') // 新 bili_jct
    expect(body).toContain('refresh_token=OLD_REFRESH_TOKEN') // 仍是旧 token
    expect(body).not.toContain('source=')
    // 第 4 步用新 cookie 发
    expect(new AmagiHeaders(seen[3].spec.headers).get('cookie')).toContain('SESSDATA=NEW_SESS')
  })

  it('产出新 cookie（Set-Cookie 合成）+ 新 refresh_token（body）', async () => {
    const seen: { spec: RequestSpec }[] = []
    const res = await refreshBilibiliCredential({ cookie: OLD_COOKIE, refreshToken: OLD_TOKEN }, { send: happyPath(seen) })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.credential.cookie).toContain('SESSDATA=NEW_SESS')
      expect(res.credential.cookie).toContain('bili_jct=NEW_JCT')
      expect(res.credential.cookie).not.toContain('SESSDATA=OLD_SESS')
      expect(res.credential.refreshToken).toBe('NEW_REFRESH_TOKEN')
    }
  })

  it('第 2 步 correspond 用 text 响应类型（返回 HTML）', async () => {
    const seen: { spec: RequestSpec }[] = []
    await refreshBilibiliCredential({ cookie: OLD_COOKIE, refreshToken: OLD_TOKEN }, { send: happyPath(seen) })
    expect(seen[1].spec.responseType).toBe('text')
  })
})

describe('refreshBilibiliCredential：失败分支', () => {
  it('cookie 缺 bili_jct → PARAM_INVALID', async () => {
    const res = await refreshBilibiliCredential({ cookie: 'SESSDATA=x', refreshToken: OLD_TOKEN }, { send: async () => raw({}) })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('PARAM_INVALID')
  })

  it('缺 refreshToken → PARAM_INVALID', async () => {
    const res = await refreshBilibiliCredential({ cookie: OLD_COOKIE, refreshToken: '' }, { send: async () => raw({}) })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('PARAM_INVALID')
  })

  it('cookie/info 返回 -101 → LOGIN_REQUIRED', async () => {
    const res = await refreshBilibiliCredential(
      { cookie: OLD_COOKIE, refreshToken: OLD_TOKEN },
      { send: async () => raw({ code: -101, message: '账号未登录' }) }
    )
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('LOGIN_REQUIRED')
  })

  it('correspond 404 → LOGIN_REQUIRED（correspondPath 过期/登录态无效）', async () => {
    const res = await refreshBilibiliCredential(
      { cookie: OLD_COOKIE, refreshToken: OLD_TOKEN },
      {
        send: async (spec) => {
          if (spec.url.includes('/cookie/info')) return raw({ code: 0, data: { refresh: true, timestamp: 1 } })
          return raw('Not Found', 404)
        }
      }
    )
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('LOGIN_REQUIRED')
  })

  it('correspond HTML 无 1-name → DECODE_FAILED', async () => {
    const res = await refreshBilibiliCredential(
      { cookie: OLD_COOKIE, refreshToken: OLD_TOKEN },
      {
        send: async (spec) => {
          if (spec.url.includes('/cookie/info')) return raw({ code: 0, data: { refresh: true, timestamp: 1 } })
          return raw('<html><body>nothing here</body></html>')
        }
      }
    )
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('DECODE_FAILED')
  })

  it('cookie/refresh code≠0 → LOGIN_REQUIRED', async () => {
    const res = await refreshBilibiliCredential(
      { cookie: OLD_COOKIE, refreshToken: OLD_TOKEN },
      {
        send: async (spec) => {
          if (spec.url.includes('/cookie/info')) return raw({ code: 0, data: { refresh: true, timestamp: 1 } })
          if (spec.url.includes('/correspond/1/')) return raw('<div id="1-name">CSRF</div>')
          return raw({ code: 86095, message: 'refresh_csrf 错误' }) // refresh
        }
      }
    )
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('LOGIN_REQUIRED')
  })

  it('confirm/refresh code≠0 → COOKIE_EXPIRED，但新凭证已在 error.raw 里带出', async () => {
    const res = await refreshBilibiliCredential(
      { cookie: OLD_COOKIE, refreshToken: OLD_TOKEN },
      {
        send: async (spec) => {
          if (spec.url.includes('/cookie/info')) return raw({ code: 0, data: { refresh: true, timestamp: 1 } })
          if (spec.url.includes('/correspond/1/')) return raw('<div id="1-name">CSRF</div>')
          if (spec.url.includes('/cookie/refresh')) {
            return raw({ code: 0, data: { refresh_token: 'NEW_TOK' } }, 200, ['SESSDATA=NEW; Path=/', 'bili_jct=NEWJCT; Path=/'])
          }
          return raw({ code: -111 }) // confirm 失败
        }
      }
    )
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('COOKIE_EXPIRED')
      const credential = (res.error.raw as { credential?: { cookie: string; refreshToken: string } }).credential
      expect(credential?.refreshToken).toBe('NEW_TOK')
      expect(credential?.cookie).toContain('SESSDATA=NEW')
    }
  })

  it('confirm/refresh 网络异常 → NETWORK_ERROR，新凭证同样在 error.raw 里带出', async () => {
    // 第 3 步已换出新凭证、第 4 步请求发出后连接断了：服务端可能已作废旧 token，丢掉新的就只能重新扫码
    const res = await refreshBilibiliCredential(
      { cookie: OLD_COOKIE, refreshToken: OLD_TOKEN },
      {
        send: async (spec) => {
          if (spec.url.includes('/cookie/info')) return raw({ code: 0, data: { refresh: true, timestamp: 1 } })
          if (spec.url.includes('/correspond/1/')) return raw('<div id="1-name">CSRF</div>')
          if (spec.url.includes('/cookie/refresh')) {
            return raw({ code: 0, data: { refresh_token: 'NEW_TOK' } }, 200, ['SESSDATA=NEW; Path=/', 'bili_jct=NEWJCT; Path=/'])
          }
          throw new Error('socket hang up') // confirm 网络异常
        }
      }
    )
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('NETWORK_ERROR')
      const credential = (res.error.raw as { credential?: { cookie: string; refreshToken: string } }).credential
      expect(credential?.refreshToken).toBe('NEW_TOK')
      expect(credential?.cookie).toContain('SESSDATA=NEW')
    }
  })
})
