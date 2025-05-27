import { bilibiliErrorCodeMap } from './getdata'
import { bilibiliAPI, bilibiliApiUrls } from './API'
import { qtparam } from './qtparam'
import { wbi_sign } from './sign/wbi'
import { av2bv, bv2av } from './sign/bv2av'
import { getBilibiliData } from 'amagi/model'
import { bilibili } from './BilibiliApi'

export * from './routes'
export * from './BilibiliApi'
export { av2bv, bv2av } from './sign/bv2av'
export { bilibiliAPI, bilibiliApiUrls, qtparam, wbi_sign }
export { bilibiliErrorCodeMap }

type bilibiliUtilsModel = {
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
  bilibiliApiUrls: typeof import('amagi/platform/bilibili/API').bilibiliApiUrls

  /**
   * 快捷获取B站数据
   * @param type - 请求数据类型
   * @param cookie - 有效的用户Cookie
   * @param options - 请求参数，是一个对象
   * @returns 返回接口的原始数据
   */
  getBilibiliData: typeof import('amagi/model/DataFetchers').getBilibiliData

  /**
   * B站相关 API 的命名空间。
   * 
   * 部分接口可能不需要 Cookie 但建议传递有效的用户 Cookie，以获取更多数据。
   *
   * 提供了一系列方法，用于与B站相关的 API 进行交互。
   * 
   * 每个方法都接受参数和 Cookie，返回 Promise，解析为接口返回的原始数据。
   */
  api: typeof import('amagi/platform/bilibili/BilibiliApi').bilibili
}

/** B站相关功能模块 (工具集) */
export const bilibiliUtils: bilibiliUtilsModel = {
  sign: {
    wbi_sign,
    av2bv,
    bv2av,
  },
  bilibiliApiUrls,
  getBilibiliData,
  api: bilibili,
}