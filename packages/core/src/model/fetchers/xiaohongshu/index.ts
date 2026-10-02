/**
 * 小红书 Fetcher 模块入口，方法由 `xiaohongshuRegistry` 派生。
 *
 * `xiaohongshuFetcher`（静态）与 `createBoundXiaohongshuFetcher` 都由
 * `xiaohongshuRegistry` 派生，方法与 client 上的 fetcher 走同一条
 * 执行管线。
 * @module fetchers/xiaohongshu
 */

import { createFetcherFromRegistry, type FetcherOf, type SuccessFetcherOf } from '../../../client/fetcher'
import { makeClientCtx } from '../../../client/runtime'
import { createStaticFetcher, type StaticFetcherOf } from '../../../client/static'
import type { RequestConfig } from '../../../contracts/request'
import { xiaohongshuRegistry } from '../../../platforms/xiaohongshu/endpoints'

/**
 * 小红书 Fetcher 类型（静态形态：三参签名）。
 *
 * 写成 **`interface … extends`** 而不是 `type … =`：后者是泛型类型别名，
 * 打印器（IDE 悬停 / twoslash / `.d.ts`）会把 `typeof xiaohongshuRegistry` 那些
 * `EndpointDef` 连 zod schema 一起整个内联展开。接口是**名义类型**：容器处只
 * 打印这个名字，`XiaohongshuFetcher['fetchNoteDetail']` 这样钻进去时方法签名依旧
 * 完整 —— 类型不变，只是显示收敛。
 */
export interface XiaohongshuFetcher extends StaticFetcherOf<'xiaohongshu', typeof xiaohongshuRegistry> {}

/**
 * 小红书数据获取器（静态）。
 * 包含所有小红书 API 方法，调用时需要传递 cookie
 * @example
 * ```typescript
 * import { xiaohongshuFetcher } from '@ikenxuan/amagi'
 *
 * const cookie = 'a1=xxx; web_session=xxx'
 * const result = await xiaohongshuFetcher.fetchNoteDetail({ note_id: 'n1', xsec_token: 'tk' }, cookie)
 * ```
 */
export const xiaohongshuFetcher: XiaohongshuFetcher = createStaticFetcher('xiaohongshu', xiaohongshuRegistry)

/**
 * 创建绑定了 Cookie 和请求配置的小红书 Fetcher
 * @param cookie - 小红书 Cookie
 * @param requestConfig - 请求配置 (可选)
 * @returns 绑定了 Cookie 的 Fetcher 对象，调用时无需传递 cookie
 * @example
 * ```typescript
 * import { createBoundXiaohongshuFetcher } from '@ikenxuan/amagi'
 *
 * const fetcher = createBoundXiaohongshuFetcher('your_cookie')
 * const result = await fetcher.fetchNoteDetail({ note_id: 'n1', xsec_token: 'tk' })
 * ```
 */
/**
 * 绑定 Cookie 的小红书 Fetcher 类型（两参签名：cookie 已绑，只剩 options / requestConfig）。
 *
 * 名义接口，理由同 {@link XiaohongshuFetcher}：`FetcherOf<…>` 是泛型别名，直接用会把整个
 * registry 内联展开。改成 `interface … extends` 后 `client.xiaohongshu.fetcher` /
 * `createBoundXiaohongshuFetcher(...)` 的悬停只显示这个名字，方法签名钻进去仍完整。
 */
export interface BoundXiaohongshuFetcher extends FetcherOf<'xiaohongshu', typeof xiaohongshuRegistry> {}

export const createBoundXiaohongshuFetcher = (cookie: string, requestConfig?: RequestConfig): BoundXiaohongshuFetcher =>
  createFetcherFromRegistry('xiaohongshu', xiaohongshuRegistry, makeClientCtx('xiaohongshu', cookie, requestConfig, 'bound-xiaohongshu'))

/**
 * 只保留成功分支的小红书 fetcher 类型。
 *
 * 给「用一层 Proxy 把失败信封转成异常」的下游封装用：包装后的 fetcher 声明成
 * 这个类型，`.data` 就是 `T` 而不是 `T | undefined`。名义接口，理由同 {@link XiaohongshuFetcher}。
 */
export interface SuccessXiaohongshuFetcher extends SuccessFetcherOf<'xiaohongshu', typeof xiaohongshuRegistry> {}
