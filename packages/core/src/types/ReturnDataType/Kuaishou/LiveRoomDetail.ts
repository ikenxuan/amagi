export type KsLiveRoomInfo = {
  principalId?: string
  activeIndex: number
  current: KsLiveRoomPlayItem | null
  playList: KsLiveRoomPlayItem[]
  websocketUrls: string[]
  token: string
  noticeList: any[]
  loading: boolean
  emoji: KsLiveRoomEmojiState
  [property: string]: any
}

export type KsLiveRoomDetail = KsLiveRoomInfo

type KsLiveRoomEmojiState = {
  iconUrls: Record<string, string>
  giftList: KsLiveRoomGift[]
  giftPanelList: any[]
  token: string
  panelToken: string
  longSendGiftType: number | string | null
  [property: string]: any
}

type KsLiveRoomGift = {
  id: number
  name: string
  type: number
  unitPrice: number
  maxBatchSize: number
  actionType: number
  canCombo: boolean
  canPreview: boolean
  virtualPrice: number
  promptMessages: Record<string, string>
  giftTypeName: string
  liveGiftDescriptionKey: string
  liveGiftRuleUrl: string
  picUrl: Array<Record<string, string>>
  subscriptImageUrl?: Array<Record<string, string>>
  liveGiftBackgroundColorList?: string[]
  [property: string]: any
}

type KsLiveRoomPlayItem = {
  liveStream: KsLiveStreamInfo
  author: KsLiveRoomAuthor
  gameInfo: KsLiveRoomGameInfo
  isLiving: boolean
  authToken: string | null
  config: KsLiveRoomConfig
  websocketInfo: any
  status: number | Record<string, any>
  [property: string]: any
}

type KsLiveStreamInfo = {
  id: string
  poster: string
  playUrls: Record<string, any> | any[]
  url: string
  hlsPlayUrl: string
  location: string | null
  type: string
  liveGuess: boolean
  expTag: string
  privateLive: boolean
  [property: string]: any
}

type KsLiveRoomAuthor = {
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
  verifiedStatus: Record<string, any>
  bannedStatus: Record<string, any>
  counts: Record<string, any>
  [property: string]: any
}

type KsLiveRoomGameInfo = {
  id?: string | number
  name?: string
  poster?: string
  description?: string
  categoryAbbr?: string
  categoryName?: string
  watchingCount?: string
  roomCount?: string
  [property: string]: any
}

type KsLiveRoomConfig = {
  rtCoverUrl?: string
  hlsPlayUrl?: string
  liveStreamId?: string
  coverUrl?: string
  caption?: string
  likeCount?: string
  coverHeight?: number
  coverWidth?: number
  privateLive?: boolean
  synthesizeLive?: boolean
  revenueRankWinnerIcon?: any[]
  liveWish?: boolean
  watchingCount?: string
  gameInfo?: Record<string, any>
  landscape?: boolean
  multiResolutionPlayUrls?: any[]
  user?: Record<string, any>
  [property: string]: any
}
