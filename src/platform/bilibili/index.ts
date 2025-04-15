import { bilibiliAPI } from './API'
import { BilibiliData } from './getdata'
import { qtparam } from './qtparam'
import { wbi_sign } from './sign/wbi'
import { av2bv, bv2av } from './sign/bv2av'
import { getBilibiliData } from 'amagi/model'

export * from './routes'
export { av2bv, bv2av } from './sign/bv2av'
export { bilibiliAPI, BilibiliData, qtparam, wbi_sign }

type bilibiliModel = {
  /** 签名算法相关 */
  sign: {
    /** WBI签名算法 */
    wbi_sign: typeof import('amagi/platform/bilibili/sign/wbi').wbi_sign,
    /** AV号转BV号 */
    av2bv: typeof import('amagi/platform/bilibili/sign/bv2av').av2bv,
    /** BV号转AV号 */
    bv2av: typeof import('amagi/platform/bilibili/sign/bv2av').bv2av,
  }
  /** 该类下的所有方法只会返回拼接好参数后的 Url 地址，需要手动请求该地址以获取数据 */
  bilibiliAPI: typeof import('amagi/platform/bilibili/API').bilibiliAPI
  /**
   * 获取B站数据
   * @param type - 请求数据类型
   * @param cookie - 有效的用户Cookie
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   */
  getBilibiliData: typeof import('amagi/model/DataFetchers').getBilibiliData
}

/** B站相关功能模块 */
export const Bilibili: bilibiliModel = {
  sign: {
    wbi_sign,
    av2bv,
    bv2av,
  },
  bilibiliAPI,
  getBilibiliData
}