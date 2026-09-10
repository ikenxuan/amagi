import type { ArticleListInfo_V0 } from './ArticleListInfo_V0'

export type ArticleListInfoSuccess = ArticleListInfo_V0
export type ArticleListInfoError = never
export type ArticleListInfo = ArticleListInfoSuccess | ArticleListInfoError
