// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。
//
// 证据：1 份样本（amagi 6.6.0）。样本不进 git，在本地 corpus/ 里
//   14c7c3b8aa7a  2026-09-04  photoId

/** 作品详情的**主通道**：H5 免签的 `ugH5App/photo/simple/info`。快手自己的分享页 SSR 用的就是这一条（`c.kuaishou.com/fw/photo/<id>` 的 `window.INIT_STATE` 里那个混淆键解出来正是这个路径）。完整版 `photo/info` 在 `videoWorkFull` 端点上，当前稳定撞 `2001` 风控，所以 corpus 里录不到它。 */
export type VideoWork_V0 = {
  /** 计数快照。数字随时在变，样本里的具体值没有意义。 */
  counts: Counts
  photo: Photo
  /** 业务码。`1` 是成功；`2` 是 IP 级冷却、`11` 是字段全 null 的空壳、`2001` 是要验证码 —— 后三种都由入库判定拒在 corpus 外面。 */
  result: number
  /** 合集 / 连续剧信息。不属于合集的作品这里也有，靠里面的字段判断而不是靠有没有这个键。 */
  serialInfo: SerialInfo
  [property: string]: any
}

type Counts = {
  collectionCount: number
  fanCount: number
  followCount: number
  photoCount: number
  [property: string]: any
}

type Photo = {
  adminTags: unknown[]
  /** 作品标题 / 文案，**用户内容**，脱敏按 `name` 策略换掉。 */
  caption: string
  commentCount: number
  commentShowType: number
  coverUrls: CoverUrl[]
  /** 时长，**毫秒**。 */
  duration: number
  exp_tag: string
  ext_params: ExtParams
  forcePublic: string
  forwardCount: number
  headUrl: string
  headUrls: CoverUrl[]
  height: number
  likeCount: number
  /** 退路地址。它能播，但清晰度不受控 —— 只在 `manifest` 里挑不出东西时用。 */
  mainMvUrls: CoverUrl[]
  /** **真正能播的地址在这里**，不在 `mainMvUrls`。 */
  manifest: Manifest
  /** 作品 ID，**字符串**。与请求参数里的 `photoId` 是同一个值。要精确值就用它 —— 平台在别处（如 `soundTrack.photoId`）给的数字形式已经掉过精度。 */
  photoId: string
  photoStatus: number
  photoType: string
  sameFrame: SameFrame
  serverExpTag: string
  shareCount: number
  share_info: string
  singlePicture: boolean
  soundTrack: SoundTrack
  tagShow: TagShow
  timestamp: number
  type: number
  userEid: string
  /** 作者 UID。与作者信息里的 ID 换完仍然相等（脱敏的一致性映射保证）。 */
  userId: number
  userName: string
  userSex: string
  verified: boolean
  viewCount: number
  webpCoverUrls: CoverUrl[]
  width: number
  [property: string]: any
}

type CoverUrl = {
  cdn: string
  url: string
  [property: string]: any
}

type ExtParams = {
  color: string
  h: number
  interval: number
  mtype: number
  sound: number
  video: number
  w: number
  [property: string]: any
}

type Manifest = {
  /** 按清晰度分档。取流要先在这里挑一档，再进它的 `representation`。 */
  adaptationSet: AdaptationSet[]
  audioFeature: AudioFeature
  businessType: number
  hideAuto: boolean
  manualDefaultSelect: boolean
  mediaType: number
  playInfo: PlayInfo
  stereoType: number
  version: string
  videoFeature: VideoFeature
  videoId: string
  [property: string]: any
}

type AdaptationSet = {
  duration: number
  id: number
  /** 同一档下的多个备用地址。kkk 的做法是优先取带 `defaultSelect` 的那个，取不到再退回 `mainMvUrls[0].url`。 */
  representation: Representation[]
  [property: string]: any
}

type Representation = {
  agc: boolean
  avgBitrate: number
  backupUrl: string[]
  bitratePattern?: number[]
  colorInfo: ColorInfo
  comment: string
  defaultSelect: boolean
  disableAdaptive: boolean
  featureP2sp: boolean
  fileSize: number
  frameRate: number
  hdrType: number
  height: number
  hidden: boolean
  id: number
  kvqScore: KvqScore
  makeupGain: number
  maxBitrate: number
  minorInfo: string
  mute: boolean
  normalizeGain: number
  oriLoudness: number
  p2spCode: string
  quality: number
  qualityLabel: string
  qualityType: string
  realLoudness: number
  realNormalizeGain: number
  url: string
  videoCodec: string
  volumeInfo: VolumeInfo
  width: number
  [property: string]: any
}

type ColorInfo = {
  bright: number
  contrast: number
  saturation: number
  yMean: number
  yMeanMax: number
  yMeanMin: number
  [property: string]: any
}

type KvqScore = {
  FR: number
  FRPost: number
  NR: number
  NRPost: number
  blur: number
  kvqVersion: string
  nnvcScore: number
  sharpness: number
  [property: string]: any
}

type VolumeInfo = {
  chCorr: number
  loudness: number
  lra: number
  lraHigh: number
  lraLow: number
  lraTh: number
  th: number
  tp: number
  [property: string]: any
}

type AudioFeature = {
  audioClip: number
  audioQuality: number
  audioSnr: number
  backgroundSoundProbability: number
  dialogProbability: number
  effectiveBandwidthInHz: number
  musicProbability: number
  stereophonicRichness: number
  [property: string]: any
}

type PlayInfo = {
  bizType: number
  cdnTimeRangeLevel: number
  strategyBus: string
  [property: string]: any
}

type VideoFeature = {
  avgEntropy: number
  blockyProbability: number
  blurProbability: number
  capSrc: number
  contrast: number
  mosScore: number
  overExposed: number
  underExposed: number
  yMean: number
  yMeanMax: number
  yMeanMin: number
  [property: string]: any
}

type SameFrame = {
  allow: boolean
  availableDepth: number
  [property: string]: any
}

type SoundTrack = {
  artist: string
  audioType: number
  audioUrls: CoverUrl[]
  avatarUrls: CoverUrl[]
  disableEnhancedEntry: boolean
  finalStatus: number
  genreId: number
  hasCopyright: boolean
  id: number
  imageUrls: CoverUrl[]
  isOffline: boolean
  loudness: number
  name: string
  /** 配乐来源作品的 ID，**数字形式，超过 `MAX_SAFE_INTEGER`**。精度在 `JSON.parse` 时就丢了，生成器把这条作为 needsDecision 报出来 —— 要精确值得让平台给字符串，或者接受损失。 */
  photoId: number
  type: number
  user: User
  [property: string]: any
}

type User = {
  eid: string
  following: boolean
  headurl: string
  headurls: CoverUrl[]
  user_id: number
  user_name: string
  user_sex: string
  visitorBeFollowed: boolean
  [property: string]: any
}

type TagShow = {
  bannerType: number
  bizId: string
  type: number
  usedCount: string
  [property: string]: any
}

type SerialInfo = {
  msg: null
  serialId: null
  serialType: null
  show: boolean
  title: null
  valid: boolean
  [property: string]: any
}
