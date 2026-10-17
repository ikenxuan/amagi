import { createHash } from 'node:crypto'

import { parseCookie, serializeCookie } from '../../../contracts/cookie'
import { extractUifidFromCookie } from '../cookie'
import { computeAcSignature, DEFAULT_HREF } from '../sign/acSignature'
import { AC_NONCE_COOKIE } from './detect'

/**
 * `__ac_nonce` 的进程内缓存，以及**发送前预置**那一段 `__ac_nonce + __ac_signature`。
 *
 * ## 为什么要有它
 *
 * 零 cookie 裸打页面时，服务端下发一份 VMP 挑战页与一个 `__ac_nonce`；`./solver.ts`
 * 解出签名并重放，那一发才拿到真页。解出来的 cookie 落在 `runtime/execute.ts`
 * **本次调用的 ctx 副本**上（`ctx.cookie = solved`），跨调用不保留 —— 于是同一个
 * 客户端连续打两次页面，第二次照样先撞一次挑战。2026-10-11 离线实测：同一个 ctx
 * 连续三次调用，每次都 2 发，服务端下发了 3 个 nonce。
 *
 * 修法不是去改 `execute.ts` 的副本语义（那是跨平台契约），而是**记住挑战段本身**：
 * 下次发送前把 `__ac_nonce` 与按当刻重算的 `__ac_signature` 直接带上，服务端认这对
 * 就不发挑战页 —— 一发到位。这也正是真浏览器的形态：挑战发下来的 `__ac_nonce` 是
 * `Set-Cookie`（`Max-Age=1800`），之后每个请求都带着它。
 *
 * 两条实测前提（2026-10-11）：
 *
 * - **`__ac_nonce` 可复用**：签发约 45 秒后仍被接受。
 * - **签名必须按当刻时钟重算**（整秒时间戳进签名），所以缓存的**只有 nonce 这一个值**，
 *   签名每次现算 —— 它是纯本地计算，缓存它只会拿到过期的一份。
 *
 * ## 缓存键：调用方 cookie 的**身份**，不是整串 cookie，也不是 UA
 *
 * 三个候选各自的毛病：
 *
 * - **整串 cookie**：任何一个无关字段变化都击穿缓存；而且凭证原文留在模块级 Map 里
 *   本身就不该做。
 * - **UA**：用户拍板否掉 —— 不同凭证的请求会共用同一个**服务端可见的令牌**。
 * - **身份字段**（本模块采用）：从 cookie 里取**一个**稳定身份值，摘要后当键。
 *
 * 取值顺序是「账号会话 → 访客 id → 设备标识」，前四个名字就是 `../credential.ts`
 * 判定「这是账号凭据」用的同一张表，后两个是访客 / 设备标识：
 *
 * ```text
 * sessionid / sessionid_ss / sid_guard / sid_tt   → 账号会话
 * UIFID 家族（六种拼写，走 extractUifidFromCookie） → 游客身份
 * ttwid                                           → 设备标识
 * 都没有                                          → 'anonymous' 一个共享键
 * ```
 *
 * **取第一个非空值**（不是把所有字段拼起来）：后者会让「后来多出一个 `sid_guard`」
 * 这种事也击穿缓存，而它并没有换凭证。代价写在明处：同一台设备上 `ttwid` 单独出现
 * 与「`UIFID_TEMP` + `ttwid`」出现算两个身份，会各撞一次挑战 —— 用户已接受
 * 「每份凭证各多撞一次挑战」这个代价。
 *
 * 摘要用 sha256 前 32 个 hex 字符（128 位，这个用途上不会撞）：键里因此只有指纹，
 * 没有凭证原文。
 *
 * ## 纪律：缓存里**只有 nonce**，永不存任何「合并好的 cookie 串」
 *
 * `../mint.ts` 的 `mintInflight` 注释里记着一次真实事故：那里曾是一个**不分键**的
 * inflight，存的是「第一个调用方合并后的整串 cookie」，两个带不同 cookie 的并发调用
 * 于是第二个拿到了第一个的结果、连 `sessionid` 一起 —— 实打实的凭证串台。
 *
 * 所以这里两条一起守：**键按身份分**，**值只有 nonce 这一个字符串**。合并永远发生在
 * {@link applyDouyinAcNonce} 里、用**当次调用方自己的 cookie** 现拼，缓存层碰不到
 * 任何一条 cookie 字段。
 *
 * @module platforms/douyin/anticrawler/acNonce
 */

/**
 * 预置签名用的 href：与解算重放用的是**同一个** {@link DEFAULT_HREF}。
 *
 * 两处算的是同一份 `__ac_signature`，href 不同签名就不同，预置的那一发会等于配错 pair
 * —— 而配错的 pair 实测会被拒、回的是滑块页（负向对照见 `./solver.ts`）。所以这里不
 * 另起一个字面量，直接引 `../sign/acSignature.ts` 的默认值。
 */
const AC_SIGNATURE_HREF = DEFAULT_HREF

/**
 * nonce 的复用上界。
 *
 * - **实测**（2026-10-11）：签发约 45 秒后仍被接受。
 * - **服务端声明**：`Max-Age=1800`（30 分钟）。
 *
 * 取**实测到的那一段**，不取服务端声明的 1800：更长的窗口没有实测支撑，而配错的 pair
 * 实测会被拒、回的是**滑块页**（见上面那段负向对照）。滑块是红线（只中转不求解），
 * 调用方拿到的是 `CAPTCHA_REQUIRED` —— 不值得为一个没验证过的窗口去赌。到期即弃，
 * 最多让调用方多撞一次挑战（本来就是这个代价）。
 */
const TTL_MS = 45_000

/** 缓存条数上限（参考 `../mint.ts` 的 `CACHE_MAX_ENTRIES`）。超了淘汰最早写入的一条 */
export const AC_NONCE_CACHE_MAX_ENTRIES = 64

/** 一条缓存：**只有 nonce**，没有 cookie 的任何字段 */
interface AcNonceEntry {
  nonce: string
  issuedAt: number
}

const cache = new Map<string, AcNonceEntry>()

/** 一个身份字段都没有时的共享键：匿名调用方没有凭证可串台 */
const ANONYMOUS_KEY = 'anonymous'

/** 账号会话字段，顺序与 `../credential.ts` 判定账号凭据那张表一致 */
const SESSION_COOKIE_NAMES = ['sessionid', 'sessionid_ss', 'sid_guard', 'sid_tt'] as const

/**
 * 从 cookie 里取「身份指纹」当缓存键。
 *
 * 见模块头：取**第一个非空**的身份字段，摘要后返回；一个都没有时返回
 * {@link ANONYMOUS_KEY}。凭证原文不进键。
 * @param cookie - 调用方 cookie
 * @returns 身份指纹（或匿名键）
 */
const identityOf = (cookie: string): string => {
  const jar = parseCookie(cookie)
  const digest = (source: string): string => createHash('sha256').update(source).digest('hex').slice(0, 32)
  for (const name of SESSION_COOKIE_NAMES) {
    const value = jar[name]?.trim()
    if (value) return digest(`${name}=${value}`)
  }
  const uifid = extractUifidFromCookie(cookie)
  if (uifid) return digest(`uifid=${uifid}`)
  const ttwid = jar.ttwid?.trim()
  return ttwid ? digest(`ttwid=${ttwid}`) : ANONYMOUS_KEY
}

/** 调用方自己已经带了完整的一对，就不再插手 */
const hasSignaturePair = (cookie: string): boolean => {
  const jar = parseCookie(cookie)
  return Boolean(jar[AC_NONCE_COOKIE]?.trim() && jar.__ac_signature?.trim())
}

/**
 * 记下一个刚解出来的 `__ac_nonce`。
 *
 * 由 `./solver.ts` 在解出签名之后调用 —— 记的是**挨挑战那一发的调用方 cookie** 的身份，
 * 不是解完合并后的那份：下一次调用手里就是前者。
 *
 * 同一个身份重复记时按「后写覆盖」并挪到队尾，于是淘汰的是**最久没被写入**的那条。
 * @param cookie - 挨挑战那一发的调用方 cookie
 * @param nonce - 服务端下发的 nonce；空串忽略
 */
export const rememberDouyinAcNonce = (cookie: string, nonce: string): void => {
  if (!nonce) return
  const key = identityOf(cookie)
  cache.delete(key)
  cache.set(key, { nonce, issuedAt: Date.now() })
  if (cache.size > AC_NONCE_CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}

/**
 * 发送前把缓存的 nonce 段预置到调用方 cookie 上。
 *
 * 返回 `undefined` 表示**不改动**：这个身份没有缓存、缓存已过期、没有 UA（签名摘 UA，
 * 拿不出与请求自洽的那一份）、或者签名算不出来。调用方自己已经带了完整的一对时原样
 * 返回入参 —— 与 `../mint.ts` 的 `mergeVisitorCookie` 同一条纪律「只补缺失的名字」。
 *
 * 合并用的是**当次调用方自己的 cookie**，缓存层只提供了 nonce 这一个值（见模块头的纪律）。
 *
 * ## 传进来的 UA 应与真正发出去的那串一致 —— 这是**仓库约定**，不是服务端要求
 *
 * 2026-10-11 实测（12 发，对照表在 `../mint.ts` 的 `mintInflight` 注释里）：**首页挑战
 * 这条路上**服务端不校验签名摘的 UA 与请求头 UA 是否一致 —— 交叉与反向两组都放行。
 * 所以「必须一致」在服务端层面不成立。
 *
 * 实测只覆盖首页挑战这一条通道，不是平台级结论。约定照旧守：对齐的代价是零，而赌
 * 「此刻不校验 ⇒ 处处不校验」要拿静默失配去换。
 * @param cookie - 本次调用的 cookie
 * @param userAgent - 本次请求的 UA；按上面那条约定与真正发出去的那串对齐
 * @returns 预置好的一段；不该预置时 `undefined`，调用方自己带了完整一对时原样返回
 */
export const applyDouyinAcNonce = (cookie: string, userAgent?: string): string | undefined => {
  if (!userAgent) return undefined
  if (hasSignaturePair(cookie)) return cookie
  const key = identityOf(cookie)
  const entry = cache.get(key)
  if (entry === undefined) return undefined
  if (Date.now() - entry.issuedAt >= TTL_MS) {
    cache.delete(key)
    return undefined
  }
  let signature: string
  try {
    signature = computeAcSignature(entry.nonce, userAgent, Date.now(), { href: AC_SIGNATURE_HREF })
  } catch {
    // 入参不合法（空 UA 之类）。预置是尽力而为，算不出来就按原样发
    return undefined
  }
  // 同名后写覆盖：调用方若只带了半对（有 nonce 没签名），这里补成完整的一对
  return serializeCookie({ ...parseCookie(cookie), [AC_NONCE_COOKIE]: entry.nonce, __ac_signature: signature })
}

/** 清空 nonce 缓存（模块级的，测试与换凭证场景用） */
export const resetDouyinAcNonceCache = (): void => {
  cache.clear()
}
