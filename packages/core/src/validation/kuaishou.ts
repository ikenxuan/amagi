import { KuaishouMethodOptionsMap } from 'amagi/types/KuaishouAPIParams'
import zod from 'zod'

/**
 * 快手视频参数验证模式
 */
export const KuaishouVideoParamsSchema: zod.ZodType<KuaishouMethodOptionsMap['VideoInfoParams']> = zod.object({
  methodType: zod.literal('videoWork', { error: 'methodType must be "videoWork"' }),
  photoId: zod.string({ error: 'photoId must be a string' }).min(1, { error: 'photoId cannot be empty' })
})

/**
 * 快手评论参数验证模式
 */
export const KuaishouCommentParamsSchema: zod.ZodType<KuaishouMethodOptionsMap['CommentParams']> = zod.object({
  methodType: zod.literal('comments', { error: 'methodType must be "comments"' }),
  photoId: zod.string({ error: 'photoId must be a string' }).min(1, { error: 'photoId cannot be empty' })
})

/**
 * 快手用户主页参数验证模式
 */
export const KuaishouUserProfileParamsSchema: zod.ZodType<KuaishouMethodOptionsMap['UserProfileParams']> = zod.object({
  methodType: zod.literal('userProfile', { error: 'methodType must be "userProfile"' }),
  principalId: zod.string({ error: 'principalId must be a string' }).min(1, { error: 'principalId cannot be empty' })
})

/**
 * 快手用户作品列表参数验证模式
 */
export const KuaishouUserWorkListParamsSchema: zod.ZodType<KuaishouMethodOptionsMap['UserWorkListParams']> = zod.object({
  methodType: zod.literal('userWorkList', { error: 'methodType must be "userWorkList"' }),
  principalId: zod.string({ error: 'principalId must be a string' }).min(1, { error: 'principalId cannot be empty' }),
  pcursor: zod.string({ error: 'pcursor must be a string' }).optional(),
  count: zod.number({ error: 'count must be a number' }).int({ error: 'count must be an integer' }).positive({ error: 'count must be positive' }).max(100, { error: 'count must be less than or equal to 100' }).optional()
})

/**
 * 快手直播间信息参数验证模式
 */
export const KuaishouLiveRoomInfoParamsSchema: zod.ZodType<KuaishouMethodOptionsMap['LiveRoomInfoParams']> = zod.object({
  methodType: zod.literal('liveRoomInfo', { error: 'methodType must be "liveRoomInfo"' }),
  principalId: zod.string({ error: 'principalId must be a string' }).min(1, { error: 'principalId cannot be empty' })
})

/**
 * 快手表情参数验证模式
 */
export const KuaishouEmojiParamsSchema: zod.ZodType<KuaishouMethodOptionsMap['EmojiListParams']> = zod.object({
  methodType: zod.literal('emojiList', { error: 'methodType must be "emojiList"' })
})

/**
 * 快手参数验证模式映射
 */
export const KuaishouValidationSchemas = {
  videoWork: KuaishouVideoParamsSchema,
  comments: KuaishouCommentParamsSchema,
  userProfile: KuaishouUserProfileParamsSchema,
  userWorkList: KuaishouUserWorkListParamsSchema,
  liveRoomInfo: KuaishouLiveRoomInfoParamsSchema,
  emojiList: KuaishouEmojiParamsSchema
} as const

/**
 * 快手方法路由映射
 */
export const KuaishouMethodRoutes = {
  videoWork: '/fetch_one_work',
  comments: '/fetch_work_comments',
  userProfile: '/fetch_user_profile',
  userWorkList: '/fetch_user_work_list',
  liveRoomInfo: '/fetch_live_room_info',
  emojiList: '/fetch_emoji_list'
} as const

export type KuaishouMethodType = keyof typeof KuaishouValidationSchemas
