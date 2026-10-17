import axios from 'axios'

import { TTWID_REGISTER_URL } from './sign/tokens'

/**
 * 抖音 `ttwid` 的动态注册：零凭证也能拿到一个服务端下发的 ttwid。
 *
 * 定位是 {@link module:platform/douyin/mint} 的**轻量回落**，不是替代品。正常路径仍是
 * 铸造（两次 GET + acrawler 离线签名），它一次拿到 `ttwid` + `UIFID_TEMP` + 另两项；
 * 受 secsdk 保护的端点要的是**访客 id**，光有 ttwid 不够。只有铸造失败（网络不通、
 * 挑战页形状变化、签名被拒）时才走这里，让 cookie 至少带上一个真实 ttwid。
 *
 * ## 注册接口实测（2026-10-10，零 cookie、零签名）
 *
 * `POST https://ttwid.bytedance.com/ttwid/union/register/`
 *
 * ```text
 * HTTP 200（没有 Location 头 —— 不存在「跟随 302」这回事）
 * body  {"status_code":0,"message":"union register success",
 *        "redirect_url":"https://www.douyin.com/ttwid/union/register/callback/?aid=…&ticket=…"}
 * 唯一一行 Set-Cookie：
 *        ttwid=…; Path=/; Domain=bytedance.com; Max-Age=31536000; HttpOnly; Secure; SameSite=None
 * ```
 *
 * 两条要点，都影响实现：
 *
 * 1. **ttwid 只在 Set-Cookie 里**，响应体里没有（体里只有那三个字段）。所以
 *    {@link pickTtwid} 先读响应头；读响应体是对旧回包形态的兜底，本次实测未命中。
 * 2. 回包是 200 而不是 302，`redirect_url` 只是体里的一个字段。所以注册**不跟随
 *    重定向**：`maxRedirects: 0`。跟随只会把同一个值的 Domain 换成 `.douyin.com`，
 *    对我们没意义（我们只取值，Domain 属性被丢掉）。
 *
 * 拿到的 ttwid 形状（实测）：127 字符，percent-encoded 的四段
 * `1%7C<43 字符>%7C<10 位秒级时间戳>%7C<64 个 hex>`，解码后即 `1|…|…|…`。
 * 与铸造链路下发的 ttwid 同为 127 字符。
 *
 * ## 载荷：逐字段实测出来的最小必需集（2026-10-10，串行打，每发之间留间隔）
 *
 * 做法是减法：从一个全字段载荷出发，每次只删一个字段打一发，看还能不能拿到 ttwid。
 *
 * ```text
 * 必需（删掉就 status_code=1001 "parse params fail"，一个 cookie 都不下发）：
 *   aid      删 → 1001 ；aid=0 → 1001 ；aid=1768 / 6383 → 都成功
 *   service  删 → 1001 ；service='' → 1001 ；'www.douyin.com' / 'www.ixigua.com' → 都成功
 * 可省（单独删掉后仍拿到 127 字符 ttwid）：
 *   region / needFid / migrate_info / cbUrlProtocol / union / need_t / migrate_priority
 * 空载荷 {} → 1001
 * 七个可省字段**一起**删 → 仍然 200 + 127 字符（单删可省不等于联合可省，所以单独验了这一发）
 * ```
 *
 * 那几个开关换值（`union=false`、`needFid=true`、`cbUrlProtocol='http'`、`need_t=0`、
 * `migrate_priority=1`、`migrate_info.source='web'`）**一律照样成功**，看不出任何可观测
 * 影响 —— 这正是不保留它们的理由：留着也说不出传的是什么意思。
 *
 * `domain: '.douyin.com'` 也不传：实测无效果，回包 Set-Cookie 的 Domain 恒为
 * `bytedance.com`，服务端不按这个字段改下发域。
 *
 * `aid` 取 1768：1768 与 6383 都能注册成功，拿到的 ttwid 都能打通直播间端点，没有观测到
 * 差异。6383 是现成的备选值（哪天 1768 失效就换它）。
 * **未实测**：两个 aid 的 ttwid 在受 secsdk 保护的端点上是否有差异 —— 那条路对游客本来
 * 就不通（`core_dep`），无从区分。
 *
 * ## 拿到的 ttwid 真能用（2026-10-10 实测）
 *
 * 用上面的最小载荷注册到的 ttwid，单独放进 cookie 打
 * `live.douyin.com/webcast/room/web/enter/?web_rid=<在播直播间>`：
 *
 * ```text
 * 只带这一个 ttwid → HTTP 200，回包 34088 字节，status_code=0，room.status=2，
 *                    标题 / 流地址 / 主播昵称齐全
 * 零 cookie 对照   → HTTP 200，回包 0 字节（空包）
 * ```
 *
 * 所以这个回落不是摆设：零凭证下它把一条本来拿不到任何内容的请求变成了完整回包。
 * 但它**不解**受 secsdk 保护端点的 `core_dep`（见 `mint.ts` 的 A/B 记录）——那要的是访客 id。
 *
 * 别和 `sign/tokens.ts` 里的 `DOUYIN_TTWID_PAYLOAD` / `DOUYIN_TTWID` 搞混：那两个常量配的是
 * `service: 'www.ixigua.com'`（ixigua 场景），与本模块的 web 版不是一回事，至今没有任何
 * 内部调用方。本模块单独声明一份，不复用它们。
 *
 * @module platform/douyin/ttwid
 */

/**
 * ttwid 注册体：**只有实测证明必需的两个字段**（逐字段实测见模块注释）。
 *
 * 两项都是「删了就拿不到」级别：
 *
 * - `aid` —— 应用标识。删掉、或传 0 → `status_code=1001 "parse params fail"`，不下发 cookie；
 * - `service` —— 注册给哪个站点。删掉、或传空串 → 同样 1001。
 *
 * 其余候选字段实测可省（删掉照样拿到 127 字符 ttwid），所以一个都不传：载荷里没有
 * 任何值是我们说不清作用的。也不含任何凭证 —— 整个载荷就这两项。
 */
export const DOUYIN_WEB_TTWID_PAYLOAD = {
  aid: 1768,
  service: 'www.douyin.com'
} as const

/**
 * 无调用方 UA 时的兜底 UA。
 *
 * 与 `mint.ts` 的 `DEFAULT_MINT_UA` 是同一基线，两处各写一份：`mint.ts` 要 import
 * 本模块，本模块再 import 它就成了循环引用。
 */
const DEFAULT_TTWID_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

/** 注册 POST 的可注入出口（测试用）。`setCookies` 是原始 Set-Cookie 行数组 */
export interface TtwidDeps {
  postTtwidRegister?: (userAgent: string) => Promise<{ setCookies: string[]; body: unknown }>
}

/**
 * 测试环境守卫：vitest 进程内默认出口**不做真实出网请求**。注入
 * {@link TtwidDeps.postTtwidRegister} 的用例不受影响——守卫只管默认出口。
 */
const testEnvGuard = async (): Promise<never> => {
  throw new Error('douyin ttwid register is disabled under vitest (inject TtwidDeps.postTtwidRegister to test it)')
}

/**
 * 运营开关，两个都认（与 `mint.ts` 的 `AMAGI_DISABLE_DOUYIN_MINT` 同一套理由：
 * 这是 amagi **自主发起**的出网请求，用户没有显式调用任何端点）：
 *
 * - `AMAGI_DISABLE_DOUYIN_MINT=1` —— 连带关掉本回落。关铸造的人要的是「cookie 由我
 *   全权管理」，再偷偷替他注册一个 ttwid 违背同一个意图；
 * - `AMAGI_DISABLE_DOUYIN_TTWID=1` —— 只关回落，保留铸造。给「铸造可以、但不希望
 *   多一个 bytedance.com 域的出网目标」的环境。
 */
const ttwidDisabledByEnv = (): boolean => process.env.AMAGI_DISABLE_DOUYIN_MINT === '1' || process.env.AMAGI_DISABLE_DOUYIN_TTWID === '1'

const defaultPostTtwidRegister = async (userAgent: string): Promise<{ setCookies: string[]; body: unknown }> => {
  if (process.env.VITEST) return testEnvGuard()
  if (ttwidDisabledByEnv()) return testEnvGuard()
  const response = await axios.post(TTWID_REGISTER_URL, DOUYIN_WEB_TTWID_PAYLOAD, {
    headers: { 'Content-Type': 'application/json', 'User-Agent': userAgent, Accept: '*/*' },
    timeout: 15_000,
    // 不跟随：实测回包就是 200，没有 Location。真出现 3xx 时也当成功响应读它的
    // Set-Cookie，而不是让 axios 抛错把已经下发的 ttwid 丢掉。
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400
  })
  const setCookies = response.headers['set-cookie'] ?? []
  return { setCookies: Array.isArray(setCookies) ? setCookies : [setCookies], body: response.data }
}

/**
 * 从注册回包里取 ttwid：**先 Set-Cookie，再响应体**。
 *
 * 实测命中的是 Set-Cookie（2026-10-10）；响应体分支是对 `body.ttwid` /
 * `body.data.ttwid` 这两种旧回包形态的兜底，本次实测两处都没有值。
 * @param setCookies - 原始 Set-Cookie 行数组
 * @param body - 已解析的响应体
 * @returns ttwid 值；取不到返回 `undefined`
 */
export const pickTtwid = (setCookies: string[], body?: unknown): string | undefined => {
  const line = setCookies.find((c) => c.startsWith('ttwid='))
  if (line) {
    const value = line.split(';')[0].split('=').slice(1).join('=')
    if (value) return value
  }
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>
    const nested = obj.data && typeof obj.data === 'object' ? (obj.data as Record<string, unknown>).ttwid : undefined
    const value = typeof obj.ttwid === 'string' ? obj.ttwid : typeof nested === 'string' ? nested : undefined
    if (value) return value
  }
  return undefined
}

/**
 * 注册一次 ttwid。不做缓存、不去重——那是 {@link ensureDouyinTtwid} 的职责。
 * @param userAgent - 注册请求的 UA（与后续 API 请求保持一致）
 * @param deps - 可注入的 HTTP 出口（测试用）
 * @returns 注册到的 ttwid；网络失败 / 回包里没有时 `undefined`
 */
export const registerDouyinTtwid = async (userAgent?: string, deps?: TtwidDeps): Promise<string | undefined> => {
  const post = deps?.postTtwidRegister ?? defaultPostTtwidRegister
  try {
    const { setCookies, body } = await post(userAgent || DEFAULT_TTWID_UA)
    return pickTtwid(setCookies, body)
  } catch {
    return undefined
  }
}

/** 缓存：UA → ttwid。进程级 */
const cache = new Map<string, { ttwid: string; at: number }>()
/** 失败冷却：UA → 最近一次注册失败的毫秒时间戳 */
const failedAt = new Map<string, number>()
/** in-flight 去重：UA → 正在飞的那次注册 */
const inflight = new Map<string, Promise<string | undefined>>()

/**
 * 缓存有效期：12 小时。**我们自己定的保守值，没有协议依据。**
 *
 * 服务端下发的是 `Max-Age=31536000`（一年，实测），协议上没有任何要求说必须缓多久。
 * 取 12 小时的理由：这是铸造失败时的降级值，不该在进程里长期钉死（所以不跟那一年），
 * 但注册是我们自主发起的出网请求，也没必要几十分钟就重打一次。12 小时后重注册一次，
 * 顺带跟上服务端可能的轮换。
 */
const TTWID_CACHE_TTL_MS = 12 * 60 * 60 * 1000

/**
 * 注册失败后的冷却期：60 秒内不重试同一 UA。
 *
 * 不冷却的话，铸造失败的每一次调用都要先来一发注定失败的注册，把「铸造失败 → 重试」
 * 放大成「铸造失败 → 注册失败 → 重试」。
 */
const TTWID_FAIL_COOLDOWN_MS = 60 * 1000

/** 缓存条目上限（与 `mint.ts` 的审计缓存同量级） */
const CACHE_MAX_ENTRIES = 64

/**
 * 求一份可用的 ttwid：进程缓存命中 → 冷却中则放弃 → 注册。
 *
 * **永不抛错**：拿不到就返回 `undefined`，调用方按「没有 ttwid」继续——补一个增强
 * 参数失败不该让一个本来能工作的请求坏掉。
 * @param userAgent - 本次调用的 UA（注册请求用它，保证与后续 API 请求同源）
 * @param deps - 可注入的 HTTP 出口（测试用）
 * @returns ttwid 值；拿不到时 `undefined`
 */
export const ensureDouyinTtwid = async (userAgent?: string, deps?: TtwidDeps): Promise<string | undefined> => {
  const key = userAgent || DEFAULT_TTWID_UA
  const now = Date.now()

  const hit = cache.get(key)
  if (hit && now - hit.at < TTWID_CACHE_TTL_MS) return hit.ttwid

  const failed = failedAt.get(key)
  if (failed !== undefined && now - failed < TTWID_FAIL_COOLDOWN_MS) return undefined

  const flying = inflight.get(key)
  if (flying) return flying

  const task = (async () => {
    try {
      const ttwid = await registerDouyinTtwid(key, deps)
      if (!ttwid) {
        failedAt.set(key, Date.now())
        return undefined
      }
      cache.set(key, { ttwid, at: Date.now() })
      failedAt.delete(key)
      if (cache.size > CACHE_MAX_ENTRIES) {
        const oldest = cache.keys().next().value
        if (oldest !== undefined) cache.delete(oldest)
      }
      return ttwid
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, task)
  return task
}

/** 清空 ttwid 缓存、失败冷却与 in-flight（都是模块级的，测试与换环境场景用） */
export const resetDouyinTtwidCache = (): void => {
  cache.clear()
  failedAt.clear()
  inflight.clear()
}
