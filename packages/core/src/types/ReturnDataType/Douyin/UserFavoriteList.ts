export type UserFavoriteList = {
  aweme_list: AwemeList[];
  has_more: number;
  log_pb: LogPb;
  max_cursor: number;
  sec_uid: string;
  status_code: number;
  uid: string;
  [property: string]: any;
}

type AwemeList = {
  activity_video_type: number;
  anchors: null;
  authentication_token: string;
  author: Author;
  author_mask_tag: number;
  author_user_id: number;
  aweme_acl: Awemeacl;
  aweme_control: AwemeControl;
  aweme_id: string;
  aweme_listen_struct: AwemeListenStruct;
  aweme_type: number;
  aweme_type_tags: string;
  boost_status: number;
  can_cache_to_local: boolean;
  caption: string;
  cf_assets_type: number;
  challenge_position: null;
  chapter_list: null;
  clip_paging: ClipPaging;
  collect_stat: number;
  collection_corner_mark: number;
  comment_gid: number;
  comment_list: null;
  comment_permission_info: CommentPermissionInfo;
  commerce_config_data: null;
  component_control: ComponentControl;
  component_info_v2: string;
  cooperation_info?: CooperationInfo;
  cover_labels: null;
  create_scale_type: string[];
  create_time: number;
  danmaku_control: DanmakuControl;
  desc: string;
  disable_relation_bar: number;
  distribute_circle: DistributeCircle;
  douplus_user_type: number;
  duet_aggregate_in_music_tab: boolean;
  duration: number;
  enable_comment_sticker_rec: boolean;
  enable_decorated_emoji: boolean;
  ent_log_extra: EntLogExtra;
  entertainment_product_info: EntertainmentProductInfo;
  entertainment_recommend_info: string;
  entertainment_video_paid_way: EntertainmentVideoPaidWay;
  entertainment_video_type: number;
  feed_comment_config: FeedCommentConfig;
  flash_mob_trends: number;
  follow_material_info: string;
  follow_shoot_clip_info: FollowShootClipInfo;
  friend_recommend_info: FriendRecommendInfo;
  galileo_pad_textcrop: GalileoPadTextcrop;
  game_tag_info: GameTagInfo;
  geofencing: string[];
  geofencing_regions: null;
  group_id: string;
  horizontal_type: number;
  hybrid_label: null;
  image_album_music_info: ImageAlbumMusicInfo;
  image_comment: { [key: string]: any };
  image_crop_ctrl: number;
  image_infos: null;
  image_item_quality_level: number;
  image_list: null;
  images: Image[] | null;
  img_bitrate: any[] | null;
  impression_data: ImpressionData;
  interaction_stickers: null;
  is_24_story: number;
  is_25_story: number;
  is_ads: boolean;
  is_collects_selected: number;
  is_duet_sing: boolean;
  is_from_ad_auth: boolean;
  is_image_beat: boolean;
  is_life_item: boolean;
  is_moment_history: number;
  is_moment_story: number;
  is_multi_content: number;
  is_new_text_mode: number;
  is_share_post: boolean;
  is_slides: boolean;
  is_slides_beat: number;
  is_story: number;
  is_subtitled: number;
  is_top: number;
  is_use_music: boolean;
  item_aigc_follow_shot: number;
  item_title: string;
  item_warn_notification: ItemWarnNotification;
  label_top_text: null;
  libfinsert_task_id: string;
  life_video_favorite_info: string;
  long_video: null;
  mark_largely_following: boolean;
  media_type: number;
  mix_info: MixInfo;
  music: Music;
  nickname_position: null;
  origin_comment_ids: null;
  origin_duet_resource_uri: string;
  original: number;
  original_images: null;
  packed_clips: null;
  personal_page_botton_diagnose_style: number;
  photo_search_entrance: PhotoSearchEntrance;
  play_progress: PlayProgress;
  position: null;
  prevent_download: boolean;
  product_genre_info: ProductGenreInfo;
  promotions: string[];
  publish_plus_alienation: PublishPlusAlienation;
  region: string;
  related_music_anchor: RelatedMusicAnchor;
  risk_infos: RiskInfos;
  sec_item_id: string;
  select_anchor_expanded_content: number;
  series_basic_info: { [key: string]: any };
  series_paid_info: SeriesPaidInfo;
  share_info: AwemeListShareInfo;
  share_url: string;
  shoot_way: string;
  show_follow_button: { [key: string]: any };
  social_tag_list: null;
  statistics: Statistics;
  status: AwemeListStatus;
  suggest_words: SuggestWords;
  text_extra: TextExtra[];
  trends_event_track: string;
  trends_infos: TrendsInfo[];
  uniqid_position: null;
  user_digged: number;
  user_recommend_status: number;
  video: AwemeListVideo;
  video_control: VideoControl;
  video_game_data_channel_config: { [key: string]: any };
  video_labels: null;
  video_share_edit_status: number;
  video_tag: VideoTag[];
  video_text: null;
  visual_search_info: VisualSearchInfo;
  vtag_search: VtagSearch;
  xigua_base_info: XiguaBaseInfo;
  [property: string]: any;
}

type Author = {
  account_cert_info?: string;
  avatar_thumb: AuthorAvatarThumb;
  custom_verify: string;
  enterprise_verify_reason: string;
  follow_status: number;
  follower_status: number;
  is_ad_fake: boolean;
  nickname: string;
  prevent_download: boolean;
  risk_notice_text: string;
  sec_uid: string;
  share_info: AuthorShareInfo;
  story25_comment: number;
  story_interactive: number;
  story_ttl: number;
  uid: string;
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

type Awemeacl = {
  download_mask_panel: DownloadMaskPanel;
  [property: string]: any;
}

type DownloadMaskPanel = {
  code: number;
  show_type: number;
  [property: string]: any;
}

type AwemeControl = {
  can_comment: boolean;
  can_forward: boolean;
  can_share: boolean;
  can_show_comment: boolean;
  [property: string]: any;
}

type AwemeListenStruct = {
  trace_info: string;
  [property: string]: any;
}

type ClipPaging = {
  direct: number;
  has_more: boolean;
  source: string;
  [property: string]: any;
}

type CommentPermissionInfo = {
  can_comment: boolean;
  comment_permission_status: number;
  item_detail_entry: boolean;
  press_entry: boolean;
  toast_guide: boolean;
  [property: string]: any;
}

type ComponentControl = {
  data_source_url: string;
  [property: string]: any;
}

type CooperationInfo = {
  accepted_nums: number;
  co_creator_nums: number;
  co_creators: CoCreator[];
  cursor: number;
  extra: string;
  tag: string;
  [property: string]: any;
}

type CoCreator = {
  avatar_thumb?: CoCreatorAvatarThumb;
  custom_verify?: string;
  enterprise_verify_reason?: string;
  extra?: string;
  follow_status?: number;
  follower_count?: number;
  follower_status?: number;
  index?: number;
  invite_status?: number;
  nickname?: string;
  role_id?: number;
  role_title?: string;
  sec_uid?: string;
  uid?: string;
  [property: string]: any;
}

type CoCreatorAvatarThumb = {
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
  smart_mode_decision: number;
  [property: string]: any;
}

type Activity = {
  id: number;
  type: number;
  [property: string]: any;
}

type DistributeCircle = {
  campus_block_interaction: boolean;
  distribute_type: number;
  is_campus: boolean;
  [property: string]: any;
}

type EntLogExtra = {
  log_extra: string;
  [property: string]: any;
}

type EntertainmentProductInfo = {
  market_info: MarketInfo;
  [property: string]: any;
}

type MarketInfo = {
  limit_free: LimitFree;
  [property: string]: any;
}

type LimitFree = {
  in_free: boolean;
  [property: string]: any;
}

type EntertainmentVideoPaidWay = {
  enable_use_new_ent_data: boolean;
  paid_type: number;
  paid_ways: string[];
  [property: string]: any;
}

type FeedCommentConfig = {
  audio_comment_permission: number;
  author_audit_status: number;
  common_flags: string;
  double_publish_limit: number;
  input_config_text: string;
  [property: string]: any;
}

type FollowShootClipInfo = {
  clip_from_platform?: number;
  clip_from_user: number;
  clip_video_all: number;
  origin_clip_id?: number;
  [property: string]: any;
}

type FriendRecommendInfo = {
  disable_friend_recommend_guide_label: boolean;
  friend_recommend_source: number;
  [property: string]: any;
}

type GalileoPadTextcrop = {
  android_d_h_cut_ratio: number[];
  android_d_v_cut_ratio: number[];
  ipad_d_h_cut_ratio: number[];
  ipad_d_v_cut_ratio: number[];
  version: number;
  [property: string]: any;
}

type GameTagInfo = {
  content_type_tag: ContentTypeTag;
  game_name_tag: GameNameTag;
  is_game: boolean;
  [property: string]: any;
}

type ContentTypeTag = {
  tag_id: number;
  tag_name: string;
  [property: string]: any;
}

type GameNameTag = {
  game_id_list: string[];
  tag_id: number;
  tag_name: string;
  [property: string]: any;
}

type ImageAlbumMusicInfo = {
  begin_time: number;
  end_time: number;
  volume: number;
  [property: string]: any;
}

type Image = {
  clip_type: number;
  download_url_list: string[];
  height: number;
  is_new_text_mode: number;
  live_photo_type: number;
  uri: string;
  url_list: string[];
  video: ImageVideo;
  width: number;
  [property: string]: any;
}

type ImageVideo = {
  big_thumbs: any[];
  bit_rate: PurpleBitRate[];
  bit_rate_audio: null;
  cdn_url_expired: number;
  cover: PurpleCover;
  download_addr: DownloadAddr;
  download_suffix_logo_addr: DownloadSuffixLogoAddr;
  duration: number;
  has_download_suffix_logo_addr: boolean;
  has_watermark: boolean;
  height: number;
  is_bytevc1: number;
  is_callback: boolean;
  is_h265: number;
  is_source_HDR: number;
  meta: string;
  need_set_token: boolean;
  origin_cover: PurpleOriginCover;
  play_addr: FluffyPlayAddr;
  play_addr_h264: PurplePlayAddrH264;
  play_addr_lowbr: PlayAddrLowbr;
  ratio: string;
  tags: null;
  width: number;
  [property: string]: any;
}

type PurpleBitRate = {
  bit_rate: number;
  format: string;
  FPS: number;
  gear_name: string;
  HDR_bit: string;
  HDR_type: string;
  is_bytevc1: number;
  is_h265: number;
  play_addr: PurplePlayAddr;
  quality_type: number;
  video_extra: string;
  [property: string]: any;
}

type PurplePlayAddr = {
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

type PurpleCover = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type DownloadAddr = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type DownloadSuffixLogoAddr = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type PurpleOriginCover = {
  height: number;
  uri: string;
  url_list: any[];
  width: number;
  [property: string]: any;
}

type FluffyPlayAddr = {
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

type PurplePlayAddrH264 = {
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

type ImpressionData = {
  group_id_list_a: number[];
  group_id_list_b: number[];
  group_id_list_c: string[];
  group_id_list_d: number[];
  similar_id_list_a: null;
  similar_id_list_b: null;
  [property: string]: any;
}

type ItemWarnNotification = {
  content: string;
  show: boolean;
  type: number;
  [property: string]: any;
}

type MixInfo = {
  cover_url: Coverurl;
  create_time: number;
  desc: string;
  enable_ad: number;
  extra: string;
  ids: null;
  is_iaa: number;
  is_serial_mix: number;
  mix_id: string;
  mix_name: string;
  mix_pic_type: number;
  mix_type: number;
  share_info: MixInfoShareInfo;
  statis: Statis;
  status: MixInfoStatus;
  update_time: number;
  watched_item: string;
  [property: string]: any;
}

type Coverurl = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type MixInfoShareInfo = {
  share_desc: string;
  share_desc_info: string;
  share_title: string;
  share_title_myself: string;
  share_title_other: string;
  share_url: string;
  share_weibo_desc: string;
  [property: string]: any;
}

type Statis = {
  collect_vv: number;
  current_episode: number;
  play_vv: number;
  updated_to_episode: number;
  [property: string]: any;
}

type MixInfoStatus = {
  is_collected: number;
  status: number;
  [property: string]: any;
}

type Music = {
  album: string;
  artist_user_infos: null;
  artists: Artist[];
  audition_duration: number;
  author: string;
  author_deleted: boolean;
  author_position: null;
  author_status: number;
  avatar_large: AvatarLarge;
  avatar_medium: AvatarMedium;
  avatar_thumb: MusicAvatarThumb;
  binded_challenge_id: number;
  can_background_play: boolean;
  collect_stat: number;
  cover_color_hsv?: CoverColorHsv;
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
  lyric_short_position: null;
  matched_pgc_sound: MatchedPgcSound;
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
  song: Song;
  source_platform: number;
  start_time: number;
  status: number;
  strong_beat_url?: StrongBeaturl;
  tag_list: null;
  title: string;
  unshelve_countries: null;
  user_count: number;
  video_duration: number;
  [property: string]: any;
}

type Artist = {
  avatar?: Avatar;
  enter_type?: number;
  handle?: string;
  is_verified?: boolean;
  nick_name?: string;
  sec_uid?: string;
  uid?: string;
  [property: string]: any;
}

type Avatar = {
  uri: string;
  url_list: string[];
  [property: string]: any;
}

type AvatarLarge = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type AvatarMedium = {
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

type CoverColorHsv = {
  h: number;
  s: number;
  v: number;
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
  chorus?: Chorus;
  id: number;
  id_str: string;
  title?: string;
  [property: string]: any;
}

type Chorus = {
  duration_ms: number;
  start_ms: number;
  [property: string]: any;
}

type StrongBeaturl = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type PhotoSearchEntrance = {
  ecom_type: number;
  [property: string]: any;
}

type PlayProgress = {
  last_modified_time: number;
  play_progress: number;
  [property: string]: any;
}

type ProductGenreInfo = {
  material_genre_sub_type_set: number[];
  product_genre_type: number;
  special_info: SpecialInfo;
  [property: string]: any;
}

type SpecialInfo = {
  recommend_group_name: number;
  [property: string]: any;
}

type PublishPlusAlienation = {
  alienation_type: number;
  [property: string]: any;
}

type RelatedMusicAnchor = {
  extra: string;
  image_url: Imageurl;
  priority: number;
  schema_url: string;
  type: string;
  [property: string]: any;
}

type Imageurl = {
  uri: string;
  url_list: string[];
  [property: string]: any;
}

type RiskInfos = {
  content: string;
  risk_sink: boolean;
  type: number;
  vote: boolean;
  warn: boolean;
  [property: string]: any;
}

type SeriesPaidInfo = {
  item_price: number;
  series_paid_status: number;
  [property: string]: any;
}

type AwemeListShareInfo = {
  share_link_desc: string;
  share_url: string;
  [property: string]: any;
}

type Statistics = {
  collect_count: number;
  comment_count: number;
  digg_count: number;
  play_count: number;
  recommend_count: number;
  share_count: number;
  [property: string]: any;
}

type AwemeListStatus = {
  allow_friend_recommend: boolean;
  allow_friend_recommend_guide: boolean;
  allow_self_recommend_to_friend: boolean;
  allow_share: boolean;
  enable_soft_delete: number;
  in_reviewing: boolean;
  is_delete: boolean;
  is_prohibited: boolean;
  listen_video_status: number;
  not_allow_soft_del_reason: string;
  part_see: number;
  private_status: number;
  review_result: ReviewResult;
  [property: string]: any;
}

type ReviewResult = {
  review_status: number;
  [property: string]: any;
}

type SuggestWords = {
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

type TextExtra = {
  caption_end: number;
  caption_start: number;
  end: number;
  hashtag_id: string;
  hashtag_name: string;
  is_commerce: boolean;
  sec_uid: string;
  start: number;
  type: number;
  user_id: string;
  [property: string]: any;
}

type TrendsInfo = {
  track_pass_through: string;
  [property: string]: any;
}

type AwemeListVideo = {
  audio: { [key: string]: any };
  big_thumbs: BigThumb[];
  bit_rate: FluffyBitRate[];
  bit_rate_audio: null;
  cover: FluffyCover;
  duration: number;
  dynamic_cover: DynamicCover;
  format: string;
  gaussian_cover: GaussianCover;
  height: number;
  horizontal_type: number;
  is_source_HDR: number;
  meta: string;
  origin_cover: FluffyOriginCover;
  play_addr: StickyPlayAddr;
  play_addr_265: PlayAddr265;
  play_addr_h264: FluffyPlayAddrH264;
  ratio: string;
  video_model: string;
  width: number;
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

type FluffyBitRate = {
  bit_rate: number;
  format: string;
  FPS: number;
  gear_name: string;
  HDR_bit: string;
  HDR_type: string;
  is_bytevc1: number;
  is_h265: number;
  play_addr: TentacledPlayAddr;
  quality_type: number;
  video_extra: string;
  [property: string]: any;
}

type TentacledPlayAddr = {
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

type FluffyCover = {
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

type GaussianCover = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type FluffyOriginCover = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type StickyPlayAddr = {
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

type FluffyPlayAddrH264 = {
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
  timer_info: { [key: string]: any };
  timer_status: number;
  [property: string]: any;
}

type DownloadInfo = {
  fail_info: DownloadInfoFailInfo;
  level: number;
  [property: string]: any;
}

type DownloadInfoFailInfo = {
  code: number;
  msg: string;
  reason: string;
  [property: string]: any;
}

type DuetInfo = {
  fail_info?: DuetInfoFailInfo;
  level: number;
  [property: string]: any;
}

type DuetInfoFailInfo = {
  code: number;
  reason: string;
  [property: string]: any;
}

type VideoTag = {
  level: number;
  tag_id: number;
  tag_name: string;
  [property: string]: any;
}

type VisualSearchInfo = {
  is_ecom_img: boolean;
  is_high_accuracy_ecom: boolean;
  is_high_recall_ecom: boolean;
  is_show_img_entrance: boolean;
  visual_search_longpress: number;
  [property: string]: any;
}

type VtagSearch = {
  vtag_delay_ts: number;
  vtag_enable: boolean;
  [property: string]: any;
}

type XiguaBaseInfo = {
  item_id: number;
  star_altar_order_id: number;
  star_altar_type: number;
  status: number;
  [property: string]: any;
}

type LogPb = {
  impr_id: string;
  [property: string]: any;
}
