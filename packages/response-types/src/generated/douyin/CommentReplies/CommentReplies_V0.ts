// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/commentReplies.requests.json 里
//   aweme_id / comment_id  默认值

export type CommentReplies_V0 = {
  comments: Comment[]
  cursor: number
  extra: Extra
  has_more: number
  log_pb: LogPb
  merge_cursor: string
  status_code: number
  total: number
  [property: string]: any
}

type Comment = {
  aweme_id: string
  can_collect: boolean
  can_share: boolean
  cid: string
  comment_reply_total: number
  content_type: number
  create_time: number
  decorated_emoji_info: null
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
  merge_comment_label: null
  reply_comment: null
  reply_id: string
  reply_to_reply_id: string
  root_comment_id: string
  status: number
  text: string
  text_extra: TextExtra[]
  text_music_info: null
  user: User
  user_buried: boolean
  user_digged: number
  video_list: null
  [property: string]: any
}

type TextExtra = {
  end: number
  hashtag_id?: string
  hashtag_name?: string
  search_extra?: string
  search_hide_words?: number
  search_query_id?: string
  search_rank?: number
  search_text?: string
  sec_uid?: string
  start: number
  type: number
  user_id?: string
  [property: string]: any
}

type User = {
  ad_cover_url: null
  avatar_schema_list: null
  avatar_thumb: AvatarThumb
  aweme_control: AwemeControl
  ban_user_functions: unknown[] | null
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
  identity_labels: null
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
  profile_component_disabled: null
  profile_mob_params: null
  profile_signature_components: null
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

type AwemeControl = {
  can_comment: boolean
  can_forward: boolean
  can_share: boolean
  can_show_comment: boolean
  [property: string]: any
}

type Extra = {
  fatal_item_ids: null
  now: number
  scenes: null
  [property: string]: any
}

type LogPb = {
  impr_id: string
  [property: string]: any
}
