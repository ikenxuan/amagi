/**
 * B站参数验证模块
 *
 * 提供 B站 API 参数的 Zod 验证 Schema
 *
 * @module validation/bilibili
 */

import { BilibiliMethodOptionsMap } from 'amagi/types/BilibiliAPIParams'
import zod from 'zod'

import { smartNumber } from './utils'

/** 视频信息参数验证 */
export const BilibiliVideoParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['VideoInfoParams']> = zod.object({
  methodType: zod.literal('videoInfo', { error: '方法类型必须是"videoInfo"' }),
  bvid: zod.string({ error: 'BVID必须是字符串' }).min(1, { error: 'BVID不能为空' })
})

/** 视频流参数验证 */
export const BilibiliVideoDownloadParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['VideoStreamParams']> = zod.object({
  methodType: zod.literal('videoStream', { error: '方法类型必须是"videoStream"' }),
  avid: smartNumber('AVID不能为空', 1, true),
  cid: smartNumber('CID不能为空', 1, true)
})

/** 评论参数验证 */
export const BilibiliCommentParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['CommentParams']> = zod.object({
  methodType: zod.literal('comments', { error: '方法类型必须是"comments"' }),
  oid: zod.string({ error: 'OID必须是字符串' }).min(1, { error: 'OID不能为空' }),
  type: smartNumber('评论类型不能为空', 1, true)
    .refine(
      (val) => [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 33].includes(val),
      { error: '无效的评论区类型' }
    ),
  number: zod.coerce.number({ error: '评论数量必须是数字' })
    .int({ error: '评论数量必须是整数' })
    .positive({ error: '评论数量必须是正数' })
    .default(20)
    .optional(),
  pn: zod.coerce.number({ error: '页码必须是数字' })
    .int({ error: '页码必须是整数' })
    .positive({ error: '页码必须是正数' })
    .default(1)
    .optional()
})

/** 评论回复参数验证 */
export const BilibiliCommentReplyParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['CommentReplyParams']> = zod.object({
  methodType: zod.literal('commentReplies', { error: '方法类型必须是"commentReplies"' }),
  oid: zod.string({ error: 'OID必须是字符串' }).min(1, { error: 'OID不能为空' }),
  type: smartNumber('评论类型不能为空', 1, true)
    .refine(
      (val) => [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 33].includes(val),
      { error: '无效的评论区类型' }
    ),
  root: zod.string({ error: '根评论ID必须是字符串' }).min(1, { error: '根评论ID不能为空' }),
  number: zod.coerce.number({ error: '评论数量必须是数字' })
    .int({ error: '评论数量必须是整数' })
    .positive({ error: '评论数量必须是正数' })
    .default(20)
    .optional(),
  pn: zod.coerce.number({ error: '页码必须是数字' })
    .int({ error: '页码必须是整数' })
    .positive({ error: '页码必须是正数' })
    .default(1)
    .optional()
})

/** 用户参数验证 */
export const BilibiliUserParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['UserParams']> = zod.object({
  methodType: zod.enum(['userCard', 'userDynamicList', 'uploaderTotalViews', 'userSpaceInfo'], {
    error: '方法类型必须是指定的枚举值之一'
  }),
  host_mid: smartNumber('UP主UID不能为空', 1, true)
})

/** 表情参数验证 */
export const BilibiliEmojiParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['EmojiParams']> = zod.object({
  methodType: zod.literal('emojiList', { error: '方法类型必须是"emojiList"' })
})

/** 番剧信息参数验证 */
export const BilibiliBangumiInfoParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['BangumiInfoParams']> = zod.object({
  methodType: zod.literal('bangumiInfo', { error: '方法类型必须是"bangumiInfo"' }),
  ep_id: zod.string({ error: '番剧EP ID必须是字符串' }).min(1, { error: '番剧EP ID不能为空' }).optional(),
  season_id: zod.string({ error: '番剧季度ID必须是字符串' }).optional()
}).refine(
  (data) => data.ep_id ?? data.season_id,
  {
    error: 'ep_id 和 season_id 至少需要提供一个',
    path: ['ep_id']
  }
)

/** 番剧流参数验证 */
export const BilibiliBangumiStreamParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['BangumiStreamParams']> = zod.object({
  methodType: zod.literal('bangumiStream', { error: '方法类型必须是"bangumiStream"' }),
  cid: smartNumber('CID不能为空', 1, true),
  ep_id: zod.string({ error: '番剧EP ID必须是字符串' }).min(1, { error: '番剧EP ID不能为空' })
})

/** 动态参数验证 */
export const BilibiliDynamicParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['DynamicParams']> = zod.object({
  methodType: zod.enum(['dynamicDetail', 'dynamicCard'], {
    error: '方法类型必须是"dynamicDetail"或"dynamicCard"'
  }),
  dynamic_id: zod.string({ error: '动态ID必须是字符串' }).min(1, { error: '动态ID不能为空' })
})

/** 直播间参数验证 */
export const BilibiliLiveParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['LiveRoomParams']> = zod.object({
  methodType: zod.enum(['liveRoomInfo', 'liveRoomInit'], {
    error: '方法类型必须是"liveRoomInfo"或"liveRoomInit"'
  }),
  room_id: zod.string({ error: '直播间ID必须是字符串' }).min(1, { error: '直播间ID不能为空' })
})

/** 登录状态参数验证 */
export const BilibiliLoginParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['LoginBaseInfoParams']> = zod.object({
  methodType: zod.literal('loginStatus', { error: '方法类型必须是"loginStatus"' })
})

/** 申请二维码参数验证 */
export const BilibiliQrcodeParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['GetQrcodeParams']> = zod.object({
  methodType: zod.literal('loginQrcode', { error: '方法类型必须是"loginQrcode"' })
})

/** 二维码状态参数验证 */
export const BilibiliQrcodeStatusParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['QrcodeParams']> = zod.object({
  methodType: zod.literal('qrcodeStatus', { error: '方法类型必须是"qrcodeStatus"' }),
  qrcode_key: zod.string({ error: '二维码key必须是字符串' }).min(1, { error: '二维码key不能为空' })
})

/** AV转BV参数验证 */
export const BilibiliAv2BvParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['Av2BvParams']> = zod.object({
  methodType: zod.literal('avToBv', { error: '方法类型必须是"avToBv"' }),
  avid: zod.coerce.number({ error: 'AVID必须是数字' })
    .int({ error: 'AVID必须是整数' })
    .positive({ error: 'AVID必须是正数' })
})

/** BV转AV参数验证 */
export const BilibiliBv2AvParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['Bv2AvParams']> = zod.object({
  methodType: zod.literal('bvToAv', { error: '方法类型必须是"bvToAv"' }),
  bvid: zod.string({ error: 'BVID必须是字符串' }).min(1, { error: 'BVID不能为空' })
})

/** 专栏内容参数验证 */
export const BilibiliArticleParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['ArticleParams']> = zod.object({
  methodType: zod.literal('articleContent', { error: '方法类型必须是"articleContent"' }),
  id: zod.string({ error: '专栏ID必须是字符串' }).min(1, { error: '专栏ID不能为空' })
})

/** 专栏卡片参数验证 */
export const BilibiliArticleCardParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['ArticleCardParams']> = zod.object({
  methodType: zod.literal('articleCards', { error: '方法类型必须是"articleCards"' }),
  ids: zod.union([
    zod.array(zod.string({ error: '被查询的 id 列表必须是字符串数组' })).min(1, { error: '被查询的 id 列表不能为空' }),
    zod.string({ error: '被查询的 id 列表必须是字符串' }).min(1, { error: '被查询的 id 列表不能为空' })
  ])
})

/** 专栏信息参数验证 */
export const BilibiliArticleInfoParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['ArticleInfoParams']> = zod.object({
  methodType: zod.literal('articleInfo', { error: '方法类型必须是"articleInfo"' }),
  id: zod.string({ error: '专栏ID必须是字符串' }).min(1, { error: '专栏ID不能为空' })
})

/** 文集信息参数验证 */
export const BilibiliColumnInfoParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['ColumnInfoParams']> = zod.object({
  methodType: zod.literal('articleListInfo', { error: '方法类型必须是"articleListInfo"' }),
  id: zod.string({ error: '文集ID必须是字符串' }).min(1, { error: '文集ID不能为空' })
})

/** 验证码申请参数验证 */
export const BilibiliApplyCaptchaParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['ApplyVoucherCaptchaParams']> = zod.object({
  methodType: zod.literal('captchaFromVoucher', { error: '方法类型必须是"captchaFromVoucher"' }),
  csrf: zod.string({ error: 'CSRF Token必须是字符串' }).optional(),
  v_voucher: zod.string({ error: '验证码ID必须是字符串' }).min(1, { error: '验证码ID不能为空' })
})

/** 验证码验证参数验证 */
export const BilibiliValidateCaptchaParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['ValidateCaptchaParams']> = zod.object({
  methodType: zod.literal('validateCaptcha', { error: '方法类型必须是"validateCaptcha"' }),
  csrf: zod.string({ error: 'CSRF Token必须是字符串' }).optional(),
  challenge: zod.string({ error: '验证码challenge必须是字符串' }).min(1, { error: '验证码challenge不能为空' }),
  token: zod.string({ error: '验证码token必须是字符串' }).min(1, { error: '验证码token不能为空' }),
  validate: zod.string({ error: '验证码validate必须是字符串' }).min(1, { error: '验证码validate不能为空' }),
  seccode: zod.string({ error: '验证码seccode必须是字符串' }).min(1, { error: '验证码seccode不能为空' })
})

/** 弹幕参数验证 */
export const BilibiliDanmakuParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['DanmakuParams']> = zod.object({
  methodType: zod.literal('videoDanmaku', { error: '方法类型必须是"videoDanmaku"' }),
  cid: smartNumber('CID不能为空', 1, true),
  segment_index: zod.coerce.number({ error: '分段序号必须是数字' })
    .int({ error: '分段序号必须是整数' })
    .positive({ error: '分段序号必须是正数' })
    .default(1)
    .optional()
})

/** B站参数验证模式映射 */
export const BilibiliValidationSchemas = {
  videoInfo: BilibiliVideoParamsSchema,
  videoStream: BilibiliVideoDownloadParamsSchema,
  comments: BilibiliCommentParamsSchema,
  commentReplies: BilibiliCommentReplyParamsSchema,
  userCard: BilibiliUserParamsSchema,
  userDynamicList: BilibiliUserParamsSchema,
  userSpaceInfo: BilibiliUserParamsSchema,
  emojiList: BilibiliEmojiParamsSchema,
  bangumiInfo: BilibiliBangumiInfoParamsSchema,
  bangumiStream: BilibiliBangumiStreamParamsSchema,
  dynamicDetail: BilibiliDynamicParamsSchema,
  dynamicCard: BilibiliDynamicParamsSchema,
  liveRoomInfo: BilibiliLiveParamsSchema,
  liveRoomInit: BilibiliLiveParamsSchema,
  loginStatus: BilibiliLoginParamsSchema,
  loginQrcode: BilibiliQrcodeParamsSchema,
  qrcodeStatus: BilibiliQrcodeStatusParamsSchema,
  uploaderTotalViews: BilibiliUserParamsSchema,
  avToBv: BilibiliAv2BvParamsSchema,
  bvToAv: BilibiliBv2AvParamsSchema,
  articleContent: BilibiliArticleParamsSchema,
  articleCards: BilibiliArticleCardParamsSchema,
  articleInfo: BilibiliArticleInfoParamsSchema,
  articleListInfo: BilibiliColumnInfoParamsSchema,
  captchaFromVoucher: BilibiliApplyCaptchaParamsSchema,
  validateCaptcha: BilibiliValidateCaptchaParamsSchema,
  videoDanmaku: BilibiliDanmakuParamsSchema
} as const

/** B站方法路由映射 */
export const BilibiliMethodRoutes = {
  videoInfo: '/fetch_one_video',
  videoStream: '/fetch_video_playurl',
  comments: '/fetch_work_comments',
  commentReplies: '/fetch_comment_reply',
  userCard: '/fetch_user_profile',
  userDynamicList: '/fetch_user_dynamic',
  userSpaceInfo: '/fetch_user_space_info',
  emojiList: '/fetch_emoji_list',
  bangumiInfo: '/fetch_bangumi_video_info',
  bangumiStream: '/fetch_bangumi_video_playurl',
  dynamicDetail: '/fetch_dynamic_info',
  dynamicCard: '/fetch_dynamic_card',
  liveRoomInfo: '/fetch_live_room_detail',
  liveRoomInit: '/fetch_liveroom_def',
  loginStatus: '/login_basic_info',
  loginQrcode: '/new_login_qrcode',
  qrcodeStatus: '/check_qrcode',
  uploaderTotalViews: '/fetch_user_full_view',
  avToBv: '/av_to_bv',
  bvToAv: '/bv_to_av',
  articleContent: '/fetch_article_content',
  articleCards: '/fetch_article_card',
  articleInfo: '/fetch_article_info',
  articleListInfo: '/fetch_column_info',
  captchaFromVoucher: '/apply_captcha',
  validateCaptcha: '/validate_captcha',
  videoDanmaku: '/fetch_danmaku'
} as const

/** B站方法类型 */
export type BilibiliMethodType = keyof typeof BilibiliValidationSchemas
