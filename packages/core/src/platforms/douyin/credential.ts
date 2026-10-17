import { parseCookie } from '../../contracts/cookie'
import { normalizeDouyinCookie, type UifidSource } from './cookie'
import type { DouyinCredentialRequestOptions } from './credentialRequest'
import { mintDouyinGuestHandshake } from './guestCredential'
import { checkDouyinLoginState, type DouyinLoginState } from './loginState'

/**
 * 这份凭据是怎么来的。
 *
 * `guest-minted` 与 `guest-device` 的分界是**有没有拿到访客 id**，不是「握手有没有出货」：
 * 服务端把「挑战过没过」与「发不发访客 id」分开决定，只发了 `ttwid` 的那种结局也算
 * 一次成功的握手，但**不是**一份游客凭据 —— 它没有访客 id，受 secsdk 保护的端点照样
 * 回 `403 Uifid Not Found`。所以两种结局各有一个 origin，谁也不冒充谁。
 */
export type CredentialOrigin = 'as-is' | 'normalized' | 'uifid-temp' | 'guest-minted' | 'guest-device' | 'unresolved'
export interface ResolvedDouyinCredential {
  cookie: string
  origin: CredentialOrigin
  uifidSource: UifidSource
  loginState?: DouyinLoginState
}
export interface ResolveOptions extends DouyinCredentialRequestOptions {
  needLogin?: boolean
  noGuestFallback?: boolean
}

/**
 * 显式解析凭据。没有账号会话时，可通过游客握手补齐缺失的设备标识。
 *
 * 握手会向抖音首页发两次请求（签名纯算，不执行页面脚本）。只想在本地规范化请用
 * `normalizeDouyinCookie`，或传 `noGuestFallback: true` 关闭握手。
 * `needLogin: true` 会探测登录态，并始终保留账号凭据，不会用游客凭据替换。
 */
export const resolveDouyinCredential = async (cookie?: string | null, options: ResolveOptions = {}): Promise<ResolvedDouyinCredential> => {
  const raw = cookie ?? ''
  const normalized = normalizeDouyinCookie(raw)
  const origin: CredentialOrigin =
    normalized.uifidSource === 'UIFID_TEMP' ? 'uifid-temp' : normalized.cookie !== raw ? 'normalized' : raw ? 'as-is' : 'unresolved'
  const result: ResolvedDouyinCredential = { ...normalized, origin }
  if (options.needLogin) {
    result.loginState = (await checkDouyinLoginState(normalized.cookie, options)).state
    return result
  }
  if (normalized.uifidSource !== 'missing' || options.noGuestFallback) return result
  const jar = parseCookie(normalized.cookie)
  // 缺 `UIFID` 的会话仍是账号凭据。游客 token 来自另一个设备会话，
  // 不能替换该身份，也不能合并进去。
  if (jar.sessionid || jar.sessionid_ss || jar.sid_guard || jar.sid_tt) return result
  const handshake = await mintDouyinGuestHandshake(options)
  if (!handshake) return result
  // 判据是结构化结果里的**访客 id 有无**，不是「握手结果非空」：服务端只发 `ttwid`、
  // 扣下 `UIFID_TEMP` 时，那一串照样是服务端签发的真实设备标识，值得留下，但它不是
  // 一份游客凭据 —— 说成 `guest-minted` 会让调用方以为访客 id 已经在手上。
  // 只有 `guest-minted` 才带 `loginState: 'guest'`：那一支按定义就是游客会话；
  // 只有设备标识的这一支没探测过登录态，留空比编一个更诚实。
  if (!handshake.visitorId) return { ...normalizeDouyinCookie(handshake.cookie), origin: 'guest-device' }
  return { ...normalizeDouyinCookie(handshake.cookie), origin: 'guest-minted', loginState: 'guest' }
}
