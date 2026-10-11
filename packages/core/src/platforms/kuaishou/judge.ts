import type { Judge, JudgeVerdict } from '../../contracts/error'
import { verdictFromHttpStatus, verdictFromNonJsonBody } from '../../contracts/error'
import { KUAISHOU_H5_CAPTCHA_RESULT, KUAISHOU_PC_CAPTCHA_RESULT } from './captcha'

/**
 * 快手平台默认响应判定。
 *
 * 判定**显式比较枚举值**：只把枚举里声明过的错误码判失败，其余（含 `code: 0`
 * 与未命中枚举的值）一律成功，成功/失败的边界由表决定 —— 不依赖 `&&` 短路
 * 求值的巧合：那样 `code: 0` 会因短路判成功，而命中枚举的未知值反而判失败。
 *
 * 判定顺序：**非 JSON 响应体 → 枚举里的业务码 → GraphQL 风控 → GraphQL 全 null
 * → 快手的 `result` 状态位 → HTTP 状态**。后四道缺一不可，否则 403 的拦截页、
 * `{ result: 2 }` 的失败信封、以及 GraphQL 那两种「业务码不在顶层」的风控形状
 * 都会无人认领。
 *
 * 风控那道**必须排在 `result` 之前**：PC GraphQL 撞风控时顶层既没有 `result`
 * 也没有 `code`，只有 `errors[].message` 与 `data.captcha`，落到 `result` 那一道
 * 就会被 `errors` 非空判成 `PLATFORM_ERROR` —— 而 `execute` 只在 `kind: 'risk'`
 * 时才去取滑块地址，分类错了地址就整条拿不出来。
 */
export const kuaishouJudge: Judge = (raw, http) => {
  // 非 JSON 响应体（WAF / 反爬页）
  const nonJson = verdictFromNonJsonBody(raw, http.responseType)
  if (nonJson) return nonJson

  if (typeof raw !== 'object' || raw === null) {
    return verdictFromHttpStatus(http.status) ?? { ok: true }
  }

  // 枚举里声明过的错误码优先（它比 result 更具体）
  const code = (raw as { code: unknown }).code
  if (code === 'INVALID_COOKIE') return { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED', retryable: false }
  if (code === 'UNKNOWN_ERROR') return { ok: false, kind: 'unknown', code: 'UNKNOWN_ERROR', retryable: false }

  // `code: 0` 与所有未在枚举中声明的值都不由 code 判失败 —— 显式写出，不靠短路；
  // 但仍要过 GraphQL 风控、GraphQL 全 null、result 与 HTTP 状态四道
  return (
    kuaishouGraphqlCaptchaVerdict(raw) ??
    kuaishouGraphqlNullVerdict(raw) ??
    kuaishouResultVerdict(raw) ??
    verdictFromHttpStatus(http.status) ?? { ok: true }
  )
}

/** 风控滑块结论。`KUAISHOU_RESULT_VERDICTS` 与 GraphQL 那两种形状共用同一份，分类只写一次 */
const CAPTCHA_VERDICT: JudgeVerdict = { ok: false, kind: 'risk', code: 'CAPTCHA_REQUIRED', retryable: false }

/** `errors[]` 里的这一条是不是风控？只看 `message` 里有没有 captcha 字样 */
const isCaptchaError = (entry: unknown): boolean => {
  const message = (entry as { message?: unknown } | null)?.message
  return typeof message === 'string' && /captcha/i.test(message)
}

/**
 * PC GraphQL 的风控判定：业务码**不在顶层 `result` 上**。
 *
 * 两种形状，都是服务端直接返回的（2026-09-26 在浏览器里用 `credentials: 'omit'`
 * 打 `www.kuaishou.com/graphql` 实测）：
 *
 * ```jsonc
 * // 形状一：GraphQL 错误 + 同一个 data 里挂着滑块地址。顶层没有 result、没有 code
 * {
 *   "errors": [{ "message": "Need captcha", "path": ["visionSubCommentList"],
 *                "extensions": { "code": "GRAPHQL_VALIDATION_FAILED" } }],
 *   "data": { "visionSubCommentList": null,
 *             "captcha": { "url": "https://captcha.zt.kuaishou.com/iframe/index.html?…", "jsSdkUrl": "//static.yximgs.com/…" } }
 * }
 *
 * // 形状二：业务码嵌在 data 里（滑块地址同层）
 * { "data": { "result": 400002, "url": "https://captcha.zt.kuaishou.com/iframe/index.html?…", "jsSdkUrl": "//…" } }
 * ```
 *
 * 形状一原先被 {@link kuaishouResultVerdict} 的 `errors` 非空分支判成
 * `unknown` / `PLATFORM_ERROR`，形状二则因为判据只读**顶层** `result` 而整条漏判
 * （判成成功）。两种都会让 `error.challenge` 取不到滑块地址。
 *
 * 嵌套 `result` **只认风控那两个码**：`live_api` 的响应里 `data.result` 是子结构
 * 自己的状态位（`userWorkList` 就在读 `data.result`），照着顶层那张表判会误杀。
 * @param raw - decode 之后的响应体（已确认是对象）
 * @returns 风控结论；不是风控形状时 `undefined`
 */
const kuaishouGraphqlCaptchaVerdict = (raw: unknown): JudgeVerdict | undefined => {
  const body = raw as Record<string, unknown>

  if (Array.isArray(body.errors) && body.errors.some(isCaptchaError)) return CAPTCHA_VERDICT

  const data = body.data
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return undefined

  const nested = (data as Record<string, unknown>).result
  if (typeof nested !== 'number' && typeof nested !== 'string') return undefined
  const numeric = Number(nested)
  return numeric === KUAISHOU_PC_CAPTCHA_RESULT || numeric === KUAISHOU_H5_CAPTCHA_RESULT ? CAPTCHA_VERDICT : undefined
}

/**
 * GraphQL 全 null 判定：`data` 的每一个键都是 null。
 *
 * 归 `unknown` / `PLATFORM_ERROR` 而**不是** `auth` / `LOGIN_REQUIRED`：这条原先
 * 写着「未登录时快手就回这个」，2026-09-26 的浏览器实测把三种成因逐个排掉了，
 * 没有一种是未登录 ——
 *
 * - **游客态**（只有浏览器激活过的 `did` / `didv`，没有登录态）：`visionVideoDetail`
 *   与 `commentListQuery` 都**正常返回数据**，V2 字段有值。未登录本身不产生空壳。
 * - **完全无 Cookie**（`credentials: 'omit'`）：回的是 `{ result: 2, error_msg: null }`，
 *   顶层 result，由 {@link KUAISHOU_RESULT_VERDICTS} 那一道接住。
 * - **作品不存在**：回的是 `{ data: { visionVideoDetail: { status: 1040, type: null, … } } }`
 *   —— 载荷节点本身是对象、只是字段为 null，`data` 的键不为 null，这条判据够不着。
 * - **撞风控**：`data` 里除了为 null 的载荷还有 `captcha` 键，同样不是「每个键都 null」，
 *   由 {@link kuaishouGraphqlCaptchaVerdict} 接住。
 *
 * 所以它现在是一道**退化响应的兜底**（成功信封 + data 里啥也没有），不再声称知道原因
 * —— 报 `LOGIN_REQUIRED` 会让调用方去补 cookie，而那治不好任何一种已知成因。
 *
 * 只在 `data` 的**每一个**键都为 null 时判失败 —— 部分字段为 null 是正常的
 * （例如作品没有 tags），把那种也判失败会误杀。
 * @param raw - decode 之后的响应体（已确认是对象）
 * @returns 失败结论；不是全 null 时 `undefined`
 */
const kuaishouGraphqlNullVerdict = (raw: unknown): JudgeVerdict | undefined => {
  const data = (raw as { data?: unknown }).data
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return undefined

  const values = Object.values(data as Record<string, unknown>)
  if (values.length === 0 || !values.every((value) => value === null)) return undefined

  return { ok: false, kind: 'unknown', code: 'PLATFORM_ERROR', retryable: false }
}

/**
 * 快手 `result` 状态位的语义表。
 *
 * 三套命名空间（PC GraphQL / `live_api` / H5 `rest/wd`）共用这个状态位，值的语义
 * 也共通。实测语义：
 *
 * - `50` 签名验证失败。典型成因是签名没把请求体算进去（`photo/info` 严格校验，
 *   `simple/info` 校验松所以能漏过）。重试无用。
 * - `2` 平台拒绝。**四种**已知成因，信封上长得一模一样：
 *   1. **IP 级冷却** —— 实测连续查十几个作品后评论接口全线 `result=2`，换随机 did
 *      和重试都救不回来，要等几分钟。
 *   2. **请求根本没带设备号** —— 2026-09-26 实测：`credentials: 'omit'` 打 PC
 *      GraphQL，`visionVideoDetail` / `commentListQuery` 都回
 *      `{ result: 2, error_msg: null }`，连 GraphQL 信封都不给。
 *   3. **这条接口就是不给零凭据看** —— 2026-10-08 实测：同一窗口、同一个 did 下，
 *      `baseuser/userinfo/byid` 与 `playback/list` 回 `result=1`，而
 *      `profile/public` 稳定回 `result=2`（前后各打一次 `userinfo/byid` 当对照，
 *      都是 1，排除了「窗口中途变坏」）。这一种更像「要登录态」。
 *   4. **滑块已过、风控已解除** —— 2026-10-10 实测：人拖一次滑块后，**三条**签名路径
 *      （`user/profile`、`photo/info`、`feed/profile`）的 `2001` 一起变成 `2`，
 *      `captchaConfig` 不再下发；当天相隔约 9 小时的两轮复打都还是 `2`，没回弹到 `2001`。
 *      晚上那轮是**交错**打的（过滑块的 did 与一个同时刻生成的全新 did 轮流打，同一出口
 *      IP、每条路径各一发，消除时间漂移）：全新 did 上这三条照旧 `2001`。
 *
 *      **举证只到三条**：第四条 `live/byUser` 在全新 did 下**本来就是 `2`**、从没进过
 *      `2001`（上午、晚上两轮都如此），它那个 `2` 另有成因，不能当解风控的证据。
 *
 *      所以**在风控语境里 `2001 → 2` 是解除的标志，不是票据被拒**
 *      （详见 `endpoints/videoWorkFull.ts`），解除之后挡路的是前三种里的某一种。
 *
 *   四种的作用粒度不同（按 IP / 按本次请求 / 按接口 / 按 did），所以**看到 `2` 不要
 *   先归因到某一层**，按接口分开看、并记住它可能只是「风控刚解完」。
 *
 *   归 `rate_limit` 是**偏窄的**：第 3 种其实更像「要登录态」，第 4 种压根不是限流。
 *   保留这个分类是因为四种在信封上不可区分，分不出来就不该假装分得出；而四种的处置
 *   都一样（不要在一次调用里重试），所以分类偏窄不影响行为。**显式关掉重试**：transport
 *   的退避是 1s/2s/4s，冷却那支按分钟算、没设备号那支重试一万次也一样、第 3、4 种重试
 *   到死也是 2，在一次调用里重试纯属浪费；该退避（或该补 did、该补凭据）的是调用方。
 * - `11` 字段全 null。可重试，弹幕接口约 13% 概率命中（短退避就能过，归 `unavailable`）。
 * - `21` 缺 `position` 参数 —— 入参问题，重试不会变对。
 * - `2001`（H5）/ `400002`（PC）风控滑块。**只中转不绕过**：判成 `risk` /
 *   `CAPTCHA_REQUIRED` 交给调用方，滑块地址由 `captcha.ts` 取进 `error.challenge`
 *   （不受 `debug` 管）。amagi 不引入任何识别或轨迹模拟代码。
 *   处置方式（实测有效）：把 `error.challenge.url` 交给真人在干净浏览器里拖过，
 *   然后**用同一个 `did` 原样重发** —— 票据不必回填，整个 `did` 的风控已经解了。
 *   「有效」只指 `2001` 消失、落到 `2`：2026-10-10 两轮实测里，过滑块的那个 did
 *   从未回过 `result=1`，取不到数据的那道闸是上面前三种。
 */
const KUAISHOU_RESULT_VERDICTS: Record<number, JudgeVerdict> = {
  2: { ok: false, kind: 'rate_limit', code: 'RATE_LIMITED', retryable: false },
  11: { ok: false, kind: 'unavailable', code: 'PLATFORM_UNAVAILABLE', retryable: true },
  21: { ok: false, kind: 'validation', code: 'PARAM_MISSING', retryable: false },
  50: { ok: false, kind: 'internal', code: 'INTERNAL_ERROR', retryable: false },
  [KUAISHOU_H5_CAPTCHA_RESULT]: CAPTCHA_VERDICT,
  [KUAISHOU_PC_CAPTCHA_RESULT]: CAPTCHA_VERDICT
}

/**
 * 快手自己的状态位判定：`result === 1` 才是成功。
 *
 * `result !== 1` 即失败：`platforms/kuaishou/assemble/index.ts` 也按同一约定回退
 * （两处 `result !== 1`）。
 *
 * 表里有语义的码按 {@link KUAISHOU_RESULT_VERDICTS} 判；表外的给 `unknown` /
 * `PLATFORM_ERROR`，不猜原因。业务码与 `error_msg` 由 runtime 的
 * `extractPlatformCode` / `extractPlatformMessage` 带进 `error.platform`。
 * @param raw - decode 之后的响应体（已确认是对象）
 * @returns 失败结论；`result` 缺失或为 1 时 `undefined`
 */
const kuaishouResultVerdict = (raw: unknown): JudgeVerdict | undefined => {
  const body = raw as Record<string, unknown>

  // graphql 的标准部分失败形状：errors 非空
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return { ok: false, kind: 'unknown', code: 'PLATFORM_ERROR', retryable: false }
  }

  const result = body.result
  // 只认数字与数字字符串：B站番剧那类响应里 `result` 是**负载对象**，不是状态位
  if (typeof result !== 'number' && typeof result !== 'string') return undefined
  const numeric = Number(result)
  if (numeric === 1) return undefined

  // 表里有语义的先按表判，剩下的才落到「不说明原因」这条兜底
  return KUAISHOU_RESULT_VERDICTS[numeric] ?? { ok: false, kind: 'unknown', code: 'PLATFORM_ERROR', retryable: false }
}
