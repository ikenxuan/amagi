// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 7.0.0-beta.9）。参数与说明在 corpus/xiaohongshu/subComments.requests.json 里
//   note_id / root_comment_id  变体0

export type SubComments_V0 = {
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
  at_users: unknown[]
  content: string
  create_time: number
  id: string
  invalid: boolean
  ip_location: string
  like_count: string
  liked: boolean
  note_id: string
  pictures: unknown[]
  show_tags: unknown[]
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
