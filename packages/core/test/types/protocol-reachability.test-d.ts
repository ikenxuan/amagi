import type { AmagiResult } from 'amagi/contracts/result'
import type {
  DouyinMixAwemeResponse,
  DouyinMusicAwemeListResponse,
  KuaishouEmotionPackageListResponse,
  KuaishouLoginUserProfileResponse,
  KuaishouSearchUserResponse,
  KuaishouSearchWorkListResponse,
  KuaishouSlideFeedResponse,
  XiaohongshuLiveRoomResponse,
  XiaohongshuLiveSquareResponse,
  XiaohongshuLiveStatusResponse,
  XiaohongshuSearchHotListResponse,
  XiaohongshuSearchUserResponse,
  XiaohongshuSubCommentsResponse,
  XiaohongshuUserNoteListResponse,
  XiaohongshuUserProfileResponse
} from 'amagi/index'
import { createClient, douyinFetcher, kuaishouFetcher, xiaohongshuFetcher } from 'amagi/index'
import { describe, expectTypeOf, it } from 'vitest'

/** 手写的协议扩展必须与生成的响应类型一样，能从同一套公开 API 拿到。 */
describe('补丁端点的协议类型可以从公开入口使用', () => {
  it('公开类型有内容，不是 any / undefined 占位', () => {
    expectTypeOf<DouyinMixAwemeResponse>().not.toBeAny()
    expectTypeOf<DouyinMixAwemeResponse>().not.toBeUndefined()
    expectTypeOf<keyof DouyinMixAwemeResponse>().not.toBeNever()
    expectTypeOf<keyof XiaohongshuLiveRoomResponse>().not.toBeNever()
    expectTypeOf<keyof XiaohongshuLiveSquareResponse>().not.toBeNever()
    expectTypeOf<keyof XiaohongshuLiveStatusResponse>().not.toBeNever()
    expectTypeOf<keyof XiaohongshuSearchHotListResponse>().not.toBeNever()
    expectTypeOf<keyof XiaohongshuSearchUserResponse>().not.toBeNever()
    expectTypeOf<keyof XiaohongshuSubCommentsResponse>().not.toBeNever()
    expectTypeOf<keyof XiaohongshuUserNoteListResponse>().not.toBeNever()
  })

  it('快手表情包保留已验证类型，未知字段不退化为 any', () => {
    type Package = NonNullable<KuaishouEmotionPackageListResponse['emotionPackageList']>[number]
    type Emotion = NonNullable<Package['emotions']>[number]
    expectTypeOf<KuaishouEmotionPackageListResponse>().not.toBeAny()
    expectTypeOf<Package['id']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Emotion['packageId']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Emotion['width']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<Emotion['height']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<Emotion['emotionCodes']>().toBeUnknown()
  })

  it('快手搜索保留浏览器实测的直播状态与嵌套字段类型', () => {
    type User = NonNullable<KuaishouSearchUserResponse['users']>[number]
    type Living = NonNullable<User['livingInfo']>
    type Verified = NonNullable<User['verifiedDetail']>
    type Feed = NonNullable<KuaishouSearchWorkListResponse['feeds']>[number]
    type Photo = NonNullable<Feed['photo']>
    type Manifest = NonNullable<Photo['manifest']>
    type Adaptation = NonNullable<Manifest['adaptationSet']>[number]
    type Representation = NonNullable<Adaptation['representation']>[number]
    expectTypeOf<Living['livingId']>().toEqualTypeOf<string | null | undefined>()
    expectTypeOf<Verified['description']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Verified['musicCompany']>().toEqualTypeOf<boolean | undefined>()
    expectTypeOf<Photo['riskTagContent']>().toEqualTypeOf<string | null | undefined>()
    expectTypeOf<Photo['riskTagUrl']>().toEqualTypeOf<string | null | undefined>()
    expectTypeOf<NonNullable<Photo['photoUrls']>[number]['url']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Photo['manifestH265']>().toEqualTypeOf<Photo['manifest']>()
    expectTypeOf<Representation['backupUrl']>().toEqualTypeOf<string[] | undefined>()
    expectTypeOf<Representation['bitratePattern']>().toEqualTypeOf<number[] | undefined>()
    expectTypeOf<NonNullable<Representation['kvqScore']>['FR']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<NonNullable<Representation['volumeInfo']>['chCorr']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<NonNullable<Representation['colorInfo']>['saturation']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<NonNullable<Feed['tags']>[number]['name']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<NonNullable<Feed['authorStatement']>['riskStyleType']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<KuaishouLoginUserProfileResponse['eid']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<KuaishouLoginUserProfileResponse['userId']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<KuaishouLoginUserProfileResponse['userDefineId']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<User['unrecorded_field']>().toBeUnknown()
  })

  it('推荐流的异构列表不被当成同构作品数组', () => {
    type Data = NonNullable<KuaishouSlideFeedResponse['data']>
    expectTypeOf<KuaishouSlideFeedResponse>().not.toBeAny()
    expectTypeOf<Data['sessionId']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Data['forceFeedInject']>().toEqualTypeOf<boolean | undefined>()
    // 条目是联合：不先判别就读作品字段应当不成立
    type Feed = NonNullable<Data['feeds']>[number]
    expectTypeOf<Feed>().not.toBeAny()
    expectTypeOf<Feed>().toBeUnknown()
  })

  it('已知分页字段可用，未确认的列表项保持 unknown', () => {
    expectTypeOf<DouyinMixAwemeResponse['cursor']>().toEqualTypeOf<number>()
    expectTypeOf<DouyinMixAwemeResponse['has_more']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<DouyinMixAwemeResponse['aweme_list']>().toEqualTypeOf<unknown[]>()
    type Comments = NonNullable<XiaohongshuSubCommentsResponse['data']>
    expectTypeOf<Comments['cursor']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Comments['has_more']>().toEqualTypeOf<boolean | undefined>()
    expectTypeOf<Comments['comments']>().toEqualTypeOf<unknown[] | undefined>()
  })

  it('原声作品列表的 mp3 地址可直接读，作品本体字段保持未知', () => {
    type Item = NonNullable<DouyinMusicAwemeListResponse['aweme_list']>[number]
    type Music = NonNullable<Item['music']>
    expectTypeOf<DouyinMusicAwemeListResponse>().not.toBeAny()
    expectTypeOf<NonNullable<Music['play_url']>['url_list']>().toEqualTypeOf<string[] | undefined>()
    expectTypeOf<Music['mid']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Item['desc']>().toBeUnknown()
  })

  it('包内说明确认的字段可读，未知内容必须先收窄', () => {
    type User = NonNullable<NonNullable<XiaohongshuSearchUserResponse['data']>['users']>[number]
    expectTypeOf<User['name']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<User['fans']>().toEqualTypeOf<string | undefined>()
    type Room = NonNullable<NonNullable<XiaohongshuLiveRoomResponse['data']>['room_info']>
    expectTypeOf<Room['room_id']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<XiaohongshuSearchHotListResponse['data']>().toBeUnknown()
    expectTypeOf<XiaohongshuLiveStatusResponse['unrecorded_field']>().toBeUnknown()
  })
})

it('userProfile 公开的是新 JSON API 的 snake_case 字段', () => {
  type Profile = NonNullable<XiaohongshuUserProfileResponse['data']>
  expectTypeOf<Profile['basic_info']>().toEqualTypeOf<Record<string, unknown> | undefined>()
  expectTypeOf<Profile['tab_public']>().toEqualTypeOf<Record<string, unknown> | undefined>()
  expectTypeOf<Profile['basicInfo']>().toBeUnknown()
})

it('静态和绑定 fetcher 均保留协议响应类型', async () => {
  const mix = await douyinFetcher.fetchMixAweme({ mix_id: '123' })
  expectTypeOf(mix).toEqualTypeOf<AmagiResult<DouyinMixAwemeResponse>>()
  const live = await xiaohongshuFetcher.fetchLiveStatus({ room_id: '7680000000000000000' })
  expectTypeOf(live).toEqualTypeOf<AmagiResult<XiaohongshuLiveStatusResponse>>()
  const client = createClient()
  const users = await client.xiaohongshu.fetcher.searchUser({ keyword: 'test' })
  expectTypeOf(users).toEqualTypeOf<AmagiResult<XiaohongshuSearchUserResponse>>()
  const emotions = await kuaishouFetcher.fetchEmotionPackageList({})
  expectTypeOf(emotions).toEqualTypeOf<AmagiResult<KuaishouEmotionPackageListResponse>>()
  const staticUsers = await kuaishouFetcher.fetchSearchUser({ keyword: 'test' })
  const boundUsers = await client.kuaishou.fetcher.fetchSearchUser({ keyword: 'test' })
  expectTypeOf(staticUsers).toEqualTypeOf<AmagiResult<KuaishouSearchUserResponse>>()
  expectTypeOf(boundUsers).toEqualTypeOf<AmagiResult<KuaishouSearchUserResponse>>()
  const staticWorks = await kuaishouFetcher.fetchSearchWorkList({ keyword: 'test' })
  const boundWorks = await client.kuaishou.fetcher.fetchSearchWorkList({ keyword: 'test' })
  expectTypeOf(staticWorks).toEqualTypeOf<AmagiResult<KuaishouSearchWorkListResponse>>()
  expectTypeOf(boundWorks).toEqualTypeOf<AmagiResult<KuaishouSearchWorkListResponse>>()
  const staticProfile = await kuaishouFetcher.fetchLoginUserProfile({})
  const boundProfile = await client.kuaishou.fetcher.fetchLoginUserProfile({})
  expectTypeOf(staticProfile).toEqualTypeOf<AmagiResult<KuaishouLoginUserProfileResponse>>()
  expectTypeOf(boundProfile).toEqualTypeOf<AmagiResult<KuaishouLoginUserProfileResponse>>()
})
