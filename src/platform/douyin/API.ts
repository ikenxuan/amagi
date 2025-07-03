import { DouyinMethodOptionsMap, OmitMethodType } from 'amagi/types'

import { douyinSign } from './sign'

// 根据 DouyinMethodOptionsMap 创建一个新的类型，去除每个字段中的 methodType
type DouyinMethodOptionsWithoutMethodType = {
  [K in keyof DouyinMethodOptionsMap]: OmitMethodType<DouyinMethodOptionsMap[K]>
}

const fp = douyinSign.VerifyFpManager()
class DouyinAPI {
  视频或图集 (data: DouyinMethodOptionsWithoutMethodType['WorkParams']): string {
    return `https://www.douyin.com/aweme/v1/web/aweme/detail/?device_platform=webapp&aid=6383&channel=channel_pc_web&aweme_id=${data.aweme_id}&update_version_code=170400&pc_client_type=1&version_code=190500&version_name=19.5.0&cookie_enabled=true&screen_width=2328&screen_height=1310&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=125.0.0.0&browser_online=true&engine_name=Blink&engine_version=125.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=150&webid=7351848354471872041&msToken=${douyinSign.Mstoken(
      116
    )}&verifyFp=${fp}&fp=${fp}`
  }

  评论 (data: DouyinMethodOptionsWithoutMethodType['CommentParams']): string {
    return `https://www.douyin.com/aweme/v1/web/comment/list/?device_platform=webapp&aid=6383&channel=channel_pc_web&aweme_id=${data.aweme_id}&cursor=${data.cursor ?? 0}&count=${data.number ?? 50}&item_type=0&insert_ids=&whale_cut_token=&cut_version=1&rcFT=&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1552&screen_height=970&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=125.0.0.0&browser_online=true&engine_name=Blink&engine_version=125.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&msToken=${douyinSign.Mstoken(
      116)}&verifyFp=${fp}&fp=${fp}`
  }

  二级评论 (data: DouyinMethodOptionsWithoutMethodType['CommentReplyParams']): string {
    return `https://www.douyin.com/aweme/v1/web/comment/list/reply/?device_platform=webapp&aid=6383&channel=channel_pc_web&item_id=${data.aweme_id}&comment_id=${data.comment_id}&cut_version=1&cursor=${data.cursor}&count=${data.number}&item_type=0&update_version_code=170400&pc_client_type=1&pc_libra_divert=Windows&support_h265=1&support_dash=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1552&screen_height=970&browser_language=zh-CN&browser_platform=Win32&browser_name=Edge&browser_version=132.0.0.0&browser_online=true&engine_name=Blink&engine_version=132.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=50&webid=7386217876267796006&verifyFp=${fp}&fp=${fp}`
  }

  动图 (data: DouyinMethodOptionsWithoutMethodType['WorkParams']): string {
    return `https://www.iesdouyin.com/web/api/v2/aweme/slidesinfo/?reflow_source=reflow_page&web_id=7326472315356857893&device_id=7326472315356857893&aweme_ids=[${data.aweme_id}]&request_source=200&msToken=${douyinSign.Mstoken(
      116)}&verifyFp=${fp}&fp=${fp}`
  }

  表情 () {
    return 'https://www.douyin.com/aweme/v1/web/emoji/list'
  }

  用户主页视频 (data: DouyinMethodOptionsWithoutMethodType['UserParams']): string {
    return `https://www.douyin.com/aweme/v1/web/aweme/post/?device_platform=webapp&aid=6383&channel=channel_pc_web&sec_user_id=${data.sec_uid}&max_cursor=0&locate_query=false&show_live_replay_strategy=1&need_time_list=1&time_list_query=0&whale_cut_token=&cut_version=1&count=18&publish_video_strategy_type=2&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1552&screen_height=970&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=125.0.0.0&browser_online=true&engine_name=Blink&engine_version=125.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=50&webid=7338423850134226495&msToken=${douyinSign.Mstoken(
      116)}&verifyFp=${fp}&fp=${fp}`
  }

  用户主页信息 (data: DouyinMethodOptionsWithoutMethodType['UserParams']): string {
    return `https://www.douyin.com/aweme/v1/web/user/profile/other/?device_platform=webapp&aid=6383&channel=channel_pc_web&publish_video_strategy_type=2&source=channel_pc_web&sec_user_id=${data.sec_uid}&personal_center_strategy=1&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1552&screen_height=970&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=125.0.0.0&browser_online=true&engine_name=Blink&engine_version=125.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=0&webid=7327957959955580467&msToken=${douyinSign.Mstoken(
      116)}&verifyFp=${fp}&fp=${fp}`
  }

  热点词 (data: DouyinMethodOptionsWithoutMethodType['SearchParams']): string {
    return `https://www.douyin.com/aweme/v1/web/api/suggest_words/?device_platform=webapp&aid=6383&channel=channel_pc_web&query=${data.query}&business_id=30088&from_group_id=7129543174929812767&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1552&screen_height=970&browser_language=zh - CN&browser_platform=Win32&browser_name=Chrome&browser_version=125.0.0.0&browser_online=true&engine_name=Blink&engine_version=125.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=50&webid=7327957959955580467&msToken=${douyinSign.Mstoken(
      116)}&verifyFp=${fp}&fp=${fp}`
  }

  搜索 (data: DouyinMethodOptionsWithoutMethodType['SearchParams']): string {
    return `https://www.douyin.com/aweme/v1/web/general/search/single/?device_platform=webapp&aid=6383&channel=channel_pc_web&search_channel=aweme_general&sort_type=0&publish_time=0&keyword=${data.query}&search_source=normal_search&query_correct_type=1&is_filter_search=0&from_group_id=&offset=0&count=15&pc_client_type=1&version_code=190600&version_name=19.6.0&cookie_enabled=true&screen_width=1552&screen_height=970&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=125.0.0.0&browser_online=true&engine_name=Blink&engine_version=125.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=50&webid=7338423850134226495&msToken=${douyinSign.Mstoken(
      116)}&verifyFp=${fp}&fp=${fp}&search_id=${data.search_id ?? ''}&count=${data.number ?? 10}`
  }

  互动表情 (): string {
    return `https://www.douyin.com/aweme/v1/web/im/strategy/config?device_platform=webapp&aid=1128&channel=channel_pc_web&publish_video_strategy_type=2&app_id=1128&scenes=[%22interactive_resources%22]&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=2328&screen_height=1310&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=126.0.0.0&browser_online=true&engine_name=Blink&engine_version=126.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=1.5&effective_type=4g&round_trip_time=350&webid=7347329698282833447&msToken=${douyinSign.Mstoken(
      116
    )}&verifyFp=${fp}&fp=${fp}`
  }

  背景音乐 (data: DouyinMethodOptionsWithoutMethodType['MusicParams']): string {
    return `https://www.douyin.com/aweme/v1/web/music/detail/?device_platform=webapp&aid=6383&channel=channel_pc_web&music_id=${data.music_id}&scene=1&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=2328&screen_height=1310&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=126.0.0.0&browser_online=true&engine_name=Blink&engine_version=126.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=1.5&effective_type=4g&round_trip_time=350&webid=7347329698282833447&msToken=${douyinSign.Mstoken(
      116
    )}&verifyFp=${fp}&fp=${fp}`
  }

  直播间信息 (data: DouyinMethodOptionsWithoutMethodType['LiveRoomParams']): string {
    return `https://live.douyin.com/webcast/room/web/enter/?aid=6383&app_name=douyin_web&live_id=1&device_platform=web&language=zh-CN&enter_from=web_share_link&cookie_enabled=true&screen_width=2048&screen_height=1152&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=125.0.0.0&web_rid=${data.web_rid}&room_id_str=${data.room_id}&enter_source=&is_need_double_stream=false&insert_task_id=&live_reason=&msToken=${douyinSign.Mstoken(
      116)}&verifyFp=${fp}&fp=${fp}`
  }

  申请二维码 (data: DouyinMethodOptionsWithoutMethodType['QrcodeParams']): string {
    return `https://sso.douyin.com/get_qrcode/?verifyFp=${data.verify_fp}&fp=${data.verify_fp}`
  }
}

/**
 * 该类下的所有方法只会返回拼接好参数后的 Url 地址，需要手动请求该地址以获取数据
 * 
 * 缺少 `a_bougs` 参数，请自行生成拼接
 */
export const douyinApiUrls = new DouyinAPI()
