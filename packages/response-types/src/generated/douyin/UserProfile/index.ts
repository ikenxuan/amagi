import type { UserProfile_V0 } from './UserProfile_V0'
import type { UserProfile_V1 } from './UserProfile_V1'

export type UserProfileSuccess = UserProfile_V0 | UserProfile_V1
export type UserProfileError = never
export type UserProfile = UserProfileSuccess | UserProfileError
