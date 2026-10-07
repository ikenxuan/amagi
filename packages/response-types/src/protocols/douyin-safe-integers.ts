import type * as Generated from '../generated/douyin'

/** 构建期元数据，由类型投影和 OpenAPI 生成器共用。 */
export const INTEGER_ID_KEYS = ['author_user_id', 'comment_gid', 'stream_id'] as const

/**
 * 只适配已提交的生成声明中含有这些数值字段的响应族，源录制样本保持不动，详见 README.md。
 * 这些常量不属于 response-types 包的公开导出。
 */
export const INTEGER_SAFE_RESPONSE_NAMES = [
  'DouyinCommentsResponse',
  'DouyinImageAlbumWorkResponse',
  'DouyinLiveRoomInfoResponse',
  'DouyinMusicInfoResponse',
  'DouyinParseWorkResponse',
  'DouyinSearchResponse',
  'DouyinSlidesWorkResponse',
  'DouyinTextWorkResponse',
  'DouyinUserFavoriteListResponse',
  'DouyinUserRecommendListResponse',
  'DouyinUserVideoListResponse',
  'DouyinVideoWorkResponse'
] as const

type IntegerIdKey = (typeof INTEGER_ID_KEYS)[number]
type SafeInteger<T> = number extends T ? T | string : T

/**
 * 保留数组、联合、可选字段、`null`、`unknown` 以及已有的 `any` 边界。
 * 只有白名单内的 ID 键，以及与显式 `id_str` 成对出现的 `id`，才会兼容字符串；
 * 计数、时间和数值字面量不受影响。
 */
export type DeepSafeIntegerIds<T> = 0 extends 1 & T
  ? T
  : T extends object
    ? {
        [Key in keyof T]: Key extends IntegerIdKey
          ? SafeInteger<T[Key]>
          : Key extends 'id'
            ? T extends { id_str: string }
              ? SafeInteger<T[Key]>
              : DeepSafeIntegerIds<T[Key]>
            : DeepSafeIntegerIds<T[Key]>
      }
    : T
export type SafeComments = DeepSafeIntegerIds<Generated.DouyinCommentsResponse>
export type SafeCommentsSuccess = DeepSafeIntegerIds<Generated.DouyinCommentsResponseSuccess>
export type SafeCommentsError = DeepSafeIntegerIds<Generated.DouyinCommentsResponseError>
export type SafeImageAlbumWork = DeepSafeIntegerIds<Generated.DouyinImageAlbumWorkResponse>
export type SafeImageAlbumWorkSuccess = DeepSafeIntegerIds<Generated.DouyinImageAlbumWorkResponseSuccess>
export type SafeImageAlbumWorkError = DeepSafeIntegerIds<Generated.DouyinImageAlbumWorkResponseError>
export type SafeLiveRoomInfo = DeepSafeIntegerIds<Generated.DouyinLiveRoomInfoResponse>
export type SafeLiveRoomInfoSuccess = DeepSafeIntegerIds<Generated.DouyinLiveRoomInfoResponseSuccess>
export type SafeLiveRoomInfoError = DeepSafeIntegerIds<Generated.DouyinLiveRoomInfoResponseError>
export type SafeMusicInfo = DeepSafeIntegerIds<Generated.DouyinMusicInfoResponse>
export type SafeMusicInfoSuccess = DeepSafeIntegerIds<Generated.DouyinMusicInfoResponseSuccess>
export type SafeMusicInfoError = DeepSafeIntegerIds<Generated.DouyinMusicInfoResponseError>
export type SafeParseWork = DeepSafeIntegerIds<Generated.DouyinParseWorkResponse>
export type SafeParseWorkSuccess = DeepSafeIntegerIds<Generated.DouyinParseWorkResponseSuccess>
export type SafeParseWorkError = DeepSafeIntegerIds<Generated.DouyinParseWorkResponseError>
export type SafeSearch = DeepSafeIntegerIds<Generated.DouyinSearchResponse>
export type SafeSearchSuccess = DeepSafeIntegerIds<Generated.DouyinSearchResponseSuccess>
export type SafeSearchError = DeepSafeIntegerIds<Generated.DouyinSearchResponseError>
export type SafeSlidesWork = DeepSafeIntegerIds<Generated.DouyinSlidesWorkResponse>
export type SafeSlidesWorkSuccess = DeepSafeIntegerIds<Generated.DouyinSlidesWorkResponseSuccess>
export type SafeSlidesWorkError = DeepSafeIntegerIds<Generated.DouyinSlidesWorkResponseError>
export type SafeTextWork = DeepSafeIntegerIds<Generated.DouyinTextWorkResponse>
export type SafeTextWorkSuccess = DeepSafeIntegerIds<Generated.DouyinTextWorkResponseSuccess>
export type SafeTextWorkError = DeepSafeIntegerIds<Generated.DouyinTextWorkResponseError>
export type SafeUserFavoriteList = DeepSafeIntegerIds<Generated.DouyinUserFavoriteListResponse>
export type SafeUserFavoriteListSuccess = DeepSafeIntegerIds<Generated.DouyinUserFavoriteListResponseSuccess>
export type SafeUserFavoriteListError = DeepSafeIntegerIds<Generated.DouyinUserFavoriteListResponseError>
export type SafeUserRecommendList = DeepSafeIntegerIds<Generated.DouyinUserRecommendListResponse>
export type SafeUserRecommendListSuccess = DeepSafeIntegerIds<Generated.DouyinUserRecommendListResponseSuccess>
export type SafeUserRecommendListError = DeepSafeIntegerIds<Generated.DouyinUserRecommendListResponseError>
export type SafeUserVideoList = DeepSafeIntegerIds<Generated.DouyinUserVideoListResponse>
export type SafeUserVideoListSuccess = DeepSafeIntegerIds<Generated.DouyinUserVideoListResponseSuccess>
export type SafeUserVideoListError = DeepSafeIntegerIds<Generated.DouyinUserVideoListResponseError>
export type SafeVideoWork = DeepSafeIntegerIds<Generated.DouyinVideoWorkResponse>
export type SafeVideoWorkSuccess = DeepSafeIntegerIds<Generated.DouyinVideoWorkResponseSuccess>
export type SafeVideoWorkError = DeepSafeIntegerIds<Generated.DouyinVideoWorkResponseError>
