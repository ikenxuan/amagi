import type { MusicInfo_V0 } from './MusicInfo_V0'

export type MusicInfoSuccess = MusicInfo_V0
export type MusicInfoError = never
export type MusicInfo = MusicInfoSuccess | MusicInfoError
