import type { EndpointCtx, SignFn } from '../../../contracts/endpoint'
import type { RequestSpec } from '../../../contracts/request'
import { md5Hex } from '../../../utils/md5'

/**
 * B站 wbi 签名器（实例级）。
 *
 * 两处实现要点：
 * - **走 transport**：`getNav` 用 `ctx.send` 发 `/nav`（`reason: 'prepare'`
 *   进 trace），与主请求走同一条路。
 * - **TTL 缓存在实例里**：keys 缓存挂在实例上，TTL 内连续签名只打一次 `/nav`。
 *   B站只有一个进程级实例（见下方类文档），所以这份缓存进程内共享。
 *
 * 签名算法本身（`mixinKeyEncTab` / `encWbi`）与旧版逐字一致。
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

/** 混合密钥编码表 */
const mixinKeyEncTab: readonly number[] = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16,
  24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
]

/** 从 URL 末尾取文件名部分（去扩展名），得到 img_key / sub_key */
export const extractKey = (url: string): string => url.slice(url.lastIndexOf('/') + 1, url.lastIndexOf('.'))

/**
 * 对 imgKey 和 subKey 进行字符顺序打乱编码。
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
 * 一次 wbi 签名的全部产物。
 */
export interface WbiSignature {
  /** 参与签名的秒级时间戳，同时是要发送的 `wts` */
  wts: number
  /** 32 位小写十六进制的 `w_rid` */
  w_rid: string
  /** 实际参与哈希的规范化 query（已含 `wts`，按 key 排序、值滤掉 `!'()*`） */
  canonicalQuery: string
  /** 由 img_key + sub_key 打乱出的 32 位混合密钥 */
  mixinKey: string
}

/**
 * 按给定时间戳计算 wbi 签名 —— **验证工具与 {@link encWbi} 共用的唯一实现**。
 *
 * 不修改传入的 `params`；时钟由调用方注入，所以对一份已签名的 URL 重算
 * `w_rid` 时可以钉死它自己的 `wts`，逐字符复现。
 * @param params - 请求参数（不含 wts / w_rid）
 * @param img_key - 图片密钥
 * @param sub_key - 子密钥
 * @param wts - 秒级时间戳
 * @returns 签名产物
 */
export const computeWbiSignature = (
  params: Record<string, SignParamValue>,
  img_key: string,
  sub_key: string,
  wts: number
): WbiSignature => {
  const mixinKey = getMixinKey(img_key + sub_key)
  const chr_filter = /[!'()*]/g

  // 按照 key 重排参数（wts 一起参与排序，但不修改调用方的对象）
  const canonicalQuery = Object.keys({ ...params, wts })
    .sort()
    .map((key) => {
      // 过滤 value 中的 "!'()*" 字符
      const value = (key === 'wts' ? wts : params[key]).toString().replace(chr_filter, '')
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    })
    .join('&')

  const w_rid = md5Hex(canonicalQuery + mixinKey) // 计算 w_rid
  return { wts, w_rid, canonicalQuery, mixinKey }
}

/**
 * 为请求参数计算 wbi 签名。
 * @param params - 请求参数（不含 wts / w_rid）
 * @param img_key - 图片密钥
 * @param sub_key - 子密钥
 * @returns `&wts=..&w_rid=..` 查询串
 */
export const encWbi = (params: Record<string, SignParamValue>, img_key: string, sub_key: string): string => {
  const curr_time = Math.round(Date.now() / 1000)
  Object.assign(params, { wts: curr_time }) // 添加 wts 字段（历史上就原地改调用方的对象，保持不变）
  const { wts, w_rid } = computeWbiSignature(params, img_key, sub_key, curr_time)
  return `&wts=${wts}&w_rid=${w_rid}`
}

/**
 * B站 wbi 签名器实例。
 *
 * 进程级共享一个：`steps.ts` 模块级建 `sharedWbi`，`wbi()` / `qtparam()` 与
 * `signers.ts` 的签名器表都复用它（`PLATFORM_RUNTIME` 模块求值时只装配一次）。
 * keys 缓存挂在这个实例上 —— TTL 内 `sign` 不会重复打 `/nav`，两条路共享同一份缓存。
 */
export class WbiSigner {
  private nav?: { body: WbiNavBody; fetchedAt: number }

  /**
   * @param ttlMs - keys 缓存有效期，默认 {@link WBI_TTL_MS}
   * @param now - 时钟（可注入）
   */
  constructor(
    private readonly ttlMs: number = WBI_TTL_MS,
    private readonly now: () => number = Date.now
  ) {}

  /**
   * 取 `/nav` 响应体（带 TTL 缓存）。
   *
   * 走 `ctx.send`（reason `'prepare'`）。
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

  /** 清空 keys 缓存（下次 sign 重新打 `/nav`）。测试隔离用。 */
  reset(): void {
    this.nav = undefined
  }
}

/** 创建一个 wbi 签名器实例（B站生产路径只在 `steps.ts` 建一个进程级 `sharedWbi`；测试可各建各的） */
export const createWbiSigner = (ttlMs?: number, now?: () => number): WbiSigner => new WbiSigner(ttlMs, now)
