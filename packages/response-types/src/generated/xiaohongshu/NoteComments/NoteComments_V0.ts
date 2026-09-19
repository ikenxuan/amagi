// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：2 份响应（amagi 7.0.0-beta.1）。参数与说明在 corpus/xiaohongshu/noteComments.requests.json 里
//   note_id  变体0
//   note_id  变体1

export type NoteComments_V0 = {
  code: number
  data: Data
  msg: string
  success: boolean
  [property: string]: any
}

type Data = {
  comments: Comment[]
  cursor: string
  has_more: boolean
  time: number
  user_id: string
  xsec_token: string
  [property: string]: any
}

type Comment = {
  at_users: AtUser[]
  content: string
  create_time: number
  id: string
  invalid: boolean
  ip_location: string
  like_count: string
  liked: boolean
  note_id: string
  pictures?: Picture[]
  show_tags: string[]
  status: number
  sub_comment_count: string
  sub_comment_cursor: string
  sub_comment_has_more: boolean
  sub_comments: SubComment[]
  user_info: UserInfo
  [property: string]: any
}

type AtUser = {
  ai_agent: boolean
  nickname: string
  user_id: string
  xsec_token: string
  [property: string]: any
}

type Picture = {
  height: number
  info_list: InfoList[]
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

type SubComment = {
  at_users: AtUser[]
  content: string
  create_time: number
  id: string
  invalid: boolean
  ip_location?: string
  like_count: string
  liked: boolean
  note_id: string
  pictures?: Picture[]
  show_tags: string[]
  status: number
  target_comment: TargetComment
  user_info: UserInfo
  [property: string]: any
}

type TargetComment = {
  id: string
  user_info: UserInfo
  [property: string]: any
}

type UserInfo = {
  ai_agent: boolean
  image: string
  nickname: string
  user_id: string
  xsec_token: string
  [property: string]: any
}
