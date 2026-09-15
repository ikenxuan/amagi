// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：6 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/search.requests.json 里
//   query
//   query / type
//   query / type  用户搜索
//   query / type  视频类型
//   query / type  通用搜索
//
// 本文件是判别联合的一支：`__search_type === 'video'`，形状序号 0。
// 要收窄用同端点 `guards.ts` 里的 `isVideo`（它收窄整个信封）；只读这一支内部字段的话，裸 `if` / `switch` 判断判别字段同样收窄 —— 收窄的是判别字段所在的那个对象、不是信封，见 core 的 dynamic-detail-union.test-d.ts。

export type Video_V0 = {
  __search_type: 'video'
  aweme_list: null
  backtrace: string
  cursor: number
  data: Data[]
  extra: Extra
  global_doodle_config: GlobalDoodleConfig
  guide_search_words: GuideSearchWord[]
  has_more: number
  log_pb: LogPb
  mock_recall_path: string
  path: string
  status_code: number
  [property: string]: any
}

type Data = {
  aweme_info: AwemeInfo
  aweme_list: null
  ecom_goods_list: null
  music_info_list: null
  ops: null
  qishui_music_list: null
  shoot_position_list: null
  show_tab: null
  sub_card_list: null
  tab: null
  type: number
  [property: string]: any
}

type AwemeInfo = {
  ai_follow_images: null
  anchor_info?: AnchorInfo
  anchors: null
  author: Author
  author_user_id: number
  aweme_id: string
  aweme_type: number
  cha_list: null
  challenge_position: null
  chapter_bar_color: null
  chapter_list: null
  collect_stat: number
  comment_list: null
  commerce_config_data: null
  common_left_top_labels: null
  cover_labels: null
  create_scale_type: null
  create_time: number
  danmaku_control: DanmakuControl
  desc: string
  dislike_dimension_list: null
  dislike_dimension_list_v2: null
  diversion_bar_info: null
  douyin_p_c_video_extra?: string
  effect_inflow_effects: null
  encrypt_interest_point_list: null
  encrypt_key_phrase_list: null
  entertainment_product_info: EntertainmentProductInfo
  follow_shot_assets: null
  geofencing: null
  geofencing_regions: null
  group_id: string
  hybrid_label: null
  image_follow_shot_assets: null
  image_infos: null
  image_list: null
  images: null
  img_bitrate: null
  impression_data: ImpressionData
  interaction_stickers: null
  interest_points: null
  is_top: number
  jump_tab_info_list: null
  label_top_text: null
  long_video: null
  media_type: number
  mix_info?: MixInfo
  music: Music
  mv_info: null
  nearby_hot_comment: null
  nickname_position: null
  origin_comment_ids: null
  origin_text_extra: null
  original_images: null
  packed_clips: null
  position: null
  prevent_download: boolean
  promotions: null
  rawdata: string
  ref_tts_id_list: null
  ref_voice_modify_id_list: null
  relation_labels: null
  reply_smart_emojis: null
  risk_infos: RiskInfos
  series_info?: SeriesInfo
  share_info: ShareInfo
  slides_music_beats: null
  social_tag_list: null
  standard_bar_info_list: null
  statistics: Statistics
  status: Status2
  suggest_words: SuggestWords
  text_extra: TextExtra[]
  trends_infos: null
  tts_id_list: null
  uniqid_position: null
  user_digged: number
  video: Video
  video_control: VideoControl
  video_labels: null
  video_tag: null
  video_text: null
  voice_modify_id_list: null
  yumme_recreason: null
  [property: string]: any
}

type AnchorInfo = {
  content: string
  extra: string
  icon: Icon
  id: string
  log_extra: string
  open_url: string
  style_info: StyleInfo
  title: string
  title_tag: string
  type: number
  [property: string]: any
}

type Icon = {
  height: number
  uri: string
  url_key: string
  url_list: string[]
  width: number
  [property: string]: any
}

type StyleInfo = {
  default_icon: string
  extra: string
  scene_icon: string
  [property: string]: any
}

type Author = {
  account_cert_info?: string
  ad_cover_url: null
  avatar_schema_list: null
  avatar_thumb: AvatarThumb
  ban_user_functions: null
  batch_unfollow_contain_tabs: null
  batch_unfollow_relation_desc: null
  can_set_geofencing: null
  card_entries: null
  card_entries_not_display: null
  card_sort_priority: null
  cf_list: null
  cha_list: null
  contrail_list: null
  cover_url: null
  creator_tag_list: null
  custom_verify: string
  data_label_list: null
  display_info: null
  endorsement_info_list: null
  enterprise_verify_reason: string
  familiar_visitor_user: null
  follow_status: number
  follower_count: number
  follower_list_secondary_information_struct: null
  follower_status: number
  followers_detail: null
  geofencing: null
  homepage_bottom_toast: null
  identity_labels: null
  im_role_ids: null
  interest_tags: null
  item_list: null
  link_item_list: null
  need_points: null
  new_story_cover: null
  nickname: string
  not_seen_item_id_list: null
  not_seen_item_id_list_v2: null
  offline_info_list: null
  personal_tag_list: null
  platform_sync_info: null
  private_relation_list: null
  profile_component_disabled: null
  profile_mob_params: null
  profile_signature_components: null
  relative_users: null
  room_data: string
  room_id: number
  room_id_str: string
  sec_uid: string
  secret: number
  signature_extra: null
  special_people_labels: null
  text_extra: null
  total_favorited: number
  type_label: null
  uid: string
  user_permissions: null
  user_tags: null
  verification_permission_ids: null
  webcast_preview_labels: null
  white_cover_url: null
  [property: string]: any
}

type AvatarThumb = {
  height: number
  uri: string
  url_list: string[]
  width: number
  [property: string]: any
}

type DanmakuControl = {
  activities: null
  enable_danmaku: boolean
  is_post_denied: boolean
  post_denied_reason: string
  post_privilege_level: number
  [property: string]: any
}

type EntertainmentProductInfo = {
  biz: number
  market_info: MarketInfo
  sub_title: null
  [property: string]: any
}

type MarketInfo = {
  limit_free: LimitFree
  marketing_tag: null
  [property: string]: any
}

type LimitFree = {
  in_free: boolean
  [property: string]: any
}

type ImpressionData = {
  group_id_list_a: number[] | null
  group_id_list_b: null
  group_id_list_c: null
  group_id_list_d: null
  similar_id_list_a: null
  similar_id_list_b: null
  [property: string]: any
}

type MixInfo = {
  cover_url: AvatarThumb
  extra: string
  ids: null
  mix_id: string
  mix_name: string
  mix_type: number
  paid_episodes: null
  statis: Statis
  status: Status
  watched_item: string
  [property: string]: any
}

type Statis = {
  collect_vv: number
  current_episode: number
  play_vv: number
  updated_to_episode: number
  [property: string]: any
}

type Status = {
  is_collected: number
  status: number
  [property: string]: any
}

type Music = {
  album: string
  artist_user_infos: null
  artists: null
  author: string
  author_position: null
  avatar_thumb: AvatarThumb
  binded_challenge_id: number
  collect_stat: number
  cover_medium: AvatarThumb
  cover_thumb: AvatarThumb
  duration: number
  external_song_info: null
  extra: string
  id: number
  id_str: string
  is_original: boolean
  lyric_short_position: null
  mid: string
  music_chart_ranks: null
  musician_user_infos: null
  owner_id: string
  owner_nickname: string
  play_url: Icon
  position: null
  sec_uid: string
  status: number
  tag_list: null
  talent_hashtag_name_list: null
  title: string
  unshelve_countries: null
  user_count: number
  [property: string]: any
}

type RiskInfos = {
  content: string
  icon_url?: string
  risk_sink: boolean
  type: number
  vote: boolean
  warn: boolean
  warn_level?: number
  [property: string]: any
}

type SeriesInfo = {
  actors: null
  cover_url: AvatarThumb
  directors: null
  extra: string
  ids: null
  paid_episodes: null
  recommend_color: null
  series_content_types: null
  series_content_types_new: null
  series_id: string
  series_name: string
  series_paid_type_list: null
  stats: Statis
  status: Status
  watched_item: string
  [property: string]: any
}

type ShareInfo = {
  share_desc: string
  share_desc_info: string
  share_link_desc: string
  share_quote: string
  share_title: string
  share_url: string
  [property: string]: any
}

type Statistics = {
  collect_count: number
  comment_count: number
  digg_count: number
  download_count: number
  forward_count: number
  live_watch_count: number
  play_count: number
  share_count: number
  [property: string]: any
}

type Status2 = {
  allow_share: boolean
  in_reviewing: boolean
  is_delete: boolean
  is_private: boolean
  is_prohibited: boolean
  part_see: number
  private_status: number
  review_result: ReviewResult
  [property: string]: any
}

type ReviewResult = {
  review_status: number
  [property: string]: any
}

type SuggestWords = {
  suggest_words: SuggestWord[]
  [property: string]: any
}

type SuggestWord = {
  extra_info: string
  hint_text: string
  icon_url: string
  scene: string
  words: Word[] | null
  [property: string]: any
}

type Word = {
  info: string
  word: string
  word_id: string
  [property: string]: any
}

type TextExtra = {
  end: number
  hashtag_id?: string
  hashtag_name?: string
  is_commerce?: boolean
  search_query_id?: string
  search_text?: string
  sec_uid?: string
  start: number
  type: number
  user_id?: string
  [property: string]: any
}

type Video = {
  big_thumbs: BigThumb[] | null
  bit_rate: BitRate[]
  bit_rate_audio: BitRateAudio[] | null
  cover: AvatarThumb
  download_addr: DownloadAddr
  download_suffix_logo_addr?: DownloadAddr
  duration: number
  dynamic_cover: AvatarThumb
  gaussian_cover: AvatarThumb
  has_download_suffix_logo_addr?: boolean
  height: number
  meta: string
  misc_download_addrs?: string
  origin_cover: AvatarThumb
  play_addr: PlayAddr2
  play_addr_265: PlayAddr2
  play_addr_lowbr: PlayAddr2
  ratio: string
  raw_cover: AvatarThumb
  tags: null
  video_model: string
  width: number
  [property: string]: any
}

type BigThumb = {
  duration: number
  fext: string
  img_num: number
  img_url: string
  img_urls: string[]
  img_x_len: number
  img_x_size: number
  img_y_len: number
  img_y_size: number
  interval: number
  uri: string
  uris: string[]
  [property: string]: any
}

type BitRate = {
  FPS: number
  HDR_bit: string
  HDR_type: string
  bit_rate: number
  format: string
  gear_name: string
  is_bytevc1: number
  is_h265: number
  play_addr: PlayAddr
  quality_type: number
  video_extra: string
  [property: string]: any
}

type PlayAddr = {
  data_size: number
  file_cs?: string
  file_hash: string
  height: number
  uri: string
  url_key: string
  url_list: string[]
  width: number
  [property: string]: any
}

type BitRateAudio = {
  audio_extra: string
  audio_meta: AudioMeta
  audio_quality: number
  [property: string]: any
}

type AudioMeta = {
  bitrate: number
  codec_type: string
  encoded_type: string
  file_hash: string
  file_id: string
  format: string
  fps: number
  logo_type: string
  media_type: string
  quality: string
  quality_desc: string
  size: number
  sub_info: string
  url_list: UrlList
  [property: string]: any
}

type UrlList = {
  backup_url: string
  fallback_url: string
  main_url: string
  [property: string]: any
}

type DownloadAddr = {
  data_size?: number
  file_cs: string
  height: number
  uri: string
  url_list: string[]
  width: number
  [property: string]: any
}

type PlayAddr2 = {
  data_size: number
  file_cs: string
  file_hash: string
  height: number
  uri: string
  url_key: string
  url_list: string[]
  width: number
  [property: string]: any
}

type VideoControl = {
  allow_douplus: boolean
  allow_download: boolean
  allow_duet: boolean
  allow_dynamic_wallpaper: boolean
  allow_music: boolean
  allow_react: boolean
  allow_record: boolean
  allow_share: boolean
  allow_stitch: boolean
  disable_record_reason: string
  download_ignore_visibility: boolean
  download_info: DownloadInfo
  draft_progress_bar: number
  duet_ignore_visibility: boolean
  duet_info: DuetInfo
  prevent_download_type: number
  share_grayed: boolean
  share_ignore_visibility: boolean
  share_type: number
  show_ai_corner: boolean
  show_progress_bar: number
  show_watermark: boolean
  timer_info: TimerInfo
  timer_status: number
  [property: string]: any
}

type DownloadInfo = {
  fail_info?: FailInfo
  level: number
  [property: string]: any
}

type FailInfo = {
  code: number
  msg: string
  reason: string
  [property: string]: any
}

type DuetInfo = {
  fail_info?: FailInfo2
  level: number
  [property: string]: any
}

type FailInfo2 = {
  code: number
  reason: string
  [property: string]: any
}

type TimerInfo = {
  timer_status: number
  [property: string]: any
}

type Extra = {
  fatal_item_ids: unknown[]
  logid: string
  now: number
  scenes: null
  search_request_id: string
  [property: string]: any
}

type GlobalDoodleConfig = {
  filter_settings: FilterSetting[]
  keyword: string
  [property: string]: any
}

type FilterSetting = {
  android_version: number
  btm: string
  default_index: number
  enable_huo_shan: boolean
  enable_lite: boolean
  harmony_version: number
  huoshan_android_version: number
  huoshan_ios_version: number
  ios_version: number
  items: Item[]
  lite_android_version: number
  lite_harmony_version: number
  lite_ios_version: number
  log_name: string
  name: string
  search_less_text?: SearchLessText
  search_nil_text?: SearchLessText
  title: string
  [property: string]: any
}

type Item = {
  log_value: string
  show_dot?: number
  title: string
  value: string
  [property: string]: any
}

type SearchLessText = {
  info: string
  jump_text: string
  [property: string]: any
}

type GuideSearchWord = {
  attached_text: null
  id: string
  query_id: string
  type: string
  word: string
  [property: string]: any
}

type LogPb = {
  impr_id: string
  [property: string]: any
}
