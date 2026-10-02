/**
 * B站 Fetcher 模块入口，方法由 `bilibiliRegistry` 派生。
 *
 * `bilibiliFetcher`（静态）与 `createBoundBilibiliFetcher` 都由
 * `bilibiliRegistry` 派生，方法与 client 上的 fetcher 走同一条执行管线。
 * 27 个端点，含 convertAvToBv / convertBvToAv / requestLoginQrcode 等
 * 不规则映射（见 client/method-names.ts）。
 *
 * 7 个登录方法（fetchLoginStatus / requestLoginQrcode 等）已标 @deprecated
 * 指向新会话 API（client.bilibili.login）；它们仍以端点形式存在于 registry
 * 上，方法名不变。
 * @module fetchers/bilibili
 */

import { createFetcherFromRegistry, type FetcherOf, type SuccessFetcherOf } from '../../../client/fetcher'
import { makeClientCtx } from '../../../client/runtime'
import { createStaticFetcher, type StaticFetcherOf } from '../../../client/static'
import type { RequestConfig } from '../../../contracts/request'
import { bilibiliRegistry } from '../../../platforms/bilibili/endpoints'

/**
 * B站 Fetcher 类型（静态形态：三参签名）。
 *
 * 写成 **`interface … extends`** 而不是 `type … =`：后者是泛型类型别名，
 * 打印器（IDE 悬停 / twoslash / `.d.ts`）会把 `typeof bilibiliRegistry` 那 27 个
 * `EndpointDef` 连 zod schema 一起整个内联展开（实测单个 fetcher 就上万字符）。
 * 接口是**名义类型**：容器处只打印这个名字，`BilibiliFetcher['fetchVideoInfo']`
 * 这样钻进去时方法签名依旧完整 —— 类型不变，只是显示收敛。
 */
export interface BilibiliFetcher extends StaticFetcherOf<'bilibili', typeof bilibiliRegistry> {}

/**
 * B站数据获取器（静态）。
 * 包含所有 B站 API 方法，调用时需要传递 cookie
 * @example
 * ```typescript
 * import { bilibiliFetcher } from '@ikenxuan/amagi'
 *
 * const cookie = 'SESSDATA=xxx; bili_jct=yyy'
 * const result = await bilibiliFetcher.fetchVideoInfo({ bvid: 'BV1xx411c7mD' }, cookie)
 * ```
 */
export const bilibiliFetcher: BilibiliFetcher = createStaticFetcher('bilibili', bilibiliRegistry)

/**
 * 创建绑定了 Cookie 和请求配置的B站 Fetcher
 * @param cookie - B站 Cookie
 * @param requestConfig - 请求配置 (可选)
 * @returns 绑定了 Cookie 的 Fetcher 对象，调用时无需传递 cookie
 * @example
 * ```typescript
 * import { createBoundBilibiliFetcher } from '@ikenxuan/amagi'
 *
 * const fetcher = createBoundBilibiliFetcher('your_cookie')
 * const result = await fetcher.fetchVideoInfo({ bvid: 'BV1xx411c7mD' })
 * ```
 */
/**
 * 绑定 Cookie 的B站 Fetcher 类型（两参签名：cookie 已绑，只剩 options / requestConfig）。
 *
 * 名义接口，理由同 {@link BilibiliFetcher}：`FetcherOf<…>` 是泛型别名，直接用会把整个
 * registry 内联展开。改成 `interface … extends` 后 `client.bilibili.fetcher` /
 * `createBoundBilibiliFetcher(...)` 的悬停只显示这个名字，方法签名钻进去仍完整。
 */
export interface BoundBilibiliFetcher extends FetcherOf<'bilibili', typeof bilibiliRegistry> {}

export const createBoundBilibiliFetcher = (cookie: string, requestConfig?: RequestConfig): BoundBilibiliFetcher =>
  createFetcherFromRegistry('bilibili', bilibiliRegistry, makeClientCtx('bilibili', cookie, requestConfig, 'bound-bilibili'))

/**
 * 只保留成功分支的B站 fetcher 类型。
 *
 * 给「用一层 Proxy 把失败信封转成异常」的下游封装用：包装后的 fetcher 声明成
 * 这个类型，`.data` 就是 `T` 而不是 `T | undefined`。名义接口，理由同 {@link BilibiliFetcher}。
 */
export interface SuccessBilibiliFetcher extends SuccessFetcherOf<'bilibili', typeof bilibiliRegistry> {}
