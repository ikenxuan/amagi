/**
 * 抖音参数验证模块
 *
 * 提供抖音 API 参数的 Zod 验证 Schema
 *
 * @module validation/douyin
 */

import { DouyinMethodOptionsMap } from 'amagi/types/DouyinAPIParams'
import zod from 'zod'

import { smartPositiveInteger } from './utils'

/** 作品参数验证 */
export const DouyinWorkParamsSchema: zod.ZodType<DouyinMethodOptionsMap['WorkParams']> = zod.object({
  methodType: zod.enum(['videoWork', 'imageAlbumWork', 'slidesWork', 'parseWork', 'textWork'], {
    error: '方法类型必须是指定的枚举值之一'
  }),
  aweme_id: zod.string({ error: '视频ID必须是字符串' }).min(1, { error: '视频ID不能为空' })
})

/** 评论参数验证 */
export const DouyinCommentParamsSchema: zod.ZodType<DouyinMethodOptionsMap['CommentParams']> = zod.object({
  methodType: zod.literal('comments', { error: '方法类型必须是"comments"' }),
  aweme_id: zod.string({ error: '视频ID必须是字符串' }).min(1, { error: '视频ID不能为空' }),
  number: smartPositiveInteger('评论数量必须是正整数').optional().default(50),
  cursor: zod.coerce.number({ error: '游标必须是数字' }).int({ error: '游标必须是整数' }).min(0, { error: '游标不能小于0' }).default(0).optional()
})

/** 热点词参数验证 */
export const DouyinHotWordsParamsSchema: zod.ZodType<DouyinMethodOptionsMap['HotWordsParams']> = zod.object({
  methodType: zod.literal('suggestWords', {
    error: '方法类型必须是"suggestWords"'
  }),
  query: zod.string({ error: '搜索词必须是字符串' }).min(1, { error: '搜索词不能为空' })
})

/** 搜索参数验证 */
export const DouyinSearchParamsSchema: zod.ZodType<DouyinMethodOptionsMap['SearchParams']> = zod.object({
  methodType: zod.literal('search', {
    error: '方法类型必须是"search"'
  }),
  query: zod.string({ error: '搜索词必须是字符串' }).min(1, { error: '搜索词不能为空' }),
  type: zod.enum(['general', 'user', 'video'], {
    error: '搜索类型必须是"general"、"user"或"video"'
  }).optional().default('general'),
  number: smartPositiveInteger('搜索数量必须是正整数').optional().default(10),
  search_id: zod.string({ error: '搜索ID必须是字符串' }).optional()
})

/** 评论回复参数验证 */
export const DouyinCommentReplyParamsSchema: zod.ZodType<DouyinMethodOptionsMap['CommentReplyParams']> = zod.object({
  methodType: zod.literal('commentReplies', { error: '方法类型必须是"commentReplies"' }),
  aweme_id: zod.string({ error: '视频ID必须是字符串' }).min(1, { error: '视频ID不能为空' }),
  comment_id: zod.string({ error: '评论ID必须是字符串' }).min(1, { error: '评论ID不能为空' }),
  number: smartPositiveInteger('评论数量必须是正整数').optional().default(5),
  cursor: zod.coerce.number({ error: '游标必须是数字' }).int({ error: '游标必须是整数' }).min(0, { error: '游标不能小于0' }).default(0).optional()
})

/** 用户参数验证 */
export const DouyinUserParamsSchema: zod.ZodType<DouyinMethodOptionsMap['UserParams']> = zod.object({
  methodType: zod.enum(['userProfile', 'userVideoList'], {
    error: '方法类型必须是指定的枚举值之一'
  }),
  sec_uid: zod.string({ error: '用户ID必须是字符串' }).min(1, { error: '用户ID不能为空' })
})

/** 音乐参数验证 */
export const DouyinMusicParamsSchema: zod.ZodType<DouyinMethodOptionsMap['MusicParams']> = zod.object({
  methodType: zod.literal('musicInfo', { error: '方法类型必须是"musicInfo"' }),
  music_id: zod.string({ error: '音乐ID必须是字符串' }).min(1, { error: '音乐ID不能为空' })
})

/** 直播间参数验证 */
export const DouyinLiveRoomParamsSchema: zod.ZodType<DouyinMethodOptionsMap['LiveRoomParams']> = zod.object({
  methodType: zod.literal('liveRoomInfo', { error: '方法类型必须是"liveRoomInfo"' }),
  web_rid: zod.string({ error: '直播间ID必须是字符串' }).min(1, { error: '直播间ID不能为空' }),
  room_id: zod.string({ error: '直播间ID必须是字符串' }).min(1, { error: '直播间ID不能为空' })
})

/** 二维码参数验证 */
export const DouyinQrcodeParamsSchema: zod.ZodType<DouyinMethodOptionsMap['QrcodeParams']> = zod.object({
  methodType: zod.literal('loginQrcode', { error: '方法类型必须是"loginQrcode"' }),
  verify_fp: zod.string({ error: 'fp指纹必须是字符串' }).min(1, { error: 'fp指纹不能为空' })
})

/** 表情列表参数验证 */
export const DouyinEmojiListParamsSchema: zod.ZodType<DouyinMethodOptionsMap['EmojiListParams']> = zod.object({
  methodType: zod.literal('emojiList', { error: '方法类型必须是"emojiList"' })
})

/** 动态表情参数验证 */
export const DouyinEmojiProParamsSchema: zod.ZodType<DouyinMethodOptionsMap['EmojiProParams']> = zod.object({
  methodType: zod.literal('dynamicEmojiList', { error: '方法类型必须是"dynamicEmojiList"' })
})

/** 弹幕参数验证 */
export const DouyinDanmakuParamsSchema: zod.ZodType<DouyinMethodOptionsMap['DanmakuParams']> = zod.object({
  methodType: zod.literal('danmakuList', { error: '方法类型必须是"danmakuList"' }),
  aweme_id: zod.string({ error: '视频ID必须是字符串' }).min(1, { error: '视频ID不能为空' }),
  start_time: zod.coerce.number({ error: '开始时间必须是数字' }).int({ error: '开始时间必须是整数' }).min(0, { error: '开始时间不能小于0' }).optional(),
  end_time: zod.coerce.number({ error: '结束时间必须是数字' }).int({ error: '结束时间必须是整数' }).min(0, { error: '结束时间不能小于0' }).optional(),
  duration: zod.coerce.number({ error: '视频时长必须是数字' }).int({ error: '视频时长必须是整数' }).min(0, { error: '视频时长不能小于0' })
}).refine(
  (data) => {
    if (data.end_time !== undefined) {
      return data.end_time <= data.duration
    }
    return true
  },
  {
    error: '获取弹幕区间的结束时间不能超过视频总时长',
    path: ['end_time']
  }
).refine(
  (data) => {
    if (data.start_time !== undefined && data.end_time !== undefined) {
      return data.start_time < data.end_time
    }
    return true
  },
  {
    error: '获取弹幕区间的开始时间必须小于结束时间',
    path: ['start_time']
  }
)

/** 抖音参数验证模式映射 */
export const DouyinValidationSchemas = {
  textWork: DouyinWorkParamsSchema,
  parseWork: DouyinWorkParamsSchema,
  videoWork: DouyinWorkParamsSchema,
  imageAlbumWork: DouyinWorkParamsSchema,
  slidesWork: DouyinWorkParamsSchema,
  comments: DouyinCommentParamsSchema,
  userProfile: DouyinUserParamsSchema,
  userVideoList: DouyinUserParamsSchema,
  suggestWords: DouyinHotWordsParamsSchema,
  search: DouyinSearchParamsSchema,
  musicInfo: DouyinMusicParamsSchema,
  liveRoomInfo: DouyinLiveRoomParamsSchema,
  loginQrcode: DouyinQrcodeParamsSchema,
  emojiList: DouyinEmojiListParamsSchema,
  dynamicEmojiList: DouyinEmojiProParamsSchema,
  commentReplies: DouyinCommentReplyParamsSchema,
  danmakuList: DouyinDanmakuParamsSchema
} as const

/** 抖音方法路由映射 */
export const DouyinMethodRoutes = {
  parseWork: '/fetch_one_work',
  textWork: '/fetch_one_work',
  videoWork: '/fetch_one_work',
  imageAlbumWork: '/fetch_one_work',
  slidesWork: '/fetch_one_work',
  comments: '/fetch_work_comments',
  commentReplies: '/fetch_video_comment_replies',
  userProfile: '/fetch_user_info',
  userVideoList: '/fetch_user_post_videos',
  search: '/fetch_search_info',
  suggestWords: '/fetch_suggest_words',
  musicInfo: '/fetch_music_work',
  emojiList: '/fetch_emoji_list',
  dynamicEmojiList: '/fetch_emoji_pro_list',
  liveRoomInfo: '/fetch_user_live_videos',
  danmakuList: '/fetch_work_danmaku',
  loginQrcode: '/fetch_login_qrcode'
} as const

/** 抖音方法类型 */
export type DouyinMethodType = keyof typeof DouyinValidationSchemas
