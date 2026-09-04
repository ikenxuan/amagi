// 改名原因：`#178` 目录结构重构时漏改，这份一直是 `Kuaishou/UserWorkList.ts` 扁平文件，
// 现在按目录约定归位成 `UserWorkList/UserWorkList_V0.ts` + 本 barrel。
// 对外名字 `KsUserWorkList` 与 `KuaishouReturnTypeMap.userWorkList` 都没动，只挪了文件位置。
import { KsUserWorkList_V0 } from './UserWorkList_V0'

export type KsUserWorkList = KsUserWorkList_V0

// `KsUserHomeWork` 原先由扁平的 `UserWorkList.ts` 直接透出，barrel 接着透出
export type { KsUserHomeWork } from './UserWorkList_V0'
