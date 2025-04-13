export type DyUserInfo = {
  extra: Extra
  log_pb: LogPb
  status_code: number
  status_msg: null
  user: User;
  [property: string]: any
}

type Extra = {
  fatal_item_ids: string[]
  logid: string
  now: number;
  [property: string]: any
}

type LogPb = {
  impr_id: string;
  [property: string]: any
}

type User = {
  account_cert_info: string
  apple_account: number
  avatar_168x168: Avatar168X168
  avatar_300x300: Avatar300X300
  avatar_larger: AvatarLarger
  avatar_medium: AvatarMedium
  avatar_thumb: AvatarThumb
  aweme_count: number
  aweme_count_correction_threshold: number
  birthday_hide_level: number
  can_set_item_cover: boolean
  can_show_group_card: number
  card_entries: CardEntry[]
  city: null
  close_friend_type: number
  commerce_info: CommerceInfo
  commerce_user_info: CommerceUserInfo
  commerce_user_level: number
  country: string
  cover_and_head_image_info: CoverAndHeadImageInfo
  cover_colour: string
  cover_url: CoverurlElement[]
  custom_verify: string
  district: null
  dongtai_count: number
  dynamic_cover: { [key: string]: any }
  enable_ai_double: number
  enable_wish: boolean
  enterprise_user_info: string
  enterprise_verify_reason: string
  familiar_confidence: number
  favorite_permission: number
  favoriting_count: number
  follow_status: number
  follower_count: number
  follower_request_status: number
  follower_status: number
  following_count: number
  forward_count: number
  gender: null
  general_permission: GeneralPermission
  has_e_account_role: boolean
  has_subscription: boolean
  im_primary_role_id: number
  im_role_ids: number[]
  image_send_exempt: boolean
  ins_id: string
  ip_location: string
  is_activity_user: boolean
  is_ban: boolean
  is_block: boolean
  is_blocked: boolean
  is_effect_artist: boolean
  is_gov_media_vip: boolean
  is_mix_user: boolean
  is_not_show: boolean
  is_series_user: boolean
  is_sharing_profile_user: number
  is_star: boolean
  iso_country_code: string
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
  official_cooperation: OfficialCooperation
  original_musician: OriginalMusician
  pigeon_daren_status: string
  pigeon_daren_warn_tag: string
  profile_show: ProfileShow
  profile_tab_type: number
  province: null
  public_collects_count: number
  publish_landing_tab: number
  r_fans_group_info: { [key: string]: any }
  recommend_reason_relation: string
  recommend_user_reason_source: number
  risk_notice_text: string
  role_id: string
  room_id: number
  room_id_str: string
  school_name: null
  sec_uid: string
  secret: number
  series_count: number
  share_info: ShareInfo
  short_id: string
  show_favorite_list: boolean
  show_subscription: boolean
  signature: string
  signature_display_lines: number
  signature_language: string
  social_real_relation_type: number
  special_follow_status: number
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
  user_age: number
  user_not_see: number
  user_not_show: number
  user_permissions: UserPermission[]
  verification_type: number
  video_cover: { [key: string]: any }
  video_icon: VideoIcon
  watch_status: boolean
  white_cover_url: WhiteCoverurl[]
  with_commerce_enterprise_tab_entry: boolean
  with_commerce_entry: boolean
  with_fusion_shop_entry: boolean
  with_new_goods: boolean
  youtube_channel_id: string
  youtube_channel_title: string;
  [property: string]: any
}

type Avatar168X168 = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type Avatar300X300 = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type AvatarLarger = {
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

type AvatarThumb = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type CardEntry = {
  goto_url?: string
  icon_dark?: IconDark
  icon_light?: IconLight
  sub_title?: string
  title?: string
  type?: number;
  [property: string]: any
}

type IconDark = {
  uri: string
  url_list: string[];
  [property: string]: any
}

type IconLight = {
  uri: string
  url_list: string[];
  [property: string]: any
}

type CommerceInfo = {
  challenge_list: null
  head_image_list: null
  offline_info_list: string[]
  smart_phone_list: null
  task_list: null;
  [property: string]: any
}

type CommerceUserInfo = {
  ad_revenue_rits: null
  has_ads_entry: boolean
  show_star_atlas_cooperation: boolean
  star_atlas: number;
  [property: string]: any
}

type CoverAndHeadImageInfo = {
  cover_list: null
  profile_cover_list: ProfileCoverList[];
  [property: string]: any
}

type ProfileCoverList = {
  cover_url?: ProfileCoverListCoverurl
  dark_cover_color?: string
  light_cover_color?: string;
  [property: string]: any
}

type ProfileCoverListCoverurl = {
  uri: string
  url_list: string[];
  [property: string]: any
}

type CoverurlElement = {
  uri: string
  url_list: string[];
  [property: string]: any
}

type GeneralPermission = {
  following_follower_list_toast: number;
  [property: string]: any
}

type LifeStoryBlock = {
  life_story_block: boolean;
  [property: string]: any
}

type MateRelation = {
  mate_apply_forward: number
  mate_apply_reverse: number
  mate_status: number;
  [property: string]: any
}

type OfficialCooperation = {
  schema: string
  text: string
  track_type: string;
  [property: string]: any
}

type OriginalMusician = {
  digg_count: number
  music_count: number
  music_used_count: number;
  [property: string]: any
}

type ProfileShow = {
  identify_auth_infos: null;
  [property: string]: any
}

type ShareInfo = {
  bool_persist: number
  life_share_ext: string
  share_desc: string
  share_image_url: ShareImageurl
  share_qrcode_url: ShareQrcodeurl
  share_title: string
  share_url: string
  share_weibo_desc: string;
  [property: string]: any
}

type ShareImageurl = {
  uri: string
  url_list: string[];
  [property: string]: any
}

type ShareQrcodeurl = {
  uri: string
  url_list: string[];
  [property: string]: any
}

type TabSettings = {
  private_tab: PrivateTab;
  [property: string]: any
}

type PrivateTab = {
  private_tab_style: number
  show_private_tab: boolean;
  [property: string]: any
}

type UrgeDetail = {
  ctl_map: string
  user_urged: number;
  [property: string]: any
}

type UserPermission = {
  key?: string
  value?: string;
  [property: string]: any
}

type VideoIcon = {
  height: number
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type WhiteCoverurl = {
  uri: string
  url_list: string[];
  [property: string]: any
}
