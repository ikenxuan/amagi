import type { Judge } from '../../contracts/error'
import { verdictFromHttpStatus, verdictFromNonJsonBody } from '../../contracts/error'

/**
 * Argus（抖音的风控 SDK）拦截时响应体是纯文本，形如
 * `Blocked by ArgusSecurityPlugin Uifid Not Found`。
 *
 * 单独导出是因为 `search` 端点有自己的 judge（它的响应本来就可能是字符串 ——
 * 综合搜索走「十六进制长度行 + JSON」的分块流），绕开了这里的公共前置，
 * 于是 Argus 拦截在那条路上会被误判成 cookie 失效。判据只此一份。
 * @param raw - decode 之后的响应体
 * @returns 是不是一段 Argus 拦截文本
 */
export const isDouyinArgusBody = (raw: unknown): boolean =>
  typeof raw === 'string' && /ArgusSecurityPlugin|Blocked by/i.test(raw)

/**
 * 抖音平台默认响应判定。
 *
 * 判定规则：
 * - **`status_code` 存在且非 0 才判失败**：部分抖音接口不返回 `status_code`
 *   （如 `emojiList`），把缺失当成失败会误判。
 * - **`filter_detail.filter_reason` 存在 → `kind: 'forbidden'`**（内容被平台
 *   过滤不可见）。
 * - **空响应（`data === ''`）→ `code: 'EMPTY_RESPONSE'`**：空响应最常见的
 *   成因是设备类参数（多为 `webid`）与 cookie 会话不匹配 —— 抖音对不上就
 *   静默回 0 字节，不给 403 也不给业务码。`kind` 仍是 `auth`：成因里 ck 失效
 *   依然最常见，调用方现有的 `kind === 'auth'` 分支不该因此改行为。
 *
 * 失败不归一化为数字 500，业务码留给 runtime 提取。
 *
 * 判定顺序是有讲究的：**非 JSON 响应体 → 平台业务码 → HTTP 状态**。业务码在
 * 状态之前，因为非 2xx 的响应体里往往有更准的业务码；状态在最后兜底，
 * 因为业务码可能根本没给结论（见 {@link verdictFromHttpStatus}）。
 */
export const douyinJudge: Judge = (raw, http) => {
  // 空响应：HTTP 200 + 0 字节，抖音在设备参数与会话对不上时就是这个形状
  if (raw === '') {
    return { ok: false, kind: 'auth', code: 'EMPTY_RESPONSE', retryable: false }
  }

  // 非 JSON 响应体（WAF / 反爬页 / Argus 拦截）：403 + 纯文本拦截页不能被当成成功
  // 透出（见 verdictFromNonJsonBody）
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

  // status_code 存在且非 0 才失败；缺失视为成功。
  //
  // **不按码分类**：抖音没有公开的业务码表，同一个码在不同接口上含义还不一样
  // （`5` 在 dynamicEmojiList 是「参数不合法」、在 guestUserInfo 是「抖音号不存在」）。
  // 编一张表出来只会制造假的确定性。真实码不会丢 —— runtime 会把它放进
  // `error.platform.code`，文案放进 `error.platform.message`。
  //
  // 抖音真正需要重试的那一类是 Argus 拦截，它是纯文本 body、走上面的
  // `verdictFromNonJsonBody`（`risk` / `ANTIBOT_PAGE`），不经过这一支。
  const statusCode = body.status_code
  if (statusCode !== undefined && Number(statusCode) !== 0) {
    return { ok: false, kind: 'unknown', code: 'PLATFORM_ERROR', retryable: false }
  }

  // 业务码没给出结论，最后看 HTTP 状态
  return verdictFromHttpStatus(http.status) ?? { ok: true }
}
