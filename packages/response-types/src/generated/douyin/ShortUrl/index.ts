import type { ShortUrl_Error_V0 } from './ShortUrl_Error_V0'
import type { ShortUrl_V0 } from './ShortUrl_V0'

export type ShortUrlSuccess = ShortUrl_V0
export type ShortUrlError = ShortUrl_Error_V0
export type ShortUrl = ShortUrlSuccess | ShortUrlError
