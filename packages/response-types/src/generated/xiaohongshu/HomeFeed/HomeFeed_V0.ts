// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/xiaohongshu/homeFeed.requests.json 里
//   无参数  变体0

export type HomeFeed_V0 = {
  code: number
  data: Data
  msg: string
  success: boolean
  [property: string]: any
}

type Data = {
  cursor_score: string
  items: Item[]
  [property: string]: any
}

type Item = {
  id: string
  ignore: boolean
  model_type: string
  note_card: NoteCard
  track_id: string
  xsec_token: string
  [property: string]: any
}

type NoteCard = {
  cover: Cover
  display_title: string
  interact_info: InteractInfo
  type: string
  user: User
  video?: Video
  [property: string]: any
}

type Cover = {
  file_id: string
  height: number
  info_list: InfoList[]
  url: string
  url_default: string
  url_pre: string
  width: number
  [property: string]: any
}

type InfoList = {
  image_scene: string
  url: string
  [property: string]: any
}

type InteractInfo = {
  liked: boolean
  liked_count: string
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

type Video = {
  capa: Capa
  [property: string]: any
}

type Capa = {
  duration: number
  [property: string]: any
}
