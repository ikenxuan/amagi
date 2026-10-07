/**
 * 抖音 URL 构造（请求描述）。
 *
 * 参数类型本地定义，字段形状与平台接口一致；URL 与查询串的拼法与旧版行为相同。
 */
import type { ParsedOf } from '../../contracts/endpoint'
import { DEFAULT_UA } from '../../contracts/ua'
import { DOUYIN_PROCESS_FP } from './deviceFp'
import type { commentReplies } from './endpoints/commentReplies'
import type { comments } from './endpoints/comments'
import type { danmakuList } from './endpoints/danmakuList'
import type { guestMusicAwemeList } from './endpoints/guestMusicAwemeList'
import type { guestMusicInfo } from './endpoints/guestMusicInfo'
import type { guestUserInfo } from './endpoints/guestUserInfo'
import type { liveRoomInfo } from './endpoints/liveRoomInfo'
import type { loginQrcode } from './endpoints/loginQrcode'
import type { musicInfo } from './endpoints/musicInfo'
import type { search } from './endpoints/search'
import type { suggestWords } from './endpoints/suggestWords'
import type { userProfile } from './endpoints/userProfile'
import type { userVideoList } from './endpoints/userVideoList'
import type { videoWork } from './endpoints/videoWork'
import { WEB_SEARCH_VERSION_OVERRIDE, WEB_WORKDETAIL_VERSION_OVERRIDE, webQuery } from './webParams'

/** `parseWork` / `videoWork` 等作品类参数 */
export interface WorkParams extends ParsedOf<typeof videoWork> {}

/** `comments` 参数 */
export interface CommentsParams extends ParsedOf<typeof comments> {}

/** `commentReplies` 参数 */
export interface CommentRepliesParams extends ParsedOf<typeof commentReplies> {}

/** `userVideoList` / `userFavoriteList` / `userRecommendList` 参数 */
export interface UserListParams extends ParsedOf<typeof userVideoList> {}

/** `userProfile` 参数 */
export interface UserProfileParams extends ParsedOf<typeof userProfile> {}

/** `suggestWords` 参数 */
export interface SuggestWordsParams extends ParsedOf<typeof suggestWords> {}

/** `search` 参数 */
export interface SearchParams extends ParsedOf<typeof search> {}

/** `musicInfo` 参数 */
export interface MusicInfoParams extends ParsedOf<typeof musicInfo> {}

/** `liveRoomInfo` 参数 */
export interface LiveRoomInfoParams extends ParsedOf<typeof liveRoomInfo> {}

/** `loginQrcode` 参数 */
export interface LoginQrcodeParams extends ParsedOf<typeof loginQrcode> {}

/** `danmakuList` 参数 */
export interface DanmakuListParams extends ParsedOf<typeof danmakuList> {}

/** `guestUserInfo` 参数 */
export interface GuestUserParams extends ParsedOf<typeof guestUserInfo> {}

/** `guestMusicInfo` 参数 */
export interface GuestMusicParams extends ParsedOf<typeof guestMusicInfo> {}

/** `guestMusicAwemeList` 参数 */
export interface GuestMusicListParams extends ParsedOf<typeof guestMusicAwemeList> {}

/** 合集作品列表参数 */
export interface MixAwemeParams {
  mix_id: string
  number?: number
  cursor?: number
}

/** 去除 methodType 字段后的参数类型 */
type DouyinMethodOptionsWithoutMethodType = {
  parseWork: WorkParams
  videoWork: WorkParams
  imageAlbumWork: WorkParams
  slidesWork: WorkParams
  textWork: WorkParams
  comments: CommentsParams
  commentReplies: CommentRepliesParams
  userVideoList: UserListParams
  mixAweme: MixAwemeParams
  userFavoriteList: UserListParams
  userRecommendList: UserListParams
  userProfile: UserProfileParams
  suggestWords: SuggestWordsParams
  search: SearchParams
  musicInfo: MusicInfoParams
  liveRoomInfo: LiveRoomInfoParams
  loginQrcode: LoginQrcodeParams
  danmakuList: DanmakuListParams
  guestUserInfo: GuestUserParams
  guestMusicInfo: GuestMusicParams
  guestMusicAwemeList: GuestMusicListParams
}

/**
 * 从 User-Agent 中提取浏览器版本信息
 *
 * @param userAgent - 用户代理字符串
 * @returns 浏览器版本号；认不出时取 `DEFAULT_UA` 的版本，与请求头默认 UA 同源
 */
const extractBrowserVersion = (userAgent = DEFAULT_UA): string => {
  const chromeMatch = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/)
  if (chromeMatch) {
    return chromeMatch[1]
  }

  const edgeMatch = userAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/)
  if (edgeMatch) {
    return edgeMatch[1]
  }

  return DEFAULT_UA.match(/Chrome\/([\d.]+)/)?.[1] ?? '142.0.0.0'
}

/**
 * 将参数对象转换为 URL 查询字符串
 *
 * @param params - 参数对象
 * @returns URL 查询字符串
 */
const buildQueryString = (params: Record<string, any>): string => {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
}

/**
 * 版式之外那几条（`iesdouyin` 动图 / `live.douyin.com` 直播间）用的指纹。
 *
 * 它们的 query 不是 `/aweme/v1/web/*` 的三段式，签名链也不替它们追加 tail，
 * 所以 `verifyFp` / `fp` 仍由构造期写入；真实 cookie 下由
 * {@link withDouyinDeviceFp} 在签名前原位覆盖。
 */
const fp = DOUYIN_PROCESS_FP

/** iesdouyin v2 游客接口前缀：不需要 cookie、不需要签名 */
const GUEST_BASE = 'https://www.iesdouyin.com/web/api/v2'

/** 表情资源包元信息，走 App 接口，同样免鉴权（需要 Android UA，由端点声明覆盖） */
const EMOJI_RESOURCE_URL = 'https://api.amemv.com/aweme/v1/im/resources/emoji/?device_platform=android&version_name=17.4.0'

/**
 * 抖音 API URL 构建类
 *
 * 提供所有抖音 API 的 URL 构建方法
 */
class DouyinAPI {
  browserVersion: string

  /**
   * 构造函数
   *
   * @param userAgent - 用户代理字符串，用于提取浏览器版本信息
   */
  constructor(userAgent?: string) {
    this.browserVersion = extractBrowserVersion(userAgent)
  }

  /**
   * 获取视频或图集数据
   *
   * 带视频页自带的两个参数（`request_source` / `origin_type`），版本号用本端点特有的
   * `190500`（2026-09-23 浏览器抓包：只有 `aweme/detail` 发这个值，其余端点发 `170400`）。
   *
   * 早先改走 `www-hj` 边缘是因为 `www.douyin.com` 上 9/18 被 Argus 拦；那一版 query 缺
   * 能力参数、分辨率也不一致。参数补齐后 2026-09-26 实测 `www.douyin.com` 登录态、
   * 游客各 9/9 通过，浏览器打的也是 `www`，而 `www-hj` 与 `sec-fetch-site: same-origin`
   * 的请求头对不上，所以改回 `www`。端点侧的重试仍然保留。
   *
   * 五个作品类端点（parseWork / videoWork / imageAlbumWork / slidesWork / textWork）
   * 都走这一条。
   */
  getWorkDetail(data: DouyinMethodOptionsWithoutMethodType['parseWork']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/aweme/detail/'
    const params = webQuery(
      this.browserVersion,
      { aweme_id: data.aweme_id, request_source: '600', origin_type: 'video_page' },
      { env: WEB_WORKDETAIL_VERSION_OVERRIDE }
    )
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
   * 获取评论数据
   *
   * 不发 `insert_ids`：2026-10-05 抓包里浏览器的 `comment/list` 只有
   * `aweme_id,cursor,count,item_type,whale_cut_token,cut_version,rcFT` 七个，
   * 没有这一项。它原是「把指定评论置顶」用的，列表请求里恒为空串。
   */
  getComments(data: DouyinMethodOptionsWithoutMethodType['comments']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/comment/list/'
    const params = webQuery(this.browserVersion, {
      aweme_id: data.aweme_id,
      cursor: data.cursor ?? 0,
      count: data.number ?? 50,
      item_type: '0',
      whale_cut_token: '',
      cut_version: '1',
      rcFT: ''
    })
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /** 获取二级评论数据 */
  getCommentReplies(data: DouyinMethodOptionsWithoutMethodType['commentReplies']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/comment/list/reply/'
    const params = webQuery(this.browserVersion, {
      item_id: data.aweme_id,
      comment_id: data.comment_id,
      cut_version: '1',
      cursor: data.cursor ?? 0,
      count: data.number,
      item_type: '0'
    })
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /** 获取动图数据 */
  getSlidesInfo(data: DouyinMethodOptionsWithoutMethodType['parseWork']): string {
    const baseUrl = 'https://www.iesdouyin.com/web/api/v2/aweme/slidesinfo/'
    const params = {
      reflow_source: 'reflow_page',
      web_id: '7326472315356857893',
      device_id: '7326472315356857893',
      aweme_ids: `[${data.aweme_id}]`,
      request_source: '200',
      verifyFp: fp,
      fp
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
   * 获取表情数据。
   *
   * 不发 `publish_video_strategy_type`：2026-10-05 的两份抓包在这个键上**互相矛盾**，
   * 而矛盾本身说明了它归谁管 —— 它跟着**页面**走，不跟着端点走：
   *
   * ```text
   * 页面 /jingxuan                  → 35 键，无 pvst
   * 页面 /video/7691714748324351242 → 36 键，pvst=2
   * ```
   *
   * 同一个 `emoji/list` 端点、同一个浏览器、相隔两小时。所以它不是这条接口的参数，
   * 是那个页面的 bundle 往自己发的所有请求上统一贴的东西（`aweme/favorite` 两份抓包
   * 都有、`aweme/detail` 两份都没有，也符合「按页面而非按端点」）。
   *
   * amagi 不带 Referer 发这条（它不在 `referer.ts` 那十一个端点里），也就没有「当前页面」
   * 这个概念，于是取不贴的那一份 —— 与 `/jingxuan` capture 逐键一致。贴上反而会与
   * 自己不发 Referer 的事实矛盾。
   */
  getEmojiList(): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/emoji/list'
    const params = webQuery(this.browserVersion, {
      /** 缺少该参数只会返回常规表情（214 个），带上才含限时、联名、节日表情（371 个） */
      need_all: 'true'
    })
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /** 抖音号（unique_id）转用户信息，唯一免签名的 sec_uid 获取途径 */
  getGuestUserInfo(data: DouyinMethodOptionsWithoutMethodType['guestUserInfo']): string {
    return `${GUEST_BASE}/user/info/?${buildQueryString({ unique_id: data.unique_id })}`
  }

  /** 获取原声本体，响应中没有 play_url，mp3 需从源作品上取 */
  getGuestMusicInfo(data: DouyinMethodOptionsWithoutMethodType['guestMusicInfo']): string {
    return `${GUEST_BASE}/music/info/?${buildQueryString({ music_id: data.music_id })}`
  }

  /** 获取使用某原声的作品列表，每条的 music 字段被抖音裁空，只能取 aweme_id */
  getGuestMusicAwemeList(data: DouyinMethodOptionsWithoutMethodType['guestMusicAwemeList']): string {
    const params = {
      music_id: data.music_id,
      count: data.number ?? 10,
      cursor: data.cursor ?? 0
    }
    return `${GUEST_BASE}/music/list/aweme/?${buildQueryString(params)}`
  }

  /** 获取表情资源包元信息 `{ id, md5, resource_url, update_time }`，md5 同时是版本号 */
  getEmojiResourceMeta(): string {
    return EMOJI_RESOURCE_URL
  }

  /** 获取合集分集；分享链接 mid 是音乐 ID，不能作为 mix_id。 */
  getMixAweme(data: MixAwemeParams): string {
    const params = webQuery(this.browserVersion, { mix_id: data.mix_id, cursor: data.cursor ?? 0, count: data.number ?? 20 })
    return `https://www.douyin.com/aweme/v1/web/mix/aweme/?${buildQueryString(params)}`
  }

  /** 获取用户主页视频数据 */
  getUserVideoList(data: DouyinMethodOptionsWithoutMethodType['userVideoList']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/aweme/post/'
    const params = webQuery(this.browserVersion, {
      sec_user_id: data.sec_uid,
      max_cursor: data.max_cursor ?? '0',
      locate_query: 'false',
      show_live_replay_strategy: '1',
      need_time_list: '1',
      time_list_query: '0',
      whale_cut_token: '',
      cut_version: '1',
      count: data.number ?? 18,
      publish_video_strategy_type: '2'
    })
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /** 获取用户喜欢列表数据 */
  getUserFavoriteList(data: DouyinMethodOptionsWithoutMethodType['userFavoriteList']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/aweme/favorite/'
    const params = webQuery(this.browserVersion, {
      sec_user_id: data.sec_uid,
      max_cursor: data.max_cursor ?? '0',
      min_cursor: '0',
      whale_cut_token: '',
      cut_version: '1',
      count: data.number ?? 18,
      publish_video_strategy_type: '2'
    })
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /** 获取用户推荐列表数据 */
  getUserRecommendList(data: DouyinMethodOptionsWithoutMethodType['userRecommendList']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/familiar/recommend/feed/'
    const params = webQuery(this.browserVersion, {
      sec_user_id: data.sec_uid,
      max_cursor: data.max_cursor ?? '0',
      min_cursor: '0',
      whale_cut_token: '',
      count: data.number ?? 18,
      from: '1'
    })
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /** 获取用户主页信息 */
  getUserProfile(data: DouyinMethodOptionsWithoutMethodType['userProfile']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/user/profile/other/'
    const params = webQuery(this.browserVersion, {
      publish_video_strategy_type: '2',
      source: 'channel_pc_web',
      sec_user_id: data.sec_uid,
      personal_center_strategy: '1'
    })
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /** 获取热点词数据 */
  getSuggestWords(data: DouyinMethodOptionsWithoutMethodType['suggestWords']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/api/suggest_words/'
    const params = webQuery(this.browserVersion, {
      query: data.query,
      business_id: '30088',
      from_group_id: '7129543174929812767'
    })
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
   * 获取搜索数据
   *
   * 三条分支的端点参数沿用 v6 的集合与取值，只把三段式版式套上来；抓包里没有
   * 搜索请求，端点段的内部顺序无从校准，所以不动它。
   */
  search(data: DouyinMethodOptionsWithoutMethodType['search']): string {
    const searchType = data.type ?? 'general'

    if (searchType === 'user') {
      const baseUrl = 'https://www.douyin.com/aweme/v1/web/discover/search/'
      const params = webQuery(this.browserVersion, {
        count: data.number ?? 10,
        disable_rs: '0',
        from_group_id: '',
        is_filter_search: '0',
        keyword: data.query,
        list_type: 'single',
        need_filter_settings: '1',
        offset: String(data.offset ?? 0),
        pc_search_top_1_params: '{"enable_ai_search_top_1":1}',
        query_correct_type: '1',
        search_channel: 'aweme_user_web',
        search_source: 'switch_tab',
        ...(data.search_id && { search_id: data.search_id })
      })
      return `${baseUrl}?${buildQueryString(params)}`
    } else if (searchType === 'video') {
      const baseUrl = 'https://www.douyin.com/aweme/v1/web/search/item/'
      const params = webQuery(this.browserVersion, {
        count: data.number ?? 10,
        disable_rs: '0',
        enable_history: '1',
        from_group_id: '',
        is_filter_search: '0',
        keyword: data.query,
        list_type: 'single',
        need_filter_settings: '1',
        offset: String(data.offset ?? 0),
        pc_search_top_1_params: '{"enable_ai_search_top_1":1}',
        query_correct_type: '1',
        search_channel: 'aweme_video_web',
        search_source: 'switch_tab',
        ...(data.search_id && { search_id: data.search_id })
      })
      return `${baseUrl}?${buildQueryString(params)}`
    } else {
      const baseUrl = 'https://www.douyin.com/aweme/v1/web/general/search/stream/'
      const params = webQuery(
        this.browserVersion,
        {
          count: data.number ?? 10,
          disable_rs: '0',
          enable_history: '1',
          is_filter_search: '0',
          keyword: data.query,
          list_type: '',
          need_filter_settings: '1',
          offset: String(data.offset ?? 0),
          pc_search_top_1_params: '{"enable_ai_search_top_1":1}',
          query_correct_type: '1',
          search_channel: 'aweme_general',
          search_source: 'normal_search',
          ...(data.search_id && { search_id: data.search_id })
        },
        { env: WEB_SEARCH_VERSION_OVERRIDE }
      )
      return `${baseUrl}?${buildQueryString(params)}`
    }
  }

  /**
   * 获取互动表情数据
   *
   * 这条是 IM 的接口，`aid` 走 1128 而不是 6383 —— 用 head 覆盖而非在端点段补一个
   * `aid`，否则 query 里会出现两个同名键。
   *
   * 不发 `publish_video_strategy_type`：抓包里浏览器的 `im/strategy/config` 只有
   * `app_id` 和 `scenes` 两个端点参数。
   */
  getDynamicEmojiList(): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/im/strategy/config'
    const params = webQuery(
      this.browserVersion,
      {
        app_id: '1128',
        /** 原始 JSON 字符串，buildQueryString 会编码一次；预先编码过会变成 %2522，接口回「参数不合法」 */
        scenes: '["interactive_resources"]'
      },
      { head: { aid: '1128' } }
    )
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /** 获取背景音乐数据 */
  getMusicInfo(data: DouyinMethodOptionsWithoutMethodType['musicInfo']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/music/detail/'
    const params = webQuery(this.browserVersion, { music_id: data.music_id, scene: '1' })
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /** 获取直播间信息 */
  getLiveRoomInfo(data: DouyinMethodOptionsWithoutMethodType['liveRoomInfo']): string {
    const baseUrl = 'https://live.douyin.com/webcast/room/web/enter/'
    const params = {
      aid: '6383',
      app_name: 'douyin_web',
      live_id: '1',
      device_platform: 'web',
      language: 'zh-CN',
      enter_from: 'web_share_link',
      cookie_enabled: 'true',
      screen_width: '2048',
      screen_height: '1152',
      browser_language: 'zh-CN',
      browser_platform: 'Win32',
      browser_name: 'Chrome',
      browser_version: this.browserVersion,
      web_rid: data.web_rid,
      room_id_str: data.room_id,
      enter_source: '',
      is_need_double_stream: 'false',
      insert_task_id: '',
      live_reason: '',
      verifyFp: fp,
      fp
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /** 申请登录二维码 */
  getLoginQrcode(data: DouyinMethodOptionsWithoutMethodType['loginQrcode']): string {
    const baseUrl = 'https://sso.douyin.com/get_qrcode/'
    const params = {
      verifyFp: data.verify_fp,
      fp: data.verify_fp
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
   * 获取弹幕数据
   *
   * 端点段顺序按抓包对齐。浏览器在 `end_time` 和 `duration` 之间还有一个
   * `authentication_token`（播放器下发的短期票据），SDK 拿不到，所以不发。
   */
  getDanmakuList(data: DouyinMethodOptionsWithoutMethodType['danmakuList']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/danmaku/get_v2/'
    const params = webQuery(this.browserVersion, {
      app_name: 'aweme',
      format: 'json',
      group_id: data.aweme_id,
      item_id: data.aweme_id,
      start_time: data.start_time ?? '0',
      end_time: data.end_time ?? '32000',
      duration: data.duration
    })
    return `${baseUrl}?${buildQueryString(params)}`
  }
}

/**
 * 创建 DouyinAPI 实例的工厂函数
 *
 * @param userAgent - 用户代理字符串
 * @returns DouyinAPI 实例
 */
export const createDouyinApiUrls = (userAgent?: string) => {
  return new DouyinAPI(userAgent)
}

/** 默认的 DouyinAPI 实例（使用集中维护的 DEFAULT_UA） */
export const douyinApiUrls = new DouyinAPI()
