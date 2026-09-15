import type { VideoWork_Error_V0 } from './VideoWork_Error_V0'
import type { VideoWork_V0 } from './VideoWork_V0'

export type VideoWorkSuccess = VideoWork_V0
export type VideoWorkError = VideoWork_Error_V0
export type VideoWork = VideoWorkSuccess | VideoWorkError
