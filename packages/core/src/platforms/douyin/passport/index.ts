/**
 * 抖音 passport 扫码登录协议实现（桌面 IM 链路）
 *
 * imdesktop.douyin.com 的桌面 Passport：
 * - query 需要 sign/qs（tt-account-sdk 拦截器 + jumpbyte a_bogus 签名）与 `x-tt-passport-aid-sign` 请求头
 * - a_bogus 是 jumpbyte internal/abogus 形态（盐 `dhzx`，SBOX 替换+轮转），与数据接口的旧版互不通用
 * - 登录前先注册桌面设备（device_register 签发数字 device_id），服务端认识设备后不再强制 MFA
 *
 * 验证中心本地验证页不移植：服务端下发验证中心/图片验证/上行短信/密码验证等需要本地交互
 * 的场景，由策略层直接返回 risk 失败。
 *
 * @module platforms/douyin/passport
 */
export { im, UA } from './const'
export { Jar } from './jar'
export { Http, verifyDecision } from './client'
export { createDevice } from './device'
export { form } from './lite'
export {
  checkQr,
  getQr,
  pickBiz,
  prepareQr,
  selectWay,
  sendCode,
  sessionOf,
  ttwid,
  validateCode,
  validatePassword,
  WAY_PRIORITY,
  QR_BODY
} from './login'
export { aidSign, normalizePassportPath, noonTs } from './sign/aid'
export { aBogusDesktop } from './sign/bogus'
export { browserInfo, encodeBrowserInfo } from './sign/browser'
export { mixEncode } from './sign/mix'
export {
  desktopBaseQuery,
  desktopUrl,
  encodeDesktopParams,
  encodeForm,
  randomHex,
  randomMsToken,
  randomTrace,
  signQs,
  signQuery
} from './sign/qs'
export { encodeSourceInfo } from './sign/source'
export type { Device, DeviceLog } from './device'
export type { DesktopPassportResponse, HttpOpts, PassportPayload } from './client'
export type { Challenge, CheckData, DesktopSession, GetQrData, QrReady, QrStatus, QrUserData, VerifyWay } from './login'
export type { MfaRes } from './lite'
export type { DesktopABogusOpts } from './sign/bogus'
export type { DesktopQueryOpts, SignExtras, SignQsOpts, SignQsResult, SignedQuery } from './sign/qs'
