/** 单个视频作品 */
export type DyVideoWork = {
  aweme_detail: AwemeDetail
  log_pb: LogPb
  status_code: number;
  [property: string]: any
}

type AwemeDetail = {
  activity_video_type: number
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
  cf_recheck_ts: number
  challenge_position: null
  chapter_list: null
  collect_stat: number
  collection_corner_mark: number
  comment_gid: number
  comment_list: null
  comment_permission_info: CommentPermissionInfo
  commerce_config_data: null
  component_control: ComponentControl
  component_info_v2: string
  cover_labels: null
  create_time: number
  danmaku_control: DanmakuControl
  desc: string
  disable_relation_bar: number
  dislike_dimension_list: null
  dislike_dimension_list_v2: null
  distribute_circle: DistributeCircle
  duet_aggregate_in_music_tab: boolean
  duration: number
  ecom_comment_atmosphere_type: number
  enable_comment_sticker_rec: boolean
  entertainment_product_info: EntertainmentProductInfo
  fall_card_struct: FallCardStruct
  feed_comment_config: FeedCommentConfig
  flash_mob_trends: number
  friend_interaction: number
  friend_recommend_info: { [key: string]: any }
  game_tag_info: GameTagInfo
  geofencing: string[]
  geofencing_regions: null
  group_id: string
  guide_scene_info: { [key: string]: any }
  hybrid_label: null
  image_album_music_info: ImageAlbumMusicInfo
  image_comment: { [key: string]: any }
  image_crop_ctrl: number
  image_infos: null
  image_list: null
  images: null
  img_bitrate: null
  impression_data: ImpressionData
  incentive_item_type: number
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
  label_top_text: null
  libfinsert_task_id: string
  long_video: null
  mark_largely_following: boolean
  media_type: number
  music: Music
  nickname_position: null
  origin_comment_ids: null
  origin_duet_resource_uri: string
  origin_text_extra: string[]
  original: number
  original_images: null
  packed_clips: null
  personal_page_botton_diagnose_style: number
  photo_search_entrance: PhotoSearchEntrance
  play_progress: PlayProgress
  position: null
  preview_title: string
  preview_video_status: number
  promotions: string[]
  publish_plus_alienation: PublishPlusAlienation
  rate: number
  region: string
  relation_labels: null
  risk_infos: RiskInfos
  seo_info: { [key: string]: any }
  series_paid_info: SeriesPaidInfo
  share_info: AwemeDetailShareInfo
  share_rec_extra: string
  share_url: string
  shoot_way: string
  should_open_ad_report: boolean
  show_follow_button: { [key: string]: any }
  social_tag_list: null
  statistics: Statistics
  status: Status
  suggest_words: SuggestWords
  text_extra: string[]
  uniqid_position: null
  user_digged: number
  user_recommend_status: number
  video: Video
  video_control: VideoControl
  video_game_data_channel_config: { [key: string]: any }
  video_labels: null
  video_share_edit_status: number
  video_tag: VideoTag[]
  video_text: string[]
  visual_search_info: VisualSearchInfo
  vtag_search: VtagSearch
  xigua_base_info: XiguaBaseInfo;
  [property: string]: any
}

type Author = {
  account_cert_info: string
  avatar_thumb: AuthorAvatarThumb
  awemehts_greet_info: string
  cf_list: null
  close_friend_type: number
  contacts_status: number
  contrail_list: null
  cover_url: Coverurl[]
  create_time: number
  custom_verify: string
  data_label_list: null
  endorsement_info_list: null
  enterprise_verify_reason: string
  favoriting_count: number
  follow_status: number
  follower_count: number
  follower_list_secondary_information_struct: null
  follower_status: number
  following_count: number
  im_role_ids: null
  is_ad_fake: boolean
  is_blocked_v2: boolean
  is_blocking_v2: boolean
  is_cf: number
  live_high_value: number
  mate_add_permission: number
  max_follower_count: number
  nickname: string
  offline_info_list: null
  personal_tag_list: null
  prevent_download: boolean
  risk_notice_text: string
  sec_uid: string
  secret: number
  share_info: AuthorShareInfo
  short_id: string
  signature: string
  signature_extra: null
  special_follow_status: number
  special_people_labels: null
  status: number
  text_extra: null
  total_favorited: number
  uid: string
  unique_id: string
  user_age: number
  user_canceled: boolean
  user_permissions: null
  verification_type: number;
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
  height?: number
  uri?: string
  url_list?: string[]
  width?: number;
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
  id?: number
  type?: number;
  [property: string]: any
}

type DistributeCircle = {
  campus_block_interaction: boolean
  distribute_type: number
  is_campus: boolean;
  [property: string]: any
}

type EntertainmentProductInfo = {
  market_info: MarketInfo;
  [property: string]: any
}

type MarketInfo = {
  limit_free: LimitFree;
  [property: string]: any
}

type LimitFree = {
  in_free: boolean;
  [property: string]: any
}

type FallCardStruct = {
  recommend_reason: string
  recommend_reason_v2: string;
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
  similar_id_list_a: null
  similar_id_list_b: null;
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
  cover_medium: CoverMedium
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
  source_platform: number
  start_time: number
  status: number
  strong_beat_url: StrongBeaturl
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

type CoverMedium = {
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

type AwemeDetailShareInfo = {
  share_desc: string
  share_desc_info: string
  share_link_desc: string
  share_url: string;
  [property: string]: any
}

type Statistics = {
  admire_count: number
  aweme_id: string
  collect_count: number
  comment_count: number
  digg_count: number
  play_count: number
  share_count: number;
  [property: string]: any
}

type Status = {
  allow_share: boolean
  aweme_id: string
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
  hint_text?: string
  icon_url?: string
  scene?: string
  words?: Word[];
  [property: string]: any
}

type Word = {
  info?: string
  word?: string
  word_id?: string;
  [property: string]: any
}

type Video = {
  audio: { [key: string]: any }
  big_thumbs: string[]
  bit_rate: BitRate[]
  bit_rate_audio: null
  cdn_url_expired: number
  cover: Cover
  cover_original_scale: CoverOriginalScale
  download_addr: DownloadAddr
  download_suffix_logo_addr: DownloadSuffixLogoAddr
  duration: number
  dynamic_cover: DynamicCover
  format: string
  gaussian_cover: GaussianCover
  has_download_suffix_logo_addr: boolean
  has_watermark: boolean
  height: number
  is_h265: number
  is_source_HDR: number
  meta: string
  origin_cover: OriginCover
  play_addr: VideoPlayAddr
  play_addr_265: PlayAddr265
  play_addr_h264: PlayAddrH264
  ratio: string
  video_model: string
  width: number;
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

type Cover = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type CoverOriginalScale = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type DownloadAddr = {
  data_size: number
  file_cs: string
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type DownloadSuffixLogoAddr = {
  data_size: number
  file_cs: string
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
  visual_search_longpress: number;
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
