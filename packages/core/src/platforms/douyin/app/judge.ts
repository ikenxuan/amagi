import type { Judge } from '../../../contracts/error'
import { douyinJudge, isDouyinCaptchaHeader } from '../shared/judge'

/** 保留 App 业务码与风控原因，避免把空数据误判为登录要求。 */
export const awemeJudge: Judge = (raw, http) => {
  if (http.status >= 200 && http.status < 300 && isDouyinCaptchaHeader(http.headers)) return douyinJudge(raw, http)
  if (raw === '') return { ok: false, kind: 'parse', code: 'EMPTY_RESPONSE', retryable: false }
  if (raw && typeof raw === 'object') {
    const data = raw as Record<string, unknown>
    if (data.status_code === 8) return { ok: false, kind: 'auth', code: 'LOGIN_REQUIRED', retryable: false }
    const config = data.business_config as Record<string, unknown> | undefined
    const nil = (data.search_nil_info ?? config?.search_nil_info) as Record<string, unknown> | undefined
    if (nil?.search_nil_type === 'invalid_type') return { ok: false, kind: 'validation', code: 'PARAM_INVALID', retryable: false }
    if (nil && ['antispam_check', 'verify_check'].includes(String(nil.search_nil_type))) {
      return { ok: false, kind: 'risk', code: 'RISK_CONTROL', retryable: false }
    }
    if (data.status_code === 0 && data.user && typeof data.user === 'object' && Object.keys(data.user).length === 0) {
      return { ok: false, kind: 'parse', code: 'EMPTY_RESPONSE', retryable: false }
    }
  }
  return douyinJudge(raw, http)
}
