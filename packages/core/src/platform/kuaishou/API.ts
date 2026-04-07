import { OmitMethodType } from 'amagi/types'
import { KuaishouMethodOptionsMap } from 'amagi/types/KuaishouAPIParams'

/**
 * 根据 KuaishouMethodOptionsMap 创建一个新的类型，去除每个字段中的 methodType
 */
type KuaishouMethodOptionsWithoutMethodType = {
  [K in keyof KuaishouMethodOptionsMap]: OmitMethodType<KuaishouMethodOptionsMap[K]>
}

type KuaishouLiveApiQueryValue = string | number | boolean
type KuaishouUserProfileListRequest =
  KuaishouMethodOptionsWithoutMethodType['UserProfileParams'] |
  KuaishouMethodOptionsWithoutMethodType['UserWorkListParams']

type KuaishouBaseApiRequest = {
  type: string
  url: string
}

/**
 * 快手 `live_api` 请求描述对象。
 *
 * 除了最终请求地址外，还可以携带 `signPath`，用于声明
 * `__NS_hxfalcon` 实际参与签名的规范路径。
 */
export type KuaishouLiveApiRequest = KuaishouBaseApiRequest & {
  method: 'GET' | 'POST'
  requiresSign?: boolean
  signPath?: string
  body?: Record<string, unknown>
}

/**
 * 快手 GraphQL 请求描述对象。
 *
 * 该结构只负责描述请求，不负责执行网络请求。
 */
export type KuaishouGraphqlRequest = KuaishouBaseApiRequest & {
  body: {
    operationName: string
    variables: Record<string, unknown>
    query: string
  }
}

/**
 * 构造快手 `live_api` 请求描述对象。
 *
 * 之所以将 `signPath` 放在 API 描述层，而不是放进签名器内部硬编码，
 * 是为了让“接口公开路径”和“算法规范路径”的关系显式可见。
 *
 * @param type - 内部请求类型标识
 * @param pathname - 实际请求路径
 * @param query - 要拼接到 URL 上的查询参数
 * @param signPath - 可选的签名规范路径；当页面路径与算法路径不一致时必须传入
 * @returns 可供请求层和签名层复用的请求描述对象
 */
export const createKuaishouLiveApiRequest = (
  type: string,
  pathname: string,
  query: Record<string, KuaishouLiveApiQueryValue>,
  options?: {
    body?: Record<string, unknown>
    method?: 'GET' | 'POST'
    requiresSign?: boolean
    signPath?: string
  }
): KuaishouLiveApiRequest => {
  const url = new URL(`https://live.kuaishou.com${pathname}`)

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value))
  }

  return {
    type,
    url: url.toString(),
    method: options?.method ?? 'GET',
    ...(typeof options?.requiresSign === 'boolean' ? { requiresSign: options.requiresSign } : {}),
    ...(options?.signPath ? { signPath: options.signPath } : {}),
    ...(options?.body ? { body: options.body } : {})
  }
}

/**
 * 快手 API 地址构建类
 * 该类下的方法只负责返回请求描述对象，需要手动请求对应地址以获取数据。
 * 其中 `live_api` 方法会在必要时额外携带 `signPath`，用于声明快手签名算法实际参与计算的规范路径。
 */
class API {
  /**
   * 获取单个作品信息
   * @param data - 作品参数
   * @returns 请求配置
   */
  videoWork<T extends KuaishouMethodOptionsWithoutMethodType['VideoInfoParams']> (data: T): KuaishouGraphqlRequest {
    return {
      /** 接口类型 */
      type: 'visionVideoDetail',
      /** 请求url */
      url: 'https://www.kuaishou.com/graphql',
      /** 请求参数 */
      body: {
        /** 接口类型 */
        operationName: 'visionVideoDetail',
        variables: {
          /** 作品ID */
          photoId: data.photoId,
          page: 'detail'
        },
        query: 'query visionVideoDetail($photoId: String, $type: String, $page: String, $webPageArea: String) {\n  visionVideoDetail(photoId: $photoId, type: $type, page: $page, webPageArea: $webPageArea) {\n    status\n    type\n    author {\n      id\n      name\n      following\n      headerUrl\n      __typename\n    }\n    photo {\n      id\n      duration\n      caption\n      likeCount\n      realLikeCount\n      coverUrl\n      photoUrl\n      liked\n      timestamp\n      expTag\n      llsid\n      viewCount\n      videoRatio\n      stereoType\n      musicBlocked\n      manifest {\n        mediaType\n        businessType\n        version\n        adaptationSet {\n          id\n          duration\n          representation {\n            id\n            defaultSelect\n            backupUrl\n            codecs\n            url\n            height\n            width\n            avgBitrate\n            maxBitrate\n            m3u8Slice\n            qualityType\n            qualityLabel\n            frameRate\n            featureP2sp\n            hidden\n            disableAdaptive\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      manifestH265\n      photoH265Url\n      coronaCropManifest\n      coronaCropManifestH265\n      croppedPhotoH265Url\n      croppedPhotoUrl\n      videoResource\n      __typename\n    }\n    tags {\n      type\n      name\n      __typename\n    }\n    commentLimit {\n      canAddComment\n      __typename\n    }\n    llsid\n    danmakuSwitch\n    __typename\n  }\n}\n'
      }
    }
  }

  /**
   * 获取作品评论信息
   * @param data - 评论参数
   * @returns 请求配置
   */
  comments<T extends KuaishouMethodOptionsWithoutMethodType['CommentParams']> (data: T): KuaishouGraphqlRequest {
    return {
      type: 'commentListQuery',
      url: 'https://www.kuaishou.com/graphql',
      body: {
        operationName: 'commentListQuery',
        variables: {
          photoId: data.photoId,
          pcursor: ''
        },
        query: 'query commentListQuery($photoId: String, $pcursor: String) {\n  visionCommentList(photoId: $photoId, pcursor: $pcursor) {\n    commentCount\n    pcursor\n    rootComments {\n      commentId\n      authorId\n      authorName\n      content\n      headurl\n      timestamp\n      likedCount\n      realLikedCount\n      liked\n      status\n      authorLiked\n      subCommentCount\n      subCommentsPcursor\n      subComments {\n        commentId\n        authorId\n        authorName\n        content\n        headurl\n        timestamp\n        likedCount\n        realLikedCount\n        liked\n        status\n        authorLiked\n        replyToUserName\n        replyTo\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n'
      }
    }
  }

  /**
   * 获取用户主页基础资料接口地址。
   *
   * 该接口需要 `__NS_hxfalcon`，且签名使用的规范路径并不是公开 `live_api`
   * 路径，而是内部的 `/rest/k/user/info`。
   *
   * @param data - 用户主页参数
   * @returns 请求配置
   */
  userInfoById<T extends KuaishouMethodOptionsWithoutMethodType['UserProfileParams']> (data: T) {
    return createKuaishouLiveApiRequest(
      'userInfoById',
      '/live_api/baseuser/userinfo/byid',
      {
        caver: 2,
        principalId: data.principalId
      },
      {
        signPath: '/rest/k/user/info'
      }
    )
  }

  /**
   * 获取用户敏感资料接口地址
   * @param data - 用户主页参数
   * @returns 请求配置
   */
  userSensitiveInfo<T extends KuaishouMethodOptionsWithoutMethodType['UserProfileParams']> (data: T) {
    return createKuaishouLiveApiRequest(
      'userSensitiveInfo',
      '/live_api/baseuser/userinfo/sensitive',
      {
        caver: 2,
        principalId: data.principalId
      },
      {
        signPath: '/rest/k/user/info/sensitive'
      }
    )
  }

  /**
   * 获取用户主页公开数据接口地址
   * @param data - 用户主页参数
   * @returns 请求配置
   */
  profilePublic<T extends KuaishouUserProfileListRequest> (data: T) {
    const count = 'count' in data ? (data.count ?? 12) : 12
    const pcursor = 'pcursor' in data ? (data.pcursor ?? '') : ''

    return createKuaishouLiveApiRequest(
      'profilePublic',
      '/live_api/profile/public',
      {
        caver: 2,
        count,
        hasMore: true,
        pcursor,
        principalId: data.principalId,
        privacy: 'public'
      },
      {
        signPath: '/rest/k/feed/profile'
      }
    )
  }

  /**
   * 获取用户主页公开视频列表接口地址。
   *
   * 该方法对 `live_api/profile/public` 做领域化封装，
   * 用于独立承接用户作品列表与分页能力。
   *
   * @param data - 用户作品列表参数
   * @returns 请求配置
   */
  userWorkList<T extends KuaishouMethodOptionsWithoutMethodType['UserWorkListParams']> (data: T) {
    return {
      ...this.profilePublic(data),
      type: 'userWorkList'
    }
  }

  /**
   * 获取用户主页私密列表接口地址。
   *
   * 真实页面抓包表明该接口可以直接走纯协议请求，不必额外追加 `__NS_hxfalcon`。
   *
   * @param data - 用户主页参数
   * @returns 请求配置
   */
  profilePrivate<T extends KuaishouMethodOptionsWithoutMethodType['UserProfileParams']> (data: T) {
    return createKuaishouLiveApiRequest(
      'profilePrivate',
      '/live_api/profile/private',
      {
        caver: 2,
        count: 12,
        hasMore: true,
        pcursor: '',
        principalId: data.principalId,
        privacy: 'private'
      },
      {
        requiresSign: false
      }
    )
  }

  /**
   * 获取用户主页点赞列表接口地址。
   *
   * @param data - 用户主页参数
   * @returns 请求配置
   */
  profileLiked<T extends KuaishouMethodOptionsWithoutMethodType['UserProfileParams']> (data: T) {
    return createKuaishouLiveApiRequest(
      'profileLiked',
      '/live_api/profile/liked',
      {
        caver: 2,
        count: 12,
        hasMore: true,
        pcursor: '',
        principalId: data.principalId,
        privacy: 'liked'
      },
      {
        requiresSign: false
      }
    )
  }

  /**
   * 获取用户主页兴趣推荐列表接口地址
   * @param data - 用户主页参数
   * @returns 请求配置
   */
  profileInterestList<T extends KuaishouMethodOptionsWithoutMethodType['UserProfileParams']> (data: T) {
    return createKuaishouLiveApiRequest(
      'profileInterestList',
      '/live_api/profile/interestlist',
      {
        caver: 2,
        limit: 4,
        principalId: data.principalId
      }
    )
  }

  /**
   * 获取主播回放列表接口地址。
   *
   * 快手页面使用 `cursor` 作为翻页参数，而返回体里仍沿用 `pcursor`。
   *
   * @param data - 用户主页参数
   * @returns 请求配置
   */
  playbackList<T extends KuaishouMethodOptionsWithoutMethodType['UserProfileParams']> (data: T) {
    return createKuaishouLiveApiRequest(
      'playbackList',
      '/live_api/playback/list',
      {
        principalId: data.principalId,
        count: 12,
        cursor: '',
        hasMore: true
      },
      {
        requiresSign: false
      }
    )
  }

  /**
   * 获取用户主页兴趣分组接口地址。
   *
   * `interestMask/list` 是当前协议链中更贴近用户兴趣分组语义的接口，
   * 相比旧的 `profileInterestMask/list` 更适合作为领域数据源。
   *
   * @returns 请求配置
   */
  interestMaskList () {
    return createKuaishouLiveApiRequest(
      'interestMaskList',
      '/live_api/interestMask/list',
      {},
      {
        requiresSign: false
      }
    )
  }

  /**
   * 获取分类配置接口地址。
   *
   * 该接口可用于构造用户主页 `categoryMask.config`。
   *
   * @returns 请求配置
   */
  categoryConfig () {
    return createKuaishouLiveApiRequest(
      'categoryConfig',
      '/live_api/category/config',
      {},
      {
        requiresSign: false
      }
    )
  }

  /**
   * 获取热门分类列表接口地址。
   *
   * 该接口提供完整的分类卡片字段，可直接映射到
   * 用户主页 `categoryMask.hotList`。
   *
   * @returns 请求配置
   */
  categoryData () {
    return createKuaishouLiveApiRequest(
      'categoryData',
      '/live_api/category/data',
      {},
      {
        requiresSign: false
      }
    )
  }

  /**
   * 获取分类分组列表接口地址。
   *
   * @returns 请求配置
   */
  categoryClassify () {
    return createKuaishouLiveApiRequest(
      'categoryClassify',
      '/live_api/category/classify',
      {
        type: 4,
        source: 2,
        page: 1,
        pageSize: 20
      },
      {
        requiresSign: false
      }
    )
  }

  /**
   * 获取直播间详情主接口地址。
   *
   * 真实页面 store 会用该接口按 `principalId` 获取当前房间主体，
   * 返回结构中直接包含 `liveStream`、`author`、`gameInfo`、`noticeList`
   * 与基础 `config`，比 `userFollowCount` 更符合“直播间详情”语义。
   *
   * @param data - 直播间参数
   * @param authToken - 私密房间等场景下可能需要的 authToken
   * @returns 请求配置
   */
  liveDetail<T extends KuaishouMethodOptionsWithoutMethodType['LiveRoomInfoParams']> (
    data: T,
    authToken?: string
  ) {
    const query: Record<string, KuaishouLiveApiQueryValue> = {
      principalId: data.principalId
    }

    if (authToken?.trim()) {
      query.authToken = authToken.trim()
    }

    return createKuaishouLiveApiRequest(
      'liveDetail',
      '/live_api/liveroom/livedetail',
      query,
      {
        requiresSign: false
      }
    )
  }

  /**
   * 获取当前登录用户关注中的开播列表接口地址。
   *
   * 该接口更接近“关注流”而不是“当前直播间详情”，
   * 因此不应再作为直播间主对象的首选来源。
   *
   * @returns 请求配置
   */
  userFollowCount () {
    return createKuaishouLiveApiRequest(
      'userFollowCount',
      '/live_api/baseuser/userFollowCount',
      {},
      {
        requiresSign: false
      }
    )
  }

  /**
   * 获取直播间推荐流接口地址。
   *
   * 该接口使用 POST JSON，请求体中的 `gameFavour`
   * 会影响推荐房间列表的主题偏好。
   *
   * @param gameId - 当前直播房间所属游戏 ID
   * @returns 请求配置
   */
  liveReco (gameId?: number | string) {
    const normalizedGameId = Number(gameId) > 0 ? Number(gameId) : 1001

    return createKuaishouLiveApiRequest(
      'liveReco',
      '/live_api/liveroom/reco',
      {},
      {
        method: 'POST',
        requiresSign: false,
        body: {
          followingParam: {
            queryFollowing: true,
            followingWeight: 50
          },
          gameFavour: [
            {
              gameId: normalizedGameId,
              totalStayLength: 100
            }
          ]
        }
      }
    )
  }

  /**
   * 获取直播间 WebSocket 元信息接口地址。
   *
   * @param liveStreamId - 直播流 ID
   * @returns 请求配置
   */
  liveWebsocketInfo (liveStreamId: string) {
    return createKuaishouLiveApiRequest(
      'liveWebsocketInfo',
      '/live_api/liveroom/websocketinfo',
      {
        caver: 2,
        liveStreamId
      },
      {
        signPath: '/rest/k/live/websocket/info'
      }
    )
  }

  /**
   * 获取直播间礼物列表接口地址
   * @param liveStreamId - 直播流 ID
   * @returns 请求配置
   */
  liveGiftList (liveStreamId: string) {
    return createKuaishouLiveApiRequest(
      'liveGiftList',
      '/live_api/emoji/gift-list',
      {
        liveStreamId
      },
      {
        requiresSign: false
      }
    )
  }

  /**
   * 获取表情列表
   * @returns 请求配置
   */
  emojiList (): KuaishouGraphqlRequest {
    return {
      type: 'visionBaseEmoticons',
      url: 'https://www.kuaishou.com/graphql',
      body: {
        operationName: 'visionBaseEmoticons',
        variables: {},
        query: 'query visionBaseEmoticons {\n  visionBaseEmoticons {\n    iconUrls\n    __typename\n  }\n}\n'
      }
    }
  }
}

/**
 * 快手 API 请求描述集合。
 *
 * 该对象只负责返回请求描述，不直接发起网络请求。
 */
export const kuaishouApiUrls = new API()
