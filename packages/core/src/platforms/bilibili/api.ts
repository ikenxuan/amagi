import zod from 'zod'

import type { ParsedOf } from '../../contracts/endpoint'
import type { articleCards } from './endpoints/articleCards'
import type { articleContent } from './endpoints/articleContent'
import type { articleListInfo } from './endpoints/articleListInfo'
import type { bangumiInfo } from './endpoints/bangumiInfo'
import type { bangumiStream } from './endpoints/bangumiStream'
import type { captchaFromVoucher } from './endpoints/captchaFromVoucher'
import type { commentReplies } from './endpoints/commentReplies'
import type { comments } from './endpoints/comments'
import type { dynamicDetail } from './endpoints/dynamicDetail'
import type { liveRoomInfo } from './endpoints/liveRoomInfo'
import type { qrcodeStatus } from './endpoints/qrcodeStatus'
import type { userCard } from './endpoints/userCard'
import type { validateCaptcha } from './endpoints/validateCaptcha'
import type { videoDanmaku } from './endpoints/videoDanmaku'
import type { videoInfo } from './endpoints/videoInfo'
import type { videoStream } from './endpoints/videoStream'

/**
 * B站 URL 构造（请求描述）。
 *
 * `getComments` 的 `plat` / `seek_rpid` / `web_location` 读校验后的 params
 * （缺省值与平台默认一致），调用方可以覆盖。
 */

/** `videoInfo` 参数 */
export interface VideoInfoParams extends ParsedOf<typeof videoInfo> {}

/** `videoStream` 参数 */
export interface VideoStreamParams extends ParsedOf<typeof videoStream> {}

/**
 * B站评论区类型代码（`comments` / `commentReplies` 的 `type` 参数）。
 *
 * 完整对照表（部分 oid 含义官方未明确，转写自 bilibili-API-collect）：
 *
 * | 代码 | 评论区类型 | oid 的意义 |
 * | --- | --- | --- |
 * | 1 | 视频稿件 | 稿件 avid |
 * | 2 | 话题 | 话题 id |
 * | 4 | 活动 | 活动 id |
 * | 5 | 小视频 | 小视频 id |
 * | 6 | 小黑屋封禁信息 | 封禁公示 id |
 * | 7 | 公告信息 | 公告 id |
 * | 8 | 直播活动 | 直播间 id |
 * | 9 | 活动稿件 | (?) |
 * | 10 | 直播公告 | (?) |
 * | 11 | 相簿（图片动态） | 相簿 id |
 * | 12 | 专栏 | 专栏 cvid |
 * | 13 | 票务 | (?) |
 * | 14 | 音频 | 音频 auid |
 * | 15 | 风纪委员会 | 众裁项目 id |
 * | 16 | 点评 | (?) |
 * | 17 | 动态（纯文字动态&分享） | 动态 id |
 * | 18 | 播单 | (?) |
 * | 19 | 音乐播单 | (?) |
 * | 20 | 漫画 | (?) |
 * | 21 | 漫画 | (?) |
 * | 22 | 漫画 | 漫画 mcid |
 * | 33 | 课程 | 课程 epid |
 *
 * @see https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/readme.md#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81
 */
const commentTypeUnion = zod.union(
  [
    zod.literal(1),
    zod.literal(2),
    zod.literal(4),
    zod.literal(5),
    zod.literal(6),
    zod.literal(7),
    zod.literal(8),
    zod.literal(9),
    zod.literal(10),
    zod.literal(11),
    zod.literal(12),
    zod.literal(13),
    zod.literal(14),
    zod.literal(15),
    zod.literal(16),
    zod.literal(17),
    zod.literal(18),
    zod.literal(19),
    zod.literal(20),
    zod.literal(21),
    zod.literal(22),
    zod.literal(33)
  ],
  { error: '无效的评论区类型' }
)

/**
 * B站评论区类型代码（`comments` / `commentReplies` 的 `type` 参数）。
 *
 * 完整对照表（部分 oid 含义官方未明确，转写自 bilibili-API-collect）：
 *
 * | 代码 | 评论区类型 | oid 的意义 |
 * | --- | --- | --- |
 * | 1 | 视频稿件 | 稿件 avid |
 * | 2 | 话题 | 话题 id |
 * | 4 | 活动 | 活动 id |
 * | 5 | 小视频 | 小视频 id |
 * | 6 | 小黑屋封禁信息 | 封禁公示 id |
 * | 7 | 公告信息 | 公告 id |
 * | 8 | 直播活动 | 直播间 id |
 * | 9 | 活动稿件 | (?) |
 * | 10 | 直播公告 | (?) |
 * | 11 | 相簿（图片动态） | 相簿 id |
 * | 12 | 专栏 | 专栏 cvid |
 * | 13 | 票务 | (?) |
 * | 14 | 音频 | 音频 auid |
 * | 15 | 风纪委员会 | 众裁项目 id |
 * | 16 | 点评 | (?) |
 * | 17 | 动态（纯文字动态&分享） | 动态 id |
 * | 18 | 播单 | (?) |
 * | 19 | 音乐播单 | (?) |
 * | 20 | 漫画 | (?) |
 * | 21 | 漫画 | (?) |
 * | 22 | 漫画 | 漫画 mcid |
 * | 33 | 课程 | 课程 epid |
 *
 * @see https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/readme.md#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81
 */
export type CommentType = zod.infer<typeof commentTypeUnion>

/**
 * `type` 参数的完整 schema：HTTP query 的字符串先 coerce 成数字，再 pipe 进合法代码
 * 联合收窄 —— SDK 签名拿到的是 `CommentType` 而不是裸 `number`，非法代码报
 * 「无效的评论区类型」。`zod.enum` 在 zod 4.6.5 不接受数字数组（values 恒空、恒报错），
 * 所以用 literal 联合。
 */
export const commentTypeSchema = zod.coerce.number().pipe(commentTypeUnion)

/** `mode` 的合法值联合：0/1/2/3 之外（含 coerce 出的 NaN）统一报错 */
const commentModeUnion = zod.union([zod.literal(0), zod.literal(1), zod.literal(2), zod.literal(3)], {
  error: '排序方式只能是 0、1、2、3'
})

/** `mode` 参数的完整 schema：coerce + 收窄到 `0 | 1 | 2 | 3` */
export const commentModeSchema = zod.coerce.number().pipe(commentModeUnion)

/** `comments` 参数 —— 从端点内联 schema 派生（build 显式标注返回类型以断开类型环） */
export interface CommentsParams extends ParsedOf<typeof comments> {}

/** `commentReplies` 参数 */
export interface CommentRepliesParams extends ParsedOf<typeof commentReplies> {}

/** `bangumiInfo` 参数 */
export interface BangumiInfoParams extends ParsedOf<typeof bangumiInfo> {}

/** `bangumiStream` 参数 */
export interface BangumiStreamParams extends ParsedOf<typeof bangumiStream> {}

/** 用户类端点共用 —— 实验②静默退化的正对照 */
export interface UserParams extends ParsedOf<typeof userCard> {}

/** `dynamicDetail` 参数 */
export interface DynamicParams extends ParsedOf<typeof dynamicDetail> {}

/** `liveRoomInfo` / `liveRoomInit` 参数 */
export interface LiveRoomParams extends ParsedOf<typeof liveRoomInfo> {}

/** `qrcodeStatus` 参数 */
export interface QrcodeParams extends ParsedOf<typeof qrcodeStatus> {}

/** `articleContent` / `articleInfo` 参数 */
export interface ArticleParams extends ParsedOf<typeof articleContent> {}

/** `articleCards` 参数 */
export interface ArticleCardParams extends ParsedOf<typeof articleCards> {}

/** `articleListInfo` 参数 */
export interface ArticleInfoParams extends ParsedOf<typeof articleListInfo> {}

/** `videoDanmaku` 参数 */
export interface DanmakuParams extends ParsedOf<typeof videoDanmaku> {}

/** `captchaFromVoucher` 参数 */
export interface ApplyVoucherCaptchaParams extends ParsedOf<typeof captchaFromVoucher> {}

/** `validateCaptcha` 参数 */
export interface ValidateCaptchaParams extends ParsedOf<typeof validateCaptcha> {}

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
   * plat / seek_rpid / web_location 读传入参数，缺省用平台默认值。
   * @see https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/comment/readme.md#评论区类型代码
   */
  getComments(data: CommentsParams): string {
    const params = new URLSearchParams({
      oid: data.oid.toString(),
      type: data.type.toString(),
      mode: (data.mode ?? 3).toString(),
      plat: (data.plat ?? 1).toString(), // 缺省 1
      seek_rpid: data.seek_rpid ?? '', // 缺省空串
      web_location: data.web_location ?? '1315875' // 缺省 1315875
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
