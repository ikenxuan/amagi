import type { Judge } from '../../contracts/error'
import { verdictFromHttpStatus, verdictFromNonJsonBody } from '../../contracts/error'

/**
 * 小红书平台默认响应判定。
 *
 * 三条行为：
 * - **HTML 反爬页判为 `risk` / `ANTIBOT_PAGE`**：字符串响应（含 `<html>` 的反爬页
 *   与纯文本拦截页）判失败，原始 HTML 留在 `error.raw`
 *   （`createClient({ debug: true })` 时才填，见 `ClientOptions.debug`）。
 * - **不把一切失败归一化为 500**：judge 只分类，失败信封由 runtime 统一从原始响应
 *   提取 `platform.code` / `message`。
 * - **HTTP 461 判为 `risk` / `RISK_CONTROL`**：461 是小红书专属的风控码，必须在
 *   {@link verdictFromHttpStatus} **之前**拦下 —— 那个通用 helper 只特判
 *   401/403/404/408/429，461 会落进它的兜底分支，被报成 `kind: 'unknown'` /
 *   `PLATFORM_ERROR` / `retryable: false`：把一个明确的风控状态说成「未知平台错误」，
 *   可重试性也与同为风控的 403 相左。它属于平台专属码，因此留在本 judge 而不下沉到
 *   共享 helper（下沉会让其它三个平台也认领一个它们不会遇到的码）。
 *
 *   461 的典型面目是**伪装成成功的空壳**：`HTTP 461` 配
 *   `{"code": 0, "success": true, "msg": "成功", "data": {}}` —— 平台不告诉你原因，
 *   只看响应体像是成功了。实测（2026-10-12 真机抓包，游客会话）：`comment/page`
 *   首页正常、**翻页**必回此形态。
 *
 * 成功判定：`code === 0`。没有 `code` 字段的 JSON 响应（如 `emojiList` 之外的部分
 * 端点）视为成功，交给 normalize 处理 —— 缺失 code 不判失败。
 *
 * 反爬页的判别是「任何非空字符串」（{@link verdictFromNonJsonBody}）。
 * 判定顺序：**非 JSON 响应体 → 业务码 → HTTP 状态**。
 */
export const xiaohongshuJudge: Judge = (raw, http) => {
  // 非 JSON 响应体（含 `<html>` 反爬页与纯文本拦截页）
  const nonJson = verdictFromNonJsonBody(raw)
  if (nonJson) return nonJson

  if (typeof raw === 'object' && raw !== null && 'code' in raw) {
    const code = (raw as { code: unknown }).code
    if (code !== 0) return { ok: false }
  }

  // 461 专属风控码：通用 helper 不认识它，必须在这里拦（见上）
  if (http.status === 461) return { ok: false, kind: 'risk', code: 'RISK_CONTROL', retryable: true }

  // 业务码没给出结论，最后看 HTTP 状态
  return verdictFromHttpStatus(http.status) ?? { ok: true }
}
