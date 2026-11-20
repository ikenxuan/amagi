import { createClient } from 'amagi/client/createClient'
import type { DataOf, PublicParamsOf } from 'amagi/contracts/endpoint'
import type { DouyinAppApi } from 'amagi/index'
import { awemeRegistry } from 'amagi/platforms/douyin/app/endpoints'
import type { DouyinAppCommandTransData } from 'amagi/platforms/douyin/app/endpoints/commandTrans'
import type { DouyinAppShareSettingsData } from 'amagi/platforms/douyin/app/endpoints/shareSettings'
import type * as Response from 'amagi/types/generated'
import { describe, expectTypeOf, it } from 'vitest'

describe('App 类型独立于 Web 响应且隐藏内部参数', () => {
  it('成功样本连接生成的 App 响应类型', () => {
    expectTypeOf<DataOf<typeof awemeRegistry.appParseWork>>().toEqualTypeOf<Response.DouyinAppParseWorkResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appVideoWork>>().toEqualTypeOf<Response.DouyinAppVideoWorkResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appImageAlbumWork>>().toEqualTypeOf<Response.DouyinAppImageAlbumWorkResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appSlidesWork>>().toEqualTypeOf<Response.DouyinAppSlidesWorkResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appTextWork>>().toEqualTypeOf<Response.DouyinAppTextWorkResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appMixAweme>>().toEqualTypeOf<Response.DouyinAppMixAwemeResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appComments>>().toEqualTypeOf<Response.DouyinAppCommentsResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appCommentReplies>>().toEqualTypeOf<Response.DouyinAppCommentRepliesResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appUserProfile>>().toEqualTypeOf<Response.DouyinAppUserProfileResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appUserVideoList>>().toEqualTypeOf<Response.DouyinAppUserVideoListResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appMusicInfo>>().toEqualTypeOf<Response.DouyinAppMusicInfoResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appMusicAwemeList>>().toEqualTypeOf<Response.DouyinAppMusicAwemeListResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appSuggestWords>>().toEqualTypeOf<Response.DouyinAppSuggestWordsResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appDanmakuList>>().toEqualTypeOf<Response.DouyinAppDanmakuListResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appEmojiResourceMeta>>().toEqualTypeOf<Response.DouyinAppEmojiResourceMetaResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appShortUrl>>().toEqualTypeOf<Response.DouyinAppShortUrlResponse>()
    expectTypeOf<DataOf<typeof awemeRegistry.appFeed>>().toEqualTypeOf<Response.DouyinAppFeedResponse>()
  })

  it('无成功样本的 5 个接口保留宽类型', () => {
    expectTypeOf<DataOf<typeof awemeRegistry.appUserFavoriteList>>().toBeAny()
    expectTypeOf<DataOf<typeof awemeRegistry.appUserRecommendList>>().toBeAny()
    expectTypeOf<DataOf<typeof awemeRegistry.appSearch>>().toBeAny()
    expectTypeOf<DataOf<typeof awemeRegistry.appLiveRoomInfo>>().toBeAny()
    expectTypeOf<DataOf<typeof awemeRegistry.appDynamicEmojiList>>().toBeAny()
  })

  it('分享接口分别声明分享规则和口令解析对象', () => {
    expectTypeOf<DataOf<typeof awemeRegistry.appShareSettings>>().toEqualTypeOf<DouyinAppShareSettingsData>()
    expectTypeOf<DataOf<typeof awemeRegistry.appCommandTrans>>().toEqualTypeOf<DouyinAppCommandTransData>()
  })

  it('调用形式和必要参数', () => {
    const client = createClient({ douyin: { app: { signerBaseUrl: 'http://127.0.0.1:8787' } } })
    expectTypeOf(client.douyin.app).toEqualTypeOf<DouyinAppApi>()
    expectTypeOf<PublicParamsOf<typeof awemeRegistry.appComments>>().toEqualTypeOf<{ aweme_id: string; number?: number }>()
    client.douyin.app.comments({ aweme_id: '1', number: 2 })
    client.douyin.app.emojiResource()
    client.douyin.app.emojiResource({ version_name: '17.4.0' })
    client.douyin.app.guestEmojiResource({ version_name: '17.4.0' })
    client.douyin.app.shareSettings()
    client.douyin.app.commandTrans({ command: 'ˇAbCdEf12345Š', clipboard_timestamp: 1763000000000 })
    // @ts-expect-error APK 版本使用字符串
    client.douyin.app.emojiResource({ version_name: 17 })
    // @ts-expect-error cursor 由内部翻页处理
    client.douyin.app.comments({ aweme_id: '1', cursor: 20 })
    // @ts-expect-error 设备身份由签名服务维护
    client.douyin.app.work({ aweme_id: '1', device_id: 'device' })
    // @ts-expect-error 旧 fetcher 形状不在新门面上
    client.douyin.fetcher.appFetchWorkComments({ aweme_id: '1' })
  })
})
