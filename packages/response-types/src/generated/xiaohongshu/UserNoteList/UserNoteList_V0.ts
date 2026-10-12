// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 7.0.0-beta.8）。参数与说明在 corpus/xiaohongshu/userNoteList.requests.json 里
//   user_id  变体0

export type UserNoteList_V0 = {
  code: number
  data: Data
  msg: string
  success: boolean
  [property: string]: any
}

type Data = {
  cursor: string
  has_more: boolean
  notes: Note[]
  [property: string]: any
}

type Note = {
  cover: Cover
  display_title: string
  interact_info: InteractInfo
  note_id: string
  time: number
  type: string
  user: User
  xsec_token: string
  [property: string]: any
}

type Cover = {
  file_id: string
  height: number
  info_list: InfoList[]
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
  liked: boolean
  liked_count: string
  sticky: boolean
  [property: string]: any
}

type User = {
  avatar: string
  nick_name: string
  nickname: string
  user_id: string
  [property: string]: any
}
