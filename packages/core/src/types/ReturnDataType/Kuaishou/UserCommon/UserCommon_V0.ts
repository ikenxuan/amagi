export type KsUserProfileUserInfo = {
  id: string
  name: string
  description: string
  avatar: string
  sex: string
  living: boolean
  followStatus: string
  constellation: string
  cityName: string
  originUserId: number
  privacy: boolean
  isNew: boolean
  timestamp: number
  verifiedStatus: KsVerifiedStatus
  bannedStatus: KsBannedStatus
  counts: Record<string, any>
  [property: string]: any
}

export type KsVerifiedStatus = {
  verified: boolean
  description: string
  type: number
  new: boolean
  iconUrl: string
  [property: string]: any
}

export type KsBannedStatus = {
  banned: boolean
  socialBanned: boolean
  isolate: boolean
  defriend: boolean
  [property: string]: any
}

export type KsUserProfileSensitiveInfo = {
  kwaiId?: string
  originUserId?: number
  constellation?: string
  cityName?: string
  counts?: KsUserProfileCounts
  [property: string]: any
}

export type KsUserProfileLiveInfo = {
  id: string
  poster: string
  playUrls: any[] | Record<string, any>
  caption: string
  statrtTime: number
  author: KsUserProfileUserInfo
  gameInfo: KsUserProfileGameInfo
  hasRedPack: boolean
  hasBet: boolean
  followed: boolean
  expTag: string
  hotIcon: string
  living: boolean
  quality: string
  qualityLabel: string
  watchingCount: string
  landscape: boolean
  likeCount: string
  type: string
  [property: string]: any
}

export type KsUserProfileGameInfo = {
  gameId?: number
  coverUrl?: string
  name?: string
  type?: number
  category?: string
  [property: string]: any
}

export type KsUserProfileCounts = {
  fan?: string
  photo?: number
  follow?: string
  playback?: number
  review?: number
  open?: number
  [property: string]: any
}
