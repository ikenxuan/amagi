import { parseCookie } from '../../contracts/cookie'
import { normalizeDouyinCookie, type UifidSource } from './cookie'
import type { DouyinCredentialRequestOptions } from './credentialRequest'
import { mintDouyinGuestCookie } from './guestCredential'
import { checkDouyinLoginState, type DouyinLoginState } from './loginState'

export type CredentialOrigin = 'as-is' | 'normalized' | 'uifid-temp' | 'guest-minted' | 'unresolved'
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
 * 握手可能会下载并执行抖音第一方的 acrawler 脚本。只想在本地规范化请用
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
  const guest = await mintDouyinGuestCookie(options)
  if (!guest) return result
  return { ...normalizeDouyinCookie(guest), origin: 'guest-minted', loginState: 'guest' }
}
