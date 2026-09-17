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
// 本文件是判别联合的一支：`__search_type === 'general'`，形状序号 0。
// 要收窄用同端点 `guards.ts` 里的 `isGeneral`（它收窄整个信封）；只读这一支内部字段的话，裸 `if` / `switch` 判断判别字段同样收窄 —— 收窄的是判别字段所在的那个对象、不是信封，见 core 的 dynamic-detail-union.test-d.ts。

export type General_V0 = {
  __search_type: 'general'
  ad_info?: { [property: string]: any }
  cursor: number
  data: Data[]
  douyin_ai_search_info: DouyinAiSearchInfo
  extra: Extra
  global_doodle_config: GlobalDoodleConfig
  guide_search_words: GuideSearchWord[] | null
  has_more: number
  log_pb: LogPb
  multi_columns_info?: MultiColumnsInfo
  ops: null
  polling_time: number
  qc: string
  result_status: number
  search_nil_info?: SearchNilInfo
  status_code: number
  time_cost?: TimeCost
  [property: string]: any
}

type Data = {
  aweme_info?: AwemeInfo
  aweme_list: null
  card_id?: string
  card_info?: CardInfo
  card_style_type?: number
  card_type?: number
  card_type_id?: CardTypeId
  card_unique_name: string
  data?: Data2
  debug_data?: DebugData
  debug_diff_info: { [property: string]: any }
  doc_type: number
  ecom_goods_list: null
  fp?: string
  log_data?: LogData
  lynx_info?: LynxInfo
  music_info_list: null
  ops: null
  provider_doc_id: number
  provider_doc_id_str: string
  qishui_music_list: null
  related_word_list?: RelatedWordList[]
  send_back?: string
  shoot_position_list: null
  show_tab: null
  sub_card_list: unknown[] | null
  tab: null
  type: number
  user_list?: UserList2[]
  words_query_record?: WordsQueryRecord
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
  danmaku_control?: DanmakuControl
  desc: string
  dislike_dimension_list: null
  dislike_dimension_list_v2: null
  diversion_bar_info: null
  douyin_p_c_video_extra?: string
  effect_inflow_effects: null
  encrypt_interest_point_list: null
  encrypt_key_phrase_list: null
  entertainment_product_info: EntertainmentProductInfo
  fake_horizontal_info?: FakeHorizontalInfo
  follow_shot_assets: null
  geofencing: null
  geofencing_regions: null
  group_id: string
  hybrid_label: null
  image_follow_shot_assets: null
  image_infos: null
  image_list: null
  images: Image[] | null
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
  relation_label?: RelationLabel
  relation_labels: null
  reply_smart_emojis: null
  risk_infos: RiskInfos
  series_info?: SeriesInfo
  share_info: ShareInfo3
  slides_music_beats: null
  social_tag_list: null
  standard_bar_info_list: null
  statistics: Statistics
  status: Status3
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
  mp_url?: string
  open_url?: string
  style_info: StyleInfo
  title: string
  title_tag: string
  type: number
  web_url?: string
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
  avatar_168x168: Avatar168x168
  avatar_300x300: Avatar168x168
  avatar_larger: Avatar168x168
  avatar_medium: Avatar168x168
  avatar_schema_list: null
  avatar_thumb: Avatar168x168
  aweme_count: number
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
  favoriting_count: number
  follow_status: number
  follower_count: number
  follower_list_secondary_information_struct: null
  follower_status: number
  followers_detail: null
  following_count: number
  geofencing: null
  homepage_bottom_toast: null
  identity_labels: null
  im_role_ids: null
  interest_tags: null
  is_block: boolean
  is_verified: boolean
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
  share_info: ShareInfo
  short_id: string
  signature: string
  signature_extra: null
  special_people_labels: null
  text_extra: null
  total_favorited: number
  type_label: null
  uid: string
  unique_id: string
  user_canceled: boolean
  user_permissions: null
  user_tags: null
  verification_permission_ids: null
  verification_type: number
  webcast_preview_labels: null
  weibo_verify: string
  white_cover_url: null
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
  share_desc_info: string
  share_qrcode_url: Avatar168x168
  share_title: string
  share_title_myself: string
  share_title_other: string
  share_url: string
  share_weibo_desc: string
  [property: string]: any
}

type DanmakuControl = {
  activities: Activity[]
  danmaku_cnt: number
  enable_danmaku: boolean
  first_danmaku_offset: number
  is_post_denied: boolean
  last_danmaku_offset: number
  pass_through_params: string
  post_denied_reason: string
  post_privilege_level: number
  skip_danmaku: boolean
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

type FakeHorizontalInfo = {
  bottom: number
  left: number
  right: number
  top: number
  [property: string]: any
}

type Image = {
  download_url_list: string[]
  height: number
  interaction_stickers: null
  is_new_text_mode: number
  mask_url_list: null
  resolution_log_param: ResolutionLogParam
  uri: string
  url_list: string[]
  watermark_free_download_url_list: null
  width: number
  [property: string]: any
}

type ResolutionLogParam = {
  image_publish_height: number
  image_publish_width: number
  image_source_height: number
  image_source_width: number
  video_publish_height: number
  video_publish_width: number
  video_source_height: number
  video_source_width: number
  [property: string]: any
}

type ImpressionData = {
  group_id_list_a: number[]
  group_id_list_b: number[]
  group_id_list_c: number[]
  group_id_list_d: null
  similar_id_list_a: number[] | null
  similar_id_list_b: number[] | null
  [property: string]: any
}

type MixInfo = {
  cover_url: Avatar168x168
  create_time: number
  dark_icon_url?: Avatar168x168
  desc: string
  disable_display: number
  disable_display_inner: number
  extra: string
  ids: null
  is_iaa: number
  is_serial_mix: number
  light_icon_url?: Avatar168x168
  mix_id: string
  mix_name: string
  mix_pic_type?: number
  mix_type: number
  paid_episodes: null
  series_new_mix_info?: SeriesNewMixInfo
  share_info: ShareInfo2
  statis: Statis
  status: Status
  update_time: number
  watched_item: string
  [property: string]: any
}

type SeriesNewMixInfo = {
  content_sub_type: number
  [property: string]: any
}

type ShareInfo2 = {
  share_desc: string
  share_desc_info: string
  share_title: string
  share_title_myself: string
  share_title_other: string
  share_url: string
  share_weibo_desc: string
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
  artists: unknown[]
  audition_duration: number
  author: string
  author_deleted: boolean
  author_position: null
  author_status?: number
  avatar_large?: Avatar168x168
  avatar_medium?: Avatar168x168
  avatar_thumb?: Avatar168x168
  binded_challenge_id: number
  can_background_play: boolean
  collect_stat: number
  cover_color_hsv?: CoverColorHsv
  cover_hd: Avatar168x168
  cover_large: Avatar168x168
  cover_medium: Avatar168x168
  cover_thumb: Avatar168x168
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
  matched_pgc_sound?: MatchedPgcSound
  mid: string
  music_chart_ranks: null
  music_collect_count: number
  music_cover_atmosphere_color_value: string
  music_status: number
  musician_user_infos: null
  mute_share: boolean
  offline_desc: string
  owner_handle: string
  owner_id?: string
  owner_nickname: string
  pgc_music_type: number
  play_url: Icon
  position: null
  prevent_download: boolean
  prevent_item_download_status: number
  preview_end_time: number
  preview_start_time: number
  reason_type: number
  redirect: boolean
  schema_url: string
  search_impr: SearchImpr
  sec_uid?: string
  shoot_duration: number
  show_origin_clip: boolean
  song?: Song
  source_platform: number
  start_time: number
  status: number
  strong_beat_url?: Avatar168x168
  tag_list: null
  talent_hashtag_name_list: null
  title: string
  unshelve_countries: null
  user_count: number
  video_duration: number
  [property: string]: any
}

type CoverColorHsv = {
  h: number
  s: number
  v: number
  [property: string]: any
}

type LunaInfo = {
  has_copyright?: boolean
  is_luna_user: boolean
  [property: string]: any
}

type MatchedPgcSound = {
  author: string
  cover_medium: Avatar168x168
  mixed_author: string
  mixed_title: string
  title: string
  [property: string]: any
}

type SearchImpr = {
  entity_id: string
  [property: string]: any
}

type Song = {
  artists: null
  chorus?: Chorus
  chorus_v3_infos: null
  id: number
  id_str: string
  title?: string
  [property: string]: any
}

type Chorus = {
  duration_ms: number
  start_ms: number
  [property: string]: any
}

type RelationLabel = {
  count: number
  extra: string
  type: number
  user_list: UserList[]
  [property: string]: any
}

type UserList = {
  avatar: Avatar168x168
  avatar_thumb: Avatar168x168
  follow_status: number
  nickname: string
  sec_uid: string
  uid: number
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
  actors: unknown[]
  content_sub_type: number
  cover_url: Avatar168x168
  create_time: number
  dark_icon_url: Avatar168x168
  desc: string
  directors: unknown[]
  disable_display_bar: number
  disable_display_bar_inner: number
  dog_card_info: { [property: string]: any }
  enable_use_new_ent_data: boolean
  entertainment_suggest_info: string
  extra: string
  horizontal_cover_url: Avatar168x168
  ids: unknown[]
  is_charge_series: number
  is_exclusive: boolean
  is_iaa: number
  light_icon_url: Avatar168x168
  paid_episodes: null
  real_name: string
  recommend_color: null
  rights_info: RightsInfo
  series_content_types: SeriesContentType[]
  series_content_types_new: null
  series_form_type: number
  series_id: string
  series_interactive: SeriesInteractive
  series_name: string
  series_new_mix_info: SeriesNewMixInfo2
  series_paid_type_list: null
  series_rank_info: { [property: string]: any }
  series_type: number
  series_ui_config: SeriesUiConfig
  share_info: ShareInfo2
  stats: Stats
  status: Status2
  update_time: number
  watched_item: string
  [property: string]: any
}

type RightsInfo = {
  has_paid: boolean
  [property: string]: any
}

type SeriesContentType = {
  name: string
  series_content_type: number
  [property: string]: any
}

type SeriesInteractive = {
  enable_config: boolean
  interactive_config: InteractiveConfig
  [property: string]: any
}

type InteractiveConfig = {
  collection_button_copy: string
  display_detail_edit_button: boolean
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

type SeriesNewMixInfo2 = {
  cash_ability: number
  content_sub_type: number
  [property: string]: any
}

type SeriesUiConfig = {
  collection_button: CollectionButton
  general_position_tag_infos: null
  paid_series_vip_entrance_config: PaidSeriesVipEntranceConfig
  series_ad_page_entrance_config: { [property: string]: any }
  series_bar_button_infos: SeriesBarButtonInfo[]
  [property: string]: any
}

type CollectionButton = {
  text: string
  [property: string]: any
}

type PaidSeriesVipEntranceConfig = {
  block_ad_buttons: unknown[]
  unblock_ad_buttons: unknown[]
  upper_right_buttons: unknown[]
  [property: string]: any
}

type SeriesBarButtonInfo = {
  button_text: string
  click_type: number
  condition_material_types: number[]
  [property: string]: any
}

type Stats = {
  collect_vv: number
  current_episode: number
  last_added_item_time: number
  play_vv: number
  total_episode: number
  updated_to_episode: number
  [property: string]: any
}

type Status2 = {
  is_collected: number
  status: number
  status_desc: string
  [property: string]: any
}

type ShareInfo3 = {
  bool_persist: number
  share_desc: string
  share_desc_info: string
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
  digest: string
  digg_count: number
  download_count: number
  exposure_count: number
  forward_count: number
  live_watch_count: number
  lose_comment_count: number
  lose_count: number
  play_count: number
  recommend_count: number
  share_count: number
  whatsapp_share_count: number
  [property: string]: any
}

type Status3 = {
  allow_comment: boolean
  allow_friend_recommend: boolean
  allow_friend_recommend_guide: boolean
  allow_self_recommend_to_friend: boolean
  allow_share: boolean
  aweme_edit_info: AwemeEditInfo
  aweme_id: string
  dont_share_status: number
  download_status: number
  in_reviewing: boolean
  is_delete: boolean
  is_private: boolean
  is_prohibited: boolean
  listen_video_status: number
  part_see: number
  private_status: number
  review_result: ReviewResult
  reviewed: number
  self_see: boolean
  video_hide_search: number
  with_fusion_goods: boolean
  with_goods: boolean
  [property: string]: any
}

type AwemeEditInfo = {
  button_status: number
  button_toast: string
  [property: string]: any
}

type ReviewResult = {
  review_status: number
  [property: string]: any
}

type SuggestWords = {
  disable_display_bar_inner: number
  suggest_words: SuggestWord[]
  [property: string]: any
}

type SuggestWord = {
  extra_info: string
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
  hashtag_id?: string
  hashtag_name?: string
  is_commerce?: boolean
  sec_uid?: string
  start: number
  type: number
  user_id?: string
  [property: string]: any
}

type Video = {
  CoverTsp?: number
  animated_cover?: AnimatedCover
  audio: Audio
  big_thumbs: BigThumb[] | null
  bit_rate: BitRate[]
  bit_rate_audio: BitRateAudio[] | null
  cdn_url_expired?: number
  cover: Avatar168x168
  download_addr?: DownloadAddr
  download_suffix_logo_addr?: DownloadAddr
  duration: number
  dynamic_cover?: Avatar168x168
  format?: string
  fuse_video_labels_v2?: FuseVideoLabelsV2
  gaussian_cover?: Avatar168x168
  has_download_suffix_logo_addr?: boolean
  has_watermark: boolean
  height: number
  horizontal_type?: number
  is_bytevc1: number
  is_callback?: boolean
  is_h265: number
  is_long_video?: number
  is_source_HDR?: number
  meta: string
  misc_download_addrs?: string
  need_set_token?: boolean
  optimized_cover?: Avatar168x168
  origin_cover: Avatar168x168
  play_addr: PlayAddr2
  play_addr_265?: PlayAddr265
  play_addr_h264?: PlayAddrH264
  play_addr_lowbr?: PlayAddrH264
  ratio: string
  raw_cover?: Avatar168x168
  search_format_ai_cover?: SearchFormatAiCover
  tag?: Tag
  tags: null
  use_static_cover?: boolean
  video_model?: string
  width: number
  [property: string]: any
}

type AnimatedCover = {
  uri: string
  url_list: string[]
  [property: string]: any
}

type Audio = {
  original_sound_infos: null
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
  data_size?: number
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

type FuseVideoLabelsV2 = {
  Top1: Top1[]
  [property: string]: any
}

type Top1 = {
  Level1: Level1
  Level2: Level1
  Level3: Level1
  Level4?: Level1
  [property: string]: any
}

type Level1 = {
  TagId: number
  [property: string]: any
}

type PlayAddr2 = {
  data_size?: number
  file_cs?: string
  file_hash?: string
  height: number
  uri: string
  url_key: string
  url_list: string[]
  width: number
  [property: string]: any
}

type PlayAddr265 = {
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

type PlayAddrH264 = {
  data_size?: number
  file_cs: string
  file_hash: string
  height: number
  uri: string
  url_key: string
  url_list: string[]
  width: number
  [property: string]: any
}

type SearchFormatAiCover = {
  height: number
  uri: string
  url_list: unknown[]
  width: number
  [property: string]: any
}

type Tag = {
  background_color: string
  font_color: string
  title: string
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
  text_copy_type?: number
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

type CardInfo = {
  fingerprint: string
  first_pos: number
  index: number
  pos: number
  [property: string]: any
}

type CardTypeId = {
  card_name: string
  doc_type?: number
  performance_infos?: PerformanceInfos
  [property: string]: any
}

type PerformanceInfos = {
  '108': number
  double_column: number
  is_native: number
  search_card_count: number
  [property: string]: any
}

type Data2 = {
  card_tags: null
  common_tab_config: null
  hotspot_tab_config: null
  rs_extra_info: RsExtraInfo
  [property: string]: any
}

type RsExtraInfo = {
  hide_related_words: null
  hide_related_words_id: null
  impr_extra: string
  query_id: string
  [property: string]: any
}

type DebugData = {
  filter_debug_info_list: null
  [property: string]: any
}

type LogData = {
  dcm: string
  search_result_id: string
  [property: string]: any
}

type LynxInfo = {
  is_subcard: boolean
  [property: string]: any
}

type RelatedWordList = {
  extra_info: ExtraInfo
  rand_num: number
  related_img: string
  related_word: string
  word_record: WordRecord
  [property: string]: any
}

type ExtraInfo = {
  words_type: string
  [property: string]: any
}

type WordRecord = {
  force_update_rank: boolean
  group_id: string
  product_id: string
  words_content: string
  words_image: WordsImage
  words_position: number
  words_source: string
  [property: string]: any
}

type WordsImage = {
  url_list: string[]
  [property: string]: any
}

type UserList2 = {
  baikes: null
  challenges: null
  ecom_info: EcomInfo
  effects: null
  fandoms: null
  is_red_uniqueid: boolean
  items: Item[]
  mix_list: null
  musics: null
  position: null
  prefer_profile_tab_type: number
  product_info: null
  product_list: null
  shop_product_info: null
  sub_card_id: SubCardId
  uniqid_position: null
  userSubLightApp: null
  user_info: UserInfo
  user_service_info: unknown[]
  [property: string]: any
}

type EcomInfo = {
  ecom_scene_id: string
  items: null
  material_product_list: null
  recommend_info_v2: null
  rights: null
  shop_service_info: null
  shop_service_info_list: null
  shop_tags: null
  tags: null
  [property: string]: any
}

type Item = {
  ai_follow_images: null
  anchor_info?: AnchorInfo2
  anchors: null
  author: Author2
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
  effect_inflow_effects: null
  encrypt_interest_point_list: null
  encrypt_key_phrase_list: null
  entertainment_product_info: EntertainmentProductInfo
  follow_shot_assets: null
  geofencing: null
  geofencing_regions: null
  group_id: string
  hot_list?: HotList
  hybrid_label: null
  image_follow_shot_assets: null
  image_infos: null
  image_list: null
  images: null
  img_bitrate: null
  impression_data: ImpressionData2
  interaction_stickers: null
  interest_points: null
  is_top: number
  jump_tab_info_list: null
  label_top_text: null
  long_video: null
  media_type: number
  music: Music2
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
  relation_label?: RelationLabel
  relation_labels: null
  reply_smart_emojis: null
  risk_infos: RiskInfos2
  share_info: ShareInfo3
  slides_music_beats: null
  social_tag_list: null
  standard_bar_info_list: null
  statistics: Statistics2
  status: Status3
  suggest_words: SuggestWords2
  text_extra: TextExtra2[]
  trends_infos: null
  tts_id_list: null
  uniqid_position: null
  user_digged: number
  video: Video2
  video_control: VideoControl2
  video_labels: null
  video_tag: null
  video_text: null
  voice_modify_id_list: null
  yumme_recreason: null
  [property: string]: any
}

type AnchorInfo2 = {
  content: string
  extra: string
  icon: Icon
  id: string
  log_extra: string
  mp_url: string
  open_url: string
  style_info: StyleInfo
  title: string
  title_tag: string
  type: number
  web_url: string
  [property: string]: any
}

type Author2 = {
  account_cert_info: string
  ad_cover_url: null
  avatar_168x168: Avatar168x168
  avatar_300x300: Avatar168x168
  avatar_larger: Avatar168x168
  avatar_medium: Avatar168x168
  avatar_schema_list: null
  avatar_thumb: Avatar168x168
  aweme_count: number
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
  favoriting_count: number
  follow_status: number
  follower_count: number
  follower_list_secondary_information_struct: null
  follower_status: number
  followers_detail: null
  following_count: number
  geofencing: null
  homepage_bottom_toast: null
  identity_labels: null
  im_role_ids: null
  interest_tags: null
  is_block: boolean
  is_verified: boolean
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
  share_info: ShareInfo
  short_id: string
  signature: string
  signature_extra: null
  special_people_labels: null
  text_extra: null
  total_favorited: number
  type_label: null
  uid: string
  unique_id: string
  user_canceled: boolean
  user_permissions: null
  user_tags: null
  verification_permission_ids: null
  verification_type: number
  webcast_preview_labels: null
  weibo_verify: string
  white_cover_url: null
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
  label?: number
  pattern_type?: number
  rank: number
  schema: string
  sentence: string
  sentence_id: number
  title: string
  type: number
  view_count: number
  [property: string]: any
}

type ImpressionData2 = {
  group_id_list_a: number[]
  group_id_list_b: unknown[]
  group_id_list_c: unknown[]
  group_id_list_d: null
  similar_id_list_a: null
  similar_id_list_b: null
  [property: string]: any
}

type Music2 = {
  album: string
  artist_user_infos: null
  artists: unknown[]
  audition_duration: number
  author: string
  author_deleted: boolean
  author_position: null
  author_status: number
  avatar_large: Avatar168x168
  avatar_medium: Avatar168x168
  avatar_thumb: Avatar168x168
  binded_challenge_id: number
  can_background_play: boolean
  collect_stat: number
  cover_hd: Avatar168x168
  cover_large: Avatar168x168
  cover_medium: Avatar168x168
  cover_thumb: Avatar168x168
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
  matched_pgc_sound?: MatchedPgcSound
  mid: string
  music_chart_ranks: null
  music_collect_count: number
  music_cover_atmosphere_color_value: string
  music_status: number
  musician_user_infos: null
  mute_share: boolean
  offline_desc: string
  owner_handle: string
  owner_id: string
  owner_nickname: string
  pgc_music_type: number
  play_url: Icon
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
  shoot_duration: number
  show_origin_clip: boolean
  song?: Song2
  source_platform: number
  start_time: number
  status: number
  strong_beat_url?: Avatar168x168
  tag_list: null
  talent_hashtag_name_list: null
  title: string
  unshelve_countries: null
  user_count: number
  video_duration: number
  [property: string]: any
}

type Song2 = {
  artists: null
  chorus_v3_infos: null
  id: number
  id_str: string
  [property: string]: any
}

type RiskInfos2 = {
  content: string
  risk_sink: boolean
  type: number
  vote: boolean
  warn: boolean
  [property: string]: any
}

type Statistics2 = {
  admire_count: number
  aweme_id: string
  collect_count: number
  comment_count: number
  digest: string
  digg_count: number
  download_count: number
  exposure_count: number
  forward_count: number
  live_watch_count: number
  lose_comment_count: number
  lose_count: number
  play_count: number
  recommend_count: number
  share_count: number
  whatsapp_share_count: number
  [property: string]: any
}

type SuggestWords2 = {
  suggest_words: SuggestWord[]
  [property: string]: any
}

type TextExtra2 = {
  caption_end: number
  caption_start: number
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

type Video2 = {
  animated_cover: AnimatedCover
  audio: Audio
  big_thumbs: BigThumb[] | null
  bit_rate: BitRate2[]
  bit_rate_audio: null
  cdn_url_expired: number
  cover: Avatar168x168
  download_addr: DownloadAddr2
  download_suffix_logo_addr: DownloadAddr2
  duration: number
  dynamic_cover: Avatar168x168
  format: string
  fuse_video_labels_v2: FuseVideoLabelsV2
  gaussian_cover: Avatar168x168
  has_download_suffix_logo_addr: boolean
  has_watermark: boolean
  height: number
  horizontal_type?: number
  is_bytevc1: number
  is_callback: boolean
  is_h265: number
  is_source_HDR: number
  meta: string
  misc_download_addrs?: string
  need_set_token: boolean
  origin_cover: Avatar168x168
  play_addr: PlayAddr265
  play_addr_265: PlayAddr265
  play_addr_h264: PlayAddr265
  play_addr_lowbr: PlayAddr265
  ratio: string
  raw_cover: Avatar168x168
  tags: null
  use_static_cover?: boolean
  video_model: string
  width: number
  [property: string]: any
}

type BitRate2 = {
  FPS: number
  HDR_bit: string
  HDR_type: string
  bit_rate: number
  format: string
  gear_name: string
  is_bytevc1: number
  is_h265: number
  play_addr: PlayAddr265
  quality_type: number
  video_extra: string
  [property: string]: any
}

type DownloadAddr2 = {
  data_size: number
  file_cs: string
  height: number
  uri: string
  url_list: string[]
  width: number
  [property: string]: any
}

type VideoControl2 = {
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
  download_info: DownloadInfo2
  draft_progress_bar: number
  duet_ignore_visibility: boolean
  duet_info: DownloadInfo2
  prevent_download_type: number
  share_grayed: boolean
  share_ignore_visibility: boolean
  share_type: number
  show_ai_corner: boolean
  show_progress_bar: number
  show_watermark: boolean
  timer_info: TimerInfo2
  timer_status: number
  [property: string]: any
}

type DownloadInfo2 = {
  level: number
  [property: string]: any
}

type TimerInfo2 = {
  public_time?: number
  timer_status: number
  [property: string]: any
}

type SubCardId = {
  items: string
  [property: string]: any
}

type UserInfo = {
  account_cert_info: string
  ad_cover_url: null
  avatar_168x168: Avatar168x168
  avatar_300x300: Avatar168x168
  avatar_larger: Avatar168x168
  avatar_medium: Avatar168x168
  avatar_schema_list: null
  avatar_thumb: Avatar168x168
  aweme_count: number
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
  favoriting_count: number
  follow_status: number
  follower_count: number
  follower_count_str: string
  follower_list_secondary_information_struct: null
  follower_status: number
  followers_detail: null
  following_count: number
  geofencing: null
  homepage_bottom_toast: null
  identity_labels: null
  im_role_ids: null
  interest_tags: null
  is_block: boolean
  is_verified: boolean
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
  share_info: ShareInfo
  short_id: string
  signature: string
  signature_extra: null
  special_people_labels: null
  text_extra: null
  total_favorited: number
  type_label: null
  uid: string
  unique_id: string
  user_canceled: boolean
  user_permissions: null
  user_tags: unknown[]
  verification_permission_ids: null
  verification_type: number
  webcast_preview_labels: null
  weibo_verify: string
  white_cover_url: null
  [property: string]: any
}

type WordsQueryRecord = {
  info: string
  query_id: string
  words_source: string
  [property: string]: any
}

type DouyinAiSearchInfo = {
  ai_search_req_patch: { [property: string]: any }
  is_hit_high_risk: boolean
  is_simple_qa_intent: boolean
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
  filter_style?: number
  harmony_version: number
  huoshan_android_version: number
  huoshan_ios_version: number
  ios_version: number
  items: Item2[]
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

type Item2 = {
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

type MultiColumnsInfo = {
  group_tag: string
  is_multi_columns: boolean
  [property: string]: any
}

type SearchNilInfo = {
  is_load_more: string
  search_nil_item: string
  search_nil_type: string
  text_type: number
  [property: string]: any
}

type TimeCost = {
  '1st_screen_state': string
  FEDERATION_federation_latency: number
  ack_status: string
  can_ack: string
  complete_time: number
  disable_forecast_cut: number
  disable_optimize_2023: string
  double_column: boolean
  douyin_disease_aggr_video_query_tag: string
  enable_ab_refactor: string
  engine_intent_cat: string
  fed_cache_status: string
  fed_recall_cost: number
  fed_recall_end: number
  first_no_ad: string
  first_screen_card_businesses: string
  first_screen_card_cnt: number
  first_screen_card_names: string
  first_screen_real_lynx_num: number
  first_screen_real_lynx_type: string
  first_screen_sub_card_real_lynx_num: number
  first_screen_sub_card_real_lynx_type: string
  forecast: string
  forecast_ack_reason: string
  forecast_fs_all_hit: string
  forecast_produce_end: number
  forecast_provider_end: number
  goods_card_has_ad: string
  has_ad: string
  hit_user_history_cache: string
  idc: string
  is_cpt_ad: string
  is_go_forecast: string
  is_nil_search: string
  keypoint: string
  loader_time_cost_slowest_loader: string
  loader_time_cost_slowest_loader_latency: number
  log_id: string
  merge_fs_status: string
  merged_fs_all_hit: string
  mf2_append_doc_len: number
  multi_chunk: string
  new_chunk_state: string
  pd: string
  predict_n: number
  preload_miss_count: number
  query: string
  query_tags: string
  quick_ack_failed_detail: string
  reason: string
  search_source_api: string
  server_key_path: string
  skip_provider_ack_reason: string
  stream: string
  stream_inner: number
  target_query_tags: string
  tp_end_forecast_produce: number
  [property: string]: any
}
