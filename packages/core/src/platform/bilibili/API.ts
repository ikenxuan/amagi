/**
 * B站 API URL 构建器
 *
 * 该类下的所有方法只会返回拼接好参数后的 URL 地址，需要手动请求该地址以获取数据
 *
 * @module platform/bilibili/API
 */

import { OmitMethodType } from 'amagi/types'
import { BilibiliMethodOptionsMap } from 'amagi/types/BilibiliAPIParams'

/** 去除 methodType 字段后的参数类型 */
type BilibiliMethodOptionsWithoutMethodType = {
  [K in keyof BilibiliMethodOptionsMap]: OmitMethodType<BilibiliMethodOptionsMap[K]>
}

/**
 * B站 API URL 构建类
 *
 * 提供所有 B站 API 的 URL 构建方法
 */
class BilibiliAPI {
  /** 获取登录基本信息 */
  getLoginStatus () {
    return 'https://api.bilibili.com/x/web-interface/nav'
  }

  /** 获取视频详细信息 */
  getVideoInfo (data: BilibiliMethodOptionsWithoutMethodType['VideoInfoParams']) {
    return `https://api.bilibili.com/x/web-interface/view?bvid=${data.bvid}`
  }

  /** 获取视频流信息 */
  getVideoStream (data: BilibiliMethodOptionsWithoutMethodType['VideoStreamParams']) {
    return `https://api.bilibili.com/x/player/playurl?avid=${data.avid}&cid=${data.cid}`
  }

  /**
   * 获取评论区明细
   * @see https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/readme.md#评论区类型代码
   */
  getComments (data: BilibiliMethodOptionsWithoutMethodType['CommentParams']) {
    const params = new URLSearchParams({
      oid: data.oid.toString(),
      type: data.type.toString(),
      mode: (data.mode ?? 3).toString(),
      plat: '1',
      seek_rpid: '',
      web_location: '1315875'
    })

    if (data.pagination_str) {
      params.append('pagination_str', JSON.stringify({ offset: data.pagination_str }))
    } else {
      params.append('pagination_str', JSON.stringify({ offset: '' }))
    }

    return `https://api.bilibili.com/x/v2/reply/wbi/main?${params.toString()}`
  }

  /** 获取评论区状态 */
  getCommentStatus (data: BilibiliMethodOptionsWithoutMethodType['CommentParams']) {
    return `https://api.bilibili.com/x/v2/reply/subject/description?type=${data.type}&oid=${data.oid}`
  }

  /** 获取指定评论的回复 */
  getCommentReplies (data: BilibiliMethodOptionsWithoutMethodType['CommentReplyParams']) {
    return `https://api.bilibili.com/x/v2/reply/reply?type=${data.type}&oid=${data.oid}&root=${data.root}&ps=${data.number}`
  }

  /** 获取表情列表 */
  getEmojiList () {
    return 'https://api.bilibili.com/x/emote/user/panel/web?business=reply&web_location=0.0'
  }

  /** 获取番剧明细 */
  getBangumiInfo (data: BilibiliMethodOptionsWithoutMethodType['BangumiInfoParams']) {
    if (data.ep_id) {
      return `https://api.bilibili.com/pgc/view/web/season?ep_id=${data.ep_id}`
    } else if (data.season_id) {
      return `https://api.bilibili.com/pgc/view/web/season?season_id=${data.season_id}`
    } else {
      throw new Error('Missing required parameter: ep_id or season_id')
    }
  }

  /** 获取番剧视频流信息 */
  getBangumiStream (data: BilibiliMethodOptionsWithoutMethodType['BangumiStreamParams']) {
    return `https://api.bilibili.com/pgc/player/web/playurl?cid=${data.cid}&ep_id=${data.ep_id}`
  }

  /** 获取用户空间动态 */
  getUserDynamicList (data: BilibiliMethodOptionsWithoutMethodType['UserParams']) {
    const params = new URLSearchParams({
      host_mid: data.host_mid.toString(),
      offset: '',
      platform: 'web',
      features: 'itemOpusStyle,listOnlyfans,opusBigCover,onlyfansVote,forwardListHidden,decorationCard,commentsNewVersion,onlyfansAssetsV2,ugcDelete,onlyfansQaCard,avatarAutoTheme,sunflowerStyle,eva3CardOpus,eva3CardVideo,eva3CardComment'
    })
    return `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?${params.toString()}`
  }

  /** 获取动态详情 */
  getDynamicDetail (data: BilibiliMethodOptionsWithoutMethodType['DynamicParams']) {
    return `https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=${data.dynamic_id}&features=itemOpusStyle,opusBigCover,onlyfansVote,endFooterHidden,decorationCard,onlyfansAssetsV2,ugcDelete,onlyfansQaCard,editable,opusPrivateVisible,avatarAutoTheme`
  }

  /** 获取动态卡片信息 */
  getDynamicCard (data: BilibiliMethodOptionsWithoutMethodType['DynamicParams']) {
    return `https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/get_dynamic_detail?dynamic_id=${data.dynamic_id}`
  }

  /** 获取用户名片信息 */
  getUserCard (data: BilibiliMethodOptionsWithoutMethodType['UserParams']) {
    return `https://api.bilibili.com/x/web-interface/card?mid=${data.host_mid}&photo=true`
  }

  /** 获取直播间信息 */
  getLiveRoomInfo (data: BilibiliMethodOptionsWithoutMethodType['LiveRoomParams']) {
    return `https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${data.room_id}`
  }

  /** 获取直播间初始化信息 */
  getLiveRoomInit (data: BilibiliMethodOptionsWithoutMethodType['LiveRoomParams']) {
    return `https://api.live.bilibili.com/room/v1/Room/room_init?id=${data.room_id}`
  }

  /** 申请登录二维码 */
  getLoginQrcode () {
    return 'https://passport.bilibili.com/x/passport-login/web/qrcode/generate'
  }

  /** 查询二维码状态 */
  getQrcodeStatus (data: BilibiliMethodOptionsWithoutMethodType['QrcodeParams']) {
    return `https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${data.qrcode_key}`
  }

  /** 获取UP主总播放量 */
  getUploaderTotalViews (data: BilibiliMethodOptionsWithoutMethodType['UserParams']) {
    return `https://api.bilibili.com/x/space/upstat?mid=${data.host_mid}`
  }

  /** 获取专栏正文内容 */
  getArticleContent (data: BilibiliMethodOptionsWithoutMethodType['ArticleParams']) {
    return `https://api.bilibili.com/x/article/view?id=${data.id}`
  }

  /** 获取专栏显示卡片信息 */
  getArticleCards (data: BilibiliMethodOptionsWithoutMethodType['ArticleCardParams']) {
    return `https://api.bilibili.com/x/article/cards?ids=${Array.isArray(data.ids) ? data.ids.join(',') : data.ids}`
  }

  /** 获取专栏文章基本信息 */
  getArticleInfo (data: BilibiliMethodOptionsWithoutMethodType['ArticleParams']) {
    return `https://api.bilibili.com/x/article/viewinfo?id=${data.id}`
  }

  /** 获取文集基本信息 */
  getArticleListInfo (data: BilibiliMethodOptionsWithoutMethodType['ArticleInfoParams']) {
    return `https://api.bilibili.com/x/article/list/web/articles?id=${data.id}`
  }

  /** 获取用户空间详细信息 */
  getUserSpaceInfo (data: BilibiliMethodOptionsWithoutMethodType['UserParams']) {
    return `https://api.bilibili.com/x/space/wbi/acc/info?mid=${data.host_mid}`
  }

  /** 从 v_voucher 申请验证码 */
  getCaptchaFromVoucher (data: BilibiliMethodOptionsWithoutMethodType['ApplyVoucherCaptchaParams']) {
    return {
      Url: 'https://api.bilibili.com/x/gaia-vgate/v1/register',
      Body: {
        ...(data.csrf !== undefined && { csrf: data.csrf }),
        v_voucher: data.v_voucher
      }
    }
  }

  /** 验证验证码结果 */
  validateCaptcha (data: BilibiliMethodOptionsWithoutMethodType['ValidateCaptchaParams']) {
    return {
      Url: 'https://api.bilibili.com/x/gaia-vgate/v1/validate',
      Body: {
        challenge: data.challenge,
        token: data.token,
        validate: data.validate,
        seccode: data.seccode,
        ...(data.csrf !== undefined && { csrf: data.csrf })
      }
    }
  }

  /**
   * 获取实时弹幕（web端 protobuf 接口）
   * @see https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/danmaku/danmaku_proto.md
   */
  getVideoDanmaku (data: BilibiliMethodOptionsWithoutMethodType['DanmakuParams']) {
    const params = new URLSearchParams({
      type: '1',
      oid: data.cid.toString(),
      segment_index: (data.segment_index ?? 1).toString()
    })
    return `https://api.bilibili.com/x/v2/dm/web/seg.so?${params.toString()}`
  }
}

/** B站 API URL 构建器实例 */
export const bilibiliApiUrls = new BilibiliAPI()
