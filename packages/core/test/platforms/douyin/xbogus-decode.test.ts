import XBogus, { decodeXBogus, signXBogus, xBogusStructureError } from 'amagi/platforms/douyin/sign/x_bogus'
import { describe, expect, it } from 'vitest'

/**
 * X-Bogus 解码层的契约。
 *
 * 签名算法本身由 `sign.test.ts` 的 v6 对照锁死；这里锁的是**验证侧**：
 * ① 重签 → 拆解 → 候选链命中（自洽性，decodeXBogus 的全部机制都要在环上）；
 * ② 换候选输入必报「对不上」（检查有区分力，不是对什么都说匹配）；
 * ③ 常量指纹（前四格 / empty 摘要 / canvas 常量 / 校验位）真的能拦住伪造值；
 * ④ 时间戳可还原 —— 这是 X-Bogus 唯一能原样读回的字段。
 */
const PATH = '/aweme/v1/web/aweme/detail/?device_platform=webapp&aid=6383&aweme_id=7372484719365098803'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
const TS = 1789010742

describe('X-Bogus 解码层', () => {
  it('重签 → 结构检查通过 → 拆解出自洽的明文与命中', () => {
    const value = signXBogus(PATH, UA, TS)
    expect(value).toHaveLength(28)
    expect(xBogusStructureError(value)).toBeNull()

    const decoded = decodeXBogus(value, { query: PATH, userAgent: UA })
    expect(decoded.recovered).toBe(true)
    expect(decoded.checks.map((check) => check.name)).toEqual(['query', 'empty', 'user_agent'])
    for (const check of decoded.checks) {
      expect(check.status).toBe('match')
      expect(check.bits).toBe(16)
    }

    const timestamp = decoded.fields.find((field) => field.name === 'timestamp')
    expect(timestamp?.value).toContain(String(TS * 1000))
  })

  it('类入口与函数入口产出同一份签名（getXBogus 没在重构中走样）', () => {
    const url = `https://www.douyin.com${PATH}`
    const { xbogus, fullUrl, userAgent } = new XBogus().getXBogus(url, UA, { timestamp: TS })
    expect(xbogus).toBe(signXBogus(PATH, UA, TS))
    expect(fullUrl).toBe(`${url}&X-Bogus=${xbogus}`)
    expect(userAgent).toBe(UA)
  })

  it('换候选输入必报对不上 —— 检查有区分力', () => {
    const value = signXBogus(PATH, UA, TS)

    expect(decodeXBogus(value, { query: `${PATH}&extra=1`, userAgent: UA }).checks.find((c) => c.name === 'query')?.status).toBe('differs')
    expect(decodeXBogus(value, { query: PATH, userAgent: `${UA} ` }).checks.find((c) => c.name === 'user_agent')?.status).toBe('differs')
    // 没给候选就是 not_supplied，而不是假装命中；empty 链对的是常量，永远自检
    const without = decodeXBogus(value)
    expect(without.checks.find((check) => check.name === 'query')?.status).toBe('not_supplied')
    expect(without.checks.find((check) => check.name === 'user_agent')?.status).toBe('not_supplied')
    expect(without.checks.find((check) => check.name === 'empty')?.status).toBe('match')
  })

  it('时间戳解出来就是签进去的那个', () => {
    for (const ts of [0, 1, 1789010742, 4294967295]) {
      const decoded = decodeXBogus(signXBogus(PATH, UA, ts))
      expect(decoded.fields.find((field) => field.name === 'timestamp')?.value).toContain(String(ts * 1000))
    }
  })

  it.each([
    ['换一个字符（多半落在校验位或摘要上）', signXBogus(PATH, UA, TS).replace(/.$/, (char) => (char === 'A' ? 'B' : 'A'))],
    ['长度不对', signXBogus(PATH, UA, TS).slice(1)],
    ['伪造一串同长度值', 'A'.repeat(28)]
  ])('结构检查拦得住：%s', (_name, value) => {
    expect(xBogusStructureError(value)).not.toBeNull()
    const decoded = decodeXBogus(value)
    expect(decoded.recovered).toBe(false)
    expect(decoded.reason).toMatch(/^malformed:/)
  })
})
