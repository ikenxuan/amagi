import { kuaishouApiUrls } from './API'
import { createKuaishouRoutes } from './routes'
import { kuaishou } from './KuaishouApi'

export * from './routes'
export * from './KuaishouApi'
export { kuaishouApiUrls, createKuaishouRoutes }

type kuaishouUtilsModel = {
  /** 该类下的所有方法只会返回拼接好参数后的 Url 地址和请求体，需要手动请求该地址以获取数据 */
  kuaishouApiUrls: typeof import('amagi/platform/kuaishou/API').kuaishouApiUrls

  /**
   * 封装了所有快手相关的API请求，采用对象化的方式组织。
   * 
   * 提供了一系列方法，用于与抖音相关的 API 进行交互。
   * 
   * 每个方法都接受参数和 Cookie，返回 Promise，解析为接口返回的原始数据。
   */
  api: typeof import('amagi/platform/kuaishou/KuaishouApi').kuaishou
}

/** 快手相关功能模块 (工具集) */
export const kuaishouUtils: kuaishouUtilsModel = {
  kuaishouApiUrls,
  api: kuaishou,
}