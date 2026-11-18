/**
 * Amagi 服务器模块
 *
 * `createAmagiClient` 保留旧配置和 fetcher 门面，供迁移期使用。
 * 本模块包含它和三个保留的公开类型（`RequestConfig` /
 * `CookieConfig` / `Options`）。
 *
 * @module server
 */

import { AxiosRequestConfig } from 'axios'

import { createLegacyClient } from '../client/legacy-client'

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
 * 形状冻结不动；新门面的 `ClientOptions` 按平台和端归类。
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
 * @deprecated 请改用默认导出或 `createClient`，并迁移到按平台和端归类的配置与调用。
 *   此工厂保留旧 `cookies` 配置、`.fetcher` 与 `.login` 形状，返回 v7 信封。
 * @param options - 客户端配置选项，包含Cookie和请求配置
 * @returns 包含数据获取方法、服务器启动方法、绑定Cookie的平台工具集和API对象的对象
 */
export const createAmagiClient: typeof createLegacyClient = createLegacyClient

// 导出默认客户端创建函数
export default createAmagiClient
