import type { SignFn } from '../../../contracts/endpoint'
import type { RequestSpec } from '../../../contracts/request'
import { douyinSign } from './index'

/**
 * 抖音签名器（SignFn 形式）。
 *
 * 签名器声明前置条件（修 #36/#37/#38）：v6 的 `douyinSign.AB` / `.XB`
 * 对入参形状零校验 —— `AB('')` 抛 `TypeError: Invalid URL`、`XB` 对短路径
 * 抛 `Invalid MD5 character`（KNOWN-DEFECT 有测试锁死）。v7 的签名器在
 * 入口先校验前置条件：
 * - **AB 需绝对 URL**（以 `http(s)://` 开头）。
 * - **XB 需真实接口形态的长路径**（pathname ≥ 3 段且带查询串）。
 *
 * 前置条件不满足时签名器**抛带明确 message 的错误** —— execute 的
 * 单一 catch 把它归因为 `kind: 'internal'` / `INTERNAL_ERROR` 收进失败
 * 信封，调用方不再面对裸的 `TypeError: Invalid URL`。这些条件由
 * `build` 保证满足（URL 构造器只产出合法绝对地址），签名器里的校验
 * 只是防线。
 */

/** AB 前置条件：绝对 URL（`http(s)://` 开头） */
const isAbsoluteUrl = (url: string): boolean => /^https?:\/\//.test(url)

/** XB 前置条件：真实接口形态 —— pathname 至少 3 段且带查询串 */
const isApiLikePath = (url: string): boolean => {
  if (!isAbsoluteUrl(url)) return false
  const parsed = new URL(url)
  const segments = parsed.pathname.split('/').filter(Boolean)
  return segments.length >= 3 && parsed.search.length > 0
}

/**
 * `a_bogus` 签名器（`sign: 'a-bogus'`）。
 *
 * 前置条件：URL 必须是绝对地址。v6 的 `AB` 对空串/相对路径抛
 * `TypeError: Invalid URL`，v7 在入口校验，抛错由 execute 归因为
 * `kind: 'internal'`（#36/#37）。
 * @param spec - 请求描述（`url` 参与签名）
 * @param ctx - 执行上下文（`userAgent` 用于签名）
 * @returns 带 `a_bogus` 查询参数的请求描述
 */
export const aBogusSigner: SignFn = (spec, ctx) => {
  if (!isAbsoluteUrl(spec.url)) {
    throw new Error(`a_bogus 前置条件不满足：URL 必须是绝对地址（收到 "${spec.url}"）`)
  }

  const signed = douyinSign.AB(spec.url, ctx.userAgent)
  const url = new URL(spec.url)
  url.searchParams.set('a_bogus', signed)
  return { ...spec, url: url.toString() } as RequestSpec
}

/**
 * `x_bogus` 签名器（`sign: 'x-bogus'`）。
 *
 * 前置条件：真实接口形态的长路径（≥3 段且带查询串）。v6 的 `XB` 对短路径
 * 抛 `Invalid MD5 character`，v7 在入口校验，抛错由 execute 归因为
 * `kind: 'internal'`（#38）。
 * @param spec - 请求描述（`url` 参与签名）
 * @param ctx - 执行上下文（`userAgent` 用于签名）
 * @returns 带 `X-Bogus` 查询参数的请求描述
 */
export const xBogusSigner: SignFn = (spec, ctx) => {
  if (!isApiLikePath(spec.url)) {
    throw new Error(
      `x_bogus 前置条件不满足：URL 需真实接口形态的长路径（≥3 段且带查询串，收到 "${spec.url}"）`
    )
  }

  const signed = douyinSign.XB(spec.url, ctx.userAgent)
  const url = new URL(spec.url)
  url.searchParams.set('X-Bogus', signed)
  return { ...spec, url: url.toString() } as RequestSpec
}

/** 平台签名器表，交给 runtime 的 `signers` 查名 */
export const createDouyinSigners = (): Record<string, SignFn> => ({
  'a-bogus': aBogusSigner,
  'x-bogus': xBogusSigner
})
