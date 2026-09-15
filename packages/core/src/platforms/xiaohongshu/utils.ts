/**
 * 小红书公开工具面（`amagi.xiaohongshu` / `client.xiaohongshu` 上的工具集）。
 *
 * 两类东西各自有来处，**不复制**：
 * - `xiaohongshuSign` / `xiaohongshuApiUrls` —— v6 保留实现，在 `../legacy/xiaohongshu/`
 * - `createXiaohongshuRoutes` —— v7 路由工厂（`./routes`）
 *
 * @module platforms/xiaohongshu/utils
 */

import { xiaohongshuApiUrls } from '../legacy/xiaohongshu/API'
import { xiaohongshuSign } from '../legacy/xiaohongshu/sign'

export * from './routes'
export { xiaohongshuApiUrls, xiaohongshuSign }

type xiaohongshuUtilsModel = {
  /** 签名算法相关（v6 实现，在 `../legacy/xiaohongshu/`） */
  sign: typeof import('../legacy/xiaohongshu/sign').xiaohongshuSign

  /**
   * 该类下的所有方法只会返回拼接好参数后的 Url 地址，需要手动请求该地址以获取数据
   */
  xiaohongshuApiUrls: typeof import('../legacy/xiaohongshu/API').xiaohongshuApiUrls
}

/** 小红书相关功能模块 (工具集) */
export const xiaohongshuUtils: xiaohongshuUtilsModel = {
  sign: xiaohongshuSign,
  xiaohongshuApiUrls
}
