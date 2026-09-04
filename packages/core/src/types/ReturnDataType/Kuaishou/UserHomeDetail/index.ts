// 改名原因：`#178` 目录结构重构时漏改，这份一直是 `Kuaishou/UserHomeDetail.ts` 扁平文件，
// 现在按目录约定归位成 `UserHomeDetail/UserHomeDetail_V0.ts` + 本 barrel。
//
// 注意本 barrel **没有**挂到 `Kuaishou/index.ts` 上：`KsUserHomeDetail` 历来不是对外名字，
// 对外只有 `KsUserProfile`（同形别名）与 `KsUserHomeWork`（经 UserWorkList 透出）。
import { KsUserHomeDetail_V0 } from './UserHomeDetail_V0'

export type KsUserHomeDetail = KsUserHomeDetail_V0
