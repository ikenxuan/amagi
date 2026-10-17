/**
 * **已知缺口**：安全 JSON 解析与生成类型之间的精度差。
 *
 * `transport/safeJson.ts` 会把超出 JavaScript 安全整数范围的裸整数字面量转成**字符串**
 * 返回 —— 19 位的 `aweme_id` / `author_user_id` / `comment_gid` / `music.id` /
 * `stream_id` 都在这一类里；而生成树里这些字段仍写着 `number`，两边并不一致。
 *
 * 此前由一份手写的精度投影（`protocols/douyin-safe-integers.ts`）把字段放宽成
 * `number | string` 补上，那份投影已随 `protocols/` 整体下线：**类型只来自生成树或
 * `any`**。这里因此断言生成树当前的形状，把缺口写明，而不是假装它不存在。
 *
 * 出口：让 `typegen` 能从样本可靠表达精度策略（或重录覆盖超范围取值的样本）之后，
 * 把下面几条 `number` 改成 `number | string`。运行时那一侧由
 * `test/transport/safeJson.test.ts` 覆盖。
 */
import type { AmagiResult } from 'amagi/contracts/result'
import type {
  DouyinLiveRoomInfoResponse,
  DouyinMusicInfoResponse,
  DouyinParseWorkResponseError,
  DouyinUserVideoListResponse,
  DouyinVideoWorkResponse
} from 'amagi/index'
import { createClient, douyinFetcher } from 'amagi/index'
import { describe, expectTypeOf, it } from 'vitest'

describe('长 ID 的已知缺口：运行时会给 string，生成类型写的是 number', () => {
  it('音乐与作品的 ID 字段当前是 number，字符串字段仍是 string', () => {
    type Music = NonNullable<DouyinMusicInfoResponse['music_info']>
    expectTypeOf<Music['id']>().toEqualTypeOf<number>()
    expectTypeOf<Music['id_str']>().toEqualTypeOf<string>()
    expectTypeOf<Music['duration']>().toEqualTypeOf<number>()

    type Work = NonNullable<DouyinVideoWorkResponse['aweme_detail']>
    expectTypeOf<Work['author_user_id']>().toEqualTypeOf<number>()
    expectTypeOf<Work['comment_gid']>().toEqualTypeOf<number>()
    expectTypeOf<Work['aweme_id']>().toEqualTypeOf<string>()
    expectTypeOf<Work['create_time']>().toEqualTypeOf<number>()
    expectTypeOf<Work['aweme_type']>().toEqualTypeOf<number>()
    expectTypeOf<Work['statistics']['digg_count']>().toEqualTypeOf<number>()
  })

  it('数组与直播流里的同类 ID 也一样', () => {
    type Item = DouyinUserVideoListResponse['aweme_list'][number]
    expectTypeOf<Item['comment_gid']>().toEqualTypeOf<number>()

    type Room = DouyinLiveRoomInfoResponse['data']['similar_rooms'][number]['room']
    type Stream = Room['others']['web_data']['additional_stream_url']
    expectTypeOf<Stream['id']>().toEqualTypeOf<number>()
    expectTypeOf<Stream['live_core_sdk_data']['push_data']['stream_id']>().toEqualTypeOf<number>()
    expectTypeOf<Stream['extra']['width']>().toEqualTypeOf<number>()
    expectTypeOf<DouyinParseWorkResponseError['status_code']>().toEqualTypeOf<number>()
  })

  it('静态与绑定 fetcher 返回同一个公开类型', async () => {
    const music = await douyinFetcher.fetchMusicInfo({ music_id: '7683618325565623078' })
    expectTypeOf(music).toEqualTypeOf<AmagiResult<DouyinMusicInfoResponse>>()
    const work = await createClient().douyin.fetcher.fetchVideoWork({ aweme_id: '7682731536692579627' })
    expectTypeOf(work).toEqualTypeOf<AmagiResult<DouyinVideoWorkResponse>>()
  })
})
