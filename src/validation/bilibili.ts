import { BilibiliMethodOptionsMap } from 'amagi/types/BilibiliAPIParams'
import zod from 'zod'

import { smartNumber } from './utils'

export const BilibiliVideoParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['VideoInfoParams']> = zod.object({
  methodType: zod.literal('单个视频作品数据', { error: '方法类型必须是"单个视频作品数据"' }),
  bvid: zod.string({ error: 'BVID必须是字符串' }).min(1, { error: 'BVID不能为空' })
})

export const BilibiliVideoDownloadParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['VideoStreamParams']> = zod.object({
  methodType: zod.literal('单个视频下载信息数据', { error: '方法类型必须是"单个视频下载信息数据"' }),
  avid: smartNumber('AVID不能为空', 1, true),
  cid: smartNumber('CID不能为空', 1, true)
})

export const BilibiliCommentParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['CommentParams']> = zod.object({
  methodType: zod.literal('评论数据', { error: '方法类型必须是"评论数据"' }),
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

export const BilibiliCommentReplyParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['CommentReplyParams']> = zod.object({
  methodType: zod.literal('指定评论的回复', { error: '方法类型必须是"指定评论的回复"' }),
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

export const BilibiliUserParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['UserParams']> = zod.object({
  methodType: zod.enum(['用户主页数据', '用户主页动态列表数据', '获取UP主总播放量', '用户空间详细信息'], {
    error: '方法类型必须是指定的枚举值之一'
  }),
  host_mid: smartNumber('UP主UID不能为空', 1, true)
})

export const BilibiliEmojiParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['EmojiParams']> = zod.object({
  methodType: zod.literal('Emoji数据', { error: '方法类型必须是"Emoji数据"' })
})

export const BilibiliBangumiInfoParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['BangumiInfoParams']> = zod.object({
  methodType: zod.literal('番剧基本信息数据', { error: '方法类型必须是"番剧基本信息数据"' }),
  ep_id: zod.string({ error: '番剧EP ID必须是字符串' }).min(1, { error: '番剧EP ID不能为空' }).optional(),
  season_id: zod.string({ error: '番剧季度ID必须是字符串' }).optional()
}).refine(
  (data) => data.ep_id ?? data.season_id,
  {
    error: 'ep_id 和 season_id 至少需要提供一个',
    path: ['ep_id']
  }
)

export const BilibiliBangumiStreamParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['BangumiStreamParams']> = zod.object({
  methodType: zod.literal('番剧下载信息数据', { error: '方法类型必须是"番剧下载信息数据"' }),
  cid: smartNumber('CID不能为空', 1, true),
  ep_id: zod.string({ error: '番剧EP ID必须是字符串' }).min(1, { error: '番剧EP ID不能为空' })
})

export const BilibiliDynamicParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['DynamicParams']> = zod.object({
  methodType: zod.enum(['动态详情数据', '动态卡片数据'], {
    error: '方法类型必须是"动态详情数据"或"动态卡片数据"'
  }),
  dynamic_id: zod.string({ error: '动态ID必须是字符串' }).min(1, { error: '动态ID不能为空' })
})

export const BilibiliLiveParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['LiveRoomParams']> = zod.object({
  methodType: zod.enum(['直播间信息', '直播间初始化信息'], {
    error: '方法类型必须是"直播间信息"或"直播间初始化信息"'
  }),
  room_id: zod.string({ error: '直播间ID必须是字符串' }).min(1, { error: '直播间ID不能为空' })
})

export const BilibiliLoginParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['LoginBaseInfoParams']> = zod.object({
  methodType: zod.literal('登录基本信息', { error: '方法类型必须是"登录基本信息"' })
})

export const BilibiliQrcodeParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['GetQrcodeParams']> = zod.object({
  methodType: zod.literal('申请二维码', { error: '方法类型必须是"申请二维码"' })
})

export const BilibiliQrcodeStatusParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['QrcodeParams']> = zod.object({
  methodType: zod.literal('二维码状态', { error: '方法类型必须是"二维码状态"' }),
  qrcode_key: zod.string({ error: '二维码key必须是字符串' }).min(1, { error: '二维码key不能为空' })
})

export const BilibiliAv2BvParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['Av2BvParams']> = zod.object({
  methodType: zod.literal('AV转BV', { error: '方法类型必须是"AV转BV"' }),
  avid: zod.coerce.number({ error: 'AVID必须是数字' })
    .int({ error: 'AVID必须是整数' })
    .positive({ error: 'AVID必须是正数' })
})

export const BilibiliBv2AvParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['Bv2AvParams']> = zod.object({
  methodType: zod.literal('BV转AV', { error: '方法类型必须是"BV转AV"' }),
  bvid: zod.string({ error: 'BVID必须是字符串' }).min(1, { error: 'BVID不能为空' })
})

export const BilibiliArticleParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['ArticleParams']> = zod.object({
  methodType: zod.literal('专栏正文内容', { error: '方法类型必须是"专栏正文内容"' }),
  id: zod.string({ error: '专栏ID必须是字符串' }).min(1, { error: '专栏ID不能为空' })
})

export const BilibiliArticleCardParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['ArticleCardParams']> = zod.object({
  methodType: zod.literal('专栏显示卡片信息', { error: '方法类型必须是"专栏显示卡片信息"' }),
  ids: zod.union([
    zod.array(zod.string({ error: '被查询的 id 列表必须是字符串数组' })).min(1, { error: '被查询的 id 列表不能为空' }),
    zod.string({ error: '被查询的 id 列表必须是字符串' }).min(1, { error: '被查询的 id 列表不能为空' })
  ])
})

export const BilibiliArticleInfoParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['ArticleInfoParams']> = zod.object({
  methodType: zod.literal('专栏文章基本信息', { error: '方法类型必须是"专栏文章基本信息"' }),
  id: zod.string({ error: '专栏ID必须是字符串' }).min(1, { error: '专栏ID不能为空' })
})

export const BilibiliColumnInfoParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['ColumnInfoParams']> = zod.object({
  methodType: zod.literal('文集基本信息', { error: '方法类型必须是"文集基本信息"' }),
  id: zod.string({ error: '文集ID必须是字符串' }).min(1, { error: '文集ID不能为空' })
})

export const BilibiliApplyCaptchaParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['ApplyVoucherCaptchaParams']> = zod.object({
  methodType: zod.literal('从_v_voucher_申请_captcha', { error: '方法类型必须是"从_v_voucher_申请_captcha"' }),
  csrf: zod.string({ error: 'CSRF Token必须是字符串' }).optional(),
  v_voucher: zod.string({ error: '验证码ID必须是字符串' }).min(1, { error: '验证码ID不能为空' })
})

export const BilibiliValidateCaptchaParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['ValidateCaptchaParams']> = zod.object({
  methodType: zod.literal('验证验证码结果', { error: '方法类型必须是"验证验证码结果"' }),
  csrf: zod.string({ error: 'CSRF Token必须是字符串' }).optional(),
  challenge: zod.string({ error: '验证码challenge必须是字符串' }).min(1, { error: '验证码challenge不能为空' }),
  token: zod.string({ error: '验证码token必须是字符串' }).min(1, { error: '验证码token不能为空' }),
  validate: zod.string({ error: '验证码validate必须是字符串' }).min(1, { error: '验证码validate不能为空' }),
  seccode: zod.string({ error: '验证码seccode必须是字符串' }).min(1, { error: '验证码seccode不能为空' })
})

export const BilibiliDanmakuParamsSchema: zod.ZodType<BilibiliMethodOptionsMap['DanmakuParams']> = zod.object({
  methodType: zod.literal('实时弹幕', { error: '方法类型必须是"实时弹幕"' }),
  cid: smartNumber('CID不能为空', 1, true),
  segment_index: zod.coerce.number({ error: '分段序号必须是数字' })
    .int({ error: '分段序号必须是整数' })
    .positive({ error: '分段序号必须是正数' })
    .default(1)
    .optional()
})

// B站参数验证模式映射
export const BilibiliValidationSchemas = {
  单个视频作品数据: BilibiliVideoParamsSchema,
  单个视频下载信息数据: BilibiliVideoDownloadParamsSchema,
  评论数据: BilibiliCommentParamsSchema,
  指定评论的回复: BilibiliCommentReplyParamsSchema,
  用户主页数据: BilibiliUserParamsSchema,
  用户主页动态列表数据: BilibiliUserParamsSchema,
  用户空间详细信息: BilibiliUserParamsSchema,
  Emoji数据: BilibiliEmojiParamsSchema,
  番剧基本信息数据: BilibiliBangumiInfoParamsSchema,
  番剧下载信息数据: BilibiliBangumiStreamParamsSchema,
  动态详情数据: BilibiliDynamicParamsSchema,
  动态卡片数据: BilibiliDynamicParamsSchema,
  直播间信息: BilibiliLiveParamsSchema,
  直播间初始化信息: BilibiliLiveParamsSchema,
  登录基本信息: BilibiliLoginParamsSchema,
  申请二维码: BilibiliQrcodeParamsSchema,
  二维码状态: BilibiliQrcodeStatusParamsSchema,
  获取UP主总播放量: BilibiliUserParamsSchema,
  AV转BV: BilibiliAv2BvParamsSchema,
  BV转AV: BilibiliBv2AvParamsSchema,
  专栏正文内容: BilibiliArticleParamsSchema,
  专栏显示卡片信息: BilibiliArticleCardParamsSchema,
  专栏文章基本信息: BilibiliArticleInfoParamsSchema,
  文集基本信息: BilibiliColumnInfoParamsSchema,
  从_v_voucher_申请_captcha: BilibiliApplyCaptchaParamsSchema,
  验证验证码结果: BilibiliValidateCaptchaParamsSchema,
  实时弹幕: BilibiliDanmakuParamsSchema
} as const

export const BilibiliMethodRoutes = {
  单个视频作品数据: '/fetch_one_video',
  单个视频下载信息数据: '/fetch_video_playurl',
  评论数据: '/fetch_work_comments',
  指定评论的回复: '/fetch_comment_reply',
  用户主页数据: '/fetch_user_profile',
  用户主页动态列表数据: '/fetch_user_dynamic',
  用户空间详细信息: '/fetch_user_space_info',
  Emoji数据: '/fetch_emoji_list',
  番剧基本信息数据: '/fetch_bangumi_video_info',
  番剧下载信息数据: '/fetch_bangumi_video_playurl',
  动态详情数据: '/fetch_dynamic_info',
  动态卡片数据: '/fetch_dynamic_card',
  直播间信息: '/fetch_live_room_detail',
  直播间初始化信息: '/fetch_liveroom_def',
  登录基本信息: '/login_basic_info',
  申请二维码: '/new_login_qrcode',
  二维码状态: '/check_qrcode',
  获取UP主总播放量: '/fetch_user_full_view',
  AV转BV: '/av_to_bv',
  BV转AV: '/bv_to_av',
  专栏正文内容: '/fetch_article_content',
  专栏显示卡片信息: '/fetch_article_card',
  专栏文章基本信息: '/fetch_article_info',
  文集基本信息: '/fetch_column_info',
  从_v_voucher_申请_captcha: '/apply_captcha',
  验证验证码结果: '/validate_captcha',
  实时弹幕: '/fetch_danmaku'
} as const

export type BilibiliMethodType = keyof typeof BilibiliValidationSchemas
