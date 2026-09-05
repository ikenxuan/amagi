import { LITE_AUTHN_VERSION, PASSPORT_AID } from './params'
import type { VerifyContext } from './types'

/**
 * 二次验证（短信验证码）的表单构造与验证方式选择。
 *
 * 单独成文件是因为它有**两个**消费方：v6 保留的
 * `model/fetchers/douyin/auth.ts`（`sendPassportVerifyCode` /
 * `validatePassportVerifyCode`）与 v7 的
 * `platforms/douyin/session/qrcode.ts`（策略的 `answer`）。
 *
 * 两边各写一份的代价已经付过一次：v7 策略当初照着抓包写了个「最小形态」的
 * 表单，漏掉 `type` / `std_verify_*` / `aid` / `new_authn_sdk_version`
 * 几项，而官方验证页 SDK 要求这些字段**即使为空也必须出现**，缺字段会被判为
 * 伪造请求 —— 于是 v7 会话的短信验证走不通，且只在真实触发二次验证的账号上
 * 才暴露。表单形态只留这一份。
 *
 * @module platform/douyin/passport/verify
 */

/** 短信验证码的验证方式标识，服务端未给出可用方式时的兜底值 */
export const SMS_VERIFY_WAY = 'mobile_sms_verify'

/** 短信验证码的 act_type */
export const SMS_ACT_TYPE = '3737'

/**
 * 可以用「收 6 位验证码」这套流程走完的验证方式。
 *
 * 除官方常见的 `mobile_sms_verify`，账号被判定需要辅助验证时会给出
 * `assist_mobile_sms_verify`，两者都是下行短信收码，走同一对
 * `send_code` / `validate_code` 接口，区别只在 `std_verify_way` 的取值。
 * 上行短信（`*_up_sms_verify`）要求用户从手机发短信出去，是另一套接口，不在此列。
 */
export const SMS_CODE_WAY_PATTERN = /^(assist_)?mobile_sms_verify$/

/**
 * 判断某个验证方式能否用短信验证码流程完成。
 * @param verifyWay - 服务端下发的 verify_way
 * @returns 能走短信收码流程时为 `true`
 */
export const isSmsCodeVerifyWay = (verifyWay: string): boolean => SMS_CODE_WAY_PATTERN.test(verifyWay)

/**
 * 选出本次要用的 `std_verify_way`。
 *
 * 优先用调用方指定的；否则从服务端给出的可选方式里挑一个能收码的；都没有才回退到
 * 默认值。**不能写死 `mobile_sms_verify`** —— 遇到辅助验证的账号会因为 way 对不上
 * 而失败，也不能取 `verifyWays[0]`，那一项未必是短信方式。
 * @param verify - 轮询下发的验证上下文
 * @param requested - 调用方显式指定的验证方式
 * @returns 本次使用的 `std_verify_way`
 */
export const resolveVerifyWay = (verify: VerifyContext, requested?: string): string =>
  requested ??
  verify.verifyWays.find((way) => isSmsCodeVerifyWay(way.verifyWay))?.verifyWay ??
  verify.stdParams.std_verify_way ??
  SMS_VERIFY_WAY

/**
 * 发码与验码共用的表单字段。
 *
 * 字段顺序与「空值也要占位」的行为对齐官方验证页 SDK 的抓包形态：
 * `verify_ticket` / `new_verify_flow` / `std_verify_flow_id` / `std_verify_token`
 * 即使为空也必须出现，缺字段会被判为伪造请求。
 * @param verify - 轮询下发的验证上下文
 * @param verifyWay - 本次使用的验证方式，原样进 `std_verify_way`
 * @param tail - 追加在 `std_verify_way` 之后的字段（发码是 `is6Digits`，验码是 `code`）
 * @returns 可直接交给 `client.liteRequest` 的表单
 */
export const buildVerifyBody = (verify: VerifyContext, verifyWay: string, tail: Record<string, string>): Record<string, string> => ({
  mix_mode: '1',
  type: SMS_ACT_TYPE,
  encrypt_uid: verify.encryptUid,
  verify_ticket: verify.verifyTicket,
  copywriting_key: verify.copywritingKey,
  ies_safety_diversion_tag: verify.diversionTag,
  new_verify_flow: verify.newVerifyFlow,
  std_verify_flow_id: verify.stdParams.std_verify_flow_id ?? '',
  std_verify_scene: verify.stdParams.std_verify_scene ?? 'account_login',
  std_verify_template: verify.stdParams.std_verify_template ?? 'ato_web',
  std_verify_token: verify.stdParams.std_verify_token ?? '',
  std_verify_type: verify.stdParams.std_verify_type ?? 'MFA',
  std_verify_way: verifyWay,
  ...tail,
  aid: PASSPORT_AID,
  new_authn_sdk_version: LITE_AUTHN_VERSION
})
