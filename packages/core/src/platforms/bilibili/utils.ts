/**
 * B站公开工具面（`amagi.bilibili` / `client.bilibili` 上的工具集）。
 *
 * 三类东西各自有来处，**不复制**：
 * - `av2bv` / `bv2av` / `parseDmSegMobileReply` —— v7 实现（`./sign/bv2av`、`./decode/danmaku`）
 * - `wbi_sign` / `qtparam` —— v6 保留实现，在 `../legacy/bilibili/`
 * - `createBilibiliRoutes` —— v7 路由工厂（`./routes`）
 *
 * 这里**故意没有** v6 的 `bilibiliApiUrls`：v7 门面上挂的是 v7 自己的 URL 构造器
 * （`./api`，经 `client.bilibili.apiUrls` 到达），v6 那份从包顶层
 * （`import { bilibiliApiUrls } from '@ikenxuan/amagi'`）与 `@ikenxuan/amagi/compat`
 * 的 `client.bilibili.bilibiliApiUrls` 到达 —— 两份同名不同义的东西从此不坐在同一个对象上。
 *
 * @module platforms/bilibili/utils
 */

import { qtparam } from '../legacy/bilibili/qtparam'
import { wbi_sign } from '../legacy/bilibili/sign/wbi'
import { parseDmSegMobileReply } from './decode/danmaku'
import { av2bv, bv2av } from './sign/bv2av'

export * from './routes'
export { av2bv, bv2av } from './sign/bv2av'
export { parseDmSegMobileReply } from './decode/danmaku'
export { qtparam, wbi_sign }

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
  }
}
