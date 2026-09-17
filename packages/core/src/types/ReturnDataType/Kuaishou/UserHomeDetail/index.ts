// barrel：本 barrel **没有**挂到 `Kuaishou/index.ts` 上，`KsUserHomeDetail` 不是对外名字 ——
// 对外只有 `KsUserProfile`（同形别名）与 `KsUserHomeWork`（经 UserWorkList 透出）。
import { KsUserHomeDetail_V0 } from './UserHomeDetail_V0'

export type KsUserHomeDetail = KsUserHomeDetail_V0
