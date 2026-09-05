import type { KsUserHomeDetail_V0 } from '../UserHomeDetail/UserHomeDetail_V0'

/**
 * 快手 `userProfile` 响应类型。
 *
 * 与 `KsUserHomeDetail_V0` 同形：`live_api/profile/home` 一条响应同时喂
 * `userProfile` 与 `userWorkList` 两个端点，形状只声明一份。
 */
export type KsUserProfile_V0 = KsUserHomeDetail_V0

// 这几个公共子结构历史上就由 UserProfile 这一层对外透出（`Kuaishou/index.ts` 的
// `export * from './UserProfile'` 依赖它们），搬目录时原样保留，一个名字都不能丢
export type {
  KsBannedStatus,
  KsUserProfileCounts,
  KsUserProfileGameInfo,
  KsUserProfileLiveInfo,
  KsUserProfileSensitiveInfo,
  KsUserProfileUserInfo,
  KsVerifiedStatus
} from '../UserCommon/UserCommon_V0'
