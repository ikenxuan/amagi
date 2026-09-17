/**
 * 抖音公开工具面（`amagi.douyin` / `client.douyin` 上的工具集）。
 *
 * 三类东西各自有来处，**不复制**：
 * - `douyinPassport` —— v7 实现（`./passport`，登录会话与 fetcher 共用同一份）
 * - `douyinSign` —— v6 保留实现，在 `../legacy/douyin/`
 * - `createDouyinRoutes` —— v7 路由工厂（`./routes`）
 *
 * 这里**故意没有** v6 的 `douyinApiUrls`：v7 门面上挂的是 v7 自己的 URL 构造器
 * （`./api`，经 `client.douyin.apiUrls` 到达），v6 那份从包顶层
 * （`import { douyinApiUrls } from '@ikenxuan/amagi'`）与 `@ikenxuan/amagi/compat`
 * 的 `client.douyin.douyinApiUrls` 到达 —— 两份同名不同义的东西从此不坐在同一个对象上。
 *
 * @module platforms/douyin/utils
 */

import { douyinSign } from '../legacy/douyin/sign'
import * as douyinPassport from './passport'

export * from './routes'
export { douyinPassport, douyinSign }

type douyinUtilsModel = {
  /** 签名算法相关（v6 实现，在 `../legacy/douyin/`；比 v7 的签名表多一个 `SecSdk` 静态方法） */
  sign: typeof import('../legacy/douyin/sign').douyinSign

  /**
   * passport 扫码登录协议（签名、CookieJar、响应解析）
   *
   * 日常调用请优先用 `douyinFetcher` 上的 `requestPassportQrcode` 等方法，
   * 这里暴露的是底层构件，便于自行编排或做单元测试。
   */
  passport: typeof import('./passport')
}

/** 抖音相关功能模块 (工具集) */
export const douyinUtils: douyinUtilsModel = {
  sign: douyinSign,
  passport: douyinPassport
}
