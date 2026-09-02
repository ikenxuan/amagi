import type { Judge } from '../../contracts/error'

/**
 * B站平台默认响应判定。
 *
 * 从 v6 `platform/bilibili/getdata.ts` 的 `GlobalGetData` 判定搬迁，三处改写：
 * - **`code: 0` 一律成功（修 A2）**：v6 的判定自相矛盾 —— 空负载（`data: null`
 *   或 `{}`）判失败，而 `internal.ts` 判成功（KNOWN-DEFECT 有测试锁死）。
 *   v7 只按 `code` 分类，空负载交给 `normalize`（数据形状是端点的事，
 *   不是 judge 的事）。
 * - **`platform.message` 由 runtime 统一提取（修 A3）**：v6 各平台自己捞文案，
 *   B站那条路径漏了，只剩兜底文案。v7 的 `execute` 从原始响应统一取
 *   `message` / `status_msg` / `msg`，judge 只负责分类。
 * - **`-412` 的重试改为声明 `retryOn`（修 A4 的叠乘）**：v6 在 `GlobalGetData`
 *   里递归调用自己重试 `-412`，重试次数与 transport 的重试相乘。v7 的 judge
 *   把 `-412` 分类为 `kind: 'risk'` / `code: 'RISK_CONTROL'`，端点声明
 *   `retryOn: ['RISK_CONTROL']`，execute 统一退避重试（trace 可见）。
 *
 * 其余错误码分类：`-101`（未登录）→ `auth`；`-404`（啥都木有）→
 * `not_found`；其余一律 `kind: 'unknown'`，业务码留给 runtime 提取（A3）。
 */
export const bilibiliJudge: Judge = (raw) => {
  // 空响应：v6 的「接口返回内容为空，你的B站ck可能已经失效」
  if (raw === '') {
    return { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED', retryable: false }
  }

  if (typeof raw !== 'object' || raw === null) {
    return { ok: true } // 非对象（如 null）交给 normalize
  }

  const body = raw as Record<string, unknown>
  const code = body.code

  // code 缺失或为 0 一律成功（修 A2：空负载交给 normalize）
  if (code === undefined || Number(code) === 0) {
    return { ok: true }
  }

  // 风控拦截：-412 由端点声明 retryOn 退避重试（修 A4）
  if (Number(code) === -412) {
    return { ok: false, kind: 'risk', code: 'RISK_CONTROL' }
  }

  // 未登录
  if (Number(code) === -101) {
    return { ok: false, kind: 'auth', code: 'COOKIE_EXPIRED' }
  }

  // 啥都木有
  if (Number(code) === -404) {
    return { ok: false, kind: 'not_found', code: 'NOT_FOUND' }
  }

  // 其余业务码：分类留给调用方，业务码与文案由 runtime 提取（A3）
  return { ok: false, kind: 'unknown', code: 'PLATFORM_ERROR' }
}
