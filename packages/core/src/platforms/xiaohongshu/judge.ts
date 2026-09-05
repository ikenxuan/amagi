import type { Judge } from '../../contracts/error'
import { verdictFromHttpStatus, verdictFromNonJsonBody } from '../../contracts/error'

/**
 * 小红书平台默认响应判定。
 *
 * 从 v6 `getdata.ts` 的 `GlobalGetData` 提取，两条行为差异（都是有意修的缺陷）：
 * - **HTML 反爬页判为 `risk` / `ANTIBOT_PAGE`**（修 #15）。v6 是
 *   `if (typeof response === 'string' && response.includes('<html>')) return response`
 *   —— 把风控页当成功透出。v7 判失败，原始 HTML 留在 `error.raw`
 *   （`createClient({ debug: true })` 时才填，见 `ClientOptions.debug`）。
 *   这是 C 档破坏性变更，迁移文档已写明。
 * - **不再把一切失败归一化为 500**。v6 的 catch 把所有异常包成
 *   `{ code: 500, message: 'error' }`，平台业务码全丢。v7 judge 只分类，
 *   失败信封由 runtime 统一从原始响应提取 `platform.code` / `message`（A3）。
 *
 * 成功判定与 v6 一致：`code === 0`。没有 `code` 字段的 JSON 响应（如
 * `emojiList` 之外的部分端点）视为成功，交给 normalize 处理 —— 与 v6 的
 * `response.code !== 0` 相比，缺失 code 不再被误判为失败。
 *
 * 反爬页的判别从「字符串且含 `<html>`」放宽到「任何非空字符串」
 * （{@link verdictFromNonJsonBody}）：本平台原先只挡含 `<html>` 的，纯文本
 * 拦截页照样透出。判定顺序：**非 JSON 响应体 → 业务码 → HTTP 状态**。
 */
export const xiaohongshuJudge: Judge = (raw, http) => {
  // 非 JSON 响应体（含原先只挡 `<html>` 的那一类）
  const nonJson = verdictFromNonJsonBody(raw)
  if (nonJson) return nonJson

  if (typeof raw === 'object' && raw !== null && 'code' in raw) {
    const code = (raw as { code: unknown }).code
    if (code !== 0) return { ok: false }
  }

  // 业务码没给出结论，最后看 HTTP 状态
  return verdictFromHttpStatus(http.status) ?? { ok: true }
}
