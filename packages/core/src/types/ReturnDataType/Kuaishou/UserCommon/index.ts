// 它不是端点响应，而是 `userProfile` / `userWorkList` 共用的子结构，所以没有
// `KsUserCommon` 这样的主类型可以窄化，barrel 只把各子类型原样透出。
export type {
  KsBannedStatus,
  KsUserProfileCounts,
  KsUserProfileGameInfo,
  KsUserProfileLiveInfo,
  KsUserProfileSensitiveInfo,
  KsUserProfileUserInfo,
  KsVerifiedStatus
} from './UserCommon_V0'
