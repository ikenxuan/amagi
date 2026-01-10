export type DyUserLiveVideos = {
  data: Data
  extra: UserLiveVideosExtra
  status_code: number;
  [property: string]: any
}

type Data = {
  data: Datum[]
  enter_mode: number
  enter_room_id: string
  extra: DataExtra
  login_lead: LoginLead
  partition_road_map: PartitionRoadMap
  qrcode_url: string
  room_status: number
  shark_decision_conf: string
  similar_rooms: SimilarRoom[]
  user: User
  web_stream_url: WebStreamurl;
  [property: string]: any
}

type Datum = {
  admin_user_ids?: number[]
  admin_user_ids_str?: string[]
  admin_user_open_ids?: string[]
  admin_user_open_ids_str?: string[]
  AnchorABMap?: AnchorABMap
  basis?: Basis
  cover?: DatumCover
  ecom_data?: DatumEcomData
  has_commerce_goods?: boolean
  id_str?: string
  like_count?: number
  linker_detail?: LinkerDetail
  linker_map?: { [key: string]: any }
  live_room_mode?: number
  mosaic_status?: number
  mosaic_status_str?: string
  others?: DatumOthers
  owner?: DatumOwner
  owner_open_id_str?: string
  owner_user_id_str?: string
  paid_live_data?: DatumPaidLiveData
  req_user?: ReqUser
  room_auth?: RoomAuth
  room_cart?: RoomCart
  room_view_stats?: DatumRoomViewStats
  scene_type_info?: SceneTypeInfo
  short_touch_area_config?: ShortTouchAreaConfig
  stats?: DatumStats
  status?: number
  status_str?: string
  stream_url?: DatumStreamurl
  title?: string
  toolbar_data?: ToolbarData
  user_count_str?: string;
  [property: string]: any
}

type AnchorABMap = {
  ab_admin_comment_on_wall: string
  ab_friend_chat: string
  admin_privilege_refine: string
  allow_shared_to_fans: string
  audience_linkmic_continue: string
  audio_double_enlarge_enable: string
  audio_room_subtitle_opt: string
  battle_match_rebuild_anchor: string
  big_party_enable_open_camera: string
  chat_intercommunicate_multi_anchor: string
  chat_intercommunicate_pk: string
  double_enlarge_enable: string
  ecom_room_disable_gift: string
  enable_enter_by_sharing: string
  enable_link_guest_enter: string
  enter_message_tip_relation: string
  enter_source_mark: string
  frequently_chat_ab_value: string
  friend_room_audio_tuning: string
  friend_room_support_ns_mode: string
  friend_share_video_feature_type: string
  game_link_entrance: string
  gift_hide_tip: string
  guest_battle_crown_upgrade: string
  guest_battle_expand: string
  guest_battle_score_expand: string
  guest_battle_upgrade: string
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
  linkmic_multi_chorus: string
  linkmic_order_sing_search_fingerprint: string
  linkmic_order_sing_upgrade: string
  linkmic_starwish: string
  live_anchor_enable_chorus: string
  live_anchor_enable_custom_position: string
  live_anchor_hit_new_audience_linkmic: string
  live_anchor_hit_position_opt: string
  live_anchor_hit_video_bid_paid: string
  live_anchor_hit_video_teamfight: string
  live_answer_on_wall: string
  live_audience_linkmic_pre_apply_v2: string
  live_dou_plus_enter: string
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
  opt_audience_linkmic: string
  opt_paid_link_feature_switch: string
  optran_paid_linkmic: string
  order_sing_mv: string
  play_mode_opt_24: string
  ps_use_new_panel: string
  radio_prepare_apply: string
  room_double_like: string
  self_discipline_v2: string
  self_discipline_v3: string
  social_share_video_adjust_volume: string
  support_multiple_add_price: string
  themed_competition_v2: string
  traffic_strategy: string
  video_equal_1v8fix_switch: string
  video_ktv_challenge: string
  video_talk_enable_avatar: string;
  [property: string]: any
}

type Basis = {
  foreign_user_room: number
  is_customize_audio_room: boolean
  need_request_luckybox: number
  next_ping: number
  secret_room: number;
  [property: string]: any
}

type DatumCover = {
  url_list: string[];
  [property: string]: any
}

type DatumEcomData = {
  instant_type: number
  reds_show_infos: string[];
  [property: string]: any
}

type LinkerDetail = {
  accept_audience_pre_apply: boolean
  big_party_layout_config_version: number
  client_ui_info: string
  enable_audience_linkmic: number
  enlarge_guest_turn_on_source: number
  feature_list: string[]
  forbid_apply_from_other: boolean
  function_type: string
  init_source: string
  ktv_exhibit_mode: number
  ktv_lyric_mode: string
  linker_map_str: { [key: string]: any }
  linker_play_modes: string[]
  linker_ui_layout: number
  manual_open_ui: number
  playmode_detail: { [key: string]: any };
  [property: string]: any
}

type DatumOthers = {
  anchor_together_live: AnchorTogetherLive
  appointment_info: AppointmentInfo
  deco_detail: { [key: string]: any }
  lvideo_item_id: number
  metric_tracker_data_list: string[]
  more_panel_info: MorePanelInfo
  mosaic_version: number
  programme: Programme
  recognition_containers: RecognitionContainers
  web_live_port_optimization: PurpleWebLivePortOptimization
  web_skin: WebSkin;
  [property: string]: any
}

type AnchorTogetherLive = {
  is_show: boolean
  is_together_live: number
  scene: number
  schema_url: string
  title: string
  user_list: string[];
  [property: string]: any
}

type AppointmentInfo = {
  appointment_id: number
  is_subscribe: boolean;
  [property: string]: any
}

type MorePanelInfo = {
  load_strategy: number;
  [property: string]: any
}

type Programme = {
  enable_programme: boolean;
  [property: string]: any
}

type RecognitionContainers = {
  recognition_candidates: string[];
  [property: string]: any
}

type PurpleWebLivePortOptimization = {
  strategy_config: PurpleStrategyConfig
  strategy_extra: string;
  [property: string]: any
}

type PurpleStrategyConfig = {
  background: PurpleBackground
  detail: PurpleDetail
  tab: PurpleTab;
  [property: string]: any
}

type PurpleBackground = {
  pause_monitor_duration: string
  strategy_type: number
  use_config_duration: boolean;
  [property: string]: any
}

type PurpleDetail = {
  pause_monitor_duration: string
  strategy_type: number
  use_config_duration: boolean;
  [property: string]: any
}

type PurpleTab = {
  pause_monitor_duration: string
  strategy_type: number
  use_config_duration: boolean;
  [property: string]: any
}

type WebSkin = {
  enable_skin: boolean;
  [property: string]: any
}

type DatumOwner = {
  avatar_thumb: PurpleAvatarThumb
  follow_info: PurpleFollowInfo
  foreign_user: number
  id_str: string
  nickname: string
  open_id_str: string
  sec_uid: string
  subscribe: PurpleSubscribe;
  [property: string]: any
}

type PurpleAvatarThumb = {
  url_list: string[];
  [property: string]: any
}

type PurpleFollowInfo = {
  follow_status: number
  follow_status_str: string;
  [property: string]: any
}

type PurpleSubscribe = {
  buy_type: number
  identity_type: number
  is_member: boolean
  level: number
  open: number;
  [property: string]: any
}

type DatumPaidLiveData = {
  anchor_right: number
  delivery: number
  duration: number
  max_preview_duration: number
  need_delivery_notice: boolean
  paid_type: number
  pay_ab_type: number
  privilege_info: { [key: string]: any }
  privilege_info_map: { [key: string]: any }
  view_right: number;
  [property: string]: any
}

type ReqUser = {
  enter_user_device_type: number
  user_share_room_score: number;
  [property: string]: any
}

type RoomAuth = {
  AdminCommentWall: number
  AnchorMission: number
  AudioChat: number
  Banner: number
  BulletStyle: number
  CanSellTicket: number
  CastScreen: number
  CastScreenExplicit: number
  Chat: boolean
  Collect: number
  CommentWall: number
  CommerceCard: number
  CommerceComponent: number
  Danmaku: boolean
  DanmakuDefault: number
  Denounce: number
  Digg: boolean
  Dislike: number
  DonationSticker: number
  DouPlus: number
  DouPlusPopularityGem: number
  DownloadVideo: number
  EmojiOutside: number
  EnterEffects: number
  ExpandScreen: number
  FansClub: number
  FansGroup: number
  FirstFeedHistChat: number
  FixedChat: number
  GamePointsPlaying: number
  Gift: boolean
  GiftAnchorMt: number
  Highlights: number
  HourRank: number
  IndustryService: number
  KtvOrderSong: number
  Landscape: number
  LandscapeChat: number
  Like: number
  LongTouch: number
  LuckMoney: boolean
  MissionCenter: number
  MoreAnchor: number
  MoreHistChat: number
  MultiplierPlayback: number
  OnlyTa: number
  POI: boolean
  Poster: number
  Props: boolean
  PublicScreen: number
  QuizGamePointsPlaying: number
  RecordScreen: number
  RoomContributor: boolean
  Seek: number
  Selection: number
  SelectionAlbum: number
  Share: number
  ShowGamePlugin: number
  SpecialStyle: SpecialStyle
  StrokeUpDownGuide: number
  TaskBanner: number
  Teleprompter: number
  TimedShutdown: number
  Topic: number
  TypingCommentState: number
  UpRightStatsFloatingLayer: number
  UserCard: boolean
  UserCorner: number
  VerticalRank: number
  VSGift: number
  VSRank: number
  VSTopic: number;
  [property: string]: any
}

type SpecialStyle = {
  Chat: Chat
  Like: Like;
  [property: string]: any
}

type Chat = {
  AnchorSwitchForPaidLive: number
  Content: string
  ContentForPaidLive: string
  OffType: number
  UnableStyle: number;
  [property: string]: any
}

type Like = {
  AnchorSwitchForPaidLive: number
  Content: string
  ContentForPaidLive: string
  OffType: number
  UnableStyle: number;
  [property: string]: any
}

type RoomCart = {
  cart_icon: string
  contain_cart: boolean
  flash_total: number
  show_cart: number
  total: number;
  [property: string]: any
}

type DatumRoomViewStats = {
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
  is_hidden: boolean;
  [property: string]: any
}

type SceneTypeInfo = {
  commentary_type: boolean
  is_desire_room: number
  is_lasted_goods_room: number
  is_life: boolean
  is_protected_room: number
  is_sub_orientation_vertical_room: number
  is_union_live_room: boolean;
  [property: string]: any
}

type ShortTouchAreaConfig = {
  elements: Elements
  forbidden_types_map: { [key: string]: any }
  strategy_feat_whitelist: string[]
  temp_state_condition_map: TempStateConditionMap
  temp_state_global_condition: TempStateGlobalCondition
  temp_state_strategy: TempStateStrategy;
  [property: string]: any
}

type Elements = {
  1: Elements1
  10: The10
  12: The12
  2: Elements2
  22: The22
  27: The27
  3: Elements3
  30: The30
  4: Elements4
  5: Elements5
  6: Elements6
  7: Elements7
  8: Elements8
  9: The9;
  [property: string]: any
}

type Elements1 = {
  priority: number
  type: number;
  [property: string]: any
}

type The10 = {
  priority: number
  type: number;
  [property: string]: any
}

type The12 = {
  priority: number
  type: number;
  [property: string]: any
}

type Elements2 = {
  priority: number
  type: number;
  [property: string]: any
}

type The22 = {
  priority: number
  type: number;
  [property: string]: any
}

type The27 = {
  priority: number
  type: number;
  [property: string]: any
}

type Elements3 = {
  priority: number
  type: number;
  [property: string]: any
}

type The30 = {
  priority: number
  type: number;
  [property: string]: any
}

type Elements4 = {
  priority: number
  type: number;
  [property: string]: any
}

type Elements5 = {
  priority: number
  type: number;
  [property: string]: any
}

type Elements6 = {
  priority: number
  type: number;
  [property: string]: any
}

type Elements7 = {
  priority: number
  type: number;
  [property: string]: any
}

type Elements8 = {
  priority: number
  type: number;
  [property: string]: any
}

type The9 = {
  priority: number
  type: number;
  [property: string]: any
}

type TempStateConditionMap = {
  1: TempStateConditionMap1
  2: TempStateConditionMap2
  3: TempStateConditionMap3
  4: TempStateConditionMap4
  5: TempStateConditionMap5
  6: TempStateConditionMap6
  7: TempStateConditionMap7;
  [property: string]: any
}

type TempStateConditionMap1 = {
  minimum_gap: number
  type: PurpleType;
  [property: string]: any
}

type PurpleType = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type TempStateConditionMap2 = {
  minimum_gap: number
  type: FluffyType;
  [property: string]: any
}

type FluffyType = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type TempStateConditionMap3 = {
  minimum_gap: number
  type: TentacledType;
  [property: string]: any
}

type TentacledType = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type TempStateConditionMap4 = {
  minimum_gap: number
  type: StickyType;
  [property: string]: any
}

type StickyType = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type TempStateConditionMap5 = {
  minimum_gap: number
  type: IndigoType;
  [property: string]: any
}

type IndigoType = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type TempStateConditionMap6 = {
  minimum_gap: number
  type: IndecentType;
  [property: string]: any
}

type IndecentType = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type TempStateConditionMap7 = {
  minimum_gap: number
  type: HilariousType;
  [property: string]: any
}

type HilariousType = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type TempStateGlobalCondition = {
  allow_count: number
  duration_gap: number
  ignore_strategy_types: number[];
  [property: string]: any
}

type TempStateStrategy = {
  136: The136
  141: The141
  149: The149
  152: The152
  153: The153
  159: The159
  161: The161
  210: The210
  306: The306
  307: The307
  308: The308
  311: The311
  312: The312
  313: The313
  4: TempStateStrategy4
  7: TempStateStrategy7
  8: TempStateStrategy8
  97: The97;
  [property: string]: any
}

type The136 = {
  short_touch_type: number
  strategy_map: The136_StrategyMap;
  [property: string]: any
}

type The136_StrategyMap = {
  1: Purple1
  2: Purple2;
  [property: string]: any
}

type Purple1 = {
  duration: number
  strategy_method: string
  type: AmbitiousType;
  [property: string]: any
}

type AmbitiousType = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Purple2 = {
  duration: number
  strategy_method: string
  type: CunningType;
  [property: string]: any
}

type CunningType = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type The141 = {
  short_touch_type: number
  strategy_map: The141_StrategyMap;
  [property: string]: any
}

type The141_StrategyMap = {
  1: Fluffy1
  2: Fluffy2
  3: Purple3;
  [property: string]: any
}

type Fluffy1 = {
  duration: number
  strategy_method: string
  type: MagentaType;
  [property: string]: any
}

type MagentaType = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Fluffy2 = {
  duration: number
  strategy_method: string
  type: FriskyType;
  [property: string]: any
}

type FriskyType = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Purple3 = {
  duration: number
  strategy_method: string
  type: MischievousType;
  [property: string]: any
}

type MischievousType = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type The149 = {
  short_touch_type: number
  strategy_map: The149_StrategyMap;
  [property: string]: any
}

type The149_StrategyMap = {
  1: Tentacled1
  2: Tentacled2;
  [property: string]: any
}

type Tentacled1 = {
  duration: number
  strategy_method: string
  type: BraggadociousType;
  [property: string]: any
}

type BraggadociousType = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Tentacled2 = {
  duration: number
  strategy_method: string
  type: Type1;
  [property: string]: any
}

type Type1 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type The152 = {
  short_touch_type: number
  strategy_map: The152_StrategyMap;
  [property: string]: any
}

type The152_StrategyMap = {
  1: Sticky1
  2: Sticky2;
  [property: string]: any
}

type Sticky1 = {
  duration: number
  strategy_method: string
  type: Type2;
  [property: string]: any
}

type Type2 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Sticky2 = {
  duration: number
  strategy_method: string
  type: Type3;
  [property: string]: any
}

type Type3 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type The153 = {
  short_touch_type: number
  strategy_map: The153_StrategyMap;
  [property: string]: any
}

type The153_StrategyMap = {
  1: Indigo1
  2: Indigo2
  4: Purple4;
  [property: string]: any
}

type Indigo1 = {
  duration: number
  strategy_method: string
  type: Type4;
  [property: string]: any
}

type Type4 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Indigo2 = {
  duration: number
  strategy_method: string
  type: Type5;
  [property: string]: any
}

type Type5 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Purple4 = {
  duration: number
  strategy_method: string
  type: Type6;
  [property: string]: any
}

type Type6 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type The159 = {
  short_touch_type: number
  strategy_map: The159_StrategyMap;
  [property: string]: any
}

type The159_StrategyMap = {
  1: Indecent1;
  [property: string]: any
}

type Indecent1 = {
  duration: number
  strategy_method: string
  type: Type7;
  [property: string]: any
}

type Type7 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type The161 = {
  short_touch_type: number
  strategy_map: The161_StrategyMap;
  [property: string]: any
}

type The161_StrategyMap = {
  1: Hilarious1
  2: Indecent2;
  [property: string]: any
}

type Hilarious1 = {
  duration: number
  strategy_method: string
  type: Type8;
  [property: string]: any
}

type Type8 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Indecent2 = {
  duration: number
  strategy_method: string
  type: Type9;
  [property: string]: any
}

type Type9 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type The210 = {
  short_touch_type: number
  strategy_map: The210_StrategyMap;
  [property: string]: any
}

type The210_StrategyMap = {
  1: Ambitious1;
  [property: string]: any
}

type Ambitious1 = {
  duration: number
  strategy_method: string
  type: Type10;
  [property: string]: any
}

type Type10 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type The306 = {
  short_touch_type: number
  strategy_map: The306_StrategyMap;
  [property: string]: any
}

type The306_StrategyMap = {
  3: Fluffy3;
  [property: string]: any
}

type Fluffy3 = {
  duration: number
  strategy_method: string
  type: Type11;
  [property: string]: any
}

type Type11 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type The307 = {
  short_touch_type: number
  strategy_map: The307_StrategyMap;
  [property: string]: any
}

type The307_StrategyMap = {
  4: Fluffy4;
  [property: string]: any
}

type Fluffy4 = {
  duration: number
  strategy_method: string
  type: Type12;
  [property: string]: any
}

type Type12 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type The308 = {
  short_touch_type: number
  strategy_map: The308_StrategyMap;
  [property: string]: any
}

type The308_StrategyMap = {
  5: Purple5;
  [property: string]: any
}

type Purple5 = {
  duration: number
  strategy_method: string
  type: Type13;
  [property: string]: any
}

type Type13 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type The311 = {
  short_touch_type: number
  strategy_map: The311_StrategyMap;
  [property: string]: any
}

type The311_StrategyMap = {
  3: Tentacled3;
  [property: string]: any
}

type Tentacled3 = {
  duration: number
  strategy_method: string
  type: Type14;
  [property: string]: any
}

type Type14 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type The312 = {
  short_touch_type: number
  strategy_map: The312_StrategyMap;
  [property: string]: any
}

type The312_StrategyMap = {
  1: Cunning1;
  [property: string]: any
}

type Cunning1 = {
  duration: number
  strategy_method: string
  type: Type15;
  [property: string]: any
}

type Type15 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type The313 = {
  short_touch_type: number
  strategy_map: The313_StrategyMap;
  [property: string]: any
}

type The313_StrategyMap = {
  2: Hilarious2;
  [property: string]: any
}

type Hilarious2 = {
  duration: number
  strategy_method: string
  type: Type16;
  [property: string]: any
}

type Type16 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type TempStateStrategy4 = {
  short_touch_type: number
  strategy_map: The4_StrategyMap;
  [property: string]: any
}

type The4_StrategyMap = {
  1: Magenta1
  2: Ambitious2
  3: Sticky3
  6: Purple6
  7: Purple7;
  [property: string]: any
}

type Magenta1 = {
  duration: number
  strategy_method: string
  type: Type17;
  [property: string]: any
}

type Type17 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Ambitious2 = {
  duration: number
  strategy_method: string
  type: Type18;
  [property: string]: any
}

type Type18 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Sticky3 = {
  duration: number
  strategy_method: string
  type: Type19;
  [property: string]: any
}

type Type19 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Purple6 = {
  duration: number
  strategy_method: string
  type: Type20;
  [property: string]: any
}

type Type20 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Purple7 = {
  duration: number
  strategy_method: string
  type: Type21;
  [property: string]: any
}

type Type21 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type TempStateStrategy7 = {
  short_touch_type: number
  strategy_map: The7_StrategyMap;
  [property: string]: any
}

type The7_StrategyMap = {
  1: Frisky1
  2: Cunning2
  3: Indigo3
  4: Tentacled4
  5: Fluffy5
  6: Fluffy6;
  [property: string]: any
}

type Frisky1 = {
  duration: number
  strategy_method: string
  type: Type22;
  [property: string]: any
}

type Type22 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Cunning2 = {
  duration: number
  strategy_method: string
  type: Type23;
  [property: string]: any
}

type Type23 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Indigo3 = {
  duration: number
  strategy_method: string
  type: Type24;
  [property: string]: any
}

type Type24 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Tentacled4 = {
  duration: number
  strategy_method: string
  type: Type25;
  [property: string]: any
}

type Type25 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Fluffy5 = {
  duration: number
  strategy_method: string
  type: Type26;
  [property: string]: any
}

type Type26 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Fluffy6 = {
  duration: number
  strategy_method: string
  type: Type27;
  [property: string]: any
}

type Type27 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type TempStateStrategy8 = {
  short_touch_type: number
  strategy_map: The8_StrategyMap;
  [property: string]: any
}

type The8_StrategyMap = {
  1: Mischievous1
  2: Magenta2;
  [property: string]: any
}

type Mischievous1 = {
  duration: number
  strategy_method: string
  type: Type28;
  [property: string]: any
}

type Type28 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Magenta2 = {
  duration: number
  strategy_method: string
  type: Type29;
  [property: string]: any
}

type Type29 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type The97 = {
  short_touch_type: number
  strategy_map: The97_StrategyMap;
  [property: string]: any
}

type The97_StrategyMap = {
  1: Braggadocious1
  2: Frisky2
  3: Indecent3
  5: Tentacled5
  6: Tentacled6
  7: Fluffy7;
  [property: string]: any
}

type Braggadocious1 = {
  duration: number
  strategy_method: string
  type: Type30;
  [property: string]: any
}

type Type30 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Frisky2 = {
  duration: number
  strategy_method: string
  type: Type31;
  [property: string]: any
}

type Type31 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Indecent3 = {
  duration: number
  strategy_method: string
  type: Type32;
  [property: string]: any
}

type Type32 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Tentacled5 = {
  duration: number
  strategy_method: string
  type: Type33;
  [property: string]: any
}

type Type33 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Tentacled6 = {
  duration: number
  strategy_method: string
  type: Type34;
  [property: string]: any
}

type Type34 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type Fluffy7 = {
  duration: number
  strategy_method: string
  type: Type35;
  [property: string]: any
}

type Type35 = {
  priority: number
  strategy_type: number;
  [property: string]: any
}

type DatumStats = {
  like_count: number
  total_user_desp: string
  total_user_str: string
  user_count_str: string;
  [property: string]: any
}

type DatumStreamurl = {
  default_resolution: string
  extra: PurpleExtra
  flv_pull_url: PurpleFlvPullurl
  hls_pull_url: string
  hls_pull_url_map: PurplehlsPullurlMap
  live_core_sdk_data: PurpleLiveCoresdkData
  pull_datas: { [key: string]: any }
  stream_orientation: number;
  [property: string]: any
}

type PurpleExtra = {
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
  width: number;
  [property: string]: any
}

type PurpleFlvPullurl = {
  FULL_HD1: string
  SD1: string
  SD2: string;
  [property: string]: any
}

type PurplehlsPullurlMap = {
  FULL_HD1: string
  SD1: string
  SD2: string;
  [property: string]: any
}

type PurpleLiveCoresdkData = {
  pull_data: PurplePullData;
  [property: string]: any
}

type PurplePullData = {
  options: PurpleOptions
  stream_data: string;
  [property: string]: any
}

type PurpleOptions = {
  default_quality: PurpleDefaultQuality
  qualities: PurpleQuality[];
  [property: string]: any
}

type PurpleDefaultQuality = {
  additional_content: string
  disable: number
  fps: number
  level: number
  name: string
  resolution: string
  sdk_key: string
  v_bit_rate: number
  v_codec: string;
  [property: string]: any
}

type PurpleQuality = {
  additional_content: string
  disable: number
  fps: number
  level: number
  name: string
  resolution: string
  sdk_key: string
  v_bit_rate: number
  v_codec: string;
  [property: string]: any
}

type ToolbarData = {
  entrance_list: EntranceList[]
  extra_info: ExtraInfo
  landscape_up_right: string[]
  max_entrance_cnt: number
  max_entrance_cnt_landscape: number
  more_panel: MorePanel[]
  permutation: Permutation
  skin_resource: { [key: string]: any };
  [property: string]: any
}

type EntranceList = {
  component_type: number
  data_status: number
  extra: string
  group_id: number
  icon: Icon
  op_type: number
  schema_url: string
  show_type: number
  text: string;
  [property: string]: any
}

type Icon = {
  avg_color: string
  flex_setting_list: string[]
  height: number
  image_type: number
  is_animated: boolean
  open_web_url: string
  text_setting_list: string[]
  uri: string
  url_list: string[]
  width: number;
  [property: string]: any
}

type ExtraInfo = {
  game_promotion_coexist: number;
  [property: string]: any
}

type MorePanel = {
  component_type: number
  data_status: number
  extra: string
  group_id: number
  op_type: number
  schema_url: string
  show_type: number
  text: string;
  [property: string]: any
}

type Permutation = {
  general: General
  on_demand_component_list: string[];
  [property: string]: any
}

type General = {
  ComponentSequence: number[]
  GroupPriority: number[];
  [property: string]: any
}

type DataExtra = {
  digg_color: string
  is_official_channel: boolean
  pay_scores: string
  signature: string;
  [property: string]: any
}

type LoginLead = {
  is_login: boolean
  items: { [key: string]: any }
  level: number;
  [property: string]: any
}

type PartitionRoadMap = {
  partition: PartitionRoadMapPartition
  sub_partition: SubPartition;
  [property: string]: any
}

type PartitionRoadMapPartition = {
  id_str: string
  title: string
  type: number;
  [property: string]: any
}

type SubPartition = {
  partition: SubPartitionPartition;
  [property: string]: any
}

type SubPartitionPartition = {
  id_str: string
  title: string
  type: number;
  [property: string]: any
}

type SimilarRoom = {
  cover_type: number
  is_recommend: number
  room: Room
  tag_name: string
  title_type: number
  uniq_id: string
  web_rid: string;
  [property: string]: any
}

type Room = {
  admin_user_ids: string[]
  admin_user_ids_str: string[]
  admin_user_open_ids: string[]
  admin_user_open_ids_str: string[]
  AnchorABMap: { [key: string]: any }
  cover: RoomCover
  ecom_data: RoomEcomData
  has_commerce_goods: boolean
  id_str: string
  like_count: number
  linker_map: { [key: string]: any }
  live_room_mode: number
  mosaic_status: number
  mosaic_status_str: string
  others: RoomOthers
  owner: RoomOwner
  owner_open_id_str: string
  owner_user_id_str: string
  paid_live_data: RoomPaidLiveData
  room_view_stats: RoomRoomViewStats
  stats: RoomStats
  status: number
  status_str: string
  stream_url: RoomStreamurl
  title: string
  user_count_str: string;
  [property: string]: any
}

type RoomCover = {
  url_list: string[];
  [property: string]: any
}

type RoomEcomData = {
  instant_type: number
  reds_show_infos: string[]
  room_cart_v2: RoomCartV2;
  [property: string]: any
}

type RoomCartV2 = {
  show_cart: number;
  [property: string]: any
}

type RoomOthers = {
  lvideo_item_id: number
  metric_tracker_data_list: string[]
  mosaic_version: number
  web_data: WebData
  web_live_port_optimization: FluffyWebLivePortOptimization;
  [property: string]: any
}

type WebData = {
  additional_stream_url: AdditionalStreamurl;
  [property: string]: any
}

type AdditionalStreamurl = {
  candidate_resolution: string[]
  complete_push_urls: string[]
  default_resolution: string
  extra: AdditionalStreamurlExtra
  flv_pull_url: AdditionalStreamurlFlvPullurl
  flv_pull_url_params: FlvPullurlParams
  hls_pull_url: string
  hls_pull_url_map: AdditionalStreamurlhlsPullurlMap
  hls_pull_url_params: string
  id: number
  id_str: string
  live_core_sdk_data: AdditionalStreamurlLiveCoresdkData
  play: Play
  provider: number
  pull_datas: AdditionalStreamurlPullDatas
  push_datas: { [key: string]: any }
  push_stream_type: number
  push_urls: string[]
  resolution_name: ResolutionName
  rtmp_pull_url: string
  rtmp_pull_url_params: string
  rtmp_push_url: string
  rtmp_push_url_params: string
  stream_control_type: number
  stream_orientation: number
  vr_type: number;
  [property: string]: any
}

type AdditionalStreamurlExtra = {
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
  width: number;
  [property: string]: any
}

type AdditionalStreamurlFlvPullurl = {
  FULL_HD1: string
  HD1: string
  SD1: string
  SD2: string;
  [property: string]: any
}

type FlvPullurlParams = {
  FULL_HD1: string
  HD1: string
  SD1: string
  SD2: string;
  [property: string]: any
}

type AdditionalStreamurlhlsPullurlMap = {
  FULL_HD1: string
  HD1: string
  SD1: string
  SD2: string;
  [property: string]: any
}

type AdditionalStreamurlLiveCoresdkData = {
  pull_data: FluffyPullData
  push_data: PushData
  size: string;
  [property: string]: any
}

type FluffyPullData = {
  codec: string
  compensatory_data: string
  Flv: PullDataFlv[]
  Hls: PullDataHl[]
  hls_data_unencrypted: { [key: string]: any }
  kind: number
  options: FluffyOptions
  stream_data: string
  version: number;
  [property: string]: any
}

type PullDataFlv = {
  params: string
  quality_name: string
  url: string;
  [property: string]: any
}

type PullDataHl = {
  params: string
  quality_name: string
  url: string;
  [property: string]: any
}

type FluffyOptions = {
  default_quality: FluffyDefaultQuality
  qualities: FluffyQuality[]
  vpass_default: boolean;
  [property: string]: any
}

type FluffyDefaultQuality = {
  additional_content: string
  disable: number
  fps: number
  level: number
  name: string
  resolution: string
  sdk_key: string
  v_bit_rate: number
  v_codec: string;
  [property: string]: any
}

type FluffyQuality = {
  additional_content: string
  disable: number
  fps: number
  level: number
  name: string
  resolution: string
  sdk_key: string
  v_bit_rate: number
  v_codec: string;
  [property: string]: any
}

type PushData = {
  kind: number
  pre_schedule: boolean
  push_params: string
  push_stream_level: number
  resolution_params: { [key: string]: any }
  rtmp_push_url: string
  stream_id: number
  stream_id_str: string;
  [property: string]: any
}

type Play = {
  horizontal: string
  vertical: string;
  [property: string]: any
}

type AdditionalStreamurlPullDatas = {
  '7466360588449647386': Purple7466360588449647386;
  [property: string]: any
}

type Purple7466360588449647386 = {
  codec: string
  compensatory_data: string
  extension: PurpleExtension
  Flv: The7466360588449647386_Flv[]
  Hls: The7466360588449647386_Hl[]
  hls_data_unencrypted: { [key: string]: any }
  kind: number
  options: TentacledOptions
  stream_data: string
  version: number;
  [property: string]: any
}

type The7466360588449647386_Flv = {
  params: string
  quality_name: string
  url: string;
  [property: string]: any
}

type The7466360588449647386_Hl = {
  params: string
  quality_name: string
  url: string;
  [property: string]: any
}

type PurpleExtension = {
  camera_clip: PurpleCameraClip
  camera_clip_custom: CameraClipCustom
  camera_hidden: number
  camera_horizontal_hidden: number
  camera_horizontal_position: CameraHorizontalPosition
  camera_horizontal_type: number
  camera_vertical_type: number
  display_mode: number
  game_clip: PurpleGameClip
  game_hidden: number
  game_room_id: string
  layout: number
  refresh: number
  ts: string;
  [property: string]: any
}

type PurpleCameraClip = {
  h: number
  w: number
  x: number
  y: number;
  [property: string]: any
}

type CameraClipCustom = {
  h: number
  w: number
  x: number
  y: number;
  [property: string]: any
}

type CameraHorizontalPosition = {
  anchor: number
  h: number
  w: number
  x: number
  y: number;
  [property: string]: any
}

type PurpleGameClip = {
  h: number
  w: number
  x: number
  y: number;
  [property: string]: any
}

type TentacledOptions = {
  default_quality: TentacledDefaultQuality
  qualities: TentacledQuality[]
  vpass_default: boolean;
  [property: string]: any
}

type TentacledDefaultQuality = {
  additional_content: string
  disable: number
  fps: number
  level: number
  name: string
  resolution: string
  sdk_key: string
  v_bit_rate: number
  v_codec: string;
  [property: string]: any
}

type TentacledQuality = {
  additional_content: string
  disable: number
  fps: number
  level: number
  name: string
  resolution: string
  sdk_key: string
  v_bit_rate: number
  v_codec: string;
  [property: string]: any
}

type ResolutionName = {
  FULL_HD1: string
  HD1: string
  ORIGION: string
  SD1: string
  SD2: string;
  [property: string]: any
}

type FluffyWebLivePortOptimization = {
  strategy_config: FluffyStrategyConfig
  strategy_extra: string;
  [property: string]: any
}

type FluffyStrategyConfig = {
  background: FluffyBackground
  detail: FluffyDetail
  tab: FluffyTab;
  [property: string]: any
}

type FluffyBackground = {
  pause_monitor_duration: string
  strategy_type: number
  use_config_duration: boolean;
  [property: string]: any
}

type FluffyDetail = {
  pause_monitor_duration: string
  strategy_type: number
  use_config_duration: boolean;
  [property: string]: any
}

type FluffyTab = {
  pause_monitor_duration: string
  strategy_type: number
  use_config_duration: boolean;
  [property: string]: any
}

type RoomOwner = {
  avatar_thumb: FluffyAvatarThumb
  follow_info: FluffyFollowInfo
  foreign_user: number
  id_str: string
  nickname: string
  open_id_str: string
  sec_uid: string
  subscribe: FluffySubscribe;
  [property: string]: any
}

type FluffyAvatarThumb = {
  url_list: string[];
  [property: string]: any
}

type FluffyFollowInfo = {
  follow_status: number
  follow_status_str: string;
  [property: string]: any
}

type FluffySubscribe = {
  buy_type: number
  identity_type: number
  is_member: boolean
  level: number
  open: number;
  [property: string]: any
}

type RoomPaidLiveData = {
  anchor_right: number
  delivery: number
  duration: number
  max_preview_duration: number
  need_delivery_notice: boolean
  paid_type: number
  pay_ab_type: number
  privilege_info: { [key: string]: any }
  privilege_info_map: { [key: string]: any }
  view_right: number;
  [property: string]: any
}

type RoomRoomViewStats = {
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
  is_hidden: boolean;
  [property: string]: any
}

type RoomStats = {
  like_count: number
  total_user_desp: string
  total_user_str: string
  user_count_str: string;
  [property: string]: any
}

type RoomStreamurl = {
  default_resolution: string
  extra: FluffyExtra
  flv_pull_url: FluffyFlvPullurl
  hls_pull_url: string
  hls_pull_url_map: FluffyhlsPullurlMap
  live_core_sdk_data: FluffyLiveCoresdkData
  pull_datas: StreamurlPullDatas
  stream_orientation: number;
  [property: string]: any
}

type FluffyExtra = {
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
  width: number;
  [property: string]: any
}

type FluffyFlvPullurl = {
  FULL_HD1: string
  HD1: string
  SD1: string
  SD2: string;
  [property: string]: any
}

type FluffyhlsPullurlMap = {
  FULL_HD1: string
  HD1: string
  SD1: string
  SD2: string;
  [property: string]: any
}

type FluffyLiveCoresdkData = {
  pull_data: TentacledPullData;
  [property: string]: any
}

type TentacledPullData = {
  options: StickyOptions
  stream_data: string;
  [property: string]: any
}

type StickyOptions = {
  default_quality: StickyDefaultQuality
  qualities: string[];
  [property: string]: any
}

type StickyDefaultQuality = {
  additional_content: string
  disable: number
  fps: number
  level: number
  name: string
  resolution: string
  sdk_key: string
  v_bit_rate: number
  v_codec: string;
  [property: string]: any
}

type StreamurlPullDatas = {
  '7466360588449647386': Fluffy7466360588449647386;
  [property: string]: any
}

type Fluffy7466360588449647386 = {
  extension: FluffyExtension
  options: IndigoOptions
  stream_data: string;
  [property: string]: any
}

type FluffyExtension = {
  camera_clip: FluffyCameraClip
  camera_hidden: number
  display_mode: number
  game_clip: FluffyGameClip
  game_hidden: number
  game_room_id: string
  refresh: number
  ts: string;
  [property: string]: any
}

type FluffyCameraClip = {
  h: number
  w: number
  x: number
  y: number;
  [property: string]: any
}

type FluffyGameClip = {
  h: number
  w: number
  x: number
  y: number;
  [property: string]: any
}

type IndigoOptions = {
  default_quality: IndigoDefaultQuality
  qualities: StickyQuality[];
  [property: string]: any
}

type IndigoDefaultQuality = {
  additional_content: string
  disable: number
  fps: number
  level: number
  name: string
  resolution: string
  sdk_key: string
  v_bit_rate: number
  v_codec: string;
  [property: string]: any
}

type StickyQuality = {
  additional_content: string
  disable: number
  fps: number
  level: number
  name: string
  resolution: string
  sdk_key: string
  v_bit_rate: number
  v_codec: string;
  [property: string]: any
}

type User = {
  avatar_thumb: UserAvatarThumb
  follow_info: UserFollowInfo
  foreign_user: number
  id_str: string
  nickname: string
  open_id_str: string
  sec_uid: string;
  [property: string]: any
}

type UserAvatarThumb = {
  url_list: string[];
  [property: string]: any
}

type UserFollowInfo = {
  follow_status: number
  follow_status_str: string;
  [property: string]: any
}

type WebStreamurl = {
  default_resolution: string
  flv_pull_url: { [key: string]: any }
  hls_pull_url: string
  hls_pull_url_map: { [key: string]: any }
  pull_datas: { [key: string]: any }
  stream_orientation: number;
  [property: string]: any
}

type UserLiveVideosExtra = {
  now: number;
  [property: string]: any
}
