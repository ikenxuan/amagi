import type { Judge, JudgeVerdict } from '../../contracts/error'
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
 * 判定顺序：**非 JSON 响应体 → 枚举里的业务码 → GraphQL 空壳 → 快手的 `result`
 * 状态位 → HTTP 状态**。后三道都是补的：这条路径原先连「对象里没有 `code` 字段」
 * 都判成功，于是 403 的拦截页、`{ result: 2 }` 的失败信封、以及未登录时 GraphQL
 * 回的全 null 空壳全都无人认领。
 */
export const kuaishouJudge: Judge = (raw, http) => {
  // 非 JSON 响应体（WAF / 反爬页）
  const nonJson = verdictFromNonJsonBody(raw)
  if (nonJson) return nonJson

  if (typeof raw !== 'object' || raw === null) {
    return verdictFromHttpStatus(http.status) ?? { ok: true }
  }

  // 枚举里声明过的错误码优先（它比 result 更具体）
  const code = (raw as { code: unknown }).code
  if (code === 'INVALID_COOKIE') return { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED', retryable: false }
  if (code === 'UNKNOWN_ERROR') return { ok: false, kind: 'unknown', code: 'UNKNOWN_ERROR', retryable: false }

  // `code: 0` 与所有未在枚举中声明的值都不由 code 判失败 —— 显式写出，不靠短路；
  // 但仍要过 GraphQL 空壳、result 与 HTTP 状态三道
  return kuaishouGraphqlNullVerdict(raw) ?? kuaishouResultVerdict(raw) ?? verdictFromHttpStatus(http.status) ?? { ok: true }
}

/**
 * GraphQL 空壳判定：`data.<operationName>` 全为 null 即未登录。
 *
 * 未登录访问 PC GraphQL 的 `visionVideoDetail` / `commentListQuery` 时，快手回的是
 * `{ "data": { "visionVideoDetail": null } }` —— HTTP 200、没有 `errors`、没有
 * `result`、没有 `code`。前面几道判据一路落空，`verdictFromHttpStatus(200)` 也返回
 * `undefined`，最后成了「成功信封 + data 里啥也没有」。
 *
 * 这是 `{ result: 2 }` 那个 bug 的同族：判据只覆盖了三种响应形状，空壳不在其中。
 *
 * 只在 `data` 的**每一个**键都为 null 时判失败 —— 部分字段为 null 是正常的
 * （例如作品没有 tags），把那种也判失败会误杀。
 * @param raw - decode 之后的响应体（已确认是对象）
 * @returns 失败结论；不是空壳时 `undefined`
 */
const kuaishouGraphqlNullVerdict = (raw: unknown): JudgeVerdict | undefined => {
  const data = (raw as { data?: unknown }).data
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return undefined

  const values = Object.values(data as Record<string, unknown>)
  if (values.length === 0 || !values.every((value) => value === null)) return undefined

  return { ok: false, kind: 'auth', code: 'LOGIN_REQUIRED', retryable: false }
}

/**
 * 快手 `result` 状态位的语义表。
 *
 * 三套命名空间（PC GraphQL / `live_api` / H5 `rest/wd`）共用这个状态位，值的语义
 * 也共通。实测来源是 @OduckO 的 kuaishou-parser（GPL-3.0-only）`TODO.md`：
 *
 * - `50` 签名验证失败。**这是 amagi 自己的 bug**，不是平台的 —— 典型成因是签名没把
 *   请求体算进去（`photo/info` 严格校验，`simple/info` 校验松所以能漏过）。重试无用。
 * - `2` 平台拒绝 / IP 级冷却。实测连续查十几个作品后评论接口全线 `result=2`，
 *   换随机 did 和重试都救不回来，要等几分钟（`TODO.md:184-187`）。所以归 `rate_limit`
 *   但**显式关掉重试**：transport 的退避是 1s/2s/4s，而这个冷却按分钟算，
 *   在一次调用里重试纯属浪费；该退避的是调用方。
 * - `11` 字段全 null。可重试，弹幕接口约 13% 概率命中（短退避就能过，归 `unavailable`）。
 * - `21` 缺 `position` 参数 —— 入参问题，重试不会变对。
 * - `2001`（H5）/ `400002`（PC）风控滑块。**只中转不绕过**：判成 `risk` /
 *   `CAPTCHA_REQUIRED` 交给调用方，滑块地址在响应体里（开 `debug` 时随 `error.raw`
 *   带出）。amagi 不引入任何识别或轨迹模拟代码。
 */
const KUAISHOU_RESULT_VERDICTS: Record<number, JudgeVerdict> = {
  2: { ok: false, kind: 'rate_limit', code: 'RATE_LIMITED', retryable: false },
  11: { ok: false, kind: 'unavailable', code: 'PLATFORM_UNAVAILABLE', retryable: true },
  21: { ok: false, kind: 'validation', code: 'PARAM_MISSING', retryable: false },
  50: { ok: false, kind: 'internal', code: 'INTERNAL_ERROR', retryable: false },
  2001: { ok: false, kind: 'risk', code: 'CAPTCHA_REQUIRED', retryable: false },
  400002: { ok: false, kind: 'risk', code: 'CAPTCHA_REQUIRED', retryable: false }
}

/**
 * 快手自己的状态位判定：`result === 1` 才是成功。
 *
 * `live_api` 与 graphql 被拒时都回这个信封：
 * `{ result: 2, error_msg: null, request_id: '...' }`，HTTP 200。它既没有 `code`
 * 也没有 `status_code`，于是判定层一路放过 —— 实测 `/kuaishou/fetch_one_work`
 * 取数失败却拿到 `success: true`，`data` 就是那三个字段。
 *
 * `result !== 1` 是失败这条约定 `platforms/kuaishou/assemble/index.ts` 早就在用
 * （两处 `result !== 1` 就回退），只有 judge 不知道。
 *
 * 分类给 `unknown` / `PLATFORM_ERROR`：`result: 2` 本身不说明原因（`error_msg`
 * 经常是 null），猜成 auth 或 risk 都是编。业务码 `2` 与 `error_msg` 由 runtime
 * 的 `extractPlatformCode` / `extractPlatformMessage` 带进 `error.platform`。
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
