import type { Judge } from '../../contracts/error'
import { verdictFromHttpStatus, verdictFromNonJsonBody } from '../../contracts/error'

/**
 * B站平台默认响应判定。
 *
 * 判定规则：
 * - **`code: 0` 一律成功**：空负载（`data: null` 或 `{}`）也交成功，数据形状
 *   由端点的 `normalize` 负责。
 * - **`platform.message` 由 runtime 统一提取**：`execute` 从原始响应取
 *   `message` / `status_msg` / `msg`，judge 只负责分类。
 * - **`-412` 分类为 `kind: 'risk'` / `code: 'RISK_CONTROL'`**，端点声明
 *   `retryOn: ['RISK_CONTROL']`，由 execute 统一退避重试（trace 可见）。
 *
 * 其余错误码分类：`-101`（未登录）→ `auth`；`-404`（啥都木有）→
 * `not_found`；其余一律 `kind: 'unknown'`，业务码留给 runtime 提取。
 *
 * 判定顺序：**非 JSON 响应体 → 平台业务码 → HTTP 状态**。业务码在状态之前，
 * 因为非 2xx 的响应体里往往有更准的业务码（`-412` 就是）；状态在最后兜底。
 */
export const bilibiliJudge: Judge = (raw, http) => {
  // 空响应：cookie 可能已失效
  if (raw === '') {
    return { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED', retryable: false }
  }

  // 非 JSON 响应体（WAF / 反爬页）
  const nonJson = verdictFromNonJsonBody(raw)
  if (nonJson) return nonJson

  if (typeof raw !== 'object' || raw === null) {
    return verdictFromHttpStatus(http.status) ?? { ok: true } // null 交给 normalize
  }

  const body = raw as Record<string, unknown>
  const code = body.code

  // code 缺失或为 0：业务码没给出结论，最后看 HTTP 状态；空负载交给 normalize
  if (code === undefined || Number(code) === 0) {
    return verdictFromHttpStatus(http.status) ?? { ok: true }
  }

  // 风控拦截：-412 由端点声明 retryOn 退避重试
  if (Number(code) === -412) {
    return { ok: false, kind: 'risk', code: 'RISK_CONTROL' }
  }

  // 未登录
  if (Number(code) === -101) {
    return { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED' }
  }

  // 啥都木有
  if (Number(code) === -404) {
    return { ok: false, kind: 'not_found', code: 'NOT_FOUND' }
  }

  // 其余业务码：分类留给调用方，业务码与文案由 runtime 提取
  return { ok: false, kind: 'unknown', code: 'PLATFORM_ERROR' }
}
