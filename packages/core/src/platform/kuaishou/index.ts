import { kuaishouApiUrls } from './API'
import { createKuaishouRoutes } from './routes'
import { kuaishouSign } from './sign'

export * from './routes'
/** 导出快手请求描述类型，便于项目层和签名层复用。 */
export type { KuaishouGraphqlRequest, KuaishouLiveApiRequest } from './API'
export { createKuaishouRoutes, kuaishouApiUrls, kuaishouSign }

type kuaishouUtilsModel = {
  /** 签名算法相关 */
  sign: typeof import('../../platform/kuaishou/sign').kuaishouSign

  /** 该类下的方法只会返回请求描述对象，需要手动请求对应地址以获取数据 */
  kuaishouApiUrls: typeof import('../../platform/kuaishou/API').kuaishouApiUrls
}

/** 快手相关功能模块 (工具集) */
export const kuaishouUtils: kuaishouUtilsModel = {
  sign: kuaishouSign,
  kuaishouApiUrls
}
