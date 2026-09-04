// 改名原因：`#178` 目录结构重构时漏改，这份一直是 `Kuaishou/UserCommon.ts` 扁平文件，
// 现在按目录约定归位成 `UserCommon/UserCommon_V0.ts` + 本 barrel。
//
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
