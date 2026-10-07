import type { Judge, JudgeVerdict } from '../../contracts/error'
import { verdictFromHttpStatus, verdictFromNonJsonBody } from '../../contracts/error'
import { XIAOHONGSHU_ANTI_SPAM_STATUS, XIAOHONGSHU_ANTI_SPIDER_STATUS } from './captcha'

/**
 * 验证码挑战的结论。
 *
 * **显式关掉重试**：这是「要人去过验证页」而不是「等一会儿就好」——实测同一游客
 * cookie 下 XYS_/XYW_ 打两个接口四种组合连续全部 461，transport 那 1s/2s/4s 的退避
 * 重试一万次也一样。地址由 `captcha.ts` 取进 `error.challenge`（不受 `debug` 管）。
 */
const CAPTCHA_VERDICT: JudgeVerdict = { ok: false, kind: 'risk', code: 'CAPTCHA_REQUIRED', retryable: false }

/**
 * 小红书平台默认响应判定。
 *
 * 三条行为：
 * - **HTML 反爬页判为 `risk` / `ANTIBOT_PAGE`**：字符串响应（含 `<html>` 的反爬页
 *   与纯文本拦截页）判失败，原始 HTML 留在 `error.raw`
 *   （`createClient({ debug: true })` 时才填，见 `ClientOptions.debug`）。
 * - **461 / 471 判为 `risk` / `CAPTCHA_REQUIRED`**：平台自有的反爬 / 反垃圾状态码，
 *   见下。
 * - **不把一切失败归一化为 500**：judge 只分类，失败信封由 runtime 统一从原始响应
 *   提取 `platform.code` / `message`。
 *
 * 成功判定：`code === 0`。没有 `code` 字段的 JSON 响应（如 `emojiList` 之外的部分
 * 端点）视为成功，交给 normalize 处理 —— 缺失 code 不判失败。
 *
 * 反爬页的判别是「任何非空字符串」（{@link verdictFromNonJsonBody}）。
 * 判定顺序：**非 JSON 响应体 → 验证码状态 → 业务码 → HTTP 状态**。
 *
 * ## 验证码状态为什么必须排在业务码之前
 *
 * 461 的响应体是 `{"code":0,"success":true,"data":{},"msg":""}` —— `code` 是 **0**。
 * 放在业务码之后的话这条响应会一路落到 {@link verdictFromHttpStatus}，而那张表里
 * 没有 461（它不是通用 HTTP 语义，是小红书自有的 `antiSpider`），于是被判成
 * `unknown` / `PLATFORM_ERROR`：调用方拿到一个不透明错误，`kind` 不是 `risk`，
 * 管线也就**不会去调 `challenge` 钩子**，手里的验证页地址凭空丢掉。
 *
 * 排在前面还顺带兜住「平台哪天在 461 上给个非 0 业务码」——那时业务码分支会先
 * 返回一个不带 `kind` 的 `{ ok: false }`，同样拿不到验证页。状态码在这两个值上
 * 是比业务码更强的信号。
 */
export const xiaohongshuJudge: Judge = (raw, http) => {
  // 非 JSON 响应体（含 `<html>` 反爬页与纯文本拦截页）
  const nonJson = verdictFromNonJsonBody(raw)
  if (nonJson) return nonJson

  // 验证码挑战。必须在业务码之前，理由见文件头
  if (http.status === XIAOHONGSHU_ANTI_SPIDER_STATUS || http.status === XIAOHONGSHU_ANTI_SPAM_STATUS) {
    return CAPTCHA_VERDICT
  }

  if (typeof raw === 'object' && raw !== null && 'code' in raw) {
    const code = (raw as { code: unknown }).code
    if (code !== 0) return { ok: false }
  }

  // 业务码没给出结论，最后看 HTTP 状态
  return verdictFromHttpStatus(http.status) ?? { ok: true }
}
