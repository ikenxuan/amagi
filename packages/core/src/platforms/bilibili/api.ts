/**
 * B站 URL 构造（请求描述）。
 *
 * 从 v6 `platform/bilibili/API.ts` 搬迁，修掉一条 KNOWN-DEFECT：
 * - **#22 / A6 getComments 硬编码参数**：v6 把 `plat: '1'` / `seek_rpid: ''` /
 *   `web_location: '1315875'` 写死在代码里，`CommentParams` 上的同名字段
 *   即便传进来也不会生效（KNOWN-DEFECT 有测试锁死）。v7 改为读校验后的
 *   params（缺省值不变），调用方可以覆盖。
 *
 * 与 v6 的结构差异：参数类型不再引用 v6 的 `types/BilibiliAPIParams.ts`
 * （阶段 6 会删），改为本地定义，字段形状与 v6 完全一致。
 */

/** `videoInfo` 参数 */
export interface VideoInfoParams {
  bvid: string
}

/** `videoStream` 参数 */
export interface VideoStreamParams {
  avid: number
  cid: number
}

/** 评论区类型代码（v6 `CommentType` 枚举的值集合） */
export type CommentType =
  | 1
  | 2
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 33

/** `comments` 参数（plat / seek_rpid / web_location 不再硬编码，#22） */
export interface CommentsParams {
  oid: string
  type: CommentType
  mode?: 0 | 1 | 2 | 3
  number?: number
  pagination_str?: string
  plat?: number
  seek_rpid?: string
  web_location?: string
}

/** `commentReplies` 参数 */
export interface CommentRepliesParams {
  type: CommentType
  oid: string
  root: string
  number?: number
}

/** `bangumiInfo` 参数 */
export interface BangumiInfoParams {
  season_id?: string
  ep_id?: string
}

/** `bangumiStream` 参数 */
export interface BangumiStreamParams {
  cid: number
  ep_id: string
}

/** 用户类端点（userCard / userDynamicList / userLiveStatus / userSpaceInfo / uploaderTotalViews）共用 */
export interface UserParams {
  host_mid: number
}

/** `dynamicDetail` 参数 */
export interface DynamicParams {
  dynamic_id: string
}

/** `liveRoomInfo` / `liveRoomInit` 参数 */
export interface LiveRoomParams {
  room_id: string
}

/** `qrcodeStatus` 参数 */
export interface QrcodeParams {
  qrcode_key: string
}

/** `articleContent` / `articleInfo` 参数 */
export interface ArticleParams {
  id: string
}

/** `articleCards` 参数 */
export interface ArticleCardParams {
  ids: string[] | string
}

/** `articleListInfo` 参数 */
export interface ArticleInfoParams {
  id: string
}

/** `videoDanmaku` 参数 */
export interface DanmakuParams {
  cid: number
  segment_index?: number
}

/** `captchaFromVoucher` 参数 */
export interface ApplyVoucherCaptchaParams {
  csrf?: string
  v_voucher: string
}

/** `validateCaptcha` 参数 */
export interface ValidateCaptchaParams {
  csrf?: string
  challenge: string
  token: string
  validate: string
  seccode: string
}

/** B站 API URL 构建类（所有方法只拼 URL，不发起请求） */
export class BilibiliAPI {
  /** 获取登录基本信息 */
  getLoginStatus(): string {
    return 'https://api.bilibili.com/x/web-interface/nav'
  }

  /** 获取视频详细信息 */
  getVideoInfo(data: VideoInfoParams): string {
    return `https://api.bilibili.com/x/web-interface/view?bvid=${data.bvid}`
  }

  /** 获取视频流信息 */
  getVideoStream(data: VideoStreamParams): string {
    return `https://api.bilibili.com/x/player/playurl?avid=${data.avid}&cid=${data.cid}`
  }

  /**
   * 获取评论区明细。
   *
   * #22/A6：plat / seek_rpid / web_location 读参数（缺省与 v6 硬编码值一致），
   * 不再写死。
   * @see https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/readme.md#评论区类型代码
   */
  getComments(data: CommentsParams): string {
    const params = new URLSearchParams({
      oid: data.oid.toString(),
      type: data.type.toString(),
      mode: (data.mode ?? 3).toString(),
      plat: (data.plat ?? 1).toString(), // #22：读参数，缺省 1（v6 硬编码值）
      seek_rpid: data.seek_rpid ?? '', // #22：读参数，缺省空串
      web_location: data.web_location ?? '1315875' // #22：读参数，缺省 v6 硬编码值
    })

    if (data.pagination_str) {
      params.append('pagination_str', JSON.stringify({ offset: data.pagination_str }))
    } else {
      params.append('pagination_str', JSON.stringify({ offset: '' }))
    }

    return `https://api.bilibili.com/x/v2/reply/wbi/main?${params.toString()}`
  }

  /** 获取评论区状态 */
  getCommentStatus(data: CommentsParams): string {
    return `https://api.bilibili.com/x/v2/reply/subject/description?type=${data.type}&oid=${data.oid}`
  }

  /** 获取指定评论的回复 */
  getCommentReplies(data: CommentRepliesParams): string {
    return `https://api.bilibili.com/x/v2/reply/reply?type=${data.type}&oid=${data.oid}&root=${data.root}&ps=${data.number}`
  }

  /** 获取表情列表 */
  getEmojiList(): string {
    return 'https://api.bilibili.com/x/emote/user/panel/web?business=reply&web_location=0.0'
  }

  /** 获取番剧明细 */
  getBangumiInfo(data: BangumiInfoParams): string {
    if (data.ep_id) {
      return `https://api.bilibili.com/pgc/view/web/season?ep_id=${data.ep_id}`
    } else if (data.season_id) {
      return `https://api.bilibili.com/pgc/view/web/season?season_id=${data.season_id}`
    } else {
      throw new Error('Missing required parameter: ep_id or season_id')
    }
  }

  /** 获取番剧视频流信息 */
  getBangumiStream(data: BangumiStreamParams): string {
    return `https://api.bilibili.com/pgc/player/web/playurl?cid=${data.cid}&ep_id=${data.ep_id}`
  }

  /** 获取用户空间动态 */
  getUserDynamicList(data: UserParams): string {
    const params = new URLSearchParams({
      host_mid: data.host_mid.toString(),
      offset: '',
      platform: 'web',
      features:
        'itemOpusStyle,listOnlyfans,opusBigCover,onlyfansVote,forwardListHidden,decorationCard,commentsNewVersion,onlyfansAssetsV2,ugcDelete,onlyfansQaCard,avatarAutoTheme,sunflowerStyle,eva3CardOpus,eva3CardVideo,eva3CardComment'
    })
    return `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?${params.toString()}`
  }

  /** 获取动态详情 */
  getDynamicDetail(data: DynamicParams): string {
    return `https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=${data.dynamic_id}&features=itemOpusStyle,opusBigCover,onlyfansVote,endFooterHidden,decorationCard,onlyfansAssetsV2,ugcDelete,onlyfansQaCard,editable,opusPrivateVisible,avatarAutoTheme`
  }

  /** 获取用户名片信息 */
  getUserCard(data: UserParams): string {
    return `https://api.bilibili.com/x/web-interface/card?mid=${data.host_mid}&photo=true`
  }

  /** 按用户 UID 获取直播状态 */
  getUserLiveStatus(data: UserParams): string {
    return `https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld?mid=${data.host_mid}`
  }

  /** 获取直播间信息 */
  getLiveRoomInfo(data: LiveRoomParams): string {
    return `https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${data.room_id}`
  }

  /** 获取直播间初始化信息 */
  getLiveRoomInit(data: LiveRoomParams): string {
    return `https://api.live.bilibili.com/room/v1/Room/room_init?id=${data.room_id}`
  }

  /** 申请登录二维码 */
  getLoginQrcode(): string {
    return 'https://passport.bilibili.com/x/passport-login/web/qrcode/generate'
  }

  /** 查询二维码状态 */
  getQrcodeStatus(data: QrcodeParams): string {
    return `https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${data.qrcode_key}`
  }

  /** 获取UP主总播放量 */
  getUploaderTotalViews(data: UserParams): string {
    return `https://api.bilibili.com/x/space/upstat?mid=${data.host_mid}`
  }

  /** 获取专栏正文内容 */
  getArticleContent(data: ArticleParams): string {
    return `https://api.bilibili.com/x/article/view?id=${data.id}`
  }

  /** 获取专栏显示卡片信息 */
  getArticleCards(data: ArticleCardParams): string {
    return `https://api.bilibili.com/x/article/cards?ids=${Array.isArray(data.ids) ? data.ids.join(',') : data.ids}`
  }

  /** 获取专栏文章基本信息 */
  getArticleInfo(data: ArticleParams): string {
    return `https://api.bilibili.com/x/article/viewinfo?id=${data.id}`
  }

  /** 获取文集基本信息 */
  getArticleListInfo(data: ArticleInfoParams): string {
    return `https://api.bilibili.com/x/article/list/web/articles?id=${data.id}`
  }

  /** 获取用户空间详细信息 */
  getUserSpaceInfo(data: UserParams): string {
    return `https://api.bilibili.com/x/space/wbi/acc/info?mid=${data.host_mid}`
  }

  /** 从 v_voucher 申请验证码 */
  getCaptchaFromVoucher(data: ApplyVoucherCaptchaParams): { Url: string; Body: Record<string, string> } {
    return {
      Url: 'https://api.bilibili.com/x/gaia-vgate/v1/register',
      Body: {
        ...(data.csrf !== undefined && { csrf: data.csrf }),
        v_voucher: data.v_voucher
      }
    }
  }

  /** 验证验证码结果 */
  validateCaptcha(data: ValidateCaptchaParams): { Url: string; Body: Record<string, string> } {
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
  getVideoDanmaku(data: DanmakuParams): string {
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
