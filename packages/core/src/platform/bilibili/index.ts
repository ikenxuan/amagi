import { bilibiliApiUrls } from './API'
import { bilibiliErrorCodeMap } from './getdata'
import { qtparam } from './qtparam'
import { av2bv, bv2av } from './sign/bv2av'
import { parseDmSegMobileReply } from './sign/danmaku_proto'
import { wbi_sign } from './sign/wbi'

export * from './routes'
export { av2bv, bv2av } from './sign/bv2av'
export { parseDmSegMobileReply } from './sign/danmaku_proto'
export { bilibiliApiUrls, qtparam, wbi_sign }
export { bilibiliErrorCodeMap }

type bilibiliUtilsModel = {
  /** 签名算法相关 */
  sign: {
    /** WBI签名算法 */
    wbi_sign: typeof import('amagi/platform/bilibili/sign/wbi').wbi_sign
    /** AV号转BV号 */
    av2bv: typeof import('amagi/platform/bilibili/sign/bv2av').av2bv
    /** BV号转AV号 */
    bv2av: typeof import('amagi/platform/bilibili/sign/bv2av').bv2av
  }

  /** 弹幕解析相关 */
  danmaku: {
    /** 解析弹幕 protobuf 数据 */
    parseDmSegMobileReply: typeof import('amagi/platform/bilibili/sign/danmaku_proto').parseDmSegMobileReply
  }

  /** 该类下的所有方法只会返回拼接好参数后的 Url 地址，需要手动请求该地址以获取数据 */
  bilibiliApiUrls: typeof import('amagi/platform/bilibili/API').bilibiliApiUrls
}

/** B站相关功能模块 (工具集) */
export const bilibiliUtils: bilibiliUtilsModel = {
  sign: {
    wbi_sign,
    av2bv,
    bv2av
  },
  danmaku: {
    parseDmSegMobileReply
  },
  bilibiliApiUrls
}
