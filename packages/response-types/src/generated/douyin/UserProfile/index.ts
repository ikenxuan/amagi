import type { UserProfile_V0 } from './UserProfile_V0'

export type UserProfileSuccess = UserProfile_V0
export type UserProfileError = never
export type UserProfile = UserProfileSuccess | UserProfileError
