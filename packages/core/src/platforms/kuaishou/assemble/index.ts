import type { KuaishouReturnTypeMap } from '../../../types/ReturnDataType/Kuaishou'
import type { ErrorDetail } from '../../../types/NetworksConfigType'

/**
 * 快手响应归一化 helper（从 v6 `platform/kuaishou/getdata.ts` 搬迁）。
 *
 * 这是「响应变换没有归属」问题的正面处理：v6 把这 ~500 行 helper 堆在
 * `getdata.ts` 里且**零测试**（判据：搬迁后 getdata.ts 只剩 dispatch，
 * 且每个 helper 至少 1 条单测）。v7 搬进 `platforms/kuaishou/assemble/`，
 * 每个导出函数都有单测锁住行为。
 *
 * 搬迁纪律：**逻辑逐字不变**（这些函数决定对外返回的数据结构），
 * 只调整类型引用（`KuaishouReturnTypeMap` 等仍来自 v6 类型，阶段 6 才删）。
 */

type KuaishouUserProfileResult = KuaishouReturnTypeMap['userProfile']
type KuaishouUserWorkListResult = KuaishouReturnTypeMap['userWorkList']
type KuaishouLiveRoomInfoResult = KuaishouReturnTypeMap['liveRoomInfo']
type KuaishouLiveRoomPlayItem = NonNullable<KuaishouLiveRoomInfoResult['current']>

/** 用户主页 tab 类型映射（v6 常量，搬迁保持） */
export const KUAISHOU_PROFILE_TAB_TYPE_MAP: KuaishouUserProfileResult['profile']['tabTypeMap'] = {
  public: 'public',
  private: 'private',
  liked: 'liked',
  playback: 'playback'
}

/** 封禁状态映射（v6 常量，搬迁保持） */
export const KUAISHOU_BAN_STATE_MAP = {
  banned: 'BANNED',
  socialBanned: 'SOCIALBANNED',
  isolate: 'ISOLATE',
  cleanState: 'CLEAN'
}

/** 判断值是否为 `ErrorDetail`（带 `amagiError` 键） */
export const isErrorDetailLike = (result: unknown): result is ErrorDetail => {
  return Boolean(result && typeof result === 'object' && 'amagiError' in result)
}

/** 判断值是否为普通对象（非 null / 非数组） */
export const isRecord = (value: unknown): value is Record<string, any> => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

/** 判断对象是否至少包含一个键 */
export const hasPopulatedRecord = (value: unknown): value is Record<string, any> => {
  return isRecord(value) && Object.keys(value).length > 0
}

/** 取首个非空字符串；若都为空则返回空串 */
export const pickFirstNonEmptyString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return ''
}

/** 创建快手用户主页通用空列表数据 */
export const createEmptyUserListTabData = () => ({
  list: [],
  pcursor: ''
})

/** 创建快手用户主页公开视频 tab 的空数据（含 `live` 字段） */
export const createEmptyUserPublicTabData = () => ({
  live: null,
  list: [],
  pcursor: ''
})

/** 创建空的用户作品列表结果 */
export const createEmptyUserWorkListResult = (principalId: string): KuaishouUserWorkListResult => {
  return {
    principalId,
    list: [],
    pcursor: '',
    hasMore: false,
    result: 0
  }
}

/** 创建匿名态/降级场景下的空用户结果（保证 `userProfile` 稳定返回最小骨架） */
export const createEmptyUserProfileResult = (principalId: string): KuaishouUserProfileResult => {
  return {
    principalId,
    author: {
      principalId,
      userInfo: {
        id: '',
        name: '',
        description: '',
        avatar: '',
        sex: '',
        living: false,
        followStatus: '',
        constellation: '',
        cityName: '',
        originUserId: 0,
        privacy: false,
        isNew: false,
        timestamp: 0,
        verifiedStatus: {
          verified: false,
          description: '',
          type: 0,
          new: false,
          iconUrl: ''
        },
        bannedStatus: {
          banned: false,
          socialBanned: false,
          isolate: false,
          defriend: false
        },
        counts: {}
      },
      sensitiveInfo: null,
      followInfo: {},
      banStateMap: KUAISHOU_BAN_STATE_MAP
    },
    profile: {
      currentTab: 'public',
      pageSize: 12,
      tabTypeMap: KUAISHOU_PROFILE_TAB_TYPE_MAP,
      showPlayback: false,
      publicData: createEmptyUserPublicTabData(),
      privateData: createEmptyUserListTabData(),
      likedData: createEmptyUserListTabData(),
      playbackData: createEmptyUserListTabData(),
      interestList: [],
      currentProduct: {}
    },
    follow: null,
    followButton: null,
    interestMask: [],
    categoryMask: {
      config: [],
      list: [],
      hotList: [],
      hasMore: false,
      hasMoreHot: false
    }
  }
}

/** 创建空的直播间结果 */
export const createEmptyLiveRoomInfoResult = (principalId: string): KuaishouLiveRoomInfoResult => {
  return {
    principalId,
    activeIndex: 0,
    current: null,
    playList: [],
    websocketUrls: [],
    token: '',
    noticeList: [],
    loading: false,
    emoji: {
      iconUrls: {},
      giftList: [],
      giftPanelList: [],
      token: '',
      panelToken: '',
      longSendGiftType: null
    }
  }
}

/** 从用户资料中派生关注状态对象；无 followStatus 时返回 null */
export const createDerivedFollowState = (userInfo?: Record<string, any>, sensitiveInfo?: Record<string, any>) => {
  const followStatus = userInfo?.followStatus ?? sensitiveInfo?.followStatus

  if (!followStatus) {
    return null
  }

  return {
    currentFollowStatus: followStatus,
    needToFollow: false,
    authorId: userInfo?.id ?? '',
    data: 0
  }
}

/** 从用户资料中派生关注按钮状态；无 followStatus 时返回 null */
export const createDerivedFollowButtonState = (userInfo?: Record<string, any>, sensitiveInfo?: Record<string, any>) => {
  const followStatus = userInfo?.followStatus ?? sensitiveInfo?.followStatus

  if (!followStatus) {
    return null
  }

  return {
    followStatus
  }
}

/** 解析用户主页 tab 数据（ErrorDetail 或 result 非 1 时回退到 fallback） */
export const resolveUserProfileTabData = (payload: unknown, fallback: Record<string, any>) => {
  if (isErrorDetailLike(payload)) {
    return fallback
  }

  const nextData = (payload as any)?.data
  if (!isRecord(nextData) || nextData.result !== 1 || !Array.isArray(nextData.list)) {
    return fallback
  }

  const resolvedData: Record<string, any> = {
    ...fallback,
    ...nextData,
    list: nextData.list,
    pcursor: nextData.pcursor ?? fallback.pcursor ?? ''
  }

  if ('live' in fallback || 'live' in nextData) {
    resolvedData.live = nextData.live ?? fallback.live ?? null
  }

  return resolvedData
}

/** 解析快手用户作品分页结果 */
export const resolveKuaishouUserWorkList = (principalId: string, payload: unknown): KuaishouUserWorkListResult => {
  const fallback = createEmptyUserWorkListResult(principalId)

  if (isErrorDetailLike(payload)) {
    return fallback
  }

  const nextData = (payload as any)?.data
  if (!isRecord(nextData)) {
    return fallback
  }

  return {
    principalId,
    list: Array.isArray(nextData.list) ? nextData.list : fallback.list,
    pcursor: typeof nextData.pcursor === 'string' ? nextData.pcursor : fallback.pcursor,
    hasMore: Boolean(nextData.hasMore ?? nextData.pcursor),
    result: Number(nextData.result ?? fallback.result)
  }
}

/** 解析快手直播间详情主接口数据（result=1 时返回 data，否则 null） */
export const resolveKuaishouLiveDetailData = (payload: unknown): Record<string, any> | null => {
  if (isErrorDetailLike(payload)) {
    return null
  }

  const nextData = (payload as any)?.data
  if (!isRecord(nextData) || Number(nextData.result ?? 0) !== 1) {
    return null
  }

  return nextData
}

/** 从 `livedetail` 中提取 WebSocket 元信息（字段缺失时补默认值） */
export const resolveKuaishouLiveDetailWebsocketMeta = (detailData: Record<string, any> | null) => {
  const websocketInfo = isRecord(detailData?.websocketInfo) ? detailData.websocketInfo : {}

  return {
    websocketUrls: Array.isArray(websocketInfo?.websocketUrls) ? websocketInfo.websocketUrls : [],
    token: typeof websocketInfo?.token === 'string' ? websocketInfo.token : ''
  }
}

/** 从 `livedetail` 中提取推荐房间列表 */
export const resolveKuaishouLiveDetailRecommendList = (detailData: Record<string, any> | null): Record<string, any>[] => {
  return Array.isArray(detailData?.recommendList) ? detailData.recommendList : []
}

/** 归一化快手直播作者对象（多字段名回退） */
export const normalizeKuaishouLiveAuthor = (author?: Record<string, any>): KuaishouLiveRoomPlayItem['author'] => {
  const verifiedDetail = author?.verifiedDetail

  return {
    id: author?.id ?? author?.principalId ?? author?.kwaiId ?? '',
    name: author?.name ?? author?.user_name ?? '',
    description: author?.description ?? author?.user_text ?? '',
    avatar: author?.avatar ?? author?.headurl ?? '',
    sex: author?.sex ?? author?.user_sex ?? '',
    living: Boolean(author?.living ?? author?.live),
    followStatus: author?.followStatus ?? (author?.following ? 'FOLLOWING' : 'UN_FOLLOWED'),
    constellation: author?.constellation ?? '',
    cityName: author?.cityName ?? '',
    originUserId: Number(author?.originUserId ?? author?.user_id ?? 0),
    privacy: Boolean(author?.privacy),
    isNew: Boolean(author?.isNew),
    timestamp: Number(author?.timestamp ?? 0),
    verifiedStatus: author?.verifiedStatus ?? {
      verified: Boolean(author?.verified),
      description: verifiedDetail?.description ?? '',
      type: Number(verifiedDetail?.type ?? 0),
      new: Boolean(verifiedDetail?.newVerified),
      iconUrl: verifiedDetail?.iconUrl ?? ''
    },
    bannedStatus: author?.bannedStatus ?? {
      banned: false,
      socialBanned: false,
      isolate: false,
      defriend: false
    },
    counts: hasPopulatedRecord(author?.counts) ? author.counts : {}
  }
}

/** 用用户资料接口补强直播作者对象 */
export const mergeKuaishouLiveAuthor = (
  fallbackAuthor: Record<string, any> | undefined,
  userInfo?: Record<string, any>,
  sensitiveInfo?: Record<string, any>
): KuaishouLiveRoomPlayItem['author'] => {
  const normalizedFallback = normalizeKuaishouLiveAuthor(fallbackAuthor)

  return {
    ...normalizedFallback,
    ...(hasPopulatedRecord(userInfo) ? userInfo : {}),
    followStatus: userInfo?.followStatus ?? sensitiveInfo?.followStatus ?? normalizedFallback.followStatus,
    constellation: pickFirstNonEmptyString(userInfo?.constellation, sensitiveInfo?.constellation, normalizedFallback.constellation),
    cityName: pickFirstNonEmptyString(userInfo?.cityName, sensitiveInfo?.cityName, normalizedFallback.cityName),
    verifiedStatus: userInfo?.verifiedStatus ?? sensitiveInfo?.verifiedStatus ?? normalizedFallback.verifiedStatus,
    bannedStatus: userInfo?.bannedStatus ?? sensitiveInfo?.bannedStatus ?? normalizedFallback.bannedStatus,
    counts: hasPopulatedRecord(userInfo?.counts) ? userInfo.counts : (sensitiveInfo?.counts ?? normalizedFallback.counts)
  }
}

/** 将 `liveroom/livedetail` 映射为用户主页 `publicData.live` */
export const mapLiveDetailToUserProfileLiveInfo = (
  detailData: Record<string, any>,
  author: KuaishouLiveRoomPlayItem['author']
) => {
  const liveStream = isRecord(detailData?.liveStream) ? detailData.liveStream : {}
  const config = isRecord(detailData?.config) ? detailData.config : {}
  const gameInfo = isRecord(detailData?.gameInfo) ? detailData.gameInfo : {}
  const liveStreamId = pickFirstNonEmptyString(liveStream?.id, config?.liveStreamId)

  return {
    ...detailData,
    id: liveStreamId,
    poster: pickFirstNonEmptyString(liveStream?.poster, config?.coverUrl, config?.rtCoverUrl),
    playUrls: liveStream?.playUrls ?? config?.multiResolutionPlayUrls ?? [],
    caption: config?.caption ?? detailData?.caption ?? '',
    statrtTime: Number(detailData?.startTime ?? config?.startTime ?? liveStream?.startTime ?? 0),
    author,
    gameInfo,
    hasRedPack: Boolean(detailData?.hasRedPack ?? config?.hasRedPack),
    hasBet: Boolean(detailData?.hasBet ?? config?.hasBet),
    followed: author?.followStatus === 'FOLLOWING',
    expTag: liveStream?.expTag ?? config?.expTag ?? '',
    hotIcon: config?.hotIcon ?? detailData?.hotIcon ?? '',
    living: Boolean(detailData?.isLiving ?? liveStreamId),
    quality: config?.quality ?? '',
    qualityLabel: config?.qualityLabel ?? '',
    watchingCount: config?.watchingCount ?? detailData?.watchingCount ?? gameInfo?.watchingCount ?? '',
    landscape: Boolean(config?.landscape),
    likeCount: config?.likeCount ?? detailData?.likeCount ?? '',
    type: liveStream?.type ?? 'live'
  }
}

/** 将 `liveroom/livedetail` 映射为 `liveRoomInfo.current` */
export const mapLiveDetailToLiveRoomPlayItem = (
  detailData: Record<string, any>,
  author: KuaishouLiveRoomPlayItem['author']
): KuaishouLiveRoomPlayItem => {
  const liveStream = isRecord(detailData?.liveStream) ? detailData.liveStream : {}
  const config = isRecord(detailData?.config) ? detailData.config : {}
  const gameInfo = isRecord(detailData?.gameInfo) ? detailData.gameInfo : {}
  const liveStreamId = pickFirstNonEmptyString(liveStream?.id, config?.liveStreamId)
  const coverUrl = pickFirstNonEmptyString(config?.coverUrl, config?.rtCoverUrl, liveStream?.poster)

  return {
    liveStream: {
      id: liveStreamId,
      poster: pickFirstNonEmptyString(liveStream?.poster, coverUrl),
      playUrls: liveStream?.playUrls ?? config?.multiResolutionPlayUrls ?? {},
      url: liveStream?.url ?? '',
      hlsPlayUrl: pickFirstNonEmptyString(config?.hlsPlayUrl, liveStream?.hlsPlayUrl),
      location: liveStream?.location ?? null,
      type: liveStream?.type ?? 'live',
      liveGuess: Boolean(liveStream?.liveGuess),
      expTag: liveStream?.expTag ?? config?.expTag ?? '',
      privateLive: Boolean(liveStream?.privateLive ?? config?.privateLive)
    },
    author,
    gameInfo: {
      id: String(gameInfo?.id ?? gameInfo?.gameId ?? ''),
      name: gameInfo?.name ?? '',
      poster: pickFirstNonEmptyString(gameInfo?.poster, gameInfo?.coverUrl),
      description: gameInfo?.description ?? '',
      categoryAbbr: gameInfo?.categoryAbbr ?? gameInfo?.category ?? '',
      categoryName: gameInfo?.categoryName ?? '',
      watchingCount: config?.watchingCount ?? detailData?.watchingCount ?? gameInfo?.watchingCount ?? '',
      roomCount: gameInfo?.roomCount ?? ''
    },
    isLiving: Boolean(detailData?.isLiving ?? liveStreamId),
    authToken: typeof detailData?.authToken === 'string' ? detailData.authToken : null,
    config: {
      ...config,
      liveStreamId,
      hlsPlayUrl: pickFirstNonEmptyString(config?.hlsPlayUrl, liveStream?.hlsPlayUrl),
      coverUrl,
      rtCoverUrl: pickFirstNonEmptyString(config?.rtCoverUrl, liveStream?.poster),
      gameInfo,
      multiResolutionPlayUrls: config?.multiResolutionPlayUrls ?? liveStream?.playUrls ?? []
    },
    websocketInfo: isRecord(detailData?.websocketInfo) ? detailData.websocketInfo : {},
    status: detailData?.status ?? { forbiddenState: Number(detailData?.result ?? 0) }
  }
}

/** 将 `liveroom/reco` 返回项映射为 `playList` 项 */
export const mapRecoItemToLiveRoomPlayItem = (recoItem: Record<string, any>): KuaishouLiveRoomPlayItem => ({
  liveStream: {
    id: recoItem?.liveStream?.id ?? '',
    poster: recoItem?.liveStream?.poster ?? recoItem?.config?.coverUrl ?? '',
    playUrls: recoItem?.liveStream?.playUrls ?? {},
    url: recoItem?.liveStream?.url ?? '',
    hlsPlayUrl: recoItem?.liveStream?.hlsPlayUrl ?? recoItem?.config?.hlsPlayUrl ?? '',
    location: recoItem?.liveStream?.location ?? null,
    type: recoItem?.liveStream?.type ?? 'live',
    liveGuess: Boolean(recoItem?.liveStream?.liveGuess),
    expTag: recoItem?.liveStream?.expTag ?? '',
    privateLive: Boolean(recoItem?.liveStream?.privateLive ?? recoItem?.config?.privateLive)
  },
  author: normalizeKuaishouLiveAuthor(recoItem?.author),
  gameInfo: {
    id: recoItem?.gameInfo?.id ?? '',
    name: recoItem?.gameInfo?.name ?? '',
    poster: recoItem?.gameInfo?.poster ?? '',
    description: recoItem?.gameInfo?.description ?? '',
    categoryAbbr: recoItem?.gameInfo?.categoryAbbr ?? '',
    categoryName: recoItem?.gameInfo?.categoryName ?? '',
    watchingCount: recoItem?.gameInfo?.watchingCount ?? '',
    roomCount: recoItem?.gameInfo?.roomCount ?? ''
  },
  isLiving: Boolean(recoItem?.isLiving),
  authToken: recoItem?.authToken ?? null,
  config: {
    ...(recoItem?.config ?? {}),
    liveStreamId: recoItem?.config?.liveStreamId ?? recoItem?.liveStream?.id ?? ''
  },
  websocketInfo: recoItem?.websocketInfo ?? {},
  status: recoItem?.status ?? {}
})

/** 对直播房间列表按直播流 ID 去重 */
export const dedupeLiveRoomPlayList = (items: Array<KuaishouLiveRoomPlayItem | null>): KuaishouLiveRoomPlayItem[] => {
  const seenLiveStreamIds = new Set<string>()
  const normalizedItems: KuaishouLiveRoomPlayItem[] = []

  for (const item of items) {
    if (!item) continue

    const liveStreamId = item.liveStream?.id ?? item.config?.liveStreamId ?? ''

    if (liveStreamId && seenLiveStreamIds.has(liveStreamId)) {
      continue
    }

    if (liveStreamId) {
      seenLiveStreamIds.add(liveStreamId)
    }

    normalizedItems.push(item)
  }

  return normalizedItems
}
