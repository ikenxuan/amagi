// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 7.0.0-beta.9）。参数与说明在 corpus/xiaohongshu/liveSquare.requests.json 里
//   无参数  变体0

export type LiveSquare_V0 = {
  code: number
  data: Data
  msg: string
  success: boolean
  [property: string]: any
}

type Data = {
  feeds: Feed[]
  [property: string]: any
}

type Feed = {
  cursor_score: string
  live: Live
  model_type: string
  recommend: Recommend
  type: string
  [property: string]: any
}

type Live = {
  room_extra_info: string
  score: number
  t_live_host_info: TLiveHostInfo
  t_room_info: TRoomInfo
  track_id: string
  [property: string]: any
}

type TLiveHostInfo = {
  avatar: string
  nickname: string
  user_id: string
  [property: string]: any
}

type TRoomInfo = {
  content_type: number
  cover: string
  cover_info: CoverInfo
  display_count: number
  hot_value: number
  link: string
  member_count: number
  name: string
  room_id: string
  room_id_str: string
  uv: number
  xsec_token: string
  [property: string]: any
}

type CoverInfo = {
  cover_image: string
  video_play_mode: number
  [property: string]: any
}

type Recommend = {
  desc: string
  icon: string
  live_card_extra_info: string
  live_rec_content_tag: string
  live_rec_content_text: string
  track_id: string
  type: string
  [property: string]: any
}
