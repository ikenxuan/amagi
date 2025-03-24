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
  image_list: ImageList[] | null
  ip_label: string
  is_author_digged: boolean
  is_first_visitor_cmt?: boolean
  is_folded: boolean
  is_hot: boolean
  is_note_comment: number
  is_user_tend_to_reply: boolean
  item_comment_total: number
  label_list: LabelList[] | null
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
  text_extra: string[]
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

type LabelList = {
  text?: string
  type?: number;
  [property: string]: any
}

type ReplyComment = {
  aweme_id: string
  can_share: boolean
  cid: string
  content_type: number
  create_time: number
  digg_count: number
  image_list: null
  ip_label: string
  is_author_digged: boolean
  is_folded: boolean
  is_hot: boolean
  is_note_comment: number
  label_list: null
  label_text: string
  label_type: number
  level: number
  reply_comment: null
  reply_id: string
  reply_to_reply_id: string
  status: number
  text: string
  text_extra: any[]
  text_music_info: null
  user: ReplyCommentUser
  user_buried: boolean
  user_digged: number
  video_list: null;
  [property: string]: any
}

type ReplyCommentUser = {
  ad_cover_url: null
  avatar_schema_list: null
  avatar_thumb: PurpleAvatarThumb
  aweme_control: PurpleAwemeControl
  ban_user_functions: null
  batch_unfollow_contain_tabs: null
  batch_unfollow_relation_desc: null
  can_set_geofencing: null
  card_entries: null
  card_entries_not_display: null
  card_sort_priority: null
  cf_list: null
  cha_list: null
  close_friend_type: number
  comment_setting: number
  commerce_user_level: number
  contrail_list: null
  cover_url: null
  creator_tag_list: null
  custom_verify: string
  data_label_list: null
  disable_image_comment_saved: number
  display_info: null
  endorsement_info_list: null
  enterprise_verify_reason: string
  familiar_visitor_user: null
  follow_status: number
  follower_list_secondary_information_struct: null
  follower_status: number
  followers_detail: null
  geofencing: null
  homepage_bottom_toast: null
  im_role_ids: null
  interest_tags: null
  is_ad_fake: boolean
  is_block: boolean
  is_blocked_v2: boolean
  is_blocking_v2: boolean
  is_star: boolean
  item_list: null
  link_item_list: null
  need_points: null
  new_story_cover: null
  nickname: string
  not_seen_item_id_list: null
  not_seen_item_id_list_v2: null
  offline_info_list: null
  personal_tag_list: null
  platform_sync_info: null
  private_relation_list: null
  profile_mob_params: null
  region: string
  relative_users: null
  sec_uid: string
  secret: number
  short_id: string
  signature_extra: null
  special_people_labels: null
  status: number
  text_extra: null
  type_label: null
  uid: string
  unique_id: string
  user_canceled: boolean
  user_permissions: null
  user_tags: null
  verification_permission_ids: null
  white_cover_url: null;
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

type CommentUser = {
  ad_cover_url: null
  avatar_schema_list: null
  avatar_thumb: FluffyAvatarThumb
  aweme_control: FluffyAwemeControl
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
  comment_setting: number
  commerce_user_level: number
  contrail_list: null
  cover_url: null
  creator_tag_list: null
  custom_verify: string
  data_label_list: null
  disable_image_comment_saved: number
  display_info: null
  endorsement_info_list: null
  enterprise_verify_reason: string
  familiar_visitor_user: null
  follow_status: number
  follower_list_secondary_information_struct: null
  follower_status: number
  geofencing: null
  homepage_bottom_toast: null
  im_role_ids: null
  interest_tags: null
  is_ad_fake: boolean
  is_block: boolean
  is_blocked_v2: boolean
  is_blocking_v2: boolean
  is_star: boolean
  item_list: null
  link_item_list: null
  need_points: null
  new_story_cover: null
  nickname: string
  not_seen_item_id_list: null
  not_seen_item_id_list_v2: null
  offline_info_list: null
  personal_tag_list: null
  platform_sync_info: null
  private_relation_list: null
  profile_mob_params: null
  region: string
  relative_users: null
  sec_uid: string
  secret: number
  short_id: string
  signature_extra: null
  special_people_labels: null
  status: number
  text_extra: null
  type_label: null
  uid: string
  unique_id: string
  user_canceled: boolean
  user_permissions: null
  user_tags: null
  verification_permission_ids: null
  white_cover_url: null;
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