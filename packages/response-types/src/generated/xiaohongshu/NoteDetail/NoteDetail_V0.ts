// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/xiaohongshu/noteDetail.requests.json 里
//   note_id  变体0

export type NoteDetail_V0 = {
  code: number
  data: Data
  msg: string
  success: boolean
  [property: string]: any
}

type Data = {
  current_time: number
  cursor_score: string
  items: Item[]
  [property: string]: any
}

type Item = {
  id: string
  ignore: boolean
  model_type: string
  note_card: NoteCard
  [property: string]: any
}

type NoteCard = {
  at_user_list: unknown[]
  desc: string
  image_list: ImageList[]
  interact_info: InteractInfo
  ip_location: string
  last_update_time: number
  note_id: string
  share_info: ShareInfo
  tag_list: TagList[]
  time: number
  title: string
  type: string
  user: User
  [property: string]: any
}

type ImageList = {
  file_id: string
  height: number
  info_list: InfoList[]
  live_photo: boolean
  stream: { [property: string]: any }
  trace_id: string
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
  collected: boolean
  collected_count: string
  comment_count: string
  followed: boolean
  liked: boolean
  liked_count: string
  nice_count: string
  relation: string
  share_count: string
  [property: string]: any
}

type ShareInfo = {
  un_share: boolean
  [property: string]: any
}

type TagList = {
  id: string
  name: string
  type: string
  [property: string]: any
}

type User = {
  avatar: string
  nickname: string
  user_id: string
  xsec_token: string
  [property: string]: any
}
