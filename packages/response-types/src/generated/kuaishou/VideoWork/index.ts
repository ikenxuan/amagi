import type { VideoWork_V0 } from './VideoWork_V0'

export type VideoWorkSuccess = VideoWork_V0
export type VideoWorkError = never
export type VideoWork = VideoWorkSuccess | VideoWorkError
