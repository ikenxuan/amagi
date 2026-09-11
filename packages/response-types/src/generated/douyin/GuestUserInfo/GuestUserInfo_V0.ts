// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/guestUserInfo.requests.json 里
//   unique_id  变体0

export type GuestUserInfo_V0 = {
  extra: Extra
  is_oversea: number
  status_code: number
  user_info: UserInfo
  [property: string]: any
}

type Extra = {
  logid: string
  now: number
  [property: string]: any
}

type UserInfo = {
  account_cert_info: string
  avatar_medium: AvatarMedium
  avatar_thumb: AvatarMedium
  aweme_count: number
  card_entries: CardEntry[]
  custom_verify: string
  enterprise_verify_reason: string
  favoriting_count: number
  follow_status: number
  followers_detail: null
  following_count: number
  geofencing: null
  mix_info: unknown[]
  mplatform_followers_count: number
  nickname: string
  original_musician: OriginalMusician
  platform_sync_info: null
  policy_version: null
  sec_uid: string
  short_id: string
  show_favorite_list: boolean
  signature: string
  total_favorited: string
  type_label: null
  unique_id: string
  verification_type: number
  [property: string]: any
}

type AvatarMedium = {
  uri: string
  url_list: string[]
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
  url_list: string[]
  [property: string]: any
}

type OriginalMusician = {
  digg_count: number
  music_count: number
  music_used_count: number
  [property: string]: any
}
