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
 * ## 参考来源
 *
 * 以下项目公开了本模块所需的协议细节。实现均按本仓库风格重写，未复制其代码：
 *
 * - {@link https://github.com/ylcangel/douyin_sign} — a_bogus `1.0.1.19-fix.01` 的
 *   去混淆结论（盐值、pageId、版本基准时间戳，以及 SDK 里两处 `Math.random`
 *   漏调用导致取值恒定的行为）。Apache-2.0。
 * - {@link https://github.com/cv-cat/DouYin_Spider} — bd-ticket-guard 的密钥签发流程：
 *   客户端自行生成 EC 密钥对并通过 cookie 交给服务端，由服务端签发票据，
 *   无需从浏览器导出任何材料。
 * - {@link https://github.com/dmmdekkd/DouyinDataAPI} — passport 四重签名、
 *   二次验证表单形态与 `x-tt-passport-aid-sign` 的派生方式。
 *
 * SM3（GM/T 0004-2012）与 MurmurHash3 为公开标准算法。
 *
 * @module platform/douyin/passport
 */
export { aBogus, BDMS_SDK_VERSION } from './aBogus'
export { DouyinPassportClient, PASSPORT_USER_AGENT } from './client'
export type { PassportPayload, PassportResponse } from './client'
export { CookieJar, INTERNAL_PREFIX } from './cookieJar'
export { makeAidSign, makeSignAndQs, randomHex, utcNoonTimestamp, xor5Hex } from './params'
export { parsePollResult, parseQrcode, parseSendCodeResult, parseValidateCodeResult } from './parser'
export { sm3, sm3Hex, sm3Twice } from './sm3'
export { TicketGuard } from './ticketGuard'
export type { TicketGuardState } from './ticketGuard'
export type { PollResult, QrcodeInfo, SendCodeResult, ValidateCodeResult, VerifyContext, VerifyWay } from './types'
