import { z } from 'zod'

import type { BilibiliMethodOptionsMap } from '../types'
import { smartNumber } from './utils'

/**
 * 视频信息参数类型
 */
export type BilibiliVideoParams = BilibiliMethodOptionsMap['VideoInfoParams']
/**
 * 视频下载参数类型
 */
export type BilibiliVideoDownloadParams = BilibiliMethodOptionsMap['VideoStreamParams']
/**
 * 评论参数类型
 */
export type BilibiliCommentParams = BilibiliMethodOptionsMap['CommentParams']
/**
 * 用户信息参数类型
 */
export type BilibiliUserParams = BilibiliMethodOptionsMap['UserParams']
/**
 * 表情包参数类型
 */
export type BilibiliEmojiParams = BilibiliMethodOptionsMap['EmojiParams']
/**
 * 番剧信息参数类型
 */
export type BilibiliBangumiInfoParams = BilibiliMethodOptionsMap['BangumiInfoParams']
/**
 * 番剧下载参数类型
 */
export type BilibiliBangumiStreamParams = BilibiliMethodOptionsMap['BangumiStreamParams']
/**
 * 动态信息参数类型
 */
export type BilibiliDynamicParams = BilibiliMethodOptionsMap['DynamicParams']
/**
 * 直播间参数类型
 */
export type BilibiliLiveParams = BilibiliMethodOptionsMap['LiveRoomParams']
/**
 * 登录参数类型
 */
export type BilibiliLoginParams = BilibiliMethodOptionsMap['LoginBaseInfoParams']
/**
 * 二维码获取参数类型
 */
export type BilibiliQrcodeParams = BilibiliMethodOptionsMap['GetQrcodeParams']
/**
 * 二维码状态参数类型
 */
export type BilibiliQrcodeStatusParams = BilibiliMethodOptionsMap['QrcodeParams']
/**
 * AV号转BV号参数类型
 */
export type BilibiliAv2BvParams = BilibiliMethodOptionsMap['Av2BvParams']
/**
 * BV号转AV号参数类型
 */
export type BilibiliBv2AvParams = BilibiliMethodOptionsMap['Bv2AvParams']
/**
 * 专栏正文内容参数类型
 */
export type BilibiliArticleParams = BilibiliMethodOptionsMap['ArticleParams']

/**
 * 专栏显示卡片信息参数类型
 */
export type BilibiliArticleCardParams = BilibiliMethodOptionsMap['ArticleCardParams']

/**
 * 专栏文章基本信息参数类型
 */
export type BilibiliArticleInfoParams = BilibiliMethodOptionsMap['ArticleInfoParams']

/**
 * 文集基本信息参数类型
 */
export type BilibiliColumnInfoParams = BilibiliMethodOptionsMap['ColumnInfoParams']

// B站基础验证模式
export const BilibiliVideoParamsSchema: z.ZodType<BilibiliVideoParams> = z.object({
  methodType: z.literal('单个视频作品数据', { error: '方法类型必须是"单个视频作品数据"' }),
  bvid: z.string({ error: 'BVID必须是字符串' }).min(1, { error: 'BVID不能为空' })
})

export const BilibiliVideoDownloadParamsSchema: z.ZodType<BilibiliVideoDownloadParams> = z.object({
  methodType: z.literal('单个视频下载信息数据', { error: '方法类型必须是"单个视频下载信息数据"' }),
  avid: smartNumber('AVID不能为空', 1, true),
  cid: smartNumber('CID不能为空', 1, true)
})

export const BilibiliCommentParamsSchema: z.ZodType<BilibiliCommentParams> = z.object({
  methodType: z.literal('评论数据', { error: '方法类型必须是"评论数据"' }),
  oid: z.string({ error: 'OID必须是字符串' }).min(1, { error: 'OID不能为空' }),
  type: smartNumber('评论类型不能为空', 1, true)
    .refine(
      (val) => [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 33].includes(val),
      { error: '无效的评论区类型' }
    ),
  number: z.coerce.number({ error: '评论数量必须是数字' })
    .int({ error: '评论数量必须是整数' })
    .positive({ error: '评论数量必须是正数' })
    .default(20)
    .optional(),
  pn: z.coerce.number({ error: '页码必须是数字' })
    .int({ error: '页码必须是整数' })
    .positive({ error: '页码必须是正数' })
    .default(1)
    .optional()
})

export const BilibiliUserParamsSchema: z.ZodType<BilibiliUserParams> = z.object({
  methodType: z.enum(['用户主页数据', '用户主页动态列表数据', '获取UP主总播放量'], {
    error: '方法类型必须是指定的枚举值之一'
  }),
  host_mid: smartNumber('UP主UID不能为空', 1, true)
})

export const BilibiliEmojiParamsSchema: z.ZodType<BilibiliEmojiParams> = z.object({
  methodType: z.literal('Emoji数据', { error: '方法类型必须是"Emoji数据"' })
})

export const BilibiliBangumiInfoParamsSchema: z.ZodType<BilibiliBangumiInfoParams> = z.object({
  methodType: z.literal('番剧基本信息数据', { error: '方法类型必须是"番剧基本信息数据"' }),
  ep_id: z.string({ error: '番剧EP ID必须是字符串' }).min(1, { error: '番剧EP ID不能为空' }).optional(),
  season_id: z.string({ error: '番剧季度ID必须是字符串' }).optional()
}).refine(
  (data) => data.ep_id ?? data.season_id,
  {
    error: 'ep_id 和 season_id 至少需要提供一个',
    path: ['ep_id']
  }
)

export const BilibiliBangumiStreamParamsSchema: z.ZodType<BilibiliBangumiStreamParams> = z.object({
  methodType: z.literal('番剧下载信息数据', { error: '方法类型必须是"番剧下载信息数据"' }),
  cid: smartNumber('CID不能为空', 1, true),
  ep_id: z.string({ error: '番剧EP ID必须是字符串' }).min(1, { error: '番剧EP ID不能为空' })
})

export const BilibiliDynamicParamsSchema: z.ZodType<BilibiliDynamicParams> = z.object({
  methodType: z.enum(['动态详情数据', '动态卡片数据'], {
    error: '方法类型必须是"动态详情数据"或"动态卡片数据"'
  }),
  dynamic_id: z.string({ error: '动态ID必须是字符串' }).min(1, { error: '动态ID不能为空' })
})

export const BilibiliLiveParamsSchema: z.ZodType<BilibiliLiveParams> = z.object({
  methodType: z.enum(['直播间信息', '直播间初始化信息'], {
    error: '方法类型必须是"直播间信息"或"直播间初始化信息"'
  }),
  room_id: z.string({ error: '直播间ID必须是字符串' }).min(1, { error: '直播间ID不能为空' })
})

export const BilibiliLoginParamsSchema: z.ZodType<BilibiliLoginParams> = z.object({
  methodType: z.literal('登录基本信息', { error: '方法类型必须是"登录基本信息"' })
})

export const BilibiliQrcodeParamsSchema: z.ZodType<BilibiliQrcodeParams> = z.object({
  methodType: z.literal('申请二维码', { error: '方法类型必须是"申请二维码"' })
})

export const BilibiliQrcodeStatusParamsSchema: z.ZodType<BilibiliQrcodeStatusParams> = z.object({
  methodType: z.literal('二维码状态', { error: '方法类型必须是"二维码状态"' }),
  qrcode_key: z.string({ error: '二维码key必须是字符串' }).min(1, { error: '二维码key不能为空' })
})

export const BilibiliAv2BvParamsSchema: z.ZodType<BilibiliAv2BvParams> = z.object({
  methodType: z.literal('AV转BV', { error: '方法类型必须是"AV转BV"' }),
  avid: z.coerce.number({ error: 'AVID必须是数字' })
    .int({ error: 'AVID必须是整数' })
    .positive({ error: 'AVID必须是正数' })
})

export const BilibiliBv2AvParamsSchema: z.ZodType<BilibiliBv2AvParams> = z.object({
  methodType: z.literal('BV转AV', { error: '方法类型必须是"BV转AV"' }),
  bvid: z.string({ error: 'BVID必须是字符串' }).min(1, { error: 'BVID不能为空' })
})

export const BilibiliArticleParamsSchema: z.ZodType<BilibiliArticleParams> = z.object({
  methodType: z.literal('专栏正文内容', { error: '方法类型必须是"专栏正文内容"' }),
  id: z.string({ error: '专栏ID必须是字符串' }).min(1, { error: '专栏ID不能为空' })
})

export const BilibiliArticleCardParamsSchema: z.ZodType<BilibiliArticleCardParams> = z.object({
  methodType: z.literal('专栏显示卡片信息', { error: '方法类型必须是"专栏显示卡片信息"' }),
  ids: z.union([
    z.array(z.string({ error: '被查询的 id 列表必须是字符串数组' })).min(1, { error: '被查询的 id 列表不能为空' }),
    z.string({ error: '被查询的 id 列表必须是字符串' }).min(1, { error: '被查询的 id 列表不能为空' })
  ])
})

export const BilibiliArticleInfoParamsSchema: z.ZodType<BilibiliArticleInfoParams> = z.object({
  methodType: z.literal('专栏文章基本信息', { error: '方法类型必须是"专栏文章基本信息"' }),
  id: z.string({ error: '专栏ID必须是字符串' }).min(1, { error: '专栏ID不能为空' })
})

export const BilibiliColumnInfoParamsSchema: z.ZodType<BilibiliColumnInfoParams> = z.object({
  methodType: z.literal('文集基本信息', { error: '方法类型必须是"文集基本信息"' }),
  id: z.string({ error: '文集ID必须是字符串' }).min(1, { error: '文集ID不能为空' })
})

// B站参数验证模式映射
export const BilibiliValidationSchemas = {
  单个视频作品数据: BilibiliVideoParamsSchema,
  单个视频下载信息数据: BilibiliVideoDownloadParamsSchema,
  评论数据: BilibiliCommentParamsSchema,
  用户主页数据: BilibiliUserParamsSchema,
  用户主页动态列表数据: BilibiliUserParamsSchema,
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
  文集基本信息: BilibiliColumnInfoParamsSchema
} as const

// 方法选项映射类型 - 现在直接使用 types 文件夹中的定义
export type { BilibiliMethodOptionsMap } from '../types'

export type BilibiliMethodType = keyof typeof BilibiliValidationSchemas
