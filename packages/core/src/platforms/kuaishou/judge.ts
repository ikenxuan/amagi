import { amagiAPIErrorCode, kuaishouAPIErrorCode } from '../../types/NetworksConfigType'
import type { Judge } from '../../contracts/error'

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
 */
export const kuaishouJudge: Judge = (raw) => {
  if (typeof raw !== 'object' || raw === null || !('code' in raw)) {
    return { ok: true }
  }

  const code = (raw as { code: unknown }).code

  switch (code) {
    case kuaishouAPIErrorCode.COOKIE:
      return { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED', retryable: false }
    case amagiAPIErrorCode.UNKNOWN:
      return { ok: false, kind: 'unknown', code: 'UNKNOWN_ERROR', retryable: false }
    default:
      // `code: 0` 与所有未在枚举中声明的值都判成功 —— 显式写出，不靠短路
      return { ok: true }
  }
}
