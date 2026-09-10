import type { ArticleInfo_V0 } from './ArticleInfo_V0'

export type ArticleInfoSuccess = ArticleInfo_V0
export type ArticleInfoError = never
export type ArticleInfo = ArticleInfoSuccess | ArticleInfoError
