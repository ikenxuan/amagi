import * as signSteps from './exports/sign-steps'
import * as signing from './exports/signing'
import { bilibiliApiUrls } from './platforms/bilibili/api'
import { av2bv, bv2av, parseDmSegMobileReply, qtparam, wbi_sign } from './platforms/bilibili/utils'
import { douyinApiUrls } from './platforms/douyin/api'
import { normalizeDouyinCookie } from './platforms/douyin/cookie'
import { douyinSign, douyinUtils } from './platforms/douyin/utils'
import { kuaishouApiUrls } from './platforms/kuaishou/api'
import { kuaishouSign } from './platforms/kuaishou/utils'
import { xiaohongshuApiUrls } from './platforms/xiaohongshu/api'
import { xiaohongshuSign } from './platforms/xiaohongshu/utils'

/** 包根工具分组，不绑定客户端身份。 */
export const tools = {
  douyin: {
    sign: douyinSign,
    normalizeCookie: normalizeDouyinCookie,
    credentials: douyinUtils.credentials,
    passport: douyinUtils.passport,
    apiUrls: douyinApiUrls
  },
  bilibili: {
    avToBv: av2bv,
    bvToAv: bv2av,
    decodeDanmaku: parseDmSegMobileReply,
    sign: { wbi: wbi_sign, qtparam },
    apiUrls: bilibiliApiUrls
  },
  kuaishou: { sign: kuaishouSign, apiUrls: kuaishouApiUrls },
  xiaohongshu: { sign: xiaohongshuSign, apiUrls: xiaohongshuApiUrls },
  signing,
  signSteps
}
