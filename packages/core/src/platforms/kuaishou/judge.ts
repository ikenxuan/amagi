import type { Judge } from '../../contracts/error'
import { verdictFromHttpStatus, verdictFromNonJsonBody } from '../../contracts/error'

/**
 * 快手平台默认响应判定。
 *
 * 修 #13：v6 的判定是 `rawData.code && Object.values(kuaishouAPIErrorCode).includes(rawData.code)`
 * —— 依赖 `&&` 短路：`code: 0` 时 `0 && ...` 直接短路为 falsy，永远判成功；
 * 而 truthy 的「未知值」若命中枚举（`INVALID_COOKIE`）反而判失败。判定的
 * 对错取决于短路求值的巧合。v7 改成**显式 switch**：只把枚举里声明过的
 * 错误码判失败，其余（含 `code: 0` 与未命中枚举的值）一律成功，
 * 成功/失败的边界由表决定，不再由 `&&` 的求值顺序决定。
 *
 * 成功判定与 v6 的实际行为一致（`code: 0` 成功、未命中枚举成功）——
 * 变的只是**判定方式**从短路巧合改为显式表，行为可复现、可单测。
 *
 * 判定顺序：**非 JSON 响应体 → 枚举里的业务码 → HTTP 状态**。最后那一步是
 * 必需的：快手这条路径原先连「对象里没有 `code` 字段」都判成功，403 的
 * 拦截页因此完全无人认领。
 */
export const kuaishouJudge: Judge = (raw, http) => {
  // 非 JSON 响应体（WAF / 反爬页）
  const nonJson = verdictFromNonJsonBody(raw)
  if (nonJson) return nonJson

  if (typeof raw !== 'object' || raw === null || !('code' in raw)) {
    return verdictFromHttpStatus(http.status) ?? { ok: true }
  }

  const code = (raw as { code: unknown }).code

  switch (code) {
    case 'INVALID_COOKIE':
      return { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED', retryable: false }
    case 'UNKNOWN_ERROR':
      return { ok: false, kind: 'unknown', code: 'UNKNOWN_ERROR', retryable: false }
    default:
      // `code: 0` 与所有未在枚举中声明的值都不判失败 —— 显式写出，不靠短路；
      // 但仍要过一遍 HTTP 状态，否则非 2xx 又没人认领
      return verdictFromHttpStatus(http.status) ?? { ok: true }
  }
}
