export type SearchInfoUser = {
  challenge_list: null;
  cursor: number;
  extra: Extra;
  global_doodle_config: GlobalDoodleConfig;
  has_more: number;
  input_keyword: string;
  log_pb: LogPb;
  mock_recall_path: string;
  music_list: null;
  myself_user_id: string;
  path: string;
  qc: string;
  rid: string;
  status_code: number;
  type: number;
  user_list: UserList[];
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
  filter_show_dot: number;
  keyword: string;
  [property: string]: any;
}

type FilterSetting = {
  default_index: number;
  items: Item[];
  log_name: string;
  name: string;
  title: string;
  [property: string]: any;
}

type Item = {
  log_value: string;
  title: string;
  value: string;
  [property: string]: any;
}

type LogPb = {
  impr_id: string;
  [property: string]: any;
}

type UserList = {
  baikes: null;
  challenges: null;
  effects: null;
  fandoms: null;
  is_red_uniqueid: boolean;
  items: null;
  mix_list: null;
  musics: null;
  position: null;
  product_info: null;
  product_list: null;
  shop_product_info: null;
  uniqid_position: null;
  user_info: UserInfo;
  user_service_info: null;
  userSubLightApp: null;
  [property: string]: any;
}

type UserInfo = {
  account_cert_info: string;
  ad_cover_url: null;
  avatar_schema_list: null;
  avatar_thumb: AvatarThumb;
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
  follow_status: number;
  follower_count: number;
  follower_count_str: string;
  follower_list_secondary_information_struct: null;
  follower_status: number;
  followers_detail: null;
  geofencing: null;
  homepage_bottom_toast: null;
  identity_labels: null;
  im_role_ids: null;
  interest_tags: null;
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
  short_id: string;
  signature: string;
  signature_extra: null;
  special_people_labels: null;
  text_extra: null;
  total_favorited: number;
  type_label: null;
  uid: string;
  unique_id: string;
  user_permissions: null;
  user_tags: UserTag[];
  verification_permission_ids: null;
  versatile_display: string;
  white_cover_url: null;
  [property: string]: any;
}

type AvatarThumb = {
  height: number;
  uri: string;
  url_list: string[];
  width: number;
  [property: string]: any;
}

type UserTag = {
  description: string;
  icon_url: string;
  type: string;
  [property: string]: any;
}
