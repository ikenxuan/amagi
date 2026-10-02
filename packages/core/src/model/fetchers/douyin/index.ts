/**
 * 抖音 Fetcher 模块入口，方法由 `douyinRegistry` 派生。
 *
 * - `douyinFetcher`（静态）：`createStaticFetcher`，方法签名为三参
 *   `(options, cookie?, requestConfig?)`，返回 {@link AmagiResult} 信封；
 *   另并入 4 个 passport 方法（`checkPassportQrcode` 等，@deprecated
 *   —— 它们不是端点，是会话协议的原始封装，新写法走 `client.douyin.login`）
 * - `createBoundDouyinFetcher`：Proxy 绑定形态（= `createFetcherFromRegistry`）
 * @module fetchers/douyin
 */

import { createFetcherFromRegistry, type FetcherOf, type SuccessFetcherOf } from '../../../client/fetcher'
import { makeClientCtx } from '../../../client/runtime'
import { createStaticFetcher, type StaticFetcherOf } from '../../../client/static'
import type { RequestConfig } from '../../../contracts/request'
import { douyinRegistry } from '../../../platforms/douyin/endpoints'
import { checkPassportQrcode, requestPassportQrcode, sendPassportVerifyCode, validatePassportVerifyCode } from './auth'

// passport 方法与类型的顶层导出（4 个顶层导出名字的来源）
export * from './auth'

/**
 * 抖音静态 fetcher 的类型（不含 passport，纯 registry 派生形态）。
 *
 * 写成 **`interface … extends`** 而不是 `type … =`：后者是泛型类型别名，
 * 打印器（IDE 悬停 / twoslash / `.d.ts`）会把 `typeof douyinRegistry` 那 23 个
 * `EndpointDef` 连 zod schema 一起整个内联展开（实测单个 fetcher 就上十万字符）。
 * 接口是**名义类型**：容器处只打印这个名字，`DouyinStaticFetcher['fetchVideoWork']`
 * 这样钻进去时方法签名依旧完整 —— 类型不变，只是显示收敛。
 */
export interface DouyinStaticFetcher extends StaticFetcherOf<'douyin', typeof douyinRegistry> {}

/**
 * 抖音 Fetcher 类型（静态形态：三参签名 + 4 个 passport 方法）。
 *
 * 名义接口，理由同 {@link DouyinStaticFetcher}。在 registry 派生的方法之上补 4 个
 * passport 方法（它们不是端点，见下方 `douyinFetcher` 的构造）。
 */
export interface DouyinFetcher extends DouyinStaticFetcher {
  checkPassportQrcode: typeof checkPassportQrcode
  requestPassportQrcode: typeof requestPassportQrcode
  sendPassportVerifyCode: typeof sendPassportVerifyCode
  validatePassportVerifyCode: typeof validatePassportVerifyCode
}

/**
 * 抖音数据获取器（静态）。
 * 包含所有抖音 API 方法，调用时需要传递 cookie
 * @example
 * ```typescript
 * import { douyinFetcher } from '@ikenxuan/amagi'
 *
 * const cookie = 'ttwid=xxx'
 * const result = await douyinFetcher.fetchVideoWork({ aweme_id: '7123456789' }, cookie)
 * ```
 */
export const douyinFetcher: DouyinFetcher = {
  // 4 个 passport 方法（@deprecated，指向 client.douyin.login）
  checkPassportQrcode,
  requestPassportQrcode,
  sendPassportVerifyCode,
  validatePassportVerifyCode,
  // 其余方法由 registry 派生
  ...createStaticFetcher('douyin', douyinRegistry)
}

/**
 * 创建绑定了 Cookie 和请求配置的抖音 Fetcher
 * @param cookie - 抖音 Cookie
 * @param requestConfig - 请求配置 (可选)
 * @returns 绑定了 Cookie 的 Fetcher 对象，调用时无需传递 cookie
 * @example
 * ```typescript
 * import { createBoundDouyinFetcher } from '@ikenxuan/amagi'
 *
 * const fetcher = createBoundDouyinFetcher('your_cookie')
 * const result = await fetcher.fetchVideoWork({ aweme_id: '7123456789' })
 * ```
 */
export const createBoundDouyinFetcher = (cookie: string, requestConfig?: RequestConfig): BoundDouyinFetcher =>
  createFetcherFromRegistry('douyin', douyinRegistry, makeClientCtx('douyin', cookie, requestConfig, 'bound-douyin'))

/**
 * 绑定 Cookie 的抖音 Fetcher 类型（形状 = `FetcherOf`，两参签名）。
 *
 * 名义接口，理由同 {@link DouyinStaticFetcher}：写成 `type … = FetcherOf<…>` 会在
 * 悬停 / `.d.ts` 里把整个 registry 展开，`interface … extends` 则只打印这个名字。
 */
export interface BoundDouyinFetcher extends FetcherOf<'douyin', typeof douyinRegistry> {}

/**
 * 只保留成功分支的抖音 fetcher 类型。
 *
 * 给「用一层 Proxy 把失败信封转成异常」的下游封装用：包装后的 fetcher 声明成
 * 这个类型，`.data` 就是 `T` 而不是 `T | undefined`。名义接口，理由同上。
 */
export interface SuccessDouyinFetcher extends SuccessFetcherOf<'douyin', typeof douyinRegistry> {}
