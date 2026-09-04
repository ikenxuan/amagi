/**
 * 快手 URL 构造（请求描述）。
 *
 * 从 v6 `platform/kuaishou/API.ts` 原样搬迁（行为不变，判据是 v6 的
 * `api-urls.test.ts` 快照一字不变；本文件的新测试与 v6 输出逐项对照，
 * 见 `test/platforms/kuaishou/api.test.ts`）。
 *
 * 与 v6 的结构差异：参数类型不再引用 v6 的 `types/KuaishouAPIParams.ts`
 * （阶段 6 会删），改为本地定义，字段形状与 v6 完全一致。
 *
 * `videoWork` / `comments` 两条**已换到 H5 命名空间**，与 v6 故意不同 ——
 * 见 {@link KUAISHOU_H5_HOST}。
 *
 * ## 几条刻意**没有**实现的接口（别以为是漏了）
 *
 * - **搜索 / 创作者搜索 / 热榜**（`/rest/v/search`、`/rest/v/feed/hot` 一类）：
 *   这三个要「浏览器激活过的真实 did」。真实 did 得先在浏览器里走
 *   `gdfp.gifshow.com/s/w/c` 完成设备指纹注册，**服务端有账本**，本地造不出来。
 *   对照项目实测过 5 种组合（随机 did + 借来的完整风控指纹、服务端刚下发的新 did、
 *   新 did 先走 `system/startup` 预热、Node 侧裸打 `gdfp` 注册……）全部被拒。
 *   amagi 的 did 是内部生成的，所以这条**绕不过去**，别再试。
 * - **音乐标签页**：可用做法是抓分享页 HTML 解 `INIT_STATE`，而不是打 `tag/music/*`
 *   接口。抓 HTML 解全局变量不属于「接口库」该干的事，本次不做。
 * - **相关推荐 `/rest/wd/ugH5App/slide/feed`、搜索热词 `/rest/wd/ugH5App/search/guess`**：
 *   两条都免签、都能做，只是当前没有下游需要，按需再加。
 *
 * 上述实测结论来自 @OduckO 的 kuaishou-parser（GPL-3.0-only）的 `TODO.md`：
 * https://github.com/OduckO
 */

/** `videoWork` 参数 */
export interface VideoInfoParams {
  /** 作品 ID */
  photoId: string
  /** 业务标识，H5 分享页恒为 `NEBULA` */
  kpn?: string
  /** 子业务，空串即可 */
  subBiz?: string
  /** 以下 8 个 share 字段来自短链展开后的 URL query；直接用 photoId 调用时全传空串 */
  fid?: string
  efid?: string
  shareToken?: string
  shareObjectId?: string
  shareMethod?: string
  shareId?: string
  shareResourceType?: string
  /** 分享渠道，取短链 query 里的 `cc` */
  shareChannel?: string
  /** 分享页域名，恒为 `c.kuaishou.com` */
  h5Domain?: string
  /** 是否长视频 */
  isLongVideo?: boolean
}

/** `comments` 参数 */
export interface CommentParams {
  /** 作品 ID */
  photoId: string
  /** 分页游标；为空时请求首屏评论 */
  pcursor?: string
}

/** `userProfile` / `liveRoomInfo` 参数 */
export interface UserProfileParams {
  /** 用户主页 principalId，可直接取 profile 页 URL 末段 */
  principalId: string
}

/** `userWorkList` 参数 */
export interface UserWorkListParams {
  /** 用户主页 principalId */
  principalId: string
  /** 分页游标；为空时请求首屏作品列表 */
  pcursor?: string
  /** 每页数量，默认 12 */
  count?: number
}

/** `liveRoomInfo` 参数 */
export interface LiveRoomInfoParams {
  /** 直播间 principalId，可直接取 /u/{principalId} URL 末段 */
  principalId: string
}

/** `emojiList` 参数（无业务字段） */
export interface EmojiListParams {}

/** `live_api` 请求 query 值的合法类型 */
type KuaishouLiveApiQueryValue = string | number | boolean

type KuaishouUserProfileListRequest = UserProfileParams | UserWorkListParams

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
 * 快手 H5 命名空间的主机。
 *
 * `c.kuaishou.com` 是**微信分享页**用的那套接口（`/rest/wd/*`、
 * `/rest/wd/ugH5App/*`）。它与 PC 的 `www.kuaishou.com/graphql` 是两套独立
 * 命名空间，关键差别在鉴权：分享链接谁点开都得能看，所以 H5 这套**设计上就
 * 免账号鉴权** —— 一个自己造的设备号（did）加一个正确的签名就够。
 * 而 PC GraphQL 的 `visionVideoDetail` / `commentListQuery` 对未登录返回全 null
 * 空壳，那正是 amagi 此前必须要 cookie 的原因。
 *
 * 接口形状来自 @OduckO 的 kuaishou-parser（GPL-3.0-only）：
 * https://github.com/OduckO
 */
export const KUAISHOU_H5_HOST = 'https://c.kuaishou.com'

/**
 * 快手 H5 请求描述对象。
 *
 * 与 `live_api` 的差别：H5 接口一律 POST + JSON body，参数**必须在 body 里**
 * （放 query 会拿到 `result=1` 但 0 条数据），且 body 参与签名。
 */
export type KuaishouH5Request = KuaishouBaseApiRequest & {
  method: 'POST'
  /** 是否需要 `__NS_hxfalcon`。`ugH5App/*` 那几个免签 */
  requiresSign: boolean
  /** 规范签名路径（H5 接口与公开路径一致，显式给出便于端点直接透传） */
  signPath: string
  body: Record<string, unknown>
  /** 分享页 Referer。H5 接口按分享页来源校验，桌面的 `/new-reco` 不适用 */
  referer: string
}

/**
 * 构造快手 H5 请求描述对象。
 *
 * @param type - 内部请求类型标识
 * @param pathname - 实际请求路径（同时就是签名路径）
 * @param body - JSON 请求体，参与签名
 * @param options - 分享页 Referer 与 query；`requiresSign` 缺省为 true
 * @returns 可供请求层和签名层复用的请求描述对象
 */
export const createKuaishouH5Request = (
  type: string,
  pathname: string,
  body: Record<string, unknown>,
  options: { referer: string; query?: Record<string, KuaishouLiveApiQueryValue>; requiresSign?: boolean }
): KuaishouH5Request => {
  const url = new URL(`${KUAISHOU_H5_HOST}${pathname}`)

  for (const [key, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(key, String(value))
  }

  return {
    type,
    url: url.toString(),
    method: 'POST',
    requiresSign: options.requiresSign ?? true,
    signPath: pathname,
    body,
    referer: options.referer
  }
}

/** 分享页 Referer：H5 接口的来源页就是 `fw/photo/<photoId>` */
const h5PhotoReferer = (photoId: string): string => `${KUAISHOU_H5_HOST}/fw/photo/${photoId}`

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
   * 获取单个作品信息（H5 完整版 `photo/info`）。
   *
   * 从 PC GraphQL 的 `visionVideoDetail` 换过来。换的理由不是「这个接口更好」，
   * 而是 GraphQL 那条**未登录拿不到数据**：对匿名请求返回
   * `{ data: { visionVideoDetail: null } }` 这种空壳，amagi 只能靠 cookie 顶着。
   * H5 这条是微信分享页接口，设计上免账号鉴权。
   *
   * 净收益是两样 GraphQL 拿不到的东西：图集预渲染的 `mp4Url`（「App 里图集会动、
   * 下载下来却是静态图」的答案）与 `atlas` / `single` 结构。
   *
   * 请求体 14 个键**全部必须存在**，缺值填空串 —— 漏了 share 系列会 `result=50`
   * 或 `result=2`。share 的值来自短链展开后的 URL query（`shareChannel` 取 `cc`）；
   * 直接用 photoId 调用时全填空串也能通。
   *
   * 接口形状来自 @OduckO 的 kuaishou-parser（GPL-3.0-only）`API.ts:177-219`，
   * 其 `TODO.md:11-20` 记了 mp4Url 的实测。
   * @param data - 作品参数与分享上下文
   * @returns 请求配置
   */
  videoWork<T extends VideoInfoParams>(data: T): KuaishouH5Request {
    const kpn = data.kpn ?? 'NEBULA'
    return createKuaishouH5Request(
      'photoInfo',
      '/rest/wd/photo/info',
      {
        fid: data.fid ?? '',
        efid: data.efid ?? '',
        shareToken: data.shareToken ?? '',
        shareObjectId: data.shareObjectId ?? '',
        shareMethod: data.shareMethod ?? '',
        shareId: data.shareId ?? '',
        shareResourceType: data.shareResourceType ?? '',
        shareChannel: data.shareChannel ?? '',
        kpn,
        subBiz: data.subBiz ?? '',
        // 前端硬编码的常量，照抄
        env: 'SHARE_VIEWER_ENV_TX_TRICK',
        h5Domain: data.h5Domain ?? 'c.kuaishou.com',
        photoId: data.photoId,
        isLongVideo: data.isLongVideo ?? false
      },
      {
        referer: h5PhotoReferer(data.photoId),
        // kpn 与 captchaToken 都要进 query 并参与签名（前端两个 interceptor 依次追加）
        query: { kpn, captchaToken: '' }
      }
    )
  }

  /**
   * 获取单个作品信息（H5 **免签**精简版 `ugH5App/photo/simple/info`）。
   *
   * 与完整版是「精简 / 完整」的关系：这条不需要签名、body 只有 `photoId`、
   * 一个 Cookie 头都不发，但字段少（没有 `mp4Url`、没有同类推荐、没有前几条评论）。
   *
   * 存在的意义是**安全网**：签名是逆向产物，快手改了前端 sig4 就会失效。
   * 完整版失败时回落到这条，整条功能不至于一起挂掉。
   * @param data - 作品参数
   * @returns 请求配置
   */
  videoWorkSimple<T extends VideoInfoParams>(data: T): KuaishouH5Request {
    return createKuaishouH5Request(
      'photoSimpleInfo',
      '/rest/wd/ugH5App/photo/simple/info',
      { photoId: data.photoId },
      { referer: h5PhotoReferer(data.photoId), requiresSign: false }
    )
  }

  /**
   * 获取作品评论（H5 `photo/comment/list`）。
   *
   * 同样从 PC GraphQL 的 `commentListQuery` 换过来 —— 那条未登录返回全 null 空壳。
   *
   * 参数**必须放 body**：放 query 会拿到 `result=1` 但 0 条评论（对照项目
   * `TODO.md:197-199`，它路由表里的 `parameterNames` 是 OPTIONS 预检用的，
   * 照搬到实际请求上就踩这个坑）。
   *
   * 返回 `rootComments` 与 `subCommentsMap` —— 子评论按根评论 ID 分组，
   * 不内嵌在根评论里（与 GraphQL 的嵌套形状不同）。
   * @param data - 评论参数
   * @returns 请求配置
   */
  comments<T extends CommentParams>(data: T): KuaishouH5Request {
    return createKuaishouH5Request(
      'commentList',
      '/rest/wd/photo/comment/list',
      { photoId: data.photoId, pcursor: data.pcursor ?? '' },
      { referer: h5PhotoReferer(data.photoId) }
    )
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
  userInfoById<T extends UserProfileParams>(data: T) {
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
  userSensitiveInfo<T extends UserProfileParams>(data: T) {
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
  profilePublic<T extends KuaishouUserProfileListRequest>(data: T) {
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
  userWorkList<T extends UserWorkListParams>(data: T) {
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
  profilePrivate<T extends UserProfileParams>(data: T) {
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
  profileLiked<T extends UserProfileParams>(data: T) {
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
  profileInterestList<T extends UserProfileParams>(data: T) {
    return createKuaishouLiveApiRequest('profileInterestList', '/live_api/profile/interestlist', {
      caver: 2,
      limit: 4,
      principalId: data.principalId
    })
  }

  /**
   * 获取主播回放列表接口地址。
   *
   * 快手页面使用 `cursor` 作为翻页参数，而返回体里仍沿用 `pcursor`。
   *
   * @param data - 用户主页参数
   * @returns 请求配置
   */
  playbackList<T extends UserProfileParams>(data: T) {
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
  interestMaskList() {
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
  categoryConfig() {
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
  categoryData() {
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
  categoryClassify() {
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
  liveDetail<T extends LiveRoomInfoParams>(data: T, authToken?: string) {
    const query: Record<string, KuaishouLiveApiQueryValue> = {
      principalId: data.principalId
    }

    if (authToken?.trim()) {
      query.authToken = authToken.trim()
    }

    return createKuaishouLiveApiRequest('liveDetail', '/live_api/liveroom/livedetail', query, {
      requiresSign: false
    })
  }

  /**
   * 获取当前登录用户关注中的开播列表接口地址。
   *
   * 该接口更接近“关注流”而不是“当前直播间详情”，
   * 因此不应再作为直播间主对象的首选来源。
   *
   * @returns 请求配置
   */
  userFollowCount() {
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
  liveReco(gameId?: number | string) {
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
  liveWebsocketInfo(liveStreamId: string) {
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
  liveGiftList(liveStreamId: string) {
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
  emojiList(): KuaishouGraphqlRequest {
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
