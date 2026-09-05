/**
 * Amagi 服务器模块
 *
 * v6 门面的住处。阶段 9.1（修 BUG-1）起这里**不再有第二份实现**：
 * `createAmagiClient` 是 v7 门面 {@link createClient}（`client/createClient.ts`）
 * 的 `@deprecated` 别名，两个门面并存是过渡期产物，过渡期已经结束。
 *
 * 本模块只剩三个 v6 公开类型（`RequestConfig` / `CookieConfig` / `Options`）
 * 与那个别名 —— 它们仍在顶层导出面上，形状一字不改，v8 随本文件一起移除。
 *
 * @module server
 */

import { createClient } from '../client/createClient'
import { AxiosRequestConfig } from 'axios'

/**
 * 请求配置选项接口
 *
 * 与 `contracts/request.ts` 的同名类型逐字相同（`RequestConfig$1` 的来源，
 * 见 docs/v7/06-migration.md）。新代码请用 contracts 那一份。
 */
export type RequestConfig = Omit<AxiosRequestConfig, 'url' | 'method' | 'data'>

/**
 * Cookie配置选项接口
 */
export type CookieConfig = {
  /** 抖音Cookie */
  douyin?: string
  /** B站Cookie */
  bilibili?: string
  /** 快手Cookie */
  kuaishou?: string
  /** 小红书Cookie */
  xiaohongshu?: string
}

/**
 * 客户端配置选项接口
 *
 * v6 形状，冻结不动。v7 的 `ClientOptions` 是它的超集（多一个 `debug`），
 * 两者赋值互通，所以 `createAmagiClient(o: Options)` 的调用点零改动。
 */
export type Options = {
  /** Cookie配置 */
  cookies?: CookieConfig
  /** 请求配置 */
  request?: Omit<AxiosRequestConfig, 'url' | 'method' | 'data'>
}

/**
 * 创建Amagi客户端实例
 *
 * @deprecated 阶段 9.1 起这是 v7 门面 {@link createClient} 的别名（同一个函数
 *   对象），新代码请直接用 `createClient` 或默认导出。返回值因此是 **v7 门面**：
 *   `douyin` / `bilibili` 上多了 `login` 命名空间，`events` 从全局单例
 *   `amagiEvents` 换成实例级总线（负载带 `meta`，读法变化逐条见
 *   docs/v7/06-migration.md 的事件小节）。v8 移除本别名。
 * @param options - 客户端配置选项，包含Cookie和请求配置
 * @returns 包含数据获取方法、服务器启动方法、绑定Cookie的平台工具集和API对象的对象
 */
export const createAmagiClient: typeof createClient = createClient

// 导出默认客户端创建函数
export default createAmagiClient
