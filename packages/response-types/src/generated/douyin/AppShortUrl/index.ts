import type { AppShortUrl_V0 } from './AppShortUrl_V0'

export type AppShortUrlSuccess = AppShortUrl_V0
export type AppShortUrlError = never
export type AppShortUrl = AppShortUrlSuccess | AppShortUrlError
