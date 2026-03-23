import { kuaishouApiUrls } from './API'
import { kuaishou } from './KuaishouApi'
import { createKuaishouRoutes } from './routes'
import { kuaishouSign } from './sign'

export * from './KuaishouApi'
export * from './routes'
/** 导出快手请求描述类型，便于项目层和签名层复用。 */
export type { KuaishouGraphqlRequest, KuaishouLiveApiRequest } from './API'
export { createKuaishouRoutes, kuaishouApiUrls, kuaishouSign }

type kuaishouUtilsModel = {
  /** 签名算法相关 */
  sign: typeof import('amagi/platform/kuaishou/sign').kuaishouSign

  /** 该类下的方法只会返回请求描述对象，需要手动请求对应地址以获取数据 */
  kuaishouApiUrls: typeof import('amagi/platform/kuaishou/API').kuaishouApiUrls

  /**
   * 封装了所有快手相关的API请求，采用对象化的方式组织。
   *
   * 提供了一系列方法，用于与快手相关的 API 进行交互。
   *
   * 每个方法都接受参数和 Cookie，返回 Promise，解析为接口返回的原始数据。
   */
  api: typeof import('amagi/platform/kuaishou/KuaishouApi').kuaishou
}

/** 快手相关功能模块 (工具集) */
export const kuaishouUtils: kuaishouUtilsModel = {
  sign: kuaishouSign,
  kuaishouApiUrls,
  api: kuaishou
}
