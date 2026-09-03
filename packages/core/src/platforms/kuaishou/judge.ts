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
 * 判定顺序：**非 JSON 响应体 → 枚举里的业务码 → 快手的 `result` 状态位 → HTTP 状态**。
 * 后两道都是补的：这条路径原先连「对象里没有 `code` 字段」都判成功，于是 403 的
 * 拦截页与 `{ result: 2 }` 的失败信封全都无人认领。
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
  // 但仍要过 result 与 HTTP 状态两道
  return kuaishouResultVerdict(raw) ?? verdictFromHttpStatus(http.status) ?? { ok: true }
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
  if (Number(result) === 1) return undefined

  return { ok: false, kind: 'unknown', code: 'PLATFORM_ERROR', retryable: false }
}
