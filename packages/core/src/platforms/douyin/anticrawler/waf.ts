import { createHash } from 'node:crypto'

/**
 * WAF 工作量证明挑战（`_wafchallengeid`）的解算。
 *
 * **这是纯算法计算，不是绕过验证**：挑战页要求的就是「算出一个 sha256 碰撞数」，
 * 没有任何人机判定、没有轨迹、没有图形识别 —— 与本仓
 * `../sign/acSignature.ts`（纯算 `__ac_signature`，`../mint.ts` 与 `./solver.ts`
 * 都用它）同类，属于「只中转不绕过」的字面范围。真人在浏览器里撞上这一关也是
 * JS 自动算完直接 reload，没有人参与。
 *
 * ## 挑战页声明的算法
 *
 * 判据与运算规则全部抄自挑战页自己的那段脚本（fixture `waf_challenge.html`
 * 第一行，2492B，`out-sha256.js` 提供 `s256` / `b64tohex` / `b64tou8a`）：
 *
 * ```js
 * var wci="_wafchallengeid",cs="<base64 JSON>",
 *     c=JSON.parse(atob(cs)), prefix=b64tou8a(c.v.a), expect=b64tohex(c.v.c), i=0,
 *     iid=setInterval(function(){
 *       expect===s256(prefix,""+i) && (c.d=btoa(""+i), clearInterval(iid),
 *         document.cookie=wci+"="+btoa(JSON.stringify(c))+"; Max-Age=1",
 *         window.location.reload()),
 *       i++, i>1e6&&clearInterval(iid)
 *     },1)
 * ```
 *
 * 逐条对应到下面的实现：
 *
 * - `cs` 解 base64 得 `{ v: { a, b, c }, s }`。`v.a` 是**前缀字节**、`v.c` 是**期望摘要
 *   字节**，两者都是 **32 字节原始摘要的 base64**（本仓独立验算过长度）。页面用
 *   `b64tou8a` / `b64tohex` 取回它们，所以这里 `Buffer.from(x, 'base64')` 是等价的。
 *   `v.b` 是下发时间戳、`s` 是签名 —— 后两者我们不碰，原样带回。
 *   ⚠️ 参考实现的注释说「浏览器端先 `btoa(hex)` 编码」，**那句是错的**：页面
 *   `btoa` 的是原始字节、不是 hex 串（否则 `b64tohex` 会得到 hex 的 hex）。它的**代码**
 *   没错、只有注释错，移植时已订正，别把那句搬回来。
 * - 难度条件是**整串 hex 全等**（不是前导零那种前缀匹配）：
 *   `sha256(prefix ‖ utf8(String(i))) === expect`。
 * - 解出后按页面的同一顺序回填：先 `c.d = base64(String(i))`，再整体
 *   `base64(JSON.stringify(c))` 作为 cookie 值。键序沿用解析所得（`v`、`s`、`d`），
 *   与页面 `JSON.stringify` 的结果一致。
 *
 * 上界 `1e6` 也照页面取。**运算量我们只有一个样本**：本仓 fixture 的答案是
 * `i = 1`（一次就中）。参考实现称真实挑战在几万量级，我们手上没有那样的样本、
 * 未复测 —— 所以暴搜逻辑另由合成的高 `i` 用例验证（见
 * `test/platforms/douyin/anticrawler.test.ts`），不靠这份 fixture 证明它会搜。
 *
 * 取 `cs` 用的是**一条正则取一个属性值**，不是解析 HTML 文档结构：挑战参数只在
 * 响应体里、没有别的来源，而拿它并不需要遍历 DOM 或按标签层级找东西，也不引入
 * 任何 HTML 解析器依赖。
 *
 * @module platforms/douyin/anticrawler/waf
 */

/** WAF 挑战答案要写进的 cookie 名 */
export const WAF_CHALLENGE_COOKIE = '_wafchallengeid'

/** 暴搜上界，与挑战页脚本的 `i>1e6` 一致 */
const MAX_PROBE = 1_000_000

/** 挑战页 `cs` 解出来的载荷。`v.b`（时间戳）与 `s`（签名）只透传，不参与运算 */
interface WafChallengeBody {
  v?: { a?: unknown; c?: unknown }
}

/**
 * 解一份 WAF 挑战页，算出 `_wafchallengeid` 的 cookie 值。
 *
 * 返回**只是值**、不是 `名=值` 片段：值本身是 base64（带 `=` 填充），拼成片段再
 * 交给 cookie 解析器是一次没必要的往返。合并进 cookie 串由
 * {@link solveDouyinAnticrawler} 负责。
 * @param html - WAF 挑战页正文
 * @returns `_wafchallengeid` 的值；不是 WAF 页、载荷形状不对或上界内无解时 `undefined`
 */
export const solveWafChallenge = (html: string): string | undefined => {
  const match = /cs="([^"]+)"/.exec(html)
  if (!match) return undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'))
  } catch {
    return undefined
  }
  if (parsed === null || typeof parsed !== 'object') return undefined

  const body = parsed as WafChallengeBody
  const prefixB64 = body.v?.a
  const expectB64 = body.v?.c
  if (typeof prefixB64 !== 'string' || typeof expectB64 !== 'string' || prefixB64 === '' || expectB64 === '') return undefined

  const prefix = Buffer.from(prefixB64, 'base64')
  // 页面是 atob() 取回原始字节再 b64tohex，这里等价还原成 hex
  const expect = Buffer.from(expectB64, 'base64').toString('hex')

  for (let i = 0; i <= MAX_PROBE; i++) {
    const digest = createHash('sha256').update(prefix).update(String(i), 'utf8').digest('hex')
    if (digest !== expect) continue
    // 与页面同序：c.d = btoa(""+i)，再整体 btoa(JSON.stringify(c))
    const answered = { ...(parsed as Record<string, unknown>), d: Buffer.from(String(i)).toString('base64') }
    return Buffer.from(JSON.stringify(answered)).toString('base64')
  }
  return undefined
}
