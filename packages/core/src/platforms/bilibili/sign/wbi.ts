import crypto from 'node:crypto'

import type { EndpointCtx, SignFn } from '../../../contracts/endpoint'
import type { RequestSpec } from '../../../contracts/request'

/**
 * B站 wbi 签名器（实例级）。
 *
 * 从 v6 `platform/bilibili/sign/wbi.ts` 搬迁，两处行为差异：
 * - **改走 transport（修 A5）**：v6 的 `getWbiKeys` 直连 `axios('/nav')`，
 *   注入 adapter 拦不到 —— wbi 系接口的请求在测试里是「黑盒」。v7 的
 *   `getNav` 用 `ctx.send` 发 `/nav`（`reason: 'prepare'` 进 trace），
 *   与主请求走同一条路，adapter 可以拦截。
 * - **TTL 缓存随 client 实例（修 #4）**：v6 每次签名都打一次 `/nav`
 *   （README 的缺陷 4）。v7 的 keys 缓存在实例里，TTL 内连续签名只打一次
 *   `/nav`（阶段门 4 判据：3 次签名 1 次 `/nav`）。
 *
 * 签名算法本身（`mixinKeyEncTab` / `encWbi`）与 v6 逐字一致。
 */

/** wbi 密钥的 TTL（毫秒）。30 分钟内复用缓存 */
export const WBI_TTL_MS = 30 * 60 * 1000

/** `/nav` 响应里取 wbi keys 所需的最小形状 */
export interface WbiNavBody {
  data?: {
    wbi_img?: {
      img_url?: string
      sub_url?: string
    }
    vipStatus?: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

/** 混合密钥编码表（v6 逐字搬迁） */
const mixinKeyEncTab: readonly number[] = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16,
  24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
]

/** 从 URL 末尾取文件名部分（去扩展名），得到 img_key / sub_key */
const extractKey = (url: string): string => url.slice(url.lastIndexOf('/') + 1, url.lastIndexOf('.'))

/**
 * 对 imgKey 和 subKey 进行字符顺序打乱编码（v6 逐字搬迁）。
 * @param orig - img_key + sub_key 拼接
 * @returns 32 位 mixin key
 */
const getMixinKey = (orig: string): string =>
  mixinKeyEncTab
    .map((n) => orig[n])
    .join('')
    .slice(0, 32)

/** 签名参数值类型 */
type SignParamValue = string | number | boolean

/**
 * 为请求参数计算 wbi 签名（v6 逐字搬迁）。
 * @param params - 请求参数（不含 wts / w_rid）
 * @param img_key - 图片密钥
 * @param sub_key - 子密钥
 * @returns `&wts=..&w_rid=..` 查询串
 */
export const encWbi = (params: Record<string, SignParamValue>, img_key: string, sub_key: string): string => {
  const mixin_key = getMixinKey(img_key + sub_key)
  const curr_time = Math.round(Date.now() / 1000)
  const chr_filter = /[!'()*]/g

  Object.assign(params, { wts: curr_time }) // 添加 wts 字段
  // 按照 key 重排参数
  const query = Object.keys(params)
    .sort()
    .map((key) => {
      // 过滤 value 中的 "!'()*" 字符
      const value = params[key].toString().replace(chr_filter, '')
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    })
    .join('&')

  const wbi_sign = crypto
    .createHash('md5')
    .update(query + mixin_key)
    .digest('hex') // 计算 w_rid

  return `&wts=${curr_time}&w_rid=${wbi_sign}`
}

/**
 * B站 wbi 签名器实例。
 *
 * 每 client 实例持有一个（`PLATFORM_RUNTIME.bilibili.signers` 里创建），
 * keys 缓存随实例 —— TTL 内 `sign` 不会重复打 `/nav`（修 #4）。
 */
export class WbiSigner {
  private nav?: { body: WbiNavBody; fetchedAt: number }

  /**
   * @param ttlMs - keys 缓存有效期，默认 {@link WBI_TTL_MS}
   * @param now - 时钟，测试可注入
   */
  constructor(
    private readonly ttlMs: number = WBI_TTL_MS,
    private readonly now: () => number = Date.now
  ) {}

  /**
   * 取 `/nav` 响应体（带 TTL 缓存）。
   *
   * 走 `ctx.send`（reason `'prepare'`），不直连 axios（修 A5）。
   * @param ctx - 执行上下文（提供 send 与 cookie）
   * @returns `/nav` 响应体
   */
  async getNav(ctx: EndpointCtx): Promise<WbiNavBody> {
    const cached = this.nav
    if (cached && this.now() - cached.fetchedAt < this.ttlMs) return cached.body

    const res = await ctx.send(
      {
        method: 'GET',
        url: 'https://api.bilibili.com/x/web-interface/nav',
        headers: { cookie: ctx.cookie }
      },
      'prepare'
    )
    const body = res.body as WbiNavBody
    this.nav = { body, fetchedAt: this.now() }
    return body
  }

  /** 从 `/nav` 响应体提取 wbi keys */
  private keysOf(body: WbiNavBody): { img_key: string; sub_key: string } {
    const img = body.data?.wbi_img?.img_url
    const sub = body.data?.wbi_img?.sub_url
    if (!img || !sub) {
      throw new Error('wbi 密钥获取失败：/nav 响应缺少 wbi_img')
    }
    return { img_key: extractKey(img), sub_key: extractKey(sub) }
  }

  /**
   * 签名器：给请求 URL 追加 `&wts=..&w_rid=..`。
   *
   * `sign: 'wbi'` 的端点（comments / userDynamicList / userSpaceInfo 等）用它。
   * 首次调用会触发 `/nav` 前置请求（reason `'prepare'`），TTL 内复用。
   * @param spec - 请求描述
   * @param ctx - 执行上下文
   * @returns 带 wbi 签名的请求描述
   */
  sign: SignFn = async (spec: RequestSpec, ctx: EndpointCtx): Promise<RequestSpec> => {
    const nav = await this.getNav(ctx)
    const { img_key, sub_key } = this.keysOf(nav)

    const url = new URL(spec.url)
    const params: Record<string, SignParamValue> = {}
    for (const [key, value] of url.searchParams.entries()) params[key] = value

    const query = encWbi(params, img_key, sub_key)
    return { ...spec, url: spec.url + query }
  }
}

/** 创建一个 wbi 签名器实例（每 client 一个） */
export const createWbiSigner = (ttlMs?: number, now?: () => number): WbiSigner => new WbiSigner(ttlMs, now)
