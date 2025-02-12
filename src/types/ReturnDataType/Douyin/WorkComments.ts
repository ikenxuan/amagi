export type DyWorkComments = {
  comment_common_data: string
  comment_config: { [key: string]: any }
  comments: Comment[]
  cursor: number
  extra: Extra
  fast_response_comment: FastResponseComment
  folded_comment_count: number
  general_comment_config: { [key: string]: any }
  has_more: number
  hotsoon_filtered_count: number
  log_pb: LogPb
  reply_style: number
  show_management_entry_point: number
  status_code: number
  total: number
  user_commented: number;
  [property: string]: any
}

type Comment = {
  aweme_id: string
  can_share: boolean
  cid: string
  content_type: number
  create_time: number
  digg_count: number
  enter_from: string
  image_list: ImageList[]
  ip_label: string
  is_author_digged: boolean
  is_folded: boolean
  is_hot: boolean
  is_note_comment: number
  is_user_tend_to_reply: boolean
  item_comment_total: number
  label_list: null
  label_text: string
  label_type: number
  level: number
  reply_comment: ReplyComment[] | null
  reply_comment_total: number
  reply_id: string
  reply_to_reply_id: string
  sort_tags: string
  status: number
  stick_position: number
  text: string
  text_extra: TextExtra[]
  text_music_info: null
  user: CommentUser
  user_buried: boolean
  user_digged: number
  video_list: null;
  [property: string]: any
}

type ImageList = {
  crop_url: Cropurl
  download_url: Downloadurl
  medium_url: Mediumurl
  origin_url: Originurl
  thumb_url: Thumburl;
  [property: string]: any
}

type Cropurl = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type Downloadurl = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type Mediumurl = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type Originurl = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type Thumburl = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type ReplyComment = {
  aweme_id?: string
  can_share?: boolean
  cid?: string
  content_type?: number
  create_time?: number
  digg_count?: number
  image_list?: null
  ip_label?: string
  is_author_digged?: boolean
  is_folded?: boolean
  is_hot?: boolean
  is_note_comment?: number
  label_list?: null
  label_text?: string
  label_type?: number
  level?: number
  reply_comment?: null
  reply_id?: string
  reply_to_reply_id?: string
  status?: number
  text?: string
  text_extra?: any[]
  text_music_info?: null
  user?: ReplyCommentUser
  user_buried?: boolean
  user_digged?: number
  video_list?: null;
  [property: string]: any
}

type ReplyCommentUser = {
  accept_private_policy: boolean
  account_region: string
  ad_cover_url: null
  apple_account: number
  authority_status: number
  avatar_168x168: PurpleAvatar168X168
  avatar_300x300: PurpleAvatar300X300
  avatar_larger: PurpleAvatarLarger
  avatar_medium: PurpleAvatarMedium
  avatar_schema_list: null
  avatar_thumb: PurpleAvatarThumb
  avatar_uri: string
  aweme_control: PurpleAwemeControl
  aweme_count: number
  aweme_hotsoon_auth: number
  awemehts_greet_info: string
  ban_user_functions: any[]
  batch_unfollow_contain_tabs: null
  batch_unfollow_relation_desc: null
  bind_phone: string
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
  cover_url: PurpleCoverurl[]
  creator_tag_list: null
  custom_verify: string
  cv_level: string
  data_label_list: null
  disable_image_comment_saved: number
  display_info: null
  download_prompt_ts: number
  download_setting: number
  duet_setting: number
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
  followers_detail: null
  following_count: number
  geofencing: any[]
  google_account: string
  has_email: boolean
  has_facebook_token: boolean
  has_insights: boolean
  has_orders: boolean
  has_twitter_token: boolean
  has_unread_story: boolean
  has_youtube_token: boolean
  hide_location: boolean
  hide_search: boolean
  homepage_bottom_toast: null
  im_role_ids: null
  ins_id: string
  interest_tags: null
  is_ad_fake: boolean
  is_ban: boolean
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
  new_friend_type: number
  new_story_cover: null
  nickname: string
  not_seen_item_id_list: null
  not_seen_item_id_list_v2: null
  offline_info_list: null
  personal_tag_list: null
  platform_sync_info: null
  prevent_download: boolean
  private_relation_list: null
  profile_mob_params: null
  react_setting: number
  reflow_page_gid: number
  reflow_page_uid: number
  region: string
  relative_users: null
  risk_notice_text: string
  room_id: number
  room_id_str: string
  school_category: number
  school_name: string
  school_poi_id: string
  school_type: number
  search_impr: PurpleSearchImpr
  sec_uid: string
  secret: number
  shield_comment_notice: number
  shield_digg_notice: number
  shield_follow_notice: number
  short_id: string
  show_gender_strategy: number
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
  story_count: number
  story_open: boolean
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
  urge_detail: PurpleUrgeDetail
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
  verification_type: number
  verify_info: string
  video_icon: PurpleVideoIcon
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
  youtube_expire_time: number;
  [property: string]: any
}

type PurpleAvatar168X168 = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type PurpleAvatar300X300 = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type PurpleAvatarLarger = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type PurpleAvatarMedium = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type PurpleAvatarThumb = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type PurpleAwemeControl = {
  can_comment: boolean
  can_forward: boolean
  can_share: boolean
  can_show_comment: boolean;
  [property: string]: any
}

type PurpleCoverurl = {
  height?: number
  uri?: string
  url_list?: string[]
  width?: number;
  [property: string]: any
}

type PurpleSearchImpr = {
  entity_id: string;
  [property: string]: any
}

type PurpleUrgeDetail = {
  user_urged: number;
  [property: string]: any
}

type PurpleVideoIcon = {
  height: number
  uri: string
  url_list: any[]
  width: number;
  [property: string]: any
}

type TextExtra = {
  end?: number
  hashtag_id?: string
  hashtag_name?: string
  sec_uid?: string
  start?: number
  type?: number
  user_id?: string;
  [property: string]: any
}

type CommentUser = {
  accept_private_policy: boolean
  account_region: string
  ad_cover_url: null
  apple_account: number
  authority_status: number
  avatar_168x168: FluffyAvatar168X168
  avatar_300x300: FluffyAvatar300X300
  avatar_larger: FluffyAvatarLarger
  avatar_medium: FluffyAvatarMedium
  avatar_schema_list: null
  avatar_thumb: FluffyAvatarThumb
  avatar_uri: string
  aweme_control: FluffyAwemeControl
  aweme_count: number
  aweme_hotsoon_auth: number
  aweme_hotsoon_auth_relation: number
  awemehts_greet_info: string
  ban_user_functions: number[]
  batch_unfollow_contain_tabs: null
  batch_unfollow_relation_desc: null
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
  cover_url: FluffyCoverurl[]
  creator_tag_list: null
  custom_verify: string
  cv_level: string
  data_label_list: null
  disable_image_comment_saved: number
  display_info: null
  download_prompt_ts: number
  download_setting: number
  duet_setting: number
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
  geofencing: string[]
  google_account: string
  has_email: boolean
  has_facebook_token: boolean
  has_insights: boolean
  has_orders: boolean
  has_twitter_token: boolean
  has_unread_story: boolean
  has_youtube_token: boolean
  hide_location: boolean
  hide_search: boolean
  homepage_bottom_toast: null
  im_role_ids: null
  ins_id: string
  interest_tags: null
  is_ad_fake: boolean
  is_ban: boolean
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
  mate_add_permission: number
  max_follower_count: number
  need_points: null
  need_recommend: number
  neiguang_shield: number
  new_friend_type: number
  new_story_cover: null
  nickname: string
  not_seen_item_id_list: null
  not_seen_item_id_list_v2: null
  offline_info_list: null
  personal_tag_list: null
  platform_sync_info: null
  prevent_download: boolean
  private_relation_list: null
  profile_mob_params: null
  react_setting: number
  reflow_page_gid: number
  reflow_page_uid: number
  region: string
  relative_users: null
  risk_notice_text: string
  room_id: number
  room_id_str: string
  school_category: number
  search_impr: FluffySearchImpr
  sec_uid: string
  secret: number
  shield_comment_notice: number
  shield_digg_notice: number
  shield_follow_notice: number
  short_id: string
  show_gender_strategy: number
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
  story_count: number
  story_open: boolean
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
  urge_detail: FluffyUrgeDetail
  user_canceled: boolean
  user_mode: number
  user_not_see: number
  user_not_show: number
  user_period: number
  user_permissions: null
  user_rate: number
  user_tags: null
  verification_permission_ids: null
  verification_type: number
  verify_info: string
  video_icon: FluffyVideoIcon
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
  youtube_expire_time: number;
  [property: string]: any
}

type FluffyAvatar168X168 = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type FluffyAvatar300X300 = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type FluffyAvatarLarger = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type FluffyAvatarMedium = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type FluffyAvatarThumb = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type FluffyAwemeControl = {
  can_comment: boolean
  can_forward: boolean
  can_share: boolean
  can_show_comment: boolean;
  [property: string]: any
}

type FluffyCoverurl = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type FluffySearchImpr = {
  entity_id: string;
  [property: string]: any
}

type FluffyUrgeDetail = {
  user_urged: number;
  [property: string]: any
}

type FluffyVideoIcon = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type Extra = {
  fatal_item_ids: null
  now: number;
  [property: string]: any
}

type FastResponseComment = {
  constant_response_words: string[]
  timed_response_words: string[];
  [property: string]: any
}

type LogPb = {
  impr_id: string;
  [property: string]: any
}
