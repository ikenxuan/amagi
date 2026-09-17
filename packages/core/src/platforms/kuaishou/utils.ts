/**
 * 快手公开工具面（`amagi.kuaishou` / `client.kuaishou` 上的工具集）。
 *
 * 两类东西各自有来处，**不复制**：
 * - `kuaishouSign` —— v6 保留实现，在 `../legacy/kuaishou/`
 * - `createKuaishouRoutes` —— v7 路由工厂（`./routes`）
 *
 * 这里**故意没有** v6 的 `kuaishouApiUrls`：v7 门面上挂的是 v7 自己的 URL 构造器
 * （`./api`，经 `client.kuaishou.apiUrls` 到达），v6 那份从包顶层
 * （`import { kuaishouApiUrls } from '@ikenxuan/amagi'`）与 `@ikenxuan/amagi/compat`
 * 的 `client.kuaishou.kuaishouApiUrls` 到达 —— 两份同名不同义的东西从此不坐在同一个对象上。
 * 下方的 `KuaishouGraphqlRequest` / `KuaishouLiveApiRequest` 只是**类型**转出
 * （项目层与签名层要复用这个形状），不是把 v6 构造器留下来。
 *
 * @module platforms/kuaishou/utils
 */

import { kuaishouSign } from '../legacy/kuaishou/sign'

export * from './routes'
/** 导出快手请求描述类型，便于项目层和签名层复用。 */
export type { KuaishouGraphqlRequest, KuaishouLiveApiRequest } from '../legacy/kuaishou/API'
export { kuaishouSign }

type kuaishouUtilsModel = {
  /** 签名算法相关（v6 实现，在 `../legacy/kuaishou/`） */
  sign: typeof import('../legacy/kuaishou/sign').kuaishouSign
}

/** 快手相关功能模块 (工具集) */
export const kuaishouUtils: kuaishouUtilsModel = {
  sign: kuaishouSign
}
