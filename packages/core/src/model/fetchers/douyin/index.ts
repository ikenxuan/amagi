/**
 * 抖音 Fetcher 模块入口（阶段 6 起从 v7 registry 派生）。
 *
 * v6 这里是「19 个手写方法函数（video.ts 等，内部走 internal → getdata）+
 * 对象字面量组装」。阶段 6 删掉整层 v6 机械，改由两处派生：
 * - `douyinFetcher`（静态）：`createStaticFetcher`，方法签名保持 v6 三参
 *   `(options, cookie?, requestConfig?)`，返回 v7 信封；
 *   另并入 4 个 passport 方法（`checkPassportQrcode` 等，v6 实现保留、
 *   @deprecated —— 它们不是端点，是会话协议的原始封装，阶段 5 起
 *   新写法走 `client.douyin.login`）
 * - `createBoundDouyinFetcher`：Proxy 绑定形态（= `createFetcherFromRegistry`），
 *   v6 的 `bound.ts` 逐条转发被它取代
 * @module fetchers/douyin
 */

import type { RequestConfig } from '../../../contracts/request'
import { createFetcherFromRegistry, type FetcherOf, type SuccessFetcherOf } from '../../../client/fetcher'
import { makeClientCtx } from '../../../client/runtime'
import { createStaticFetcher, type StaticFetcherOf } from '../../../client/static'
import { douyinRegistry } from '../../../platforms/douyin/endpoints'
import { checkPassportQrcode, requestPassportQrcode, sendPassportVerifyCode, validatePassportVerifyCode } from './auth'

// 导出保留的 v6 passport 方法与类型（4 个顶层导出名字的来源）
export * from './auth'

/**
 * 抖音数据获取器（静态）。
 * 包含所有抖音 API 方法，调用时需要传递 cookie
 * @example
 * ```typescript
 * import { douyinFetcher } from '@ikenxuan/amagi'
 *
 * const result = await douyinFetcher.fetchVideoWork({ aweme_id: '7123456789' }, cookie)
 * ```
 */
export const douyinFetcher = {
  // 4 个 passport 方法保持 v6 实现（@deprecated，指向 client.douyin.login）
  checkPassportQrcode,
  requestPassportQrcode,
  sendPassportVerifyCode,
  validatePassportVerifyCode,
  // 其余方法由 registry 派生
  ...createStaticFetcher('douyin', douyinRegistry)
}

/** 抖音 Fetcher 类型（静态形态：三参签名 + 4 个 passport 方法） */
export type DouyinFetcher = typeof douyinFetcher

/**
 * 创建绑定了 Cookie 和请求配置的抖音 Fetcher
 * @param cookie - 抖音 Cookie
 * @param requestConfig - 请求配置 (可选)
 * @returns 绑定了 Cookie 的 Fetcher 对象，调用时无需传递 cookie
 * @example
 * ```typescript
 * const fetcher = createBoundDouyinFetcher('your_cookie')
 * const result = await fetcher.fetchVideoWork({ aweme_id: '7123456789' })
 * ```
 */
export const createBoundDouyinFetcher = (
  cookie: string,
  requestConfig?: RequestConfig
): FetcherOf<'douyin', typeof douyinRegistry> =>
  createFetcherFromRegistry('douyin', douyinRegistry, makeClientCtx('douyin', cookie, requestConfig, 'bound-douyin'))

/** 绑定 Cookie 的抖音 Fetcher 类型 */
export type BoundDouyinFetcher = ReturnType<typeof createBoundDouyinFetcher>

/** 抖音静态 fetcher 的类型（供类型层引用，形状 = StaticFetcherOf） */
export type DouyinStaticFetcher = StaticFetcherOf<'douyin', typeof douyinRegistry>

/**
 * 只保留成功分支的抖音 fetcher 类型。
 *
 * 给「用一层 Proxy 把失败信封转成异常」的下游封装用：包装后的 fetcher 声明成
 * 这个类型，`.data` 就是 `T` 而不是 `T | undefined`。为什么下游自己写不出来，
 * 见 `SuccessFetcherMethod` 的注释。
 */
export type SuccessDouyinFetcher = SuccessFetcherOf<'douyin', typeof douyinRegistry>
