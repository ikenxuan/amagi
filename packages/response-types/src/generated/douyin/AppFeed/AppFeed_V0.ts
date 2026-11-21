// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 7.0.0-beta.11）。参数与说明在 corpus/douyin/appFeed.requests.json 里
//   无参数  2026-11-18 游客设备真实请求；无账号登录态

export type AppFeed_V0 = {
  aweme_list: AwemeList[]
  chime_video_list: null
  disable_adjust_for_cache: boolean
  enable_re_rank: boolean
  enable_splash_show: boolean
  extra: Extra
  filter_infos: null
  has_more: number
  home_model: number
  log_pb: LogPb
  max_cursor: number
  min_cursor: number
  preload_ads: null
  preload_awemes: null
  rec_follow_unread_cnt: number
  refresh_clear: number
  sati_param_for_pitaya: string
  status_code: number
  [property: string]: any
}

type AwemeList = {
  ad_candidates: null
  ai_follow_images: null
  anchors: null
  authentication_token: string
  author: Author
  author_user_id: string | number
  aweme_control: AwemeControl
  aweme_id: string
  aweme_listen_struct: AwemeListenStruct
  aweme_type: number
  bodydance_score: number
  can_cache_to_local: boolean
  caption: string
  cha_list: ChaList[] | null
  challenge_position: null
  chapter_bar_color: null
  chapter_list: null
  city: string
  cmt_swt: boolean
  collect_stat: number
  comment_list: null
  comment_permission_info: CommentPermissionInfo
  commerce_config_data: null
  commerce_top_labels: null
  common_bar_info?: string
  create_scale_type: null
  create_time: number
  danmaku_control: DanmakuControl
  desc: string
  desc_language: string
  dislike_dimension_list: null
  dislike_dimension_list_v2: null
  distance: string
  distribute_type: number
  duet_aggregate_in_music_tab: boolean
  duration: number
  enable_top_view: boolean
  entertainment_product_info: EntertainmentProductInfo
  feed_comment_config: FeedCommentConfig
  follow_up_type: number
  geofencing: null
  geofencing_regions: null
  group_id: string
  guide_btn_type?: number
  has_vs_entry: boolean
  horizontal_type?: number
  hot_list?: HotList
  hybrid_label: null
  im_shared_uid_list: null
  image_crop_ctrl: number
  image_infos: null
  images: null
  img_bitrate: null
  impression_data: ImpressionData
  interaction_stickers: null
  interest_points: null
  is_ads: boolean
  is_duet_sing: boolean
  is_fantasy: boolean
  is_force_placed: boolean
  is_hash_tag: number
  is_horizontal?: boolean
  is_image_beat: boolean
  is_in_scope: boolean
  is_life_item: boolean
  is_pgcshow: boolean
  is_relieve: boolean
  is_story: number
  is_top: number
  is_vr: boolean
  item_comment_settings: number
  item_duet: number
  item_pitaya_param: string
  item_react: number
  item_share: number
  item_title: string
  jump_tab_info_list: null
  label_top: Avatar168x168
  label_top_text: null
  link_match: LinkMatch
  long_video: null
  media_type: number
  misc_info: string
  music: Music
  music_guidance_tag_list: null
  mv_info: null
  nearby_level: number
  need_vs_entry: boolean
  nickname_position: null
  origin_comment_ids: null
  original_images: null
  photo_search_entrance: PhotoSearchEntrance
  poi_biz: { [property: string]: any }
  position: null
  press_panel_info: string
  prevent_download: boolean
  promotions: null
  rate: number
  raw_ad_data: null
  ref_tts_id_list: null
  ref_voice_modify_id_list: null
  region: string
  related_music_anchor?: RelatedMusicAnchor
  related_suggest_word: null
  relation_labels: null
  reply_smart_emojis: null
  resp_from: string
  risk_infos: RiskInfos
  series_info?: SeriesInfo
  share_info: ShareInfo4
  share_rank_sec_uid_list: null
  share_url: string
  show_follow_button: { [property: string]: any }
  slides_music_beats: null
  social_tag_list: null
  sort_label: string
  standard_bar_info_list: null
  statistics: Statistics
  status: Status2
  story_ttl: number
  suggest_words: SuggestWords
  text_extra: TextExtra[]
  trends_infos: null
  tts_id_list: null
  uniqid_position: null
  user_digged: number
  user_profile_init_info: UserProfileInitInfo
  user_recommend_status: number
  video: Video
  video_control: VideoControl
  video_labels: null
  video_safety_check_control: VideoSafetyCheckControl
  video_tag: null
  video_text: null
  visual_search_info: VisualSearchInfo
  voice_modify_id_list: null
  vr_type: number
  with_promotional_music: boolean
  xigua_task: XiguaTask
  yumme_recreason: null
  [property: string]: any
}

type Author = {
  ad_cover_url: null
  authority_status: number
  avatar_168x168: Avatar168x168
  avatar_300x300: Avatar168x168
  avatar_medium: Avatar168x168
  avatar_thumb: Avatar168x168
  cha_list: null
  comment_filter_status: number
  comment_setting: number
  commerce_user_level: number
  common_interest: null
  cover_url: Avatar168x168[]
  custom_verify: string
  download_setting: number
  duet_setting: number
  enterprise_verify_reason: string
  follow_status: number
  follower_status: number
  followers_detail: null
  geofencing: null
  has_unread_story: boolean
  hide_location: boolean
  is_ad_fake: boolean
  is_block: boolean
  is_discipline_member: boolean
  is_gov_media_vip: boolean
  is_mix_user: boolean
  is_series_user: boolean
  is_star: boolean
  is_verified: boolean
  item_list: null
  language: string
  live_status: number
  location: string
  new_story_cover: null
  nickname: string
  not_seen_item_id_list: null
  platform_sync_info: null
  prevent_download: boolean
  private_relation_list: null
  region: string
  relative_users: null
  room_id: number
  sec_uid: string
  secret: number
  share_info: ShareInfo
  short_id: string
  signature: string
  signature_display_lines: number
  story_count: number
  sync_to_toutiao: number
  type_label: null
  uid: string
  unique_id: string
  verification_type: number
  verify_info: string
  video_icon: VideoIcon
  with_commerce_entry: boolean
  [property: string]: any
}

type Avatar168x168 = {
  height: number
  uri: string
  url_list: string[]
  width: number
  [property: string]: any
}

type ShareInfo = {
  share_desc: string
  share_qrcode_url: ShareQrcodeUrl
  share_title: string
  share_title_myself: string
  share_title_other: string
  share_url: string
  share_weibo_desc: string
  [property: string]: any
}

type ShareQrcodeUrl = {
  height: number
  uri: string
  url_list: string[] | null
  width: number
  [property: string]: any
}

type VideoIcon = {
  height: number
  uri: string
  url_list: null
  width: number
  [property: string]: any
}

type AwemeControl = {
  can_comment: boolean
  can_forward: boolean
  can_share: boolean
  can_show_comment: boolean
  [property: string]: any
}

type AwemeListenStruct = {
  listen_diversion: ListenDiversion
  music_cover_listen?: number
  trace_info: string
  [property: string]: any
}

type ListenDiversion = {
  category_id?: string
  popup_scene: number
  side_desc: string
  sub_title_type: string
  [property: string]: any
}

type ChaList = {
  author: Author2
  cha_attrs: null
  cha_name: string
  cid: string
  collect_stat: number
  connect_music: null
  desc: string
  is_challenge: number
  is_commerce: boolean
  is_pgcshow: boolean
  schema: string
  share_info: ShareInfo2
  sub_type: number
  type: number
  user_count: number
  view_count: number
  [property: string]: any
}

type Author2 = {
  ad_cover_url: null
  cha_list: null
  common_interest: null
  cover_url: null
  followers_detail: null
  geofencing: null
  item_list: null
  new_story_cover: null
  not_seen_item_id_list: null
  platform_sync_info: null
  private_relation_list: null
  relative_users: null
  type_label: null
  [property: string]: any
}

type ShareInfo2 = {
  bool_persist: number
  share_desc: string
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

type CommentPermissionInfo = {
  can_comment: boolean
  comment_permission_status: number
  item_detail_entry: boolean
  press_entry: boolean
  toast_guide: boolean
  [property: string]: any
}

type DanmakuControl = {
  activities: Activity[]
  danmaku_cnt: number
  enable_danmaku: boolean
  is_post_denied: boolean
  pass_through_params: string
  post_denied_reason: string
  post_privilege_level: number
  skip_danmaku: boolean
  smart_mode_decision: number
  [property: string]: any
}

type Activity = {
  id: number
  type: number
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

type FeedCommentConfig = {
  input_config_text: string
  [property: string]: any
}

type HotList = {
  extra: string
  footer: string
  group_id: string
  header: string
  hot_score: number
  i18n_title: string
  image_url: string
  pattern_type: number
  rank: number
  schema: string
  sentence: string
  sentence_id: number
  title: string
  type: number
  view_count: number
  [property: string]: any
}

type ImpressionData = {
  group_id_list_a: null
  group_id_list_b: null
  group_id_list_c: null
  group_id_list_d: null
  similar_id_list_a: null
  similar_id_list_b: null
  [property: string]: any
}

type LinkMatch = {
  caption_info: CaptionInfo
  match_info: null
  query_limit: number
  total_limit: number
  [property: string]: any
}

type CaptionInfo = {
  keyword: string
  link: string
  [property: string]: any
}

type Music = {
  album: string
  artist_user_infos: null
  audition_duration: number
  author: string
  author_deleted: boolean
  author_position: null
  avatar_large: Avatar168x168
  avatar_medium: Avatar168x168
  avatar_thumb: Avatar168x168
  binded_challenge_id: number
  collect_stat: number
  cover_hd: VideoIcon
  cover_large: VideoIcon
  cover_medium: VideoIcon
  cover_thumb: Avatar168x168
  duration: number
  end_time: number
  external_song_info: null
  extra: string
  id: string
  id_str: string
  is_author_artist: boolean
  is_del_video: boolean
  is_original: boolean
  is_pgc: boolean
  is_restricted: boolean
  is_video_self_see: boolean
  matched_pgc_sound?: MatchedPgcSound
  matched_song?: MatchedSong
  mid: string
  mute_share: boolean
  offline_desc: string
  owner_handle: string
  owner_id: string
  owner_nickname: string
  play_url: PlayUrl
  position: null
  prevent_download: boolean
  prevent_item_download_status: number
  preview_end_time: number
  preview_start_time: number
  redirect: boolean
  schema_url: string
  sec_uid: string
  shoot_duration: number
  source_platform: number
  start_time: number
  status: number
  strong_beat_url?: Avatar168x168
  title: string
  unshelve_countries: null
  user_count: number
  video_duration: number
  [property: string]: any
}

type MatchedPgcSound = {
  author: string
  mixed_author: string
  mixed_title: string
  title: string
  [property: string]: any
}

type MatchedSong = {
  author: string
  cover_medium: Avatar168x168
  dsp_name: string
  h5_url: string
  id: string
  source_id: string
  title: string
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

type PhotoSearchEntrance = {
  ecom_type: number
  [property: string]: any
}

type RelatedMusicAnchor = {
  extra: string
  image_url: ImageUrl
  priority: number
  schema_url: string
  type: string
  [property: string]: any
}

type ImageUrl = {
  uri: string
  url_list: string[]
  [property: string]: any
}

type RiskInfos = {
  content: string
  icon_url?: string
  risk_sink: boolean
  type: number
  url?: string
  vote: boolean
  warn: boolean
  [property: string]: any
}

type SeriesInfo = {
  actors: null
  content_sub_type: number
  cover_url: Avatar168x168
  dark_icon_url: Avatar168x168
  desc: string
  extra: string
  light_icon_url: Avatar168x168
  paid_episodes: null
  series_content_types_new: null
  series_id: string
  series_interactive: SeriesInteractive
  series_name: string
  series_paid_type_list: null
  share_info: ShareInfo3
  stats: Stats
  status: Status
  [property: string]: any
}

type SeriesInteractive = {
  enable_config: boolean
  interactive_config: InteractiveConfig
  [property: string]: any
}

type InteractiveConfig = {
  collection_button_copy: string
  hide_desk_guide: boolean
  hide_find_top_tab: boolean
  hide_intro_card: boolean
  hide_intro_card_details_module: boolean
  hide_intro_card_tags: boolean
  hide_more_series_bottom_btn: boolean
  hide_more_series_module: boolean
  hide_recommendation_module: boolean
  more_series_module_copy: string
  recommendation_module_title_copy: string
  unlock_button_copy: string
  [property: string]: any
}

type ShareInfo3 = {
  share_desc: string
  share_title: string
  share_title_myself: string
  share_title_other: string
  share_url: string
  share_weibo_desc: string
  [property: string]: any
}

type Stats = {
  collect_vv: number
  current_episode: number
  play_vv: number
  total_episode: number
  updated_to_episode: number
  [property: string]: any
}

type Status = {
  is_collected: number
  status: number
  status_desc: string
  [property: string]: any
}

type ShareInfo4 = {
  bool_persist: number
  share_desc: string
  share_link_desc: string
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

type Statistics = {
  aweme_id: string
  collect_count: number
  comment_count: number
  digg_count: number
  download_count: number
  forward_count: number
  lose_comment_count: number
  lose_count: number
  play_count: number
  recommend_count: number
  share_count: number
  whatsapp_share_count: number
  [property: string]: any
}

type Status2 = {
  allow_comment: boolean
  allow_friend_recommend: boolean
  allow_friend_recommend_guide: boolean
  allow_self_recommend_to_friend: boolean
  allow_share: boolean
  aweme_id: string
  download_status: number
  in_reviewing: boolean
  is_delete: boolean
  is_private: boolean
  is_prohibited: boolean
  part_see: number
  private_status: number
  reviewed: number
  self_see: boolean
  with_fusion_goods: boolean
  with_goods: boolean
  [property: string]: any
}

type SuggestWords = {
  suggest_words: SuggestWord[]
  [property: string]: any
}

type SuggestWord = {
  hint_text: string
  icon_url: string
  scene: string
  words: Word[]
  [property: string]: any
}

type Word = {
  info: string
  word: string
  word_id: string
  [property: string]: any
}

type TextExtra = {
  caption_end: number
  caption_start: number
  end: number
  hashtag_id: string
  hashtag_name: string
  is_commerce: boolean
  start: number
  sub_type?: number
  type: number
  [property: string]: any
}

type UserProfileInitInfo = {
  head_model_score: number
  [property: string]: any
}

type Video = {
  big_thumbs: BigThumb[] | null
  bit_rate: BitRate[]
  bit_rate_audio: null
  cdn_url_expired: number
  cover: Avatar168x168
  download_addr: DownloadAddr
  download_suffix_logo_addr?: DownloadAddr
  duration: number
  dynamic_cover: VideoIcon
  has_download_suffix_logo_addr?: boolean
  has_watermark: boolean
  height: number
  is_h265: number
  is_long_video?: number
  meta: string
  misc_download_addrs?: string
  need_set_token: boolean
  origin_cover: Avatar168x168
  play_addr: PlayAddr2
  play_addr_265: PlayAddr2
  play_addr_h264: PlayAddr2
  play_addr_lowbr: PlayAddr2
  ratio: string
  video_model?: string
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
  is_h265: number
  play_addr: PlayAddr
  quality_type: number
  video_extra: string
  [property: string]: any
}

type PlayAddr = {
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

type DownloadAddr = {
  data_size: number
  height: number
  uri: string
  url_list: string[]
  width: number
  [property: string]: any
}

type PlayAddr2 = {
  data_size: number
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
  download_info: DownloadInfo
  draft_progress_bar: number
  duet_info: DuetInfo
  prevent_download_type: number
  share_type: number
  show_progress_bar: number
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

type VideoSafetyCheckControl = {
  need_play_check: boolean
  potential_risk_level: number
  [property: string]: any
}

type VisualSearchInfo = {
  extra: string
  is_show_entrance: boolean
  [property: string]: any
}

type XiguaTask = {
  is_xigua_task: boolean
  [property: string]: any
}

type Extra = {
  fatal_item_ids: null
  now: number
  [property: string]: any
}

type LogPb = {
  impr_id: string
  [property: string]: any
}
