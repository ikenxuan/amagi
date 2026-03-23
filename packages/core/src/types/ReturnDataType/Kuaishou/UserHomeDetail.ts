import type {
  KsUserProfileLiveInfo,
  KsUserProfileSensitiveInfo,
  KsUserProfileUserInfo
} from './UserCommon'

export type KsUserHomeDetail = {
  principalId: string
  author: KsUserHomeAuthorInfo
  profile: KsUserHomeProfileState
  follow: KsUserHomeFollowState | null
  followButton: KsUserHomeFollowButtonState | null
  interestMask: KsUserHomeInterestCategory[]
  categoryMask: KsUserHomeCategoryMask
  [property: string]: any
}

export type KsUserHomeAuthorInfo = {
  principalId: string
  userInfo: KsUserProfileUserInfo
  sensitiveInfo: KsUserProfileSensitiveInfo | null
  followInfo: Record<string, any>
  banStateMap: Record<string, string>
  [property: string]: any
}

export type KsUserHomeProfileState = {
  currentTab: string
  pageSize: number
  tabTypeMap: Record<string, string>
  showPlayback: boolean
  publicData: KsUserHomeTabData
  privateData: KsUserHomeTabData
  likedData: KsUserHomeTabData
  playbackData: KsUserHomeTabData
  interestList: KsUserHomeInterestAuthor[]
  currentProduct: Record<string, any>
  [property: string]: any
}

export type KsUserHomeTabData = {
  live?: KsUserProfileLiveInfo | null
  list: KsUserHomeWork[]
  pcursor: string
  showPlayback?: boolean
  result?: number
  [property: string]: any
}

export type KsUserHomeWork = {
  id: string
  poster: string
  width: number
  height: number
  counts: Record<string, any>
  workType: string
  liked: boolean
  author: Record<string, any>
  expTag: string
  onlyFollowerCanComment: boolean
  type: string
  useVideoPlayer: boolean
  imgUrls: string[]
  imgSizes: any[]
  playUrl?: string
  [property: string]: any
}

export type KsUserHomeInterestAuthor = {
  kwaiId?: string
  principalId: string
  fanCount: string
  live: boolean
  following: boolean
  verified: boolean
  eid: string
  headurl: string
  headurls: Array<Record<string, string>>
  visitorBeFollowed: boolean
  user_id: number
  user_name: string
  user_sex: string
  user_text: string
  isFavorited: boolean
  [property: string]: any
}

export type KsUserHomeInterestCategory = {
  id: number
  name: string
  categoryType: number
  authorList: KsUserHomeInterestAuthor[]
  [property: string]: any
}

export type KsUserHomeCategoryMask = {
  config: any[]
  list: any[]
  hotList: KsUserHomeHotCategory[]
  hasMore: boolean
  hasMoreHot: boolean
  [property: string]: any
}

export type KsUserHomeHotCategory = {
  id: string
  name: string
  poster: string
  iconUrl: string
  description: string
  categoryAbbr: string
  categoryName: string
  roomCount: string
  [property: string]: any
}

export type KsUserHomeFollowState = {
  currentFollowStatus: string
  needToFollow: boolean
  authorId: string
  data: number
  [property: string]: any
}

export type KsUserHomeFollowButtonState = {
  followStatus: string
  [property: string]: any
}
