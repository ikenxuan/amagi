export type DyUserPostVideos = {
  aweme_list: AwemeList[]
  has_more: number
  log_pb: LogPb
  max_cursor: number
  min_cursor: number
  post_serial: number
  replace_series_cover: number
  request_item_cursor: number
  status_code: number
  time_list: string[];
  [property: string]: any
}

type AwemeList = {
  activity_video_type: number
  ad_aweme_source?: number
  anchor_info: AnchorInfo
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
  can_cache_to_local: boolean
  caption: string
  challenge_position: null
  chapter_bar_color: null
  chapter_list: null
  collect_stat: number
  collection_corner_mark: number
  comment_gid: number
  comment_list: null
  comment_permission_info: CommentPermissionInfo
  commerce_config_data: null
  component_control: ComponentControl
  component_info_v2: string
  cooperation_info?: CooperationInfo
  cover_labels: null
  create_scale_type: null
  create_time: number
  danmaku_control: DanmakuControl
  desc: string
  disable_relation_bar: number
  dislike_dimension_list: null
  dislike_dimension_list_v2: null
  distribute_circle: DistributeCircle
  duet_aggregate_in_music_tab: boolean
  duration: number
  enable_comment_sticker_rec: boolean
  entertainment_product_info: EntertainmentProductInfo
  feed_comment_config: FeedCommentConfig
  flash_mob_trends: number
  friend_interaction: number
  friend_recommend_info: { [key: string]: any }
  game_tag_info: GameTagInfo
  geofencing: string[]
  geofencing_regions: null
  group_id: string
  guide_btn_type: number
  horizontal_type: number
  hot_list: HotList
  hybrid_label: null
  image_album_music_info: ImageAlbumMusicInfo
  image_comment: { [key: string]: any }
  image_crop_ctrl: number
  image_infos: null
  image_list: null
  images: null
  img_bitrate: null
  impression_data: ImpressionData
  interaction_stickers: null
  is_24_story: number
  is_ads: boolean
  is_collects_selected: number
  is_duet_sing: boolean
  is_image_beat: boolean
  is_life_item: boolean
  is_share_post: boolean
  is_story: number
  is_top: number
  is_use_music: boolean
  item_title: string
  item_warn_notification: ItemWarnNotification
  jump_tab_info_list: null
  label_top_text: null
  libfinsert_task_id: string
  long_video: null
  mark_largely_following: boolean
  media_type: number
  music: Music
  mv_info: null
  nickname_position: null
  origin_comment_ids: null
  origin_duet_resource_uri: string
  origin_text_extra: null
  original: number
  original_anchor_type: number
  original_images: null
  packed_clips: null
  personal_page_botton_diagnose_style: number
  photo_search_entrance: PhotoSearchEntrance
  play_progress: PlayProgress
  position: null
  prevent_download: boolean
  promotions: string[]
  publish_plus_alienation: PublishPlusAlienation
  ref_tts_id_list: null
  ref_voice_modify_id_list: null
  region: string
  relation_labels: null
  reply_smart_emojis: null
  risk_infos: RiskInfos
  series_paid_info: SeriesPaidInfo
  share_info: AwemeListShareInfo
  share_url: string
  shoot_way: string
  show_follow_button: { [key: string]: any }
  slides_music_beats: null
  social_tag_list: null
  standard_bar_info_list: null
  star_atlas_info: StarAtlasInfo
  statistics: Statistics
  status: Status
  suggest_words: SuggestWords
  text_extra: TextExtra[]
  trends_infos: null
  tts_id_list: null
  uniqid_position: null
  user_digged: number
  user_recommend_status: number
  video: Video
  video_control: VideoControl
  video_game_data_channel_config: { [key: string]: any }
  video_labels: null
  video_reply_info?: VideoReplyInfo
  video_share_edit_status: number
  video_tag: VideoTag[]
  video_text: null
  visual_search_info: VisualSearchInfo
  voice_modify_id_list: null
  vtag_search: VtagSearch
  xigua_base_info: XiguaBaseInfo
  yumme_recreason: null;
  [property: string]: any
}

type AnchorInfo = {
  content: string
  extra: string
  icon: Icon
  id: string
  log_extra: string
  mp_url?: string
  open_url: string
  style_info: StyleInfo
  title: string
  title_tag: string
  type: number
  web_url?: string;
  [property: string]: any
}

type Icon = {
  height: number
  uri: string
  url_key: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type StyleInfo = {
  default_icon: string
  extra: string
  scene_icon: string;
  [property: string]: any
}

type Author = {
  account_cert_info: string
  avatar_schema_list: null
  avatar_thumb: AuthorAvatarThumb
  ban_user_functions: null
  batch_unfollow_contain_tabs: null
  batch_unfollow_relation_desc: null
  can_set_geofencing: null
  card_entries: null
  card_entries_not_display: null
  card_sort_priority: null
  cf_list: null
  contrail_list: null
  cover_url: Coverurl[]
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
  homepage_bottom_toast: null
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
  profile_mob_params: null
  risk_notice_text: string
  sec_uid: string
  share_info: AuthorShareInfo
  signature_extra: null
  special_people_labels: null
  text_extra: null
  uid: string
  user_permissions: null
  user_tags: null
  verification_permission_ids: null
  white_cover_url: null;
  [property: string]: any
}

type AuthorAvatarThumb = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type Coverurl = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type AuthorShareInfo = {
  share_desc: string
  share_desc_info: string
  share_qrcode_url: ShareQrcodeurl
  share_title: string
  share_title_myself: string
  share_title_other: string
  share_url: string
  share_weibo_desc: string;
  [property: string]: any
}

type ShareQrcodeurl = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type AwemeControl = {
  can_comment: boolean
  can_forward: boolean
  can_share: boolean
  can_show_comment: boolean;
  [property: string]: any
}

type AwemeListenStruct = {
  trace_info: string;
  [property: string]: any
}

type CommentPermissionInfo = {
  can_comment: boolean
  comment_permission_status: number
  item_detail_entry: boolean
  press_entry: boolean
  toast_guide: boolean;
  [property: string]: any
}

type ComponentControl = {
  data_source_url: string;
  [property: string]: any
}

type CooperationInfo = {
  accepted_nums: number
  co_creator_nums: number
  co_creators: CoCreator[]
  cursor: number
  extra: string
  tag: string;
  [property: string]: any
}

type CoCreator = {
  avatar_thumb: CoCreatorAvatarThumb
  custom_verify: string
  enterprise_verify_reason: string
  extra: string
  follow_status: number
  follower_count: number
  follower_status: number
  index: number
  invite_status: number
  nickname: string
  role_id: number
  role_title: string
  sec_uid: string
  uid: string;
  [property: string]: any
}

type CoCreatorAvatarThumb = {
  height: number
  uri: string
  url_list: string[]
  width: number;
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
  smart_mode_decision: number;
  [property: string]: any
}

type Activity = {
  id: number
  type: number;
  [property: string]: any
}

type DistributeCircle = {
  campus_block_interaction: boolean
  distribute_type: number
  is_campus: boolean;
  [property: string]: any
}

type EntertainmentProductInfo = {
  market_info: MarketInfo
  sub_title: null;
  [property: string]: any
}

type MarketInfo = {
  limit_free: LimitFree
  marketing_tag: null;
  [property: string]: any
}

type LimitFree = {
  in_free: boolean;
  [property: string]: any
}

type FeedCommentConfig = {
  author_audit_status: number
  input_config_text: string;
  [property: string]: any
}

type GameTagInfo = {
  is_game: boolean;
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
  view_count: number;
  [property: string]: any
}

type ImageAlbumMusicInfo = {
  begin_time: number
  end_time: number
  volume: number;
  [property: string]: any
}

type ImpressionData = {
  group_id_list_a: string[]
  group_id_list_b: string[]
  group_id_list_c: string[]
  similar_id_list_a: number[] | null
  similar_id_list_b: number[] | null;
  [property: string]: any
}

type ItemWarnNotification = {
  content: string
  show: boolean
  type: number;
  [property: string]: any
}

type Music = {
  album: string
  artist_user_infos: null
  artists: string[]
  audition_duration: number
  author: string
  author_deleted: boolean
  author_position: null
  author_status: number
  avatar_large: AvatarLarge
  avatar_medium: AvatarMedium
  avatar_thumb: MusicAvatarThumb
  binded_challenge_id: number
  can_background_play: boolean
  collect_stat: number
  cover_hd: Coverhd
  cover_large: CoverLarge
  cover_medium: MusicCoverMedium
  cover_thumb: CoverThumb
  dmv_auto_show: boolean
  dsp_status: number
  duration: number
  end_time: number
  external_song_info: string[]
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
  owner_id: string
  owner_nickname: string
  pgc_music_type: number
  play_url: Playurl
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
  song?: Song
  source_platform: number
  start_time: number
  status: number
  strong_beat_url?: StrongBeaturl
  tag_list: null
  title: string
  unshelve_countries: null
  user_count: number
  video_duration: number;
  [property: string]: any
}

type AvatarLarge = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type AvatarMedium = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type MusicAvatarThumb = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type Coverhd = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type CoverLarge = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type MusicCoverMedium = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type CoverThumb = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type MatchedPgcSound = {
  author: string
  cover_medium: MatchedPgcSoundCoverMedium
  mixed_author: string
  mixed_title: string
  title: string;
  [property: string]: any
}

type MatchedPgcSoundCoverMedium = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type Playurl = {
  height: number
  uri: string
  url_key: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type SearchImpr = {
  entity_id: string;
  [property: string]: any
}

type Song = {
  artists: null
  chorus_v3_infos: null
  id: number
  id_str: string;
  [property: string]: any
}

type StrongBeaturl = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type PhotoSearchEntrance = {
  ecom_type: number;
  [property: string]: any
}

type PlayProgress = {
  last_modified_time: number
  play_progress: number;
  [property: string]: any
}

type PublishPlusAlienation = {
  alienation_type: number;
  [property: string]: any
}

type RiskInfos = {
  content: string
  risk_sink: boolean
  type: number
  vote: boolean
  warn: boolean;
  [property: string]: any
}

type SeriesPaidInfo = {
  item_price: number
  series_paid_status: number;
  [property: string]: any
}

type AwemeListShareInfo = {
  share_link_desc: string
  share_url: string;
  [property: string]: any
}

type StarAtlasInfo = {
  click_track_url_list: null
  log_extra: string
  track_url_list: null;
  [property: string]: any
}

type Statistics = {
  admire_count: number
  collect_count: number
  comment_count: number
  digg_count: number
  play_count: number
  share_count: number;
  [property: string]: any
}

type Status = {
  allow_share: boolean
  in_reviewing: boolean
  is_delete: boolean
  is_prohibited: boolean
  listen_video_status: number
  part_see: number
  private_status: number
  review_result: ReviewResult;
  [property: string]: any
}

type ReviewResult = {
  review_status: number;
  [property: string]: any
}

type SuggestWords = {
  suggest_words: SuggestWord[];
  [property: string]: any
}

type SuggestWord = {
  hint_text: string
  icon_url: string
  scene: string
  words: Word[];
  [property: string]: any
}

type Word = {
  info: string
  word: string
  word_id: string;
  [property: string]: any
}

type TextExtra = {
  caption_end: number
  caption_start: number
  end: number
  hashtag_id: string
  hashtag_name: string
  is_commerce: boolean
  search_query_id: string
  search_text: string
  sec_uid?: string
  start: number
  sub_type?: number
  type: number
  user_id?: string;
  [property: string]: any
}

type Video = {
  animated_cover: AnimatedCover
  audio: Audio
  big_thumbs: BigThumb[]
  bit_rate: BitRate[]
  bit_rate_audio: BitRateAudio[] | null
  cover: Cover
  duration: number
  dynamic_cover: DynamicCover
  format: string
  gaussian_cover: GaussianCover
  height: number
  horizontal_type: number
  is_long_video?: number
  is_source_HDR: number
  meta: string
  misc_download_addrs?: string
  origin_cover: OriginCover
  play_addr: VideoPlayAddr
  play_addr_265: PlayAddr265
  play_addr_h264: PlayAddrH264
  ratio: string
  raw_cover: RawCover
  use_static_cover: boolean
  video_model: string
  width: number;
  [property: string]: any
}

type AnimatedCover = {
  uri: string
  url_list: string[];
  [property: string]: any
}

type Audio = {
  original_sound_infos: null;
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
  uris: string[];
  [property: string]: any
}

type BitRate = {
  bit_rate: number
  format: string
  FPS: number
  gear_name: string
  HDR_bit: string
  HDR_type: string
  is_bytevc1: number
  is_h265: number
  play_addr: BitRatePlayAddr
  quality_type: number
  video_extra: string;
  [property: string]: any
}

type BitRatePlayAddr = {
  data_size: number
  file_cs: string
  file_hash: string
  height: number
  uri: string
  url_key: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type BitRateAudio = {
  audio_extra?: string
  audio_meta?: AudioMeta
  audio_quality?: number;
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
  url_list: UrlList;
  [property: string]: any
}

type UrlList = {
  backup_url: string
  fallback_url: string
  main_url: string;
  [property: string]: any
}

type Cover = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type DynamicCover = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type GaussianCover = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type OriginCover = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type VideoPlayAddr = {
  data_size: number
  file_cs: string
  file_hash: string
  height: number
  uri: string
  url_key: string
  url_list: string[]
  width: number;
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
  width: number;
  [property: string]: any
}

type PlayAddrH264 = {
  data_size: number
  file_cs: string
  file_hash: string
  height: number
  uri: string
  url_key: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type RawCover = {
  height: number
  uri: string
  url_list: string[]
  width: number;
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
  show_progress_bar: number
  timer_info: { [key: string]: any }
  timer_status: number;
  [property: string]: any
}

type DownloadInfo = {
  level: number;
  [property: string]: any
}

type DuetInfo = {
  level: number;
  [property: string]: any
}

type VideoReplyInfo = {
  alias_comment_id: number
  aweme_id: number
  comment_id: number
  reply_user_id: number;
  [property: string]: any
}

type VideoTag = {
  level: number
  tag_id: number
  tag_name: string;
  [property: string]: any
}

type VisualSearchInfo = {
  is_ecom_img: boolean
  is_high_accuracy_ecom: boolean
  is_high_recall_ecom: boolean
  is_show_img_entrance: boolean
  visual_search_longpress?: number;
  [property: string]: any
}

type VtagSearch = {
  vtag_delay_ts: number
  vtag_enable: boolean;
  [property: string]: any
}

type XiguaBaseInfo = {
  item_id: number
  star_altar_order_id: number
  star_altar_type: number
  status: number;
  [property: string]: any
}

type LogPb = {
  impr_id: string;
  [property: string]: any
}
