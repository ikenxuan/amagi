/**
 * B站 API 模块 (已废弃)
 *
 * 此模块中的 API 已在 v6 版本废弃
 * 请使用 bilibiliFetcher 或 client.bilibili.fetcher 替代
 *
 * @module platform/bilibili/BilibiliApi
 * @deprecated v6 已废弃，请使用 fetcher API 替代
 */

import { RequestConfig } from 'amagi/server'
import { checkDeprecation } from 'amagi/utils/deprecation'

/**
 * 创建废弃的 API 存根函数
 */
const createDeprecatedStub = (methodName: string) => {
  return (..._args: any[]): never => {
    checkDeprecation('getBilibiliData')
    throw new Error(`bilibili.${methodName} 已废弃，请使用 bilibiliFetcher 替代`)
  }
}

/**
 * B站相关 API 的命名空间。
 *
 * @deprecated v6 已废弃，请使用 bilibiliFetcher 或 client.bilibili.fetcher 替代
 */
export const bilibili = {
  /** @deprecated 请使用 bilibiliFetcher.fetchVideoInfo 替代 */
  getVideoInfo: createDeprecatedStub('getVideoInfo'),
  /** @deprecated 请使用 bilibiliFetcher.fetchVideoStreamUrl 替代 */
  getVideoStream: createDeprecatedStub('getVideoStream'),
  /** @deprecated 请使用 bilibiliFetcher.fetchComments 替代 */
  getComments: createDeprecatedStub('getComments'),
  /** @deprecated 请使用 bilibiliFetcher.fetchCommentReplies 替代 */
  getCommentReply: createDeprecatedStub('getCommentReply'),
  /** @deprecated 请使用 bilibiliFetcher.fetchUserCard 替代 */
  getUserProfile: createDeprecatedStub('getUserProfile'),
  /** @deprecated 请使用 bilibiliFetcher.fetchUserDynamicList 替代 */
  getUserDynamic: createDeprecatedStub('getUserDynamic'),
  /** @deprecated 请使用 bilibiliFetcher.fetchEmojiList 替代 */
  getEmojiList: createDeprecatedStub('getEmojiList'),
  /** @deprecated 请使用 bilibiliFetcher.fetchBangumiInfo 替代 */
  getBangumiInfo: createDeprecatedStub('getBangumiInfo'),
  /** @deprecated 请使用 bilibiliFetcher.fetchBangumiStreamUrl 替代 */
  getBangumiStream: createDeprecatedStub('getBangumiStream'),
  /** @deprecated 请使用 bilibiliFetcher.fetchDynamicDetail 替代 */
  getDynamicInfo: createDeprecatedStub('getDynamicInfo'),
  /** @deprecated 请使用 bilibiliFetcher.fetchDynamicCard 替代 */
  getDynamicCard: createDeprecatedStub('getDynamicCard'),
  /** @deprecated 请使用 bilibiliFetcher.fetchLiveRoomInfo 替代 */
  getLiveRoomDetail: createDeprecatedStub('getLiveRoomDetail'),
  /** @deprecated 请使用 bilibiliFetcher.fetchLiveRoomInitInfo 替代 */
  getLiveRoomInitInfo: createDeprecatedStub('getLiveRoomInitInfo'),
  /** @deprecated 请使用 bilibiliFetcher.fetchLoginStatus 替代 */
  getLoginBasicInfo: createDeprecatedStub('getLoginBasicInfo'),
  /** @deprecated 请使用 bilibiliFetcher.requestLoginQrcode 替代 */
  getLoginQrcode: createDeprecatedStub('getLoginQrcode'),
  /** @deprecated 请使用 bilibiliFetcher.checkQrcodeStatus 替代 */
  checkQrcodeStatus: createDeprecatedStub('checkQrcodeStatus'),
  /** @deprecated 请使用 bilibiliFetcher.fetchUploaderTotalViews 替代 */
  getUserTotalPlayCount: createDeprecatedStub('getUserTotalPlayCount'),
  /** @deprecated 请使用 bilibiliFetcher.convertAvToBv 替代 */
  convertAvToBv: createDeprecatedStub('convertAvToBv'),
  /** @deprecated 请使用 bilibiliFetcher.convertBvToAv 替代 */
  convertBvToAv: createDeprecatedStub('convertBvToAv'),
  /** @deprecated 请使用 bilibiliFetcher.fetchArticleContent 替代 */
  getArticleContent: createDeprecatedStub('getArticleContent'),
  /** @deprecated 请使用 bilibiliFetcher.fetchArticleCards 替代 */
  getArticleCard: createDeprecatedStub('getArticleCard'),
  /** @deprecated 请使用 bilibiliFetcher.fetchArticleInfo 替代 */
  getArticleInfo: createDeprecatedStub('getArticleInfo'),
  /** @deprecated 请使用 bilibiliFetcher.fetchArticleListInfo 替代 */
  getColumnInfo: createDeprecatedStub('getColumnInfo'),
  /** @deprecated 请使用 bilibiliFetcher.fetchUserSpaceInfo 替代 */
  getUserProfileDetail: createDeprecatedStub('getUserProfileDetail'),
  /** @deprecated 请使用 bilibiliFetcher.requestCaptchaFromVoucher 替代 */
  applyVoucherCaptcha: createDeprecatedStub('applyVoucherCaptcha'),
  /** @deprecated 请使用 bilibiliFetcher.validateCaptchaResult 替代 */
  validateCaptcha: createDeprecatedStub('validateCaptcha'),
  /** @deprecated 请使用 bilibiliFetcher.fetchVideoDanmaku 替代 */
  getDanmaku: createDeprecatedStub('getDanmaku')
}

/**
 * 创建绑定了cookie的B站API对象
 *
 * @deprecated v6 已废弃，请使用 createBoundBilibiliFetcher 替代
 */
export const createBoundBilibiliApi = (_cookie: string, _requestConfig: RequestConfig) => {
  return { ...bilibili }
}

/**
 * 绑定cookie的B站API对象类型
 */
export type BoundBilibiliApi = ReturnType<typeof createBoundBilibiliApi>
