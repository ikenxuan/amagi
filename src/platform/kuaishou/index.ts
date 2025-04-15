import { getKuaishouData } from 'amagi/model/DataFetchers'
import { KuaishouAPI, kuaishouAPI } from './API'
import { KuaishouData } from './getdata'
import { registerKuaishouRoutes } from './routes'

export * from './routes'
export { KuaishouAPI, kuaishouAPI, KuaishouData, registerKuaishouRoutes }


type kuaishouModel = {
  /** 该类下的所有方法只会返回拼接好参数后的 Url 地址，需要手动请求该地址以获取数据 */
  kuaishouAPI: typeof import('amagi/platform/kuaishou/API').kuaishouAPI
  /**
   * 获取快手数据
   * @param type - 请求数据类型
   * @param cookie - 有效的用户Cookie
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   */
  getKuaishouData: typeof import('amagi/model/DataFetchers').getKuaishouData
}

/** 快手相关功能模块 */
export const Kuaishou: kuaishouModel = {
  kuaishouAPI,
  getKuaishouData
}