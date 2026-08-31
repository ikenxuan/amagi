/**
 * 抖音 passport 扫码登录协议实现
 *
 * login.douyin.com 的接口与 www.douyin.com 的数据接口是两套体系：
 * - query 需要 `p_no` / `sign` / `qs` 三重签名，外加 `x-tt-passport-aid-sign` 请求头
 * - a_bogus 用的是 bdms `1.0.1.19` 形态（盐值 `dhzx`、pageId 7571），
 *   与 `../sign/a_bogus.ts` 里数据接口用的旧版（盐值 `cus`、pageId 6241）互不通用
 * - `request_host` 在 URL 里是双重编码，参与 sign 计算时只编码一次
 *
 * 因此这里单独实现一套，而不是复用 `douyinSign`。
 *
 * @module platform/douyin/passport
 */
export { aBogus, BDMS_SDK_VERSION } from './aBogus'
export { DouyinPassportClient, PASSPORT_USER_AGENT } from './client'
export type { PassportPayload, PassportResponse } from './client'
export { CookieJar } from './cookieJar'
export { makeAidSign, makeSignAndQs, randomHex, utcNoonTimestamp, xor5Hex } from './params'
export { parsePollResult, parseQrcode, parseSendCodeResult, parseValidateCodeResult } from './parser'
export { sm3, sm3Hex, sm3Twice } from './sm3'
export type { PollResult, QrcodeInfo, SendCodeResult, ValidateCodeResult, VerifyContext, VerifyWay } from './types'
