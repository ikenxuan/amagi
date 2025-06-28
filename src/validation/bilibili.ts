import { z } from 'zod'

// B站基础验证模式
export const BilibiliVideoParamsSchema = z.object({
  methodType: z.literal('单个视频作品数据'),
  bvid: z.string({ required_error: 'BVID不能为空' }).min(1, 'BVID不能为空')
})

export const BilibiliVideoDownloadParamsSchema = z.object({
  methodType: z.literal('单个视频下载信息数据'),
  avid: z.coerce.number({ required_error: 'AVID不能为空' }).min(1, 'AVID不能为空'),
  cid: z.coerce.number({ required_error: 'CID不能为空' }).min(1, 'CID不能为空')
})

export const BilibiliCommentParamsSchema = z.object({
  methodType: z.literal('评论数据'),
  oid: z.string({ required_error: 'OID不能为空' }).min(1, 'OID不能为空'),
  type: z.coerce
    .number({ required_error: '评论类型不能为空' })
    .int()
    .refine(
      (val) => [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 33].includes(val),
      { message: '无效的评论区类型' }
    ),
  pagination_str: z.string().optional()
})

export const BilibiliUserParamsSchema = z.object({
  methodType: z.enum(['用户主页数据', '用户主页动态列表数据']),
  host_mid: z.coerce.number({ required_error: 'UP主UID不能为空' }).min(1, 'UP主UID不能为空')
})

export const BilibiliEmojiParamsSchema = z.object({
  methodType: z.literal('Emoji数据'),
})

export const BilibiliBangumiParamsSchema = z.object({
  methodType: z.enum(['番剧基本信息数据', '番剧下载信息数据']),
  ep_id: z.string({ required_error: '番剧EP ID不能为空' }).min(1, '番剧EP ID不能为空')
})

export const BilibiliDynamicParamsSchema = z.object({
  methodType: z.enum(['动态详情数据', '动态卡片数据']),
  dynamic_id: z.string({ required_error: '动态ID不能为空' }).min(1, '动态ID不能为空')
})

export const BilibiliLiveParamsSchema = z.object({
  methodType: z.enum(['直播间信息', '直播间初始化信息']),
  room_id: z.string({ required_error: '直播间ID不能为空' }).min(1, '直播间ID不能为空')
})

export const BilibiliLoginParamsSchema = z.object({
  methodType: z.literal('登录基本信息')
})

export const BilibiliQrcodeParamsSchema = z.object({
  methodType: z.literal('申请二维码')
})

export const BilibiliQrcodeStatusParamsSchema = z.object({
  methodType: z.literal('二维码状态'),
  qrcode_key: z.string({ required_error: '二维码key不能为空' }).min(1, '二维码key不能为空')
})

export const BilibiliUpStatParamsSchema = z.object({
  methodType: z.literal('获取UP主总播放量'),
  host_mid: z.coerce.number({ required_error: 'UP主UID不能为空' }).min(1, 'UP主UID不能为空')
})

export const BilibiliAv2BvParamsSchema = z.object({
  methodType: z.literal('AV转BV'),
  avid: z.string({ required_error: 'AVID不能为空' }).min(1, 'AVID不能为空')
})

export const BilibiliBv2AvParamsSchema = z.object({
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
  '番剧基本信息数据': BilibiliBangumiParamsSchema,
  '番剧下载信息数据': BilibiliBangumiParamsSchema,
  '动态详情数据': BilibiliDynamicParamsSchema,
  '动态卡片数据': BilibiliDynamicParamsSchema,
  '直播间信息': BilibiliLiveParamsSchema,
  '直播间初始化信息': BilibiliLiveParamsSchema,
  '登录基本信息': BilibiliLoginParamsSchema,
  '申请二维码': BilibiliQrcodeParamsSchema,
  '二维码状态': BilibiliQrcodeStatusParamsSchema,
  '获取UP主总播放量': BilibiliUpStatParamsSchema,
  'AV转BV': BilibiliAv2BvParamsSchema,
  'BV转AV': BilibiliBv2AvParamsSchema
} as const

export type BilibiliMethodType = keyof typeof BilibiliValidationSchemas