// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/xiaohongshu/searchNotes.requests.json 里
//   keyword  变体0

export type SearchNotes_V0 = {
  code: number
  data: Data
  msg: string
  success: boolean
  [property: string]: any
}

type Data = {
  has_more: boolean
  items: Item[]
  [property: string]: any
}

type Item = {
  hot_query?: HotQuery
  id: string
  model_type: string
  note_card?: NoteCard
  xsec_token: string
  [property: string]: any
}

type HotQuery = {
  queries: Query[]
  source: number
  title: string
  word_request_id: string
  [property: string]: any
}

type Query = {
  cover: string
  id: string
  name: string
  search_word: string
  [property: string]: any
}

type NoteCard = {
  corner_tag_info: CornerTagInfo[]
  cover: Cover
  display_title?: string
  image_list: ImageList[]
  interact_info: InteractInfo
  type: string
  user: User
  [property: string]: any
}

type CornerTagInfo = {
  text: string
  type: string
  [property: string]: any
}

type Cover = {
  height: number
  url_default: string
  url_pre: string
  width: number
  [property: string]: any
}

type ImageList = {
  height: number
  info_list: InfoList[]
  width: number
  [property: string]: any
}

type InfoList = {
  image_scene: string
  url: string
  [property: string]: any
}

type InteractInfo = {
  collected: boolean
  collected_count: string
  comment_count: string
  liked: boolean
  liked_count: string
  shared_count: string
  [property: string]: any
}

type User = {
  avatar: string
  nick_name: string
  nickname: string
  user_id: string
  xsec_token: string
  [property: string]: any
}
