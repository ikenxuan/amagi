// 改名原因：`#178` 目录结构重构时漏改，这份一直是 `Kuaishou/UserProfile.ts` 扁平文件，
// 现在按目录约定归位成 `UserProfile/UserProfile_V0.ts` + 本 barrel。
// 对外名字 `KsUserProfile` 与 `KuaishouReturnTypeMap.userProfile` 都没动，只挪了文件位置。
import { KsUserProfile_V0 } from './UserProfile_V0'

export type KsUserProfile = KsUserProfile_V0

// 这几个公共子结构原先由扁平的 `UserProfile.ts` 直接透出，`Kuaishou/index.ts` 的
// `export * from './UserProfile/index'` 靠它们；barrel 接着透出，对外可见集合不变
export type {
  KsBannedStatus,
  KsUserProfileCounts,
  KsUserProfileGameInfo,
  KsUserProfileLiveInfo,
  KsUserProfileSensitiveInfo,
  KsUserProfileUserInfo,
  KsVerifiedStatus
} from './UserProfile_V0'
