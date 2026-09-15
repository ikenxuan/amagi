import type { Judge, JudgeVerdict } from '../../contracts/error'
import { verdictFromHttpStatus, verdictFromNonJsonBody } from '../../contracts/error'

/**
 * 快手平台默认响应判定。
 *
 * 判定**显式比较枚举值**：只把枚举里声明过的错误码判失败，其余（含 `code: 0`
 * 与未命中枚举的值）一律成功，成功/失败的边界由表决定 —— 不依赖 `&&` 短路
 * 求值的巧合：那样 `code: 0` 会因短路判成功，而命中枚举的未知值反而判失败。
 *
 * 判定顺序：**非 JSON 响应体 → 枚举里的业务码 → GraphQL 空壳 → 快手的 `result`
 * 状态位 → HTTP 状态**。后三道缺一不可，否则 403 的拦截页、`{ result: 2 }` 的
 * 失败信封、以及未登录时 GraphQL 回的全 null 空壳都会无人认领。
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
 * `result`、没有 `code`。没有这道判据，它就是「成功信封 + data 里啥也没有」。
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
 * - `50` 签名验证失败。典型成因是签名没把请求体算进去（`photo/info` 严格校验，
 *   `simple/info` 校验松所以能漏过）。重试无用。
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
 * `result !== 1` 即失败：`platforms/kuaishou/assemble/index.ts` 也按同一约定回退
 * （两处 `result !== 1`）。
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
