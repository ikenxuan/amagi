// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：2 份响应（amagi 7.0.0-beta.11）。参数与说明在 corpus/douyin/appParseWork.requests.json 里
//   aweme_id  2026-11-18 游客设备真实请求；无账号登录态

export type AppParseWork_V0 = {
  aweme_detail: AwemeDetail
  extra: Extra2
  log_pb: LogPb
  status_code: number
  [property: string]: any
}

type AwemeDetail = {
  activity_video_type: number
  admire_auth: AdmireAuth
  aigc_chat_follow_shoot_property: AigcChatFollowShootProperty
  anchors: null
  authentication_token: string
  author: Author
  author_mask_tag: number
  author_user_id: number
  aweme_acl?: AwemeAcl
  aweme_control: AwemeControl
  aweme_id: string
  aweme_listen_struct: AwemeListenStruct
  aweme_type: number
  aweme_type_tags: string
  bodydance_score: number
  boost_status: number
  can_be_oc_cover: boolean
  can_cache_to_local: boolean
  caption: string
  caption_template_id: number
  cf_assets_type: number
  cf_recheck_ts: number
  cha_list: ChaList[] | null
  challenge_position: null
  chapter_list: null
  city: string
  cmt_swt: boolean
  collect_stat: number
  collection_corner_mark: number
  comment_gid: string
  comment_list: null
  comment_permission_info: CommentPermissionInfo
  comment_words_recommend: { [property: string]: any }
  commerce_config_data: null
  commerce_info: CommerceInfo
  common_bar_info?: string
  component_control: ComponentControl
  component_info_v2: string
  cover_labels: null
  create_scale_type?: string[]
  create_time: number
  danmaku_control?: DanmakuControl
  desc: string
  desc_language: string
  disable_relation_bar: number
  dislike_dimension_list: null
  dislike_dimension_list_v2: DislikeDimensionListV2[]
  distance: string
  distribute_circle: DistributeCircle
  distribute_type: number
  diversion_bar_info: unknown[]
  douplus_user_type: number
  douyin_pc_video_extra_seo: string
  duet_aggregate_in_music_tab: boolean
  duration: number
  ecom_comment_atmosphere_type: number
  enable_comment_sticker_rec: boolean
  enable_decorated_emoji: boolean
  ent_log_extra: EntLogExtra
  entertainment_product_info: EntertainmentProductInfo
  entertainment_recommend_info: string
  entertainment_ui_config: EntertainmentUiConfig
  entertainment_video_paid_way: EntertainmentVideoPaidWay
  entertainment_video_type: number
  f_s_grouth_property: FSGrouthProperty
  fall_card_struct: FallCardStruct
  feed_comment_config: FeedCommentConfig
  feed_comment_panel_ai_tab: FeedCommentPanelAiTab
  feed_component_decision_reasons?: string
  flash_mob_trends: number
  follow_shoot_clip_info: FollowShootClipInfo
  follow_shoot_property: FollowShootProperty
  friend_interaction: number
  friend_recommend_info: FriendRecommendInfo
  game_tag_info: GameTagInfo
  geofencing: unknown[]
  geofencing_regions: null
  group_id: string
  guide_btn_type: number
  guide_scene_info: { [property: string]: any }
  has_vs_entry: boolean
  have_dashboard: boolean
  hybrid_label: null
  image_album_music_info: ImageAlbumMusicInfo
  image_comment: ImageComment
  image_crop_ctrl: number
  image_infos: null
  image_item_quality_level?: number
  image_list: null
  images: Image[] | null
  img_bitrate: unknown[] | null
  impression_data: ImpressionData
  incentive_item_type: number
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
  is_friend_panel?: number
  is_from_ad_auth: boolean
  is_hash_tag: number
  is_image_beat: boolean
  is_in_scope: boolean
  is_karaoke: boolean
  is_life_item: boolean
  is_moment_history: number
  is_moment_story: number
  is_multi_content?: number
  is_new_text_mode: number
  is_pgcshow: boolean
  is_preview: number
  is_relieve: boolean
  is_share_post: boolean
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
  label_top_text: null
  libfinsert_task_id: string
  long_video: null
  mark_largely_following: boolean
  media_type: number
  misc_info: string
  music: Music
  nearby_level: number
  need_vs_entry: boolean
  nickname_position: null
  origin_comment_ids: null
  origin_duet_resource_uri: string
  origin_text_extra: unknown[]
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
  preview_video_status: number
  product_genre_info: ProductGenreInfo
  promotions: unknown[]
  publish_plus_alienation: PublishPlusAlienation
  rate: number
  region: string
  relation_labels: null
  report_action: boolean
  risk_infos: RiskInfos
  sec_item_id: string
  series_basic_info: { [property: string]: any }
  series_paid_info: SeriesPaidInfo
  share_info: ShareInfo3
  share_post_info?: SharePostInfo
  share_rec_extra: string
  share_url: string
  shoot_way: string
  should_open_ad_report: boolean
  show_follow_button: { [property: string]: any }
  social_tag_list: null
  sort_label: string
  statistics: Statistics
  status: Status
  story_ttl: number
  suggest_words?: SuggestWords
  text_extra: TextExtra[]
  trends_event_track: string
  unified_music_group: UnifiedMusicGroup
  uniqid_position: null
  user_digged: number
  user_recommend_status: number
  video: Video
  video_control: VideoControl
  video_game_data_channel_config: { [property: string]: any }
  video_labels: null
  video_share_edit_status: number
  video_tag: VideoTag[]
  video_text: unknown[]
  visual_search_info: VisualSearchInfo
  vr_type: number
  vtag_search: VtagSearch
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
  extra_info?: string
  music_inflow_button_icon: string
  music_inflow_button_text: string
  should_ai_follow: boolean
  sticker_detail_button_icon: string
  sticker_detail_button_text: string
  [property: string]: any
}

type Author = {
  accept_private_policy: boolean
  account_cert_info?: string
  account_region: string
  ad_cover_url: null
  allow_story_normal_like: boolean
  apple_account: number
  authority_status: number
  avatar_168x168: Avatar168x168
  avatar_300x300: Avatar168x168
  avatar_larger: Avatar168x168
  avatar_medium: Avatar168x168
  avatar_thumb: Avatar168x168
  avatar_uri: string
  aweme_control: AwemeControl
  aweme_count: number
  aweme_hotsoon_auth: number
  aweme_hotsoon_auth_relation?: number
  awemehts_greet_info: string
  ban_user_functions: unknown[]
  bind_phone: string
  birthday: string
  can_set_geofencing: null
  card_entries: null
  card_entries_not_display: null
  card_sort_priority: null
  cf_list: null
  cha_list: null
  close_friend_type: number
  comment_filter_status: number
  comment_setting: number
  commerce_user_level: number
  constellation: number
  contacts_status: number
  contrail_list: null
  cover_url: Avatar168x168[]
  create_time: number
  custom_verify: string
  cv_level: string
  data_label_list: null
  display_info: null
  download_prompt_ts: number
  download_setting: number
  duet_setting: number
  enable_nearby_visible: boolean
  endorsement_info_list: null
  enterprise_verify_reason: string
  favoriting_count: number
  fb_expire_time: number
  follow_status: number
  follower_count: number
  follower_list_secondary_information_struct: null
  follower_request_status: number
  follower_status: number
  followers_detail: null
  following_count: number
  gender: number
  geofencing: unknown[]
  google_account: string
  has_email: boolean
  has_facebook_token: boolean
  has_insights: boolean
  has_orders: boolean
  has_twitter_token: boolean
  has_unread_story: boolean
  has_youtube_token: boolean
  hide_location: boolean
  hide_others_recommend_interest: number
  hide_search: boolean
  hide_self_recommend_interest: number
  homepage_bottom_toast: null
  im_role_ids: null
  ins_id: string
  interest_tags: null
  is_ad_fake: boolean
  is_binded_weibo: boolean
  is_block: boolean
  is_blocked_v2: boolean
  is_blocking_v2: boolean
  is_cf: number
  is_discipline_member: boolean
  is_gov_media_vip: boolean
  is_mix_user: boolean
  is_not_show: boolean
  is_phone_binded: boolean
  is_star: boolean
  is_verified: boolean
  item_list: null
  ky_only_predict: number
  language: string
  link_item_list: null
  live_agreement: number
  live_agreement_time: number
  live_commerce: boolean
  live_high_value: number
  live_status: number
  live_verify: number
  location: string
  mate_add_permission: number
  max_follower_count: number
  need_points: null
  need_recommend: number
  neiguang_shield: number
  new_story_cover: null
  nickname: string
  offline_info_list: null
  personal_tag_list: null
  platform_sync_info: null
  prevent_download: boolean
  react_setting: number
  reflow_page_gid: number
  reflow_page_uid: number
  region: string
  relative_users: null
  risk_notice_text: string
  room_id: number
  school_category: number
  school_id: string
  school_name: string
  school_poi_id: string
  school_type: number
  search_impr: SearchImpr
  sec_uid: string
  secret: number
  share_info: ShareInfo
  share_qrcode_uri: string
  shield_comment_notice: number
  shield_digg_notice: number
  shield_follow_notice: number
  short_id: string
  show_image_bubble: boolean
  show_nearby_active: boolean
  signature: string
  signature_display_lines: number
  signature_extra: null
  special_follow_status: number
  special_lock: number
  special_people_labels: null
  status: number
  stitch_setting: number
  story25_comment: number
  story_count: number
  story_interactive: number
  story_message?: number
  story_open: boolean
  story_ttl: number
  sync_to_toutiao: number
  text_extra: null
  total_favorited: number
  tw_expire_time: number
  twitter_id: string
  twitter_name: string
  type_label: null
  uid: string
  unique_id: string
  unique_id_modify_time: number
  user_age: number
  user_canceled: boolean
  user_mode: number
  user_not_see: number
  user_not_show: number
  user_period: number
  user_permissions: null
  user_rate: number
  user_tags: null
  verification_type: number
  verify_info: string
  video_icon: VideoIcon
  weibo_name: string
  weibo_schema: string
  weibo_url: string
  weibo_verify: string
  white_cover_url: null
  with_commerce_entry: boolean
  with_dou_entry: boolean
  with_fusion_shop_entry: boolean
  with_shop_entry: boolean
  youtube_channel_id: string
  youtube_channel_title: string
  youtube_expire_time: number
  [property: string]: any
}

type Avatar168x168 = {
  height: number
  uri: string
  url_list: string[]
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

type SearchImpr = {
  entity_id: string
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

type VideoIcon = {
  height: number
  uri: string
  url_list: unknown[]
  width: number
  [property: string]: any
}

type AwemeAcl = {
  download_mask_panel: DownloadMaskPanel
  [property: string]: any
}

type DownloadMaskPanel = {
  code: number
  show_type: number
  [property: string]: any
}

type AwemeListenStruct = {
  listen_diversion: ListenDiversion
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
  avatar_168x168: VideoIcon
  avatar_300x300: VideoIcon
  avatar_larger: VideoIcon
  avatar_medium: VideoIcon
  avatar_thumb: VideoIcon
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
  video_icon: VideoIcon
  white_cover_url: null
  with_dou_entry: boolean
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

type CommentPermissionInfo = {
  can_comment: boolean
  comment_permission_status: number
  item_detail_entry: boolean
  press_entry: boolean
  toast_guide: boolean
  [property: string]: any
}

type CommerceInfo = {
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

type DislikeDimensionListV2 = {
  entitys: Entity[]
  icon: string
  text: string
  [property: string]: any
}

type Entity = {
  dimension_id: number
  en_name: string
  pre_text: string
  server_extra: string
  sub_text?: string
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

type FallCardStruct = {
  cover_bg_color?: CoverBgColor
  recommend_reason_v2: string
  [property: string]: any
}

type CoverBgColor = {
  for_dark: string
  for_white: string
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
  clip_from_platform?: string
  clip_from_user?: string
  clip_video_all: string
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

type Image = {
  download_url_list: string[]
  height: number
  is_new_text_mode: number
  resolution_log_param: { [property: string]: any }
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
  shoot_duration: number
  show_origin_clip: boolean
  source_platform: number
  start_time: number
  status: number
  tag_list: null
  title: string
  unshelve_countries: null
  user_count: number
  video_duration: number
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

type SharePostInfo = {
  share_type: string
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
  hashtag_id: string
  hashtag_name: string
  is_commerce: boolean
  start: number
  sub_type: number
  type: number
  [property: string]: any
}

type UnifiedMusicGroup = {
  major_ug_id: string
  minor_ug_id: string
  ug_id: string
  [property: string]: any
}

type Video = {
  animated_cover?: AnimatedCover
  audio: { [property: string]: any }
  big_thumbs: BigThumb[] | null
  bit_rate?: BitRate[]
  bit_rate_audio: null
  cdn_url_expired?: number
  cover: Avatar168x168
  cover_original_scale?: Avatar168x168
  download_addr?: DownloadAddr
  download_suffix_logo_addr?: DownloadAddr
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

type AnimatedCover = {
  uri: string
  url_list: string[]
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
  text_copy_type?: number
  timer_info: { [property: string]: any }
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
  level: number
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
  visual_search_longpress: number
  [property: string]: any
}

type VtagSearch = {
  default_vtag_data: string
  default_vtag_enable: boolean
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
