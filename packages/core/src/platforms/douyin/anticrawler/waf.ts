import { createHash } from 'node:crypto'

/**
 * WAF PoW 挑战（`_wafchallengeid`）的解算。
 *
 * 挑战页内嵌 `cs="<base64 JSON>"`，JSON 形状：
 *
 * ```jsonc
 * {
 *   "v": { "a": "<prefix base64>", "b": <timestamp>, "c": "<expect-raw base64>" },
 *   "s": "<signature>"
 * }
 * ```
 *
 * 要求暴搜一个整数 `i` 使 `sha256(prefix || utf8(i))` 的 hex **等于**
 * `base64decode(c)` 的 hex（页面上 `c` 是「期望摘要的原始字节」，浏览器端先
 * `btoa(hex)` 编码）。解出后与页面同序：
 *
 * 1. `c.d = base64(String(i))` —— 只编码 `i` 本身；
 * 2. 整体 `base64(JSON.stringify(c))` 作为 `_wafchallengeid` 的 cookie 值。
 *
 * 实际运算量：真实挑战的 `i` 在几万量级，毫秒级解出。
 * @param html - WAF 挑战页正文
 * @returns 可直接写进 Cookie 头的完整段 `_wafchallengeid=<value>`；解不出返回 `undefined`
 */
export const solveWafChallenge = (html: string): string | undefined => {
  const match = /cs="([^"]+)"/.exec(html)
  if (!match) return undefined

  let c: { v?: Record<string, unknown>; d?: string }
  try {
    c = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'))
  } catch {
    return undefined
  }
  if (c?.v === undefined || typeof c.v !== 'object') return undefined

  const a = c.v.a
  const rawExpect = c.v.c
  if (typeof a !== 'string' || typeof rawExpect !== 'string' || a.length === 0 || rawExpect.length === 0) return undefined

  const prefix = Buffer.from(a, 'base64')
  // 期望摘要：页面用 atob() 取回原始字节再转 hex，这里等价还原
  const expect = Buffer.from(rawExpect, 'base64').toString('hex')

  for (let i = 0; i <= 1_000_000; i++) {
    const digest = createHash('sha256').update(prefix).update(String(i), 'utf8').digest('hex')
    if (digest === expect) {
      // 与页面同序：先 c.d = btoa(""+i)，再整体 btoa(JSON.stringify(c))
      const value = Buffer.from(JSON.stringify({ ...c, d: Buffer.from(String(i)).toString('base64') })).toString('base64')
      return `_wafchallengeid=${value}`
    }
  }
  return undefined
}
