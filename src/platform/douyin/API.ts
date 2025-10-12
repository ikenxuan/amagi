import { DouyinMethodOptionsMap, OmitMethodType } from 'amagi/types'
import { douyinSign } from './sign'

// 根据 DouyinMethodOptionsMap 创建一个新的类型，去除每个字段中的 methodType
type DouyinMethodOptionsWithoutMethodType = {
  [K in keyof DouyinMethodOptionsMap]: OmitMethodType<DouyinMethodOptionsMap[K]>
}

/**
 * 从User-Agent中提取浏览器版本信息
 * @param userAgent - 用户代理字符串
 * @returns 浏览器版本号，默认为125.0.0.0
 */
const extractBrowserVersion = (userAgent?: string): string => {
  if (!userAgent) return '125.0.0.0'

  // 匹配Chrome版本号
  const chromeMatch = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/)
  if (chromeMatch) {
    return chromeMatch[1]
  }

  // 匹配Edge版本号
  const edgeMatch = userAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/)
  if (edgeMatch) {
    return edgeMatch[1]
  }

  // 默认返回125.0.0.0
  return '125.0.0.0'
}

/**
 * 将参数对象转换为URL查询字符串
 * @param params - 参数对象
 * @returns URL查询字符串
 */
const buildQueryString = (params: Record<string, any>): string => {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
}

const fp = douyinSign.VerifyFpManager()

class DouyinAPI {
  browserVersion: string

  /**
   * 构造函数
   * @param userAgent - 用户代理字符串，用于提取浏览器版本信息
   */
  constructor (userAgent?: string) {
    this.browserVersion = extractBrowserVersion(userAgent)
  }

  /**
   * 获取通用的基础参数
   * @returns 通用基础参数对象
   */
  getBaseParams (): Record<string, any> {
    return {
      device_platform: 'webapp',
      aid: '6383',
      channel: 'channel_pc_web',
      pc_client_type: '1',
      cookie_enabled: 'true',
      browser_language: 'zh-CN',
      browser_platform: 'Win32',
      browser_name: 'Chrome',
      browser_version: this.browserVersion,
      browser_online: 'true',
      engine_name: 'Blink',
      engine_version: this.browserVersion,
      os_name: 'Windows',
      os_version: '10',
      cpu_core_num: '16',
      device_memory: '8',
      platform: 'PC',
      downlink: '10',
      effective_type: '4g',
      msToken: douyinSign.Mstoken(116),
      verifyFp: fp,
      fp: fp
    }
  }

  /**
   * 获取视频或图集数据的接口地址
   * @param data - 请求参数，包含aweme_id
   * @returns 完整的接口URL
   */
  视频或图集 (data: DouyinMethodOptionsWithoutMethodType['WorkParams']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/aweme/detail/'
    const params = {
      ...this.getBaseParams(),
      aweme_id: data.aweme_id,
      update_version_code: '170400',
      version_code: '190500',
      version_name: '19.5.0',
      screen_width: '2328',
      screen_height: '1310',
      round_trip_time: '150',
      webid: '7351848354471872041'
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
   * 获取评论数据的接口地址
   * @param data - 请求参数，包含aweme_id、cursor、number等
   * @returns 完整的接口URL
   */
  评论 (data: DouyinMethodOptionsWithoutMethodType['CommentParams']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/comment/list/'
    const params = {
      ...this.getBaseParams(),
      aweme_id: data.aweme_id,
      cursor: data.cursor ?? 0,
      count: data.number ?? 50,
      item_type: '0',
      insert_ids: '',
      whale_cut_token: '',
      cut_version: '1',
      rcFT: '',
      version_code: '170400',
      version_name: '17.4.0',
      screen_width: '1552',
      screen_height: '970',
      round_trip_time: '50'
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
   * 获取二级评论数据的接口地址
   * @param data - 请求参数，包含aweme_id、comment_id等
   * @returns 完整的接口URL
   */
  二级评论 (data: DouyinMethodOptionsWithoutMethodType['CommentReplyParams']): string {
    const baseUrl = 'https://www-hj.douyin.com/aweme/v1/web/comment/list/reply/'
    const params = {
      device_platform: 'webapp',
      aid: '6383',
      channel: 'channel_pc_web',
      item_id: data.aweme_id,
      comment_id: data.comment_id,
      cut_version: '1',
      cursor: data.cursor,
      count: data.number,
      item_type: '0',
      update_version_code: '170400',
      pc_client_type: '1',
      pc_libra_divert: 'Windows',
      support_h265: '1',
      support_dash: '1',
      version_code: '170400',
      version_name: '17.4.0',
      cookie_enabled: 'true',
      screen_width: '1552',
      screen_height: '970',
      browser_language: 'zh-CN',
      browser_platform: 'Win32',
      browser_name: 'Edge',
      browser_version: this.browserVersion,
      browser_online: 'true',
      engine_name: 'Blink',
      engine_version: this.browserVersion,
      os_name: 'Windows',
      os_version: '10',
      cpu_core_num: '16',
      device_memory: '8',
      platform: 'PC',
      downlink: '10',
      effective_type: '4g',
      round_trip_time: '50',
      webid: '7487210762873685515',
      verifyFp: fp,
      fp: fp
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
   * 获取动图数据的接口地址
   * @param data - 请求参数，包含aweme_id
   * @returns 完整的接口URL
   */
  动图 (data: DouyinMethodOptionsWithoutMethodType['WorkParams']): string {
    const baseUrl = 'https://www.iesdouyin.com/web/api/v2/aweme/slidesinfo/'
    const params = {
      reflow_source: 'reflow_page',
      web_id: '7326472315356857893',
      device_id: '7326472315356857893',
      aweme_ids: `[${data.aweme_id}]`,
      request_source: '200',
      msToken: douyinSign.Mstoken(116),
      verifyFp: fp,
      fp: fp
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
   * 获取表情数据的接口地址
   * @returns 完整的接口URL
   */
  表情 (): string {
    return 'https://www.douyin.com/aweme/v1/web/emoji/list'
  }

  /**
   * 获取用户主页视频数据的接口地址
   * @param data - 请求参数，包含sec_uid
   * @returns 完整的接口URL
   */
  用户主页视频 (data: DouyinMethodOptionsWithoutMethodType['UserParams']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/aweme/post/'
    const params = {
      ...this.getBaseParams(),
      sec_user_id: data.sec_uid,
      max_cursor: '0',
      locate_query: 'false',
      show_live_replay_strategy: '1',
      need_time_list: '1',
      time_list_query: '0',
      whale_cut_token: '',
      cut_version: '1',
      count: '18',
      publish_video_strategy_type: '2',
      version_code: '170400',
      version_name: '17.4.0',
      screen_width: '1552',
      screen_height: '970',
      round_trip_time: '50',
      webid: '7338423850134226495'
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
   * 获取用户主页信息的接口地址
   * @param data - 请求参数，包含sec_uid
   * @returns 完整的接口URL
   */
  用户主页信息 (data: DouyinMethodOptionsWithoutMethodType['UserParams']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/user/profile/other/'
    const params = {
      ...this.getBaseParams(),
      publish_video_strategy_type: '2',
      source: 'channel_pc_web',
      sec_user_id: data.sec_uid,
      personal_center_strategy: '1',
      version_code: '170400',
      version_name: '17.4.0',
      screen_width: '1552',
      screen_height: '970',
      round_trip_time: '0',
      webid: '7327957959955580467'
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
   * 获取热点词数据的接口地址
   * @param data - 请求参数，包含query
   * @returns 完整的接口URL
   */
  热点词 (data: DouyinMethodOptionsWithoutMethodType['SearchParams']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/api/suggest_words/'
    const params = {
      ...this.getBaseParams(),
      query: data.query,
      business_id: '30088',
      from_group_id: '7129543174929812767',
      version_code: '170400',
      version_name: '17.4.0',
      screen_width: '1552',
      screen_height: '970',
      round_trip_time: '50',
      webid: '7327957959955580467'
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
   * 获取搜索数据的接口地址
   * @param data - 请求参数，包含query、number、search_id等
   * @returns 完整的接口URL
   */
  搜索 (data: DouyinMethodOptionsWithoutMethodType['SearchParams']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/general/search/single/'
    const params = {
      ...this.getBaseParams(),
      search_channel: 'aweme_general',
      sort_type: '0',
      publish_time: '0',
      keyword: data.query,
      search_source: 'normal_search',
      query_correct_type: '1',
      is_filter_search: '0',
      from_group_id: '',
      offset: '0',
      version_code: '190600',
      version_name: '19.6.0',
      screen_width: '1552',
      screen_height: '970',
      round_trip_time: '50',
      webid: '7338423850134226495',
      search_id: data.search_id ?? '',
      count: data.number ?? 10
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
   * 获取互动表情数据的接口地址
   * @returns 完整的接口URL
   */
  互动表情 (): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/im/strategy/config'
    const params = {
      device_platform: 'webapp',
      aid: '1128',
      channel: 'channel_pc_web',
      publish_video_strategy_type: '2',
      app_id: '1128',
      scenes: '[%22interactive_resources%22]',
      pc_client_type: '1',
      version_code: '170400',
      version_name: '17.4.0',
      cookie_enabled: 'true',
      screen_width: '2328',
      screen_height: '1310',
      browser_language: 'zh-CN',
      browser_platform: 'Win32',
      browser_name: 'Chrome',
      browser_version: '126.0.0.0',
      browser_online: 'true',
      engine_name: 'Blink',
      engine_version: '126.0.0.0',
      os_name: 'Windows',
      os_version: '10',
      cpu_core_num: '16',
      device_memory: '8',
      platform: 'PC',
      downlink: '1.5',
      effective_type: '4g',
      round_trip_time: '350',
      webid: '7347329698282833447',
      msToken: douyinSign.Mstoken(116),
      verifyFp: fp,
      fp: fp
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
   * 获取背景音乐数据的接口地址
   * @param data - 请求参数，包含music_id
   * @returns 完整的接口URL
   */
  背景音乐 (data: DouyinMethodOptionsWithoutMethodType['MusicParams']): string {
    const baseUrl = 'https://www.douyin.com/aweme/v1/web/music/detail/'
    const params = {
      device_platform: 'webapp',
      aid: '6383',
      channel: 'channel_pc_web',
      music_id: data.music_id,
      scene: '1',
      pc_client_type: '1',
      version_code: '170400',
      version_name: '17.4.0',
      cookie_enabled: 'true',
      screen_width: '2328',
      screen_height: '1310',
      browser_language: 'zh-CN',
      browser_platform: 'Win32',
      browser_name: 'Chrome',
      browser_version: '126.0.0.0',
      browser_online: 'true',
      engine_name: 'Blink',
      engine_version: '126.0.0.0',
      os_name: 'Windows',
      os_version: '10',
      cpu_core_num: '16',
      device_memory: '8',
      platform: 'PC',
      downlink: '1.5',
      effective_type: '4g',
      round_trip_time: '350',
      webid: '7347329698282833447',
      msToken: douyinSign.Mstoken(116),
      verifyFp: fp,
      fp: fp
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
   * 获取直播间信息的接口地址
   * @param data - 请求参数，包含web_rid、room_id
   * @returns 完整的接口URL
   */
  直播间信息 (data: DouyinMethodOptionsWithoutMethodType['LiveRoomParams']): string {
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
      browser_version: '125.0.0.0',
      web_rid: data.web_rid,
      room_id_str: data.room_id,
      enter_source: '',
      is_need_double_stream: 'false',
      insert_task_id: '',
      live_reason: '',
      msToken: douyinSign.Mstoken(116),
      verifyFp: fp,
      fp: fp
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
   * 获取申请二维码的接口地址
   * @param data - 请求参数，包含verify_fp
   * @returns 完整的接口URL
   */
  申请二维码 (data: DouyinMethodOptionsWithoutMethodType['QrcodeParams']): string {
    const baseUrl = 'https://sso.douyin.com/get_qrcode/'
    const params = {
      verifyFp: data.verify_fp,
      fp: data.verify_fp
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }

  /**
 * 获取弹幕数据的接口地址
 * @param data - 请求参数，包含group_id、item_id等
 * @returns 完整的接口URL
 */
  弹幕 (data: DouyinMethodOptionsWithoutMethodType['DanmakuParams']): string {
    const baseUrl = 'https://www-hj.douyin.com/aweme/v1/web/danmaku/get_v2/'
    const params = {
      ...this.getBaseParams(),
      app_name: 'aweme',
      format: 'json',
      group_id: data.aweme_id,
      item_id: data.aweme_id,
      start_time: data.start_time ?? '0',
      end_time: data.end_time ?? '32000',
      duration: data.duration,
      update_version_code: '170400',
      pc_libra_divert: 'Windows',
      support_h265: '1',
      support_dash: '1',
      version_code: '170400',
      version_name: '17.4.0',
      screen_width: '2328',
      screen_height: '1310',
      browser_name: 'Edge',
      browser_version: '140.0.0.0',
      engine_name: 'Blink',
      engine_version: '140.0.0.0',
      downlink: '1.55',
      round_trip_time: '200',
      webid: '7487210762873685515',
      msToken: douyinSign.Mstoken(116),
      verifyFp: fp,
      fp: fp
    }
    return `${baseUrl}?${buildQueryString(params)}`
  }
}

/**
 * 创建DouyinAPI实例的工厂函数
 * @param userAgent - 用户代理字符串
 * @returns DouyinAPI实例
 */
export const createDouyinApiUrls = (userAgent?: string) => {
  return new DouyinAPI(userAgent)
}

/**
 * 默认的DouyinAPI实例（使用默认浏览器版本125.0.0.0）
 * 该类下的所有方法只会返回拼接好参数后的 Url 地址，需要手动请求该地址以获取数据
 * 
 * 缺少 `a_bougs` 参数，请自行生成拼接
 */
export const douyinApiUrls = new DouyinAPI()