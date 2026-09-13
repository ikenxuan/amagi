/**
 * Amagi 服务器模块
 *
 * `createAmagiClient` 是门面 {@link createClient} 的 `@deprecated` 别名（同一个
 * 函数对象）。本模块只剩它和三个保留的公开类型（`RequestConfig` /
 * `CookieConfig` / `Options`）。
 *
 * @module server
 */

import { createClient } from '../client/createClient'
import { AxiosRequestConfig } from 'axios'

/**
 * 请求配置选项接口
 *
 * 与 `contracts/request.ts` 的同名类型逐字相同（顶层导出的就是 contracts
 * 那一份）。新代码请用 contracts 的。
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
 * 形状冻结不动。`ClientOptions` 是它的超集（多一个 `debug`），
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
 * @deprecated 请改用 `createClient` 或默认导出。这是同一个函数对象的别名，
 *   返回值就是 {@link createClient} 的结果：`douyin` / `bilibili` 上带 `login`
 *   命名空间（扫码登录会话），`events` 是实例级总线（负载带 `meta`）。
 * @param options - 客户端配置选项，包含Cookie和请求配置
 * @returns 包含数据获取方法、服务器启动方法、绑定Cookie的平台工具集和API对象的对象
 */
export const createAmagiClient: typeof createClient = createClient

// 导出默认客户端创建函数
export default createAmagiClient
