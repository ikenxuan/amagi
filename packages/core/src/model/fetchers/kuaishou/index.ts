/**
 * 快手 Fetcher 模块入口，方法由 `kuaishouRegistry` 派生。
 *
 * `kuaishouFetcher`（静态）与 `createBoundKuaishouFetcher` 都由
 * `kuaishouRegistry` 派生，方法与 client 上的 fetcher 走同一条执行管线。
 * @module fetchers/kuaishou
 */

import { createFetcherFromRegistry, type FetcherOf, type SuccessFetcherOf } from '../../../client/fetcher'
import { makeClientCtx } from '../../../client/runtime'
import { createStaticFetcher, type StaticFetcherOf } from '../../../client/static'
import type { RequestConfig } from '../../../contracts/request'
import { kuaishouRegistry } from '../../../platforms/kuaishou/endpoints'

/**
 * 快手 Fetcher 类型（静态形态：三参签名）。
 *
 * 写成 **`interface … extends`** 而不是 `type … =`：后者是泛型类型别名，
 * 打印器（IDE 悬停 / twoslash / `.d.ts`）会把 `typeof kuaishouRegistry` 那些
 * `EndpointDef` 连 zod schema 一起整个内联展开。接口是**名义类型**：容器处只
 * 打印这个名字，`KuaishouFetcher['fetchVideoWork']` 这样钻进去时方法签名依旧
 * 完整 —— 类型不变，只是显示收敛。
 */
export interface KuaishouFetcher extends StaticFetcherOf<'kuaishou', typeof kuaishouRegistry> {}

/**
 * 快手数据获取器（静态）。
 * 包含所有快手 API 方法，调用时需要传递 cookie
 * @example
 * ```typescript
 * import { kuaishouFetcher } from '@ikenxuan/amagi'
 *
 * const result = await kuaishouFetcher.fetchVideoWork({ photoId: '3x123456789' }, cookie)
 * ```
 */
export const kuaishouFetcher: KuaishouFetcher = createStaticFetcher('kuaishou', kuaishouRegistry)

/**
 * 创建绑定了 Cookie 和请求配置的快手 Fetcher
 * @param cookie - 快手 Cookie
 * @param requestConfig - 请求配置 (可选)
 * @returns 绑定了 Cookie 的 Fetcher 对象，调用时无需传递 cookie
 * @example
 * ```typescript
 * const fetcher = createBoundKuaishouFetcher('your_cookie')
 * const result = await fetcher.fetchVideoWork({ photoId: '3x123456789' })
 * ```
 */
/**
 * 绑定 Cookie 的快手 Fetcher 类型（两参签名：cookie 已绑，只剩 options / requestConfig）。
 *
 * 名义接口，理由同 {@link KuaishouFetcher}：`FetcherOf<…>` 是泛型别名，直接用会把整个
 * registry 内联展开。改成 `interface … extends` 后 `client.kuaishou.fetcher` /
 * `createBoundKuaishouFetcher(...)` 的悬停只显示这个名字，方法签名钻进去仍完整。
 */
export interface BoundKuaishouFetcher extends FetcherOf<'kuaishou', typeof kuaishouRegistry> {}

export const createBoundKuaishouFetcher = (cookie: string, requestConfig?: RequestConfig): BoundKuaishouFetcher =>
  createFetcherFromRegistry('kuaishou', kuaishouRegistry, makeClientCtx('kuaishou', cookie, requestConfig, 'bound-kuaishou'))

/**
 * 只保留成功分支的快手 fetcher 类型。
 *
 * 给「用一层 Proxy 把失败信封转成异常」的下游封装用：包装后的 fetcher 声明成
 * 这个类型，`.data` 就是 `T` 而不是 `T | undefined`。名义接口，理由同 {@link KuaishouFetcher}。
 */
export interface SuccessKuaishouFetcher extends SuccessFetcherOf<'kuaishou', typeof kuaishouRegistry> {}
