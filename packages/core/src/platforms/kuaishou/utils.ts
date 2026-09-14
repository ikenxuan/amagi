/**
 * 快手公开工具面（`amagi.kuaishou` / `client.kuaishou` 上的工具集）。
 *
 * 两类东西各自有来处，**不复制**：
 * - `kuaishouSign` / `kuaishouApiUrls` —— v6 保留实现，在 `../legacy/kuaishou/`
 * - `createKuaishouRoutes` —— v7 路由工厂（`./routes`）
 *
 * @module platforms/kuaishou/utils
 */

import { kuaishouApiUrls } from '../legacy/kuaishou/API'
import { kuaishouSign } from '../legacy/kuaishou/sign'

export * from './routes'
/** 导出快手请求描述类型，便于项目层和签名层复用。 */
export type { KuaishouGraphqlRequest, KuaishouLiveApiRequest } from '../legacy/kuaishou/API'
export { kuaishouApiUrls, kuaishouSign }

type kuaishouUtilsModel = {
  /** 签名算法相关（v6 实现，在 `../legacy/kuaishou/`） */
  sign: typeof import('../legacy/kuaishou/sign').kuaishouSign

  /** 该类下的方法只会返回请求描述对象，需要手动请求对应地址以获取数据 */
  kuaishouApiUrls: typeof import('../legacy/kuaishou/API').kuaishouApiUrls
}

/** 快手相关功能模块 (工具集) */
export const kuaishouUtils: kuaishouUtilsModel = {
  sign: kuaishouSign,
  kuaishouApiUrls
}
