// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/userVideoList.requests.json 里
//   sec_uid  常见默认值

export type UserVideoList_V0 = {
  aweme_list: AwemeList[]
  has_more: number
  log_pb: LogPb
  max_cursor: number
  min_cursor: number
  post_serial: number
  replace_series_cover: number
  request_item_cursor: number
  status_code: number
  time_list: string[]
  [property: string]: any
}

type AwemeList = {
  activity_video_type: number
  ad_charge_passive_unlock_config?: AdChargePassiveUnlockConfig
  ai_follow_images: null
  anchor_info?: AnchorInfo
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
  boost_status: number
  can_be_oc_cover: boolean
  can_cache_to_local: boolean
  caption: string
  cf_assets_type: number
  challenge_position: null
  chapter_bar_color: null
  chapter_list: null
  collect_stat: number
  collection_corner_mark: number
  comment_gid: number
  comment_list: null
  comment_permission_info: CommentPermissionInfo
  commerce_config_data: null
  common_button?: CommonButton
  common_left_top_labels: null
  component_control: ComponentControl
  component_info_v2: string
  cover_labels: null
  create_scale_type: null
  create_time: number
  danmaku_control: DanmakuControl
  desc: string
  disable_relation_bar: number
  dislike_dimension_list: null
  dislike_dimension_list_v2: null
  distribute_circle: DistributeCircle
  diversion_bar_info: unknown[]
  douplus_user_type: number
  douyin_p_c_video_extra?: string
  duet_aggregate_in_music_tab: boolean
  duration: number
  effect_inflow_effects: null
  enable_comment_sticker_rec: boolean
  enable_decorated_emoji: boolean
  encrypt_interest_point_list: null
  encrypt_key_phrase_list: null
  ent_log_extra: EntLogExtra
  entertainment_feature_info?: EntertainmentFeatureInfo
  entertainment_product_info: EntertainmentProductInfo
  entertainment_recommend_info: string
  entertainment_video_paid_way: EntertainmentVideoPaidWay
  entertainment_video_type: number
  f_s_grouth_property: FSGrouthProperty
  feed_comment_config: FeedCommentConfig
  feed_component_decision_reasons?: string
  flash_mob_trends: number
  follow_shoot_clip_info: FollowShootClipInfo
  follow_shoot_property: FollowShootProperty
  follow_shot_assets: null
  friend_recommend_info: FriendRecommendInfo
  galileo_pad_textcrop: GalileoPadTextcrop
  game_tag_info: GameTagInfo
  geofencing: unknown[]
  geofencing_regions: null
  group_id: string
  guide_btn_type: number
  horizontal_type: number
  hot_list?: HotList
  hybrid_label: null
  image_album_music_info: ImageAlbumMusicInfo
  image_comment: ImageComment
  image_crop_ctrl: number
  image_follow_shot_assets: null
  image_infos: null
  image_list: null
  images: null
  img_bitrate: null
  impression_data: ImpressionData
  interaction_stickers: null
  interest_points: null
  is_24_story: number
  is_25_story: number
  is_ads: boolean
  is_aigc_media: boolean
  is_collects_selected: number
  is_duet_sing: boolean
  is_from_ad_auth: boolean
  is_image_beat: boolean
  is_life_item: boolean
  is_moment_history: number
  is_moment_story: number
  is_new_text_mode: number
  is_share_post: boolean
  is_story: number
  is_top: number
  is_use_music: boolean
  item_aigc_follow_shot: number
  item_title: string
  item_warn_notification: ItemWarnNotification
  jump_tab_info_list: null
  label_top_text: null
  libfinsert_task_id: string
  long_video: null
  mark_largely_following: boolean
  media_type: number
  mix_info?: MixInfo
  music: Music
  mv_info: null
  nearby_hot_comment: null
  nickname_position: null
  origin_comment_ids: null
  origin_duet_resource_uri: string
  origin_text_extra: null
  original: number
  original_anchor_type?: number
  original_images: null
  pack_usage_scene_by_req_path: string
  packed_clips: null
  personal_page_botton_diagnose_style: number
  photo_search_entrance: PhotoSearchEntrance
  play_progress: PlayProgress
  position: null
  prevent_download: boolean
  preview_title: string
  product_genre_info: ProductGenreInfo
  promotions: unknown[]
  publish_plus_alienation: PublishPlusAlienation
  ref_tts_id_list: null
  ref_voice_modify_id_list: null
  region: string
  relation_label?: RelationLabel
  relation_labels: null
  reply_smart_emojis: null
  risk_infos: RiskInfos
  sec_item_id: string
  select_anchor_expanded_content: number
  series_basic_info: SeriesBasicInfo
  series_info?: SeriesInfo
  series_material_info?: SeriesMaterialInfo
  series_paid_info: SeriesPaidInfo
  series_play_info?: SeriesPlayInfo
  share_info: ShareInfo3
  share_url: string
  shoot_way: string
  show_follow_button: { [property: string]: any }
  slides_music_beats: null
  social_tag_list: null
  standard_bar_info_list: null
  star_atlas_info?: StarAtlasInfo
  statistics: Statistics
  status: Status3
  suggest_words: SuggestWords
  text_extra: TextExtra[]
  trends_event_track: string
  trends_infos: null
  tts_id_list: null
  uniqid_position: null
  user_digged: number
  user_recommend_status: number
  video: Video
  video_control: VideoControl
  video_game_data_channel_config: { [property: string]: any }
  video_labels: null
  video_share_edit_status: number
  video_tag: VideoTag[]
  video_text: null
  visual_search_info: VisualSearchInfo
  voice_modify_id_list: null
  vtag_search?: VtagSearch
  xigua_base_info: XiguaBaseInfo
  yumme_recreason: null
  [property: string]: any
}

type AdChargePassiveUnlockConfig = {
  broadcast_btn_config: BroadcastBtnConfig
  trial_btn_config: BroadcastBtnConfig
  [property: string]: any
}

type BroadcastBtnConfig = {
  btn_show_frequency: number
  btn_show_second: number
  btn_text: string
  show_second_type: number
  [property: string]: any
}

type AnchorInfo = {
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
  account_cert_info: string
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
  contrail_list: null
  cover_url: AvatarThumb[]
  creator_tag_list: null
  custom_verify: string
  data_label_list: null
  display_info: null
  endorsement_info_list: null
  enterprise_verify_reason: string
  familiar_visitor_user: null
  follow_status: number
  follower_list_secondary_information_struct: null
  follower_status: number
  hide_others_recommend_interest: number
  hide_self_recommend_interest: number
  homepage_bottom_toast: null
  identity_labels: null
  im_role_ids: null
  interest_tags: null
  is_ad_fake: boolean
  link_item_list: null
  need_points: null
  nickname: string
  not_seen_item_id_list: null
  not_seen_item_id_list_v2: null
  offline_info_list: null
  personal_tag_list: null
  prevent_download: boolean
  private_relation_list: null
  profile_component_disabled: null
  profile_mob_params: null
  profile_signature_components: null
  risk_notice_text: string
  sec_uid: string
  share_info: ShareInfo
  signature_extra: null
  special_people_labels: null
  story25_comment: number
  story_interactive: number
  story_ttl: number
  text_extra: null
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
  trace_info: string
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

type CommonButton = {
  button_list: ButtonList[]
  [property: string]: any
}

type ButtonList = {
  basic_info: BasicInfo
  priority: number
  [property: string]: any
}

type BasicInfo = {
  btn_datas: null
  btn_name: string
  btn_type: string
  btn_ui_style: number
  buttons: Button[]
  exemptions: number[]
  [property: string]: any
}

type Button = {
  btn_data_keys: null
  click_action: ClickAction
  content: Content
  [property: string]: any
}

type ClickAction = {
  behavior_type: number
  btn_data_Keys: null
  click_action: number
  [property: string]: any
}

type Content = {
  content: string
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

type EntertainmentFeatureInfo = {
  ad_query: string
  sequence_form: string
  [property: string]: any
}

type EntertainmentProductInfo = {
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
  input_config_text: string
  input_config_text_type: string
  [property: string]: any
}

type FollowShootClipInfo = {
  clip_from_user: number
  clip_video_all: number
  [property: string]: any
}

type FollowShootProperty = {
  recommended_camera_mode: string
  [property: string]: any
}

type FriendRecommendInfo = {
  disable_friend_recommend_guide_label: boolean
  friend_recommend_source: number
  is_friend_recommend?: string
  label_user_list: LabelUserList[] | null
  primary_label_user?: PrimaryLabelUser
  recommend_user_app_list?: string
  [property: string]: any
}

type LabelUserList = {
  recommend_app_id: number
  recommend_time: number
  user: User
  [property: string]: any
}

type User = {
  avatar: AvatarThumb
  avatar_thumb: AvatarThumb
  follow_status: number
  nickname: string
  sec_uid: string
  uid: number
  [property: string]: any
}

type PrimaryLabelUser = {
  recommend_app_id: number
  recommend_time: number
  [property: string]: any
}

type GalileoPadTextcrop = {
  android_d_h_cut_ratio: number[] | null
  android_d_v_cut_ratio: number[]
  ipad_d_h_cut_ratio: number[]
  ipad_d_v_cut_ratio: number[]
  pc_blocked_area_ratio: null
  version: number
  [property: string]: any
}

type GameTagInfo = {
  is_game: boolean
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

type MixInfo = {
  cover_url: AvatarThumb
  create_time: number
  dark_icon_url: AvatarThumb
  desc: string
  enable_ad: number
  extra: string
  ids: null
  is_iaa: number
  is_serial_mix: number
  light_icon_url: AvatarThumb
  mix_id: string
  mix_name: string
  mix_type: number
  paid_episodes: null
  series_new_mix_info: SeriesNewMixInfo
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
  author_status: number
  avatar_large: AvatarThumb
  avatar_medium: AvatarThumb
  avatar_thumb: AvatarThumb
  binded_challenge_id: number
  can_background_play: boolean
  collect_stat: number
  cover_hd: AvatarThumb
  cover_large: AvatarThumb
  cover_medium: AvatarThumb
  cover_thumb: AvatarThumb
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
  source_platform: number
  start_time: number
  status: number
  tag_list: null
  talent_hashtag_name_list: null
  title: string
  unshelve_countries: null
  user_count: number
  video_duration: number
  [property: string]: any
}

type SearchImpr = {
  entity_id: string
  [property: string]: any
}

type PhotoSearchEntrance = {
  ecom_type: number
  [property: string]: any
}

type PlayProgress = {
  last_modified_time: number
  play_progress: number
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

type RelationLabel = {
  count: number
  extra: string
  label_info: string
  type: number
  user_id: string
  user_list: User[]
  [property: string]: any
}

type RiskInfos = {
  content: string
  icon_url: string
  risk_sink: boolean
  type: number
  vote: boolean
  warn: boolean
  warn_level: number
  [property: string]: any
}

type SeriesBasicInfo = {
  series_author_id?: string
  series_id?: string
  [property: string]: any
}

type SeriesInfo = {
  actors: null
  content_sub_type: number
  cover_url: AvatarThumb
  create_time: number
  dark_icon_url: AvatarThumb
  desc: string
  directors: unknown[]
  enable_use_new_ent_data: boolean
  entertainment_suggest_info: string
  extra: string
  ids: null
  is_charge_series: number
  is_exclusive: boolean
  is_iaa: number
  light_icon_url: AvatarThumb
  paid_episodes: null
  real_name: string
  recommend_color: null
  rights_info: RightsInfo
  series_content_types: SeriesContentType[]
  series_content_types_new: unknown[]
  series_form_type: number
  series_id: string
  series_interactive: SeriesInteractive
  series_name: string
  series_paid_type_list: null
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

type SeriesUiConfig = {
  collection_button: CollectionButton
  general_position_tag_infos: null
  series_bar_button_infos: SeriesBarButtonInfo[]
  [property: string]: any
}

type CollectionButton = {
  text: string
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
  total_duration: number
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

type SeriesMaterialInfo = {
  material_type: number
  [property: string]: any
}

type SeriesPaidInfo = {
  item_price: number
  series_paid_status: number
  [property: string]: any
}

type SeriesPlayInfo = {
  item_title_prefix: CollectionButton
  outflow_continue_play_info?: OutflowContinuePlayInfo
  series_aweme_index: number
  [property: string]: any
}

type OutflowContinuePlayInfo = {
  next_item_episode: number
  [property: string]: any
}

type ShareInfo3 = {
  share_link_desc: string
  share_url: string
  [property: string]: any
}

type StarAtlasInfo = {
  click_track_url_list: null
  log_extra: string
  track_url_list: null
  [property: string]: any
}

type Statistics = {
  admire_count: number
  collect_count: number
  comment_count: number
  digg_count: number
  play_count: number
  recommend_count: number
  share_count: number
  [property: string]: any
}

type Status3 = {
  allow_friend_recommend: boolean
  allow_friend_recommend_guide: boolean
  allow_self_recommend_to_friend: boolean
  allow_share: boolean
  enable_soft_delete: number
  in_reviewing: boolean
  is_delete: boolean
  is_prohibited: boolean
  listen_video_status: number
  not_allow_soft_del_reason: string
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
  animated_cover: AnimatedCover
  audio: Audio
  big_thumbs: BigThumb[]
  bit_rate: BitRate[]
  bit_rate_audio: BitRateAudio[]
  cover: AvatarThumb
  duration: number
  dynamic_cover: AvatarThumb
  format: string
  gaussian_cover: AvatarThumb
  height: number
  horizontal_type: number
  is_long_video?: number
  is_source_HDR: number
  meta: string
  misc_download_addrs?: string
  origin_cover: AvatarThumb
  play_addr: PlayAddr2
  play_addr_265: PlayAddr2
  play_addr_h264: PlayAddr2
  ratio: string
  raw_cover: AvatarThumb
  use_static_cover: boolean
  video_model: string
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
  fail_info: FailInfo
  level: number
  [property: string]: any
}

type FailInfo = {
  code: number
  reason: string
  [property: string]: any
}

type DuetInfo = {
  level: number
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
  visual_search_longpress?: number
  [property: string]: any
}

type VtagSearch = {
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

type LogPb = {
  impr_id: string
  [property: string]: any
}
