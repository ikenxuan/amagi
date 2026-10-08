import type { Judge, JudgeHeaders } from '../../contracts/error'
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
 * 抖音验证中心下发验证指令用的两个响应头，按 SDK 的 XHR 路径的读取顺序排列。
 *
 * 出处是页面实际加载的验证中心 SDK（`rc-verifycenter/sec_sdk_build/4.0.28/captcha/index.js`），
 * 它把 `XMLHttpRequest` 整个猴补丁掉，在 `onload` 里只做这一件事：
 *
 * ```js
 * if (status >= 200 && status < 300) {
 *   if (headers 里有 "bdturing-verify:")              t = 取 bdturing-verify
 *   else if (headers 里有 "x-vc-bdturing-parameters:") t = base64 解码 x-vc-bdturing-parameters
 *   t ? 弹验证(t) : 放行
 * }
 * ```
 *
 * 同一个 SDK 的 `fetch` 补丁顺序相反（先看 `x-vc-bdturing-parameters`），而且空的
 * `bdturing-verify` 不会挡住后面的查找。两个头同时出现且结论不同的响应没见过，
 * 这里按 XHR 路径实现 —— 抖音 web 的数据接口走的是 XHR。
 *
 * 由此得出两条与直觉相反的事实，也是这条判据存在的理由：
 * - **弹验证时 HTTP 是 200，不是 403**，所以 {@link verdictFromHttpStatus} 兜不住；
 * - **SDK 根本不读响应体**，验证指令只在头上，所以只看 body 的判据一定漏。
 *
 * 管辖范围是页面上的 `_vc_intercepted_pathList`：`include` 里有 `^/aweme/v1/`、
 * `^/aweme/v2/`、`^/webcast/`、`^/live/` 等，`exclude` 只有播放地址 —— amagi 的
 * 抖音端点几乎全落在里面，作品详情（`/aweme/v1/web/aweme/detail/`）也在。
 */
const BDTURING_HEADERS = ['bdturing-verify', 'x-vc-bdturing-parameters'] as const

/**
 * 无感采集的 subtype。SDK 见到它照样走一遍渲染流程，但只是上报采集数据
 * （`reportNocaptcha`），随后以 `successCb({ skipRetry: true })` 直接放行**原响应**，
 * 不弹任何东西、也不重发请求；对页面代码它还会把这两个头过滤掉。
 * 所以带着这个 subtype 的头不算验证码 —— 按「有头就拦」判会把正常响应判失败。
 */
const SILENT_SUBTYPE = 'nocaptcha_collect'

/**
 * 按 SDK 的规则解开验证头的值：是合法 base64 就解码，否则原样。
 *
 * SDK 的判据是 `btoa(atob(v)) === v`（能来回编解码且不变才算 base64），
 * 这里用 `Buffer` 做同一件事 —— 只看「解码再编码是否还原」，不猜内容。
 * @param value - 响应头原值
 * @returns 解码后的验证参数文本
 */
const decodeBdturing = (value: string): string => {
  const trimmed = value.trim()
  if (trimmed === '') return trimmed
  const decoded = Buffer.from(trimmed, 'base64')
  return decoded.toString('base64') === trimmed ? decoded.toString('utf8') : trimmed
}

/**
 * 取验证参数里的 `subtype`，与 SDK 的 `JSON.parse(v)?.subtype` 一致；解析不了就是 `undefined`
 * @param text - 解码后的验证参数文本
 * @returns subtype
 */
const subtypeOf = (text: string): unknown => {
  try {
    return (JSON.parse(text) as { subtype?: unknown } | null)?.subtype
  } catch {
    return undefined
  }
}

/**
 * 取出验证头里**要弹验证**的那份验证参数（解码后的文本）。
 *
 * 与 SDK 的 XHR 路径逐条对齐：先认 `bdturing-verify`，没有再认 `x-vc-bdturing-parameters`；
 * 值为空不算；`subtype` 是 {@link SILENT_SUBTYPE} 不算（SDK 自己也不弹）。
 * `subtype` 解析不出来时**算**验证 —— SDK 在那种情况下也会拿去渲染验证。
 *
 * 判定（{@link isDouyinCaptchaHeader}）与提取（`captcha.ts` 的 `parseDouyinCaptcha`）
 * 共用这一份，两边对「哪个头、哪份参数」不会各说各话。
 * @param headers - 响应头
 * @returns 验证参数文本；不要求验证时 undefined
 */
export const douyinVerifyParams = (headers: JudgeHeaders | undefined): string | undefined => {
  if (!headers) return undefined
  for (const name of BDTURING_HEADERS) {
    const raw = headers.get(name)
    if (raw === undefined) continue
    const text = decodeBdturing(raw)
    // XHR 路径按顺序取第一个**存在**的头，不会因为它是空的再去看下一个
    return text !== '' && subtypeOf(text) !== SILENT_SUBTYPE ? text : undefined
  }
  return undefined
}

/**
 * 抖音弹验证码（滑块等）时的**主**判据：看响应头。规则见 {@link douyinVerifyParams}。
 *
 * 单独导出的理由同 {@link isDouyinArgusBody}：`search` 有自己的 judge。
 * @param headers - 响应头；没有传（手搓 judge 调用）时恒为 `false`
 * @returns 这份响应是不是在要求过验证
 */
export const isDouyinCaptchaHeader = (headers: JudgeHeaders | undefined): boolean => douyinVerifyParams(headers) !== undefined

/**
 * 验证中心的决策配置，前端拿它去拉验证 SDK 弹滑块。正常响应里不会有这个键。
 *
 * 实物形状（值是**字符串形式的 JSON**，里面只有决策信息、没有可跳转的 URL）：
 *
 * ```jsonc
 * { "status_code": 10000, "status_msg": "",
 *   "verify_center_decision_conf": "{\"verify_center_decision\":\"verify_hit\",\"decision_conf\":{\"subtype\":\"slide\"}}" }
 * ```
 *
 * 只收这一个名字，判据与 `typegen` 的 `CAPTCHA_MARKERS` 同源（那份是录制器用来
 * 拒绝风控页入库的）。**不按名字宁滥勿缺**：`captcha_token` 这类眼熟的键在正常
 * 请求里就可能带着空值出现，按名字猜会把正常响应判成风控页，而那种误判是静默的。
 * 同理，这个键在但值为空（`''` / `null`）也不算。
 */
const VERIFY_CENTER_MARKER = 'verify_center_decision_conf'

/**
 * 对象上带着非空的验证中心决策配置
 * @param obj - 响应体的某一层
 * @returns 是否命中
 */
const hasVerifyCenterDecision = (obj: Record<string, unknown>): boolean => {
  const value = obj[VERIFY_CENTER_MARKER]
  return value !== undefined && value !== null && value !== ''
}

/**
 * 抖音验证页的**次要**判据：看响应体。
 *
 * 主判据是 {@link isDouyinCaptchaHeader} —— 验证中心 SDK 只看响应头。这一条留着是因为
 * `typegen` 录到过带这个键的抖音风控页，那是另一条下发通道；两条都认，任一命中即拦。
 *
 * 单独导出的理由同 {@link isDouyinArgusBody}：`search` 有自己的 judge，验证页
 * 在那条路上会落进「既没 user_list 也没 data」那一支、报成 cookie 失效，
 * 和 Argus 那次是同一类误判。判据只此一份。
 *
 * 只看顶层与 `data` 一层，**不做全递归**：验证页本身是一份小对象，而正常响应
 * 可以有几 MB（userVideoList 实测 2.2MB），为一个只出现在浅层的键把每份响应
 * 都全遍历一遍是纯开销。`typegen` 那份 `hasCaptchaMarker` 全递归是因为它跑在
 * 录制链路上、一份样本只判一次，与每次请求都要过的运行时判定不是一回事。
 * @param raw - decode 之后的响应体
 * @returns 是不是一份验证页响应
 */
export const isDouyinCaptchaBody = (raw: unknown): boolean => {
  if (typeof raw !== 'object' || raw === null) return false
  const body = raw as Record<string, unknown>
  if (hasVerifyCenterDecision(body)) return true
  const data = body.data
  return typeof data === 'object' && data !== null && hasVerifyCenterDecision(data as Record<string, unknown>)
}

/**
 * 抖音平台默认响应判定。
 *
 * 判定规则：
 * - **`status_code` 存在且非 0 才判失败**：部分抖音接口不返回 `status_code`
 *   （如 `emojiList`），把缺失当成失败会误判。
 * - **`filter_detail.filter_reason` 存在 → `kind: 'forbidden'`**（内容被平台
 *   过滤不可见）。
 * - **验证码 → `risk` / `CAPTCHA_REQUIRED`**，两条通道都认：响应头
 *   （{@link isDouyinCaptchaHeader}，主通道，排在最前）与响应体
 *   （`verify_center_decision_conf`，排在 `status_code` 之前 —— 落到业务码那一支，
 *   非 0 的码会被判成 `PLATFORM_ERROR`，0 或缺失则被判成成功）。
 * - **Argus 文本点名签名 → `risk` / `SIGNATURE_REFUSED`**（不可重试），与一般的
 *   `ANTIBOT_PAGE` 分开：前者是 amagi 的签名问题，换 cookie 无用。
 * - **空响应（`data === ''`）→ `code: 'EMPTY_RESPONSE'`**：空响应最常见的
 *   成因是设备类参数（多为 `webid`）与 cookie 会话不匹配 —— 抖音对不上就
 *   静默回 0 字节，不给 403 也不给业务码。`kind` 仍是 `auth`：成因里 ck 失效
 *   依然最常见，调用方现有的 `kind === 'auth'` 分支不该因此改行为。
 *
 * 失败不归一化为数字 500，业务码留给 runtime 提取。
 *
 * 判定顺序是有讲究的：**验证头 → 非 JSON 响应体 → 平台业务码 → HTTP 状态**。验证头
 * 最先，因为它是验证中心的明确指令，body 只是副作用；业务码在
 * 状态之前，因为非 2xx 的响应体里往往有更准的业务码；状态在最后兜底，
 * 因为业务码可能根本没给结论（见 {@link verdictFromHttpStatus}）。
 */
export const douyinJudge: Judge = (raw, http) => {
  // 验证码 / 滑块（响应头通道）。**排在一切 body 判据之前**：弹验证时 HTTP 200、
  // body 可能是一份看着正常的 JSON，也可能是空串 —— 头才是验证中心的原话，
  // body 那几条判出来的都是它的副作用。只认 2xx 与 SDK 一致：非 2xx 时浏览器
  // 也不会弹，那种响应留给下面的 HTTP 状态兜底。
  if (http.status >= 200 && http.status < 300 && isDouyinCaptchaHeader(http.headers)) {
    return { ok: false, kind: 'risk', code: 'CAPTCHA_REQUIRED', retryable: false }
  }

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

  // 验证码 / 滑块（响应体通道）。**必须排在 status_code 之前**：实物带着 10000，
  // 落到下面会被判成 `PLATFORM_ERROR`，「需要人机验证」这个结论就丢了；码是 0 或
  // 缺失的则会被判成成功，调用方拿到一个装着风控页的「成功」信封。
  //
  // `retryable: false` 与快手的 `CAPTCHA_REQUIRED` 一致：验证码要人过，退避过不去。
  // 这和 Argus 的 `ANTIBOT_PAGE`（可重试）是两回事 —— 那个是这次请求的指纹不对，
  // 换一次凭据就可能过。
  //
  // **只中转不绕过**：amagi 不引入任何识别、轨迹模拟或自动过验证的代码。验证页地址
  // 只从响应头通道拼（`captcha.ts`）；这条响应体通道给不出 —— 实物的
  // `verify_center_decision_conf` 里只有 `verify_hit` / `subtype` 这类决策信息，
  // 没有验证页要的 `fp` / `aid`，拼不出能过的地址，不编一个出来。
  if (isDouyinCaptchaBody(body)) {
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
