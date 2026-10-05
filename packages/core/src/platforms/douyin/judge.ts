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
export const isDouyinArgusBody = (raw: unknown): boolean => typeof raw === 'string' && /ArgusSecurityPlugin|Blocked by/i.test(raw)

/**
 * Argus 拦截文本里点名「签名不对」的片段。
 *
 * 命中这些的 403 是 **amagi 自己的问题，不是这个账号的问题** —— 平台在说
 * 「你这个签名我不认」，而不是「你这个号被风控了」。两者处置方式完全相反：
 * 前者换 cookie 一万次也没用（得修签名），后者换个号就好了。
 *
 * 片段清单来自线上实测，全部是 `Blocked by ArgusSecurityPlugin <reason>` 形态。
 * 403 若一律判风控，「签名器少算了一个参数」就会表现成账号被风控，排查方向
 * 整个跑偏。
 *
 * `uifid not found` 这一条在本仓库有具体成因：`/aweme/v1/web/music/detail/` 这类
 * 受 secsdk 保护的端点要求访客 id，而扫码登录拿回的 cookie 里**没有** `UIFID`
 * （它由 secsdk 在真实浏览器里铸造，passport 链路不经过那一步）。见
 * `sign/secsdkWebSign.ts` 的 `applySecsdkWebSign`。
 */
const SIGNATURE_REFUSAL_MARKERS: readonly string[] = ['uifid not found', 'signature not found', 'sign invalid', 'sign expired']

/**
 * 从 Argus 拦截文本里认出「签名被拒」。
 *
 * 只在**已经确定是 Argus 文本**之后调用（`isDouyinArgusBody` 为真），所以这里
 * 直接按子串找，不必担心把正常响应里恰好出现的字眼当成拦截。
 * @param raw - decode 之后的响应体
 * @returns 命中的片段；不是签名类拒绝时返回 `undefined`
 */
export const douyinSignatureRefusal = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined
  const text = raw.toLowerCase()
  return SIGNATURE_REFUSAL_MARKERS.find((marker) => text.includes(marker))
}

/**
 * 抖音风控页（verify_center）的判据字段。
 *
 * 实物形状（`status_code: 10000` + 这个字段，字段本身是**字符串形式的 JSON**）：
 *
 * ```jsonc
 * { "status_code": 10000, "status_msg": "",
 *   "verify_center_decision_conf": "{\"verify_center_decision\":\"verify_hit\",\"decision_conf\":{\"subtype\":\"slide\"}}" }
 * ```
 *
 * **按字段名判，不扫全文**。扫 `captcha` 这类子串会把「简介里恰好提到验证码」
 * 的正常作品判成风控，而每一次误判都会冤枉一个健康账号；字段名不会出现在用户
 * 文案里。
 *
 * 这一条只负责**定性**到「需要人机验证」。它不产出验证页地址 —— 目前掌握的
 * 这份响应里确实没有可跳转的 URL，`verify_center_decision_conf` 里只有
 * `verify_hit` 与 `subtype: slide` 这类决策信息。所以 amagi 不装
 * `ChallengeExtractor`（`error.challenge` 仍为空），不编造一个地址出来。
 */
const VERIFY_CENTER_KEY = 'verify_center_decision_conf'

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

  // 签名被拒：必须排在 verdictFromNonJsonBody 之前 —— 两者匹配同一段 403 纯文本，
  // 只有这一条知道成因是「我们的签名」而不是「这个账号」。仍是 risk（请求确实被
  // 拒了，判成业务错误会让坏掉的签名器看起来很健康），但码点明了方向。
  // 不可重试：重签一万次结果一样，retryFresh 换的是 msToken / a_bogus，补不出
  // 缺失的访客 id。
  const refusal = douyinSignatureRefusal(raw)
  if (refusal) {
    return { ok: false, kind: 'risk', code: 'SIGNATURE_REFUSED', retryable: false }
  }

  // 非 JSON 响应体（WAF / 反爬页 / Argus 拦截）：403 + 纯文本拦截页不能被当成成功
  // 透出（见 verdictFromNonJsonBody）
  const nonJson = verdictFromNonJsonBody(raw)
  if (nonJson) return nonJson

  if (typeof raw !== 'object' || raw === null) {
    return verdictFromHttpStatus(http.status) ?? { ok: true } // null 交给 normalize
  }

  const body = raw as Record<string, unknown>

  // 人机验证页：必须排在 status_code 那一支之前 —— 这类响应带着非 0 的
  // `status_code`（实物是 10000），落到那条会被判成 `unknown` / `PLATFORM_ERROR`，
  // 「需要人机验证」这个唯一有用的结论就丢了。
  //
  // 按字段名判而不是按业务码判：抖音没有公开的业务码表，同一个码在不同接口含义
  // 不一样（本文件下面那段注释讲的就是这件事），为 10000 开一张表是在猜；
  // 而 `verify_center_decision_conf` 这个字段名本身就是结论。
  if (body[VERIFY_CENTER_KEY] !== undefined && body[VERIFY_CENTER_KEY] !== null && body[VERIFY_CENTER_KEY] !== '') {
    return { ok: false, kind: 'risk', code: 'CAPTCHA_REQUIRED', retryable: false }
  }

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
