// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：2 份样本（amagi 6.6.0）。样本不进 git，在本地 corpus/ 里
//   af6c415067d4  2026-09-04  oid / type
//   b2d19034c82e  2026-09-04  number / oid / type

/** 评论区一页。**寻址靠 `oid` + `type` 两个参数**：`type=1` 表示评论区挂在视频稿件上，此时 `oid` 就是稿件的 `aid`（不是 `bvid`）。其它 `type` 对应专栏、动态等，各自的 `oid` 含义不同。 */
export type Comments_V0 = {
  code: number
  data: Data
  /** 平台错误文案，成功时是 `"0"`。 */
  message: string
  ttl: number
  [property: string]: any
}

type Data = {
  assist: number
  blacklist: number
  /** 本轮样本里恒为 `null`，所以生成的类型只能是 `null`。**这是欠采样而不是平台约定** —— 报告里作为 needsDecision 项报过。 */
  callbacks: null
  config: Config
  control: Control
  cursor: Cursor
  effects: Effects
  note: number
  /** 本页的根评论。楼中楼在每条根评论自己的 `replies` 里，**但只带前几条** —— 要完整的得拿 `rpid` 去请求 `commentReplies`。 */
  replies: Reply[]
  top: Top
  top_replies: unknown[]
  upper: Upper
  vote: number
  [property: string]: any
}

type Config = {
  read_only: boolean
  show_up_flag: boolean
  showtopic: number
  [property: string]: any
}

type Control = {
  answer_guide_android_url: string
  answer_guide_icon_url: string
  answer_guide_ios_url: string
  answer_guide_text: string
  bg_text: string
  child_input_text: string
  disable_jump_emote: boolean
  empty_page: null
  enable_charged: boolean
  enable_cm_biz_helper: boolean
  giveup_input_text: string
  input_disable: boolean
  preload_resources: null
  root_input_text: string
  screenshot_icon_state: number
  show_text: string
  show_type: number
  upload_picture_icon_state: number
  web_selection: boolean
  [property: string]: any
}

type Cursor = {
  all_count: number
  is_begin: boolean
  /** 还有没有下一页。翻页要靠它而不是「本页条数少于请求条数」。 */
  is_end: boolean
  mode: number
  mode_text: string
  name: string
  next: number
  pagination_reply: PaginationReply
  prev: number
  session_id: string
  support_mode: number[]
  [property: string]: any
}

type PaginationReply = {
  next_offset: string
  [property: string]: any
}

type Effects = {
  preloading: string
  [property: string]: any
}

type Reply = {
  action: number
  assist: number
  attr: number
  content: Content
  count: number
  ctime: number
  dialog: number
  dialog_str: string
  dynamic_id_str: string
  fansgrade: number
  folder: Folder
  invisible: boolean
  like: number
  member: Member
  mid: number
  mid_str: string
  note_cvid_str: string
  oid: number
  oid_str: string
  /** 父评论的 `rpid`，根评论是 0。 */
  parent: number
  parent_str: string
  rcount: number
  replies: Reply2[]
  reply_control: ReplyControl2
  /** 所属根评论的 `rpid`，根评论自己是 0。 */
  root: number
  root_str: string
  /** 评论 ID。**它就是 `commentReplies` 的 `root` 参数** —— 依赖图那条边取的正是这个路径。 */
  rpid: number
  rpid_str: string
  state: number
  track_info: string
  type: number
  up_action: UpAction
  [property: string]: any
}

type Content = {
  emote?: Emote
  /** 正文里被识别成链接的片段 → 跳转信息。**键是数据**（被匹配到的文本本身），不是字段名。 */
  jump_url: JumpUrl
  max_line: number
  members: unknown[]
  /** 评论正文，**用户内容**。脱敏按 `name` 策略换掉 —— 顶层那个 `message` 是平台文案、要留着，两者靠路径白名单区分。 */
  message: string
  [property: string]: any
}

type Emote = {
  '[大哭]'?: Anonymous
  '[笑哭]'?: Anonymous
  [property: string]: any
}

type Anonymous = {
  attr: number
  id: number
  jump_title: string
  meta: Meta
  mtime: number
  package_id: number
  state: number
  text: string
  type: number
  url: string
  [property: string]: any
}

type Meta = {
  size: number
  suggest: string[]
  [property: string]: any
}

type JumpUrl = {
  av2?: Av2
  av7?: Av2
  bv?: Bv
  test?: Bv
  '月の眷属達カラオケ'?: Bv
  [property: string]: any
}

type Av2 = {
  app_name: string
  app_package_name: string
  app_url_schema: string
  click_report: string
  exposure_report: string
  icon_position: number
  is_half_screen: boolean
  match_once: boolean
  pc_url: string
  prefix_icon: string
  state: number
  title: string
  underline: boolean
  [property: string]: any
}

type Bv = {
  app_name: string
  app_package_name: string
  app_url_schema: string
  click_report: string
  exposure_report: string
  extra: Extra
  icon_position: number
  is_half_screen: boolean
  match_once: boolean
  pc_url: string
  prefix_icon: string
  state: number
  title: string
  underline: boolean
  [property: string]: any
}

type Extra = {
  goods_click_report: string
  goods_cm_control: number
  goods_exposure_report: string
  goods_show_type: number
  is_word_search: boolean
  [property: string]: any
}

type Folder = {
  has_folded: boolean
  is_folded: boolean
  rule: string
  [property: string]: any
}

type Member = {
  avatar: string
  avatar_item: AvatarItem
  contract_desc: string
  face_nft_new: number
  /** 粉丝勋章。没有勋章时是 `null` —— 手写类型只见过 null 那一次，于是把它声明成了 `null`，这是生成器比手写更准的一处。 */
  fans_detail: FansDetail | null
  handle: string
  is_contractor: boolean
  is_senior_member: number
  level_info: LevelInfo
  /** 评论者 UID。同一份样本里它与 `mid_str` 换完仍然相等（脱敏的一致性映射保证）。 */
  mid: string
  nameplate: Nameplate
  nft_interaction: null
  official_verify: OfficialVerify
  pendant: Pendant
  rank: string
  senior: Senior
  sex: string
  sign: string
  uname: string
  user_sailing: UserSailing
  user_sailing_v2: UserSailingV2
  vip: Vip
  [property: string]: any
}

type AvatarItem = {
  container_size: ContainerSize
  fallback_layers: FallbackLayers
  mid: string
  [property: string]: any
}

type ContainerSize = {
  height: number
  width: number
  [property: string]: any
}

type FallbackLayers = {
  is_critical_group: boolean
  layers: Layer[]
  [property: string]: any
}

type Layer = {
  general_spec: GeneralSpec
  layer_config: LayerConfig
  resource: Resource
  visible: boolean
  [property: string]: any
}

type GeneralSpec = {
  pos_spec: PosSpec
  render_spec: RenderSpec
  size_spec: ContainerSize
  [property: string]: any
}

type PosSpec = {
  axis_x: number
  axis_y: number
  coordinate_pos: number
  [property: string]: any
}

type RenderSpec = {
  opacity: number
  [property: string]: any
}

type LayerConfig = {
  is_critical?: boolean
  layer_mask?: LayerMask
  tags: Tags
  [property: string]: any
}

type LayerMask = {
  general_spec: GeneralSpec
  mask_src: MaskSrc
  [property: string]: any
}

type MaskSrc = {
  draw: Draw
  src_type: number
  [property: string]: any
}

type Draw = {
  color_config: ColorConfig
  draw_type: number
  fill_mode: number
  [property: string]: any
}

type ColorConfig = {
  day: Day
  [property: string]: any
}

type Day = {
  argb: string
  [property: string]: any
}

type Tags = {
  AVATAR_LAYER?: { [property: string]: any }
  ICON_LAYER?: { [property: string]: any }
  PENDENT_LAYER?: { [property: string]: any }
  [property: string]: any
}

type Resource = {
  res_animation?: ResAnimation
  res_image?: ResImage
  res_native_draw?: ResNativeDraw
  res_type: number
  [property: string]: any
}

type ResAnimation = {
  webp_src: WebpSrc
  [property: string]: any
}

type WebpSrc = {
  remote: Remote
  src_type: number
  [property: string]: any
}

type Remote = {
  bfs_style: string
  url: string
  [property: string]: any
}

type ResImage = {
  image_src: ImageSrc
  [property: string]: any
}

type ImageSrc = {
  local?: number
  placeholder?: number
  remote?: Remote
  src_type: number
  [property: string]: any
}

type ResNativeDraw = {
  draw_src: DrawSrc
  [property: string]: any
}

type DrawSrc = {
  draw: Draw2
  src_type: number
  [property: string]: any
}

type Draw2 = {
  color_config: ColorConfig2
  draw_type: number
  fill_mode: number
  [property: string]: any
}

type ColorConfig2 = {
  day: Day
  is_dark_mode_aware: boolean
  night: Day
  [property: string]: any
}

type FansDetail = {
  guard_icon: string
  guard_level: number
  honor_icon: string
  intimacy: number
  is_receive: number
  level: number
  master_status: number
  medal_color: number
  medal_color_border: number
  medal_color_end: number
  medal_color_level: number
  medal_color_name: number
  medal_id: number
  medal_level_bg_color: number
  medal_name: string
  score: number
  uid: number
  [property: string]: any
}

type LevelInfo = {
  current_exp: number
  current_level: number
  current_min: number
  next_exp: number
  [property: string]: any
}

type Nameplate = {
  condition: string
  image: string
  image_small: string
  level: string
  name: string
  nid: number
  [property: string]: any
}

type OfficialVerify = {
  desc: string
  type: number
  [property: string]: any
}

type Pendant = {
  expire: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  n_pid: number
  name: string
  pid: number
  [property: string]: any
}

type Senior = {
  status?: number
  [property: string]: any
}

type UserSailing = {
  cardbg: Cardbg | null
  cardbg_with_focus: null
  pendant: Pendant2 | null
  [property: string]: any
}

type Cardbg = {
  fan: Fan
  id: number
  image: string
  image_group: null
  jump_url: string
  name: string
  type: string
  [property: string]: any
}

type Fan = {
  color: string
  color_format: ColorFormat
  is_fan: number
  name: string
  num_desc: string
  num_prefix: string
  number: number
  [property: string]: any
}

type ColorFormat = {
  colors: string[]
  end_point: string
  gradients: number[]
  start_point: string
  [property: string]: any
}

type Pendant2 = {
  id: number
  image: string
  image_enhance: string
  image_enhance_frame: string
  jump_url: string
  name: string
  type: string
  [property: string]: any
}

type UserSailingV2 = {
  card_bg?: CardBg
  pendant?: Pendant3
  [property: string]: any
}

type CardBg = {
  fan: Fan2
  id: number
  image: string
  jump_url: string
  name: string
  type: string
  [property: string]: any
}

type Fan2 = {
  color: string
  color_format: ColorFormat
  is_fan: number
  name?: string
  num_desc: string
  num_prefix: string
  number: number
  [property: string]: any
}

type Pendant3 = {
  id: number
  image: string
  image_enhance: string
  image_enhance_frame?: string
  name: string
  type?: string
  [property: string]: any
}

type Vip = {
  accessStatus: number
  avatar_subscript: number
  dueRemark: string
  label: Label
  nickname_color: string
  themeType: number
  vipDueDate: number
  vipStatus: number
  vipStatusWarn: string
  vipType: number
  [property: string]: any
}

type Label = {
  bg_color: string
  bg_style: number
  border_color: string
  img_label_uri_hans: string
  img_label_uri_hans_static: string
  img_label_uri_hant: string
  img_label_uri_hant_static: string
  img_label_uri_i18n: string
  img_label_uri_i18n_static: string
  label_goto: LabelGoto | null
  label_id: number
  label_theme: string
  label_type: number
  path: string
  text: string
  text_color: string
  use_img_label: boolean
  [property: string]: any
}

type LabelGoto = {
  mobile: string
  pc_web: string
  [property: string]: any
}

type Reply2 = {
  action: number
  assist: number
  attr: number
  content: Content2
  count: number
  ctime: number
  dialog: number
  dialog_str: string
  dynamic_id_str: string
  fansgrade: number
  folder: Folder
  invisible: boolean
  like: number
  member: Member2
  mid: number
  mid_str: string
  note_cvid_str: string
  oid: number
  oid_str: string
  parent: number
  parent_reply_member?: ParentReplyMember
  parent_str: string
  rcount: number
  replies: null
  reply_control: ReplyControl
  root: number
  root_str: string
  rpid: number
  rpid_str: string
  state: number
  track_info: string
  type: number
  up_action: UpAction
  [property: string]: any
}

type Content2 = {
  emote?: Emote2
  jump_url: JumpUrl2
  max_line: number
  members: unknown[]
  message: string
  [property: string]: any
}

type Emote2 = {
  '[doge]'?: Anonymous
  '[哦呼]'?: Anonymous
  '[大哭]'?: Anonymous
  '[大笑]'?: Anonymous
  '[无语]'?: Anonymous
  [property: string]: any
}

type JumpUrl2 = {
  BV1xx411c7mD?: Av2
  av170001?: Av2
  av2?: Av2
  av99999999?: Av2
  [property: string]: any
}

type Member2 = {
  avatar: string
  avatar_item: AvatarItem2
  contract_desc: string
  face_nft_new: number
  fans_detail: null
  handle: string
  is_contractor: boolean
  is_senior_member: number
  level_info: LevelInfo
  mid: string
  nameplate: Nameplate
  nft_interaction: NftInteraction | null
  official_verify: OfficialVerify
  pendant: Pendant
  rank: string
  senior: Senior
  sex: string
  sign: string
  uname: string
  user_sailing: UserSailing2 | null
  user_sailing_v2?: UserSailingV22
  vip: Vip
  [property: string]: any
}

type AvatarItem2 = {
  container_size: ContainerSize
  fallback_layers: FallbackLayers2
  mid: string
  [property: string]: any
}

type FallbackLayers2 = {
  is_critical_group: boolean
  layers: Layer2[]
  [property: string]: any
}

type Layer2 = {
  general_spec: GeneralSpec
  layer_config: LayerConfig
  resource: Resource2
  visible: boolean
  [property: string]: any
}

type Resource2 = {
  res_animation?: ResAnimation2
  res_image?: ResImage
  res_native_draw?: ResNativeDraw
  res_type: number
  [property: string]: any
}

type ResAnimation2 = {
  webp_src: WebpSrc2
  [property: string]: any
}

type WebpSrc2 = {
  placeholder?: number
  remote: Remote
  src_type: number
  [property: string]: any
}

type NftInteraction = {
  region: Region
  [property: string]: any
}

type Region = {
  icon: string
  show_status: number
  type: number
  [property: string]: any
}

type UserSailing2 = {
  cardbg: Cardbg | null
  cardbg_with_focus: null
  pendant: null
  [property: string]: any
}

type UserSailingV22 = {
  card_bg?: CardBg2
  [property: string]: any
}

type CardBg2 = {
  fan: Fan3
  id: number
  image: string
  jump_url: string
  name: string
  type: string
  [property: string]: any
}

type Fan3 = {
  color: string
  color_format: ColorFormat
  is_fan: number
  num_desc: string
  num_prefix: string
  number: number
  [property: string]: any
}

type ParentReplyMember = {
  name: string
  [property: string]: any
}

type ReplyControl = {
  max_line: number
  support_share: boolean
  time_desc: string
  translation_switch: number
  [property: string]: any
}

type UpAction = {
  like: boolean
  reply: boolean
  [property: string]: any
}

type ReplyControl2 = {
  max_line: number
  sub_reply_entry_text: string
  sub_reply_title_text: string
  support_share: boolean
  time_desc: string
  translation_switch: number
  [property: string]: any
}

type Top = {
  admin: null
  upper: null
  vote: null
  [property: string]: any
}

type Upper = {
  mid: number
  [property: string]: any
}
