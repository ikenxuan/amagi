import type { ArticleContent_V0 } from './ArticleContent_V0'

export type ArticleContentSuccess = ArticleContent_V0
export type ArticleContentError = never
export type ArticleContent = ArticleContentSuccess | ArticleContentError
