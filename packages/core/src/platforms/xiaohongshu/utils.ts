/**
 * 小红书公开工具面（`amagi.xiaohongshu` / `client.xiaohongshu` 上的工具集）。
 *
 * 两类东西各自有来处，**不复制**：
 * - `xiaohongshuSign` —— v6 保留实现，在 `../legacy/xiaohongshu/`
 * - `createXiaohongshuRoutes` —— v7 路由工厂（`./routes`）
 *
 * 这里**故意没有** v6 的 `xiaohongshuApiUrls`：v7 门面上挂的是 v7 自己的 URL 构造器
 * （`./api`，经 `client.xiaohongshu.apiUrls` 到达），v6 那份从包顶层
 * （`import { xiaohongshuApiUrls } from '@ikenxuan/amagi'`）与 `@ikenxuan/amagi/compat`
 * 的 `client.xiaohongshu.xiaohongshuApiUrls` 到达 —— 两份同名不同义的东西从此不坐在同一个对象上。
 *
 * @module platforms/xiaohongshu/utils
 */

import { xiaohongshuSign } from '../legacy/xiaohongshu/sign'

export * from './routes'
export { xiaohongshuSign }

type xiaohongshuUtilsModel = {
  /** 签名算法相关（v6 实现，在 `../legacy/xiaohongshu/`） */
  sign: typeof import('../legacy/xiaohongshu/sign').xiaohongshuSign
}

/** 小红书相关功能模块 (工具集) */
export const xiaohongshuUtils: xiaohongshuUtilsModel = {
  sign: xiaohongshuSign
}
