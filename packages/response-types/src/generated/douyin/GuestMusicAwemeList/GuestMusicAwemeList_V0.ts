// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：2 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/guestMusicAwemeList.requests.json 里
//   music_id
//   music_id / number  变体0

export type GuestMusicAwemeList_V0 = {
  aweme_list: AwemeList[]
  cursor: number
  extra: Extra
  has_more: boolean
  status_code: number
  [property: string]: any
}

type AwemeList = {
  aweme_id: string
  aweme_type: number
  cha_list: null
  chapter_bar_color: null
  chapter_list: null
  comment_list: null
  common_labels: null
  desc: string
  geofencing: null
  image_infos: null
  images: null
  img_bitrate: null
  interaction_stickers: null
  label_top_text: null
  long_video: null
  promotions: null
  statistics: Statistics
  text_extra: null
  video: Video
  video_labels: null
  video_text: null
  [property: string]: any
}

type Statistics = {
  aweme_id: string
  comment_count: number
  digg_count: number
  forward_count: number
  play_count: number
  share_count: number
  [property: string]: any
}

type Video = {
  big_thumbs: null
  bit_rate: null
  cover: Cover
  duration: number
  height: number
  play_addr: Cover
  width: number
  [property: string]: any
}

type Cover = {
  height: number
  uri: string
  url_list: string[]
  width: number
  [property: string]: any
}

type Extra = {
  logid: string
  now: number
  [property: string]: any
}
