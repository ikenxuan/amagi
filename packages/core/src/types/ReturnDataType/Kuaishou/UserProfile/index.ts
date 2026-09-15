// barrel：对外名字 `KsUserProfile` 与 `KuaishouReturnTypeMap.userProfile` 都在这里，
// 具体形状在 `UserProfile_V0.ts`。
import { KsUserProfile_V0 } from './UserProfile_V0'

export type KsUserProfile = KsUserProfile_V0

// 这几个公共子结构也从本 barrel 透出，`Kuaishou/index.ts` 靠它们拿到
export type {
  KsBannedStatus,
  KsUserProfileCounts,
  KsUserProfileGameInfo,
  KsUserProfileLiveInfo,
  KsUserProfileSensitiveInfo,
  KsUserProfileUserInfo,
  KsVerifiedStatus
} from './UserProfile_V0'
