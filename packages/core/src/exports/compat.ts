/**
 * `@ikenxuan/amagi/compat` —— v6 兼容入口
 *
 * 一行切换，把 v7 信封回填成 v6 形状，并恢复「参数校验失败抛出」的行为：
 *
 * ```ts
 * // v6 写法完全不用改
 * import amagi from '@ikenxuan/amagi/compat'
 *
 * const client = amagi({ cookies: { douyin: ck } })
 * try {
 *   const r = await client.douyin.fetcher.fetchVideoWork({ aweme_id: '' })
 *   if (r.success) use(r.data)
 *   else console.error(r.code, r.message, r.error.amagiError.errorDescription)
 * } catch (e) {
 *   // 校验失败仍走这里（v7 主路径是 failure 信封，不抛）
 * }
 * ```
 *
 * 实现方式是一层薄包装，不复制业务逻辑：
 * - `toLegacy` 是纯函数，把 {@link AmagiResult} 回填成 v6 信封
 * - client / 静态 fetcher / bound 工厂的方法在 get 时包一层（与 v7
 *   `createBoundFetcher` 同一手法），结果过 `toLegacy`；
 *   `kind === 'validation'` 的失败信封转成抛 `ValidationError`
 * - v6 保留下来的方法（passport 等）本就返回 v6 信封，按「顶层带 `code`」
 *   直接透传，不会二次转换
 *
 * 生命周期：**v7 全程保留，v8 移除**。模块导入时发一次 `log:warn` 提示迁移。
 *
 * @module
 */

// 全量公开面原样透出；client / fetcher / 工厂由下方同名显式导出覆盖为
// compat 版（ESM 规则：显式导出遮蔽 star 导出），其余名字两代形状一致。
export * from '../index'

import {
  amagi,
  bilibiliFetcher,
  createAmagiClient,
  createBoundBilibiliFetcher,
  createBoundDouyinFetcher,
  createBoundKuaishouFetcher,
  createBoundXiaohongshuFetcher,
  douyinFetcher,
  kuaishouFetcher,
  xiaohongshuFetcher,
  type Options
} from '../index'
import type { AmagiError, ErrorKind } from '../contracts/error'
import type { AmagiResult } from '../contracts/result'
import { emitLogWarn } from '../model/events'
import { ValidationError } from '../utils/errors'

/** 模块级只执行一次的迁移提示（不刷屏） */
emitLogWarn(
  '[@ikenxuan/amagi/compat] 你正在使用 v6 兼容入口；v7 迁移说明见 https://github.com/ikenxuan/amagi （v8 将移除 compat）'
)

/* ------------------------------------------------------------------ */
/* v6 信封形状                                                         */
/* ------------------------------------------------------------------ */

/** v6 失败信封里 `error.amagiError` 的形状 */
export interface LegacyAmagiError {
  /** v6 的错误说明（≈ v7 的 `error.message`） */
  errorDescription: string
  /** v6 的请求类型（端点短名，如 `videoWork`） */
  requestType: string
  /** v6 的请求地址（v7 无等价稳定字段，恒 undefined） */
  requestUrl?: string
}

/** v6 失败信封里 `error` 的形状 */
export interface LegacyErrorBody {
  /** 平台业务码优先，取不到退回 amagi 错误码 */
  code: string | number
  /** 原始响应体；默认 null（与 v6 `createErrorResponse` 一致） */
  data: unknown
  /** v6 的 amagiError 嵌套 */
  amagiError: LegacyAmagiError
  /** 冗余的文案层，v6 各家取法不一 */
  amagiMessage: string
}

/** v6 成功信封。`error` 键运行时在（undefined）、类型为 never，与 v6 原状一致 */
export interface LegacySuccess<T> {
  /** 判别键 */
  success: true
  /** v6 顶层固定 200 */
  code: 200
  /** 面向人的说明 */
  message: string
  /** 端点返回数据 */
  data: T
  /** v6 类型层面的死键 */
  error: never
}

/** v6 失败信封。`data` 键运行时在（undefined）、类型为 never */
export interface LegacyFailure {
  /** 判别键 */
  success: false
  /** v6 数字码（ErrorKind 近似映射，见 {@link KIND_LEGACY_CODE}） */
  code: number
  /** 面向人的说明，等价于 `error.amagiError.errorDescription` */
  message: string
  /** v6 类型层面的死键 */
  data: never
  /** v6 错误载体 */
  error: LegacyErrorBody
}

/** v6 信封（与 `validation/index.ts` 的 `Result` 同形，顶层 `code` 恒在） */
export type LegacyResult<T> = LegacySuccess<T> | LegacyFailure

/* ------------------------------------------------------------------ */
/* ErrorKind → v6 数字 code                                            */
/* ------------------------------------------------------------------ */

/**
 * `ErrorKind` → v6 信封顶层 `code`。
 *
 * v6 的 code 语义本就混乱（KNOWN-DEFECT #1/#8/#15：ApiError code 直接当
 * HTTP 状态、平台码与 amagi 错误码混用）。compat 是近似而非逐字还原：
 * 取 kind → HTTP 语义码的稳定映射，平台原文码保留在 `error.code`。
 */
export const KIND_LEGACY_CODE: Record<ErrorKind, number> = {
  validation: 400,
  auth: 401,
  forbidden: 403,
  not_found: 404,
  rate_limit: 429,
  risk: 403,
  unavailable: 503,
  network: 500,
  timeout: 504,
  parse: 502,
  internal: 500,
  unknown: 500
}

/* ------------------------------------------------------------------ */
/* toLegacy：AmagiResult → LegacyResult 的纯转换                        */
/* ------------------------------------------------------------------ */

/**
 * 把 v7 信封回填成 v6 信封（纯函数，不抛错）。
 *
 * - 成功：`code: 200`，`error` 键运行时补 `undefined`
 * - 失败：顶层 `code` 取 {@link KIND_LEGACY_CODE}；平台码进 `error.code`；
 *   原始响应体进 `error.data`（没有则 null）
 */
export const toLegacy = <T>(r: AmagiResult<T>): LegacyResult<T> => {
  if (r.success) {
    return { success: true, code: 200, message: r.message, data: r.data, error: undefined as never }
  }
  const e = r.error
  const requestType = r.meta.endpoint.includes('.') ? r.meta.endpoint.split('.').slice(1).join('.') : r.meta.endpoint
  return {
    success: false,
    code: KIND_LEGACY_CODE[e.kind],
    message: r.message,
    data: undefined as never,
    error: {
      code: e.platform?.code ?? e.code,
      data: e.raw ?? null,
      amagiError: { errorDescription: e.message, requestType, requestUrl: undefined },
      amagiMessage: e.message
    }
  }
}

/** 是不是 v6 信封（顶层带 `code`）。passport 等保留方法返回 v6 信封，直接透传 */
const isLegacyEnvelope = (r: unknown): r is LegacyResult<unknown> =>
  typeof r === 'object' && r !== null && 'success' in r && 'code' in r

/** `kind: 'validation'` 的失败信封 → v6 的抛出行为（抛 ValidationError） */
const validationErrorOf = (e: AmagiError): ValidationError => {
  const errors =
    e.issues && e.issues.length > 0
      ? e.issues.map((i) => ({ field: i.path, message: i.message }))
      : [{ field: '(endpoint)', message: e.message }]
  return new ValidationError('参数验证失败', errors)
}

/** 一次调用的结果收口：v6 信封透传；v7 信封转 toLegacy；校验失败恢复抛出 */
const settle = async (promise: Promise<unknown>): Promise<unknown> => {
  const out = await promise
  if (isLegacyEnvelope(out)) return out
  const result = out as AmagiResult<unknown>
  if (!result.success && result.error.kind === 'validation') {
    throw validationErrorOf(result.error)
  }
  return toLegacy(result)
}

/* ------------------------------------------------------------------ */
/* 包装器                                                              */
/* ------------------------------------------------------------------ */

const WRAP_CACHE = new WeakMap<object, Map<PropertyKey, (...args: unknown[]) => Promise<unknown>>>()

/** 方法类型映射：`AmagiResult<T>` → `LegacyResult<T>`；非 v7 信封方法原样保留 */
export type CompatMethod<M> = M extends (...args: infer A) => Promise<AmagiResult<infer T>>
  ? (...args: A) => Promise<LegacyResult<T>>
  : M

/** fetcher 对象的 compat 版类型 */
export type CompatFetcher<F> = { [K in keyof F]: CompatMethod<F[K]> }

/**
 * 把一个 fetcher 对象包装成「结果转 v6 信封」的版本。
 *
 * 包装发生在 get 时，方法集合自动跟随原对象；每个方法只包一次并缓存
 * （WeakMap 按目标对象 + 键）。非函数属性（若存在）原样透传。
 */
export const wrapFetcher = <F extends object>(fetcher: F): CompatFetcher<F> => {
  const proxy = new Proxy(fetcher, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function' || prop === 'then') return value
      let cache = WRAP_CACHE.get(target)
      if (!cache) {
        cache = new Map()
        WRAP_CACHE.set(target, cache)
      }
      let wrapped = cache.get(prop)
      if (!wrapped) {
        const fn = value as (...args: unknown[]) => unknown
        wrapped = (...args: unknown[]) => settle(Promise.resolve(fn.apply(target, args)))
        cache.set(prop, wrapped)
      }
      return wrapped
    }
  })
  return proxy as CompatFetcher<F>
}

/* ------------------------------------------------------------------ */
/* 兼容版入口面                                                        */
/* ------------------------------------------------------------------ */

/** 兼容版 client 工厂：`createAmagiClient` 的每个平台 fetcher 包一层 */
const compatCreateAmagiClient = (options?: Options) => {
  const client = createAmagiClient(options)
  return {
    ...client,
    douyin: { ...client.douyin, fetcher: wrapFetcher(client.douyin.fetcher) },
    bilibili: { ...client.bilibili, fetcher: wrapFetcher(client.bilibili.fetcher) },
    kuaishou: { ...client.kuaishou, fetcher: wrapFetcher(client.kuaishou.fetcher) },
    xiaohongshu: { ...client.xiaohongshu, fetcher: wrapFetcher(client.xiaohongshu.fetcher) }
  }
}

/** 兼容版静态 fetcher */
export const compatDouyinFetcher = wrapFetcher(douyinFetcher)
export const compatBilibiliFetcher = wrapFetcher(bilibiliFetcher)
export const compatKuaishouFetcher = wrapFetcher(kuaishouFetcher)
export const compatXiaohongshuFetcher = wrapFetcher(xiaohongshuFetcher)

/** 兼容版 bound 工厂（返回的 fetcher 已包层） */
export const compatCreateBoundDouyinFetcher = (
  cookie: string,
  requestConfig?: Options['request']
): CompatFetcher<ReturnType<typeof createBoundDouyinFetcher>> =>
  wrapFetcher(createBoundDouyinFetcher(cookie, requestConfig))
export const compatCreateBoundBilibiliFetcher = (
  cookie: string,
  requestConfig?: Options['request']
): CompatFetcher<ReturnType<typeof createBoundBilibiliFetcher>> =>
  wrapFetcher(createBoundBilibiliFetcher(cookie, requestConfig))
export const compatCreateBoundKuaishouFetcher = (
  cookie: string,
  requestConfig?: Options['request']
): CompatFetcher<ReturnType<typeof createBoundKuaishouFetcher>> =>
  wrapFetcher(createBoundKuaishouFetcher(cookie, requestConfig))
export const compatCreateBoundXiaohongshuFetcher = (
  cookie: string,
  requestConfig?: Options['request']
): CompatFetcher<ReturnType<typeof createBoundXiaohongshuFetcher>> =>
  wrapFetcher(createBoundXiaohongshuFetcher(cookie, requestConfig))

/* ------------------------------------------------------------------ */
/* 默认导出：与主入口同形的 callable（支持 new）+ 静态面                  */
/* ------------------------------------------------------------------ */

function CreateAmagiCompatApp(this: unknown, options: Options = {}): ReturnType<typeof compatCreateAmagiClient> {
  return compatCreateAmagiClient(options)
}

Object.defineProperty(CreateAmagiCompatApp, 'version', {
  value: amagi.version,
  writable: false,
  enumerable: true,
  configurable: false
})
CreateAmagiCompatApp.douyin = amagi.douyin
CreateAmagiCompatApp.bilibili = amagi.bilibili
CreateAmagiCompatApp.kuaishou = amagi.kuaishou
CreateAmagiCompatApp.xiaohongshu = amagi.xiaohongshu
CreateAmagiCompatApp.events = amagi.events
CreateAmagiCompatApp.on = amagi.on
CreateAmagiCompatApp.once = amagi.once
CreateAmagiCompatApp.douyinFetcher = compatDouyinFetcher
CreateAmagiCompatApp.bilibiliFetcher = compatBilibiliFetcher
CreateAmagiCompatApp.kuaishouFetcher = compatKuaishouFetcher
CreateAmagiCompatApp.xiaohongshuFetcher = compatXiaohongshuFetcher
CreateAmagiCompatApp.createBoundDouyinFetcher = compatCreateBoundDouyinFetcher
CreateAmagiCompatApp.createBoundBilibiliFetcher = compatCreateBoundBilibiliFetcher
CreateAmagiCompatApp.createBoundKuaishouFetcher = compatCreateBoundKuaishouFetcher
CreateAmagiCompatApp.createBoundXiaohongshuFetcher = compatCreateBoundXiaohongshuFetcher

export { CreateAmagiCompatApp }

// 同名显式导出覆盖 `export *` 透出的原始版本（ESM：显式导出遮蔽 star 导出）
export { compatCreateAmagiClient as createAmagiClient }
export { compatDouyinFetcher as douyinFetcher }
export { compatBilibiliFetcher as bilibiliFetcher }
export { compatKuaishouFetcher as kuaishouFetcher }
export { compatXiaohongshuFetcher as xiaohongshuFetcher }
export { compatCreateBoundDouyinFetcher as createBoundDouyinFetcher }
export { compatCreateBoundBilibiliFetcher as createBoundBilibiliFetcher }
export { compatCreateBoundKuaishouFetcher as createBoundKuaishouFetcher }
export { compatCreateBoundXiaohongshuFetcher as createBoundXiaohongshuFetcher }

export default CreateAmagiCompatApp
