// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/bilibili/liveRoomInfo.requests.json 里
//   room_id  变体0

export type LiveRoomInfo_V0 = {
  code: number
  data: Data
  message: string
  msg: string
  [property: string]: any
}

type Data = {
  allow_change_area_time: number
  allow_upload_cover_time: number
  area_id: number
  area_name: string
  area_pendants: string
  attention: number
  background: string
  battle_id: number
  description: string
  hot_words: string[]
  hot_words_status: number
  is_anchor: number
  is_portrait: boolean
  is_strict_room: boolean
  keyframe: string
  live_status: number
  live_time: string
  new_pendants: NewPendants
  old_area_id: number
  online: number
  parent_area_id: number
  parent_area_name: string
  pendants: string
  pk_id: number
  pk_status: number
  room_id: number
  room_silent_level: number
  room_silent_second: number
  room_silent_type: string
  short_id: number
  studio_info: StudioInfo
  tags: string
  title: string
  uid: number
  up_session: string
  user_cover: string
  verify: string
  [property: string]: any
}

type NewPendants = {
  badge: Badge
  frame: Frame
  mobile_badge: null
  mobile_frame: Frame
  [property: string]: any
}

type Badge = {
  desc: string
  name: string
  position: number
  value: string
  [property: string]: any
}

type Frame = {
  area: number
  area_old: number
  bg_color: string
  bg_pic: string
  desc: string
  name: string
  position: number
  use_old_area: boolean
  value: string
  [property: string]: any
}

type StudioInfo = {
  master_list: unknown[]
  status: number
  [property: string]: any
}
