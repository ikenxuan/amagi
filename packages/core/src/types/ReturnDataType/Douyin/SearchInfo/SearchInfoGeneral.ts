export type SearchInfoGeneralData = {
  ad_info: { [key: string]: any };
  cursor: number;
  data: Datum[];
  douyin_ai_search_info: DouyinaiSearchInfo;
  extra: Extra;
  global_doodle_config: GlobalDoodleConfig;
  guide_search_words: null;
  has_more: number;
  log_pb: LogPb;
  multi_columns_info: MultiColumnsInfo;
  ops: null;
  polling_time: number;
  qc: string;
  result_status: number;
  status_code: number;
  [property: string]: any;
}

type Datum = {
  ala_src: string;
  aweme_info: AwemeInfo;
  aweme_list: null;
  bottom_source_info?: BottomSourceInfo;
  card_id: string;
  card_info: CardInfo;
  card_style_type: number;
  card_type: number;
  card_type_id: CardTypeid;
  card_unique_name: string;
  common_aladdin: CommonAladdin;
  data?: DatumData;
  debug_data: DebugData;
  debug_diff_info: { [key: string]: any };
  doc_type: number;
  ecom_goods_list: null;
  feedback: Feedback;
  fp: string;
  log_data: LogData;
  lynx_info: LynxInfo;
  music_info_list: null;
  ops: null;
  provider_doc_id: number;
  provider_doc_id_str: string;
  qishui_music_list: null;
  related_word_list?: RelatedWordList[];
  send_back: string;
  show_tab: null;
  sub_card_list: null;
  tab: null;
  type: number;
  words_query_record?: WordsQueryRecord;
  [property: string]: any;
}

type AwemeInfo = {
  ai_follow_images: null;
  anchor_info?: AnchorInfo;
  anchors: null;
  author: Author;
  author_user_id: number;
  aweme_id: string;
  aweme_type: number;
  cha_list: null;
  challenge_position: null;
  chapter_bar_color: null;
  chapter_list: null;
  collect_stat: number;
  comment_list: null;
  commerce_config_data: null;
  cover_labels: null;
  create_scale_type: null;
  create_time: number;
  danmaku_control?: DanmakuControl;
  desc: string;
  dislike_dimension_list: null;
  dislike_dimension_list_v2: null;
  effect_inflow_effects: null;
  entertainment_product_info: EntertainmentProductInfo;
  follow_shot_assets: null;
  geofencing: null;
  geofencing_regions: null;
  group_id: string;
  hybrid_label: null;
  image_follow_shot_assets: null;
  image_infos: null;
  image_list: null;
  images: Image[];
  img_bitrate: null;
  impression_data: ImpressionData;
  interaction_stickers: null;
  interest_points: null;
  is_top: number;
  jump_tab_info_list: null;
  label_top_text: null;
  long_video: null;
  media_type: number;
  music: Music;
  mv_info: null;
  nearby_hot_comment: null;
  nickname_position: null;
  origin_comment_ids: null;
  origin_text_extra: null;
  original_images: null;
  packed_clips: null;
  position: null;
  prevent_download: boolean;
  promotions: null;
  rawdata: string;
  ref_tts_id_list: null;
  ref_voice_modify_id_list: null;
  relation_labels: null;
  reply_smart_emojis: null;
  share_info: AwemeInfoShareInfo;
  slides_music_beats: null;
  social_tag_list: null;
  standard_bar_info_list: null;
  statistics: Statistics;
  status: Status;
  suggest_words: SuggestWords;
  text_extra: TextExtraElement[];
  trends_infos: null;
  tts_id_list: null;
  uniqid_position: null;
  user_digged: number;
  video: Video;
  video_control: VideoControl;
  video_labels: null;
  video_tag: null;
  video_text: null;
  voice_modify_id_list: null;
  yumme_recreason: null;
  [property: string]: any;
}

type AnchorInfo = {
  content: string;
  extra: string;
  icon: Icon;
  id: string;
  log_extra: string;
  mp_url: string;
  open_url: string;
  style_info: StyleInfo;
  title: string;
  title_tag: string;
  type: number;
  web_url: string;
  [property: string]: any;
}

type Icon = {
  height: number;
  uri: string;
  url_key: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type StyleInfo = {
  default_icon: string;
  extra: string;
  scene_icon: string;
  [property: string]: any;
}

type Author = {
  account_cert_info?: string;
  ad_cover_url: null;
  avatar_168x168: Avatar168X168;
  avatar_300x300: Avatar300X300;
  avatar_larger: AvatarLarger;
  avatar_medium: AuthorAvatarMedium;
  avatar_schema_list: null;
  avatar_thumb: AuthorAvatarThumb;
  aweme_count: number;
  ban_user_functions: null;
  batch_unfollow_contain_tabs: null;
  batch_unfollow_relation_desc: null;
  can_set_geofencing: null;
  card_entries: null;
  card_entries_not_display: null;
  card_sort_priority: null;
  cf_list: null;
  cha_list: null;
  contrail_list: null;
  cover_url: null;
  creator_tag_list: null;
  custom_verify: string;
  data_label_list: null;
  display_info: null;
  endorsement_info_list: null;
  enterprise_verify_reason: string;
  familiar_visitor_user: null;
  favoriting_count: number;
  follow_status: number;
  follower_count: number;
  follower_list_secondary_information_struct: null;
  follower_status: number;
  followers_detail: null;
  following_count: number;
  geofencing: null;
  homepage_bottom_toast: null;
  identity_labels: null;
  im_role_ids: null;
  interest_tags: null;
  is_block: boolean;
  is_verified: boolean;
  item_list: null;
  link_item_list: null;
  need_points: null;
  new_story_cover: null;
  nickname: string;
  not_seen_item_id_list: null;
  not_seen_item_id_list_v2: null;
  offline_info_list: null;
  personal_tag_list: null;
  platform_sync_info: null;
  private_relation_list: null;
  profile_component_disabled: null;
  profile_mob_params: null;
  relative_users: null;
  room_data: string;
  room_id: number;
  room_id_str: string;
  sec_uid: string;
  secret: number;
  share_info: AuthorShareInfo;
  short_id: string;
  signature: string;
  signature_extra: null;
  special_people_labels: null;
  text_extra: null;
  total_favorited: number;
  type_label: null;
  uid: string;
  unique_id: string;
  user_canceled: boolean;
  user_permissions: null;
  user_tags: null;
  verification_permission_ids: null;
  verification_type: number;
  weibo_verify: string;
  white_cover_url: null;
  [property: string]: any;
}

type Avatar168X168 = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type Avatar300X300 = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type AvatarLarger = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type AuthorAvatarMedium = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type AuthorAvatarThumb = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type AuthorShareInfo = {
  share_desc: string;
  share_desc_info: string;
  share_qrcode_url: ShareQrcodeurl;
  share_title: string;
  share_title_myself: string;
  share_title_other: string;
  share_url: string;
  share_weibo_desc: string;
  [property: string]: any;
}

type ShareQrcodeurl = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type DanmakuControl = {
  activities: Activity[];
  danmaku_cnt: number;
  enable_danmaku: boolean;
  first_danmaku_offset: number;
  is_post_denied: boolean;
  last_danmaku_offset: number;
  pass_through_params: string;
  post_denied_reason: string;
  post_privilege_level: number;
  skip_danmaku: boolean;
  [property: string]: any;
}

type Activity = {
  id: number;
  type: number;
  [property: string]: any;
}

type EntertainmentProductInfo = {
  biz: number;
  market_info: MarketInfo;
  sub_title: null;
  [property: string]: any;
}

type MarketInfo = {
  limit_free: LimitFree;
  marketing_tag: null;
  [property: string]: any;
}

type LimitFree = {
  in_free: boolean;
  [property: string]: any;
}

type Image = {
  download_url_list: string[];
  height: number;
  interaction_stickers: null;
  is_new_text_mode?: number;
  mask_url_list: null;
  uri: string;
  url_list: string[];
  watermark_free_download_url_list: null;
  width: number;
  [property: string]: any;
}

type ImpressionData = {
  group_id_list_a: string[];
  group_id_list_b: string[];
  group_id_list_c: string[];
  group_id_list_d: null;
  similar_id_list_a: null;
  similar_id_list_b: number[] | null;
  [property: string]: any;
}

type Music = {
  album: string;
  artist_user_infos: null;
  artists: string[];
  audition_duration: number;
  author: string;
  author_deleted: boolean;
  author_position: null;
  author_status: number;
  avatar_large: AvatarLarge;
  avatar_medium: MusicAvatarMedium;
  avatar_thumb: MusicAvatarThumb;
  binded_challenge_id: number;
  can_background_play: boolean;
  collect_stat: number;
  cover_hd: Coverhd;
  cover_large: CoverLarge;
  cover_medium: MusicCoverMedium;
  cover_thumb: CoverThumb;
  dmv_auto_show: boolean;
  dsp_status: number;
  duration: number;
  end_time: number;
  external_song_info: string[];
  extra: string;
  id: number;
  id_str: string;
  is_audio_url_with_cookie: boolean;
  is_commerce_music: boolean;
  is_del_video: boolean;
  is_matched_metadata: boolean;
  is_original: boolean;
  is_original_sound: boolean;
  is_pgc: boolean;
  is_restricted: boolean;
  is_video_self_see: boolean;
  luna_info: LunaInfo;
  lyric_short_position: null;
  matched_pgc_sound?: MatchedPgcSound;
  mid: string;
  music_chart_ranks: null;
  music_collect_count: number;
  music_cover_atmosphere_color_value: string;
  music_status: number;
  musician_user_infos: null;
  mute_share: boolean;
  offline_desc: string;
  owner_handle: string;
  owner_id: string;
  owner_nickname: string;
  pgc_music_type: number;
  play_url: Playurl;
  position: null;
  prevent_download: boolean;
  prevent_item_download_status: number;
  preview_end_time: number;
  preview_start_time: number;
  reason_type: number;
  redirect: boolean;
  schema_url: string;
  search_impr: SearchImpr;
  sec_uid: string;
  shoot_duration: number;
  show_origin_clip: boolean;
  song?: Song;
  source_platform: number;
  start_time: number;
  status: number;
  strong_beat_url: StrongBeaturl;
  tag_list: null;
  title: string;
  unshelve_countries: null;
  user_count: number;
  video_duration: number;
  [property: string]: any;
}

type AvatarLarge = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type MusicAvatarMedium = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type MusicAvatarThumb = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type Coverhd = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type CoverLarge = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type MusicCoverMedium = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type CoverThumb = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type LunaInfo = {
  has_copyright?: boolean;
  is_luna_user: boolean;
  [property: string]: any;
}

type MatchedPgcSound = {
  author: string;
  cover_medium: MatchedPgcSoundCoverMedium;
  mixed_author: string;
  mixed_title: string;
  title: string;
  [property: string]: any;
}

type MatchedPgcSoundCoverMedium = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type Playurl = {
  height: number;
  uri: string;
  url_key: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type SearchImpr = {
  entity_id: string;
  [property: string]: any;
}

type Song = {
  artists: null;
  chorus_v3_infos: null;
  id: number;
  id_str: string;
  [property: string]: any;
}

type StrongBeaturl = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type AwemeInfoShareInfo = {
  bool_persist: number;
  share_desc: string;
  share_desc_info: string;
  share_link_desc: string;
  share_quote: string;
  share_signature_desc: string;
  share_signature_url: string;
  share_title: string;
  share_title_myself: string;
  share_title_other: string;
  share_url: string;
  share_weibo_desc: string;
  [property: string]: any;
}

type Statistics = {
  aweme_id: string;
  collect_count: number;
  comment_count: number;
  digest: string;
  digg_count: number;
  download_count: number;
  exposure_count: number;
  forward_count: number;
  live_watch_count: number;
  lose_comment_count: number;
  lose_count: number;
  play_count: number;
  recommend_count: number;
  share_count: number;
  whatsapp_share_count: number;
  [property: string]: any;
}

type Status = {
  allow_comment: boolean;
  allow_friend_recommend: boolean;
  allow_friend_recommend_guide: boolean;
  allow_self_recommend_to_friend: boolean;
  allow_share: boolean;
  aweme_edit_info: AwemeEditInfo;
  aweme_id: string;
  dont_share_status: number;
  download_status: number;
  in_reviewing: boolean;
  is_delete: boolean;
  is_private: boolean;
  is_prohibited: boolean;
  listen_video_status: number;
  part_see: number;
  private_status: number;
  review_result: ReviewResult;
  reviewed: number;
  self_see: boolean;
  video_hide_search: number;
  with_fusion_goods: boolean;
  with_goods: boolean;
  [property: string]: any;
}

type AwemeEditInfo = {
  button_status: number;
  button_toast: string;
  [property: string]: any;
}

type ReviewResult = {
  review_status: number;
  [property: string]: any;
}

type SuggestWords = {
  disable_display_bar_inner: number;
  suggest_words: SuggestWord[];
  [property: string]: any;
}

type SuggestWord = {
  extra_info: string;
  hint_text: string;
  icon_url: string;
  scene: string;
  words: Word[];
  [property: string]: any;
}

type Word = {
  info: string;
  word: string;
  word_id: string;
  [property: string]: any;
}

type TextExtraElement = {
  caption_end: number;
  caption_start: number;
  end: number;
  hashtag_id: string;
  hashtag_name: string;
  is_commerce: boolean;
  start: number;
  type: number;
  [property: string]: any;
}

type Video = {
  animated_cover?: AnimatedCover;
  audio: Audio;
  big_thumbs: BigThumb[] | null;
  bit_rate: BitRate[];
  bit_rate_audio: null;
  cdn_url_expired?: number;
  cover: Cover;
  CoverTsp?: number;
  download_addr?: DownloadAddr;
  download_suffix_logo_addr?: DownloadSuffixLogoAddr;
  duration: number;
  dynamic_cover?: DynamicCover;
  format?: string;
  fuse_video_labels_v2: FuseVideoLabelsV2;
  gaussian_cover?: GaussianCover;
  has_download_suffix_logo_addr?: boolean;
  has_watermark: boolean;
  height: number;
  horizontal_type?: number;
  is_bytevc1: number;
  is_callback?: boolean;
  is_h265: number;
  is_source_HDR?: number;
  meta: string;
  misc_download_addrs?: string;
  need_set_token?: boolean;
  origin_cover: OriginCover;
  play_addr: VideoPlayAddr;
  play_addr_265?: PlayAddr265;
  play_addr_h264?: PlayAddrH264;
  play_addr_lowbr?: PlayAddrLowbr;
  ratio: string;
  raw_cover?: RawCover;
  tags: null;
  use_static_cover?: boolean;
  video_model?: string;
  width: number;
  [property: string]: any;
}

type AnimatedCover = {
  uri: string;
  url_list: string[];
  [property: string]: any;
}

type Audio = {
  original_sound_infos: null;
  [property: string]: any;
}

type BigThumb = {
  duration: number;
  fext: string;
  img_num: number;
  img_url: string;
  img_urls: string[];
  img_x_len: number;
  img_x_size: number;
  img_y_len: number;
  img_y_size: number;
  interval: number;
  uri: string;
  uris: string[];
  [property: string]: any;
}

type BitRate = {
  bit_rate: number;
  format: string;
  FPS: number;
  gear_name: string;
  HDR_bit: string;
  HDR_type: string;
  is_bytevc1: number;
  is_h265: number;
  play_addr: BitRatePlayAddr;
  quality_type: number;
  video_extra: string;
  [property: string]: any;
}

type BitRatePlayAddr = {
  data_size: number;
  file_cs: string;
  file_hash: string;
  height: number;
  uri: string;
  url_key: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type Cover = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type DownloadAddr = {
  data_size: number;
  file_cs: string;
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type DownloadSuffixLogoAddr = {
  data_size: number;
  file_cs: string;
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type DynamicCover = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type FuseVideoLabelsV2 = {
  Top1: Top1[];
  [property: string]: any;
}

type Top1 = {
  Level1: Level1;
  Level2: Level2;
  Level3: Level3;
  [property: string]: any;
}

type Level1 = {
  TagId: number;
  [property: string]: any;
}

type Level2 = {
  TagId: number;
  [property: string]: any;
}

type Level3 = {
  TagId: number;
  [property: string]: any;
}

type GaussianCover = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type OriginCover = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type VideoPlayAddr = {
  data_size?: number;
  file_cs?: string;
  file_hash?: string;
  height: number;
  uri: string;
  url_key: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type PlayAddr265 = {
  data_size: number;
  file_cs: string;
  file_hash: string;
  height: number;
  uri: string;
  url_key: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type PlayAddrH264 = {
  data_size: number;
  file_cs: string;
  file_hash: string;
  height: number;
  uri: string;
  url_key: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type PlayAddrLowbr = {
  data_size: number;
  file_cs: string;
  file_hash: string;
  height: number;
  uri: string;
  url_key: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type RawCover = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type VideoControl = {
  allow_douplus: boolean;
  allow_download: boolean;
  allow_duet: boolean;
  allow_dynamic_wallpaper: boolean;
  allow_music: boolean;
  allow_react: boolean;
  allow_record: boolean;
  allow_share: boolean;
  allow_stitch: boolean;
  disable_record_reason: string;
  download_ignore_visibility: boolean;
  download_info: DownloadInfo;
  draft_progress_bar: number;
  duet_ignore_visibility: boolean;
  duet_info: DuetInfo;
  prevent_download_type: number;
  share_grayed: boolean;
  share_ignore_visibility: boolean;
  share_type: number;
  show_progress_bar: number;
  timer_info: TimerInfo;
  timer_status: number;
  [property: string]: any;
}

type DownloadInfo = {
  fail_info?: DownloadInfoFailInfo;
  level: number;
  [property: string]: any;
}

type DownloadInfoFailInfo = {
  code: number;
  reason: string;
  [property: string]: any;
}

type DuetInfo = {
  fail_info: DuetInfoFailInfo;
  level: number;
  [property: string]: any;
}

type DuetInfoFailInfo = {
  code: number;
  reason: string;
  [property: string]: any;
}

type TimerInfo = {
  timer_status: number;
  [property: string]: any;
}

type BottomSourceInfo = {
  avatar: string;
  darkAvatar: string;
  source: string;
  [property: string]: any;
}

type CardInfo = {
  ala_src: string;
  cell_type: number;
  display: Display;
  doc_id: number;
  fingerprint?: string;
  first_pos?: number;
  highlight: null;
  id: number;
  id_str: string;
  index?: number;
  keyinfo: { [key: string]: any };
  now_time: string;
  pos?: number;
  tokens: string[];
  [property: string]: any;
}

type Display = {
  content_origin: string;
  data_ext: Dataext;
  emphasized: Emphasized;
  info: Info;
  semantic_modeling_display: string;
  summary: Summary;
  text_extra: DisplayTextExtra;
  title: DisplayTitle;
  [property: string]: any;
}

type Dataext = {
  display_extra_data: DisplayExtraData;
  has_mipcdn: boolean;
  is_title_full_matched: boolean;
  [property: string]: any;
}

type DisplayExtraData = {
  accept_images_docid: string[];
  [property: string]: any;
}

type Emphasized = {
  summary: string;
  title: string;
  [property: string]: any;
}

type Info = {
  _comment: string;
  app_download: boolean;
  docid: string;
  domain: string;
  host: string;
  icon_img: string;
  icon_name: string;
  image_count: number;
  images: string[];
  is_web: boolean;
  preload: Preload;
  site_name: string;
  time_factor: number;
  time_factor_string: string;
  type: string;
  type_ext?: string;
  url: string;
  [property: string]: any;
}

type Preload = {
  css: string[];
  html: string[];
  js: string[];
  [property: string]: any;
}

type Summary = {
  b_pos: Array<number[]>;
  marked: string;
  pos: Array<number[]>;
  text: string;
  [property: string]: any;
}

type DisplayTextExtra = {
  abstract: Abstract[];
  title: TitleElement[];
  [property: string]: any;
}

type Abstract = {
  end: number;
  search_text: string;
  start: number;
  type: number;
  [property: string]: any;
}

type TitleElement = {
  end: number;
  search_text: string;
  start: number;
  type: number;
  [property: string]: any;
}

type DisplayTitle = {
  b_pos: Array<number[]>;
  marked: string;
  pos: Array<number[]>;
  text: string;
  [property: string]: any;
}

type CardTypeid = {
  ala_src: string;
  card_name: string;
  doc_type: number;
  performance_infos: PerformanceInfos;
  [property: string]: any;
}

type PerformanceInfos = {
  '105_toutiao_web': number;
  108?: number;
  306?: number;
  double_column: number;
  is_native: number;
  search_card_count: number;
  [property: string]: any;
}

type CommonAladdin = {
  ala_src: string;
  attached_info: AttachedInfo;
  display: string;
  doc_id: number;
  extended_displays: null;
  sub_common_aladdin: null;
  toutiao_alasrc: string;
  [property: string]: any;
}

type AttachedInfo = {
  aweme_list: null;
  coupon_list: null;
  mix_data_list: null;
  music_list: null;
  user_list: null;
  xg_video_list: null;
  [property: string]: any;
}

type DatumData = {
  card_tags: null;
  common_tab_config: null;
  hotspot_tab_config: null;
  rs_extra_info: RsExtraInfo;
  [property: string]: any;
}

type RsExtraInfo = {
  hide_related_words: null;
  hide_related_words_id: null;
  impr_extra: string;
  query_id: string;
  [property: string]: any;
}

type DebugData = {
  filter_debug_info_list: null;
  [property: string]: any;
}

type Feedback = {
  url: string;
  [property: string]: any;
}

type LogData = {
  dcm: string;
  entity_paths: string;
  search_result_id: string;
  token_type: string;
  [property: string]: any;
}

type LynxInfo = {
  is_subcard: boolean;
  [property: string]: any;
}

type RelatedWordList = {
  extra_info: ExtraInfo;
  rand_num: number;
  related_img: string;
  related_word: string;
  word_record: WordRecord;
  [property: string]: any;
}

type ExtraInfo = {
  query_info: string;
  words_type: string;
  [property: string]: any;
}

type WordRecord = {
  force_update_rank: boolean;
  group_id: string;
  product_id: string;
  words_content: string;
  words_image: WordsImage;
  words_position: number;
  words_source: string;
  [property: string]: any;
}

type WordsImage = {
  url_list: string[];
  [property: string]: any;
}

type WordsQueryRecord = {
  info: string;
  query_id: string;
  words_source: string;
  [property: string]: any;
}

type DouyinaiSearchInfo = {
  ai_search_req_patch: { [key: string]: any };
  is_hit_high_risk: boolean;
  is_simple_qa_intent: boolean;
  [property: string]: any;
}

type Extra = {
  fatal_item_ids: string[];
  logid: string;
  now: number;
  scenes: null;
  search_request_id: string;
  [property: string]: any;
}

type GlobalDoodleConfig = {
  filter_settings: FilterSetting[];
  keyword: string;
  [property: string]: any;
}

type FilterSetting = {
  android_version: number;
  default_index: number;
  enable_huo_shan: boolean;
  enable_lite: boolean;
  filter_style?: number;
  huoshan_android_version: number;
  huoshan_ios_version: number;
  ios_version: number;
  items: Item[];
  lite_android_version: number;
  lite_ios_version: number;
  log_name: string;
  name: string;
  search_less_text: SearchLessText;
  search_nil_text: SearchNilText;
  title: string;
  [property: string]: any;
}

type Item = {
  log_value: string;
  show_dot: number;
  title: string;
  value: string;
  [property: string]: any;
}

type SearchLessText = {
  info: string;
  jump_text: string;
  [property: string]: any;
}

type SearchNilText = {
  info: string;
  jump_text: string;
  [property: string]: any;
}

type LogPb = {
  impr_id: string;
  [property: string]: any;
}

type MultiColumnsInfo = {
  group_tag: string;
  is_multi_columns: boolean;
  [property: string]: any;
}
