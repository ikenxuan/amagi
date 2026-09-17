/**
 * 抖音公开工具面（`amagi.douyin` / `client.douyin` 上的工具集）。
 *
 * 三类东西各自有来处，**不复制**：
 * - `douyinPassport` —— v7 实现（`./passport`，登录会话与 fetcher 共用同一份）
 * - `douyinSign` / `douyinApiUrls` —— v6 保留实现，在 `../legacy/douyin/`
 * - `createDouyinRoutes` —— v7 路由工厂（`./routes`）
 *
 * @module platforms/douyin/utils
 */

import { douyinApiUrls } from '../legacy/douyin/API'
import { douyinSign } from '../legacy/douyin/sign'
import * as douyinPassport from './passport'

export * from './routes'
export { douyinApiUrls, douyinPassport, douyinSign }

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

  /**
   * 该类下的所有方法只会返回拼接好参数后的 Url 地址，需要手动请求该地址以获取数据
   *
   * 缺少 `a_bougs` 参数，请自行生成拼接
   */
  douyinApiUrls: typeof import('../legacy/douyin/API').douyinApiUrls
}

/** 抖音相关功能模块 (工具集) */
export const douyinUtils: douyinUtilsModel = {
  sign: douyinSign,
  passport: douyinPassport,
  douyinApiUrls
}
