// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份样本（amagi 6.6.0）。样本不进 git，在本地 corpus/ 里
//   44136fa355b3  2026-09-04  无参数

export type EmojiList_V0 = {
  emoji_list: EmojiList[]
  status_code: number
  version: number
  [property: string]: any
}

type EmojiList = {
  display_name: string
  emoji_url: EmojiUrl
  hide: number
  origin_uri: string
  [property: string]: any
}

type EmojiUrl = {
  uri: string
  url_list: string[]
  [property: string]: any
}
