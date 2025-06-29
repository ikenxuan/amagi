import { z } from 'zod'
import { smartNumber } from './utils'

/**
 * @description B站单个视频作品请求参数
 */
export type BilibiliVideoParams = {
  /** 方法类型 */
  methodType: '单个视频作品数据'
  /** 稿件BVID */
  bvid: string
}

/**
 * @description B站单个视频下载信息请求参数
 */
export type BilibiliVideoDownloadParams = {
  /** 方法类型 */
  methodType: '单个视频下载信息数据'
  /** 稿件AVID */
  avid: number
  /** 稿件cid */
  cid: number
}

/**
 * @description B站评论数据请求参数
 */
export type BilibiliCommentParams = {
  /** 方法类型 */
  methodType: '评论数据'
  /** 稿件ID，也就是AV号去除前缀后的内容 */
  oid: number
  /** 评论区类型代码 */
  type: number
  /** 获取的评论数量，默认20 */
  number?: number
  /** 评论区页码，默认1 */
  pn?: number
}

/**
 * @description B站用户相关请求参数
 */
export type BilibiliUserParams = {
  /** 方法类型 */
  methodType: '用户主页数据' | '用户主页动态列表数据' | '获取UP主总播放量'
  /** UP主UID */
  host_mid: number
}

/**
 * @description B站Emoji数据请求参数
 */
export type BilibiliEmojiParams = {
  /** 方法类型 */
  methodType: 'Emoji数据'
}

/**
 * @description B站番剧基本信息请求参数
 */
export type BilibiliBangumiInfoParams = {
  /** 方法类型 */
  methodType: '番剧基本信息数据'
  /** 稿件ep_id，番剧的某一集（可选） */
  ep_id?: string
  /** 稿件season_id，番剧索引（可选） */
  season_id?: string
}

/**
 * @description B站番剧下载信息请求参数
 */
export type BilibiliBangumiStreamParams = {
  /** 方法类型 */
  methodType: '番剧下载信息数据'
  /** 稿件cid（必需） */
  cid: number
  /** 稿件ep_id，番剧的某一集（必需） */
  ep_id: string
}

/**
 * @description B站动态相关请求参数
 */
export type BilibiliDynamicParams = {
  /** 方法类型 */
  methodType: '动态详情数据' | '动态卡片数据'
  /** 动态ID */
  dynamic_id: string
}

/**
 * @description B站直播间相关请求参数
 */
export type BilibiliLiveParams = {
  /** 方法类型 */
  methodType: '直播间信息' | '直播间初始化信息'
  /** 直播间ID */
  room_id: string
}

/**
 * @description B站登录基本信息请求参数
 */
export type BilibiliLoginParams = {
  /** 方法类型 */
  methodType: '登录基本信息'
}

/**
 * @description B站申请二维码请求参数
 */
export type BilibiliQrcodeParams = {
  /** 方法类型 */
  methodType: '申请二维码'
}

/**
 * @description B站二维码状态请求参数
 */
export type BilibiliQrcodeStatusParams = {
  /** 方法类型 */
  methodType: '二维码状态'
  /** 二维码key */
  qrcode_key: string
}

/**
 * @description B站AV转BV请求参数
 */
export type BilibiliAv2BvParams = {
  /** 方法类型 */
  methodType: 'AV转BV'
  /** 视频AV号 */
  avid: string
}

/**
 * @description B站BV转AV请求参数
 */
export type BilibiliBv2AvParams = {
  /** 方法类型 */
  methodType: 'BV转AV'
  /** 视频BV号 */
  bvid: string
}

// B站基础验证模式
export const BilibiliVideoParamsSchema: z.ZodType<BilibiliVideoParams> = z.object({
  methodType: z.literal('单个视频作品数据'),
  bvid: z.string({ required_error: 'BVID不能为空' }).min(1, 'BVID不能为空')
})

export const BilibiliVideoDownloadParamsSchema: z.ZodType<BilibiliVideoDownloadParams> = z.object({
  methodType: z.literal('单个视频下载信息数据'),
  avid: smartNumber('AVID不能为空', 1, true),
  cid: smartNumber('CID不能为空', 1, true)
})

export const BilibiliCommentParamsSchema: z.ZodType<BilibiliCommentParams> = z.object({
  methodType: z.literal('评论数据'),
  oid: smartNumber('OID不能为空', 1, true),
  type: smartNumber('评论类型不能为空', 1, true)
    .refine(
      (val) => [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 33].includes(val),
      { message: '无效的评论区类型' }
    ),
  number: z.coerce.number().int().positive().default(20).optional(),
  pn: z.coerce.number().int().positive().default(1).optional(),
})

export const BilibiliUserParamsSchema: z.ZodType<BilibiliUserParams> = z.object({
  methodType: z.enum(['用户主页数据', '用户主页动态列表数据', '获取UP主总播放量']),
  host_mid: smartNumber('UP主UID不能为空', 1, true)
})

export const BilibiliEmojiParamsSchema: z.ZodType<BilibiliEmojiParams> = z.object({
  methodType: z.literal('Emoji数据')
})

export const BilibiliBangumiInfoParamsSchema: z.ZodType<BilibiliBangumiInfoParams> = z.object({
  methodType: z.literal('番剧基本信息数据'),
  ep_id: z.string().min(1, '番剧EP ID不能为空').optional(),
  season_id: z.string().optional(),
}).refine(
  (data) => data.ep_id || data.season_id,
  {
    message: 'ep_id 和 season_id 至少需要提供一个',
    path: ['ep_id']
  }
)

export const BilibiliBangumiStreamParamsSchema: z.ZodType<BilibiliBangumiStreamParams> = z.object({
  methodType: z.literal('番剧下载信息数据'),
  cid: smartNumber('CID不能为空', 1, true),
  ep_id: z.string({ required_error: '番剧EP ID不能为空' }).min(1, '番剧EP ID不能为空'),
})

export const BilibiliDynamicParamsSchema: z.ZodType<BilibiliDynamicParams> = z.object({
  methodType: z.enum(['动态详情数据', '动态卡片数据']),
  dynamic_id: z.string({ required_error: '动态ID不能为空' }).min(1, '动态ID不能为空')
})

export const BilibiliLiveParamsSchema: z.ZodType<BilibiliLiveParams> = z.object({
  methodType: z.enum(['直播间信息', '直播间初始化信息']),
  room_id: z.string({ required_error: '直播间ID不能为空' }).min(1, '直播间ID不能为空')
})

export const BilibiliLoginParamsSchema: z.ZodType<BilibiliLoginParams> = z.object({
  methodType: z.literal('登录基本信息')
})

export const BilibiliQrcodeParamsSchema: z.ZodType<BilibiliQrcodeParams> = z.object({
  methodType: z.literal('申请二维码')
})

export const BilibiliQrcodeStatusParamsSchema: z.ZodType<BilibiliQrcodeStatusParams> = z.object({
  methodType: z.literal('二维码状态'),
  qrcode_key: z.string({ required_error: '二维码key不能为空' }).min(1, '二维码key不能为空')
})

export const BilibiliAv2BvParamsSchema: z.ZodType<BilibiliAv2BvParams> = z.object({
  methodType: z.literal('AV转BV'),
  avid: z.string({ required_error: 'AVID不能为空' }).min(1, 'AVID不能为空')
})

export const BilibiliBv2AvParamsSchema: z.ZodType<BilibiliBv2AvParams> = z.object({
  methodType: z.literal('BV转AV'),
  bvid: z.string({ required_error: 'BVID不能为空' }).min(1, 'BVID不能为空')
})

// B站参数验证模式映射
export const BilibiliValidationSchemas = {
  '单个视频作品数据': BilibiliVideoParamsSchema,
  '单个视频下载信息数据': BilibiliVideoDownloadParamsSchema,
  '评论数据': BilibiliCommentParamsSchema,
  '用户主页数据': BilibiliUserParamsSchema,
  '用户主页动态列表数据': BilibiliUserParamsSchema,
  'Emoji数据': BilibiliEmojiParamsSchema,
  '番剧基本信息数据': BilibiliBangumiInfoParamsSchema,
  '番剧下载信息数据': BilibiliBangumiStreamParamsSchema,
  '动态详情数据': BilibiliDynamicParamsSchema,
  '动态卡片数据': BilibiliDynamicParamsSchema,
  '直播间信息': BilibiliLiveParamsSchema,
  '直播间初始化信息': BilibiliLiveParamsSchema,
  '登录基本信息': BilibiliLoginParamsSchema,
  '申请二维码': BilibiliQrcodeParamsSchema,
  '二维码状态': BilibiliQrcodeStatusParamsSchema,
  '获取UP主总播放量': BilibiliUserParamsSchema,
  'AV转BV': BilibiliAv2BvParamsSchema,
  'BV转AV': BilibiliBv2AvParamsSchema
} as const

// 方法选项映射类型
export type BilibiliMethodOptionsMap = {
  VideoInfoParams: BilibiliVideoParams
  VideoStreamParams: BilibiliVideoDownloadParams
  CommentParams: BilibiliCommentParams
  UserParams: BilibiliUserParams
  DynamicParams: BilibiliDynamicParams
  BangumiInfoParams: BilibiliBangumiInfoParams
  BangumiStreamParams: BilibiliBangumiStreamParams
  LiveRoomParams: BilibiliLiveParams
  QrcodeParams: BilibiliQrcodeStatusParams
  EmojiParams: BilibiliEmojiParams
  LoginBaseInfoParams: BilibiliLoginParams
  GetQrcodeParams: BilibiliQrcodeParams
  Bv2AvParams: BilibiliBv2AvParams
  Av2BvParams: BilibiliAv2BvParams
}

export type BilibiliMethodType = keyof typeof BilibiliValidationSchemas