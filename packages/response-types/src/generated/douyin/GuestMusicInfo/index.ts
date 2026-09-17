import type { GuestMusicInfo_V0 } from './GuestMusicInfo_V0'

export type GuestMusicInfoSuccess = GuestMusicInfo_V0
export type GuestMusicInfoError = never
export type GuestMusicInfo = GuestMusicInfoSuccess | GuestMusicInfoError
