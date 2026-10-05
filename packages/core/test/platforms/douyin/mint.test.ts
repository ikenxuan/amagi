import fs from 'node:fs'
import path from 'node:path'

import {
  createAcrawlerSigner,
  ensureDouyinVisitorCookie,
  extractChallengeParts,
  mergeVisitorCookie,
  mintDouyinVisitorCookie,
  resetDouyinVisitorCookieCache
} from 'amagi/platforms/douyin/mint'
/**
 * platforms/douyin/mint 的契约：访客 id（UIFID_TEMP）的纯 HTTP 铸造与 cookie 审计。
 *
 * 铸造链路（线上实测）：
 * ① `GET www.douyin.com` → `__ac_nonce` + 一份挑战页（内联 byted_acrawler 本体 +
 *    明文引导 `init({aid:99999999, dfp:0})` + `sign("", nonce)`）；
 * ② 离线算出 `__ac_signature`；
 * ③ 带 pair 再 GET 一次 → Set-Cookie 铸出 `ttwid` + `web_sign_token` + `UIFID_TEMP`。
 *
 * 这里全部用**注入的 HTTP 出口 + 真实挑战页 fixture**，不碰网络。
 */
import { describe, expect, it } from 'vitest'

const CHALLENGE_HTML = fs.readFileSync(path.join(__dirname, '..', '..', 'fixtures', 'douyin', 'challenge-page.html'), 'utf8')

/** 一次可编程的首页 GET 出口：按调用次序返回 canned 响应，并记录收到的 cookie */
const makeGetHome = (responses: Array<{ setCookies: string[]; body: string }>) => {
  const calls: Array<string | undefined> = []
  return {
    calls,
    getHome: async (cookie: string | undefined) => {
      calls.push(cookie)
      return responses[Math.min(calls.length - 1, responses.length - 1)]
    }
  }
}

const okMintResponses = () => [
  {
    setCookies: ['__ac_nonce=06ac3511900128cbdbb8c; Path=/; Max-Age=1800; Secure; SameSite=None'],
    body: CHALLENGE_HTML
  },
  {
    setCookies: [
      'ttwid=1%7Ctest_ttwid%7C1791185178%7Cab; Domain=.douyin.com; Path=/; HttpOnly; Secure; SameSite=None',
      'web_sign_token=eyJhbGciOiJIUzI1NiJ9.eyJ2IjoxfQ.x; path=/; secure; httponly',
      'UIFID_TEMP=c8e4e9571f734f80bfe570d2d6f4308b6d7e878c8513cc69011763d4f676684484e06c80c4bb1cfc20af1b3f96ad82fd1fdf7f9104d77fd447a5c231ee2e94d7edc2db6de4577ef374047dc89f5b7962aa770b665472442be2a66ddb6302bda2fe15a3dd6f0811df8b6985f702bdc384; path=/; domain=douyin.com; secure'
    ],
    body: '<html>ok</html>'
  }
]

describe('① 挑战页解析', () => {
  it('真实挑战页：本体是最大的内联块，aid 从引导块解析', () => {
    const parts = extractChallengeParts(CHALLENGE_HTML)
    expect(parts).toBeDefined()
    expect(parts!.aid).toBe(99999999)
    // 本体 ~71KB，远超防呆阈值
    expect(parts!.acrawlerSource.length).toBeGreaterThan(10_000)
  })

  it('没有内联块 / 块太小 / 缺引导块 → undefined（宁可放弃铸造，不执行来路不明的脚本）', () => {
    expect(extractChallengeParts('<html><body>hi</body></html>')).toBeUndefined()
    expect(extractChallengeParts('<script>tiny</script>')).toBeUndefined()
    // 只有本体没有引导块
    expect(extractChallengeParts(`<script>${'x'.repeat(20_000)}</script>`)).toBeUndefined()
  })
})

describe('② 离线签名', () => {
  it('真实 acrawler 本体在 vm 里运行，签名带 pushVersion 前缀且定长', () => {
    const parts = extractChallengeParts(CHALLENGE_HTML)!
    const sign = createAcrawlerSigner(parts.acrawlerSource, parts.aid, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0')
    const sig = sign('06ac3511900128cbdbb8c')
    // `_02` 版本头 + `B4Z6wo` pushVersion + 33 位签名体（线上实物总长 47 字符）
    expect(sig).toMatch(/^_02B4Z6wo00f01[0-9A-Za-z.\\-]{33}$/)
  })

  it('同一 nonce 重复签名结果一致（纯函数）', () => {
    const parts = extractChallengeParts(CHALLENGE_HTML)!
    const sign = createAcrawlerSigner(parts.acrawlerSource, parts.aid, 'UA')
    expect(sign('06ac3511900128cbdbb8c')).toBe(sign('06ac3511900128cbdbb8c'))
  })

  it('不同 nonce 产出不同签名', () => {
    const parts = extractChallengeParts(CHALLENGE_HTML)!
    const sign = createAcrawlerSigner(parts.acrawlerSource, parts.aid, 'UA')
    expect(sign('06ac3511900128cbdbb8c')).not.toBe(sign('06ac3511900128cbdbb8d'))
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
  it('两次 GET：第一次拿 nonce 与挑战页，第二次带 pair 拿铸造结果', async () => {
    const { getHome, calls } = makeGetHome(okMintResponses())
    const minted = await mintDouyinVisitorCookie('UA', { getHome })
    expect(minted).toEqual({
      ttwid: '1%7Ctest_ttwid%7C1791185178%7Cab',
      uifidTemp: expect.stringMatching(/^c8e4e957/)
    })
    expect(calls).toHaveLength(2)
    expect(calls[0]).toBeUndefined()
    expect(calls[1]).toContain('__ac_nonce=06ac3511900128cbdbb8c')
    expect(calls[1]).toContain('__ac_signature=_02B4Z6wo00f01')
  })

  it('挑战页形状变化 → undefined（尽力而为，不抛）', async () => {
    const { getHome } = makeGetHome([{ setCookies: ['__ac_nonce=n1'], body: '<html>形状变了</html>' }])
    expect(await mintDouyinVisitorCookie('UA', { getHome })).toBeUndefined()
  })

  it('签名被拒（第二次不下发铸造结果）→ undefined', async () => {
    const { getHome } = makeGetHome([...okMintResponses().slice(0, 1), { setCookies: [], body: '<html>denied</html>' }])
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
      'sessionid=s1; ttwid=1%7Ctest_ttwid%7C1791185178%7Cab; UIFID_TEMP=c8e4e9571f734f80bfe570d2d6f4308b6d7e878c8513cc69011763d4f676684484e06c80c4bb1cfc20af1b3f96ad82fd1fdf7f9104d77fd447a5c231ee2e94d7edc2db6de4577ef374047dc89f5b7962aa770b665472442be2a66ddb6302bda2fe15a3dd6f0811df8b6985f702bdc384'
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
      'ttwid=1%7Ctest_ttwid%7C1791185178%7Cab; UIFID_TEMP=c8e4e9571f734f80bfe570d2d6f4308b6d7e878c8513cc69011763d4f676684484e06c80c4bb1cfc20af1b3f96ad82fd1fdf7f9104d77fd447a5c231ee2e94d7edc2db6de4577ef374047dc89f5b7962aa770b665472442be2a66ddb6302bda2fe15a3dd6f0811df8b6985f702bdc384'
    )
  })

  it('铸造失败 → 原样返回（审计永不为调用增加失败）', async () => {
    resetDouyinVisitorCookieCache()
    const { getHome } = makeGetHome([{ setCookies: [], body: '<html>down</html>' }])
    expect(await ensureDouyinVisitorCookie('a=1', 'UA', { getHome })).toBe('a=1')
  })
})
