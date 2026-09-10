// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：2 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/musicInfo.requests.json 里
//   music_id
//   music_id  默认值，id_str

export type MusicInfo_V0 = {
  detail_page_labels: null
  disable_music_activity_setting: boolean
  extra: Extra
  feature_data: { [property: string]: any }
  follow_shoot_buttons: null
  high_upload_ratio: number
  log_pb: LogPb
  lora_model_ids: null
  msg: string
  music_activity_resource_infos: null
  music_info: MusicInfo | null
  rec_list: unknown[]
  related_effects: null
  related_musics: null
  small_banner: unknown[]
  status_code: number
  trends_infos: null
  [property: string]: any
}

type Extra = {
  fatal_item_ids: unknown[]
  logid: string
  now: number
  [property: string]: any
}

type LogPb = {
  impr_id: string
  [property: string]: any
}

type MusicInfo = {
  album: string
  artist_user_infos: null
  artists: unknown[]
  audition_duration: number
  author: string
  author_deleted: boolean
  author_position: null
  author_status: number
  avatar_large: AvatarLarge
  avatar_medium: AvatarLarge
  avatar_thumb: AvatarLarge
  binded_challenge_id: number
  can_background_play: boolean
  collect_stat: number
  cover_hd: AvatarLarge
  cover_large: AvatarLarge
  cover_medium: AvatarLarge
  cover_thumb: AvatarLarge
  dmv_auto_show: boolean
  dsp_status: number
  duration: number
  end_time: number
  external_song_info: unknown[]
  extra: string
  id: number
  id_str: string
  is_audio_url_with_cookie: boolean
  is_commerce_music: boolean
  is_del_video: boolean
  is_matched_metadata: boolean
  is_original: boolean
  is_original_sound: boolean
  is_pgc: boolean
  is_restricted: boolean
  is_video_self_see: boolean
  luna_info: LunaInfo
  lyric_short_position: null
  material_use_count: number
  mid: string
  music_caption_url: string
  music_chart_ranks: null
  music_collect_count: number
  music_cover_atmosphere_color_value: string
  music_status: number
  musician_user_infos: null
  mute_share: boolean
  offline_desc: string
  original_musician_display_name: string
  owner_handle: string
  owner_id: string
  owner_nickname: string
  pgc_music_type: number
  play_url: PlayUrl
  position: null
  prevent_download: boolean
  prevent_item_download_status: number
  preview_end_time: number
  preview_start_time: number
  reason_type: number
  redirect: boolean
  schema_url: string
  search_impr: SearchImpr
  sec_uid: string
  share_info: ShareInfo
  shoot_duration: number
  show_origin_clip: boolean
  source_platform: number
  start_time: number
  status: number
  tag_list: null
  talent_hashtag_name_list: null
  title: string
  trend_music_start_time: number
  unshelve_countries: null
  user_count: number
  video_duration: number
  [property: string]: any
}

type AvatarLarge = {
  height: number
  uri: string
  url_list: string[]
  width: number
  [property: string]: any
}

type LunaInfo = {
  is_luna_user: boolean
  [property: string]: any
}

type PlayUrl = {
  height: number
  uri: string
  url_key: string
  url_list: string[]
  width: number
  [property: string]: any
}

type SearchImpr = {
  entity_id: string
  [property: string]: any
}

type ShareInfo = {
  bool_persist: number
  share_desc: string
  share_desc_info: string
  share_quote: string
  share_signature_desc: string
  share_signature_url: string
  share_title: string
  share_title_myself: string
  share_title_other: string
  share_url: string
  share_weibo_desc: string
  [property: string]: any
}
