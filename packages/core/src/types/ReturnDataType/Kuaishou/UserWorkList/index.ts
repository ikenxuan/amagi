// barrel：对外名字 `KsUserWorkList` 与 `KuaishouReturnTypeMap.userWorkList` 都在这里，
// 具体形状在 `UserWorkList_V0.ts`。
import { KsUserWorkList_V0 } from './UserWorkList_V0'

export type KsUserWorkList = KsUserWorkList_V0

// `KsUserHomeWork` 也从本 barrel 透出
export type { KsUserHomeWork } from './UserWorkList_V0'
