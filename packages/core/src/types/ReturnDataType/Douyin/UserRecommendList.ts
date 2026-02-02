export type UserRecommendList = {
  aweme_date: AwemeDate;
  aweme_list: AwemeList[];
  has_more: boolean;
  max_cursor: number;
  min_cursor: number;
  status_code: number;
  total: number;
  [property: string]: any;
}

type AwemeDate = {
  date_map: DateMap;
  [property: string]: any;
}

type DateMap = {
  '7580008087244651441': number;
  '7584755077924949307': number;
  '7586617109753449765': number;
  '7586985463588687119': number;
  '7587783200715885305': number;
  '7587805084185894641': number;
  '7589233890259308977': number;
  '7591123649823586939': number;
  '7592193662924064872': number;
  '7592240318939746906': number;
  '7592598486529917043': number;
  '7592849517923110571': number;
  '7593340412648082730': number;
  '7594011208047529222': number;
  '7597764624923496838': number;
  '7598780284636557233': number;
  [property: string]: any;
}

type AwemeList = {
  activity_video_type: number;
  ai_follow_images: null;
  anchors: null;
  authentication_token: string;
  author: AwemeListAuthor;
  author_mask_tag: number;
  author_user_id: number;
  aweme_acl: Awemeacl;
  aweme_control: AwemeListAwemeControl;
  aweme_id: string;
  aweme_listen_struct: AwemeListenStruct;
  aweme_type: number;
  aweme_type_tags: string;
  bodydance_score: number;
  boost_status: number;
  can_cache_to_local: boolean;
  caption: string;
  category_da?: number;
  cf_assets_type: number;
  cf_recheck_ts: number;
  cha_list: ChaList[];
  challenge_position: null;
  chapter_abstract?: string;
  chapter_bar_color: null;
  chapter_data?: ChapterData;
  chapter_list: ChapterList[] | null;
  chapter_review_status?: number;
  city: string;
  clip_paging?: ClipPaging;
  cmt_swt: boolean;
  collect_stat: number;
  collection_corner_mark: number;
  comment_gid: number;
  comment_list: null;
  comment_permission_info: CommentPermissionInfo;
  commerce_config_data: null;
  commerce_info: CommerceInfo;
  component_control: ComponentControl;
  component_info_v2: string;
  cover_labels: null;
  create_scale_type: string[] | null;
  create_time: number;
  danmaku_control: DanmakuControl;
  desc: string;
  desc_language: string;
  disable_relation_bar: number;
  dislike_dimension_list: null;
  dislike_dimension_list_v2: null;
  distance: string;
  distribute_circle: DistributeCircle;
  distribute_type: number;
  douplus_user_type: number;
  douyin_p_c_video_extra?: string;
  douyin_pc_video_extra_seo: string;
  duet_aggregate_in_music_tab: boolean;
  duration: number;
  ecom_comment_atmosphere_type: number;
  effect_inflow_effects: null;
  enable_comment_sticker_rec: boolean;
  enable_decorated_emoji: boolean;
  ent_log_extra: EntLogExtra;
  entertainment_product_info: EntertainmentProductInfo;
  entertainment_recommend_info: string;
  entertainment_video_paid_way: EntertainmentVideoPaidWay;
  entertainment_video_type: number;
  fall_card_struct: FallCardStruct;
  feed_comment_config: FeedCommentConfig;
  flash_mob_trends: number;
  follow_material_info: string;
  follow_shoot_clip_info: FollowShootClipInfo;
  follow_shot_assets: null;
  friend_recommend_info: FriendRecommendInfo;
  galileo_pad_textcrop: GalileoPadTextcrop;
  game_tag_info: GameTagInfo;
  general_label?: GeneralLabel;
  geofencing: string[];
  geofencing_regions: null;
  group_id: string;
  guide_btn_type: number;
  guide_scene_info: { [key: string]: any };
  has_vs_entry: boolean;
  have_dashboard: boolean;
  horizontal_type: number;
  hot_list: HotList;
  hybrid_label: null;
  image_album_music_info: ImageAlbumMusicInfo;
  image_comment: { [key: string]: any };
  image_crop_ctrl: number;
  image_follow_shot_assets: null;
  image_infos: null;
  image_item_quality_level: number;
  image_list: null;
  images: AwemeListImage[];
  img_bitrate: string[];
  impression_data: ImpressionData;
  incentive_item_type: number;
  interaction_stickers: null;
  interest_points: null;
  is_24_story: number;
  is_25_story: number;
  is_ads: boolean;
  is_collects_selected: number;
  is_duet_sing: boolean;
  is_fantasy: boolean;
  is_first_video: boolean;
  is_from_ad_auth: boolean;
  is_hash_tag: number;
  is_image_beat: boolean;
  is_in_scope: boolean;
  is_karaoke: boolean;
  is_life_item: boolean;
  is_moment_history: number;
  is_moment_story: number;
  is_multi_content: number;
  is_new_text_mode: number;
  is_pgcshow: boolean;
  is_preview: number;
  is_relieve: boolean;
  is_share_post: boolean;
  is_slides?: boolean;
  is_slides_beat?: number;
  is_story: number;
  is_subtitled: number;
  is_top: number;
  is_use_music: boolean;
  is_vr: boolean;
  item_aigc_follow_shot: number;
  item_comment_settings: number;
  item_duet: number;
  item_react: number;
  item_share: number;
  item_stitch: number;
  item_title: string;
  item_warn_notification: ItemWarnNotification;
  jump_tab_info_list: null;
  label_top_text: null;
  libfinsert_task_id: string;
  long_video: null;
  mark_largely_following: boolean;
  media_type: number;
  misc_info: string;
  mix_info: MixInfo;
  music: Music;
  mv_info: null;
  nearby_hot_comment: null;
  nearby_level: number;
  need_vs_entry: boolean;
  nickname_position: null;
  origin_comment_ids: null;
  origin_duet_resource_uri: string;
  origin_text_extra: string[];
  original: number;
  original_images: null;
  packed_clips: null;
  pc_need_login: boolean;
  personal_page_botton_diagnose_style: number;
  photo_search_entrance: PhotoSearchEntrance;
  play_progress: PlayProgress;
  poi_biz: { [key: string]: any };
  poi_patch_info: PoiPatchInfo;
  position: null;
  prevent_download: boolean;
  preview_title: string;
  preview_video_status: number;
  product_genre_info: ProductGenreInfo;
  promotions: string[];
  publish_plus_alienation: PublishPlusAlienation;
  rate: number;
  recommend_chapter_apply_status?: number;
  ref_tts_id_list: null;
  ref_voice_modify_id_list: null;
  region: string;
  related_music_anchor: RelatedMusicAnchor;
  relation_label: RelationLabel;
  relation_labels: null;
  reply_smart_emojis: null;
  report_action: boolean;
  risk_infos: RiskInfos;
  sec_item_id: string;
  select_anchor_expanded_content: number;
  select_billboard_extra?: { [key: string]: any };
  seo_info: { [key: string]: any };
  series_basic_info: { [key: string]: any };
  series_paid_info: SeriesPaidInfo;
  share_info: AwemeListShareInfo;
  share_rec_extra: string;
  share_url: string;
  shoot_way: string;
  should_open_ad_report: boolean;
  show_follow_button: { [key: string]: any };
  slides_music_beats: null;
  social_tag_list: null;
  sort_label: string;
  standard_bar_info_list: null;
  star_atlas_info?: StarAtlasInfo;
  statistics: Statistics;
  status: AwemeListStatus;
  story_ttl: number;
  text_extra: TextExtra[];
  trends_event_track: string;
  trends_infos: TrendsInfo[] | null;
  tts_id_list: null;
  uniqid_position: null;
  user_digged: number;
  user_recommend_status: number;
  video: AwemeListVideo;
  video_control: VideoControl;
  video_game_data_channel_config: { [key: string]: any };
  video_labels: null;
  video_share_edit_status: number;
  video_tag: VideoTag[];
  video_text: string[];
  visual_search_info: VisualSearchInfo;
  voice_modify_id_list: null;
  vr_type: number;
  with_promotional_music: boolean;
  without_watermark: boolean;
  xigua_base_info: XiguaBaseInfo;
  xigua_task: XiguaTask;
  yumme_recreason: null;
  [property: string]: any;
}

type AwemeListAuthor = {
  accept_private_policy: boolean;
  account_cert_info?: string;
  account_region: string;
  ad_cover_url: null;
  apple_account: number;
  authority_status: number;
  avatar_168x168: PurpleAvatar168X168;
  avatar_300x300: PurpleAvatar300X300;
  avatar_larger: PurpleAvatarLarger;
  avatar_medium: PurpleAvatarMedium;
  avatar_schema_list: null;
  avatar_thumb: PurpleAvatarThumb;
  avatar_uri: string;
  aweme_control: AuthorAwemeControl;
  aweme_count: number;
  aweme_hotsoon_auth: number;
  aweme_hotsoon_auth_relation: number;
  awemehts_greet_info: string;
  ban_user_functions: string[];
  batch_unfollow_contain_tabs: null;
  batch_unfollow_relation_desc: null;
  bind_phone: string;
  birthday: string;
  can_set_geofencing: null;
  card_entries: null;
  card_entries_not_display: null;
  card_sort_priority: null;
  cf_list: null;
  cha_list: null;
  close_friend_type: number;
  comment_filter_status: number;
  comment_setting: number;
  commerce_user_level: number;
  constellation: number;
  contacts_status: number;
  contrail_list: null;
  cover_url: CoverurlElement[];
  create_time: number;
  creator_tag_list: null;
  custom_verify: string;
  cv_level: string;
  data_label_list: null;
  display_info: null;
  download_prompt_ts: number;
  download_setting: number;
  duet_setting: number;
  enable_nearby_visible: boolean;
  endorsement_info_list: null;
  enterprise_verify_reason: string;
  familiar_visitor_user: null;
  favoriting_count: number;
  fb_expire_time: number;
  follow_status: number;
  follower_count: number;
  follower_list_secondary_information_struct: null;
  follower_request_status: number;
  follower_status: number;
  followers_detail: null;
  following_count: number;
  gender: number;
  geofencing: string[];
  google_account: string;
  has_email: boolean;
  has_facebook_token: boolean;
  has_insights: boolean;
  has_orders: boolean;
  has_twitter_token: boolean;
  has_unread_story: boolean;
  has_youtube_token: boolean;
  hide_location: boolean;
  hide_search: boolean;
  homepage_bottom_toast: null;
  identity_labels: null;
  im_role_ids: null;
  ins_id: string;
  interest_tags: null;
  is_ad_fake: boolean;
  is_binded_weibo: boolean;
  is_block: boolean;
  is_blocked_v2: boolean;
  is_blocking_v2: boolean;
  is_cf: number;
  is_discipline_member: boolean;
  is_gov_media_vip: boolean;
  is_mix_user: boolean;
  is_not_show: boolean;
  is_phone_binded: boolean;
  is_star: boolean;
  is_verified: boolean;
  item_list: null;
  ky_only_predict: number ;
  language: string;
  link_item_list: null;
  live_agreement: number;
  live_agreement_time: number;
  live_commerce: boolean;
  live_high_value: number;
  live_status: number;
  live_verify: number;
  location: string;
  mate_add_permission: number;
  max_follower_count: number;
  need_points: null;
  need_recommend: number;
  neiguang_shield: number;
  new_friend_type: number;
  new_story_cover: null;
  nickname: string;
  not_seen_item_id_list: null;
  not_seen_item_id_list_v2: null;
  offline_info_list: null;
  personal_tag_list: null;
  platform_sync_info: null;
  prevent_download: boolean;
  private_relation_list: null;
  profile_component_disabled: null;
  profile_mob_params: null;
  react_setting: number;
  reflow_page_gid: number;
  reflow_page_uid: number;
  region: string;
  relative_users: null;
  risk_notice_text: string;
  room_id: number;
  school_category: number;
  school_id: string;
  school_name: string;
  school_poi_id: string;
  school_type: number;
  search_impr: PurpleSearchImpr;
  sec_uid: string;
  secret: number;
  share_info: AuthorShareInfo;
  share_qrcode_uri: string;
  shield_comment_notice: number;
  shield_digg_notice: number;
  shield_follow_notice: number;
  short_id: string;
  show_image_bubble: boolean;
  show_nearby_active: boolean;
  signature: string;
  signature_display_lines: number;
  signature_extra: null;
  special_follow_status: number;
  special_lock: number;
  special_people_labels: null;
  status: number;
  stitch_setting: number;
  story25_comment: number;
  story_count: number;
  story_interactive: number;
  story_open: boolean;
  story_ttl: number;
  sync_to_toutiao: number;
  text_extra: null;
  total_favorited: number;
  tw_expire_time: number;
  twitter_id: string;
  twitter_name: string;
  type_label: null;
  uid: string;
  unique_id: string;
  unique_id_modify_time: number;
  user_age: number;
  user_canceled: boolean;
  user_mode: number;
  user_not_see: number;
  user_not_show: number;
  user_period: number;
  user_permissions: null;
  user_rate: number;
  user_tags: null;
  verification_permission_ids: null;
  verification_type: number;
  verify_info: string;
  video_icon: PurpleVideoIcon;
  weibo_name: string;
  weibo_schema: string;
  weibo_url: string;
  weibo_verify: string;
  white_cover_url: null;
  with_commerce_entry: boolean;
  with_dou_entry: boolean;
  with_fusion_shop_entry: boolean;
  with_shop_entry: boolean;
  youtube_channel_id: string;
  youtube_channel_title: string;
  youtube_expire_time: number;
  [property: string]: any;
}

type PurpleAvatar168X168 = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type PurpleAvatar300X300 = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type PurpleAvatarLarger = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type PurpleAvatarMedium = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type PurpleAvatarThumb = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type AuthorAwemeControl = {
  can_comment: boolean;
  can_forward: boolean;
  can_share: boolean;
  can_show_comment: boolean;
  [property: string]: any;
}

type CoverurlElement = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type PurpleSearchImpr = {
  entity_id: string;
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

type PurpleVideoIcon = {
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

type AwemeListAwemeControl = {
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

type ChaList = {
  author: ChaListAuthor;
  banner_list: null;
  cha_attrs: null;
  cha_name: string;
  cid: string;
  collect_stat: number;
  connect_music: string[];
  desc: string;
  extra_attr: ExtraAttr;
  hashtag_profile: string;
  insert_template_category_list: null;
  is_challenge: number;
  is_commerce: boolean;
  is_pgcshow: boolean;
  schema: string;
  search_impr: ChaListSearchImpr;
  share_info: ChaListShareInfo;
  show_items: null;
  sub_type: number;
  type: number;
  user_count: number;
  view_count: number;
  [property: string]: any;
}

type ChaListAuthor = {
  ad_cover_url: null;
  avatar_168x168: FluffyAvatar168X168;
  avatar_300x300: FluffyAvatar300X300;
  avatar_larger: FluffyAvatarLarger;
  avatar_medium: FluffyAvatarMedium;
  avatar_schema_list: null;
  avatar_thumb: FluffyAvatarThumb;
  avatar_uri: string;
  aweme_control: { [key: string]: any };
  ban_user_functions: null;
  batch_unfollow_contain_tabs: null;
  batch_unfollow_relation_desc: null;
  bind_phone: string;
  birthday: string;
  can_set_geofencing: null;
  card_entries: null;
  card_entries_not_display: null;
  card_sort_priority: null;
  cf_list: null;
  cha_list: null;
  constellation: number;
  contrail_list: null;
  cover_url: string[];
  create_time: number;
  creator_tag_list: null;
  data_label_list: null;
  display_info: null;
  endorsement_info_list: null;
  familiar_visitor_user: null;
  follow_status: number;
  follower_list_secondary_information_struct: null;
  followers_detail: null;
  gender: number;
  geofencing: null;
  has_email: boolean;
  homepage_bottom_toast: null;
  identity_labels: null;
  im_role_ids: null;
  interest_tags: null;
  is_block: boolean;
  is_phone_binded: boolean;
  item_list: null;
  language: string;
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
  region: string;
  relative_users: null;
  search_impr: FluffySearchImpr;
  sec_uid: string;
  short_id: string;
  show_image_bubble: boolean;
  signature: string;
  signature_extra: null;
  special_people_labels: null;
  status: number;
  text_extra: null;
  type_label: null;
  uid: string;
  unique_id: string;
  unique_id_modify_time: number;
  user_permissions: null;
  user_tags: null;
  verification_permission_ids: null;
  video_icon: FluffyVideoIcon;
  white_cover_url: null;
  with_dou_entry: boolean;
  [property: string]: any;
}

type FluffyAvatar168X168 = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type FluffyAvatar300X300 = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type FluffyAvatarLarger = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type FluffyAvatarMedium = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type FluffyAvatarThumb = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type FluffySearchImpr = {
  entity_id: string;
  [property: string]: any;
}

type FluffyVideoIcon = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type ExtraAttr = {
  is_live: boolean;
  [property: string]: any;
}

type ChaListSearchImpr = {
  entity_id: string;
  [property: string]: any;
}

type ChaListShareInfo = {
  bool_persist: number;
  share_desc: string;
  share_desc_info: string;
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

type ChapterData = {
  ad_chapter_index_list: null;
  recommend_type: string;
  [property: string]: any;
}

type ChapterList = {
  desc: string;
  detail: string;
  points: null;
  timestamp: number;
  url: string;
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

type CommerceInfo = {
  ad_type: number;
  is_ad: boolean;
  [property: string]: any;
}

type ComponentControl = {
  data_source_url: string;
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

type EntertainmentVideoPaidWay = {
  enable_use_new_ent_data: boolean;
  paid_type: number;
  paid_ways: string[];
  [property: string]: any;
}

type FallCardStruct = {
  recommend_reason?: string;
  recommend_reason_v2: string;
  [property: string]: any;
}

type FeedCommentConfig = {
  audio_comment_permission: number;
  author_audit_status: number;
  common_flags: string;
  double_publish?: number;
  double_publish_limit?: number;
  input_config_text: string;
  [property: string]: any;
}

type FollowShootClipInfo = {
  clip_from_platform: number;
  clip_from_user?: number;
  clip_video_all: number;
  origin_clip_id: number;
  [property: string]: any;
}

type FriendRecommendInfo = {
  disable_friend_recommend_guide_label: boolean;
  friend_recommend_source: number;
  is_friend_recommend: string;
  label_user_list: LabelUserList[];
  recommend_user_app_list: string;
  [property: string]: any;
}

type LabelUserList = {
  recommend_app_id: number;
  recommend_time: number;
  user: User;
  [property: string]: any;
}

type User = {
  avatar: UserAvatar;
  avatar_thumb: UserAvatarThumb;
  follow_status: number;
  nickname: string;
  remark_name?: string;
  sec_uid: string;
  uid: number;
  [property: string]: any;
}

type UserAvatar = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type UserAvatarThumb = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type GalileoPadTextcrop = {
  android_d_h_cut_ratio: number[] | null;
  android_d_v_cut_ratio: number[] | null;
  ipad_d_h_cut_ratio: number[] | null;
  ipad_d_v_cut_ratio: number[] | null;
  pc_blocked_area_ratio: null;
  version: number;
  [property: string]: any;
}

type GameTagInfo = {
  content_type_tag?: ContentTypeTag;
  game_name_tag?: GameNameTag;
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

type GeneralLabel = {
  candidates: Candidate[];
  right_label_candidates: string[];
  strategy: number;
  [property: string]: any;
}

type Candidate = {
  business_id?: string;
  priority?: number;
  static_label?: StaticLabel;
  type?: number;
  [property: string]: any;
}

type StaticLabel = {
  actions: Action[];
  containers: Container[];
  data: null;
  data_map: DataMap[];
  display_strategies: null;
  external_events: null;
  style: StaticLabelStyle;
  tracking_info: string;
  [property: string]: any;
}

type Action = {
  action_type?: number;
  data?: null;
  data_ref?: string;
  event_id?: string;
  [property: string]: any;
}

type Container = {
  elements?: Element[];
  event_id?: string;
  id?: string;
  style?: ContainerStyle;
  template?: number;
  [property: string]: any;
}

type Element = {
  data_ref: string;
  multi_images: MultiImages;
  text?: Text;
  type: number;
  [property: string]: any;
}

type MultiImages = {
  images: MultiImagesImage[];
  style?: MultiImagesStyle;
  [property: string]: any;
}

type MultiImagesImage = {
  image: ImageImage;
  style: ImageStyle;
  [property: string]: any;
}

type ImageImage = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type ImageStyle = {
  shape?: number;
  size: number;
  [property: string]: any;
}

type MultiImagesStyle = {
  padding: null;
  [property: string]: any;
}

type Text = {
  content: string;
  style: TextStyle;
  [property: string]: any;
}

type TextStyle = {
  bold: boolean;
  font_color: string;
  max_character: number;
  omit_strategy: number;
  size: number;
  [property: string]: any;
}

type ContainerStyle = {
  border_radius: number;
  color: string;
  height: number;
  padding: number[];
  transparency: number;
  [property: string]: any;
}

type DataMap = {
  data?: DataMapData;
  key?: string;
  [property: string]: any;
}

type DataMapData = {
  comment_list: null;
  schema: string;
  user_list: null;
  [property: string]: any;
}

type StaticLabelStyle = {
  container_number: number;
  padding: null;
  [property: string]: any;
}

type HotList = {
  extra: string;
  footer: string;
  header: string;
  hot_score: number;
  i18n_title: string;
  image_url: string;
  pattern_type: number;
  schema: string;
  sentence: string;
  sentence_id: number;
  title: string;
  type: number;
  view_count: number;
  [property: string]: any;
}

type ImageAlbumMusicInfo = {
  begin_time: number;
  end_time: number;
  volume: number;
  [property: string]: any;
}

type AwemeListImage = {
  clip_type: number;
  download_url_list: string[];
  height: number;
  interaction_stickers: null;
  is_new_text_mode: number;
  live_photo_type: number;
  mask_url_list: null;
  uri: string;
  url_list: string[];
  video: ImageVideo;
  watermark_free_download_url_list: null;
  width: number;
  [property: string]: any;
}

type ImageVideo = {
  big_thumbs: string[];
  bit_rate: VideoBitRate[];
  bit_rate_audio: null;
  cdn_url_expired: number;
  cover: PurpleCover;
  download_addr: PurpleDownloadAddr;
  download_suffix_logo_addr: PurpleDownloadSuffixLogoAddr;
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
  play_addr_lowbr: PurplePlayAddrLowbr;
  ratio: string;
  tags: null;
  width: number;
  [property: string]: any;
}

type VideoBitRate = {
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

type PurpleDownloadAddr = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type PurpleDownloadSuffixLogoAddr = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type PurpleOriginCover = {
  height: number;
  uri: string;
  url_list: string[];
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

type PurplePlayAddrLowbr = {
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
  group_id_list_a: string[];
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
  cover_url: MixInfoCoverurl;
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
  paid_episodes: null;
  share_info: MixInfoShareInfo;
  statis: Statis;
  status: MixInfoStatus;
  update_time: number;
  watched_item: string;
  [property: string]: any;
}

type MixInfoCoverurl = {
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
  avatar_medium: MusicAvatarMedium;
  avatar_thumb: MusicAvatarThumb;
  binded_challenge_id: number;
  can_background_play: boolean;
  collect_stat: number;
  cover_color_hsv: CoverColorHsv;
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
  preview_start_time: number ;
  reason_type: number;
  redirect: boolean;
  schema_url: string;
  search_impr: MusicSearchImpr;
  sec_uid: string;
  shoot_duration: number;
  show_origin_clip: boolean;
  song: Song;
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

type Artist = {
  avatar: ArtistAvatar;
  enter_type: number;
  handle: string;
  is_verified: boolean;
  nick_name: string;
  sec_uid: string;
  uid: string;
  [property: string]: any;
}

type ArtistAvatar = {
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

type MusicSearchImpr = {
  entity_id: string;
  [property: string]: any;
}

type Song = {
  artists: null;
  chorus: Chorus;
  chorus_v3_infos: null;
  id: number;
  id_str: string;
  title: string;
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

type PoiPatchInfo = {
  extra: string;
  item_patch_poi_prompt_mark: number;
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

type RelationLabel = {
  count: number;
  extra: string;
  label_info: string;
  type: number;
  user_id: string;
  user_list: UserList[];
  [property: string]: any;
}

type UserList = {
  avatar: UserListAvatar;
  avatar_thumb: UserListAvatarThumb;
  follow_status: number;
  nickname: string;
  remark_name?: string;
  sec_uid: string;
  uid: number;
  [property: string]: any;
}

type UserListAvatar = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type UserListAvatarThumb = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type RiskInfos = {
  content: string;
  icon_url?: string;
  risk_sink: boolean;
  type: number;
  vote: boolean;
  warn: boolean;
  warn_level?: number;
  [property: string]: any;
}

type SeriesPaidInfo = {
  item_price: number;
  series_paid_status: number;
  [property: string]: any;
}

type AwemeListShareInfo = {
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

type StarAtlasInfo = {
  click_track_url_list: null;
  log_extra: string;
  track_url_list: null;
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

type AwemeListStatus = {
  allow_comment: boolean;
  allow_friend_recommend: boolean;
  allow_friend_recommend_guide: boolean;
  allow_self_recommend_to_friend: boolean;
  allow_share: boolean;
  aweme_edit_info: AwemeEditInfo;
  aweme_id: string;
  dont_share_status: number;
  download_status: number;
  enable_soft_delete: number;
  in_reviewing: boolean;
  is_delete: boolean;
  is_private: boolean;
  is_prohibited: boolean;
  listen_video_status: number;
  not_allow_soft_del_reason: string;
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
  edit_status: number;
  has_modified_all: boolean;
  [property: string]: any;
}

type ReviewResult = {
  review_status: number;
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
  sub_type: number;
  type: number;
  user_id: string;
  [property: string]: any;
}

type TrendsInfo = {
  insert_music_ids?: null;
  track_pass_through?: string;
  trends_materials?: null;
  trends_music_info?: null;
  trends_unified_music_group?: null;
  [property: string]: any;
}

type AwemeListVideo = {
  animated_cover?: AnimatedCover;
  audio: Audio;
  big_thumbs: BigThumb[] | null;
  bit_rate: BitRateBitRate[] | null;
  bit_rate_audio: BitRateAudio[] | null;
  cdn_url_expired?: number;
  cover: FluffyCover;
  download_addr?: FluffyDownloadAddr;
  download_suffix_logo_addr?: FluffyDownloadSuffixLogoAddr;
  duration: number;
  dynamic_cover?: DynamicCover;
  format?: string;
  gaussian_cover?: GaussianCover;
  has_download_suffix_logo_addr?: boolean;
  has_watermark: boolean;
  height: number;
  horizontal_type?: number;
  is_bytevc1: number;
  is_callback?: boolean;
  is_h265: number;
  is_long_video?: number;
  is_source_HDR?: number;
  meta: string;
  misc_download_addrs?: string;
  need_set_token?: boolean;
  origin_cover: FluffyOriginCover;
  play_addr: StickyPlayAddr;
  play_addr_265?: PlayAddr265;
  play_addr_h264?: FluffyPlayAddrH264;
  play_addr_lowbr?: FluffyPlayAddrLowbr;
  ratio: string;
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
  duration: number ;
  fext: string;
  img_num: number;
  img_url: string;
  img_urls: string[];
  img_x_len: number;
  img_x_size: number;
  img_y_len: number;
  img_y_size: number;
  interval: number ;
  uri: string;
  uris: string[];
  [property: string]: any;
}

type BitRateBitRate = {
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

type BitRateAudio = {
  audio_extra: string;
  audio_meta: AudioMeta;
  audio_quality: number;
  [property: string]: any;
}

type AudioMeta = {
  bitrate: number;
  codec_type: string;
  encoded_type: string;
  file_hash: string;
  file_id: string;
  format: string;
  fps: number;
  logo_type: string;
  media_type: string;
  quality: string;
  quality_desc: string;
  size: number;
  sub_info: string;
  url_list: UrlList;
  [property: string]: any;
}

type UrlList = {
  backup_url: string;
  fallback_url: string;
  main_url: string;
  [property: string]: any;
}

type FluffyCover = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type FluffyDownloadAddr = {
  data_size: number;
  file_cs: string;
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type FluffyDownloadSuffixLogoAddr = {
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

type FluffyPlayAddrLowbr = {
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
  fail_info: DuetInfoFailInfo;
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
  [property: string]: any;
}

type XiguaBaseInfo = {
  item_id: number;
  star_altar_order_id: number;
  star_altar_type: number;
  status: number;
  [property: string]: any;
}

type XiguaTask = {
  is_xigua_task: boolean;
  [property: string]: any;
}
