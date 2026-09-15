// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份响应（amagi 6.6.0）。参数与说明在 corpus/douyin/liveRoomInfo.requests.json 里
//   web_rid  默认值

export type LiveRoomInfo_V0 = {
  data: Data
  extra: Extra3
  status_code: number
  [property: string]: any
}

type Data = {
  auth_cert_info: string
  data: Data2[]
  enter_mode: number
  enter_room_id: string
  partition_road_map: PartitionRoadMap
  qrcode_url: string
  room_status: number
  shark_decision_conf: string
  similar_rooms: SimilarRoom[]
  user: User
  [property: string]: any
}

type Data2 = {
  AnchorABMap: { [property: string]: any }
  admin_user_ids: unknown[]
  admin_user_ids_str: unknown[]
  admin_user_open_ids: unknown[]
  admin_user_open_ids_str: unknown[]
  fansclub_msg_style: number
  follow_msg_style: number
  gift_msg_style: number
  has_commerce_goods: boolean
  id_str: string
  like_count: number
  linker_map: { [property: string]: any }
  live_room_mode: number
  mosaic_status: number
  mosaic_status_str: string
  owner_open_id_str: string
  owner_user_id_str: string
  share_msg_style: number
  status: number
  status_str: string
  title: string
  user_count_str: string
  [property: string]: any
}

type PartitionRoadMap = {
  partition: Partition
  sub_partition: SubPartition
  [property: string]: any
}

type Partition = {
  id_str: string
  title: string
  type: number
  [property: string]: any
}

type SubPartition = {
  partition: Partition
  [property: string]: any
}

type SimilarRoom = {
  cover_type: number
  is_recommend: number
  room: Room
  tag_name: string
  title_type: number
  uniq_id: string
  web_rid: string
  [property: string]: any
}

type Room = {
  AnchorABMap: AnchorABMap
  admin_user_ids: unknown[]
  admin_user_ids_str: unknown[]
  admin_user_open_ids: unknown[]
  admin_user_open_ids_str: unknown[]
  cover: Cover
  ecom_data: EcomData
  fansclub_msg_style: number
  follow_msg_style: number
  game_data: GameData
  gift_msg_style: number
  has_commerce_goods: boolean
  id_str: string
  like_count: number
  linker_detail: LinkerDetail
  linker_map: { [property: string]: any }
  live_room_mode: number
  mosaic_status: number
  mosaic_status_str: string
  others: Others
  owner: Owner
  owner_open_id_str: string
  owner_user_id_str: string
  paid_live_data: PaidLiveData
  preview_expose: PreviewExpose
  room_view_stats: RoomViewStats
  share_msg_style: number
  stats: Stats
  status: number
  status_str: string
  stream_url: StreamUrl
  title: string
  user_count_str: string
  [property: string]: any
}

type AnchorABMap = {
  ab_admin_comment_on_wall: string
  ab_friend_chat: string
  admin_optimize_third: string
  admin_privilege_refine: string
  allow_shared_to_fans: string
  anchor_battle_enable_remote_pk: string
  anchor_battle_frame_bar_anime: string
  anchor_battle_frame_doublepk_bar: string
  anchor_battle_frame_notice_bar_layout: string
  audience_linkmic_continue: string
  audio_1v8_stage_enlarge: string
  audio_double_enlarge_enable: string
  audio_goal_challenge: string
  audio_honor_rank: string
  audio_radio_v2: string
  audio_room_subtitle_opt: string
  battle_match_rebuild_anchor: string
  big_party_enable_open_camera: string
  chat_intercommunicate_multi_anchor: string
  chat_intercommunicate_pk: string
  cross_default_enlarge: string
  cross_link_support_enlarge_guest: string
  cross_room_battle_pop_mode: string
  double_enlarge_enable: string
  ecom_room_disable_gift: string
  enable_enter_by_sharing: string
  enable_link_guest_enter: string
  enable_multi_pk_change_sofa_position: string
  enter_message_tip_relation: string
  enter_source_mark: string
  faction_clash: string
  frequently_chat_ab_value: string
  friend_room_audio_tuning: string
  friend_room_support_ns_mode: string
  friend_share_video_feature_type: string
  game_link_entrance: string
  gift_comment: string
  gift_comment_v2: string
  gift_hide_tip: string
  guest_battle_crown_upgrade: string
  guest_battle_expand: string
  guest_battle_score_expand: string
  guest_battle_upgrade: string
  interact_acting_ab: string
  interact_anchor_guide: string
  ktv_anchor_enable_add_all: string
  ktv_auto_mute_self: string
  ktv_challenge_minus_gift: string
  ktv_component_new_midi: string
  ktv_enable_avatar: string
  ktv_enable_open_camera: string
  ktv_fragment_song: string
  ktv_grab_guide_song: string
  ktv_guide_song_switch: string
  ktv_kick_when_linker_full: string
  ktv_mc_host_show_tag: string
  ktv_new_challenge: string
  ktv_room_atmosphere: string
  ktv_singing_hot_rank: string
  ktv_video_stream_optimize: string
  ktv_want_listen_enable: string
  linkmic_audience_anchor_hide: string
  linkmic_chorus: string
  linkmic_cross_room_battle_double_score: string
  linkmic_multi_chorus: string
  linkmic_order_sing_search_fingerprint: string
  linkmic_order_sing_upgrade: string
  linkmic_position_name_hide: string
  linkmic_starwish: string
  linkmic_team_battle_double_score: string
  linkmic_video_equal_layout_frame_opt: string
  live_anchor_enable_chorus: string
  live_anchor_enable_custom_position: string
  live_anchor_hit_new_audience_linkmic: string
  live_anchor_hit_position_opt: string
  live_anchor_hit_video_bid_paid: string
  live_anchor_hit_video_teamfight: string
  live_answer_on_wall: string
  live_audience_linkmic_pre_apply_v2: string
  live_audio_announce_menu_opt: string
  live_audio_enable_c_position: string
  live_backup_sei_enable: string
  live_dou_plus_enter: string
  live_flymic_interact_switch: string
  live_ktv_enable_beat: string
  live_ktv_group: string
  live_ktv_show_singer_icon: string
  live_ktv_singing_challenge: string
  live_linkmic_battle_optimize: string
  live_linkmic_ktv_anchor_lyric_mode: string
  live_linkmic_order_sing_micro_opt: string
  live_linkmic_order_sing_v3: string
  live_pc_helper_new_layout: string
  live_room_manage_style: string
  live_team_fight_flexible: string
  live_video_enable_c_position: string
  live_video_enable_self_discipline: string
  live_video_host_identity_enable: string
  live_video_share: string
  lonely_room_enter_msg_unfold: string
  mark_user: string
  merge_ktv_mode_enable: string
  merge_ktv_optimize_enable: string
  mic_avatar_tool: string
  multi_link_biz_access_backup_sei_config: string
  opt_audience_linkmic: string
  opt_paid_link_feature_switch: string
  optran_paid_linkmic: string
  order_sing_enable_gift_chorus: string
  order_sing_gold_mic_offline: string
  order_sing_mv: string
  play_mode_opt_24: string
  ps_use_new_panel: string
  radio_prepare_apply: string
  radio_subtitle: string
  room_battle_mode_switch: string
  room_battle_mode_switch_audio: string
  room_battle_video_audio_interconnection: string
  room_double_like: string
  room_secret_chat: string
  self_discipline_v2: string
  self_discipline_v3: string
  social_share_video_adjust_volume: string
  support_multiple_add_price: string
  themed_competition_v2: string
  traffic_strategy: string
  use_lynx_flymic_gift: string
  video_equal_1v8fix_switch: string
  video_ktv_challenge: string
  video_talk_enable_avatar: string
  [property: string]: any
}

type Cover = {
  url_list: string[]
  [property: string]: any
}

type EcomData = {
  float_window_type: number
  instant_type: number
  intro_type: number
  reds_show_infos: unknown[]
  room_cart_v2: RoomCartV2
  route_rule: string
  shop_author_header: string
  [property: string]: any
}

type RoomCartV2 = {
  show_cart: number
  [property: string]: any
}

type GameData = {
  game_tag_info: GameTagInfo
  [property: string]: any
}

type GameTagInfo = {
  game_tag_id: number
  game_tag_name: string
  is_game: number
  [property: string]: any
}

type LinkerDetail = {
  accept_audience_pre_apply: boolean
  big_party_layout_config_version: number
  client_ui_info: string
  enable_audience_linkmic: number
  enlarge_guest_turn_on_source: number
  feature_list: unknown[]
  forbid_apply_from_other: boolean
  function_type: string
  init_source: string
  ktv_exhibit_mode: number
  ktv_lyric_mode: string
  linker_map_str: { [property: string]: any }
  linker_play_modes: unknown[]
  linker_ui_layout: number
  manual_open_ui: number
  playmode_detail: { [property: string]: any }
  [property: string]: any
}

type Others = {
  anonymous_ratio_display_affected: boolean
  labels: Labels
  lvideo_item_id: number
  metric_tracker_data_list: unknown[]
  mosaic_version: number
  panel_guidance: string
  participant_activity: string
  redirect_from: number
  room_chat_guide_locale_city: string
  web_data: WebData
  web_enter_benefit_point_data?: WebEnterBenefitPointData
  web_live_port_optimization: WebLivePortOptimization
  [property: string]: any
}

type Labels = {
  bandwidth_level: BandwidthLevel
  bandwidth_level_double: BandwidthLevel
  brightness: BandwidthLevel
  contrast: BandwidthLevel
  live_room_acu_after_10m: BandwidthLevel
  live_room_acu_after_30m: BandwidthLevel
  live_room_acu_after_5m: BandwidthLevel
  live_room_acu_after_60m: BandwidthLevel
  live_room_duration_after_10m: BandwidthLevel
  live_room_duration_after_30m: BandwidthLevel
  live_room_duration_after_5m: BandwidthLevel
  live_room_duration_after_60m: BandwidthLevel
  live_room_pcu_after_10m: BandwidthLevel
  live_room_pcu_after_30m: BandwidthLevel
  live_room_pcu_after_5m: BandwidthLevel
  live_room_pcu_after_60m: BandwidthLevel
  resolution: BandwidthLevel
  saturation: BandwidthLevel
  sharpness: BandwidthLevel
  [property: string]: any
}

type BandwidthLevel = {
  ttl: number
  value: string
  value_type: number
  [property: string]: any
}

type WebData = {
  additional_stream_url: AdditionalStreamUrl
  [property: string]: any
}

type AdditionalStreamUrl = {
  candidate_resolution: string[]
  complete_push_urls: unknown[]
  default_resolution: string
  extra: Extra
  flv_pull_url: FlvPullUrl
  flv_pull_url_params: FlvPullUrlParams
  hls_pull_url: string
  hls_pull_url_map: FlvPullUrl
  hls_pull_url_params: string
  id: number
  id_str: string
  live_core_sdk_data: LiveCoreSdkData
  multi_stream_scene: number
  play: Play
  provider: number
  pull_datas: { [property: string]: any }
  push_datas: { [property: string]: any }
  push_stream_type: number
  push_urls: unknown[]
  resolution_name: ResolutionName
  resolution_select_panel_resident: number
  rtmp_pull_url: string
  rtmp_pull_url_params: string
  rtmp_push_url: string
  rtmp_push_url_params: string
  rtmps_push_url: string
  stream_control_type: number
  stream_orientation: number
  vr_type: number
  [property: string]: any
}

type Extra = {
  anchor_interact_profile: number
  audience_interact_profile: number
  bframe_enable: boolean
  bitrate_adapt_strategy: number
  business_name: string
  bytevc1_enable: boolean
  default_bitrate: number
  fps: number
  gop_sec: number
  h265_enable: boolean
  hardware_encode: boolean
  height: number
  max_bitrate: number
  min_bitrate: number
  roi: boolean
  sw_roi: boolean
  video_profile: number
  width: number
  [property: string]: any
}

type FlvPullUrl = {
  FULL_HD1: string
  HD1?: string
  SD1: string
  SD2: string
  [property: string]: any
}

type FlvPullUrlParams = {
  FULL_HD1?: string
  HD1?: string
  SD1: string
  SD2: string
  [property: string]: any
}

type LiveCoreSdkData = {
  pull_data: PullData
  push_data: PushData
  size: string
  [property: string]: any
}

type PullData = {
  Flv: Flv[]
  Hls: Flv[]
  codec: string
  compensatory_data: string
  hls_data_unencrypted: { [property: string]: any }
  kind: number
  options: Options
  stream_data: string
  version: number
  [property: string]: any
}

type Flv = {
  params: string
  quality_name: string
  url: string
  [property: string]: any
}

type Options = {
  default_quality: DefaultQuality
  qualities: DefaultQuality[]
  quality_strategy: string
  vpass_default: boolean
  [property: string]: any
}

type DefaultQuality = {
  additional_content: string
  disable: number
  fps: number
  level: number
  name: string
  resolution: string
  sdk_key: string
  v_bit_rate: number
  v_codec: string
  [property: string]: any
}

type PushData = {
  kind: number
  pre_schedule: boolean
  push_params: string
  push_stream_level: number
  resolution_params: { [property: string]: any }
  rtmp_push_url: string
  rtmps_push_url: string
  stream_id: number
  stream_id_str: string
  [property: string]: any
}

type Play = {
  horizontal: string
  vertical: string
  [property: string]: any
}

type ResolutionName = {
  FULL_HD1: string
  HD1: string
  ORIGION: string
  SD1: string
  SD2: string
  [property: string]: any
}

type WebEnterBenefitPointData = {
  has_ongoing_lottery: boolean
  has_ongoing_lucky_money: boolean
  [property: string]: any
}

type WebLivePortOptimization = {
  strategy_config: StrategyConfig
  strategy_extra: string
  [property: string]: any
}

type StrategyConfig = {
  background: Background
  detail: Background
  tab: Background
  [property: string]: any
}

type Background = {
  pause_monitor_duration: string
  strategy_type: number
  use_config_duration: boolean
  [property: string]: any
}

type Owner = {
  avatar_thumb: Cover
  follow_info: FollowInfo
  foreign_user: number
  id_str: string
  nickname: string
  open_id_str: string
  sec_uid: string
  subscribe: Subscribe
  [property: string]: any
}

type FollowInfo = {
  follow_status: number
  follow_status_str: string
  [property: string]: any
}

type Subscribe = {
  buy_type: number
  identity_type: number
  is_member: boolean
  level: number
  open: number
  [property: string]: any
}

type PaidLiveData = {
  anchor_right: number
  delivery: number
  duration: number
  max_preview_duration: number
  need_delivery_notice: boolean
  paid_type: number
  pay_ab_type: number
  privilege_info: { [property: string]: any }
  privilege_info_map: { [property: string]: any }
  view_right: number
  [property: string]: any
}

type PreviewExpose = {
  alive_checker: number
  chat_group_extend_data: unknown[]
  chat_msgs: unknown[]
  et_data: unknown[]
  feed_enter_extra: string
  feed_extra: string
  force_insertion: unknown[]
  is_aweme_video_feed: boolean
  is_preview_use_websocket: number
  message_scroll_after_ms: number
  message_scroll_interval_ms: number
  metas: unknown[]
  need_preload: number
  need_realtime: boolean
  preview_enter_extra: string
  preview_exit_guide_list: unknown[]
  preview_high_light: PreviewHighLight
  preview_intro: string
  relation_info: string
  scroll_after_ms: number
  show_name_abbreviation: number
  show_preview_cards: boolean
  show_similar_feed_button: boolean
  show_uv_pv: number
  style: number
  [property: string]: any
}

type PreviewHighLight = {
  duration: string
  enable: boolean
  guide_text: string
  highlight_id: number
  highlight_id_str: string
  highlight_type: string
  m3u8_url: string
  reason: string
  show_duration: number
  video_id: string
  video_url: string
  [property: string]: any
}

type RoomViewStats = {
  display_long: string
  display_long_anchor: string
  display_middle: string
  display_middle_anchor: string
  display_short: string
  display_short_anchor: string
  display_type: number
  display_value: number
  display_version: number
  incremental: boolean
  is_hidden: boolean
  [property: string]: any
}

type Stats = {
  like_count: number
  total_user_desp: string
  total_user_str: string
  user_count_str: string
  [property: string]: any
}

type StreamUrl = {
  default_resolution: string
  extra: Extra2
  flv_pull_url: FlvPullUrl
  hls_pull_url: string
  hls_pull_url_map: FlvPullUrl
  live_core_sdk_data: LiveCoreSdkData2
  pull_datas: { [property: string]: any }
  stream_orientation: number
  [property: string]: any
}

type Extra2 = {
  anchor_interact_profile: number
  audience_interact_profile: number
  bframe_enable: boolean
  bitrate_adapt_strategy: number
  bytevc1_enable: boolean
  default_bitrate: number
  fps: number
  gop_sec: number
  h265_enable: boolean
  hardware_encode: boolean
  height: number
  max_bitrate: number
  min_bitrate: number
  roi: boolean
  sw_roi: boolean
  video_profile: number
  width: number
  [property: string]: any
}

type LiveCoreSdkData2 = {
  pull_data: PullData2
  [property: string]: any
}

type PullData2 = {
  options: Options2
  stream_data: string
  [property: string]: any
}

type Options2 = {
  default_quality: DefaultQuality
  qualities: unknown[]
  [property: string]: any
}

type User = {
  avatar_thumb: Cover
  follow_info: FollowInfo
  foreign_user: number
  id_str: string
  nickname: string
  open_id_str: string
  sec_uid: string
  [property: string]: any
}

type Extra3 = {
  now: number
  [property: string]: any
}
