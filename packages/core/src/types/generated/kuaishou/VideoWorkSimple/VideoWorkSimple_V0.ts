// 自动生成，手改无意义 —— 由 packages/typegen 从 corpus 样本派生，重新生成会覆盖。
// 要改类型请改样本（corpus）或改生成器，然后重新跑生成。
//
// 文件名里的 `_V<n>` 是**同一判别式取值下的形状序号，不是 API 版本号**：
// 只有当同一判别式取值下仍然存在无法合并的形状差异时才 +1。

export type VideoWorkSimple_V0 = {
  counts: Counts
  photo: Photo
  result: number
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
  caption: string
  commentCount: number
  commentShowType: number
  coverUrls: CoverUrl[]
  duration: number
  exp_tag: string
  ext_params: ExtParams
  forcePublic: string
  forwardCount: number
  headUrl: string
  headUrls: CoverUrl[]
  height: number
  likeCount: number
  mainMvUrls: CoverUrl[]
  manifest: Manifest
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
