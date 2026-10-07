import type { AmagiResult } from 'amagi/contracts/result'
import type {
  DouyinLiveRoomInfoResponse,
  DouyinMusicInfoResponse,
  DouyinMusicInfoResponseSuccess,
  DouyinParseWorkResponseError,
  DouyinParseWorkResponseSuccess,
  DouyinUserVideoListResponse,
  DouyinVideoWorkResponse,
  DouyinVideoWorkResponseSuccess
} from 'amagi/index'
import { createClient, douyinFetcher } from 'amagi/index'
import { describe, expectTypeOf, it } from 'vitest'

describe('安全 JSON 解析的已知长 ID 与公开响应类型一致', () => {
  it('音乐 id 可为安全 number 或保精度 string，其他音乐数字保持 number', () => {
    type Music = NonNullable<DouyinMusicInfoResponse['music_info']>
    expectTypeOf<Music['id']>().toEqualTypeOf<number | string>()
    expectTypeOf<Music['id_str']>().toEqualTypeOf<string>()
    expectTypeOf<Music['duration']>().toEqualTypeOf<number>()
    expectTypeOf<Music['music_collect_count']>().toEqualTypeOf<number>()
    expectTypeOf<DouyinMusicInfoResponseSuccess>().toEqualTypeOf<DouyinMusicInfoResponse>()
  })

  it('作品用户、评论组和音乐 ID 兼容字符串，状态/时间/计数不扩宽', () => {
    type Work = NonNullable<DouyinVideoWorkResponse['aweme_detail']>
    expectTypeOf<Work['author_user_id']>().toEqualTypeOf<number | string>()
    expectTypeOf<Work['comment_gid']>().toEqualTypeOf<number | string>()
    expectTypeOf<Work['music']['id']>().toEqualTypeOf<number | string>()
    expectTypeOf<Work['aweme_id']>().toEqualTypeOf<string>()
    expectTypeOf<Work['create_time']>().toEqualTypeOf<number>()
    expectTypeOf<Work['aweme_type']>().toEqualTypeOf<number>()
    expectTypeOf<Work['statistics']['digg_count']>().toEqualTypeOf<number>()
    expectTypeOf<DouyinVideoWorkResponseSuccess>().toExtend<DouyinVideoWorkResponse>()
  })

  it('数组与成功/失败分支保留原有形状', () => {
    type Item = DouyinUserVideoListResponse['aweme_list'][number]
    expectTypeOf<Item['comment_gid']>().toEqualTypeOf<number | string>()
    expectTypeOf<Item['music']['id']>().toEqualTypeOf<number | string>()
    type Work = NonNullable<DouyinParseWorkResponseSuccess['aweme_detail']>
    expectTypeOf<Work['author_user_id']>().toEqualTypeOf<number | string>()
    expectTypeOf<DouyinParseWorkResponseError['status_code']>().toEqualTypeOf<number>()
  })

  it('直播流 ID 兼容字符串，分辨率和比特率保持 number', () => {
    type Room = DouyinLiveRoomInfoResponse['data']['similar_rooms'][number]['room']
    type Stream = Room['others']['web_data']['additional_stream_url']
    expectTypeOf<Stream['id']>().toEqualTypeOf<number | string>()
    expectTypeOf<Stream['live_core_sdk_data']['push_data']['stream_id']>().toEqualTypeOf<number | string>()
    expectTypeOf<Stream['extra']['width']>().toEqualTypeOf<number>()
    expectTypeOf<Stream['extra']['default_bitrate']>().toEqualTypeOf<number>()
  })

  it('静态和绑定 fetcher 返回同一个公开兼容类型', async () => {
    const music = await douyinFetcher.fetchMusicInfo({ music_id: '7683618325565623078' })
    expectTypeOf(music).toEqualTypeOf<AmagiResult<DouyinMusicInfoResponse>>()
    const work = await createClient().douyin.fetcher.fetchVideoWork({ aweme_id: '7682731536692579627' })
    expectTypeOf(work).toEqualTypeOf<AmagiResult<DouyinVideoWorkResponse>>()
  })
})
