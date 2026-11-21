// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 7.0.0-beta.11）。参数与说明在 corpus/douyin/appUserVideoList.requests.json 里
//   sec_uid  2026-11-18 游客设备真实请求；无账号登录态

export type AppUserVideoList_V0 = {
  aweme_list: AwemeList[]
  extra: Extra2
  has_more: number
  log_pb: LogPb
  max_cursor: number
  min_cursor: number
  not_login_module: NotLoginModule
  post_serial: number
  replace_series_cover: number
  request_item_cursor: number
  sec_uid: string
  status_code: number
  status_msg: string
  uid: string
  [property: string]: any
}

type AwemeList = {
  activity_video_type: number
  admire_auth: AdmireAuth
  aigc_chat_follow_shoot_property: AigcChatFollowShootProperty
  anchors: null
  authentication_token: string
  author: Author
  author_mask_tag: number
  author_user_id: number
  aweme_control: AwemeControl
  aweme_id: string
  aweme_listen_struct: AwemeListenStruct
  aweme_type: number
  aweme_type_tags: string
  bodydance_score: number
  boost_status: number
  can_be_oc_cover?: boolean
  can_cache_to_local: boolean
  caption: string
  caption_template_id: number
  cf_assets_type: number
  cha_list: ChaList[]
  challenge_position: null
  chapter_list: null
  city: string
  clip_paging?: ClipPaging
  cmt_swt: boolean
  collect_stat: number
  collection_corner_mark: number
  comment_gid: string
  comment_list: null
  comment_permission_info: CommentPermissionInfo
  comment_words_recommend: { [property: string]: any }
  commerce_config_data: null
  commerce_info: CommerceInfo
  common_bar_info: string
  component_control: ComponentControl
  component_info_v2: string
  cover_labels: null
  create_time: number
  danmaku_control?: DanmakuControl
  desc: string
  desc_language: string
  disable_relation_bar: number
  distance: string
  distribute_circle: DistributeCircle
  distribute_type: number
  diversion_bar_info: unknown[]
  douplus_user_type: number
  douyin_p_c_video_extra?: string
  duet_aggregate_in_music_tab: boolean
  duration: number
  enable_comment_sticker_rec: boolean
  enable_decorated_emoji: boolean
  ent_log_extra: EntLogExtra
  entertainment_product_info: EntertainmentProductInfo
  entertainment_recommend_info: string
  entertainment_ui_config: EntertainmentUiConfig
  entertainment_video_paid_way: EntertainmentVideoPaidWay
  entertainment_video_type: number
  f_s_grouth_property: FSGrouthProperty
  feed_comment_config: FeedCommentConfig
  feed_comment_panel_ai_tab: FeedCommentPanelAiTab
  feed_component_decision_reasons: string
  flash_mob_trends: number
  follow_shoot_clip_info: FollowShootClipInfo
  follow_shoot_property: FollowShootProperty
  friend_recommend_info: FriendRecommendInfo
  game_tag_info: GameTagInfo
  geofencing: unknown[]
  geofencing_regions: null
  group_id: string
  guide_btn_type: number
  has_trends?: number
  has_vs_entry: boolean
  have_dashboard: boolean
  hybrid_label: null
  image_album_music_info: ImageAlbumMusicInfo
  image_comment: ImageComment
  image_crop_ctrl: number
  image_infos: null
  image_ins_creation_info?: ImageInsCreationInfo
  image_item_quality_level?: number
  image_list: null
  images: Image[] | null
  img_bitrate: null
  impression_data: ImpressionData
  interaction_stickers: null
  interactive_info: { [property: string]: any }
  ip_attribution: string
  is_24_story: number
  is_25_story: number
  is_ads: boolean
  is_aigc_media: boolean
  is_collects_selected: number
  is_duet_sing: boolean
  is_fantasy: boolean
  is_first_video: boolean
  is_friend_panel: number
  is_from_ad_auth: boolean
  is_hash_tag: number
  is_image_beat: boolean
  is_in_scope: boolean
  is_karaoke: boolean
  is_life_item: boolean
  is_live_photo?: number
  is_moment_history: number
  is_moment_story: number
  is_multi_content?: number
  is_new_text_mode: number
  is_pgcshow: boolean
  is_preview: number
  is_relieve: boolean
  is_share_post: boolean
  is_slides?: boolean
  is_slides_beat?: number
  is_story: number
  is_subtitled: number
  is_top: number
  is_use_music: boolean
  is_vr: boolean
  item_aigc_follow_shot: number
  item_comment_settings: number
  item_duet: number
  item_react: number
  item_share: number
  item_stitch: number
  item_title: string
  item_warn_notification: ItemWarnNotification
  label_top: Avatar168x168
  label_top_text: null
  libfinsert_task_id: string
  long_video: null
  main_arch_common?: string
  mark_largely_following: boolean
  media_type: number
  misc_info: string
  music: Music
  nearby_level: number
  need_vs_entry: boolean
  nickname_position: null
  origin_comment_ids: null
  origin_duet_resource_uri: string
  original: number
  original_images: null
  pack_usage_scene_by_req_path: string
  packed_clips: null
  personal_page_botton_diagnose_style: number
  photo_search_entrance: PhotoSearchEntrance
  poi_biz: { [property: string]: any }
  poi_patch_info: PoiPatchInfo
  position: null
  press_panel_info: string
  prevent_download: boolean
  preview_title: string
  product_genre_info: ProductGenreInfo
  promotions: unknown[]
  publish_plus_alienation: PublishPlusAlienation
  rate: number
  region: string
  related_music_anchor?: RelatedMusicAnchor
  risk_infos: RiskInfos
  sec_item_id: string
  series_basic_info: { [property: string]: any }
  series_paid_info: SeriesPaidInfo
  share_info: ShareInfo3
  share_url: string
  shoot_way: string
  show_follow_button: { [property: string]: any }
  social_tag_list: null
  sort_label: string
  statistics: Statistics
  status: Status
  story_ttl: number
  suggest_words: SuggestWords
  text_extra: TextExtra[]
  tool_bar: { [property: string]: any }
  trends_event_track: string
  trends_infos?: TrendsInfo[]
  trends_top_music?: TrendsTopMusic
  unified_music_group: UnifiedMusicGroup
  uniqid_position: null
  user_digged: number
  user_recommend_status: number
  video: Video2
  video_control: VideoControl
  video_game_data_channel_config: { [property: string]: any }
  video_labels: null
  video_share_edit_status: number
  video_tag: VideoTag[]
  video_text: null
  visual_search_info: VisualSearchInfo
  vr_type: number
  vtag_search?: VtagSearch
  with_promotional_music: boolean
  without_watermark: boolean
  xigua_base_info: XiguaBaseInfo
  xigua_task: XiguaTask
  [property: string]: any
}

type AdmireAuth = {
  admire_button: number
  author_can_admire: number
  exit_admire_in_aweme_post: number
  is_admire: number
  is_click_admire_icon_recently: number
  is_fifty_admire_author_stable_fans: number
  is_iron_fans_in_aweme_post: number
  is_show_admire_button: number
  is_show_admire_tab: number
  [property: string]: any
}

type AigcChatFollowShootProperty = {
  exclude_reason?: string
  music_inflow_button_icon: string
  music_inflow_button_text: string
  should_ai_follow: boolean
  sticker_detail_button_icon: string
  sticker_detail_button_text: string
  [property: string]: any
}

type Author = {
  account_cert_info: string
  allow_story_normal_like: boolean
  authority_status: number
  avatar_168x168: Avatar168x168
  avatar_300x300: Avatar168x168
  avatar_larger: Avatar168x168
  avatar_medium: Avatar168x168
  avatar_thumb: Avatar168x168
  comment_filter_status: number
  comment_setting: number
  commerce_user_level: number
  cover_url: Avatar168x168[]
  custom_verify: string
  download_setting: number
  duet_setting: number
  enterprise_verify_reason: string
  follow_status: number
  follower_status: number
  has_unread_story: boolean
  hide_location: boolean
  hide_others_recommend_interest: number
  hide_self_recommend_interest: number
  is_ad_fake: boolean
  is_block: boolean
  is_discipline_member: boolean
  is_gov_media_vip: boolean
  is_mix_user: boolean
  is_star: boolean
  is_verified: boolean
  language: string
  live_status: number
  location: string
  nickname: string
  original_musician: OriginalMusician
  prevent_download: boolean
  region: string
  risk_notice_text: string
  room_id: number
  sec_uid: string
  secret: number
  share_info: ShareInfo
  short_id: string
  signature: string
  stitch_setting: number
  story25_comment: number
  story_count: number
  story_interactive: number
  story_ttl: number
  sync_to_toutiao: number
  uid: string
  unique_id: string
  verification_type: number
  verify_info: string
  video_icon: ShareQrcodeUrl
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

type OriginalMusician = {
  digg_count: number
  music_count: number
  music_used_count: number
  [property: string]: any
}

type ShareInfo = {
  share_desc: string
  share_desc_info: string
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
  url_list: unknown[]
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
  extra: Extra[]
  popup_scene: number
  side_desc: string
  sub_title_type: string
  [property: string]: any
}

type Extra = {
  key: string
  val: string
  [property: string]: any
}

type ChaList = {
  author: Author2
  banner_list: null
  cha_attrs: null
  cha_name: string
  cid: string
  collect_stat: number
  connect_music: unknown[]
  desc: string
  extra_attr: ExtraAttr
  hashtag_profile: string
  is_challenge: number
  is_commerce: boolean
  is_pgcshow: boolean
  schema: string
  search_impr: SearchImpr
  share_info: ShareInfo2
  show_items: null
  sub_type: number
  type: number
  user_count: number
  view_count: number
  [property: string]: any
}

type Author2 = {
  ad_cover_url: null
  avatar_168x168: ShareQrcodeUrl
  avatar_300x300: ShareQrcodeUrl
  avatar_larger: ShareQrcodeUrl
  avatar_medium: ShareQrcodeUrl
  avatar_thumb: ShareQrcodeUrl
  avatar_uri: string
  aweme_control: { [property: string]: any }
  ban_user_functions: null
  bind_phone: string
  birthday: string
  can_set_geofencing: null
  card_entries: null
  card_entries_not_display: null
  card_sort_priority: null
  cf_list: null
  cha_list: null
  constellation: number
  contrail_list: null
  cover_url: unknown[]
  create_time: number
  data_label_list: null
  display_info: null
  endorsement_info_list: null
  follow_status: number
  follower_list_secondary_information_struct: null
  followers_detail: null
  gender: number
  has_email: boolean
  homepage_bottom_toast: null
  im_role_ids: null
  interest_tags: null
  is_block: boolean
  is_phone_binded: boolean
  item_list: null
  language: string
  link_item_list: null
  need_points: null
  new_story_cover: null
  nickname: string
  offline_info_list: null
  personal_tag_list: null
  platform_sync_info: null
  region: string
  relative_users: null
  search_impr: SearchImpr
  sec_uid: string
  short_id: string
  show_image_bubble: boolean
  signature: string
  signature_extra: null
  special_people_labels: null
  status: number
  text_extra: null
  type_label: null
  uid: string
  unique_id: string
  unique_id_modify_time: number
  user_permissions: null
  user_tags: null
  video_icon: ShareQrcodeUrl
  white_cover_url: null
  with_dou_entry: boolean
  [property: string]: any
}

type SearchImpr = {
  entity_id: string
  [property: string]: any
}

type ExtraAttr = {
  is_live: boolean
  [property: string]: any
}

type ShareInfo2 = {
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

type ClipPaging = {
  direct: number
  has_more: boolean
  source: string
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

type CommerceInfo = {
  ad_ban_mask: number
  ad_type: number
  is_ad: boolean
  [property: string]: any
}

type ComponentControl = {
  data_source_url: string
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
  smart_mode_decision: number
  [property: string]: any
}

type Activity = {
  id: number
  type: number
  [property: string]: any
}

type DistributeCircle = {
  campus_block_interaction: boolean
  distribute_type: number
  is_campus: boolean
  [property: string]: any
}

type EntLogExtra = {
  log_extra: string
  [property: string]: any
}

type EntertainmentProductInfo = {
  market_info: MarketInfo
  [property: string]: any
}

type MarketInfo = {
  limit_free: LimitFree
  [property: string]: any
}

type LimitFree = {
  in_free: boolean
  [property: string]: any
}

type EntertainmentUiConfig = {
  block_card_buttons: unknown[]
  flow_bottom_buttons: unknown[]
  landscape_block_buttons: unknown[]
  [property: string]: any
}

type EntertainmentVideoPaidWay = {
  enable_use_new_ent_data: boolean
  paid_type: number
  paid_ways: unknown[]
  [property: string]: any
}

type FSGrouthProperty = {
  is_client_pack: boolean
  is_natural_traffic: boolean
  is_related_path: boolean
  [property: string]: any
}

type FeedCommentConfig = {
  audio_comment_permission: number
  author_audit_status: number
  common_comment_permission: number
  common_flags: string
  double_publish_limit: number
  image_challenge: ImageChallenge
  input_config_text: string
  input_config_text_type: string
  is_use_preload_threshold: boolean
  preload_threshold: number
  [property: string]: any
}

type ImageChallenge = {
  inner_publish_text: string
  [property: string]: any
}

type FeedCommentPanelAiTab = {
  fit_ai_summarize: boolean
  show_comment_ai_tab: boolean
  [property: string]: any
}

type FollowShootClipInfo = {
  clip_from_user?: string
  clip_video_all?: string
  origin_clip_id?: string
  [property: string]: any
}

type FollowShootProperty = {
  recommended_camera_mode: string
  [property: string]: any
}

type FriendRecommendInfo = {
  disable_friend_recommend_guide_label: boolean
  friend_recommend_source: number
  [property: string]: any
}

type GameTagInfo = {
  is_game: boolean
  [property: string]: any
}

type ImageAlbumMusicInfo = {
  begin_time: number
  end_time: number
  volume: number
  [property: string]: any
}

type ImageComment = {
  comment_highlight_text: string
  [property: string]: any
}

type ImageInsCreationInfo = {
  button: string
  dark_icon: Avatar168x168
  dark_panel_icon: Avatar168x168
  icon: Avatar168x168
  log_info: string
  panel_icon: Avatar168x168
  schema: string
  sub_title: string
  title: string
  type: number
  [property: string]: any
}

type Image = {
  clip_type: number
  download_url_list: string[]
  height: number
  index: number
  is_aigc_media?: boolean
  is_new_text_mode?: number
  live_photo_type?: number
  preview?: Preview
  resolution_log_param: ResolutionLogParam
  uri: string
  url_list: string[]
  video?: Video
  width: number
  [property: string]: any
}

type Preview = {
  data: string
  meta_key: string
  type: number
  [property: string]: any
}

type ResolutionLogParam = {
  image_publish_height: number
  image_publish_width: number
  image_source_height: number
  image_source_width: number
  video_publish_height?: number
  video_publish_width?: number
  video_source_height?: number
  video_source_width?: number
  [property: string]: any
}

type Video = {
  big_thumbs: unknown[]
  bit_rate: BitRate[]
  bit_rate_audio: null
  cdn_url_expired: number
  cover: Avatar168x168
  download_addr: DownloadAddr
  download_suffix_logo_addr?: DownloadAddr
  duration: number
  has_download_suffix_logo_addr?: boolean
  has_watermark: boolean
  height: number
  is_bytevc1: number
  is_callback: boolean
  is_h265: number
  is_source_HDR: number
  meta: string
  need_set_token: boolean
  origin_cover: ShareQrcodeUrl
  play_addr: PlayAddr
  play_addr_265?: PlayAddr
  play_addr_h264: PlayAddr
  play_addr_lowbr: PlayAddr
  ratio: string
  tags: null
  width: number
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
  file_cs: string
  file_hash: string
  height: number
  res_enum: number
  uri: string
  url_key: string
  url_list: string[]
  width: number
  [property: string]: any
}

type DownloadAddr = {
  data_size?: number
  height: number
  uri: string
  url_list: string[]
  width: number
  [property: string]: any
}

type ImpressionData = {
  group_id_list_a: unknown[]
  group_id_list_b: unknown[]
  group_id_list_c: unknown[]
  group_id_list_d: unknown[]
  similar_id_list_a: null
  similar_id_list_b: null
  [property: string]: any
}

type ItemWarnNotification = {
  content: string
  show: boolean
  type: number
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
  id: string
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
  lyric_short_position: null
  matched_pgc_sound?: MatchedPgcSound
  matched_song?: MatchedSong
  mid: string
  music_chart_ranks: null
  music_collect_count: number
  music_cover_atmosphere_color_value: string
  music_image_beats?: MusicImageBeats
  music_status: number
  musician_user_infos: null
  mute_share: boolean
  offline_desc: string
  owner_handle: string
  owner_id?: string
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
  sec_uid?: string
  shoot_duration: number
  show_origin_clip: boolean
  song?: Song
  source_platform: number
  start_time: number
  status: number
  strong_beat_url?: Avatar168x168
  tag_list: null
  title: string
  unshelve_countries: null
  user_count: number
  video_duration: number
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

type MatchedSong = {
  author: string
  cover_medium: Avatar168x168
  dsp_name: string
  full_clip_id: string
  group_id: string
  h5_url: string
  id: string
  source_id: string
  title: string
  [property: string]: any
}

type MusicImageBeats = {
  music_image_beats_url: Avatar168x168
  [property: string]: any
}

type PlayUrl = {
  data_size?: number
  height: number
  uri: string
  url_key: string
  url_list: string[]
  width: number
  [property: string]: any
}

type Song = {
  artists: null
  id: string
  id_str: string
  [property: string]: any
}

type PhotoSearchEntrance = {
  ecom_type: number
  [property: string]: any
}

type PoiPatchInfo = {
  extra: string
  item_patch_poi_prompt_mark: number
  [property: string]: any
}

type ProductGenreInfo = {
  material_genre_sub_type_set: number[]
  product_genre_type: number
  special_info: SpecialInfo
  [property: string]: any
}

type SpecialInfo = {
  recommend_group_name: number
  [property: string]: any
}

type PublishPlusAlienation = {
  alienation_type: number
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
  risk_sink: boolean
  type: number
  vote: boolean
  warn: boolean
  [property: string]: any
}

type SeriesPaidInfo = {
  item_price: number
  series_paid_status: number
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

type Status = {
  allow_comment: boolean
  allow_friend_recommend: boolean
  allow_friend_recommend_guide: boolean
  allow_self_recommend_to_friend: boolean
  allow_share: boolean
  aweme_edit_info: AwemeEditInfo
  aweme_id: string
  dont_share_status: number
  download_status: number
  enable_soft_delete: number
  in_reviewing: boolean
  is_delete: boolean
  is_private: boolean
  is_prohibited: boolean
  listen_video_status: number
  not_allow_soft_del_reason?: string
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
  edit_quota_left: number
  edit_status: number
  has_modified_all: boolean
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
  start: number
  sub_type?: number
  type: number
  [property: string]: any
}

type TrendsInfo = {
  id: string
  title: string
  track_pass_through: string
  use_count: number
  [property: string]: any
}

type TrendsTopMusic = {
  cover_medium: Avatar168x168
  [property: string]: any
}

type UnifiedMusicGroup = {
  author?: string
  major_ug_id?: string
  medium_cover_url?: Avatar168x168
  minor_ug_id?: string
  song_id?: string
  title?: string
  ug_id?: string
  [property: string]: any
}

type Video2 = {
  animated_cover?: ImageUrl
  audio: { [property: string]: any }
  big_thumbs: BigThumb[] | null
  bit_rate?: BitRate[]
  bit_rate_audio: null
  cdn_url_expired?: number
  cover: Avatar168x168
  download_addr?: DownloadAddr2
  download_suffix_logo_addr?: DownloadAddr2
  duration: number
  dynamic_cover?: Avatar168x168
  format?: string
  has_download_suffix_logo_addr?: boolean
  has_watermark: boolean
  height: number
  is_bytevc1: number
  is_callback?: boolean
  is_h265: number
  is_long_video?: number
  is_source_HDR?: number
  meta: string
  misc_download_addrs?: string
  need_set_token?: boolean
  origin_cover: Avatar168x168
  play_addr: PlayAddr2
  play_addr_265?: PlayAddr
  play_addr_h264?: PlayAddr
  play_addr_lowbr?: PlayAddr
  ratio: string
  tags: null
  use_static_cover?: boolean
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

type DownloadAddr2 = {
  data_size: number
  file_cs: string
  height: number
  uri: string
  url_list: string[]
  width: number
  [property: string]: any
}

type PlayAddr2 = {
  data_size: number
  file_cs?: string
  file_hash?: string
  height: number
  res_enum?: number
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
  allow_transcribe?: number
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
  level: number
  [property: string]: any
}

type DuetInfo = {
  fail_info?: FailInfo
  level: number
  [property: string]: any
}

type FailInfo = {
  code: number
  reason: string
  [property: string]: any
}

type TimerInfo = {
  public_time?: number
  timer_status?: number
  [property: string]: any
}

type VideoTag = {
  level: number
  tag_id: number
  tag_name: string
  [property: string]: any
}

type VisualSearchInfo = {
  is_ecom_img: boolean
  is_high_accuracy_ecom: boolean
  is_high_recall_ecom: boolean
  is_show_img_entrance: boolean
  panel_entrance_intent: string
  panel_entrance_text: string
  tag_space: string
  visual_search_longpress?: number
  [property: string]: any
}

type VtagSearch = {
  default_vtag_data?: string
  default_vtag_enable?: boolean
  vtag_delay_ts: number
  vtag_enable: boolean
  [property: string]: any
}

type XiguaBaseInfo = {
  item_id: number
  star_altar_order_id: number
  star_altar_type: number
  status: number
  [property: string]: any
}

type XiguaTask = {
  is_xigua_task: boolean
  [property: string]: any
}

type Extra2 = {
  fatal_item_ids: unknown[]
  logid: string
  now: number
  [property: string]: any
}

type LogPb = {
  impr_id: string
  [property: string]: any
}

type NotLoginModule = {
  extra: string
  guide_login_tip_cover_url: Avatar168x168
  guide_login_tip_exist: boolean
  guide_login_tip_style: number
  [property: string]: any
}
