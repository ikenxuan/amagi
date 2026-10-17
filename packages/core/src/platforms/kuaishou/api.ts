import { EndpointError } from '../../contracts/error'

/**
 * 快手 URL 构造（请求描述）。
 *
 * 参数类型在本文件本地定义，只返回请求描述对象，不发起网络请求。
 * `videoWork` / `comments` / `slideFeed` 使用 H5 命名空间；`danmaku` / `emojiList` /
 * `subComments` 使用 PC GraphQL；`emotionPackageList` 与 `/rest/v/*` 那一族使用 PC REST。
 * PC REST 的 `/rest/k/` 实际请求路径与 live_api 的 `signPath` 不可混用。
 * 各接口的签名及凭据要求见对应方法的 JSDoc。
 *
 * PC 搜索与账号资料使用 `__NS_hxfalcon`，签名步骤补齐 `caver` 和 `kww`。
 * 2026-10-01 隔离游客实测：仅首页 cookie 时搜索返回 `result: 2`；官网完成
 * `/s/w/c` 注册、写入 `kwfv1` / `kwssectoken` / `kwscode` 后，两条搜索均成功。
 * 同一游客的 `profile/get` 返回 `109`，因此设备注册与账号登录不能混为一谈。
 * 游客初始化见 `guestCookie.ts`，调用方须一起传入取得的 cookie 与 User-Agent。
 *
 * 音乐标签页的响应曾在 HTML 中服务端渲染；尚未取得 `tag/music/info` 的成功
 * 浏览器 XHR，不能据单次 `result: 2` 推断该路由不向 Web 开放。
 */

// 快手的 builder 参数接口**保留手写**，不参与「从端点 schema 派生」：
// 它们的输入与校验后参数不是同一形状（comments / userWorkList 的 `pcursor` 由
// paginate 注入且 schema 里没有；userWorkList 的 `count` 是 schema `number` 的
// 重命名；danmaku 的窗口参数是切段计算的产物）。形状一致之前，强派生只会撒谎。
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
  /**
   * 过完滑块之后拿到的票据，只有 {@link API.videoWorkFull} 用：进 query、参与签名。
   * 不给就是空串 —— 前端正常请求里也是空的。
   *
   * **过风控不需要它**（2026-10-10 实测订正）：人拖一次滑块，整个 `did` 解风控，
   * 原样重发就从 `2001` 变 `result=2`。前端的回填通道只覆盖白名单 4 条路径
   * （`simple/info` / `user/profile` / `feed/profile` / `live/byUser`），`photo/info`
   * 不在其中，留这个参数只为 query 形状一致。详见 `endpoints/videoWorkFull.ts`。
   */
  captchaToken?: string
}

/** `comments` 参数 */
export interface CommentParams {
  /** 作品 ID */
  photoId: string
  /** 分页游标；为空时请求首屏评论 */
  pcursor?: string
}

/** `subComments` 参数 */
export interface SubCommentsParams {
  /** 作品 ID */
  photoId: string
  /** 根评论 ID，取 `commentListQuery` 里 `hasSubComments` 为真的那条的 `commentId` */
  rootCommentId: string
  /** 分页游标；为空时请求首屏子评论 */
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

/**
 * `/rest/v/search/*` 两条搜索接口的共用参数。
 *
 * `pcursor` 是**页号的字符串形式**（首屏传空串，响应回 `'1'`、`'2'`…），不是不透明游标；
 * `searchSessionId` 由首屏响应带回，翻页时必须回传，否则服务端按一次新搜索处理。
 */
export interface KuaishouSearchParams {
  /** 搜索关键词 */
  keyword: string
  /** 分页游标（页号字符串）；为空时请求首屏 */
  pcursor?: string
  /** 搜索会话 ID，取首屏响应的 `searchSessionId`；首屏传空串 */
  searchSessionId?: string
}
/** `emojiList` 参数（无业务字段） */
export interface EmojiListParams {}

/** `danmaku` 参数 */
export interface DanmakuParams {
  /** 作品 ID */
  photoId: string
  /** 窗口起点（毫秒，**含**） */
  positionFromInclude: number
  /**
   * 窗口终点（毫秒，**排他**）。
   *
   * 与起点的差**必须 < 60000** —— 达到 60000 时接口回 `result: 1` 但
   * `danmakus: []`，不报错、静默给空数组。窗口的收窄由端点负责，这里只描述请求。
   */
  positionToExclude: number
  /** 分页游标。弹幕不靠游标翻页（实测恒回 `no_more`），传空串即可 */
  pcursor?: string
  /** 请求时间戳，前端传 `Date.now()`；不传由构造器补 */
  timestamp?: number
}

/**
 * 弹幕查询体。
 *
 * **逆向产物，一个字都不能改** —— 字段名、缩进、换行都与前端 JS 反解出来的一致。
 */
const KUAISHOU_DANMAKU_QUERY =
  'query visionDanmaku($photoId: String, $positionFromInclude: Long, $positionToExclude: Long, $pcursor: String, $timestamp: Long) {\n  visionDanmaku(photoId: $photoId, positionFromInclude: $positionFromInclude, positionToExclude: $positionToExclude, pcursor: $pcursor, timestamp: $timestamp) {\n    result\n    positionFromInclude\n    positionToExclude\n    pcursor\n    danmakus {\n      id\n      body\n      position\n      userId\n      isLiked\n      likeCount\n      quality\n      isShow\n      __typename\n    }\n    __typename\n  }\n}'

/**
 * 子评论条目的字段集。
 *
 * **这份选择集是本仓库拼的，不是从前端抄下来的**：前端 `short-video.a77771ca.js`
 * 里这条 mutation 的两个片段槽没能从 bundle 里提出来（压缩后片段引用被改名，
 * 定位失败），所以取了同一文件里根评论片段的字段，去掉只属于根评论那一层的三个
 * （`subCommentCount` / `subCommentsPcursor` / 嵌套 `subComments`），补上回复指向的
 * `replyToUserName` / `replyTo`。2026-09-26 在浏览器里对 5 条真实根评论跑过：
 * 服务端**接受**这 12 个字段，没有报 `GRAPHQL_VALIDATION_FAILED`。
 *
 * 注意这只证明字段存在、可查 —— GraphQL 本来就按请求的选择集原样返回，所以
 * 「返回的键和这里一致」不构成额外证据。前端真正请求的字段可能比这 12 个多或少。
 *
 * **不加 `__typename`**：弹幕那条查询带它是因为反解出来就带；这条既然选择集是自己
 * 拼的，就不替前端声称一个没验过的字段（响应类型也按这 12 个键写）。
 */
const KUAISHOU_SUB_COMMENT_FIELDS =
  'commentId\n      authorId\n      authorName\n      content\n      headurl\n      timestamp\n      hasSubComments\n      likedCount\n      liked\n      status\n      replyToUserName\n      replyTo'

/**
 * 子评论查询体。
 *
 * `mutation` 不是笔误：前端 bundle 里这条读取接口就声明成 mutation（这一点是从
 * `short-video.a77771ca.js` 原文确认的），操作名、三个变量的签名同样来自那里。
 * 选择集的字段是自己拼的，见 {@link KUAISHOU_SUB_COMMENT_FIELDS} ——
 * 同一份字段分别填进 `subComments`（V1）与 `subCommentsV2`（V2）两个槽，
 * 游标 `pcursor` / `pcursorV2` 各自一个。缩进按本文件另一条 GraphQL 查询的写法归一
 * —— 服务端不校验空白。
 *
 * 三个变量全给：`photoId`、`rootCommentId`、`pcursor`（首屏传空串）。
 */
const KUAISHOU_SUB_COMMENTS_QUERY = `mutation visionSubCommentList($photoId: String, $rootCommentId: String, $pcursor: String) {\n  visionSubCommentList(photoId: $photoId, rootCommentId: $rootCommentId, pcursor: $pcursor) {\n    pcursor\n    subComments {\n      ${KUAISHOU_SUB_COMMENT_FIELDS}\n    }\n    pcursorV2\n    subCommentsV2 {\n      ${KUAISHOU_SUB_COMMENT_FIELDS}\n    }\n  }\n}`

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
  /**
   * **描述位，运行时不读** —— v6 留下的形状。签不签只看端点的 `sign` 槽位，
   * 所以这里写 `false` 而端点声明了 `sign` 的接口**照样会签**。
   */
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
 * 快手 PC 主站 REST 请求描述对象。
 *
 * `www.kuaishou.com/rest/k/*` 与 `/rest/v/*` 与 PC GraphQL 同主机、同一套平台基线头，
 * 但不是 GraphQL：请求体是普通 JSON，响应是 `{ result, ... }` 的 REST 信封。
 *
 * 注意与 {@link KuaishouLiveApiRequest} 的 `signPath` **不是一回事**：那边写的
 * `/rest/k/user/info` 一类只是 `live.kuaishou.com/live_api/*` 的**签名规范路径**，
 * 不是真实请求地址；这边的 `/rest/k/...` / `/rest/v/...` 就是真实路径，
 * 也正好是 hxfalcon 的签名路径，所以 `/rest/v/*` 的端点不需要覆盖 `signPath`。
 */
export type KuaishouPcRestRequest = KuaishouBaseApiRequest & {
  method: 'GET' | 'POST'
  body?: Record<string, unknown>
}

/**
 * 构造快手 PC 主站 REST 请求描述对象。
 *
 * 不带签名槽位、不带 `referer` 参数：这一族走 PC 主站，平台基线
 * （`config.ts` 的 `createKuaishouConfig`）的 `origin` / `referer` 已经指向
 * `www.kuaishou.com`，端点不必再覆盖。
 * @param type - 内部请求类型标识
 * @param pathname - 真实请求路径（`/rest/k/...` 或 `/rest/v/...`）
 * @param body - JSON 请求体，没有业务字段时传空对象
 * @param options - 请求方法与 query；`method` 缺省为 POST
 * @returns 可供请求层复用的请求描述对象
 */
export const createKuaishouPcRestRequest = (
  type: string,
  pathname: string,
  body: Record<string, unknown>,
  options?: { method?: 'GET' | 'POST'; query?: Record<string, KuaishouLiveApiQueryValue> }
): KuaishouPcRestRequest => {
  const url = new URL(`https://www.kuaishou.com${pathname}`)

  for (const [key, value] of Object.entries(options?.query ?? {})) {
    url.searchParams.set(key, String(value))
  }

  return {
    type,
    url: url.toString(),
    method: options?.method ?? 'POST',
    body
  }
}

/**
 * 快手 H5 命名空间的主机。
 *
 * `c.kuaishou.com` 是**微信分享页**用的那套接口（`/rest/wd/*`、
 * `/rest/wd/ugH5App/*`）。它与 PC 的 `www.kuaishou.com/graphql` 是两套独立
 * 命名空间，关键差别在鉴权：分享链接谁点开都得能看，所以 H5 这套**设计上就
 * 免账号鉴权** —— 一个自己造的设备号（did）加一个正确的签名就够。
 *
 * PC GraphQL 那一套**也不要账号**，但要的设备号更硬：得是**浏览器真正激活过的
 * `did` / `didv`**（走 `gdfp.gifshow.com` 那条注册链拿的），自己随手造一个不行。
 * 2026-09-26 实测：游客态（只有激活过的 did、没有登录态）打 `visionVideoDetail`
 * 与 `commentListQuery` 都正常返回数据；同一请求去掉 Cookie 就回
 * `{ result: 2, error_msg: null }`，连 GraphQL 信封都不给。所以「PC 必须要
 * cookie」这句话的真正含义是**必须要一个活的 did**，不是必须要登录。
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
   * 获取单个作品信息（H5 完整版 `photo/info`，**当前稳定撞风控**）。
   *
   * 这条接口回 `result=2001 antispam need captcha`，逐个变量排除后确认不是
   * 实现问题 —— 签名（错会回 `50`）、请求头、设备号（随机 did / 浏览器激活过的
   * 真实 did 都试过）、Cookie（含不发 Cookie 头）、分享页预热（H5 与 PC 页各拿
   * 一次服务端下发的 cookie）、真 share 参数（分享页给的 `webShareToken`）、
   * 数字形式 photoId —— 七条全是 2001。
   *
   * 快手自己的 H5 分享页用的是精简版 `ugH5App/photo/simple/info`，不是这一条，
   * 所以 `videoWork` 端点走精简版，这条是显式可调的完整版
   * （route `/fetch_one_work_full`）。
   *
   * 它的价值在于：是唯一可能返回图集预渲染 `mp4Url`（「App 里图集会动、下载下来
   * 却是静态图」的答案）与同类推荐 `photos` / 前几条评论 `comments` 的通道。
   * 但这三个字段在现有样本里从未出现过，收益尚未验证。
   *
   * 请求体 14 个键**全部必须存在**，缺值填空串 —— 漏了 share 系列会 `result=50`
   * 或 `result=2`。share 的值来自短链展开后的 URL query（`shareChannel` 取 `cc`）。
   * @param data - 作品参数与分享上下文
   * @returns 请求配置
   */
  videoWorkFull<T extends VideoInfoParams>(data: T): KuaishouH5Request {
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
        query: { kpn, captchaToken: data.captchaToken ?? '' }
      }
    )
  }

  /**
   * 获取单个作品信息（H5 **免签** `ugH5App/photo/simple/info`）——**主通道**。
   *
   * 三个特征：不签名、body 只有 `photoId`、一个 Cookie 头都不发。
   *
   * 它是主通道不是兜底，依据是快手自己的用法：`c.kuaishou.com/fw/photo/<id>`
   * 分享页的 SSR 内容里，`window.INIT_STATE` 就是拿这条接口的响应填的
   * （键名混淆解出来是 `/rest/wd/ugH5App/photo/simple/info`，值的形状
   * `{ result, counts, photo, serialInfo }` 与本接口一字不差）。完整版
   * {@link API.videoWorkFull} 反而稳定撞 `2001` 风控，理由见它的 JSDoc。
   *
   * 附带的好处是它不参与签名：签名是逆向产物，快手改一次前端 sig4，完整版就会
   * 开始回 `result=50`，而这条不受影响。
   * @param data - 作品参数
   * @returns 请求配置
   */
  videoWork<T extends VideoInfoParams>(data: T): KuaishouH5Request {
    return createKuaishouH5Request(
      'photoSimpleInfo',
      '/rest/wd/ugH5App/photo/simple/info',
      { photoId: data.photoId },
      { referer: h5PhotoReferer(data.photoId), requiresSign: false }
    )
  }

  /**
   * 获取作品的相关推荐（H5 **免签** `ugH5App/slide/feed`）。
   *
   * 2026-09-28 实测：不签名、不带 Cookie 头，POST `{ photoId, authorId }`
   * 回 `result: 1` 与 `data.feeds`（6 条）。`authorId` 是作品作者的**数字** `userId`，
   * 取自 {@link API.videoWork} 响应的 `photo.userId`，不是 `userEid`。
   *
   * 前端同样是这两个字段：H5 bundle 里这条的 `variables()` 返回
   * `{ photoId, authorId: …data.userId }`。
   * @param data - 作品 ID 与作者数字 ID
   * @returns 请求配置
   */
  slideFeed(data: { photoId: string; authorId: number | string }): KuaishouH5Request {
    return createKuaishouH5Request(
      'slideFeed',
      '/rest/wd/ugH5App/slide/feed',
      { photoId: data.photoId, authorId: data.authorId },
      { referer: h5PhotoReferer(data.photoId), requiresSign: false }
    )
  }

  /**
   * 获取作品评论（H5 `photo/comment/list`）。
   *
   * 走 H5 而不是 PC GraphQL 的 `commentListQuery`：H5 这套只要一个自己造的 did，
   * 而 PC 那条要浏览器真正激活过的 did（见 {@link KUAISHOU_H5_HOST}），amagi
   * 造不出来。
   *
   * 参数**必须放 body**：放 query 会拿到 `result=1` 但 0 条评论（路由表里的
   * `parameterNames` 是给 OPTIONS 预检用的，照搬到实际请求上就踩这个坑）。
   *
   * 返回 `rootComments` 与 `subCommentsMap` —— 子评论按根评论 ID 分组，
   * 不内嵌在根评论里（与 GraphQL 的嵌套形状不同）。**每条根评论固定只给 3 条
   * 子评论**，H5 这套也没有单独的子评论接口（五种路径实测全 404），要取全量走
   * {@link subComments}（PC GraphQL `visionSubCommentList`，端点 `kuaishou.commentReplies`）。
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
   * 与 `profilePublic` 共用同一条签名规范路径 `/rest/k/feed/profile` ——
   * 前端 bundle 的 `url → realUrl` 表里两者映射到同一个 realUrl，privacy 才是区分位。
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
        signPath: '/rest/k/feed/profile'
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
        signPath: '/rest/k/feed/liked'
      }
    )
  }

  /**
   * 获取用户主页兴趣推荐列表接口地址
   * @param data - 用户主页参数
   * @returns 请求配置
   */
  profileInterestList<T extends UserProfileParams>(data: T) {
    return createKuaishouLiveApiRequest(
      'profileInterestList',
      '/live_api/profile/interestlist',
      {
        caver: 2,
        limit: 4,
        principalId: data.principalId
      },
      {
        signPath: '/rest/k/pc-live/author/profile/reco'
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
        signPath: '/rest/k/playback/product/list'
      }
    )
  }

  /**
   * 获取用户主页兴趣分组接口地址。
   *
   * 相比 `profileInterestMask/list`，它更贴近用户兴趣分组语义，
   * 更适合作为领域数据源。
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

  /**
   * 获取表情包元数据及包内表情，与仅提供图标地址的 {@link API.emojiList} 不同。
   *
   * 无凭据 GET / POST 均实测成功；这里使用 POST 空对象，不签名。
   * 请求发往 `www.kuaishou.com/rest/k/emotion/package/list`，不能复用 live_api 主机。
   * @returns PC REST 请求配置
   */
  emotionPackageList(): KuaishouPcRestRequest {
    return createKuaishouPcRestRequest('emotionPackageList', '/rest/k/emotion/package/list', {})
  }

  /**
   * 搜索用户，支持官网注册后的游客 cookie。
   * 首屏三键及键序来自抓包；翻页同形状来自 PC bundle 的 fetchMore。
   * @param data - 关键词、分页游标与搜索会话 ID
   * @returns PC REST 请求配置
   */
  searchUser<T extends KuaishouSearchParams>(data: T): KuaishouPcRestRequest {
    if (data.pcursor && !data.searchSessionId) {
      throw new EndpointError({ kind: 'parse', code: 'DECODE_FAILED', message: '快手搜索分页缺少 searchSessionId' })
    }
    return createKuaishouPcRestRequest('searchUser', '/rest/v/search/user', {
      keyword: data.keyword,
      pcursor: data.pcursor ?? '',
      searchSessionId: data.searchSessionId ?? ''
    })
  }

  /**
   * 搜索作品（PC 主站 `/rest/v/search/feed`）。
   *
   * 首屏与翻页的请求体、键序来自 2026-10-01 两屏抓包。
   * 有游标却缺少搜索会话时拒绝构造请求，避免重新发起首屏搜索。
   * @param data - 关键词、分页游标与搜索会话 ID
   * @returns PC REST 请求配置
   */
  searchWorkList<T extends KuaishouSearchParams>(data: T): KuaishouPcRestRequest {
    const sessionId = data.searchSessionId ?? ''
    if (data.pcursor && !sessionId) {
      throw new EndpointError({ kind: 'parse', code: 'DECODE_FAILED', message: '快手搜索分页缺少 searchSessionId' })
    }
    const body = sessionId
      ? { keyword: data.keyword, pcursor: data.pcursor ?? '', searchSessionId: sessionId }
      : { keyword: data.keyword, page: 'search', webPageArea: '', pcursor: data.pcursor ?? '' }

    return createKuaishouPcRestRequest('searchWorkList', '/rest/v/search/feed', body)
  }

  /**
   * 取当前 cookie 所属账号的资料，不接用户 ID。
   * GET 无请求体，响应的 eid 与 userDefineId（快手号）是不同标识。
   * 需要账号登录；2026-10-01 注册游客实测返回 `result: 109`。
   * @returns PC REST 请求配置
   */
  loginUserProfile(): KuaishouPcRestRequest {
    return createKuaishouPcRestRequest('loginUserProfile', '/rest/v/profile/get', {}, { method: 'GET' })
  }

  /**
   * 获取一个时间窗口的弹幕（PC GraphQL `visionDanmaku`）。
   *
   * 与 `visionBaseEmoticons` 一样**完全免鉴权** —— 不需要签名、cookie 或 token，
   * 所以这条不跟着 `videoWork` / `comments` 换去 H5 命名空间，也没有 `signPath`。
   *
   * 两条服务端硬规则（**都在窗口参数上**，实测来源见下）：
   *
   * 1. `positionToExclude - positionFromInclude` **必须 < 60000**。达到 60000 时
   *    接口回 `result: 1` 但 `danmakus: []` —— 不报错，只是静默给空数组。
   *    边界精确到 1ms：59999 有数据、60000 没有。
   * 2. 服务端按 **30 秒分桶**返回，命中桶就给整桶，不按 from/to 精确裁剪 ——
   *    覆盖范围是桶 `[floor(from / 30000), floor((to - 1000) / 30000)]`。
   *    所以「取全量」不是把窗口开大，而是**步长 60000、宽度 59999** 连续扫，
   *    一次正好盖两个桶、不重不漏。这一步由 `endpoints/danmaku.ts` 的 `build` 做。
   * @param data - 作品 ID 与时间窗口
   * @returns 请求配置
   */
  danmaku<T extends DanmakuParams>(data: T): KuaishouGraphqlRequest {
    return {
      type: 'visionDanmaku',
      url: 'https://www.kuaishou.com/graphql',
      body: {
        operationName: 'visionDanmaku',
        variables: {
          photoId: data.photoId,
          positionFromInclude: data.positionFromInclude,
          positionToExclude: data.positionToExclude,
          // 键必须存在：缺 position 系列会回 `result: 21`
          pcursor: data.pcursor ?? '',
          timestamp: data.timestamp ?? Date.now()
        },
        query: KUAISHOU_DANMAKU_QUERY
      }
    }
  }

  /**
   * 获取一条根评论下的子评论（PC GraphQL `visionSubCommentList`）。
   *
   * H5 那套**没有**对应接口（五种路径实测全 404），`photo/comment/list` 的
   * `subCommentsMap` 每条根评论固定只给 3 条，所以取全量只有这一条通道。
   *
   * 与 `visionDanmaku` / `visionBaseEmoticons` 不同，它**不是免鉴权的**：PC GraphQL
   * 这条要一个**浏览器真正激活过的 `did` / `didv`**（见 {@link KUAISHOU_H5_HOST}）。
   * 不带 Cookie 时实测回 `errors: Need captcha` + `data.captcha`（见 `captcha.ts`）；
   * 自造 did 的情形没有单独测过，端点的 JSDoc 里写了这件事。
   *
   * 2026-09-26 在浏览器里对 5 条 `hasSubComments` 为真的根评论实测（游客态、登录态
   * 各一轮，结果一致）：数据在 **`subCommentsV2`**，V1 的 `subComments` 是空数组；
   * 首屏 `pcursor` 传空串可行，到底时 `pcursorV2` 是字面量 `'no_more'`。
   * @param data - 作品 ID、根评论 ID 与分页游标
   * @returns 请求配置
   */
  subComments<T extends SubCommentsParams>(data: T): KuaishouGraphqlRequest {
    return {
      type: 'visionSubCommentList',
      url: 'https://www.kuaishou.com/graphql',
      body: {
        operationName: 'visionSubCommentList',
        variables: {
          photoId: data.photoId,
          rootCommentId: data.rootCommentId,
          // 键必须存在：前端首屏也是显式传空串
          pcursor: data.pcursor ?? ''
        },
        query: KUAISHOU_SUB_COMMENTS_QUERY
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
