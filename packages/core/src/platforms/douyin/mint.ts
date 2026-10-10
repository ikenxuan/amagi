import axios from 'axios'

import { computeAcSignature } from './sign/acSignature'
import { extractUifidFromCookie } from './sign/secsdkWebSign'
import { ensureDouyinTtwid, type TtwidDeps } from './ttwid'

/**
 * 抖音访客 id（`UIFID_TEMP`）的铸造与 cookie 审计。
 *
 * 受 secsdk 保护的端点（`/aweme/v1/web/music/detail/` 等）要求 cookie 里带访客 id，
 * 而它不由登录颁发——passport 扫码链路只发身份 cookie。缺了它，受保护端点稳定回
 * `403 Uifid Not Found`（见 `judge.ts` 的 `SIGNATURE_REFUSED` 归因）。
 *
 * 铸造是纯 HTTP 的，三步：
 *
 * 1. `GET www.douyin.com` → 服务端在 Set-Cookie 里发 `__ac_nonce`。**响应体不看**
 *    （它是一份 VMP 挑战页，但签名不需要它，见下）；
 * 2. 用 {@link computeAcSignature} **纯算**出 `__ac_signature` —— 不执行挑战页脚本，
 *    本文件没有 `node:vm` / `eval` / `new Function` 任何一条执行路径；
 * 3. 带 `__ac_nonce + __ac_signature` 再 GET 一次 → 服务端一次性 Set-Cookie **四个**
 *    （2026-10-10 实测，按 `getSetCookie()` 原始行计）：`ttwid`(127) +
 *    `enter_pc_once`(1) + `web_sign_token`(167) + `UIFID_TEMP`(160 个 hex 字符)。
 *
 * `s_v_web_id` **不在其中** —— 首页三次 GET 都没有发过它，页面内联脚本里也找不到
 * `verify_<36进制>_<尾巴>` 形状。它是前端自抽的，所以 `deviceFp.ts` 回落到
 * {@link module:platforms/douyin/deviceFp.DOUYIN_PROCESS_FP} 是这里唯一能做的事，
 * 不是缺了一次服务端取值。
 *
 * 同一客户端上下文（IP + UA）重复铸造返回同一个 `UIFID_TEMP`（有效期约 500 天），
 * 进程内缓存一次即可。
 *
 * 接线：`PLATFORM_RUNTIME.douyin.ensureCookie` 在每次请求 prepare 之后审计
 * （prepare 可能整串换 cookie，审计要对最终生效的那份负责）；`session/qrcode.ts`
 * 在登录完成时审计，让扫码登录直接产出带访客 id 的凭证。
 *
 * 铸造尽力而为：网络失败、签名被拒——一律返回原 cookie，归因交给
 * `SIGNATURE_REFUSED`。不抛错：自愈失败不该把调用变成 `internal`。
 *
 * 铸造失败时还有一层**轻量回落**：{@link module:platform/douyin/ttwid} 的零凭证 ttwid
 * 注册（一发 POST，无签名）。它拿不到访客 id，所以治不了受保护端点的 403——补的是
 * 「至少有个真实 ttwid」。2026-10-10 实测这一个 ttwid 足够打通直播间
 * `webcast/room/web/enter/`（同一请求零 cookie 时回包体为空），见 ttwid.ts 的记录。
 *
 * @module platform/douyin/mint
 */

/** 无调用方 UA 时铸造请求的兜底 UA。与 amagi 默认基线同代 */
const DEFAULT_MINT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

/** 铸造出的访客 cookie */
export interface DouyinMintedVisitor {
  /** 服务端铸造的 `ttwid` */
  ttwid: string
  /** 服务端铸造的 `UIFID_TEMP`（160 个 hex 字符，2026-10-10 实测） */
  uifidTemp: string
  /**
   * 服务端铸造的 `web_sign_token`（167 字符）。可选：只在服务端这一发发了它时有值。
   *
   * 2026-10-10 实测补上它**不改变** `aweme/v1/web/aweme/detail/` 的 `core_dep` 过滤
   * （见 {@link mergeVisitorCookie} 的 A/B 记录），补它的理由只是「服务端发了就别丢」。
   */
  webSignToken?: string
  /** 服务端铸造的 `enter_pc_once`（1 字符开关）。可选，同上 */
  enterPcOnce?: string
}

/**
 * 首页 GET 的可注入出口（测试用）。`setCookies` 是原始 Set-Cookie 行数组。
 *
 * **出口只交 Set-Cookie，不交响应体**：铸造两发都只用得上 cookie，签名是纯算的。
 * 响应体从这个契约里去掉，是让「不解析挑战页」成为**结构上做不到**的事，而不是
 * 一条靠人遵守的约定（第二发的响应体实测 ~1MB，拿进来也只是白占内存）。
 *
 * 继承 {@link TtwidDeps}：审计的两条出网路径（铸造、ttwid 回落）共用同一个 deps
 * 对象，调用方注入一次就能把两条都挡在测试之外。
 */
export interface MintDeps extends TtwidDeps {
  getHome?: (cookie: string | undefined, userAgent: string) => Promise<{ setCookies: string[] }>
}

/**
 * 测试环境守卫：vitest 进程内默认出口**不做真实出网请求**（审计在测试里保持透明，
 * 断言 Cookie 透传的用例不该被一次真网铸造改写）。通过 {@link MintDeps.getHome}
 * 注入出口的用例不受影响——守卫只管默认出口。
 */
const testEnvGuard = async (): Promise<never> => {
  throw new Error('douyin visitor mint is disabled under vitest (inject MintDeps.getHome to test it)')
}

/**
 * 运营开关：`AMAGI_DISABLE_DOUYIN_MINT=1` 关闭自动铸造。
 *
 * 铸造是 amagi **自主发起**的出网请求（用户没有显式调用任何端点），出口受限、
 * 安全审计、或「cookie 由我自己全权管理」的环境需要一个明确的选择权。关闭后
 * cookie 保持原样，受保护端点按 `SIGNATURE_REFUSED` 的既有归因失败。注入
 * {@link MintDeps.getHome} 的用例不受影响——开关只管默认出口。
 */
const mintDisabledByEnv = (): boolean => process.env.AMAGI_DISABLE_DOUYIN_MINT === '1'

const defaultGetHome = async (cookie: string | undefined, userAgent: string): Promise<{ setCookies: string[] }> => {
  if (process.env.VITEST) return testEnvGuard()
  if (mintDisabledByEnv()) return testEnvGuard()
  // 响应体照旧收下（HTTP 层没有「只要头」的选项），但**不读** —— 见 MintDeps 的说明。
  // 第二发实测 ~1.0MB，axios 默认不限长，这里也不限：限了就等于把铸造掐断
  const response = await axios.get<string>('https://www.douyin.com/', {
    headers: { 'User-Agent': userAgent, Accept: 'text/html', ...(cookie ? { Cookie: cookie } : {}) },
    timeout: 15_000,
    maxRedirects: 5,
    responseType: 'text'
  })
  const setCookies = response.headers['set-cookie'] ?? []
  return { setCookies: Array.isArray(setCookies) ? setCookies : [setCookies] }
}

/** 从 Set-Cookie 行数组里取某个 cookie 的值 */
const setCookieValue = (cookies: string[], name: string): string | undefined => {
  const line = cookies.find((c) => c.startsWith(name + '='))
  return line ? line.split(';')[0].split('=').slice(1).join('=') : undefined
}

/**
 * 铸造一次访客 id（两次 GET + 纯算签名）。不做缓存、不去重——那是
 * {@link ensureDouyinVisitorCookie} 的职责。
 *
 * 第一发**只读 Set-Cookie 的 `__ac_nonce`，不解析响应体**：签名由
 * {@link computeAcSignature} 纯算，不需要挑战页里的任何东西。
 *
 * ## 失败判据：第二发没拿到 ttwid / UIFID_TEMP 就算签名被拒
 *
 * 三点必须写明：
 *
 * 1. **这个判据分不清「抖音换了签名算法」和「其他拒绝」。** 服务端对坏签名与对
 *    换版后的旧签名都是同一种反应（不发铸造 cookie），回包里没有区分二者的信号。
 *    所以换版会表现成普通的铸造失败 —— 走下面那条 ttwid 回落，**不回落 vm**。
 * 2. **纯算用的是 shim 那组环境位**（`directSign` / `dom` / `test`，`fieldMask`
 *    `0x88120`）。这与本文件此前那条 `node:vm` 路径在同一个 shim 下跑出来的值
 *    **是同一组**（纯算就是照那条路径的输出逐位复原的），所以这次替换**行为不变**，
 *    不是换了一套签名语义。
 * 3. **真浏览器里这组环境位是什么，未验证。** 我们手上只有 shim 这一个观测点；
 *    服务端是否对不同环境位有不同策略，没有证据。
 * @param userAgent - 铸造请求的 UA（与后续 API 请求保持一致）
 * @param deps - 可注入的 HTTP 出口（测试用）
 * @returns 铸造结果；拿不到 nonce / 签名被拒（含换版）/ 网络失败时 `undefined`
 */
export const mintDouyinVisitorCookie = async (userAgent?: string, deps?: MintDeps): Promise<DouyinMintedVisitor | undefined> => {
  const ua = userAgent || DEFAULT_MINT_UA
  const getHome = deps?.getHome ?? defaultGetHome
  try {
    const first = await getHome(undefined, ua)
    const nonce = setCookieValue(first.setCookies, '__ac_nonce')
    if (!nonce) return undefined

    const signature = computeAcSignature(nonce, ua)

    const second = await getHome(`__ac_nonce=${nonce}; __ac_signature=${signature}`, ua)
    const ttwid = setCookieValue(second.setCookies, 'ttwid')
    const uifidTemp = setCookieValue(second.setCookies, 'UIFID_TEMP')
    if (!ttwid || !uifidTemp) return undefined
    // 另外两个是**可选**的：核心两项缺任何一个都算铸造失败，这两项缺了照样出货
    return {
      ttwid,
      uifidTemp,
      webSignToken: setCookieValue(second.setCookies, 'web_sign_token'),
      enterPcOnce: setCookieValue(second.setCookies, 'enter_pc_once')
    }
  } catch {
    return undefined
  }
}

/**
 * 把铸造结果合并进现有 cookie。**只补缺失的名字**：`ttwid` 已有则不动（那是调用方
 * 的设备标识，铸造顺带产的那份与它会话无关），访客 id 已有任何拼写则原样返回。
 *
 * ## `web_sign_token` / `enter_pc_once` 的分量：有服务端出处，但不治 `core_dep`
 *
 * 2026-10-10 A/B（同一次铸造的 4 个 cookie，走仓库 fetcher 打
 * `/aweme/v1/web/aweme/detail/`，每组一发）：
 *
 * ```text
 * A ttwid+UIFID_TEMP                              211 字节 core_dep
 * B A+web_sign_token                              211 字节 core_dep
 * C B+enter_pc_once                               211 字节 core_dep
 * D C+s_v_web_id（本地抽，与 query 的 fp 对齐）    211 字节 core_dep
 * E D+__ac_nonce/__ac_signature                   211 字节 core_dep
 * ```
 *
 * 五组**字节数完全相同**。换成用户浏览器里的正式 `UIFID`（320 字符）也是同一个 211
 * 字节。所以 `aweme/detail` 对游客的 `filter_reason: "core_dep"` 不是 cookie 缺项，
 * 补这两个名字治不了它 —— 合并它们的唯一理由是「服务端发了就别丢」。
 *
 * 同一份游客 cookie 下 `suggestWords` / `emojiList` / `comments` 三条**是通的**
 * （200 + 正常 body），`search` 与 `dynamicEmojiList` 回「登录状态已失效」/「用户未登录」。
 * 可见游客凭证本身有效，`core_dep` 是 `aweme/detail` 这条的策略。
 * @param cookie - 现有 cookie 串，可为空
 * @param minted - 铸造结果
 * @returns 合并后的 cookie 串；无可合并项时原样返回
 */
export const mergeVisitorCookie = (cookie: string | undefined, minted: DouyinMintedVisitor): string => {
  const base = cookie?.trim() ? cookie.trim().replace(/;\s*$/, '') : ''
  const names = new Set(
    base
      .split(';')
      .map((p) => p.split('=')[0].trim())
      .filter(Boolean)
  )
  if (names.has('UIFID_TEMP') || names.has('UIFID') || names.has('uifid') || names.has('uifid_temp')) return base

  const parts: string[] = []
  if (!names.has('ttwid') && minted.ttwid) parts.push(`ttwid=${minted.ttwid}`)
  if (minted.uifidTemp) parts.push(`UIFID_TEMP=${minted.uifidTemp}`)
  if (!names.has('web_sign_token') && minted.webSignToken) parts.push(`web_sign_token=${minted.webSignToken}`)
  if (!names.has('enter_pc_once') && minted.enterPcOnce) parts.push(`enter_pc_once=${minted.enterPcOnce}`)
  if (parts.length === 0) return base
  return base ? `${base}; ${parts.join('; ')}` : parts.join('; ')
}

/**
 * 铸造失败时的降级合并：把注册来的 ttwid 补进 cookie。
 *
 * 与 {@link mergeVisitorCookie} 同一条语义 —— **只补缺失的名字**：cookie 里已经有
 * ttwid 就原样返回（那是调用方的设备标识，不拿注册来的那份盖掉它）。
 * @param cookie - 现有 cookie 串，可为空
 * @param ttwid - 注册到的 ttwid；`undefined` 表示回落也没拿到
 * @returns 补好的 cookie；无可补项时原样返回
 */
const withFallbackTtwid = (cookie: string | undefined, ttwid: string | undefined): string | undefined => {
  if (!ttwid) return cookie
  const base = cookie?.trim() ? cookie.trim().replace(/;\s*$/, '') : ''
  const names = new Set(
    base
      .split(';')
      .map((p) => p.split('=')[0].trim())
      .filter(Boolean)
  )
  if (names.has('ttwid')) return base
  return base ? `${base}; ttwid=${ttwid}` : `ttwid=${ttwid}`
}

/** 审计缓存：原始 cookie（+UA）→ 合并后 cookie。进程级，`UIFID_TEMP` 有效期约 500 天 */
const cache = new Map<string, string>()
/**
 * in-flight 去重：**只去重铸造本身**，键是 UA。
 *
 * 存的是铸造产物（{@link DouyinMintedVisitor}，与调用方无关），**不是**某个调用方合并后的
 * cookie —— 合并由各调用方用自己的 cookie 做。
 *
 * 为什么按 UA 分键：铸造请求带 UA 且 UA 参与 acrawler 签名，同一 IP+UA 重复铸造返回同一个
 * `UIFID_TEMP`，跨 UA 没有这个保证，所以不同 UA 的铸造不该共享一次。cookie 不进键 ——
 * 第一发 GET 刻意不带 cookie，铸造结果与调用方 cookie 无关。
 *
 * 历史坑（已修）：这里曾是一个不分键的 `let inflight: Promise<string | undefined>`，存的是
 * 「第一个调用方合并后的整串 cookie」。两个带不同 cookie 的并发调用，第二个会拿到第一个的
 * 结果、连它的 `sessionid` 一起拿走 —— 实打实的凭证串台。amagi 是接口库，一个进程服务多份
 * 凭证是正常用法。回归用例见 mint.test.ts 的「⑦ 并发不串台」。
 */
const mintInflight = new Map<string, Promise<DouyinMintedVisitor | undefined>>()

const CACHE_MAX_ENTRIES = 64

/**
 * cookie 审计：缺访客 id 时铸造并合并，其余原样返回。进程内缓存，同一 cookie 只铸一次。
 *
 * **永不为调用增加失败**：任何异常都吞掉并返回原 cookie，请求按原路径走——自愈失败
 * 的归因交给受保护端点自己的 `SIGNATURE_REFUSED`。
 * @param cookie - 本次调用的 cookie，可为空（全新部署连 cookie 都没配的场景）
 * @param userAgent - 本次调用的 UA（铸造请求用它，保证与后续 API 请求同源）
 * @param deps - 可注入的 HTTP 出口（测试用）
 * @returns 升级后的 cookie；无需升级或铸造失败时原样返回
 */
export const ensureDouyinVisitorCookie = async (
  cookie: string | undefined,
  userAgent?: string,
  deps?: MintDeps
): Promise<string | undefined> => {
  // 已有访客 id（六种拼写之一）→ 无需审计
  if (cookie && extractUifidFromCookie(cookie)) return cookie

  const cacheKey = `${cookie ?? ''} ${userAgent ?? ''}`
  const hit = cache.get(cacheKey)
  if (hit !== undefined) return hit

  // 只对**铸造**去重，合并不去重：铸造与调用方 cookie 无关，所以不同 cookie 的并发调用
  // 复用同一次铸造是对的；而合并必须各用自己的 cookie，否则就是把别人的身份项发给调用方。
  const mintKey = userAgent ?? ''
  let flying = mintInflight.get(mintKey)
  if (flying === undefined) {
    flying = mintDouyinVisitorCookie(userAgent, deps).finally(() => mintInflight.delete(mintKey))
    mintInflight.set(mintKey, flying)
  }

  try {
    const minted = await flying
    // 铸造失败 → 回落到 ttwid 注册。降级结果**刻意不进审计缓存**：缓了就等于在整个
    // 进程生命周期里放弃再铸一次真访客 id 的机会。代价是铸造失败后每次调用都重试铸造
    // ——这条路本来已经是坏的，而 ttwid 自己有缓存与失败冷却，重试的只是铸造那两发。
    if (!minted) return withFallbackTtwid(cookie, await ensureDouyinTtwid(userAgent, deps))
    const merged = mergeVisitorCookie(cookie, minted)
    cache.set(cacheKey, merged)
    if (cache.size > CACHE_MAX_ENTRIES) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
    return merged
  } catch {
    return cookie
  }
}

/** 清空审计缓存与在飞的铸造（都是模块级的，测试与换凭证场景用） */
export const resetDouyinVisitorCookieCache = (): void => {
  cache.clear()
  mintInflight.clear()
}
