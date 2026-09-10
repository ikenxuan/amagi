// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/guestMusicInfo.requests.json 里
//   music_id  默认值

export type GuestMusicInfo_V0 = {
  extra: Extra
  music_info: MusicInfo
  status_code: number
  [property: string]: any
}

type Extra = {
  logid: string
  now: number
  [property: string]: any
}

type MusicInfo = {
  author: string
  cover_hd: CoverHd
  cover_large: CoverHd
  cover_medium: CoverHd
  cover_thumb: CoverHd
  duration: number
  extra: string
  mid: string
  position: null
  sec_uid: string
  status: number
  title: string
  [property: string]: any
}

type CoverHd = {
  uri: string
  url_list: string[]
  [property: string]: any
}
