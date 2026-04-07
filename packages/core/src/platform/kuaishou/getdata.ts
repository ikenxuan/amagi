import { fetchData, isNetworkErrorResult, logger } from 'amagi/model'
import { getKuaishouDefaultConfig } from 'amagi/platform/defaultConfigs'
import { RequestConfig } from 'amagi/server'
import { KuaishouDataOptionsMap } from 'amagi/types'
import { amagiAPIErrorCode, ErrorDetail, kuaishouAPIErrorCode } from 'amagi/types/NetworksConfigType'
import type { KuaishouReturnTypeMap } from 'amagi/types/ReturnDataType/Kuaishou'
import { AxiosRequestConfig } from 'axios'

/**
 * 快手数据获取模块
 *
 * 注意：为避免循环依赖，此文件直接从具体模块导入，而不是从平台 index 文件导入
 * 循环依赖链：DataFetchers → getdata → platform/kuaishou → DataFetchers
 */
import { kuaishouApiUrls, type KuaishouGraphqlRequest, type KuaishouLiveApiRequest } from './API'
import { kuaishouSign } from './sign'

type KuaishouUserProfileResult = KuaishouReturnTypeMap['userProfile']
type KuaishouUserWorkListResult = KuaishouReturnTypeMap['userWorkList']
type KuaishouLiveRoomInfoResult = KuaishouReturnTypeMap['liveRoomInfo']
type KuaishouLiveRoomPlayItem = NonNullable<KuaishouLiveRoomInfoResult['current']>

const KUAISHOU_PROFILE_TAB_TYPE_MAP: KuaishouUserProfileResult['profile']['tabTypeMap'] = {
  public: 'public',
  private: 'private',
  liked: 'liked',
  playback: 'playback'
}

const KUAISHOU_BAN_STATE_MAP = {
  banned: 'BANNED',
  socialBanned: 'SOCIALBANNED',
  isolate: 'ISOLATE',
  cleanState: 'CLEAN'
}

/**
 * 构造快手 `live_api` 请求配置。
 *
 * 该函数负责把 API 层产出的 `KuaishouLiveApiRequest`
 * 与签名层拼装起来，生成最终可发送的 JSON 请求配置。
 *
 * @param request - 快手 `live_api` 请求描述对象
 * @param refererPath - 用于构造 Referer 的页面相对路径
 * @param cookie - 用户 Cookie
 * @param requestConfig - 外部透传的请求配置
 * @returns 可直接用于 `fetchData` 的 Axios 请求配置
 */
const buildLiveApiRequestConfig = (
  request: KuaishouLiveApiRequest,
  refererPath: string,
  cookie?: string,
  requestConfig?: RequestConfig
): AxiosRequestConfig => {
  const signedRequest = request.requiresSign === false
    ? { url: request.url, headers: {} as Record<string, string> }
    : kuaishouSign.signLiveApiRequest(request, cookie)
  const kww = kuaishouSign.generateKww(cookie)
  const isPostRequest = request.method === 'POST'

  return {
    method: request.method,
    timeout: 10000,
    ...requestConfig,
    url: signedRequest.url,
    ...(isPostRequest ? { data: request.body ?? {} } : {}),
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      'Cache-Control': 'no-cache',
      Cookie: cookie?.trim() ?? '',
      Pragma: 'no-cache',
      Priority: 'u=0, i',
      Referer: `https://live.kuaishou.com/${refererPath}`,
      'Sec-Ch-Ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
      ...(isPostRequest ? { 'Content-Type': 'application/json' } : {}),
      ...signedRequest.headers,
      ...(!signedRequest.headers.kww && kww ? { kww } : {}),
      ...(requestConfig?.headers ?? {})
    }
  }
}

/**
 * 判断返回值是否已是项目统一的错误描述对象。
 *
 * @param result - 任意待判断对象
 * @returns 是否符合 `ErrorDetail` 结构
 */
const isErrorDetailLike = (result: unknown): result is ErrorDetail => {
  return Boolean(result && typeof result === 'object' && 'amagiError' in result)
}

/**
 * 判断值是否为普通对象。
 *
 * @param value - 待判断的值
 * @returns 是否为对象字面量
 */
const isRecord = (value: unknown): value is Record<string, any> => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

/**
 * 判断对象是否至少包含一个键。
 *
 * @param value - 待判断对象
 * @returns 是否为非空对象
 */
const hasPopulatedRecord = (value: unknown): value is Record<string, any> => {
  return isRecord(value) && Object.keys(value).length > 0
}

/**
 * 取首个非空字符串。
 *
 * @param values - 候选字符串
 * @returns 首个非空字符串；若都为空则返回空串
 */
const pickFirstNonEmptyString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return ''
}

/**
 * 创建快手用户主页通用空列表数据。
 *
 * @returns 空列表 tab 数据
 */
const createEmptyUserListTabData = () => ({
  list: [],
  pcursor: ''
})

/**
 * 创建快手用户主页公开视频 tab 的空数据。
 *
 * @returns 含 `live` 字段的空 tab 数据
 */
const createEmptyUserPublicTabData = () => ({
  live: null,
  list: [],
  pcursor: ''
})

/**
 * 创建空的用户作品列表结果。
 *
 * @param principalId - 用户主页 principalId
 * @returns 空的 `userWorkList` 结果
 */
const createEmptyUserWorkListResult = (
  principalId: string
): KuaishouUserWorkListResult => {
  return {
    principalId,
    list: [],
    pcursor: '',
    hasMore: false,
    result: 0
  }
}

/**
 * 创建匿名态/降级场景下的空用户结果。
 *
 * 当补充接口不可用时，使用该结构保证
 * `userProfile` 仍能返回稳定的最小骨架。
 *
 * @param principalId - 用户主页 principalId
 * @returns 空的 `userProfile` 结果
 */
const createEmptyUserProfileResult = (
  principalId: string
): KuaishouUserProfileResult => {
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

/**
 * 创建空的直播间结果。
 *
 * @param principalId - 直播间 principalId
 * @returns 空的 `liveRoomInfo`
 */
const createEmptyLiveRoomInfoResult = (
  principalId: string
): KuaishouLiveRoomInfoResult => {
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

/**
 * 从用户资料中派生关注状态对象。
 *
 * 真实页面中的 `follow` 与 `followBtn` 来自页面装配状态；
 * 在纯协议路径下，这里基于用户资料接口回填稳定最小字段。
 *
 * @param userInfo - 用户公开资料
 * @param sensitiveInfo - 用户敏感资料
 * @returns 归一化后的 follow 状态
 */
const createDerivedFollowState = (
  userInfo?: Record<string, any>,
  sensitiveInfo?: Record<string, any>
) => {
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

/**
 * 从用户资料中派生关注按钮状态。
 *
 * @param userInfo - 用户公开资料
 * @param sensitiveInfo - 用户敏感资料
 * @returns 归一化后的 follow button 状态
 */
const createDerivedFollowButtonState = (
  userInfo?: Record<string, any>,
  sensitiveInfo?: Record<string, any>
) => {
  const followStatus = userInfo?.followStatus ?? sensitiveInfo?.followStatus

  if (!followStatus) {
    return null
  }

  return {
    followStatus
  }
}

/**
 * 解析用户主页 tab 数据。
 *
 * @param payload - 接口响应
 * @param fallback - 兜底数据
 * @returns 归一化后的 tab 数据
 */
const resolveUserProfileTabData = (
  payload: unknown,
  fallback: Record<string, any>
) => {
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

/**
 * 解析快手用户作品分页结果。
 *
 * @param principalId - 用户主页 principalId
 * @param payload - `profile/public` 响应
 * @returns 归一化后的作品列表结果
 */
const resolveKuaishouUserWorkList = (
  principalId: string,
  payload: unknown
): KuaishouUserWorkListResult => {
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

/**
 * 解析快手直播间详情主接口数据。
 *
 * `live_api/liveroom/livedetail` 是当前房间主体的纯协议主接口；
 * 当接口返回 `result=1` 时，`data` 中会直接包含 `liveStream`、
 * `author`、`gameInfo`、`noticeList`、`websocketInfo` 与 `config`。
 *
 * @param payload - `liveroom/livedetail` 响应
 * @returns 成功时返回标准化后的 `data`，否则返回 `null`
 */
const resolveKuaishouLiveDetailData = (
  payload: unknown
): Record<string, any> | null => {
  if (isErrorDetailLike(payload)) {
    return null
  }

  const nextData = (payload as any)?.data
  if (!isRecord(nextData) || Number(nextData.result ?? 0) !== 1) {
    return null
  }

  return nextData
}

/**
 * 从 `livedetail` 中提取 WebSocket 元信息。
 *
 * `livedetail` 有时已经自带 `websocketInfo`，这时可以直接复用，
 * 仅在字段缺失时再补请求 `websocketinfo`。
 *
 * @param detailData - `liveroom/livedetail.data`
 * @returns 归一化后的 WebSocket 元信息
 */
const resolveKuaishouLiveDetailWebsocketMeta = (
  detailData: Record<string, any> | null
) => {
  const websocketInfo = isRecord(detailData?.websocketInfo)
    ? detailData.websocketInfo
    : {}

  return {
    websocketUrls: Array.isArray(websocketInfo?.websocketUrls)
      ? websocketInfo.websocketUrls
      : [],
    token: typeof websocketInfo?.token === 'string'
      ? websocketInfo.token
      : ''
  }
}

/**
 * 从 `livedetail` 中提取推荐房间列表。
 *
 * @param detailData - `liveroom/livedetail.data`
 * @returns 推荐房间列表
 */
const resolveKuaishouLiveDetailRecommendList = (
  detailData: Record<string, any> | null
): Record<string, any>[] => {
  return Array.isArray(detailData?.recommendList)
    ? detailData.recommendList
    : []
}

/**
 * 归一化快手直播作者对象。
 *
 * @param author - 原始作者对象
 * @returns 与项目返回结构一致的作者对象
 */
const normalizeKuaishouLiveAuthor = (
  author?: Record<string, any>
): KuaishouLiveRoomPlayItem['author'] => {
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

/**
 * 用用户资料接口补强直播作者对象。
 *
 * @param fallbackAuthor - 直播接口自带的作者信息
 * @param userInfo - `userinfo/byid` 返回的公开资料
 * @param sensitiveInfo - `userinfo/sensitive` 返回的补充资料
 * @returns 补强后的作者对象
 */
const mergeKuaishouLiveAuthor = (
  fallbackAuthor: Record<string, any> | undefined,
  userInfo?: Record<string, any>,
  sensitiveInfo?: Record<string, any>
): KuaishouLiveRoomPlayItem['author'] => {
  const normalizedFallback = normalizeKuaishouLiveAuthor(fallbackAuthor)

  return {
    ...normalizedFallback,
    ...(hasPopulatedRecord(userInfo) ? userInfo : {}),
    followStatus: userInfo?.followStatus ?? sensitiveInfo?.followStatus ?? normalizedFallback.followStatus,
    constellation: pickFirstNonEmptyString(
      userInfo?.constellation,
      sensitiveInfo?.constellation,
      normalizedFallback.constellation
    ),
    cityName: pickFirstNonEmptyString(
      userInfo?.cityName,
      sensitiveInfo?.cityName,
      normalizedFallback.cityName
    ),
    verifiedStatus: userInfo?.verifiedStatus ??
      sensitiveInfo?.verifiedStatus ??
      normalizedFallback.verifiedStatus,
    bannedStatus: userInfo?.bannedStatus ??
      sensitiveInfo?.bannedStatus ??
      normalizedFallback.bannedStatus,
    counts: hasPopulatedRecord(userInfo?.counts)
      ? userInfo.counts
      : (sensitiveInfo?.counts ?? normalizedFallback.counts)
  }
}

/**
 * 将 `liveroom/livedetail` 映射为用户主页 `publicData.live`。
 *
 * @param detailData - `liveroom/livedetail.data`
 * @param author - 归一化后的作者对象
 * @returns 用户主页 live 对象
 */
const mapLiveDetailToUserProfileLiveInfo = (
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
    poster: pickFirstNonEmptyString(
      liveStream?.poster,
      config?.coverUrl,
      config?.rtCoverUrl
    ),
    playUrls: liveStream?.playUrls ?? config?.multiResolutionPlayUrls ?? [],
    caption: config?.caption ?? detailData?.caption ?? '',
    statrtTime: Number(
      detailData?.startTime ??
      config?.startTime ??
      liveStream?.startTime ??
      0
    ),
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

/**
 * 将 `liveroom/livedetail` 映射为 `liveRoomInfo.current`。
 *
 * @param detailData - `liveroom/livedetail.data`
 * @param author - 补强后的主播对象
 * @returns 当前直播间对象
 */
const mapLiveDetailToLiveRoomPlayItem = (
  detailData: Record<string, any>,
  author: KuaishouLiveRoomPlayItem['author']
): KuaishouLiveRoomPlayItem => {
  const liveStream = isRecord(detailData?.liveStream) ? detailData.liveStream : {}
  const config = isRecord(detailData?.config) ? detailData.config : {}
  const gameInfo = isRecord(detailData?.gameInfo) ? detailData.gameInfo : {}
  const liveStreamId = pickFirstNonEmptyString(liveStream?.id, config?.liveStreamId)
  const coverUrl = pickFirstNonEmptyString(
    config?.coverUrl,
    config?.rtCoverUrl,
    liveStream?.poster
  )

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

/**
 * 将 `liveroom/reco` 返回项映射为 `playList` 项。
 *
 * @param recoItem - 推荐房间对象
 * @returns 归一化后的推荐房间对象
 */
const mapRecoItemToLiveRoomPlayItem = (
  recoItem: Record<string, any>
): KuaishouLiveRoomPlayItem => ({
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

/**
 * 对直播房间列表按直播流 ID 去重。
 *
 * @param items - 待去重房间列表
 * @returns 去重后的房间列表
 */
const dedupeLiveRoomPlayList = (
  items: Array<KuaishouLiveRoomPlayItem | null>
): KuaishouLiveRoomPlayItem[] => {
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

/**
 * 快手数据获取函数
 * @param data - 请求数据参数
 * @param cookie - 用户Cookie
 * @param requestConfig - 外部请求配置（优先级最高）
 * @returns 返回快手数据；当前 user/live 能力已优先走纯协议聚合链路
 */
export const KuaishouData = async <T extends keyof KuaishouDataOptionsMap> (
  data: KuaishouDataOptionsMap[T]['opt'],
  cookie?: string,
  requestConfig?: RequestConfig
) => {
  const defHeaders = getKuaishouDefaultConfig(cookie)['headers']

  const baseRequestConfig: AxiosRequestConfig = {
    method: 'POST',
    timeout: 10000,
    ...requestConfig,
    headers: {
      ...defHeaders,
      ...(requestConfig?.headers ?? {})
    }
  }

  /**
   * 执行一次快手 GraphQL 请求。
   *
   * @param type - 当前请求所属的方法类型
   * @param request - GraphQL 请求描述对象
   * @param config - 附加容错配置
   * @returns 原始响应或标准化错误对象
   */
  const fetchKuaishouGraphqlPayload = (
    type: string,
    request: KuaishouGraphqlRequest,
    config?: { allowResult2?: boolean }
  ) => {
    return GlobalGetData(type, {
      ...baseRequestConfig,
      url: request.url,
      data: request.body
    }, config)
  }

  /**
   * 执行一次快手 `live_api` 请求。
   *
   * @param type - 当前请求所属的方法类型
   * @param request - `live_api` 请求描述对象
   * @param refererPath - 请求对应的页面 Referer 路径
   * @param config - 附加容错配置
   * @returns 原始响应或标准化错误对象
   */
  const fetchKuaishouLiveApiPayload = (
    type: string,
    request: KuaishouLiveApiRequest,
    refererPath: string,
    config?: { allowResult2?: boolean }
  ) => {
    return GlobalGetData(
      type,
      buildLiveApiRequestConfig(request, refererPath, cookie, requestConfig),
      config
    )
  }

  switch (data.methodType) {
    case 'videoWork': {
      return fetchKuaishouGraphqlPayload(
        data.methodType,
        kuaishouApiUrls.videoWork({ photoId: data.photoId })
      )
    }

    case 'comments': {
      return fetchKuaishouGraphqlPayload(
        data.methodType,
        kuaishouApiUrls.comments({ photoId: data.photoId })
      )
    }

    case 'userProfile': {
      const refererPath = `profile/${encodeURIComponent(data.principalId)}`
      const [
        userInfoPayload,
        sensitivePayload,
        publicPayload,
        privatePayload,
        likedPayload,
        playbackPayload,
        interestListPayload,
        interestMaskPayload,
        categoryConfigPayload,
        categoryDataPayload,
        categoryClassifyPayload,
        liveDetailPayload
      ] = await Promise.all([
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.userInfoById({ principalId: data.principalId }),
          refererPath
        ),
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.userSensitiveInfo({ principalId: data.principalId }),
          refererPath,
          {
            allowResult2: true
          }
        ),
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.profilePublic({ principalId: data.principalId }),
          refererPath,
          {
            allowResult2: true
          }
        ),
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.profilePrivate({ principalId: data.principalId }),
          refererPath,
          {
            allowResult2: true
          }
        ),
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.profileLiked({ principalId: data.principalId }),
          refererPath,
          {
            allowResult2: true
          }
        ),
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.playbackList({ principalId: data.principalId }),
          refererPath,
          {
            allowResult2: true
          }
        ),
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.profileInterestList({ principalId: data.principalId }),
          refererPath,
          {
            allowResult2: true
          }
        ),
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.interestMaskList(),
          refererPath,
          {
            allowResult2: true
          }
        ),
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.categoryConfig(),
          refererPath
        ),
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.categoryData(),
          refererPath
        ),
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.categoryClassify(),
          refererPath
        ),
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.liveDetail({ principalId: data.principalId }),
          refererPath,
          {
            allowResult2: true
          }
        )
      ])

      if (isErrorDetailLike(userInfoPayload)) {
        return userInfoPayload
      }

      const userProfile = createEmptyUserProfileResult(data.principalId)
      const userInfo = userInfoPayload?.data?.userInfo
      const sensitiveInfo = isErrorDetailLike(sensitivePayload)
        ? null
        : (sensitivePayload?.data?.sensitiveUserInfo ?? null)
      const liveDetailData = resolveKuaishouLiveDetailData(liveDetailPayload)
      const normalizedAuthor = mergeKuaishouLiveAuthor(
        liveDetailData?.author,
        userInfo,
        sensitiveInfo ?? undefined
      )
      const nextPublicData = resolveUserProfileTabData(
        publicPayload,
        userProfile.profile.publicData
      )
      const nextPrivateData = resolveUserProfileTabData(
        privatePayload,
        userProfile.profile.privateData
      )
      const nextLikedData = resolveUserProfileTabData(
        likedPayload,
        userProfile.profile.likedData
      )
      const nextPlaybackData = resolveUserProfileTabData(
        playbackPayload,
        userProfile.profile.playbackData
      )

      if (!nextPublicData.live && liveDetailData) {
        nextPublicData.live = mapLiveDetailToUserProfileLiveInfo(liveDetailData, normalizedAuthor)
      }

      const nextInterestList = !isErrorDetailLike(interestListPayload) &&
        Array.isArray(interestListPayload?.data)
        ? interestListPayload.data
        : userProfile.profile.interestList
      const nextInterestMask = !isErrorDetailLike(interestMaskPayload) &&
        Array.isArray(interestMaskPayload?.data)
        ? interestMaskPayload.data
        : userProfile.interestMask

      return {
        ...userProfile,
        principalId: data.principalId,
        author: {
          ...userProfile.author,
          principalId: data.principalId,
          userInfo: normalizedAuthor,
          sensitiveInfo,
          followInfo: {},
          banStateMap: KUAISHOU_BAN_STATE_MAP
        },
        profile: {
          ...userProfile.profile,
          pageSize: 12,
          tabTypeMap: KUAISHOU_PROFILE_TAB_TYPE_MAP,
          showPlayback: Boolean(nextPublicData.showPlayback ?? nextPlaybackData.list.length > 0),
          publicData: nextPublicData,
          privateData: nextPrivateData,
          likedData: nextLikedData,
          playbackData: nextPlaybackData,
          interestList: nextInterestList,
          currentProduct: {}
        },
        follow: createDerivedFollowState(userInfo, sensitiveInfo ?? undefined),
        followButton: createDerivedFollowButtonState(userInfo, sensitiveInfo ?? undefined),
        interestMask: nextInterestMask,
        categoryMask: {
          config: !isErrorDetailLike(categoryConfigPayload) && Array.isArray(categoryConfigPayload?.data)
            ? categoryConfigPayload.data
            : userProfile.categoryMask.config,
          list: !isErrorDetailLike(categoryClassifyPayload) &&
            Array.isArray(categoryClassifyPayload?.data?.list)
            ? categoryClassifyPayload.data.list
            : userProfile.categoryMask.list,
          hotList: !isErrorDetailLike(categoryDataPayload) &&
            Array.isArray(categoryDataPayload?.data?.list)
            ? categoryDataPayload.data.list
            : userProfile.categoryMask.hotList,
          hasMore: Boolean(categoryClassifyPayload?.data?.hasMore),
          hasMoreHot: Boolean(categoryDataPayload?.data?.hasMore)
        }
      }
    }

    case 'userWorkList': {
      const refererPath = `profile/${encodeURIComponent(data.principalId)}`
      const publicPayload = await fetchKuaishouLiveApiPayload(
        data.methodType,
        kuaishouApiUrls.userWorkList({
          principalId: data.principalId,
          pcursor: data.pcursor,
          count: data.count
        }),
        refererPath,
        {
          allowResult2: true
        }
      )

      if (isErrorDetailLike(publicPayload)) {
        return publicPayload
      }

      return resolveKuaishouUserWorkList(data.principalId, publicPayload)
    }

    case 'liveRoomInfo': {
      const refererPath = `u/${encodeURIComponent(data.principalId)}`
      const [
        liveDetailPayload,
        userInfoPayload,
        sensitivePayload,
        emojiPayload
      ] = await Promise.all([
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.liveDetail({ principalId: data.principalId }),
          refererPath,
          {
            allowResult2: true
          }
        ),
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.userInfoById({ principalId: data.principalId }),
          refererPath,
          {
            allowResult2: true
          }
        ),
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.userSensitiveInfo({ principalId: data.principalId }),
          refererPath,
          {
            allowResult2: true
          }
        ),
        fetchKuaishouGraphqlPayload(
          data.methodType,
          kuaishouApiUrls.emojiList(),
          {
            allowResult2: true
          }
        )
      ])

      if (isErrorDetailLike(liveDetailPayload)) {
        return liveDetailPayload
      }

      const liveRoomInfo = createEmptyLiveRoomInfoResult(data.principalId)
      const liveDetailData = resolveKuaishouLiveDetailData(liveDetailPayload)

      if (!liveDetailData) {
        return liveRoomInfo
      }

      const userInfo = isErrorDetailLike(userInfoPayload)
        ? undefined
        : userInfoPayload?.data?.userInfo
      const sensitiveInfo = isErrorDetailLike(sensitivePayload)
        ? undefined
        : sensitivePayload?.data?.sensitiveUserInfo
      const currentAuthor = mergeKuaishouLiveAuthor(
        liveDetailData?.author,
        userInfo,
        sensitiveInfo
      )
      const currentLiveRoomItem = mapLiveDetailToLiveRoomPlayItem(liveDetailData, currentAuthor)
      const liveStreamId = currentLiveRoomItem.liveStream?.id ??
        currentLiveRoomItem.config?.liveStreamId
      const currentGameId = liveDetailData?.gameInfo?.id ?? liveDetailData?.gameInfo?.gameId
      const liveDetailWebsocketMeta = resolveKuaishouLiveDetailWebsocketMeta(liveDetailData)
      const liveDetailRecommendList = resolveKuaishouLiveDetailRecommendList(liveDetailData)

      if (!liveStreamId) {
        return {
          ...liveRoomInfo,
          current: currentLiveRoomItem,
          playList: [currentLiveRoomItem]
        }
      }

      const shouldFetchWebsocketInfo = liveDetailWebsocketMeta.websocketUrls.length === 0 ||
        !liveDetailWebsocketMeta.token
      const shouldFetchRecommendList = liveDetailRecommendList.length === 0
      const [giftPayload, websocketPayload, recoPayload] = await Promise.all([
        fetchKuaishouLiveApiPayload(
          data.methodType,
          kuaishouApiUrls.liveGiftList(liveStreamId),
          refererPath,
          {
            allowResult2: true
          }
        ),
        shouldFetchWebsocketInfo
          ? fetchKuaishouLiveApiPayload(
            data.methodType,
            kuaishouApiUrls.liveWebsocketInfo(liveStreamId),
            refererPath,
            {
              allowResult2: true
            }
          )
          : Promise.resolve(null),
        shouldFetchRecommendList
          ? fetchKuaishouLiveApiPayload(
            data.methodType,
            kuaishouApiUrls.liveReco(currentGameId),
            refererPath,
            {
              allowResult2: true
            }
          )
          : Promise.resolve(null)
      ])

      const resolvedRecommendList = !isErrorDetailLike(recoPayload) &&
        Array.isArray(recoPayload?.data?.list)
        ? recoPayload.data.list
        : liveDetailRecommendList
      const recoPlayList = Array.isArray(resolvedRecommendList)
        ? resolvedRecommendList.map((item: Record<string, any>) => mapRecoItemToLiveRoomPlayItem(item))
        : []
      const nextPlayList = dedupeLiveRoomPlayList([
        currentLiveRoomItem,
        ...recoPlayList
      ])

      return {
        ...liveRoomInfo,
        principalId: data.principalId,
        activeIndex: 0,
        current: currentLiveRoomItem,
        playList: nextPlayList,
        websocketUrls: !isErrorDetailLike(websocketPayload) &&
          Array.isArray(websocketPayload?.data?.websocketUrls)
          ? websocketPayload.data.websocketUrls
          : liveDetailWebsocketMeta.websocketUrls,
        token: !isErrorDetailLike(websocketPayload)
          ? (websocketPayload?.data?.token ?? liveDetailWebsocketMeta.token)
          : liveDetailWebsocketMeta.token,
        noticeList: Array.isArray(liveDetailData?.noticeList)
          ? liveDetailData.noticeList
          : liveRoomInfo.noticeList,
        loading: false,
        emoji: {
          iconUrls: !isErrorDetailLike(emojiPayload) &&
            isRecord(emojiPayload?.data?.visionBaseEmoticons?.iconUrls)
            ? emojiPayload.data.visionBaseEmoticons.iconUrls
            : liveRoomInfo.emoji.iconUrls,
          giftList: !isErrorDetailLike(giftPayload) &&
            Array.isArray(giftPayload?.data?.gifts)
            ? giftPayload.data.gifts
            : liveRoomInfo.emoji.giftList,
          giftPanelList: !isErrorDetailLike(giftPayload) &&
            Array.isArray(giftPayload?.data?.giftPanelList)
            ? giftPayload.data.giftPanelList
            : liveRoomInfo.emoji.giftPanelList,
          token: !isErrorDetailLike(giftPayload)
            ? (giftPayload?.data?.token ?? liveRoomInfo.emoji.token)
            : liveRoomInfo.emoji.token,
          panelToken: !isErrorDetailLike(giftPayload)
            ? (giftPayload?.data?.panelToken ?? liveRoomInfo.emoji.panelToken)
            : liveRoomInfo.emoji.panelToken,
          longSendGiftType: !isErrorDetailLike(giftPayload)
            ? (giftPayload?.data?.longSendGiftType ?? liveRoomInfo.emoji.longSendGiftType)
            : liveRoomInfo.emoji.longSendGiftType
        }
      }
    }

    case 'emojiList': {
      return fetchKuaishouGraphqlPayload(
        data.methodType,
        kuaishouApiUrls.emojiList()
      )
    }

    default:
      logger.warn(`Unknown Kuaishou API method: "${logger.red((data as any).methodType)}"`)
      return null
  }
}

/**
 * 快手底层数据请求函数。
 *
 * 负责执行单次网络请求，并将网络错误、空响应和 `result=2`
 * 这类平台错误统一归一化为 `ErrorDetail`。
 *
 * @param type - 当前请求所属的方法类型
 * @param options - 网络请求配置选项
 * @param config - 附加容错配置
 * @returns 请求成功时返回原始响应，否则返回 `ErrorDetail`
 */
const GlobalGetData = async (
  type: string,
  options: AxiosRequestConfig,
  config?: { allowResult2?: boolean }
): Promise<any | ErrorDetail> => {
  let warningMessage = ''
  try {
    const result = await fetchData(options)

    // 处理网络层错误（自动重试后仍失败）
    if (isNetworkErrorResult(result)) {
      const networkError = new Error(result.error.amagiError.errorDescription)
      Object.assign(networkError, {
        code: result.error.code,
        data: null,
        amagiError: { ...result.error.amagiError, requestType: type }
      })
      throw networkError
    }

    if (
      result === '' ||
      !result ||
      (!config?.allowResult2 && typeof result === 'object' && result !== null && result.result === 2)
    ) {
      const Err: ErrorDetail & { requestBody: string } = {
        errorDescription: '获取响应数据失败！接口返回内容为空！',
        requestType: type ?? '未知请求类型',
        requestUrl: options.url!,
        requestBody: JSON.stringify(options.data)
      }
      warningMessage = `
      获取响应数据失败！原因：${logger.yellow('接口返回内容为空，你的快手ck可能已经失效！')}
      请求类型：「${type}」
      请求URL：${options.url}
      请求参数：${JSON.stringify(options.data, null, 2)}
      `
      logger.warn(warningMessage)
      const cookieError = new Error(Err.errorDescription)
      Object.assign(cookieError, {
        code: kuaishouAPIErrorCode.COOKIE,
        data: result,
        amagiError: Err
      })
      throw cookieError
    }
    return result
  } catch (error) {
    if (error && typeof error === 'object') {
      const err = error as ErrorDetail
      return { ...err, amagiMessage: warningMessage }
    }
    return {
      code: amagiAPIErrorCode.UNKNOWN,
      data: null,
      amagiError: {
        errorDescription: '未知错误',
        requestType: type,
        requestUrl: options.url
      },
      amagiMessage: warningMessage
    }
  }
}
