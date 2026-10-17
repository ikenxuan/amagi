// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：2 份响应（amagi 7.0.0-beta.9）。参数与说明在 corpus/xiaohongshu/searchUser.requests.json 里
//   keyword
//   keyword  变体0

export type SearchUser_V0 = {
  code: number
  data: Data
  msg: string
  success: boolean
  [property: string]: any
}

type Data = {
  has_more: boolean
  result: Result
  users: User[]
  [property: string]: any
}

type Result = {
  code: number
  message: string
  success: boolean
  [property: string]: any
}

type User = {
  fans?: string
  followed: boolean
  id: string
  image: string
  is_self: boolean
  link: string
  live_info: LiveInfo
  name: string
  note_count: number
  profession?: string
  red_id: string
  red_official_verified: boolean
  red_official_verify_type: number
  show_red_official_verify_icon: boolean
  sub_title: string
  update_time?: string
  vshow: number
  xsec_token: string
  [property: string]: any
}

type LiveInfo = {
  has_draw: boolean
  has_goods: boolean
  has_red_packet: boolean
  start_time: number
  status: number
  [property: string]: any
}
