/**
 * 抖音公开工具面（`amagi.douyin` / `client.douyin` 上的工具集）。
 *
 * 公开构件各自有来处，**不复制**：
 * - `douyinPassport` —— v7 实现（`./passport`，登录会话与 fetcher 共用同一份）
 * - `douyinSign` —— v6 保留实现，在 `../legacy/douyin/`
 * - `credentials` —— Cookie 规范化、登录态探测与显式游客握手（v7）
 * - `createDouyinRoutes` —— v7 路由工厂（`./routes`）
 *
 * 这里**故意没有** v6 的 `douyinApiUrls`：v7 门面上挂的是 v7 自己的 URL 构造器
 * （`./api`，经 `client.douyin.apiUrls` 到达），v6 那份从包顶层
 * （`import { douyinApiUrls } from '@ikenxuan/amagi'`）与 `@ikenxuan/amagi/compat`
 * 的 `client.douyin.douyinApiUrls` 到达 —— 两份同名不同义的东西从此不坐在同一个对象上。
 *
 * @module platforms/douyin/utils
 */

import { douyinSign } from '../legacy/douyin/sign'
import { normalizeDouyinCookie } from './cookie'
import { resolveDouyinCredential } from './credential'
import { configureDouyinGuestCache, mintDouyinGuestCookie } from './guestCredential'
import { checkDouyinLoginState, clearDouyinLoginStateCache, isDouyinCookieUsable } from './loginState'
import * as douyinPassport from './passport'

export * from './routes'
export { douyinPassport, douyinSign }
export {
  checkDouyinLoginState,
  clearDouyinLoginStateCache,
  configureDouyinGuestCache,
  isDouyinCookieUsable,
  mintDouyinGuestCookie,
  normalizeDouyinCookie,
  resolveDouyinCredential
}
export type { NormalizedDouyinCookie, UifidSource as DouyinUifidSource } from './cookie'
export type {
  CredentialOrigin as DouyinCredentialOrigin,
  ResolvedDouyinCredential,
  ResolveOptions as ResolveDouyinCredentialOptions
} from './credential'
export type { DouyinCredentialRequestOptions } from './credentialRequest'
export type { MintDouyinGuestCookieOptions } from './guestCredential'
export type { CheckDouyinLoginStateOptions, DouyinLoginCheck, DouyinLoginState } from './loginState'

/**
 * 未绑定账号的凭据工具：静态与实例入口均需显式传入 cookie / 请求配置。
 * resolve / mintGuestCookie 可能向抖音首页发两次握手请求（`__ac_signature` 纯算，
 * 不执行挑战页脚本）；普通取数不会自动调用。
 */
const credentials = {
  normalizeCookie: normalizeDouyinCookie,
  resolve: resolveDouyinCredential,
  checkLoginState: checkDouyinLoginState,
  isCookieUsable: isDouyinCookieUsable,
  clearLoginStateCache: clearDouyinLoginStateCache,
  mintGuestCookie: mintDouyinGuestCookie,
  configureGuestCache: configureDouyinGuestCache
}

type douyinUtilsModel = {
  /** 签名算法相关（v6 实现，在 `../legacy/douyin/`；比 v7 的签名表多一个 `SecSdk` 静态方法） */
  sign: typeof import('../legacy/douyin/sign').douyinSign

  /**
   * passport 扫码登录协议（签名、CookieJar、响应解析）
   *
   * 日常调用请优先用 `douyinFetcher` 上的 `requestPassportQrcode` 等方法，
   * 这里暴露的是底层构件，便于自行编排或做单元测试。
   */
  passport: typeof import('./passport')

  /** 显式凭据工具；传入 cookie 与请求选项，不自动绑定客户端身份。 */
  credentials: typeof credentials
}

/** 抖音相关功能模块 (工具集) */
export const douyinUtils: douyinUtilsModel = {
  sign: douyinSign,
  passport: douyinPassport,
  credentials
}
