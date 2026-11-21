import type { AppMusicInfo_V0 } from './AppMusicInfo_V0'

export type AppMusicInfoSuccess = AppMusicInfo_V0
export type AppMusicInfoError = never
export type AppMusicInfo = AppMusicInfoSuccess | AppMusicInfoError
