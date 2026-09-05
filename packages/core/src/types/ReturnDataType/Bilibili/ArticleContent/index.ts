// 改名原因：叶子文件名原先缺 `_V0`（`ArticleContent.ts`），目录本身已符合约定，
// 这次只把它补成 `ArticleContent_V0.ts`。对外名字 `ArticleContent` 与
// `BilibiliReturnTypeMap.articleContent` 都没动。
import { ArticleContent_V0 } from './ArticleContent_V0'

export type ArticleContent = ArticleContent_V0
