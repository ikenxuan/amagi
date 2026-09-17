import type { UserSpaceInfo_V0 } from './UserSpaceInfo_V0'

export type UserSpaceInfoSuccess = UserSpaceInfo_V0
export type UserSpaceInfoError = never
export type UserSpaceInfo = UserSpaceInfoSuccess | UserSpaceInfoError
