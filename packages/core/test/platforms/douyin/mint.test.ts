import {
  ensureDouyinVisitorCookie,
  mergeVisitorCookie,
  mintDouyinVisitorCookie,
  resetDouyinVisitorCookieCache
} from 'amagi/platforms/douyin/mint'
import { computeAcSignature } from 'amagi/platforms/douyin/sign/acSignature'
import { resetDouyinTtwidCache } from 'amagi/platforms/douyin/ttwid'
/**
 * platforms/douyin/mint 的契约：访客 id（UIFID_TEMP）的纯 HTTP 铸造与 cookie 审计。
 *
 * 铸造链路（线上实测）：
 * ① `GET www.douyin.com` → Set-Cookie 里的 `__ac_nonce`（响应体是一份 VMP 挑战页，
 *    **不看**）；
 * ② `computeAcSignature(nonce, ua)` **纯算**出 `__ac_signature` —— 不执行挑战页脚本；
 * ③ 带 pair 再 GET 一次 → Set-Cookie 铸出 `ttwid` + `enter_pc_once` +
 *    `web_sign_token` + `UIFID_TEMP`（2026-10-11 实测四条）。
 *
 * 这里全部用**注入的 HTTP 出口**，不碰网络。出口只交 Set-Cookie：铸造不读响应体，
 * 所以 canned 响应里也没有 body 这一项（契约见 `MintDeps`）。
 */
import { describe, expect, it } from 'vitest'

/** 一次可编程的首页 GET 出口：按调用次序返回 canned 响应，并记录收到的 cookie */
const makeGetHome = (responses: Array<{ setCookies: string[] }>) => {
  const calls: Array<string | undefined> = []
  return {
    calls,
    getHome: async (cookie: string | undefined) => {
      calls.push(cookie)
      return responses[Math.min(calls.length - 1, responses.length - 1)]
    }
  }
}

/** 实测 nonce 的形状（21 个 hex 字符，2026-10-11；值是合成的） */
const NONCE = '06ac3511900128cbdbb8c'

const okMintResponses = () => [
  { setCookies: [`__ac_nonce=${NONCE}; Path=/; Max-Age=1800; Secure; SameSite=None`] },
  {
    setCookies: [
      'ttwid=1%7Ctest_ttwid%7C1791185178%7Cab; Domain=.douyin.com; Path=/; HttpOnly; Secure; SameSite=None',
      'enter_pc_once=1; path=/; domain=douyin.com',
      'web_sign_token=eyJhbGciOiJIUzI1NiJ9.eyJ2IjoxfQ.x; path=/; secure; httponly',
      'UIFID_TEMP=c8e4e9571f734f80bfe570d2d6f4308b6d7e878c8513cc69011763d4f676684484e06c80c4bb1cfc20af1b3f96ad82fd1fdf7f9104d77fd447a5c231ee2e94d7edc2db6de4577ef374047dc89f5b7962aa770b665472442be2a66ddb6302bda2fe15a3dd6f0811df8b6985f702bdc384; path=/; domain=douyin.com; secure'
    ]
  }
]

describe('① 纯算签名接在铸造链路上', () => {
  // 铸造的签名**不来自挑战页**：这一条钉住「第二发带出去的那串就是
  // computeAcSignature 对同一 nonce 的输出」，顺带证明第一发的响应体没被用到
  it('第二发带的签名与 computeAcSignature 对同一 nonce 的输出一致', async () => {
    const { getHome, calls } = makeGetHome(okMintResponses())
    const before = Date.now()
    await mintDouyinVisitorCookie('UA', { getHome })
    const after = Date.now()

    const sent = /__ac_signature=([^;]+)/.exec(calls[1] ?? '')?.[1]
    expect(sent).toBeTypeOf('string')
    // 签名体带整秒时间戳：铸造那一刻的秒可能落在 before / after 两个整秒上，
    // 取两端各算一份，命中其一即可（冻时钟会连带冻住被测代码里的 Date）
    expect([computeAcSignature(NONCE, 'UA', before), computeAcSignature(NONCE, 'UA', after)]).toContain(sent)
  })

  it('出口只交 Set-Cookie：铸造全程不读响应体（没有 body 这个字段也能跑通）', async () => {
    const calls: Array<string | undefined> = []
    // 刻意只给 setCookies —— 多一个属性都没有。能跑通即证明没人读 body
    const getHome = async (cookie: string | undefined) => {
      calls.push(cookie)
      return okMintResponses()[Math.min(calls.length - 1, 1)]
    }
    const minted = await mintDouyinVisitorCookie('UA', { getHome })
    expect(minted?.uifidTemp).toBeTypeOf('string')
  })
})

describe('③ 合并：只补缺失的名字', () => {
  const minted = { ttwid: 'ttw-minted', uifidTemp: 'uifid-minted' }

  it('空 cookie → 完整铸造结果（ttwid + UIFID_TEMP）', () => {
    expect(mergeVisitorCookie(undefined, minted)).toBe('ttwid=ttw-minted; UIFID_TEMP=uifid-minted')
    expect(mergeVisitorCookie('', minted)).toBe('ttwid=ttw-minted; UIFID_TEMP=uifid-minted')
  })

  it('已有 ttwid（登录态）→ 只补 UIFID_TEMP，不动调用方的设备标识', () => {
    expect(mergeVisitorCookie('ttwid=ttw-user; sessionid=s1', minted)).toBe('ttwid=ttw-user; sessionid=s1; UIFID_TEMP=uifid-minted')
  })

  it('已有任何拼写的访客 id → 原样返回', () => {
    expect(mergeVisitorCookie('UIFID_TEMP=mine', minted)).toBe('UIFID_TEMP=mine')
    expect(mergeVisitorCookie('uifid_temp=mine; a=1', minted)).toBe('uifid_temp=mine; a=1')
  })
})

describe('④ 铸造（注入 HTTP 出口）', () => {
  it('两次 GET：第一次只取 nonce，第二次带 pair 拿铸造结果', async () => {
    const { getHome, calls } = makeGetHome(okMintResponses())
    const minted = await mintDouyinVisitorCookie('UA', { getHome })
    expect(minted).toEqual({
      ttwid: '1%7Ctest_ttwid%7C1791185178%7Cab',
      uifidTemp: expect.stringMatching(/^c8e4e957/),
      // 服务端这一发实际发四个 cookie（2026-10-11 实测），后两个是可选的
      webSignToken: 'eyJhbGciOiJIUzI1NiJ9.eyJ2IjoxfQ.x',
      enterPcOnce: '1'
    })
    expect(calls).toHaveLength(2)
    expect(calls[0]).toBeUndefined()
    expect(calls[1]).toContain(`__ac_nonce=${NONCE}`)
    expect(calls[1]).toContain('__ac_signature=_02B4Z6wo00f01')
  })

  it('第一次拿不到 nonce → undefined（尽力而为，不抛）', async () => {
    const { getHome, calls } = makeGetHome([{ setCookies: ['ttwid=only-this'] }])
    expect(await mintDouyinVisitorCookie('UA', { getHome })).toBeUndefined()
    // 没有 nonce 就不发第二发
    expect(calls).toHaveLength(1)
  })

  it('签名被拒（第二次不下发铸造结果）→ undefined。这个判据分不清「换版」与「其他拒绝」', async () => {
    const { getHome } = makeGetHome([...okMintResponses().slice(0, 1), { setCookies: [] }])
    expect(await mintDouyinVisitorCookie('UA', { getHome })).toBeUndefined()
  })

  it('只发了 ttwid、没发 UIFID_TEMP 也算被拒（核心两项缺一不可）', async () => {
    const { getHome } = makeGetHome([...okMintResponses().slice(0, 1), { setCookies: ['ttwid=1%7Conly; Domain=.douyin.com'] }])
    expect(await mintDouyinVisitorCookie('UA', { getHome })).toBeUndefined()
  })
})

describe('⑤ 审计（缓存 + 去重 + 降级）', () => {
  it('缺访客 id → 铸造并合并；同一 cookie 第二次不再发请求', async () => {
    resetDouyinVisitorCookieCache()
    const { getHome, calls } = makeGetHome(okMintResponses())
    const deps = { getHome }

    const first = await ensureDouyinVisitorCookie('sessionid=s1', 'UA', deps)
    // canned 响应里的铸造值：ttwid 会一并补上（原 cookie 没有这一项）
    expect(first).toBe(
      'sessionid=s1; ttwid=1%7Ctest_ttwid%7C1791185178%7Cab; UIFID_TEMP=c8e4e9571f734f80bfe570d2d6f4308b6d7e878c8513cc69011763d4f676684484e06c80c4bb1cfc20af1b3f96ad82fd1fdf7f9104d77fd447a5c231ee2e94d7edc2db6de4577ef374047dc89f5b7962aa770b665472442be2a66ddb6302bda2fe15a3dd6f0811df8b6985f702bdc384; web_sign_token=eyJhbGciOiJIUzI1NiJ9.eyJ2IjoxfQ.x; enter_pc_once=1'
    )

    const second = await ensureDouyinVisitorCookie('sessionid=s1', 'UA', deps)
    expect(second).toBe(first)
    expect(calls).toHaveLength(2) // 铸造只发生一次
  })

  it('已有访客 id → 原样返回且零请求', async () => {
    resetDouyinVisitorCookieCache()
    const { getHome, calls } = makeGetHome(okMintResponses())
    const cookie = 'a=1; UIFID_TEMP=mine'
    expect(await ensureDouyinVisitorCookie(cookie, 'UA', { getHome })).toBe(cookie)
    expect(calls).toHaveLength(0)
  })

  it('空 cookie 也审计（全新部署连配置都没有的场景）', async () => {
    resetDouyinVisitorCookieCache()
    const { getHome } = makeGetHome(okMintResponses())
    const upgraded = await ensureDouyinVisitorCookie(undefined, 'UA', { getHome })
    expect(upgraded).toBe(
      'ttwid=1%7Ctest_ttwid%7C1791185178%7Cab; UIFID_TEMP=c8e4e9571f734f80bfe570d2d6f4308b6d7e878c8513cc69011763d4f676684484e06c80c4bb1cfc20af1b3f96ad82fd1fdf7f9104d77fd447a5c231ee2e94d7edc2db6de4577ef374047dc89f5b7962aa770b665472442be2a66ddb6302bda2fe15a3dd6f0811df8b6985f702bdc384; web_sign_token=eyJhbGciOiJIUzI1NiJ9.eyJ2IjoxfQ.x; enter_pc_once=1'
    )
  })

  it('铸造失败 + ttwid 回落也拿不到 → 原样返回（审计永不为调用增加失败）', async () => {
    resetDouyinVisitorCookieCache()
    resetDouyinTtwidCache()
    const { getHome } = makeGetHome([{ setCookies: [] }])
    // 刻意不注入 ttwid 出口：默认出口在 vitest 下被守卫挡掉，等于「回落也失败」
    expect(await ensureDouyinVisitorCookie('a=1', 'UA', { getHome })).toBe('a=1')
  })
})

describe('⑥ 铸造失败 → ttwid 回落（便民：零凭证至少拿到一个真 ttwid）', () => {
  /** 一份注定失败的铸造出口 */
  const failingMint = () => makeGetHome([{ setCookies: [] }])

  /** 一份成功的 ttwid 注册出口（回包形状照实测：值只在 Set-Cookie 里） */
  const makeTtwidExit = () => {
    const calls: string[] = []
    return {
      calls,
      postTtwidRegister: async (userAgent: string) => {
        calls.push(userAgent)
        return {
          setCookies: ['ttwid=ttw-registered; Path=/; Domain=bytedance.com; Max-Age=31536000; HttpOnly; Secure; SameSite=None'],
          body: { status_code: 0, message: 'union register success' }
        }
      }
    }
  }

  it('铸造失败 → 把注册来的 ttwid 补进 cookie', async () => {
    resetDouyinVisitorCookieCache()
    resetDouyinTtwidCache()
    const ttwid = makeTtwidExit()
    const upgraded = await ensureDouyinVisitorCookie('sessionid=s1', 'UA', { getHome: failingMint().getHome, ...ttwid })
    expect(upgraded).toBe('sessionid=s1; ttwid=ttw-registered')
    expect(ttwid.calls).toEqual(['UA'])
  })

  it('空 cookie 也补（零凭证部署）', async () => {
    resetDouyinVisitorCookieCache()
    resetDouyinTtwidCache()
    const ttwid = makeTtwidExit()
    expect(await ensureDouyinVisitorCookie(undefined, 'UA', { getHome: failingMint().getHome, ...ttwid })).toBe('ttwid=ttw-registered')
  })

  it('cookie 里已有 ttwid → 不拿注册值盖掉（只补缺失的名字）', async () => {
    resetDouyinVisitorCookieCache()
    resetDouyinTtwidCache()
    const ttwid = makeTtwidExit()
    const cookie = 'ttwid=ttw-user; sessionid=s1'
    expect(await ensureDouyinVisitorCookie(cookie, 'UA', { getHome: failingMint().getHome, ...ttwid })).toBe(cookie)
  })

  it('已有访客 id → 连回落都不走，零请求', async () => {
    resetDouyinVisitorCookieCache()
    resetDouyinTtwidCache()
    const ttwid = makeTtwidExit()
    const mint = failingMint()
    const cookie = 'a=1; UIFID_TEMP=mine'
    expect(await ensureDouyinVisitorCookie(cookie, 'UA', { getHome: mint.getHome, ...ttwid })).toBe(cookie)
    expect(mint.calls).toHaveLength(0)
    expect(ttwid.calls).toHaveLength(0)
  })

  it('降级结果不进审计缓存：铸造恢复后下一次调用仍能拿到真访客 id', async () => {
    resetDouyinVisitorCookieCache()
    resetDouyinTtwidCache()
    const ttwid = makeTtwidExit()
    const degraded = await ensureDouyinVisitorCookie('a=1', 'UA', { getHome: failingMint().getHome, ...ttwid })
    expect(degraded).toBe('a=1; ttwid=ttw-registered')

    const { getHome } = makeGetHome(okMintResponses())
    const recovered = await ensureDouyinVisitorCookie('a=1', 'UA', { getHome, ...ttwid })
    expect(recovered).toContain('UIFID_TEMP=')
    expect(recovered).not.toContain('ttw-registered')
  })
})

describe('⑦ 并发不串台（凭证隔离回归）', () => {
  /**
   * 回归的是一个真实缺陷：in-flight 去重曾是一个不分键的模块级变量，存的是「某个调用方
   * 合并后的整串 cookie」。两个带不同 cookie 的并发调用，第二个会拿到第一个的结果 ——
   * 连它的 `sessionid` 一起拿走。amagi 是接口库，一个进程服务多份凭证是正常用法。
   *
   * 正确行为：**铸造**共享一次（它与调用方 cookie 无关），**合并**各用自己的 cookie。
   */
  it('两个不同 cookie 并发 → 共享一次铸造，但各自只拿到自己的身份项', async () => {
    resetDouyinVisitorCookieCache()
    resetDouyinTtwidCache()
    const { getHome, calls } = makeGetHome(okMintResponses())
    const [a, b] = await Promise.all([
      ensureDouyinVisitorCookie('sessionid=A', 'UA', { getHome }),
      ensureDouyinVisitorCookie('sessionid=B', 'UA', { getHome })
    ])

    // 去重仍然生效：两次 GET 是同一次铸造的两步，不是两次铸造
    expect(calls).toHaveLength(2)
    // 各自只含自己的身份项 —— 这两组断言就是串台回归的核心
    expect(a).toContain('sessionid=A')
    expect(a).not.toContain('sessionid=B')
    expect(b).toContain('sessionid=B')
    expect(b).not.toContain('sessionid=A')
    // 两边都补上了访客 id
    expect(a).toContain('UIFID_TEMP=')
    expect(b).toContain('UIFID_TEMP=')
  })

  it('降级路径并发同样不串台：两个不同 cookie 各自补上 ttwid', async () => {
    resetDouyinVisitorCookieCache()
    resetDouyinTtwidCache()
    const { getHome } = makeGetHome([{ setCookies: [] }])
    const ttwidCalls: string[] = []
    const postTtwidRegister = async (userAgent: string) => {
      ttwidCalls.push(userAgent)
      return { setCookies: ['ttwid=ttw-registered; Domain=bytedance.com; HttpOnly'], body: { status_code: 0 } }
    }

    const [a, b] = await Promise.all([
      ensureDouyinVisitorCookie('sessionid=A', 'UA', { getHome, postTtwidRegister }),
      ensureDouyinVisitorCookie('sessionid=B', 'UA', { getHome, postTtwidRegister })
    ])

    expect(a).toBe('sessionid=A; ttwid=ttw-registered')
    expect(b).toBe('sessionid=B; ttwid=ttw-registered')
    // ttwid 注册自己也去重（模块内按 UA 分键的 in-flight）
    expect(ttwidCalls).toHaveLength(1)
  })

  it('同一 cookie 并发 → 还是只铸一次，两边结果相同', async () => {
    resetDouyinVisitorCookieCache()
    resetDouyinTtwidCache()
    const { getHome, calls } = makeGetHome(okMintResponses())
    const [a, b] = await Promise.all([
      ensureDouyinVisitorCookie('sessionid=same', 'UA', { getHome }),
      ensureDouyinVisitorCookie('sessionid=same', 'UA', { getHome })
    ])
    expect(a).toBe(b)
    expect(calls).toHaveLength(2)
  })
})
