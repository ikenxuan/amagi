import type { VideoInfo_V0 } from './VideoInfo_V0'

export type VideoInfoSuccess = VideoInfo_V0
export type VideoInfoError = never
export type VideoInfo = VideoInfoSuccess | VideoInfoError
