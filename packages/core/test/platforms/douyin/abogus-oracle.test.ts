import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  ABogus,
  AID,
  chainBytes,
  decode,
  DIGEST_CHAINS,
  digestOf,
  HEADER_MAGIC,
  PAGE_ID,
  SDK_VERSION,
  structureError,
  userAgentDigest
} from 'amagi/platforms/douyin/sign/a_bogus'
import { decodeABogus, decodeUrl, recoverSignedQuery } from 'amagi/platforms/douyin/sign/decode'
import { describe, expect, it } from 'vitest'

/**
 * a_bogus 的 **oracle 测试** —— 拿真实浏览器产出的签名反过来验实现。
 *
 * ## 为什么必须有这个文件
 *
 * 抖音对签名是**抽样校验**的。一个过期的常量（比如用错盐值）不会让请求报错，
 * 只会让它被判高风险的概率上升——也就是说，「请求成功」这件事证明不了任何东西。
 * 唯一能证伪一个常量的办法，是拿浏览器自己的输出拆开看。
 *
 * 这个文件的全部断言都建立在 `test/fixtures/douyin/abogus_browser.json` 上：
 * 三个由抖音自己的 `bdms.js` 产出、且**带全部输入**的真实签名。它不是快照，
 * 不随被测代码变化——这正是它与 `sign-douyin.test.ts` 那个自生成快照的根本差别，
 * 也是旧实现能把错盐值活了两年的原因（自证模型结构上无法发现常量过期）。
 *
 * ## fixture 的出处与刷新
 *
 * - `captured_at`: 2026-09-09
 * - `source`: dtk-browser-rpc-1，cloakbrowser 0.5.10 / chromium 146，`cookies={}`
 * - `bdms_version`: 1.0.1.19-fix.01
 *
 * 三个样本共用同一组输入（同一条 query、同一个 UA、同一块屏幕、相邻毫秒），
 * 只有噪声不同。所以它们**不是**三个独立样本，换屏幕/换 query 的覆盖要靠重新捕获。
 * a_bogus 本身不携带任何会话值，所以 fixture 里没有凭据。
 */
interface BrowserSample {
  a_bogus: string
  query: string
  body: string
  user_agent: string
  browser_info: string
  sibling_timestamp: number
  bdms_version: string
}

const fixture = JSON.parse(readFileSync(fileURLToPath(new URL('../../fixtures/douyin/abogus_browser.json', import.meta.url)), 'utf8')) as {
  samples: BrowserSample[]
}

const SAMPLES = fixture.samples

/** 摘要在签名里只留三个字节，`24` 位就是这条校验的全部证据量 */
const CHAIN_BITS = 24

describe('a_bogus oracle：对着真实浏览器捕获验实现', () => {
  it('fixture 是三份带完整输入的浏览器签名', () => {
    expect(SAMPLES).toHaveLength(3)
    for (const sample of SAMPLES) {
      expect(sample.a_bogus).toHaveLength(192)
      expect(sample.bdms_version).toBe('1.0.1.19-fix.01')
      expect(sample.query.length).toBeGreaterThan(0)
      expect(sample.user_agent).toContain('Chrome/')
    }
    // 三个样本输入相同、签名不同 —— 差异全部来自噪声
    expect(new Set(SAMPLES.map((s) => s.a_bogus)).size).toBe(3)
    expect(new Set(SAMPLES.map((s) => s.query)).size).toBe(1)
  })

  it.each(SAMPLES.map((sample, index) => [index, sample] as const))(
    '样本 %i：结构检查通过（真实签名必须满足我们全部格式约束）',
    (_index, sample) => {
      expect(structureError(sample.a_bogus)).toBeNull()
    }
  )

  it.each(SAMPLES.map((sample, index) => [index, sample] as const))('样本 %i：解出解码器没有作为输入拿到的那些常量', (_index, sample) => {
    const parsed = decode(sample.a_bogus)

    // 下面这些值**都不是**解码器的入参，是从签名里读出来的。
    // 能读出来，说明这套格式约束确实由真实实现满足
    expect(parsed.headerMagic).toEqual(HEADER_MAGIC)
    expect(parsed.sdkVersion).toEqual(SDK_VERSION)
    expect(parsed.aid).toBe(AID)
    expect(parsed.pageId).toBe(PAGE_ID)

    // 几何串逐字节等于 fixture 记录的输入 —— 纯从签名还原
    expect(parsed.browserInfo).toBe(sample.browser_info)

    // 时钟与旁边的 timestamp 参数吻合，且 ink 恰好慢一毫秒（SDK 对自己的存活检查）
    const delta = parsed.nowMs - sample.sibling_timestamp * 1000
    expect(delta).toBeGreaterThanOrEqual(0)
    expect(delta).toBeLessThan(1000)
    expect(parsed.inkMs).toBe(parsed.nowMs - 1)
  })

  it.each(SAMPLES.map((sample, index) => [index, sample] as const))(
    '样本 %i：三条摘要链都命中 fixture 自己的输入（盐值判定就在这条上）',
    (_index, sample) => {
      const parsed = decode(sample.a_bogus)
      const inputs: Record<string, string> = {
        query: sample.query,
        body: sample.body,
        user_agent: sample.user_agent
      }

      for (const [name, chain] of Object.entries(DIGEST_CHAINS)) {
        const carried = chain.slots.map((slot) => parsed.fields[slot])
        const digest = name === 'user_agent' ? userAgentDigest(inputs[name]) : digestOf(inputs[name])
        expect(chainBytes(chain, digest)).toEqual(carried)
      }
    }
  )

  it.each(SAMPLES.map((sample, index) => [index, sample] as const))(
    '样本 %i：用浏览器自己的输入与它那一毫秒重签，五十个标量全等',
    (_index, sample) => {
      const parsed = decode(sample.a_bogus)

      //#region docs-oracle
      // 噪声钉死只是为了可复现；签名的正确性与噪声取值无关
      const ours = new ABogus(sample.user_agent, {
        browserInfo: sample.browser_info,
        rng: () => 0.5
      }).getValue(sample.query, { body: sample.body, nowMs: parsed.nowMs })
      const oursParsed = decode(ours)

      expect(Object.keys(oursParsed.fields)).toHaveLength(50)
      expect(oursParsed.fields).toEqual(parsed.fields)
      expect(oursParsed.browserInfo).toBe(parsed.browserInfo)
      expect(oursParsed.aid).toBe(parsed.aid)
      expect(oursParsed.pageId).toBe(parsed.pageId)

      // 同一毫秒、同一输入的两次签名因噪声而不同，长度相同 —— 噪声进不了可解码字段
      expect(ours).not.toBe(sample.a_bogus)
      expect(ours).toHaveLength(sample.a_bogus.length)
      //#endregion
    }
  )

  it('摘要链检查确实有鉴别力 —— 换一条 query 就会对不上', () => {
    const sample = SAMPLES[0]
    const parsed = decode(sample.a_bogus)
    const chain = DIGEST_CHAINS.query
    const carried = chain.slots.map((slot) => parsed.fields[slot])

    expect(chainBytes(chain, digestOf(sample.query))).toEqual(carried)
    // 只是多了一个参数，三个字节就全变了。这条断言是上面那些 MATCH 的意义所在：
    // 如果检查对什么输入都通过，它就没有证明任何事
    const tampered = chainBytes(chain, digestOf(`${sample.query}&extra=1`))
    expect(tampered).not.toEqual(carried)
    expect(CHAIN_BITS).toBe(24)
  })

  it('三个样本解出的 clock 落在同一秒内且严格递增', () => {
    const clocks = SAMPLES.map((sample) => decode(sample.a_bogus).nowMs)
    for (let index = 1; index < clocks.length; index++) {
      expect(clocks[index]).toBeGreaterThan(clocks[index - 1])
      expect(clocks[index] - clocks[0]).toBeLessThan(1000)
    }
  })
})

/**
 * 这两条来自一次**线上真实捕获**的排查：用户从浏览器里复制了一条已签名的 URL
 * 丢进验证工具，结果三条链全报「对不上」，但结构检查是通的。
 *
 * 根因有两个，都不在算法里，而在验证侧的假设里：
 *
 * 1. **UA 链的 RC4 密钥来自签名自己报的 `detect_flags`。** 那份捕获报的是 4，
 *    而 fixture 里是 14，解码器当时拿模块常量去算，必然对不上。
 *    （上游那份 Python 实现同样写死常量，这是移植时补的。）
 * 2. **签名覆盖了哪些参数随管线而异。** 那份捕获里 `uifid` 在 `a_bogus` **之前**，
 *    所以被签名覆盖；而 amagi 的管线是 `webid → a_bogus → secsdk`，`uifid` 由
 *    secsdk 在之后补上、没被覆盖。同一个参数名，两种结论。
 *
 * 测试用自己签的样本构造这两个形态 —— 那份线上捕获带着真实 `msToken`，
 * 不能进仓库。
 */
describe('验证侧的假设：环境值来自签名自己，query 覆盖范围靠搜索', () => {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0'
  const NOW = 1789389983807

  it('UA 链按签名自己报的 detect_flags 重算，而不是模块常量', () => {
    for (const detectFlags of [4, 14, 0, 63]) {
      const signature = new ABogus(UA, { detectFlags, rng: () => 0.5 }).getValue('aid=6383&aweme_id=1', { nowMs: NOW })
      expect(decode(signature).detectFlags).toBe(detectFlags)

      // 用签名里解出的值重算 -> 命中；用默认常量（除非它恰好等于）-> 不命中
      const decoded = decodeABogus(signature, { query: 'aid=6383&aweme_id=1', userAgent: UA })
      expect(decoded.checks.find((item) => item.name === 'user_agent')?.status).toBe('match')
    }
  })

  const withSignature = (signedQuery: string, trailing: Record<string, string>): { url: string; signature: string } => {
    const signature = new ABogus(UA, { rng: () => 0.5 }).getValue(signedQuery, { nowMs: NOW })
    const params = new URLSearchParams(trailing)
    const url = `https://www.douyin.com/aweme/v1/web/aweme/favorite/?${signedQuery}&a_bogus=${encodeURIComponent(signature)}&${params.toString()}`
    return { url, signature }
  }

  it('uifid 在签名之前（浏览器形态）时，重建会把 uifid 算作被覆盖', () => {
    const signed = new URLSearchParams({ aid: '6383', aweme_id: '1', uifid: 'deadbeef' }).toString()
    const { url, signature } = withSignature(signed, {
      verifyFp: 'verify_x_y',
      fp: 'verify_x_y',
      timestamp: '1789389983',
      'x-secsdk-web-signature': 'f'.repeat(32)
    })

    const recovery = recoverSignedQuery(signature, url)
    expect(recovery).not.toBeNull()
    expect(recovery?.kept).toContain('uifid')
    expect(recovery?.salt).toBe('dhzx')
    expect(recovery?.query).toBe(signed)
  })

  it('uifid 在签名之后（amagi 管线形态）时，重建会把 uifid 摘掉', () => {
    const signed = new URLSearchParams({ aid: '6383', aweme_id: '1' }).toString()
    const { url, signature } = withSignature(signed, {
      uifid: 'deadbeef',
      timestamp: '1789389983',
      'x-secsdk-web-signature': 'f'.repeat(32)
    })

    const recovery = recoverSignedQuery(signature, url)
    expect(recovery).not.toBeNull()
    expect(recovery?.kept).not.toContain('uifid')
    expect(recovery?.query).toBe(signed)
  })

  it('串改过的 URL 不会假装命中', () => {
    const signed = new URLSearchParams({ aid: '6383', aweme_id: '1' }).toString()
    const { url, signature } = withSignature(signed, { timestamp: '1789389983' })

    expect(recoverSignedQuery(signature, url)).not.toBeNull()
    expect(recoverSignedQuery(signature, url.replace('aweme_id=1', 'aweme_id=2'))).toBeNull()
    // 换一个盐值去搜同样搜不到 —— 命中是真的有区分力的，不是「随便什么都匹配」
    expect(recoverSignedQuery(signature, url, ['cus'])).toBeNull()
  })

  it('decodeUrl 会把命中的重建方式记进 notes 与字段', () => {
    const signed = new URLSearchParams({ aid: '6383', aweme_id: '1', uifid: 'deadbeef' }).toString()
    const { url } = withSignature(signed, { timestamp: '1789389983' })
    const [decoded] = decodeUrl(url, { userAgent: UA })

    expect(decoded.recovered).toBe(true)
    expect(decoded.checks.find((item) => item.name === 'query')?.status).toBe('match')
    expect(decoded.notes.some((note) => note.startsWith('query_recovered:'))).toBe(true)
    expect(decoded.fields.find((item) => item.name === 'signed_query')?.value).toBe(signed)
  })
})
