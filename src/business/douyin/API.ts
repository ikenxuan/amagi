import { DouyinAPIParams } from 'amagi/types'
import Sign from './sign'

const fp = Sign.VerifyFpManager()
class DouyinAPI {
  视频或图集 (data: DouyinAPIParams["WorkParams"]): string {
    return `https://www.douyin.com/aweme/v1/web/aweme/detail/?device_platform=webapp&aid=6383&channel=channel_pc_web&aweme_id=${data.aweme_id}&update_version_code=170400&pc_client_type=1&version_code=190500&version_name=19.5.0&cookie_enabled=true&screen_width=2328&screen_height=1310&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=125.0.0.0&browser_online=true&engine_name=Blink&engine_version=125.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=150&webid=7351848354471872041&msToken=${Sign.Mstoken(
      116
    )}&verifyFp=${fp}&fp=${fp}`
  }

  评论 (data: DouyinAPIParams['WorkParams']): string {
    return `https://www.douyin.com/aweme/v1/web/comment/list/?device_platform=webapp&aid=6383&channel=channel_pc_web&aweme_id=${data.aweme_id}&cursor=0&count=${data.number}&item_type=0&insert_ids=&whale_cut_token=&cut_version=1&rcFT=&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1552&screen_height=970&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=125.0.0.0&browser_online=true&engine_name=Blink&engine_version=125.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&msToken=${Sign.Mstoken(
      116)}&verifyFp=${fp}&fp=${fp}`
  }

  二级评论 (data: DouyinAPIParams['CommentParams']): string {
    return `https://www.douyin.com/aweme/v1/web/comment/list/reply/?device_platform=webapp&aid=6383&channel=channel_pc_web&item_id=${data.aweme_id}&comment_id=${data.comment_id}&cut_version=1&cursor=0&count=10&item_type=0&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1552&screen_height=970&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=126.0.0.0&browser_online=true&engine_name=Blink&engine_version=126.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=0&webid=7326516708850599434&msToken=${Sign.Mstoken(
      116
    )}&verifyFp=${fp}&fp=${fp}`
  }

  动图 (data: DouyinAPIParams['WorkParams']): string {
    return `https://www.iesdouyin.com/web/api/v2/aweme/slidesinfo/?reflow_source=reflow_page&web_id=7326472315356857893&device_id=7326472315356857893&aweme_ids=[${data.aweme_id}]&request_source=200&msToken=${Sign.Mstoken(
      116)}&verifyFp=${fp}&fp=${fp}`
  }

  表情 () {
    return 'https://www.douyin.com/aweme/v1/web/emoji/list'
  }

  用户主页视频 (data: DouyinAPIParams['UserParams']): string {
    return `https://www.douyin.com/aweme/v1/web/aweme/post/?device_platform=webapp&aid=6383&channel=channel_pc_web&sec_user_id=${data.sec_uid}&max_cursor=0&locate_query=false&show_live_replay_strategy=1&need_time_list=1&time_list_query=0&whale_cut_token=&cut_version=1&count=18&publish_video_strategy_type=2&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1552&screen_height=970&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=125.0.0.0&browser_online=true&engine_name=Blink&engine_version=125.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=50&webid=7338423850134226495&msToken=${Sign.Mstoken(
      116)}&verifyFp=${fp}&fp=${fp}`
  }

  用户主页信息 (data: DouyinAPIParams['UserParams']): string {
    return `https://www.douyin.com/aweme/v1/web/user/profile/other/?device_platform=webapp&aid=6383&channel=channel_pc_web&publish_video_strategy_type=2&source=channel_pc_web&sec_user_id=${data.sec_uid}&personal_center_strategy=1&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1552&screen_height=970&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=125.0.0.0&browser_online=true&engine_name=Blink&engine_version=125.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=0&webid=7327957959955580467&msToken=${Sign.Mstoken(
      116)}&verifyFp=${fp}&fp=${fp}`
  }

  热点词 (data: DouyinAPIParams['SearchParams']): string {
    return `https://www.douyin.com/aweme/v1/web/api/suggest_words/?device_platform=webapp&aid=6383&channel=channel_pc_web&query=${data.query}&business_id=30088&from_group_id=7129543174929812767&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1552&screen_height=970&browser_language=zh - CN&browser_platform=Win32&browser_name=Chrome&browser_version=125.0.0.0&browser_online=true&engine_name=Blink&engine_version=125.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=50&webid=7327957959955580467&msToken=${Sign.Mstoken(
      116)}&verifyFp=${fp}&fp=${fp}`
  }

  搜索 (data: DouyinAPIParams['SearchParams']): string {
    return `https://www.douyin.com/aweme/v1/web/general/search/single/?device_platform=webapp&aid=6383&channel=channel_pc_web&search_channel=aweme_general&sort_type=0&publish_time=0&keyword=${data.query}&search_source=normal_search&query_correct_type=1&is_filter_search=0&from_group_id=&offset=0&count=15&pc_client_type=1&version_code=190600&version_name=19.6.0&cookie_enabled=true&screen_width=1552&screen_height=970&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=125.0.0.0&browser_online=true&engine_name=Blink&engine_version=125.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=50&webid=7338423850134226495&msToken=${Sign.Mstoken(
      116)}&verifyFp=${fp}&fp=${fp}`
  }

  互动表情 (): string {
    return `https://www.douyin.com/aweme/v1/web/im/strategy/config?device_platform=webapp&aid=1128&channel=channel_pc_web&publish_video_strategy_type=2&app_id=1128&scenes=[%22interactive_resources%22]&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=2328&screen_height=1310&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=126.0.0.0&browser_online=true&engine_name=Blink&engine_version=126.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=1.5&effective_type=4g&round_trip_time=350&webid=7347329698282833447&msToken=${Sign.Mstoken(
      116
    )}&verifyFp=${fp}&fp=${fp}`
  }

  背景音乐 (data: DouyinAPIParams['MusicParams']): string {
    return `https://www.douyin.com/aweme/v1/web/music/detail/?device_platform=webapp&aid=6383&channel=channel_pc_web&music_id=${data.music_id}&scene=1&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=2328&screen_height=1310&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=126.0.0.0&browser_online=true&engine_name=Blink&engine_version=126.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=1.5&effective_type=4g&round_trip_time=350&webid=7347329698282833447&msToken=${Sign.Mstoken(
      116
    )}&verifyFp=${fp}&fp=${fp}`
  }

  直播间信息 (data: DouyinAPIParams['LiveRoomParams']): string {
    return `https://live.douyin.com/webcast/room/info_by_scene/?aid=6383&app_name=douyin_web&live_id=1&device_platform=web&language=zh-CN&cookie_enabled=true&screen_width=2328&screen_height=1310&browser_language=zh-CN&browser_platform=Win32&browser_name=Edge&browser_version=125.0.0.0&room_id=${data.room_id}&scene=aweme_video_feed_pc&channel=channel_pc_web&region=cn&device_id=7355205920467306010&device_type=web_device&os_version=web&version_code=170400&webcast_sdk_version=2450&msToken=${Sign.Mstoken(
      116)}&verifyFp=${fp}&fp=${fp}`
  }
}

/** 该类下的所有方法只会返回拼接好参数后的 Url 地址，需要手动请求该地址以获取数据 */
export default new DouyinAPI()
