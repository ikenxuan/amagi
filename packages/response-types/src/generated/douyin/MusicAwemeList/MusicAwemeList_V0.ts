// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 7.0.0-beta.9）。参数与说明在 corpus/douyin/musicAwemeList.requests.json 里
//   music_id  变体0

export type MusicAwemeList_V0 = {
  aweme_list: AwemeList[]
  cursor: number
  extra: Extra
  has_more: number
  log_pb: LogPb
  status_code: number
  [property: string]: any
}

type AwemeList = {
  activity_video_type: number
  ai_follow_images: null
  authentication_token: string
  author: Author
  author_mask_tag: number
  author_user_id: number
  aweme_control: AwemeControl
  aweme_id: string
  aweme_listen_struct: AwemeListenStruct
  aweme_type: number
  aweme_type_tags: string
  book_bar: { [property: string]: any }
  boost_status: number
  can_cache_to_local: boolean
  caption: string
  cf_assets_type: number
  cf_recheck_ts: number
  chapter_bar_color: null
  chapter_list: null
  clip_paging?: ClipPaging
  collect_stat: number
  collection_corner_mark: number
  comment_gid: string
  comment_words_recommend: CommentWordsRecommend
  common_left_top_labels: null
  component_info_v2: string
  cover_labels: null
  create_scale_type: string[] | null
  create_time: number
  danmaku_control?: DanmakuControl
  desc: string
  disable_relation_bar: number
  dislike_dimension_list: null
  dislike_dimension_list_v2: null
  distribute_circle: DistributeCircle
  diversion_bar_info: null
  douplus_user_type: number
  douyin_pc_video_extra_seo: string
  ecom_comment_atmosphere_type: number
  effect_inflow_effects: null
  enable_comment_sticker_rec: boolean
  enable_decorated_emoji: boolean
  encrypt_interest_point_list: null
  encrypt_key_phrase_list: null
  ent_log_extra: EntLogExtra
  entertainment_product_info: EntertainmentProductInfo
  entertainment_video_paid_way: EntertainmentVideoPaidWay
  entertainment_video_type: number
  fall_card_struct: FallCardStruct
  feed_comment_config: FeedCommentConfig
  flash_mob_trends: number
  follow_material_info?: string
  follow_shoot_clip_info: FollowShootClipInfo
  follow_shot_assets: null
  friend_recommend_info: FriendRecommendInfo
  galileo_pad_textcrop?: GalileoPadTextcrop
  game_tag_info: GameTagInfo
  group_id: string
  guide_scene_info: GuideSceneInfo
  have_dashboard: boolean
  horizontal_type?: number
  image_album_music_info: ImageAlbumMusicInfo
  image_comment: { [property: string]: any }
  image_crop_ctrl: number
  image_follow_shot_assets: null
  image_item_quality_level?: number
  image_list: null
  images: Image[] | null
  img_bitrate: null
  impression_data: ImpressionData
  interest_points: null
  is_24_story: number
  is_25_story: number
  is_ads: boolean
  is_collects_selected: number
  is_duet_sing: boolean
  is_first_video: boolean
  is_image_beat: boolean
  is_karaoke: boolean
  is_life_item: boolean
  is_live_photo?: number
  is_moment_history: number
  is_moment_story: number
  is_multi_content?: number
  is_new_text_mode: number
  is_preview: number
  is_share_post: boolean
  is_story: number
  is_top: number
  is_use_music: boolean
  item_aigc_follow_shot: number
  item_stitch: number
  item_title: string
  item_warn_notification: ItemWarnNotification
  jump_tab_info_list: null
  label_music_starter?: AvatarLarger
  label_music_starter_text?: string
  live_appointment_info: { [property: string]: any }
  mark_largely_following: boolean
  media_type: number
  music: Music
  mv_info: null
  nearby_hot_comment: null
  origin_duet_resource_uri: string
  origin_text_extra: unknown[]
  original: number
  pack_usage_scene_by_req_path: string
  packed_clips: null
  personal_page_botton_diagnose_style: number
  photo_search_entrance: PhotoSearchEntrance
  play_progress: PlayProgress
  poi_patch_info: PoiPatchInfo
  prevent_download: boolean
  preview_title: string
  preview_video_status: number
  product_genre_info: ProductGenreInfo
  publish_plus_alienation: PublishPlusAlienation
  ref_tts_id_list: null
  ref_voice_modify_id_list: null
  region: string
  relation_labels: null
  reply_smart_emojis: null
  report_action: boolean
  search_impr: SearchImpr2
  select_anchor_expanded_content: number
  seo_info: { [property: string]: any }
  series_basic_info: { [property: string]: any }
  series_paid_info: SeriesPaidInfo
  share_info: ShareInfo2
  share_rec_extra: string
  share_url: string
  shoot_way: string
  should_open_ad_report: boolean
  slides_music_beats: null
  statistics: Statistics
  status: Status
  suggest_words?: SuggestWords
  text_extra: TextExtra[]
  trends_infos: null
  tts_id_list: null
  user_digged: number
  user_recommend_status: number
  video: Video2
  video_game_data_channel_config: { [property: string]: any }
  video_share_edit_status: number
  video_tag: VideoTag[]
  visual_search_info: VisualSearchInfo
  voice_modify_id_list: null
  without_watermark: boolean
  xigua_base_info: XiguaBaseInfo
  yumme_recreason: null
  [property: string]: any
}

type Author = {
  accept_private_policy: boolean
  account_cert_info?: string
  account_region: string
  allow_story_normal_like: boolean
  apple_account: number
  avatar_larger: AvatarLarger
  avatar_schema_list: null
  avatar_thumb: AvatarLarger
  avatar_uri: string
  aweme_control: AwemeControl
  aweme_count: number
  aweme_hotsoon_auth?: number
  aweme_hotsoon_auth_relation?: number
  awemehts_greet_info: string
  ban_user_functions: unknown[]
  batch_unfollow_contain_tabs: null
  batch_unfollow_relation_desc: null
  bind_phone: string
  can_set_geofencing: null
  card_entries: null
  card_entries_not_display: null
  card_sort_priority: null
  cf_list: null
  close_friend_type: number
  constellation: number
  contacts_status: number
  contrail_list: null
  cover_url: AvatarLarger[]
  create_time: number
  creator_tag_list: null
  custom_verify: string
  cv_level: string
  data_label_list: null
  disable_image_comment_saved: number
  display_info: null
  download_prompt_ts: number
  enable_nearby_visible: boolean
  endorsement_info_list: null
  enterprise_verify_reason: string
  familiar_confidence: number
  familiar_visitor_user: null
  favoriting_count: number
  fb_expire_time: number
  follow_status: number
  follower_count: number
  follower_list_secondary_information_struct: null
  follower_request_status: number
  follower_status: number
  following_count: number
  google_account: string
  has_email: boolean
  has_facebook_token: boolean
  has_insights: boolean
  has_orders: boolean
  has_twitter_token: boolean
  has_youtube_token: boolean
  hide_search: boolean
  homepage_bottom_toast: null
  house_talent_info: number
  identity_labels: null
  im_role_ids: null
  ins_id: string
  interest_tags: null
  is_ban: boolean
  is_binded_weibo: boolean
  is_blocked_v2: boolean
  is_blocking_v2: boolean
  is_cf: number
  is_not_show: boolean
  is_phone_binded: boolean
  ky_only_predict: number
  link_item_list: null
  live_agreement: number
  live_agreement_time: number
  live_commerce: boolean
  live_high_value: number
  live_verify: number
  mate_add_permission: number
  mate_count: number
  mate_relation: MateRelation
  max_follower_count: number
  need_points: null
  need_recommend: number
  neiguang_shield: number
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
  react_setting: number
  reflow_page_gid: number
  reflow_page_uid: number
  risk_notice_text: string
  room_id_str: string
  school_category: number
  school_id: string
  search_impr: SearchImpr
  sec_uid: string
  share_info: ShareInfo
  share_qrcode_uri: string
  shield_comment_notice: number
  shield_digg_notice: number
  shield_follow_notice: number
  show_image_bubble: boolean
  show_nearby_active: boolean
  signature_extra: null
  social_real_relation_type: number
  special_follow_status: number
  special_lock: number
  special_people_labels: null
  status: number
  stitch_setting: number
  story25_comment: number
  story_interactive: number
  story_open: boolean
  story_ttl: number
  text_extra: null
  total_favorited: number
  tw_expire_time: number
  twitter_id: string
  twitter_name: string
  uid: string
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
  verification_permission_ids: null
  webcast_preview_labels: null
  weibo_name: string
  weibo_schema: string
  weibo_url: string
  weibo_verify: string
  white_cover_url: null
  with_dou_entry: boolean
  with_fusion_shop_entry: boolean
  with_shop_entry: boolean
  youtube_channel_id: string
  youtube_channel_title: string
  youtube_expire_time: number
  [property: string]: any
}

type AvatarLarger = {
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

type MateRelation = {
  mate_apply_forward: number
  mate_apply_reverse: number
  mate_status: number
  [property: string]: any
}

type SearchImpr = {
  entity_id: string
  [property: string]: any
}

type ShareInfo = {
  share_desc: string
  share_desc_info: string
  share_qrcode_url: AvatarLarger
  share_title: string
  share_title_myself: string
  share_title_other: string
  share_url: string
  share_weibo_desc: string
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

type CommentWordsRecommend = {
  zero_comment: null
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

type EntertainmentVideoPaidWay = {
  enable_use_new_ent_data: boolean
  paid_type: number
  paid_ways: null
  [property: string]: any
}

type FallCardStruct = {
  recommend_reason_v2: string
  [property: string]: any
}

type FeedCommentConfig = {
  audio_comment_permission: number
  common_flags: string
  double_publish_limit: number
  input_config_text: string
  [property: string]: any
}

type FollowShootClipInfo = {
  clip_from_platform?: string
  clip_from_user?: string
  clip_video_all?: string
  origin_clip_id?: string
  [property: string]: any
}

type FriendRecommendInfo = {
  disable_friend_recommend_guide_label: boolean
  friend_recommend_source: number
  label_user_list: null
  [property: string]: any
}

type GalileoPadTextcrop = {
  android_d_h_cut_ratio: null
  android_d_v_cut_ratio: number[]
  ipad_d_h_cut_ratio: null
  ipad_d_v_cut_ratio: number[]
  pc_blocked_area_ratio: null
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

type GuideSceneInfo = {
  diamond_expose_info_str: string
  feed_origin_gid_info_str: string
  guide_scene_type: number
  [property: string]: any
}

type ImageAlbumMusicInfo = {
  begin_time: number
  end_time: number
  volume: number
  [property: string]: any
}

type Image = {
  clip_type: number
  download_url_list: string[]
  height: number
  interaction_stickers: null
  is_new_text_mode: number
  live_photo_type: number
  mask_url_list: null
  resolution_log_param: ResolutionLogParam
  uri: string
  url_list: string[]
  video: Video
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

type Video = {
  big_thumbs: null
  bit_rate: BitRate[]
  bit_rate_audio: null
  cdn_url_expired: number
  cover: AvatarLarger
  download_addr: AvatarLarger
  download_suffix_logo_addr: AvatarLarger
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

type OriginCover = {
  height: number
  uri: string
  url_list: unknown[]
  width: number
  [property: string]: any
}

type ImpressionData = {
  group_id_list_a: unknown[]
  group_id_list_b: unknown[]
  group_id_list_c: unknown[]
  group_id_list_d: null
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
  avatar_large: AvatarLarger
  avatar_medium: AvatarLarger
  avatar_thumb: AvatarLarger
  binded_challenge_id: number
  can_background_play: boolean
  collect_stat: number
  cover_hd: AvatarLarger
  cover_large: AvatarLarger
  cover_medium: AvatarLarger
  cover_thumb: AvatarLarger
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
  luna_info: LunaInfo
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
  strong_beat_url: AvatarLarger
  tag_list: null
  talent_hashtag_name_list: null
  title: string
  unshelve_countries: null
  user_count: number
  video_duration: number
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

type PhotoSearchEntrance = {
  ecom_type: number
  [property: string]: any
}

type PlayProgress = {
  last_modified_time: number
  play_progress: number
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

type SearchImpr2 = {
  entity_id: string
  entity_type: string
  [property: string]: any
}

type SeriesPaidInfo = {
  item_price: number
  series_paid_status: number
  [property: string]: any
}

type ShareInfo2 = {
  share_desc_info: string
  share_link_desc: string
  share_url: string
  [property: string]: any
}

type Statistics = {
  collect_count: number
  comment_count: number
  digest: string
  digg_count: number
  exposure_count: number
  live_watch_count: number
  play_count: number
  recommend_count: number
  share_count: number
  [property: string]: any
}

type Status = {
  allow_friend_recommend: boolean
  allow_friend_recommend_guide: boolean
  allow_self_recommend_to_friend: boolean
  allow_share: boolean
  aweme_edit_info: AwemeEditInfo
  dont_share_status: number
  in_reviewing: boolean
  is_delete: boolean
  is_prohibited: boolean
  listen_video_status: number
  part_see: number
  private_status: number
  review_result: ReviewResult
  video_hide_search: number
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
  type: number
  [property: string]: any
}

type Video2 = {
  animated_cover?: AnimatedCover
  audio: Audio
  big_thumbs: BigThumb[] | null
  bit_rate: BitRate[]
  bit_rate_audio: null
  cover: AvatarLarger
  duration: number
  dynamic_cover?: AvatarLarger
  format?: string
  fuse_video_labels_v2: FuseVideoLabelsV2
  gaussian_cover?: AvatarLarger
  height: number
  horizontal_type?: number
  is_bytevc1: number
  is_callback?: boolean
  is_source_HDR?: number
  meta: string
  misc_download_addrs?: string
  origin_cover: AvatarLarger
  play_addr: PlayAddr2
  play_addr_265?: PlayAddr
  play_addr_h264?: PlayAddr
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

type FuseVideoLabelsV2 = {
  Top1: Top1[]
  [property: string]: any
}

type Top1 = {
  Level1: Level1
  Level2: Level1
  Level3?: Level1
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

type VideoTag = {
  level: number
  tag_id: number
  tag_name: string
  [property: string]: any
}

type VisualSearchInfo = {
  extra: string
  is_ecom_img: boolean
  is_high_accuracy_ecom: boolean
  is_high_recall_ecom: boolean
  is_show_entrance: boolean
  panel_entrance_intent: string
  panel_entrance_text: string
  tag_space: string
  visual_search_longpress: number
  [property: string]: any
}

type XiguaBaseInfo = {
  star_altar_order_id: number
  star_altar_type: number
  status: number
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
