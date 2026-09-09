import type { ImageAlbumWork_Error_V0 } from './ImageAlbumWork_Error_V0'
import type { ImageAlbumWork_V0 } from './ImageAlbumWork_V0'

export type ImageAlbumWorkSuccess = ImageAlbumWork_V0
export type ImageAlbumWorkError = ImageAlbumWork_Error_V0
export type ImageAlbumWork = ImageAlbumWorkSuccess | ImageAlbumWorkError
