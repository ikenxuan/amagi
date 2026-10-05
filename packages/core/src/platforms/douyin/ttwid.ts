/**
 * 抖音 `ttwid` 访客 id 的动态注册与缓存。
 *
 * `ttwid` 是 Argus 指纹体系的一部分：请求 cookie 里带上它（与 `uifid` 配合）
 * 才会被识别为「真实浏览器会话」。它有两种来历：
 *
 * - **登录向**（passport）：`passport/login.ts` 的 `ttwid()` 走 im 桌面场景的
 *   `/ttwid/check/` 预热，只服务扫码登录，与普通 API 链路无关；
 * - **普通请求向**（本文件）：web 端普通 API 链路（bound fetcher / 静态
 *   fetcher / client 会话 / HTTP 路由共用）在 cookie 缺 `ttwid` 时，向
 *   `ttwid.bytedance.com/ttwid/union/register/` 动态注册一份，注册结果并入
 *   本次调用的 cookie。
 *
 * 为什么必须动态注册：`ttwid` 是 HttpOnly cookie，浏览器导出 cookie 抓不到。
 * 服务器最常见的抖音 cookie 是「只带 `UIFID`」（uifid 非 HttpOnly 可导出），
 * 缺了 `ttwid` 会退回 Argus 的二次校验。本模块让这种 cookie 开箱即用。
 *
 * ## 实现要点（仿 `webid.ts` 的「进程级缓存 + 平台级钩子」模式）
 *
 * - 键取 {@link resolveDouyinUifid} —— 同一份设备指纹共用一个 ttwid，
 *   换 cookie 就换键，杜绝「串用别人的 ttwid」；
 * - 注入由平台级 `prepare`（挂在 `PLATFORM_RUNTIME.douyin`）在 build 之前
 *   完成，与小红书 guest cookie 同一套机制 —— 三个入口因此行为一致；
 * - 注册体对齐 media-parser 验证通过的参数组（`aid: 6383`、
 *   `service: 'www.douyin.com'`）—— amagi 原有的 `DOUYIN_TTWID_PAYLOAD`
 *   是 ixigua 桌面场景的参数，且从未被内部代码使用，不在这里复用；
 * - **失败静默降级**：注册失败不抛错，维持「无 ttwid」现状发出请求——
 *   一个本来能工作的请求不该因为补一个增强参数失败而坏掉。
 *
 * ## 作用域：进程级
 *
 * 与 `webid.ts` 相同：模块级 `Map`，所有 client 共享。多 cookie 场景靠
 * uifid 分键区分。
 *
 * @module platforms/douyin/ttwid
 */

import { getCookieValue } from '../../contracts/cookie'
import type { EndpointCtx } from '../../contracts/endpoint'
import { DOUYIN_WEB_UA, resolveDouyinUifid } from './config'
import { TTWID_REGISTER_URL } from './sign/tokens'

/**
 * web 端 ttwid 注册体（media-parser 实测验证的参数组）。
 *
 * 注册接口按参数组合出 ttwid，`aid` / `service` 决定它绑定的设备场景，
 * 用错组合（如 ixigua 桌面）拿到的 ttwid 不匹配 `www.douyin.com` 的校验。
 */
export const DOUYIN_WEB_TTWID_PAYLOAD = {
  region: 'cn',
  aid: 6383,
  need_t: 1,
  service: 'www.douyin.com',
  migrate_priority: 0,
  cb_url_protocol: 'https',
  domain: '.douyin.com'
} as const

/** 缓存里的 ttwid 条目 */
interface TtwidEntry {
  ttwid: string
  at: number
}

/**
 * uifid → ttwid 的进程级缓存。
 *
 * ttwid 服务端有效期以月计，进程内短时间不重复注册。
 */
const cache = new Map<string, TtwidEntry>()

/**
 * uifid → 最近一次注册失败的毫秒时间戳。
 *
 * 失败后短暂冷却，否则每个失败请求都会先来一发注定失败的注册请求，
 * 把「解析失败 → 重试」放大成「解析失败 → 注册失败 → 重试」。
 */
const failedAt = new Map<string, number>()

/** 缓存有效期：12 小时，远小于服务端有效期，够覆盖进程生命周期 */
const TTWID_CACHE_TTL_MS = 12 * 60 * 60 * 1000

/** 注册失败后的冷却期：60 秒内不重试同一 uifid */
const TTWID_FAIL_COOLDOWN_MS = 60 * 1000

/**
 * 从注册响应里取 ttwid。
 *
 * 兼容两种回包形态与 Set-Cookie：`body.ttwid`（media-parser 走这条）、
 * `body.data.ttwid`（老版本回包），以及响应头里的 `ttwid=...`。
 * @param body - 已解析的响应体
 * @param setCookie - 原始 `Set-Cookie` 头数组
 * @returns ttwid；取不到返回 `''`
 */
const pickTtwid = (body: unknown, setCookie?: string[]): string => {
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>
    const direct = typeof obj.ttwid === 'string' ? obj.ttwid : undefined
    const nested =
      obj.data && typeof obj.data === 'object' ? ((obj.data as Record<string, unknown>).ttwid as string | undefined) : undefined
    const ttwid = direct ?? nested
    if (typeof ttwid === 'string' && ttwid) return ttwid
  }
  if (setCookie) {
    for (const header of setCookie) {
      const [nameValue] = header.split(';', 1)
      const separator = nameValue.indexOf('=')
      if (separator > 0 && nameValue.slice(0, separator).trim() === 'ttwid') return nameValue.slice(separator + 1).trim()
    }
  }
  return ''
}

/**
 * 把 ttwid 拼进 cookie 串末尾。
 *
 * 不复用 `parseCookie` / `serializeCookie`：解析再序列化会重排字段顺序、
 * 丢掉空串占位 cookie，而抖音 cookie 里存在这类值；直接追加最保真。
 * @param cookie - 原 cookie 串（可能为空）
 * @param ttwid - 要追加的 ttwid 值
 * @returns 追加后的 cookie 串
 */
const withTtwid = (cookie: string, ttwid: string): string => {
  const base = cookie.trim()
  return base ? `${base}; ttwid=${ttwid}` : `ttwid=${ttwid}`
}

/**
 * 发 ttwid 注册请求。
 *
 * 走注入的 `ctx.send`（`reason: 'prepare'`）—— 与小红书 guest cookie 一致，
 * 调用方配置的 proxy / agent / 超时因此生效。
 * @param ctx - 当刻的执行上下文（用 `send` / `requestConfig`）
 * @returns 注册到的 ttwid；响应里取不到时返回 `''`
 */
const registerTtwid = async (ctx: EndpointCtx): Promise<string> => {
  const res = await ctx.send(
    {
      url: TTWID_REGISTER_URL,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': DOUYIN_WEB_UA },
      body: JSON.stringify(DOUYIN_WEB_TTWID_PAYLOAD)
    },
    'prepare',
    ctx.requestConfig
  )
  return pickTtwid(res.body, res.setCookie)
}

/**
 * 求一份「这份 cookie 应当使用的 ttwid」。
 *
 * 优先级：cookie 里已有 → 进程缓存命中 → 动态注册。任何一步拿不到值都
 * 返回 `''`（含注册失败，静默降级，不抛错）。
 * @param ctx - 当刻的执行上下文
 * @returns ttwid 值；不需要 / 拿不到时返回 `''`
 */
export const douyinTtwidFor = async (ctx: EndpointCtx): Promise<string> => {
  const existing = getCookieValue(ctx.cookie, 'ttwid')
  if (existing) return existing
  const key = resolveDouyinUifid(ctx.cookie)
  if (!key) return '' // 无 uifid 的纯匿名请求走普通 web 形态，不用折腾 ttwid
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && now - hit.at < TTWID_CACHE_TTL_MS) return hit.ttwid
  const failed = failedAt.get(key)
  if (failed !== undefined && now - failed < TTWID_FAIL_COOLDOWN_MS) return ''
  const ttwid = await registerTtwid(ctx).catch(() => '')
  if (!ttwid) {
    failedAt.set(key, now)
    return ''
  }
  cache.set(key, { ttwid, at: now })
  failedAt.delete(key)
  return ttwid
}

/**
 * 抖音平台级 `prepare` 钩子：挂在 `PLATFORM_RUNTIME.douyin`，每次调用
 * 在 build 之前执行一次，cookie 缺 `ttwid` 时补上。
 *
 * **自己吞异常** —— 与 `observe` 同一条纪律：注册失败只该让本次请求少一个
 * 参数，不该把一个本来能工作的调用变成 `kind: 'internal'`。
 * @param ctx - 当刻的执行上下文（只读 `cookie` / `send`）
 * @returns 并入 ctx 的字段（需要注册时是补好 ttwid 的 `cookie`）
 */
export const douyinTtwidPrepare = async (ctx: EndpointCtx): Promise<Partial<EndpointCtx>> => {
  try {
    const ttwid = await douyinTtwidFor(ctx)
    return ttwid ? { cookie: withTtwid(ctx.cookie, ttwid) } : {}
  } catch {
    return {}
  }
}

/**
 * 清空 ttwid 缓存与失败冷却（缓存是模块级的）。
 */
export const resetDouyinTtwidCache = (): void => {
  cache.clear()
  failedAt.clear()
}
