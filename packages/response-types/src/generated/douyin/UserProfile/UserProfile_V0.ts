// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：2 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/userProfile.requests.json 里
//   sec_uid  私密账号
//   sec_uid  默认值

export type UserProfile_V0 = {
  extra: Extra
  log_pb: LogPb
  status_code: number
  status_msg: null
  user: User
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

type User = {
  account_cert_info: string
  apple_account: number
  avatar_168x168: Avatar168x168
  avatar_300x300: Avatar168x168
  avatar_larger: Avatar168x168
  avatar_medium: Avatar168x168
  avatar_thumb: Avatar168x168
  aweme_count: number
  aweme_count_correction_threshold: number
  birthday_hide_level: number
  can_set_item_cover: boolean
  can_show_group_card: number
  card_entries?: CardEntry[]
  city: string
  close_friend_type: number
  commerce_info?: CommerceInfo
  commerce_user_info: CommerceUserInfo
  commerce_user_level: number
  country: string
  cover_and_head_image_info: CoverAndHeadImageInfo
  cover_colour: string
  cover_url: IconDark[]
  custom_verify: string
  disable_manual_refresh: number
  district: string | null
  dog_card_info?: DogCardInfo
  dongtai_count: number
  dynamic_cover: { [property: string]: any }
  elfemoji_status: number
  enable_ai_double: number
  enable_wish: boolean
  enterprise_user_info: string
  enterprise_verify_reason: string
  evaluation_count: number
  familiar_confidence: number
  favorite_permission: number
  favoriting_count: number
  follow_guide?: boolean
  follow_status: number
  follower_count: number
  follower_request_status: number
  follower_status: number
  following_count: number
  forward_count: number
  gender: number | null
  general_permission: GeneralPermission
  has_e_account_role: boolean
  has_subscription: boolean
  hide_request_update: number
  im_primary_role_id?: number
  im_role_ids?: number[]
  image_send_exempt: boolean
  ins_id: string
  ip_location?: string
  is_activity_user: boolean
  is_ban: boolean
  is_block: boolean
  is_blocked: boolean
  is_effect_artist: boolean
  is_gov_media_vip: boolean
  is_im_oversea_user: number
  is_mix_user: boolean
  is_not_show: boolean
  is_series_user: boolean
  is_sharing_profile_user: number
  is_star: boolean
  is_top?: number
  iso_country_code?: string
  life_story_block: LifeStoryBlock
  live_commerce: boolean
  live_status: number
  mate_add_permission: number
  mate_relation: MateRelation
  max_follower_count: number
  message_chat_entry: boolean
  mix_count: number
  mplatform_followers_count: number
  new_friend_type: number
  nickname: string
  original_musician: OriginalMusician
  pigeon_daren_status: string
  pigeon_daren_warn_tag: string
  profile_component_disabled: string[]
  profile_mob_params: ProfileMobParam[]
  profile_show: ProfileShow
  profile_tab_info: ProfileTabInfo
  profile_tab_type: number
  province: string
  public_collects_count: number
  publish_landing_tab: number
  r_fans_group_info: { [property: string]: any }
  recommend_reason_relation: string
  recommend_user_reason_source: number
  risk_notice_text: string
  role_id?: string
  room_data?: string
  room_id: number
  room_id_str?: string
  school_name: string
  sec_uid: string
  secret: number
  series_count: number
  share_info: ShareInfo
  short_id: string
  show_favorite_list: boolean
  show_subscription: boolean
  signature: string
  signature_display_lines: number
  signature_extra?: SignatureExtra[]
  signature_language: string
  social_real_relation_type: number
  special_follow_status: number
  special_state_info?: SpecialStateInfo
  store_region: string
  story_tab_empty: boolean
  sync_to_toutiao: number
  tab_settings: TabSettings
  total_favorited: number
  total_favorited_correction_threshold: number
  twitter_id: string
  twitter_name: string
  uid: string
  unique_id: string
  urge_detail: UrgeDetail
  use_diverse_digg_style: boolean
  user_age: number
  user_not_see: number
  user_not_show: number
  user_permissions?: UserPermission[]
  verification_type: number
  video_cover: { [property: string]: any }
  video_icon: VideoIcon
  watch_status: boolean
  white_cover_url: IconDark[]
  with_commerce_enterprise_tab_entry: boolean
  with_commerce_entry: boolean
  with_fusion_shop_entry: boolean
  with_new_goods: boolean
  youtube_channel_id: string
  youtube_channel_title: string
  [property: string]: any
}

type Avatar168x168 = {
  height: number
  uri: string
  url_list: string[]
  width: number
  [property: string]: any
}

type CardEntry = {
  card_data: string
  goto_url: string
  icon_dark: IconDark
  icon_light: IconDark
  sub_title: string
  title: string
  type: number
  [property: string]: any
}

type IconDark = {
  uri: string
  url_list: string[]
  [property: string]: any
}

type CommerceInfo = {
  challenge_list: null
  head_image_list: null
  offline_info_list: unknown[]
  smart_phone_list: null
  task_list: null
  [property: string]: any
}

type CommerceUserInfo = {
  ad_revenue_rits: null
  has_ads_entry: boolean
  show_star_atlas_cooperation?: boolean
  star_atlas?: number
  [property: string]: any
}

type CoverAndHeadImageInfo = {
  cover_list: null
  profile_cover_list: ProfileCoverList[]
  [property: string]: any
}

type ProfileCoverList = {
  cover_url: IconDark
  dark_cover_color: string
  light_cover_color: string
  [property: string]: any
}

type DogCardInfo = {
  dog_card_id: number
  dog_card_text: string
  rank: number
  rank_schema: string
  rank_type: string
  [property: string]: any
}

type GeneralPermission = {
  fans_page_toast: number
  following_follower_list_toast: number
  is_hit_active_fans_grayed: boolean
  [property: string]: any
}

type LifeStoryBlock = {
  life_story_block: boolean
  [property: string]: any
}

type MateRelation = {
  mate_apply_forward: number
  mate_apply_reverse: number
  mate_status: number
  [property: string]: any
}

type OriginalMusician = {
  digg_count: number
  music_count: number
  music_used_count: number
  [property: string]: any
}

type ProfileMobParam = {
  event_key: string
  mob_params: string
  [property: string]: any
}

type ProfileShow = {
  identify_auth_infos: null
  [property: string]: any
}

type ProfileTabInfo = {
  profile_landing_tab: number
  profile_tab_list: unknown[]
  profile_tab_list_v2: ProfileTabListV2[] | null
  [property: string]: any
}

type ProfileTabListV2 = {
  id: number
  name_en: string
  sub_tabs: null
  [property: string]: any
}

type ShareInfo = {
  bool_persist: number
  life_share_ext: string
  share_desc: string
  share_image_url: IconDark
  share_qrcode_url: IconDark
  share_title: string
  share_url: string
  share_weibo_desc: string
  [property: string]: any
}

type SignatureExtra = {
  end: number
  hashtag_id: string
  hashtag_name: string
  is_commerce: boolean
  sec_uid: string
  start: number
  type: number
  user_id: string
  [property: string]: any
}

type SpecialStateInfo = {
  content: string
  special_state: number
  title: string
  [property: string]: any
}

type TabSettings = {
  private_tab: PrivateTab
  [property: string]: any
}

type PrivateTab = {
  private_tab_style: number
  show_private_tab: boolean
  [property: string]: any
}

type UrgeDetail = {
  ctl_map: string
  user_urged: number
  [property: string]: any
}

type UserPermission = {
  key: string
  value: string
  [property: string]: any
}

type VideoIcon = {
  height: number
  uri: string
  url_list: unknown[]
  width: number
  [property: string]: any
}
