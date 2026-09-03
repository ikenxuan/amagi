import type { Judge } from '../../contracts/error'
import { verdictFromHttpStatus, verdictFromNonJsonBody } from '../../contracts/error'

/**
 * 抖音平台默认响应判定。
 *
 * 修 v6 的 `internal.ts` 判定（`rawData.data === '' || rawData.status_code !== 0`）：
 * - **`status_code` 缺失时判成功**（修 `undefined !== 0` 误判）：部分抖音接口
 *   不返回 `status_code`（如 `emojiList`），v6 里 `undefined !== 0` 恒真，
 *   必然判失败。v7 只在 `status_code` **存在且非 0** 时判失败。
 * - **`filter_detail.filter_reason` 存在 → `kind: 'forbidden'`**（内容被平台
 *   过滤不可见）。
 * - **空响应（`data === ''`）→ `kind: 'auth'`**（v6 的 cookie 失效分支，
 *   `errorDescription` 含「接口返回内容为空」）。
 *
 * 失败不再归一化为数字 500，业务码留给 runtime 提取（A3，#15）。
 *
 * 判定顺序是有讲究的：**非 JSON 响应体 → 平台业务码 → HTTP 状态**。业务码在
 * 状态之前，因为非 2xx 的响应体里往往有更准的业务码；状态在最后兜底，
 * 因为业务码可能根本没给结论（见 {@link verdictFromHttpStatus}）。
 */
export const douyinJudge: Judge = (raw, http) => {
  // 空响应：v6 的 `data === ''` 判 cookie 失效
  if (raw === '') {
    return { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED', retryable: false }
  }

  // 非 JSON 响应体（WAF / 反爬页）。原先这里是「非对象一律判成功」，
  // 于是 403 + 纯文本拦截页被当成成功透出（见 verdictFromNonJsonBody）
  const nonJson = verdictFromNonJsonBody(raw)
  if (nonJson) return nonJson

  if (typeof raw !== 'object' || raw === null) {
    return verdictFromHttpStatus(http.status) ?? { ok: true } // null 交给 normalize
  }

  const body = raw as Record<string, unknown>

  // 内容过滤：filter_detail.filter_reason 存在即内容不可见
  const filterDetail = body.filter_detail as { filter_reason?: unknown } | undefined
  if (filterDetail && typeof filterDetail.filter_reason === 'string' && filterDetail.filter_reason.length > 0) {
    return { ok: false, kind: 'forbidden', code: 'PRIVATE', retryable: false }
  }

  // status_code 存在且非 0 才失败；缺失视为成功（修 undefined !== 0 误判）
  const statusCode = body.status_code
  if (statusCode !== undefined && Number(statusCode) !== 0) {
    return { ok: false }
  }

  // 业务码没给出结论，最后看 HTTP 状态
  return verdictFromHttpStatus(http.status) ?? { ok: true }
}
