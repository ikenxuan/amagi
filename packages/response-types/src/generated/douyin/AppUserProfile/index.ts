import type { AppUserProfile_V0 } from './AppUserProfile_V0'

export type AppUserProfileSuccess = AppUserProfile_V0
export type AppUserProfileError = never
export type AppUserProfile = AppUserProfileSuccess | AppUserProfileError
