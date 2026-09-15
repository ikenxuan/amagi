import type { VideoStream_V0 } from './VideoStream_V0'

export type VideoStreamSuccess = VideoStream_V0
export type VideoStreamError = never
export type VideoStream = VideoStreamSuccess | VideoStreamError
