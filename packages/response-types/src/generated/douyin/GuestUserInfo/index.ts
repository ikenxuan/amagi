import type { GuestUserInfo_V0 } from './GuestUserInfo_V0'

export type GuestUserInfoSuccess = GuestUserInfo_V0
export type GuestUserInfoError = never
export type GuestUserInfo = GuestUserInfoSuccess | GuestUserInfoError
