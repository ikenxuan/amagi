import {
  DOUYIN_WEB_TTWID_PAYLOAD,
  ensureDouyinTtwid,
  pickTtwid,
  registerDouyinTtwid,
  resetDouyinTtwidCache
} from 'amagi/platforms/douyin/ttwid'
/**
 * platforms/douyin/ttwid 的契约：零凭证的 ttwid 动态注册（铸造链路的轻量回落）。
 *
 * 注册接口线上实测（2026-10-10，零 cookie、零签名）：
 * `POST ttwid.bytedance.com/ttwid/union/register/` → HTTP **200**（没有 Location 头），
 * 体是 `{status_code:0, message:"union register success", redirect_url:"…callback/?aid=…&ticket=…"}`，
 * **ttwid 只在唯一一行 Set-Cookie 里**（`Domain=bytedance.com; Max-Age=31536000; HttpOnly`）。
 *
 * 这里全部用**注入的 HTTP 出口**，不碰网络。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 一个形状与实物一致的假 ttwid：127 字符、percent-encoded 的四段
 * `1%7C<43 字符>%7C<10 位秒级时间戳>%7C<64 个 hex>`（2026-10-10 实测形状）。
 * 值是编的——真值不进仓库。
 */
const FAKE_TTWID =
  '1%7CmZ8qT1xLd3Pw7KcV0rYb5NsHj9EuAgQ2i6FoXn4Tv1B%7C1791632147%7Ca1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4'

/** 实测的 Set-Cookie 行（属性原样，值换成假的） */
const REAL_SHAPE_SET_COOKIE = `ttwid=${FAKE_TTWID}; Path=/; Domain=bytedance.com; Max-Age=31536000; HttpOnly; Secure; SameSite=None`

/** 实测的响应体：三个字段，没有 ttwid */
const REAL_SHAPE_BODY = {
  status_code: 0,
  message: 'union register success',
  redirect_url: 'https://www.douyin.com/ttwid/union/register/callback/?aid=1768&ticket=xxx'
}

/** 一个可编程的注册出口：记录收到的 UA，按 canned 结果回应（或抛错） */
const makeExit = (result: { setCookies: string[]; body: unknown } | Error) => {
  const calls: string[] = []
  return {
    calls,
    postTtwidRegister: async (userAgent: string) => {
      calls.push(userAgent)
      if (result instanceof Error) throw result
      return result
    }
  }
}

const okExit = () => makeExit({ setCookies: [REAL_SHAPE_SET_COOKIE], body: REAL_SHAPE_BODY })

beforeEach(() => {
  resetDouyinTtwidCache()
})

afterEach(() => {
  vi.useRealTimers()
  resetDouyinTtwidCache()
})

describe('① 注册载荷：只保留实测必需的字段', () => {
  it('实测必需的只有两项：aid + service（缺任一服务端回 status_code 1001 parse params fail）', () => {
    expect(DOUYIN_WEB_TTWID_PAYLOAD).toEqual({ aid: 1768, service: 'www.douyin.com' })
  })

  it('实测可省的字段一个都不传（删掉后仍拿到 127 字符 ttwid）', () => {
    const removable = ['region', 'needFid', 'migrate_info', 'cbUrlProtocol', 'union', 'need_t', 'migrate_priority', 'domain']
    for (const field of removable) expect(DOUYIN_WEB_TTWID_PAYLOAD).not.toHaveProperty(field)
  })

  it('不含任何凭证', () => {
    const serialized = JSON.stringify(DOUYIN_WEB_TTWID_PAYLOAD).toLowerCase()
    for (const secret of ['cookie', 'sessionid', 'token', 'ticket', 'uifid']) expect(serialized).not.toContain(secret)
  })
})

describe('② 取值：先 Set-Cookie 再响应体', () => {
  it('实测回包：ttwid 只在 Set-Cookie 里，响应体里没有', () => {
    expect(pickTtwid([REAL_SHAPE_SET_COOKIE], REAL_SHAPE_BODY)).toBe(FAKE_TTWID)
    // 形状自证：127 字符、解码后四段
    expect(FAKE_TTWID).toHaveLength(127)
    expect(decodeURIComponent(FAKE_TTWID).split('|')).toHaveLength(4)
  })

  it('旧回包形态兜底：body.ttwid 与 body.data.ttwid', () => {
    expect(pickTtwid([], { ttwid: 'from-body' })).toBe('from-body')
    expect(pickTtwid([], { data: { ttwid: 'from-nested' } })).toBe('from-nested')
  })

  it('Set-Cookie 优先于响应体', () => {
    expect(pickTtwid([REAL_SHAPE_SET_COOKIE], { ttwid: 'from-body' })).toBe(FAKE_TTWID)
  })

  it('两处都没有 → undefined；同前缀的别的 cookie 不误判', () => {
    expect(pickTtwid([], REAL_SHAPE_BODY)).toBeUndefined()
    expect(pickTtwid(['ttwid_sub=nope; Path=/'], undefined)).toBeUndefined()
    expect(pickTtwid(['other=1'], { data: { ttwid: 42 } })).toBeUndefined()
  })
})

describe('③ 注册一次（注入出口）', () => {
  it('成功 → 返回 ttwid，UA 透传给出口', async () => {
    const exit = okExit()
    expect(await registerDouyinTtwid('MyUA/1.0', exit)).toBe(FAKE_TTWID)
    expect(exit.calls).toEqual(['MyUA/1.0'])
  })

  it('不给 UA → 用兜底 UA（与 mint.ts 同一基线）', async () => {
    const exit = okExit()
    await registerDouyinTtwid(undefined, exit)
    expect(exit.calls[0]).toContain('Mozilla/5.0')
  })

  it('出口抛错 → undefined（永不抛，不给调用增加失败）', async () => {
    const exit = makeExit(new Error('ECONNRESET'))
    await expect(registerDouyinTtwid('UA', exit)).resolves.toBeUndefined()
  })

  it('回包里没有 ttwid → undefined', async () => {
    const exit = makeExit({ setCookies: [], body: { status_code: 1, message: 'nope' } })
    expect(await registerDouyinTtwid('UA', exit)).toBeUndefined()
  })
})

describe('④ 缓存 / 去重 / 失败冷却', () => {
  it('同一 UA 第二次命中缓存，零请求', async () => {
    const exit = okExit()
    expect(await ensureDouyinTtwid('UA', exit)).toBe(FAKE_TTWID)
    expect(await ensureDouyinTtwid('UA', exit)).toBe(FAKE_TTWID)
    expect(exit.calls).toHaveLength(1)
  })

  it('换 UA 换键（ttwid 绑在 IP+UA 上下文上，不跨 UA 串用）', async () => {
    const exit = okExit()
    await ensureDouyinTtwid('UA-a', exit)
    await ensureDouyinTtwid('UA-b', exit)
    expect(exit.calls).toEqual(['UA-a', 'UA-b'])
  })

  it('并发调用共享同一次注册', async () => {
    const exit = okExit()
    const [a, b] = await Promise.all([ensureDouyinTtwid('UA', exit), ensureDouyinTtwid('UA', exit)])
    expect(a).toBe(FAKE_TTWID)
    expect(b).toBe(FAKE_TTWID)
    expect(exit.calls).toHaveLength(1)
  })

  it('注册失败 → 60 秒冷却内不重试，过了冷却才再发', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-10T00:00:00.000Z'))
    const exit = makeExit(new Error('down'))
    expect(await ensureDouyinTtwid('UA', exit)).toBeUndefined()
    expect(await ensureDouyinTtwid('UA', exit)).toBeUndefined()
    expect(exit.calls).toHaveLength(1) // 冷却中，第二次没发请求

    vi.setSystemTime(new Date('2026-10-10T00:01:01.000Z')) // +61 秒
    expect(await ensureDouyinTtwid('UA', exit)).toBeUndefined()
    expect(exit.calls).toHaveLength(2)
  })

  it('缓存 12 小时后过期，重新注册', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-10T00:00:00.000Z'))
    const exit = okExit()
    await ensureDouyinTtwid('UA', exit)

    vi.setSystemTime(new Date('2026-10-10T11:59:00.000Z')) // 11h59m：还在有效期内
    await ensureDouyinTtwid('UA', exit)
    expect(exit.calls).toHaveLength(1)

    vi.setSystemTime(new Date('2026-10-10T12:00:01.000Z')) // 过 12 小时
    await ensureDouyinTtwid('UA', exit)
    expect(exit.calls).toHaveLength(2)
  })

  it('reset 清空缓存与冷却', async () => {
    const exit = okExit()
    await ensureDouyinTtwid('UA', exit)
    resetDouyinTtwidCache()
    await ensureDouyinTtwid('UA', exit)
    expect(exit.calls).toHaveLength(2)
  })
})
