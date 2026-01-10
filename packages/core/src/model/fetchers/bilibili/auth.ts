/**
 * B站登录认证相关 API
 * @module fetchers/bilibili/auth
 */

import { RequestConfig } from 'amagi/server'
import { BilibiliReturnTypeMap } from 'amagi/types/ReturnDataType/Bilibili'
import { Result } from 'amagi/validation'

import type {
  BilibiliApplyCaptchaOptions,
  BilibiliQrcodeStatusOptions,
  BilibiliValidateCaptchaOptions,
  ConditionalReturnType,
  TypeMode
} from '../types'
import { fetchBilibiliInternal } from './internal'

/**
 * 获取B站登录状态信息
 * @param options - 请求选项 (可选)
 * @param options.typeMode - 类型模式: 'strict' 返回严格类型, 'loose' 返回 any
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 登录状态信息
 * @example
 * ```typescript
 * const result = await fetchLoginStatus({ typeMode: 'strict' }, cookie)
 * console.log(result.data.isLogin) // 是否已登录
 * ```
 */
export async function fetchLoginStatus<M extends TypeMode = 'loose'> (
  options?: { typeMode?: M },
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['loginStatus'], M>>> {
  return fetchBilibiliInternal('loginStatus', {}, { cookie, requestConfig })
}

/**
 * 申请B站登录二维码
 * @param options - 请求选项 (可选)
 * @param options.typeMode - 类型模式: 'strict' 返回严格类型, 'loose' 返回 any
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 二维码信息，包含 URL 和 key
 * @example
 * ```typescript
 * const result = await requestLoginQrcode({ typeMode: 'strict' })
 * console.log(result.data.url) // 二维码 URL
 * console.log(result.data.qrcode_key) // 二维码 key
 * ```
 */
export async function requestLoginQrcode<M extends TypeMode = 'loose'> (
  options?: { typeMode?: M },
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['loginQrcode'], M>>> {
  return fetchBilibiliInternal('loginQrcode', {}, { cookie, requestConfig })
}

/**
 * 检查B站登录二维码扫描状态
 * @param options - 二维码状态参数
 * @param options.qrcode_key - 二维码 key
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 二维码扫描状态
 * @example
 * ```typescript
 * const result = await checkQrcodeStatus({ qrcode_key: 'xxx' })
 * // code: 86101 未扫描, 86090 已扫描未确认, 86038 已过期, 0 登录成功
 * console.log(result.data.code)
 * ```
 */
export async function checkQrcodeStatus<M extends TypeMode = 'loose'> (
  options: BilibiliQrcodeStatusOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['qrcodeStatus'], M>>> {
  return fetchBilibiliInternal('qrcodeStatus', options, { cookie, requestConfig })
}

/**
 * 从 v_voucher 申请验证码
 * @param options - 验证码申请参数
 * @param options.v_voucher - 验证凭证
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 验证码信息
 * @example
 * ```typescript
 * const result = await requestCaptchaFromVoucher({ v_voucher: 'xxx' }, cookie)
 * console.log(result.data) // 验证码数据
 * ```
 */
export async function requestCaptchaFromVoucher<M extends TypeMode = 'loose'> (
  options: BilibiliApplyCaptchaOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['captchaFromVoucher'], M>>> {
  return fetchBilibiliInternal('captchaFromVoucher', options, { cookie, requestConfig })
}

/**
 * 验证验证码结果
 * @param options - 验证码验证参数
 * @param options.token - 验证 token
 * @param options.code - 验证码
 * @param cookie - B站 Cookie (可选)
 * @param requestConfig - 请求配置 (可选)
 * @returns 验证结果
 * @example
 * ```typescript
 * const result = await validateCaptchaResult({ token: 'xxx', code: '123456' }, cookie)
 * console.log(result.data) // 验证结果
 * ```
 */
export async function validateCaptchaResult<M extends TypeMode = 'loose'> (
  options: BilibiliValidateCaptchaOptions,
  cookie?: string,
  requestConfig?: RequestConfig
): Promise<Result<ConditionalReturnType<BilibiliReturnTypeMap['validateCaptcha'], M>>> {
  return fetchBilibiliInternal('validateCaptcha', options, { cookie, requestConfig })
}
