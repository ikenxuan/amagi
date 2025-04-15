import { getDouyinData } from 'amagi/model/DataFetchers'
import { douyinAPI } from './API'
import { DouyinData } from './getdata'
import douyinSign from './sign'

export * from './routes'
export { douyinAPI, DouyinData, douyinSign }

type douyinModel = {
  /** 签名算法相关 */
  sign: typeof import('amagi/platform/douyin/sign').default
  /** 该类下的所有方法只会返回拼接好参数后的 Url 地址，需要手动请求该地址以获取数据 */
  douyinAPI: typeof import('amagi/platform/douyin/API').douyinAPI
  /**
   * 获取抖音数据
   * @param type - 请求数据类型
   * @param cookie - 有效的用户Cookie
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   */
  getDouyinData: typeof import('amagi/model/DataFetchers').getDouyinData
}

/** 抖音相关功能模块 */
export const Douyin: douyinModel = {
  sign: douyinSign,
  douyinAPI,
  getDouyinData
}
