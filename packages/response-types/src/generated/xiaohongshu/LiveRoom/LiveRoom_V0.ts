// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：2 份响应（amagi 7.0.0-beta.9）。参数与说明在 corpus/xiaohongshu/liveRoom.requests.json 里
//   room_id  变体0，央视频
//   room_id  变体0，王者荣耀KPL

export type LiveRoom_V0 = {
  code: number
  data: Data
  msg: string
  success: boolean
  [property: string]: any
}

type Data = {
  host_info: HostInfo
  room_info: RoomInfo
  [property: string]: any
}

type HostInfo = {
  avatar: string
  nick_name: string
  user_id: string
  [property: string]: any
}

type RoomInfo = {
  deeplink: string
  display_count: number
  display_member_count: string
  display_praise_count: string
  display_viewer_count: string
  is_sports_event: boolean
  join_limit_types: number[]
  monetize_type: number
  pull_config: string
  pv: number
  room_cover: string
  room_id: string
  room_title: string
  settings: Settings
  status: number
  tab_config?: TabConfig
  viewer_info_display_type: number
  [property: string]: any
}

type Settings = {
  camera_direction: number
  hide_viewer_switch: number
  is_filter_on: boolean
  [property: string]: any
}

type TabConfig = {
  tab_bg_color: string
  tab_items: TabItem[]
  [property: string]: any
}

type TabItem = {
  competition_id: number
  match_id: number
  page_type: number
  season_id: number
  tab_index: number
  tab_name: string
  tab_type: number
  tab_url: string
  [property: string]: any
}
