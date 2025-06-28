import { z } from 'zod'
import { smartNumber } from './utils'

// B站基础验证模式
export const BilibiliVideoParamsSchema = z.object({
  methodType: z.literal('单个视频作品数据'),
  /** 稿件BVID */
  bvid: z.string({ required_error: 'BVID不能为空' }).min(1, 'BVID不能为空')
})

export const BilibiliVideoDownloadParamsSchema = z.object({
  methodType: z.literal('单个视频下载信息数据'),
  /** 稿件AVID */
  avid: smartNumber('AVID不能为空', 1, true),
  /** 稿件cid */
  cid: smartNumber('CID不能为空', 1, true)
})

export const BilibiliCommentParamsSchema = z.object({
  methodType: z.literal('评论数据'),
  /** 稿件ID，也就是AV号去除前缀后的内容 */
  oid: smartNumber('OID不能为空', 1, true),
  /** 评论区类型代码 */
  type: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') {
        return undefined
      }
      const num = Number(val)
      if (isNaN(num)) {
        return val
      }
      if (!Number.isInteger(num)) {
        throw new Error('评论类型必须是整数')
      }
      return num
    },
    z.number({ required_error: '评论类型不能为空' })
      .int('评论类型必须是整数')
      .refine(
        (val) => [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 33].includes(val),
        { message: '无效的评论区类型' }
      )
  ),
  /** 获取的评论数量，默认20 */
  number: z.coerce.number().int().positive().default(20).optional(),
  /** 评论区页码，默认1 */
  pn: z.coerce.number().int().positive().default(1).optional(),
})

export const BilibiliUserParamsSchema = z.object({
  methodType: z.enum(['用户主页数据', '用户主页动态列表数据', '获取UP主总播放量']),
  /** UP主UID */
  host_mid: smartNumber('UP主UID不能为空', 1, true)
})

export const BilibiliEmojiParamsSchema = z.object({
  methodType: z.literal('Emoji数据')
})

// 番剧基本信息参数（ep_id 和 season_id 至少需要一个）
export const BilibiliBangumiInfoParamsSchema = z.object({
  methodType: z.literal('番剧基本信息数据'),
  /** 稿件ep_id，番剧的某一集（可选） */
  ep_id: z.string().min(1, '番剧EP ID不能为空').optional(),
  /** 稿件season_id，番剧索引（可选） */
  season_id: z.string().optional(),
}).refine(
  (data) => data.ep_id || data.season_id,
  {
    message: 'ep_id 和 season_id 至少需要提供一个',
    path: ['ep_id']
  }
)

// 番剧下载信息参数（cid 和 ep_id 都是必需的）
export const BilibiliBangumiStreamParamsSchema = z.object({
  methodType: z.literal('番剧下载信息数据'),
  /** 稿件cid（必需） */
  cid: smartNumber('CID不能为空', 1, true),
  /** 稿件ep_id，番剧的某一集（必需） */
  ep_id: z.string({ required_error: '番剧EP ID不能为空' }).min(1, '番剧EP ID不能为空'),
})

export const BilibiliDynamicParamsSchema = z.object({
  methodType: z.enum(['动态详情数据', '动态卡片数据']),
  /** 动态ID */
  dynamic_id: z.string({ required_error: '动态ID不能为空' }).min(1, '动态ID不能为空')
})

export const BilibiliLiveParamsSchema = z.object({
  methodType: z.enum(['直播间信息', '直播间初始化信息']),
  /** 直播间ID */
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
  /** 二维码key */
  qrcode_key: z.string({ required_error: '二维码key不能为空' }).min(1, '二维码key不能为空')
})

export const BilibiliAv2BvParamsSchema = z.object({
  methodType: z.literal('AV转BV'),
  /** 视频AV号 */
  avid: z.string({ required_error: 'AVID不能为空' }).min(1, 'AVID不能为空')
})

export const BilibiliBv2AvParamsSchema = z.object({
  methodType: z.literal('BV转AV'),
  /** 视频BV号 */
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

// 从 Zod 模式推断 TypeScript 类型
export type BilibiliVideoParams = z.infer<typeof BilibiliVideoParamsSchema>
export type BilibiliVideoDownloadParams = z.infer<typeof BilibiliVideoDownloadParamsSchema>
export type BilibiliCommentParams = z.infer<typeof BilibiliCommentParamsSchema>
export type BilibiliUserParams = z.infer<typeof BilibiliUserParamsSchema>
export type BilibiliEmojiParams = z.infer<typeof BilibiliEmojiParamsSchema>
export type BilibiliBangumiInfoParams = z.infer<typeof BilibiliBangumiInfoParamsSchema>
export type BilibiliBangumiStreamParams = z.infer<typeof BilibiliBangumiStreamParamsSchema>
export type BilibiliDynamicParams = z.infer<typeof BilibiliDynamicParamsSchema>
export type BilibiliLiveParams = z.infer<typeof BilibiliLiveParamsSchema>
export type BilibiliLoginParams = z.infer<typeof BilibiliLoginParamsSchema>
export type BilibiliQrcodeParams = z.infer<typeof BilibiliQrcodeParamsSchema>
export type BilibiliQrcodeStatusParams = z.infer<typeof BilibiliQrcodeStatusParamsSchema>
export type BilibiliAv2BvParams = z.infer<typeof BilibiliAv2BvParamsSchema>
export type BilibiliBv2AvParams = z.infer<typeof BilibiliBv2AvParamsSchema>

// 方法选项映射类型
export interface BilibiliMethodOptionsMap {
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
