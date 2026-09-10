// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/userFavoriteList.requests.json 里
//   sec_uid  随机值。

export type UserFavoriteList_V0 = {
  aweme_list: AwemeList[]
  has_more: number
  log_pb: LogPb
  max_cursor: number
  sec_uid: string
  status_code: number
  uid: string
  [property: string]: any
}

type AwemeList = {
  activity_video_type: number
  anchor_info?: AnchorInfo
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
  boost_status: number
  can_be_oc_cover?: boolean
  can_cache_to_local: boolean
  caption: string
  cf_assets_type: number
  challenge_position: null
  chapter_list: null
  clip_paging?: ClipPaging
  collect_stat: number
  collection_corner_mark: number
  comment_gid: number
  comment_list: null
  comment_permission_info: CommentPermissionInfo
  commerce_config_data: null
  component_control: ComponentControl
  component_info_v2: string
  cover_labels: null
  create_scale_type?: string[]
  create_time: number
  danmaku_control?: DanmakuControl
  desc: string
  disable_relation_bar: number
  distribute_circle: DistributeCircle
  diversion_bar_info: unknown[]
  douplus_user_type: number
  duet_aggregate_in_music_tab: boolean
  duration: number
  enable_comment_sticker_rec: boolean
  enable_decorated_emoji: boolean
  ent_log_extra: EntLogExtra
  entertainment_product_info: EntertainmentProductInfo
  entertainment_recommend_info: string
  entertainment_video_paid_way: EntertainmentVideoPaidWay
  entertainment_video_type: number
  f_s_grouth_property: FSGrouthProperty
  feed_comment_config: FeedCommentConfig
  feed_component_decision_reasons?: string
  flash_mob_trends: number
  follow_material_info?: string
  follow_shoot_clip_info: FollowShootClipInfo
  follow_shoot_property: FollowShootProperty
  friend_recommend_info: FriendRecommendInfo
  galileo_pad_textcrop?: GalileoPadTextcrop
  game_tag_info: GameTagInfo
  geofencing: unknown[]
  geofencing_regions: null
  group_id: string
  horizontal_type?: number
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
  interaction_stickers: null
  is_24_story: number
  is_25_story: number
  is_ads: boolean
  is_aigc_media: boolean
  is_collects_selected: number
  is_duet_sing: boolean
  is_from_ad_auth: boolean
  is_image_beat: boolean
  is_life_item: boolean
  is_live_photo?: number
  is_moment_history: number
  is_moment_story: number
  is_multi_content?: number
  is_new_text_mode: number
  is_share_post: boolean
  is_slides?: boolean
  is_slides_beat?: number
  is_story: number
  is_subtitled: number
  is_top: number
  is_use_music: boolean
  item_aigc_follow_shot: number
  item_title: string
  item_warn_notification: ItemWarnNotification
  label_top_text: null
  libfinsert_task_id: string
  life_anchor_show_extra?: LifeAnchorShowExtra
  life_video_favorite_info: string
  long_video: null
  mark_largely_following: boolean
  media_type: number
  mix_info?: MixInfo
  music: Music
  nickname_position: null
  origin_comment_ids: null
  origin_duet_resource_uri: string
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
  region: string
  related_music_anchor?: RelatedMusicAnchor
  relation_label?: RelationLabel
  risk_infos: RiskInfos
  sec_item_id: string
  select_anchor_expanded_content: number
  series_basic_info: { [property: string]: any }
  series_paid_info: SeriesPaidInfo
  share_info: ShareInfo3
  share_url: string
  shoot_way: string
  show_follow_button: { [property: string]: any }
  social_tag_list: null
  statistics: Statistics
  status: Status2
  suggest_words: SuggestWords
  text_extra: TextExtra[]
  trends_event_track: string
  trends_infos?: TrendsInfo[]
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
  visual_search_info?: VisualSearchInfo
  vtag_search?: VtagSearch
  xigua_base_info: XiguaBaseInfo
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
  account_cert_info?: string
  avatar_thumb: AvatarThumb
  custom_verify: string
  enterprise_verify_reason: string
  follow_status: number
  follower_status: number
  hide_others_recommend_interest: number
  hide_self_recommend_interest: number
  is_ad_fake: boolean
  nickname: string
  prevent_download: boolean
  risk_notice_text: string
  sec_uid: string
  share_info: ShareInfo
  story25_comment: number
  story_interactive: number
  story_ttl: number
  uid: string
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
  share_qrcode_url: AvatarThumb
  share_title: string
  share_title_myself: string
  share_title_other: string
  share_url: string
  share_weibo_desc: string
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

type ComponentControl = {
  data_source_url: string
  [property: string]: any
}

type DanmakuControl = {
  activities: Activity[]
  danmaku_cnt: number
  enable_danmaku: boolean
  first_danmaku_offset?: number
  is_post_denied: boolean
  last_danmaku_offset?: number
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
  double_publish?: number
  double_publish_limit: number
  input_config_text: string
  input_config_text_type: string
  [property: string]: any
}

type FollowShootClipInfo = {
  clip_from_platform?: number
  clip_from_user?: number
  clip_video_all?: number
  origin_clip_id?: number
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
  label_user_list?: LabelUserList[]
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

type GalileoPadTextcrop = {
  android_d_h_cut_ratio: number[]
  android_d_v_cut_ratio?: number[]
  ipad_d_h_cut_ratio: number[]
  ipad_d_v_cut_ratio: number[]
  version: number
  [property: string]: any
}

type GameTagInfo = {
  content_type_tag?: ContentTypeTag
  game_name_tag?: GameNameTag
  is_game: boolean
  [property: string]: any
}

type ContentTypeTag = {
  tag_id: number
  tag_name: string
  [property: string]: any
}

type GameNameTag = {
  game_id_list: string[]
  tag_id: number
  tag_name: string
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
  clip_type?: number
  download_url_list: string[]
  height: number
  is_aigc_media?: boolean
  is_new_text_mode?: number
  live_photo_type?: number
  resolution_log_param: ResolutionLogParam
  uri: string
  url_list: string[]
  video?: Video
  width: number
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
  cover: AvatarThumb
  download_addr: DownloadAddr
  download_suffix_logo_addr: DownloadAddr
  duration: number
  has_download_suffix_logo_addr: boolean
  has_watermark: boolean
  height: number
  is_bytevc1: number
  is_callback: boolean
  is_h265: number
  is_source_HDR: number
  meta: string
  need_set_token: boolean
  origin_cover: OriginCover
  play_addr: PlayAddr
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

type OriginCover = {
  height: number
  uri: string
  url_list: unknown[]
  width: number
  [property: string]: any
}

type ImpressionData = {
  group_id_list_a: number[]
  group_id_list_b: number[]
  group_id_list_c: unknown[]
  group_id_list_d: number[]
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

type LifeAnchorShowExtra = {
  anchor_type: number
  extra: string
  has_anchor_info: boolean
  should_show: boolean
  [property: string]: any
}

type MixInfo = {
  cover_url: AvatarThumb
  create_time: number
  desc: string
  enable_ad: number
  extra: string
  ids: null
  is_iaa: number
  is_serial_mix: number
  mix_id: string
  mix_name: string
  mix_pic_type: number
  mix_type: number
  share_info: ShareInfo2
  statis: Statis
  status: Status
  update_time: number
  watched_item: string
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
  artists: Artist[]
  audition_duration: number
  author: string
  author_deleted: boolean
  author_position: null
  author_status?: number
  avatar_large?: AvatarThumb
  avatar_medium?: AvatarThumb
  avatar_thumb?: AvatarThumb
  binded_challenge_id: number
  can_background_play: boolean
  collect_stat: number
  cover_color_hsv?: CoverColorHsv
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
  strong_beat_url?: AvatarThumb
  tag_list: null
  title: string
  unshelve_countries: null
  user_count: number
  video_duration: number
  [property: string]: any
}

type Artist = {
  avatar: Avatar
  enter_type: number
  handle: string
  is_verified: boolean
  nick_name: string
  sec_uid: string
  uid: string
  [property: string]: any
}

type Avatar = {
  uri: string
  url_list: string[]
  [property: string]: any
}

type CoverColorHsv = {
  h: number
  s: number
  v: number
  [property: string]: any
}

type MatchedPgcSound = {
  author: string
  cover_medium: AvatarThumb
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

type RelatedMusicAnchor = {
  extra: string
  image_url: Avatar
  priority: number
  schema_url: string
  type: string
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
  icon_url?: string
  risk_sink: boolean
  type: number
  vote: boolean
  warn: boolean
  warn_level?: number
  [property: string]: any
}

type SeriesPaidInfo = {
  item_price: number
  series_paid_status: number
  [property: string]: any
}

type ShareInfo3 = {
  share_link_desc: string
  share_url: string
  [property: string]: any
}

type Statistics = {
  collect_count: number
  comment_count: number
  digg_count: number
  play_count: number
  recommend_count: number
  share_count: number
  [property: string]: any
}

type Status2 = {
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

type TrendsInfo = {
  track_pass_through: string
  [property: string]: any
}

type Video2 = {
  audio: { [property: string]: any }
  big_thumbs: BigThumb[] | null
  bit_rate?: BitRate2[]
  bit_rate_audio: BitRateAudio[] | null
  cover: AvatarThumb
  duration: number
  dynamic_cover?: AvatarThumb
  format?: string
  gaussian_cover?: AvatarThumb
  height: number
  horizontal_type?: number
  is_long_video?: number
  is_source_HDR?: number
  meta: string
  misc_download_addrs?: string
  origin_cover: AvatarThumb
  play_addr: PlayAddr3
  play_addr_265?: PlayAddr
  play_addr_h264?: PlayAddr
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

type BitRate2 = {
  FPS: number
  HDR_bit: string
  HDR_type: string
  bit_rate: number
  format: string
  gear_name: string
  is_bytevc1: number
  is_h265: number
  play_addr: PlayAddr2
  quality_type: number
  video_extra: string
  [property: string]: any
}

type PlayAddr2 = {
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

type PlayAddr3 = {
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
  msg?: string
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
