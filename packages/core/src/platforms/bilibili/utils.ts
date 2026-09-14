/**
 * B站公开工具面（`amagi.bilibili` / `client.bilibili` 上的工具集）。
 *
 * 三类东西各自有来处，**不复制**：
 * - `av2bv` / `bv2av` / `parseDmSegMobileReply` —— v7 实现（`./sign/bv2av`、`./decode/danmaku`）
 * - `wbi_sign` / `qtparam` / `bilibiliApiUrls` —— v6 保留实现，在 `../legacy/bilibili/`
 * - `createBilibiliRoutes` —— v7 路由工厂（`./routes`）
 *
 * @module platforms/bilibili/utils
 */

import { av2bv, bv2av } from './sign/bv2av'
import { parseDmSegMobileReply } from './decode/danmaku'
import { bilibiliApiUrls } from '../legacy/bilibili/API'
import { qtparam } from '../legacy/bilibili/qtparam'
import { wbi_sign } from '../legacy/bilibili/sign/wbi'

export * from './routes'
export { av2bv, bv2av } from './sign/bv2av'
export { parseDmSegMobileReply } from './decode/danmaku'
export { bilibiliApiUrls, qtparam, wbi_sign }

type bilibiliUtilsModel = {
  /** 签名算法相关 */
  sign: {
    /** WBI签名算法（v6 实现，在 `../legacy/bilibili/`） */
    wbi_sign: typeof import('../legacy/bilibili/sign/wbi').wbi_sign
    /** AV号转BV号 */
    av2bv: typeof import('./sign/bv2av').av2bv
    /** BV号转AV号 */
    bv2av: typeof import('./sign/bv2av').bv2av
  }

  /** 弹幕解析相关 */
  danmaku: {
    /** 解析弹幕 protobuf 数据 */
    parseDmSegMobileReply: typeof import('./decode/danmaku').parseDmSegMobileReply
  }

  /** 该类下的所有方法只会返回拼接好参数后的 Url 地址，需要手动请求该地址以获取数据 */
  bilibiliApiUrls: typeof import('../legacy/bilibili/API').bilibiliApiUrls
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
