export type OneWork = {
  data: Data;
  [property: string]: any
}

type Data = {
  visionVideoDetail: VisionVideoDetail;
  [property: string]: any
}

type VisionVideoDetail = {
  __typename: string
  author: Author
  commentLimit: CommentLimit
  danmakuSwitch: boolean
  llsid: string
  photo: Photo
  status: number
  tags: Tag[]
  type: number;
  [property: string]: any
}

type Author = {
  __typename: string
  following: boolean
  headerUrl: string
  id: string
  name: string;
  [property: string]: any
}

type CommentLimit = {
  __typename: string
  canAddComment: number;
  [property: string]: any
}

type Photo = {
  __typename: string
  caption: string
  coronaCropManifest: null
  coronaCropManifestH265: null
  coverUrl: string
  croppedPhotoH265Url: string
  croppedPhotoUrl: string
  duration: number
  expTag: string
  id: string
  likeCount: string
  liked: boolean
  llsid: null
  manifest: Manifest
  manifestH265: ManifestH265
  musicBlocked: null
  photoH265Url: string
  photoUrl: string
  realLikeCount: number
  stereoType: number
  timestamp: number
  videoRatio: number
  videoResource: VideoResource
  viewCount: string;
  [property: string]: any
}

type Manifest = {
  __typename: string
  adaptationSet: ManifestAdaptationSet[]
  businessType: number
  mediaType: number
  version: string;
  [property: string]: any
}

type ManifestAdaptationSet = {
  __typename?: string
  duration?: number
  id?: number
  representation?: PurpleRepresentation[];
  [property: string]: any
}

type PurpleRepresentation = {
  __typename?: string
  avgBitrate?: number
  backupUrl?: string[]
  codecs?: null
  defaultSelect?: boolean
  disableAdaptive?: boolean
  featureP2sp?: boolean
  frameRate?: number
  height?: number
  hidden?: boolean
  id?: number
  m3u8Slice?: null
  maxBitrate?: number
  qualityLabel?: string
  qualityType?: string
  url?: string
  width?: number;
  [property: string]: any
}

type ManifestH265 = {
  adaptationSet: ManifestH265AdaptationSet[]
  businessType: number
  hideAuto: boolean
  manualDefaultSelect: boolean
  mediaType: number
  playInfo: ManifestH265PlayInfo
  stereoType: number
  version: string
  videoFeature: ManifestH265VideoFeature
  videoId: string;
  [property: string]: any
}

type ManifestH265AdaptationSet = {
  duration?: number
  id?: number
  representation?: FluffyRepresentation[];
  [property: string]: any
}

type FluffyRepresentation = {
  agc?: boolean
  avgBitrate?: number
  backupUrl?: string[]
  comment?: string
  defaultSelect?: boolean
  disableAdaptive?: boolean
  featureP2sp?: boolean
  fileSize?: number
  frameRate?: number
  hdrType?: number
  height?: number
  hidden?: boolean
  id?: number
  kvqScore?: PurpleKvqScore
  makeupGain?: number
  maxBitrate?: number
  mute?: boolean
  normalizeGain?: number
  oriLoudness?: number
  p2spCode?: string
  quality?: number
  qualityLabel?: string
  qualityType?: string
  url?: string
  width?: number;
  [property: string]: any
}

type PurpleKvqScore = {
  NR: number
  NRPost: number;
  [property: string]: any
}

type ManifestH265PlayInfo = {
  cdnTimeRangeLevel: number;
  [property: string]: any
}

type ManifestH265VideoFeature = {
  avgEntropy: number
  blockyProbability: number
  blurProbability: number
  mosScore: number;
  [property: string]: any
}

type VideoResource = {
  h264: H264
  hevc: Hevc;
  [property: string]: any
}

type H264 = {
  adaptationSet: H264AdaptationSet[]
  businessType: number
  hideAuto: boolean
  manualDefaultSelect: boolean
  mediaType: number
  playInfo: H264PlayInfo
  stereoType: number
  version: string
  videoFeature: H264VideoFeature
  videoId: string;
  [property: string]: any
}

type H264AdaptationSet = {
  duration?: number
  id?: number
  representation?: TentacledRepresentation[];
  [property: string]: any
}

type TentacledRepresentation = {
  agc?: boolean
  avgBitrate?: number
  backupUrl?: string[]
  bitratePattern?: number[]
  comment?: string
  defaultSelect?: boolean
  disableAdaptive?: boolean
  featureP2sp?: boolean
  fileSize?: number
  frameRate?: number
  hdrType?: number
  height?: number
  hidden?: boolean
  id?: number
  kvqScore?: FluffyKvqScore
  makeupGain?: number
  maxBitrate?: number
  mute?: boolean
  normalizeGain?: number
  oriLoudness?: number
  p2spCode?: string
  quality?: number
  qualityLabel?: string
  qualityType?: string
  url?: string
  width?: number;
  [property: string]: any
}

type FluffyKvqScore = {
  FRPost: number
  NR: number
  NRPost: number;
  [property: string]: any
}

type H264PlayInfo = {
  cdnTimeRangeLevel: number;
  [property: string]: any
}

type H264VideoFeature = {
  avgEntropy: number
  blockyProbability: number
  blurProbability: number
  mosScore: number;
  [property: string]: any
}

type Hevc = {
  adaptationSet: HevcAdaptationSet[]
  businessType: number
  hideAuto: boolean
  manualDefaultSelect: boolean
  mediaType: number
  playInfo: HevcPlayInfo
  stereoType: number
  version: string
  videoFeature: HevcVideoFeature
  videoId: string;
  [property: string]: any
}

type HevcAdaptationSet = {
  duration?: number
  id?: number
  representation?: StickyRepresentation[];
  [property: string]: any
}

type StickyRepresentation = {
  agc?: boolean
  avgBitrate?: number
  backupUrl?: string[]
  comment?: string
  defaultSelect?: boolean
  disableAdaptive?: boolean
  featureP2sp?: boolean
  fileSize?: number
  frameRate?: number
  hdrType?: number
  height?: number
  hidden?: boolean
  id?: number
  kvqScore?: TentacledKvqScore
  makeupGain?: number
  maxBitrate?: number
  mute?: boolean
  normalizeGain?: number
  oriLoudness?: number
  p2spCode?: string
  quality?: number
  qualityLabel?: string
  qualityType?: string
  url?: string
  width?: number;
  [property: string]: any
}

type TentacledKvqScore = {
  NR: number
  NRPost: number;
  [property: string]: any
}

type HevcPlayInfo = {
  cdnTimeRangeLevel: number;
  [property: string]: any
}

type HevcVideoFeature = {
  avgEntropy: number
  blockyProbability: number
  blurProbability: number
  mosScore: number;
  [property: string]: any
}

type Tag = {
  __typename: string
  name: string
  type: string;
  [property: string]: any
}
